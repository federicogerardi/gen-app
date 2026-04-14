import { createArtifactStream } from '@/lib/llm/streaming';
import { getRequestLogger } from '@/lib/logger';
import {
  EXTRACTION_FIRST_TOKEN_TIMEOUT_MS,
  EXTRACTION_JSON_PARSE_TIMEOUT_MS,
  EXTRACTION_JSON_START_TIMEOUT_MS,
  EXTRACTION_POLICY_VERSION,
  EXTRACTION_TOKEN_IDLE_TIMEOUT_MS,
  getExtractionAttemptPlan,
  resolveExtractionRuntimeModel,
  shouldEscalateExtractionAttempt,
} from '@/lib/llm/extraction-model-policy';
import { buildExtractionPrompt } from '@/lib/tool-prompts/extraction';
import {
  enforceUsageGuards,
  parseAndValidateRequest,
  requireAvailableModel,
  requireAuthenticatedUser,
  requireOwnedProject,
} from '@/lib/tool-routes/guards';
import { apiError, sseResponse } from '@/lib/tool-routes/responses';
import { extractionRequestSchema } from '@/lib/tool-routes/schemas';
import { z } from 'zod';

const extractionOutputSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
  missingFields: z.array(z.string()).optional().default([]),
  notes: z.union([z.string(), z.array(z.string())]).optional().default(''),
});

type AttemptStreamResult = {
  chunks: Uint8Array[];
  tokenContent: string;
  costEstimate: number;
  errorMessage?: string;
  timedOut: boolean;
  timeoutKind?: 'first_token' | 'json_start' | 'json_parse' | 'token_idle' | 'overall';
};

type ConsistencyDecision = 'hard_accept' | 'soft_accept' | 'reject';

type ConsistencyDecisionReason =
  | 'known_fields_present'
  | 'no_known_keys_but_structured_signal'
  | 'overlap_detected'
  | 'no_signal'
  | 'no_expected_fields';

type AcceptanceDecision = 'hard_accept' | 'soft_accept' | 'reject';

type AcceptanceReason =
  | 'parse_invalid'
  | 'schema_invalid'
  | 'overlap_detected'
  | 'critical_coverage_below_threshold'
  | 'critical_coverage_threshold_met'
  | 'no_critical_fields_defined'
  | 'known_fields_present'
  | 'no_known_keys_but_structured_signal'
  | 'no_signal'
  | 'no_expected_fields';

type ExtractionConsistencyDiagnostics = {
  expectedFieldCount: number;
  knownExtractedCount: number;
  knownMissingCount: number;
  overlapCount: number;
  unknownExtractedSample: string[];
  unknownMissingSample: string[];
  consistencyDecision: ConsistencyDecision;
  consistencyDecisionReason: ConsistencyDecisionReason;
  criticalFieldCount: number;
  criticalExtractedCount: number;
  criticalCoverage: number;
};

type ExtractionAcceptanceResult = {
  acceptance: AcceptanceDecision;
  acceptanceReason: AcceptanceReason;
  criticalCoverage: number;
  consistencyDecision: ConsistencyDecision;
};

function parseSsePayload(line: string): Record<string, unknown> | null {
  if (!line.startsWith('data: ')) {
    return null;
  }

  try {
    return JSON.parse(line.slice(6)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function consumeAttemptStream(
  stream: ReadableStream,
  timeoutMs: number,
  firstTokenTimeoutMs: number,
  jsonStartTimeoutMs: number,
  jsonParseTimeoutMs: number,
  tokenIdleTimeoutMs: number,
  options?: { enableJsonGuards?: boolean },
): Promise<AttemptStreamResult> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let buffer = '';
  let tokenContent = '';
  let costEstimate = 0;
  let errorMessage: string | undefined;
  let timedOut = false;
  let timeoutKind: 'first_token' | 'json_start' | 'json_parse' | 'token_idle' | 'overall' | undefined;
  let hasReceivedToken = false;
  let hasSeenJsonStart = false;
  let hasSeenParseableJson = false;
  const enableJsonGuards = options?.enableJsonGuards ?? true;
  let tokenIdleTimeout: ReturnType<typeof setTimeout> | null = null;
  let jsonStartTimeout: ReturnType<typeof setTimeout> | null = null;
  let jsonParseTimeout: ReturnType<typeof setTimeout> | null = null;

  const clearTokenIdleTimeout = () => {
    if (tokenIdleTimeout) {
      clearTimeout(tokenIdleTimeout);
      tokenIdleTimeout = null;
    }
  };

  const armTokenIdleTimeout = () => {
    if (!hasReceivedToken || timedOut) {
      return;
    }

    clearTokenIdleTimeout();
    tokenIdleTimeout = setTimeout(async () => {
      timedOut = true;
      timeoutKind = 'token_idle';
      await reader.cancel('timeout').catch(() => undefined);
    }, tokenIdleTimeoutMs);
  };

  const clearJsonStartTimeout = () => {
    if (jsonStartTimeout) {
      clearTimeout(jsonStartTimeout);
      jsonStartTimeout = null;
    }
  };

  const armJsonStartTimeout = () => {
    if (!hasReceivedToken || hasSeenJsonStart || timedOut) {
      return;
    }

    if (jsonStartTimeout) {
      return;
    }

    jsonStartTimeout = setTimeout(async () => {
      timedOut = true;
      timeoutKind = 'json_start';
      await reader.cancel('timeout').catch(() => undefined);
    }, jsonStartTimeoutMs);
  };

  const clearJsonParseTimeout = () => {
    if (jsonParseTimeout) {
      clearTimeout(jsonParseTimeout);
      jsonParseTimeout = null;
    }
  };

  const armJsonParseTimeout = () => {
    if (!hasSeenJsonStart || hasSeenParseableJson || timedOut || jsonParseTimeout) {
      return;
    }

    jsonParseTimeout = setTimeout(async () => {
      timedOut = true;
      timeoutKind = 'json_parse';
      await reader.cancel('timeout').catch(() => undefined);
    }, jsonParseTimeoutMs);
  };

  const overallTimeout = setTimeout(async () => {
    timedOut = true;
    timeoutKind = 'overall';
    await reader.cancel('timeout').catch(() => undefined);
  }, timeoutMs);

  const firstTokenTimeout = setTimeout(async () => {
    if (hasReceivedToken) {
      return;
    }

    timedOut = true;
    timeoutKind = 'first_token';
    await reader.cancel('timeout').catch(() => undefined);
  }, firstTokenTimeoutMs);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      chunks.push(value);
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const payload = parseSsePayload(line);
        if (!payload) continue;

        if (payload.type === 'token') {
          const tokenChunk = typeof payload.token === 'string' ? payload.token : '';
          tokenContent += tokenChunk;

          // Consider first-token received only when the chunk carries textual signal.
          if (tokenChunk.trim().length > 0) {
            hasReceivedToken = true;
            clearTimeout(firstTokenTimeout);
            armTokenIdleTimeout();
            if (enableJsonGuards) {
              armJsonStartTimeout();
            }
          }

          if (enableJsonGuards && !hasSeenJsonStart && tokenContent.includes('{')) {
            hasSeenJsonStart = true;
            clearJsonStartTimeout();
            armJsonParseTimeout();
          }

          if (enableJsonGuards && hasSeenJsonStart && !hasSeenParseableJson && tryParseExtractionJson(tokenContent) !== null) {
            hasSeenParseableJson = true;
            clearJsonParseTimeout();
          }
          continue;
        }

        if (payload.type === 'progress') {
          if (typeof payload.costEstimate === 'number') {
            costEstimate = payload.costEstimate;
          }
          continue;
        }

        if (payload.type === 'complete') {
          clearTokenIdleTimeout();
          clearJsonStartTimeout();
          clearJsonParseTimeout();
          if (typeof payload.cost === 'number') {
            costEstimate = payload.cost;
          }
          continue;
        }

        if (payload.type === 'error') {
          clearTokenIdleTimeout();
          clearJsonStartTimeout();
          clearJsonParseTimeout();
          errorMessage = typeof payload.message === 'string' ? payload.message : 'Generation failed';
        }
      }
    }
  } finally {
    clearTimeout(overallTimeout);
    clearTimeout(firstTokenTimeout);
    clearTokenIdleTimeout();
    clearJsonStartTimeout();
    clearJsonParseTimeout();
  }

  return {
    chunks,
    tokenContent,
    costEstimate,
    errorMessage,
    timedOut,
    timeoutKind,
  };
}

function tryParseExtractionJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue with tolerant extraction.
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // Continue with brace extraction.
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  return null;
}

function toExpectedKey(value: string): string {
  const normalized = value.replace(/\[(\w+)\]/g, '.$1').trim();
  const segments = normalized.split('.').filter(Boolean);
  return (segments[segments.length - 1] ?? normalized).trim();
}

function hasNotesContent(notes: z.infer<typeof extractionOutputSchema>['notes']): boolean {
  if (typeof notes === 'string') {
    return notes.trim().length > 0;
  }

  if (Array.isArray(notes)) {
    return notes.some((item) => typeof item === 'string' && item.trim().length > 0);
  }

  return false;
}

function resolveKnownKey(value: string, expectedFields: Set<string>): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (expectedFields.has(trimmed)) {
    return trimmed;
  }

  const normalized = toExpectedKey(trimmed);
  if (expectedFields.has(normalized)) {
    return normalized;
  }

  return null;
}

function getCriticalFieldSet(fieldMap: Record<string, unknown>): Set<string> {
  const entries = Object.entries(fieldMap).filter(([, definition]) => {
    if (!definition || typeof definition !== 'object') {
      return false;
    }

    return Boolean((definition as { required?: unknown }).required);
  });

  return new Set(entries.map(([fieldName]) => fieldName));
}

export function summarizeConsistencyDiagnostics(
  parsed: z.infer<typeof extractionOutputSchema>,
  fieldMap: Record<string, unknown>,
): ExtractionConsistencyDiagnostics {
  const expectedFields = new Set(Object.keys(fieldMap));
  const extractedFields = Object.keys(parsed.fields);
  const missingFields = parsed.missingFields;

  const knownExtracted = Array.from(
    new Set(
      extractedFields
        .map((field) => resolveKnownKey(field, expectedFields))
        .filter((field): field is string => Boolean(field)),
    ),
  );

  const knownMissing = Array.from(
    new Set(
      missingFields
        .map((field) => resolveKnownKey(field, expectedFields))
        .filter((field): field is string => Boolean(field)),
    ),
  );

  const overlapCount = knownMissing.filter((field) => knownExtracted.includes(field)).length;
  const unknownExtractedSample = extractedFields
    .filter((field) => !resolveKnownKey(field, expectedFields))
    .slice(0, 10);
  const unknownMissingSample = missingFields
    .filter((field) => !resolveKnownKey(field, expectedFields))
    .slice(0, 10);

  const criticalFields = getCriticalFieldSet(fieldMap);
  const criticalExtractedCount = knownExtracted.filter((field) => criticalFields.has(field)).length;
  const criticalCoverage = criticalFields.size > 0
    ? Number((criticalExtractedCount / criticalFields.size).toFixed(4))
    : 1;

  if (expectedFields.size === 0) {
    return {
      expectedFieldCount: 0,
      knownExtractedCount: knownExtracted.length,
      knownMissingCount: knownMissing.length,
      overlapCount,
      unknownExtractedSample,
      unknownMissingSample,
      consistencyDecision: 'reject',
      consistencyDecisionReason: 'no_expected_fields',
      criticalFieldCount: criticalFields.size,
      criticalExtractedCount,
      criticalCoverage,
    };
  }

  if (overlapCount > 0) {
    return {
      expectedFieldCount: expectedFields.size,
      knownExtractedCount: knownExtracted.length,
      knownMissingCount: knownMissing.length,
      overlapCount,
      unknownExtractedSample,
      unknownMissingSample,
      consistencyDecision: 'reject',
      consistencyDecisionReason: 'overlap_detected',
      criticalFieldCount: criticalFields.size,
      criticalExtractedCount,
      criticalCoverage,
    };
  }

  if (knownExtracted.length > 0 || knownMissing.length > 0) {
    return {
      expectedFieldCount: expectedFields.size,
      knownExtractedCount: knownExtracted.length,
      knownMissingCount: knownMissing.length,
      overlapCount,
      unknownExtractedSample,
      unknownMissingSample,
      consistencyDecision: 'hard_accept',
      consistencyDecisionReason: 'known_fields_present',
      criticalFieldCount: criticalFields.size,
      criticalExtractedCount,
      criticalCoverage,
    };
  }

  if (extractedFields.length > 0 || missingFields.length > 0 || hasNotesContent(parsed.notes)) {
    return {
      expectedFieldCount: expectedFields.size,
      knownExtractedCount: 0,
      knownMissingCount: 0,
      overlapCount,
      unknownExtractedSample,
      unknownMissingSample,
      consistencyDecision: 'soft_accept',
      consistencyDecisionReason: 'no_known_keys_but_structured_signal',
      criticalFieldCount: criticalFields.size,
      criticalExtractedCount,
      criticalCoverage,
    };
  }

  return {
    expectedFieldCount: expectedFields.size,
    knownExtractedCount: 0,
    knownMissingCount: 0,
    overlapCount,
    unknownExtractedSample,
    unknownMissingSample,
    consistencyDecision: 'reject',
    consistencyDecisionReason: 'no_signal',
    criticalFieldCount: criticalFields.size,
    criticalExtractedCount,
    criticalCoverage,
  };
}

export function evaluateExtractionAcceptance(input: {
  parseOk: boolean;
  schemaOk: boolean;
  diagnostics: ExtractionConsistencyDiagnostics;
  criticalFieldCoverageThreshold?: number;
}): ExtractionAcceptanceResult {
  const { parseOk, schemaOk, diagnostics } = input;
  const threshold = input.criticalFieldCoverageThreshold ?? 0.6;

  if (!parseOk) {
    return {
      acceptance: 'reject',
      acceptanceReason: 'parse_invalid',
      criticalCoverage: diagnostics.criticalCoverage,
      consistencyDecision: diagnostics.consistencyDecision,
    };
  }

  if (!schemaOk) {
    return {
      acceptance: 'reject',
      acceptanceReason: 'schema_invalid',
      criticalCoverage: diagnostics.criticalCoverage,
      consistencyDecision: diagnostics.consistencyDecision,
    };
  }

  if (diagnostics.overlapCount > 0) {
    return {
      acceptance: 'reject',
      acceptanceReason: 'overlap_detected',
      criticalCoverage: diagnostics.criticalCoverage,
      consistencyDecision: diagnostics.consistencyDecision,
    };
  }

  if (diagnostics.consistencyDecision === 'hard_accept') {
    return {
      acceptance: 'hard_accept',
      acceptanceReason: 'known_fields_present',
      criticalCoverage: diagnostics.criticalCoverage,
      consistencyDecision: diagnostics.consistencyDecision,
    };
  }

  if (diagnostics.consistencyDecision === 'soft_accept') {
    if (diagnostics.criticalFieldCount === 0) {
      return {
        acceptance: 'soft_accept',
        acceptanceReason: 'no_critical_fields_defined',
        criticalCoverage: diagnostics.criticalCoverage,
        consistencyDecision: diagnostics.consistencyDecision,
      };
    }

    if (diagnostics.criticalCoverage >= threshold) {
      return {
        acceptance: 'soft_accept',
        acceptanceReason: 'critical_coverage_threshold_met',
        criticalCoverage: diagnostics.criticalCoverage,
        consistencyDecision: diagnostics.consistencyDecision,
      };
    }

    return {
      acceptance: 'reject',
      acceptanceReason: 'critical_coverage_below_threshold',
      criticalCoverage: diagnostics.criticalCoverage,
      consistencyDecision: diagnostics.consistencyDecision,
    };
  }

  return {
    acceptance: 'reject',
    acceptanceReason: diagnostics.consistencyDecisionReason,
    criticalCoverage: diagnostics.criticalCoverage,
    consistencyDecision: diagnostics.consistencyDecision,
  };
}

function replaySseChunks(chunks: Uint8Array[]): ReadableStream {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const userId = authResult.data.userId;
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = getRequestLogger({
    requestId,
    route: '/api/tools/extraction/generate',
    method: 'POST',
    userId,
  });

  const parsed = await parseAndValidateRequest(request, extractionRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const payload = parsed.data;
  const startedAt = Date.now();
  const extractionResponseMode = payload.responseMode ?? 'structured';
  const runtimeModel = resolveExtractionRuntimeModel(payload.model);
  const attemptPlan = extractionResponseMode === 'text'
    ? getExtractionAttemptPlan({ maxAttempts: 2, attemptTimeoutMs: [18_000, 22_000] })
    : getExtractionAttemptPlan();

  log.info(
    {
      workflowType: 'extraction',
      projectId: payload.projectId,
      model: payload.model,
      runtimeModel,
      responseMode: extractionResponseMode,
      policyVersion: EXTRACTION_POLICY_VERSION,
    },
    'Tool generation started',
  );

  const ownershipResult = await requireOwnedProject(payload.projectId, userId);
  if (!ownershipResult.ok) {
    return ownershipResult.response;
  }

  const prompt = await buildExtractionPrompt({
    rawContent: payload.rawContent,
    fieldMap: payload.fieldMap,
    tone: payload.tone,
    notes: payload.notes,
    responseMode: extractionResponseMode,
  });

  let lastFallbackReason = 'provider_error';
  let usageIncrementApplied = false;

  for (const attempt of attemptPlan) {
    const attemptStartedAt = Date.now();
    const modelResult = await requireAvailableModel(attempt.model);
    if (!modelResult.ok) {
      lastFallbackReason = 'provider_error';

      log.warn(
        {
          workflowType: 'extraction',
          projectId: payload.projectId,
          requestId,
          attemptIndex: attempt.attemptIndex,
          runtimeModel: attempt.model,
          duration_ms: Date.now() - attemptStartedAt,
          policyVersion: EXTRACTION_POLICY_VERSION,
        },
        'Extraction attempt skipped: runtime model unavailable',
      );

      const policyDecision = shouldEscalateExtractionAttempt(
        {
          success: false,
          providerError: true,
        },
        {
          attemptIndex: attempt.attemptIndex,
        },
      );

      if (!policyDecision.escalate) {
        break;
      }

      continue;
    }

    const usageResult = await enforceUsageGuards(userId, attempt.model, 'extraction', {
      incrementMonthlyUsed: !usageIncrementApplied,
    });
    if (!usageResult.ok) {
      return usageResult.response;
    }
    if (!usageIncrementApplied) {
      usageIncrementApplied = true;
    }

    let fallbackReason = 'provider_error';

    try {
      const stream = await createArtifactStream({
        userId,
        projectId: payload.projectId,
        type: 'extraction',
        workflowType: 'extraction',
        model: attempt.model,
        promptOverride: prompt,
        input: {
          rawContent: payload.rawContent,
          fieldMap: payload.fieldMap,
          tone: payload.tone,
          outputFormat: extractionResponseMode === 'text' ? 'markdown' : 'json',
          workflowType: 'extraction',
          extractionAttempt: attempt.attemptIndex,
          policyVersion: EXTRACTION_POLICY_VERSION,
          fallbackFromModel: attempt.isFallback ? attemptPlan[attempt.attemptIndex - 2]?.model ?? null : null,
          payloadModel: payload.model,
        },
      });

      const consumed = await consumeAttemptStream(
        stream,
        attempt.timeoutMs,
        EXTRACTION_FIRST_TOKEN_TIMEOUT_MS,
        EXTRACTION_JSON_START_TIMEOUT_MS,
        EXTRACTION_JSON_PARSE_TIMEOUT_MS,
        EXTRACTION_TOKEN_IDLE_TIMEOUT_MS,
        { enableJsonGuards: extractionResponseMode !== 'text' },
      );

      let parseOk = false;
      let schemaOk = false;
      let consistencyOk = false;
      let consistencySoftAccepted = false;
      let success = false;
      let providerError = false;
      let acceptanceDecision: AcceptanceDecision = 'reject';
      let acceptanceReason: AcceptanceReason = 'no_signal';
      let consistencyDiagnostics: ExtractionConsistencyDiagnostics | null = null;
      let criticalCoverage = 0;
      const trimmedTokenContent = consumed.tokenContent.trim();
      const canAcceptTimedOutText = extractionResponseMode === 'text'
        && consumed.timedOut
        && trimmedTokenContent.length >= 120;

      if (canAcceptTimedOutText) {
        parseOk = true;
        schemaOk = true;
        consistencyOk = true;
        consistencySoftAccepted = true;
        acceptanceDecision = 'soft_accept';
        acceptanceReason = 'no_critical_fields_defined';
        criticalCoverage = 1;
        success = true;
      } else if (consumed.timedOut) {
        fallbackReason = 'timeout';
      } else if (consumed.errorMessage) {
        providerError = true;
        fallbackReason = 'provider_error';
      } else if (extractionResponseMode === 'text') {
        const hasUsefulText = trimmedTokenContent.length >= 40;
        parseOk = hasUsefulText;
        schemaOk = hasUsefulText;
        consistencyOk = hasUsefulText;
        consistencySoftAccepted = hasUsefulText;
        acceptanceDecision = hasUsefulText ? 'soft_accept' : 'reject';
        acceptanceReason = hasUsefulText ? 'no_critical_fields_defined' : 'no_signal';
        criticalCoverage = hasUsefulText ? 1 : 0;
        success = hasUsefulText;

        if (!success) {
          fallbackReason = 'parse_failed';
        }
      } else {
        const parsedObject = tryParseExtractionJson(consumed.tokenContent || '{}');

        const jsonParsed = z.record(z.string(), z.unknown()).safeParse(parsedObject);

        if (!jsonParsed.success) {
          parseOk = false;
          fallbackReason = 'parse_failed';
        } else {
          parseOk = true;
          const schemaParsed = extractionOutputSchema.safeParse(jsonParsed.data);
          if (!schemaParsed.success) {
            schemaOk = false;
            fallbackReason = 'schema_failed';
          } else {
            schemaOk = true;
            consistencyDiagnostics = summarizeConsistencyDiagnostics(schemaParsed.data, payload.fieldMap);
            const acceptance = evaluateExtractionAcceptance({
              parseOk,
              schemaOk,
              diagnostics: consistencyDiagnostics,
            });

            acceptanceDecision = acceptance.acceptance;
            acceptanceReason = acceptance.acceptanceReason;
            criticalCoverage = acceptance.criticalCoverage;
            consistencyOk = acceptance.acceptance !== 'reject';
            consistencySoftAccepted = acceptance.acceptance === 'soft_accept';

            if (!consistencyOk) {
              fallbackReason = 'consistency_failed';
            } else {
              success = true;
            }
          }
        }
      }

      const policyDecision = shouldEscalateExtractionAttempt(
        {
          success,
          parseOk,
          schemaOk,
          consistencyOk,
          timedOut: consumed.timedOut,
          providerError,
        },
        {
          attemptIndex: attempt.attemptIndex,
        },
      );

      if (policyDecision.reason) {
        fallbackReason = policyDecision.reason;
      }
      lastFallbackReason = fallbackReason;

      log.info(
        {
          workflowType: 'extraction',
          projectId: payload.projectId,
          requestId,
          responseMode: extractionResponseMode,
          attemptIndex: attempt.attemptIndex,
          runtimeModel: attempt.model,
          fallbackReason: success ? null : fallbackReason,
          duration_ms: Date.now() - attemptStartedAt,
          costEstimate: consumed.costEstimate,
          parseOk,
          schemaOk,
          consistencyOk,
          consistencySoftAccepted,
          acceptanceDecision,
          acceptanceReason,
          criticalCoverage,
          timeoutKind: consumed.timeoutKind ?? null,
          expectedFieldCount: consistencyDiagnostics?.expectedFieldCount ?? null,
          knownExtractedCount: consistencyDiagnostics?.knownExtractedCount ?? null,
          knownMissingCount: consistencyDiagnostics?.knownMissingCount ?? null,
          overlapCount: consistencyDiagnostics?.overlapCount ?? null,
          unknownExtractedSample: consistencyDiagnostics?.unknownExtractedSample ?? null,
          unknownMissingSample: consistencyDiagnostics?.unknownMissingSample ?? null,
          consistencyDecision: consistencyDiagnostics?.consistencyDecision ?? null,
          consistencyDecisionReason: consistencyDiagnostics?.consistencyDecisionReason ?? null,
          policyVersion: EXTRACTION_POLICY_VERSION,
        },
        success ? 'Extraction attempt succeeded' : 'Extraction attempt failed',
      );

      if (success) {
        log.info(
          {
            workflowType: 'extraction',
            projectId: payload.projectId,
            model: attempt.model,
            responseMode: extractionResponseMode,
            duration_ms: Date.now() - startedAt,
            requestId,
          },
          'Tool generation stream initialized',
        );

        return sseResponse(replaySseChunks(consumed.chunks), requestId);
      }

      if (!policyDecision.escalate) {
        break;
      }
    } catch (error) {
      const err = error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: String(error) };

      log.error(
        {
          workflowType: 'extraction',
          projectId: payload.projectId,
          requestId,
          attemptIndex: attempt.attemptIndex,
          runtimeModel: attempt.model,
          duration_ms: Date.now() - attemptStartedAt,
          err,
        },
        'Extraction attempt threw unexpected error',
      );

      lastFallbackReason = 'provider_error';

      const policyDecision = shouldEscalateExtractionAttempt(
        {
          success: false,
          providerError: true,
        },
        {
          attemptIndex: attempt.attemptIndex,
        },
      );

      if (!policyDecision.escalate) {
        break;
      }
    }
  }

  log.error(
    {
      workflowType: 'extraction',
      projectId: payload.projectId,
      requestId,
      duration_ms: Date.now() - startedAt,
      fallbackReason: lastFallbackReason,
      responseMode: extractionResponseMode,
      policyVersion: EXTRACTION_POLICY_VERSION,
    },
    'Extraction fallback chain exhausted',
  );

  return apiError('EXTRACTION_FAILED', 'Impossibile completare l\'estrazione in modo affidabile', 503);
}
