import { createArtifactStream, persistArtifactFailure, persistArtifactSuccess } from '@/lib/llm/streaming';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma';
import { getRequestLogger, logger } from '@/lib/logger';
import {
  EXTRACTION_FIRST_TOKEN_TIMEOUT_MS,
  EXTRACTION_JSON_PARSE_TIMEOUT_MS,
  EXTRACTION_JSON_START_TIMEOUT_MS,
  classifyExtractionCompletionOutcome,
  EXTRACTION_MAX_ATTEMPTS,
  EXTRACTION_POLICY_VERSION,
  EXTRACTION_TEXT_ATTEMPT_TIMEOUTS_MS,
  EXTRACTION_TOKEN_IDLE_TIMEOUT_MS,
  getExtractionAttemptPlan,
  mapExtractionTerminalState,
  resolveExtractionCompletionReason,
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
import { resolveExtractionRolloutDecision } from '@/lib/tool-routes/extraction-rollout';
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
  timeoutKind?: 'first_token' | 'json_start' | 'json_parse' | 'token_idle' | 'route_deadline';
  artifactId?: string;
  format?: 'json' | 'markdown';
  didComplete: boolean;
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

type ExistingExtractionArtifact = {
  id: string;
  status: string;
  content: string;
  workflowType?: string | null;
  failureReason?: string | null;
};

type RouteLogger = {
  info: (payload: Record<string, unknown>, message: string) => void;
  warn: (payload: Record<string, unknown>, message: string) => void;
  error: (payload: Record<string, unknown>, message: string) => void;
};

function logBestEffort(
  log: RouteLogger,
  level: 'info' | 'warn' | 'error',
  payload: Record<string, unknown>,
  message: string,
) {
  try {
    log[level](payload, message);
  } catch (err) {
    try {
      logger.warn(
        {
          workflowType: 'extraction',
          requestId: typeof payload.requestId === 'string' ? payload.requestId : null,
          logLevel: level,
          logMessage: message,
          policyVersion: EXTRACTION_POLICY_VERSION,
          logError: err instanceof Error ? err.message : String(err),
        },
        'Extraction observability failure suppressed',
      );
    } catch {
      // Never block user path because observability sinks fail.
    }
  }
}

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
  options?: { enableJsonGuards?: boolean; enableStreamGuards?: boolean },
): Promise<AttemptStreamResult> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let buffer = '';
  let tokenContent = '';
  let costEstimate = 0;
  let errorMessage: string | undefined;
  let timedOut = false;
  let timeoutKind: 'first_token' | 'json_start' | 'json_parse' | 'token_idle' | 'route_deadline' | undefined;
  let artifactId: string | undefined;
  let format: 'json' | 'markdown' | undefined;
  let didComplete = false;
  let hasReceivedToken = false;
  let hasSeenJsonStart = false;
  let hasSeenParseableJson = false;
  const enableJsonGuards = options?.enableJsonGuards ?? true;
  const enableStreamGuards = options?.enableStreamGuards ?? true;
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
    if (!enableStreamGuards || !hasReceivedToken || timedOut) {
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
    if (!enableStreamGuards || !hasReceivedToken || hasSeenJsonStart || timedOut) {
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
    if (!enableStreamGuards || !hasSeenJsonStart || hasSeenParseableJson || timedOut || jsonParseTimeout) {
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
    timeoutKind = 'route_deadline';
    await reader.cancel('timeout').catch(() => undefined);
  }, timeoutMs);

  const firstTokenTimeout = enableStreamGuards
    ? setTimeout(async () => {
      if (hasReceivedToken) {
        return;
      }

      timedOut = true;
      timeoutKind = 'first_token';
      await reader.cancel('timeout').catch(() => undefined);
    }, firstTokenTimeoutMs)
    : null;

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
            if (firstTokenTimeout) {
              clearTimeout(firstTokenTimeout);
            }
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
          didComplete = true;
          clearTokenIdleTimeout();
          clearJsonStartTimeout();
          clearJsonParseTimeout();
          if (typeof payload.artifactId === 'string') {
            artifactId = payload.artifactId;
          }
          if (payload.format === 'json' || payload.format === 'markdown') {
            format = payload.format;
          }
          if (typeof payload.cost === 'number') {
            costEstimate = payload.cost;
          }
          continue;
        }

        if (payload.type === 'start') {
          if (typeof payload.artifactId === 'string') {
            artifactId = payload.artifactId;
          }
          if (payload.format === 'json' || payload.format === 'markdown') {
            format = payload.format;
          }
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
    if (firstTokenTimeout) {
      clearTimeout(firstTokenTimeout);
    }
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
    artifactId,
    format,
    didComplete,
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

function createResolvedExtractionStream(input: {
  chunks: Uint8Array[];
  artifactId: string;
  content: string;
  format: 'json' | 'markdown';
  cost?: number;
  tokens?: { input: number; output: number };
  appendCompleteEvent: boolean;
}): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (const chunk of input.chunks) {
        controller.enqueue(chunk);
      }

      if (input.appendCompleteEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          artifactId: input.artifactId,
          content: input.content,
          workflowType: 'extraction',
          format: input.format,
          ...(input.tokens ? { tokens: input.tokens } : {}),
          ...(typeof input.cost === 'number' ? { cost: input.cost } : {}),
        })}\n\n`));
      }

      controller.close();
    },
  });
}

function buildExtractionTerminalInput(input: {
  attemptInput: Record<string, unknown>;
  completionOutcome: string;
  completionReason: string;
  fallbackReason: string | null;
  timeoutKind: AttemptStreamResult['timeoutKind'] | null;
  attemptIndex: number;
  runtimeModel: string;
}): Record<string, unknown> {
  return {
    ...input.attemptInput,
    terminalState: {
      completionOutcome: input.completionOutcome,
      completionReason: input.completionReason,
      fallbackReason: input.fallbackReason,
      timeoutKind: input.timeoutKind,
      attemptIndex: input.attemptIndex,
      runtimeModel: input.runtimeModel,
      policyVersion: EXTRACTION_POLICY_VERSION,
      finalizedAt: new Date().toISOString(),
    },
  };
}

function normalizeExtractionIdempotencyKey(rawValue: string | null): string | null {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (trimmed.length < 8 || trimmed.length > 128) {
    return null;
  }

  return trimmed;
}

function getExtractionStreamFormat(responseMode: 'structured' | 'text'): 'json' | 'markdown' {
  return responseMode === 'text' ? 'markdown' : 'json';
}

function createExtractionReplayStream(input: {
  artifactId: string;
  content: string;
  format: 'json' | 'markdown';
}): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'start',
        artifactId: input.artifactId,
        workflowType: 'extraction',
        format: input.format,
      })}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'complete',
        artifactId: input.artifactId,
        content: input.content,
        workflowType: 'extraction',
        format: input.format,
      })}\n\n`));
      controller.close();
    },
  });
}

async function findExistingExtractionArtifactByIdempotencyKey(input: {
  userId: string;
  projectId: string;
  idempotencyKey: string;
}): Promise<ExistingExtractionArtifact | null> {
  const artifact = await db.artifact.findFirst({
    where: {
      userId: input.userId,
      projectId: input.projectId,
      type: 'extraction',
      input: {
        path: ['idempotencyKey'],
        equals: input.idempotencyKey,
      },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      content: true,
      workflowType: true,
      failureReason: true,
    },
  });

  return artifact;
}

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const baseLog = getRequestLogger({
    requestId,
    route: '/api/tools/extraction/generate',
    method: 'POST',
  });

  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const completionOutcome = 'failed_hard' as const;
    const completionReason = resolveExtractionCompletionReason({
      outcome: completionOutcome,
      hardFailReason: 'unauthorized',
    });
    const terminalState = mapExtractionTerminalState({ outcome: completionOutcome, reason: completionReason });
    logBestEffort(baseLog, 'warn',
      {
        workflowType: 'extraction',
        requestId,
        attemptIndex: null,
        runtimeModel: null,
        timeoutKind: null,
        fallbackReason: null,
        completionOutcome,
        completionReason,
        artifactStatus: terminalState.artifactStatus,
        httpStatus: terminalState.httpStatus,
        policyVersion: EXTRACTION_POLICY_VERSION,
      },
      'Extraction request rejected before processing',
    );
    return authResult.response;
  }

  const userId = authResult.data.userId;
  const log = getRequestLogger({
    requestId,
    route: '/api/tools/extraction/generate',
    method: 'POST',
    userId,
  });

  const parsed = await parseAndValidateRequest(request, extractionRequestSchema);
  if (!parsed.ok) {
    const completionOutcome = 'failed_hard' as const;
    const completionReason = resolveExtractionCompletionReason({
      outcome: completionOutcome,
      hardFailReason: 'validation_error',
    });
    const terminalState = mapExtractionTerminalState({ outcome: completionOutcome, reason: completionReason });
    logBestEffort(log, 'warn',
      {
        workflowType: 'extraction',
        requestId,
        attemptIndex: null,
        runtimeModel: null,
        timeoutKind: null,
        fallbackReason: null,
        completionOutcome,
        completionReason,
        artifactStatus: terminalState.artifactStatus,
        httpStatus: terminalState.httpStatus,
        policyVersion: EXTRACTION_POLICY_VERSION,
      },
      'Extraction request rejected: invalid payload',
    );
    return parsed.response;
  }

  const payload = parsed.data;
  const startedAt = Date.now();
  const extractionResponseMode = payload.responseMode ?? 'structured';
  const idempotencyKey = normalizeExtractionIdempotencyKey(request.headers.get('x-idempotency-key'));
  const runtimeModel = resolveExtractionRuntimeModel(payload.model);
  const attemptPlan = extractionResponseMode === 'text'
    ? getExtractionAttemptPlan({
      maxAttempts: EXTRACTION_MAX_ATTEMPTS,
      attemptTimeoutMs: [...EXTRACTION_TEXT_ATTEMPT_TIMEOUTS_MS],
    })
    : getExtractionAttemptPlan();
  const rolloutDecision = resolveExtractionRolloutDecision({
    userId,
    projectId: payload.projectId,
  });

  logBestEffort(log, 'info',
    {
      workflowType: 'extraction',
      requestId,
      attemptIndex: null,
      timeoutKind: null,
      fallbackReason: null,
      completionReason: null,
      projectId: payload.projectId,
      model: payload.model,
      runtimeModel,
      idempotencyKey,
      responseMode: extractionResponseMode,
      rolloutEnabled: rolloutDecision.enabled,
      rolloutRollbackActive: rolloutDecision.rollbackActive,
      rolloutPercentage: rolloutDecision.rolloutPercentage,
      rolloutPhase: rolloutDecision.phase,
      rolloutCohort: rolloutDecision.cohort,
      rolloutReason: rolloutDecision.reason,
      policyVersion: EXTRACTION_POLICY_VERSION,
    },
    'Tool generation started',
  );

  const ownershipResult = await requireOwnedProject(payload.projectId, userId);
  if (!ownershipResult.ok) {
    const completionOutcome = 'failed_hard' as const;
    const completionReason = resolveExtractionCompletionReason({
      outcome: completionOutcome,
      hardFailReason: ownershipResult.response.status === 404 ? 'forbidden' : 'forbidden',
    });
    const terminalState = mapExtractionTerminalState({ outcome: completionOutcome, reason: completionReason });
    logBestEffort(log, 'warn',
      {
        workflowType: 'extraction',
        projectId: payload.projectId,
        completionOutcome,
        completionReason,
        requestId,
        attemptIndex: null,
        runtimeModel: null,
        timeoutKind: null,
        fallbackReason: null,
        artifactStatus: terminalState.artifactStatus,
        httpStatus: ownershipResult.response.status,
        policyVersion: EXTRACTION_POLICY_VERSION,
      },
      'Extraction request rejected: project not accessible',
    );
    return ownershipResult.response;
  }

  if (!rolloutDecision.allowed) {
    logBestEffort(log, 'warn',
      {
        workflowType: 'extraction',
        projectId: payload.projectId,
        requestId,
        attemptIndex: null,
        runtimeModel,
        timeoutKind: null,
        fallbackReason: rolloutDecision.reason,
        completionReason: 'rollout_gate_blocked',
        rolloutEnabled: rolloutDecision.enabled,
        rolloutRollbackActive: rolloutDecision.rollbackActive,
        rolloutPercentage: rolloutDecision.rolloutPercentage,
        rolloutPhase: rolloutDecision.phase,
        rolloutCohort: rolloutDecision.cohort,
        rolloutReason: rolloutDecision.reason,
        policyVersion: EXTRACTION_POLICY_VERSION,
      },
      'Extraction request blocked by rollout gate',
    );

    return apiError('SERVICE_UNAVAILABLE', 'Extraction temporaneamente non disponibile per questa coorte rollout', 503, {
      rollout: {
        enabled: rolloutDecision.enabled,
        rollbackActive: rolloutDecision.rollbackActive,
        percentage: rolloutDecision.rolloutPercentage,
        phase: rolloutDecision.phase,
        cohort: rolloutDecision.cohort,
        reason: rolloutDecision.reason,
      },
    });
  }

  if (idempotencyKey) {
    const existingArtifact = await findExistingExtractionArtifactByIdempotencyKey({
      userId,
      projectId: payload.projectId,
      idempotencyKey,
    });

    if (existingArtifact) {
      logBestEffort(log, 'info',
        {
          workflowType: 'extraction',
          projectId: payload.projectId,
          requestId,
          attemptIndex: null,
          runtimeModel: null,
          timeoutKind: null,
          completionReason: null,
          fallbackReason: null,
          artifactId: existingArtifact.id,
          artifactStatus: existingArtifact.status,
          idempotencyKey,
          policyVersion: EXTRACTION_POLICY_VERSION,
        },
        'Extraction idempotency hit',
      );

      if (existingArtifact.status === 'completed') {
        return sseResponse(
          createExtractionReplayStream({
            artifactId: existingArtifact.id,
            content: existingArtifact.content,
            format: getExtractionStreamFormat(extractionResponseMode),
          }),
          requestId,
        );
      }

      return apiError('CONFLICT', 'Extraction request already exists for this idempotency key', 409, {
        artifactId: existingArtifact.id,
        status: existingArtifact.status,
        failureReason: existingArtifact.failureReason ?? null,
      });
    }
  }

  let firstRunnableAttemptIndex = -1;
  for (let index = 0; index < attemptPlan.length; index += 1) {
    const modelResult = await requireAvailableModel(attemptPlan[index].model);
    if (modelResult.ok) {
      firstRunnableAttemptIndex = index;
      break;
    }

    logBestEffort(log, 'warn',
      {
        workflowType: 'extraction',
        projectId: payload.projectId,
        requestId,
        attemptIndex: attemptPlan[index].attemptIndex,
        runtimeModel: attemptPlan[index].model,
        policyVersion: EXTRACTION_POLICY_VERSION,
      },
      'Extraction attempt skipped during preflight: runtime model unavailable',
    );
  }

  if (firstRunnableAttemptIndex === -1) {
    logBestEffort(log, 'error',
      {
        workflowType: 'extraction',
        projectId: payload.projectId,
        requestId,
        attemptIndex: null,
        runtimeModel: null,
        timeoutKind: null,
        completionReason: 'no_signal_after_chain_exhausted',
        fallbackReason: 'provider_error',
        responseMode: extractionResponseMode,
        policyVersion: EXTRACTION_POLICY_VERSION,
      },
      'Extraction preflight exhausted: no runtime model available',
    );

    return apiError('EXTRACTION_FAILED', 'Impossibile completare l\'estrazione in modo affidabile', 503);
  }

  const usageResult = await enforceUsageGuards(userId, attemptPlan[firstRunnableAttemptIndex].model, 'extraction', {
    incrementMonthlyUsed: true,
  });
  if (!usageResult.ok) {
    return usageResult.response;
  }

  const artifactInput = {
    rawContent: payload.rawContent,
    fieldMap: payload.fieldMap,
    tone: payload.tone,
    responseMode: extractionResponseMode,
    notes: payload.notes,
    policyVersion: EXTRACTION_POLICY_VERSION,
    workflowType: 'extraction',
    outputFormat: getExtractionStreamFormat(extractionResponseMode),
    requestId,
    idempotencyKey,
  };

  const artifactStub = await db.artifact.create({
    data: {
      userId,
      projectId: payload.projectId,
      type: 'extraction',
      workflowType: 'extraction',
      model: attemptPlan[firstRunnableAttemptIndex].model,
      input: artifactInput,
      status: 'generating',
    },
  });

  const prompt = await buildExtractionPrompt({
    rawContent: payload.rawContent,
    fieldMap: payload.fieldMap,
    tone: payload.tone,
    notes: payload.notes,
    responseMode: extractionResponseMode,
  });

  let lastFallbackReason = 'provider_error';
  let lastTimeoutKind: AttemptStreamResult['timeoutKind'] | null = null;
  let lastAttemptIndex = attemptPlan[firstRunnableAttemptIndex]?.attemptIndex ?? 1;
  let lastAttemptModel = attemptPlan[firstRunnableAttemptIndex]?.model ?? runtimeModel;
  let lastAttemptInput: Record<string, unknown> = {
    ...artifactInput,
    extractionAttempt: lastAttemptIndex,
    payloadModel: payload.model,
  };

  for (const attempt of attemptPlan.slice(firstRunnableAttemptIndex)) {
    const attemptStartedAt = Date.now();
    const modelResult = await requireAvailableModel(attempt.model);
    if (!modelResult.ok) {
      lastFallbackReason = 'provider_error';

      logBestEffort(log, 'warn',
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

    let fallbackReason = 'provider_error';

    try {
      const attemptInput: Record<string, unknown> = {
        rawContent: payload.rawContent,
        fieldMap: payload.fieldMap,
        tone: payload.tone,
        outputFormat: extractionResponseMode === 'text' ? 'markdown' : 'json',
        workflowType: 'extraction',
        extractionAttempt: attempt.attemptIndex,
        policyVersion: EXTRACTION_POLICY_VERSION,
        fallbackFromModel: attempt.isFallback ? attemptPlan[attempt.attemptIndex - 2]?.model ?? null : null,
        payloadModel: payload.model,
      };

      lastAttemptIndex = attempt.attemptIndex;
      lastAttemptModel = attempt.model;
      lastAttemptInput = attemptInput;

      const stream = await createArtifactStream({
        userId,
        projectId: payload.projectId,
        artifactId: artifactStub.id,
        type: 'extraction',
        workflowType: 'extraction',
        model: attempt.model,
        persistFailure: false,
        persistPartialOnTimeout: false,
        promptOverride: prompt,
        input: attemptInput,
      });

      const consumed = await consumeAttemptStream(
        stream,
        attempt.timeoutMs,
        EXTRACTION_FIRST_TOKEN_TIMEOUT_MS,
        EXTRACTION_JSON_START_TIMEOUT_MS,
        EXTRACTION_JSON_PARSE_TIMEOUT_MS,
        EXTRACTION_TOKEN_IDLE_TIMEOUT_MS,
        {
          enableJsonGuards: extractionResponseMode !== 'text',
          enableStreamGuards: extractionResponseMode !== 'text',
        },
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
      lastTimeoutKind = consumed.timeoutKind ?? null;

      logBestEffort(log, 'info',
        {
          workflowType: 'extraction',
          projectId: payload.projectId,
          requestId,
          responseMode: extractionResponseMode,
          attemptIndex: attempt.attemptIndex,
          runtimeModel: attempt.model,
          fallbackReason: success ? null : fallbackReason,
          completionReason: null,
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
        let responseStream: ReadableStream = replaySseChunks(consumed.chunks);
        let completeTokens: { input: number; output: number } | undefined;
        let completeCost: number | undefined;

        const completionOutcome = classifyExtractionCompletionOutcome({
          success,
          acceptanceDecision,
          timedOut: consumed.timedOut,
        });
        const completionReason = resolveExtractionCompletionReason({
          outcome: completionOutcome,
          acceptanceReason,
        });
        const terminalState = mapExtractionTerminalState({
          outcome: completionOutcome,
          reason: completionReason,
        });

        const terminalInput = buildExtractionTerminalInput({
          attemptInput,
          completionOutcome,
          completionReason,
          fallbackReason: consumed.timedOut ? 'timeout' : null,
          timeoutKind: consumed.timeoutKind ?? null,
          attemptIndex: attempt.attemptIndex,
          runtimeModel: attempt.model,
        });

        if (consumed.timedOut) {
          const completedContent = trimmedTokenContent;

          const persisted = await persistArtifactSuccess({
            artifactId: artifactStub.id,
            userId,
            type: 'extraction',
            model: attempt.model,
            workflowType: 'extraction',
            content: completedContent,
            promptSource: prompt,
            inputSnapshot: terminalInput,
            completionOutcome,
            completionReason,
            fallbackReason: 'timeout',
            timeoutKind: consumed.timeoutKind ?? null,
            attemptIndex: attempt.attemptIndex,
          });

          completeTokens = { input: persisted.inputTokens, output: persisted.outputTokens };
          completeCost = persisted.cost;

          responseStream = createResolvedExtractionStream({
            chunks: consumed.chunks,
            artifactId: consumed.artifactId ?? artifactStub.id,
            content: completedContent,
            format: consumed.format ?? getExtractionStreamFormat(extractionResponseMode),
            cost: completeCost,
            tokens: completeTokens,
            appendCompleteEvent: !consumed.didComplete,
          });
        } else {
          await db.artifact.update({
            where: { id: artifactStub.id },
            data: {
              input: terminalInput as Prisma.InputJsonValue,
              status: 'completed',
              completedAt: new Date(),
              failureReason: null,
            },
          });

          if (!consumed.didComplete) {
            responseStream = createResolvedExtractionStream({
              chunks: consumed.chunks,
              artifactId: consumed.artifactId ?? artifactStub.id,
              content: consumed.tokenContent,
              format: consumed.format ?? getExtractionStreamFormat(extractionResponseMode),
              appendCompleteEvent: true,
            });
          }
        }

        logBestEffort(log, 'info',
          {
            workflowType: 'extraction',
            projectId: payload.projectId,
            model: attempt.model,
            responseMode: extractionResponseMode,
            duration_ms: Date.now() - startedAt,
            requestId,
            attemptIndex: attempt.attemptIndex,
            runtimeModel: attempt.model,
            timeoutKind: consumed.timeoutKind ?? null,
            fallbackReason: consumed.timedOut ? 'timeout' : null,
            completionOutcome,
            completionReason,
            artifactStatus: terminalState.artifactStatus,
            httpStatus: terminalState.httpStatus,
          },
          'Tool generation stream initialized',
        );

        return sseResponse(responseStream, requestId);
      }

      if (!policyDecision.escalate) {
        break;
      }
    } catch (error) {
      const err = error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: String(error) };

      logBestEffort(log, 'error',
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

  const completionOutcome = 'failed_hard' as const;
  const completionReason = resolveExtractionCompletionReason({
    outcome: completionOutcome,
    hardFailReason: 'no_signal_after_chain_exhausted',
  });
  const terminalInput = buildExtractionTerminalInput({
    attemptInput: lastAttemptInput,
    completionOutcome,
    completionReason,
    fallbackReason: lastFallbackReason,
    timeoutKind: lastTimeoutKind,
    attemptIndex: lastAttemptIndex,
    runtimeModel: lastAttemptModel,
  });

  await persistArtifactFailure({
    artifactId: artifactStub.id,
    userId,
    type: 'extraction',
    model: lastAttemptModel,
    failureReason: lastFallbackReason,
    inputSnapshot: terminalInput,
    completionOutcome,
    completionReason,
    fallbackReason: lastFallbackReason,
    timeoutKind: lastTimeoutKind,
    attemptIndex: lastAttemptIndex,
  });

  logBestEffort(log, 'error',
    {
      workflowType: 'extraction',
      projectId: payload.projectId,
      requestId,
      artifactId: artifactStub.id,
      attemptIndex: lastAttemptIndex,
      runtimeModel: lastAttemptModel,
      timeoutKind: lastTimeoutKind,
      duration_ms: Date.now() - startedAt,
      fallbackReason: lastFallbackReason,
      responseMode: extractionResponseMode,
      policyVersion: EXTRACTION_POLICY_VERSION,
      completionOutcome,
      completionReason,
      artifactStatus: 'failed',
      httpStatus: 503,
    },
    'Extraction fallback chain exhausted',
  );

  return apiError('EXTRACTION_FAILED', 'Impossibile completare l\'estrazione in modo affidabile', 503);
}
