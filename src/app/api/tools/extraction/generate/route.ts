import { createArtifactStream } from '@/lib/llm/streaming';
import { getRequestLogger } from '@/lib/logger';
import {
  EXTRACTION_MAX_COST_USD,
  EXTRACTION_POLICY_VERSION,
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

async function consumeAttemptStream(stream: ReadableStream, timeoutMs: number): Promise<AttemptStreamResult> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let buffer = '';
  let tokenContent = '';
  let costEstimate = 0;
  let errorMessage: string | undefined;
  let timedOut = false;

  const readPromise = (async () => {
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
          tokenContent += typeof payload.token === 'string' ? payload.token : '';
          continue;
        }

        if (payload.type === 'progress') {
          if (typeof payload.costEstimate === 'number') {
            costEstimate = payload.costEstimate;
          }
          continue;
        }

        if (payload.type === 'complete') {
          if (typeof payload.cost === 'number') {
            costEstimate = payload.cost;
          }
          continue;
        }

        if (payload.type === 'error') {
          errorMessage = typeof payload.message === 'string' ? payload.message : 'Generation failed';
        }
      }
    }
  })();

  const timeoutPromise = new Promise<void>((resolve) => {
    const timer = setTimeout(async () => {
      timedOut = true;
      await reader.cancel('timeout').catch(() => undefined);
      resolve();
    }, timeoutMs);

    readPromise.finally(() => {
      clearTimeout(timer);
      resolve();
    }).catch(() => {
      clearTimeout(timer);
      resolve();
    });
  });

  await Promise.race([readPromise, timeoutPromise]);
  if (!timedOut) {
    await readPromise;
  }

  return {
    chunks,
    tokenContent,
    costEstimate,
    errorMessage,
    timedOut,
  };
}

function isFieldMapConsistent(
  parsed: z.infer<typeof extractionOutputSchema>,
  fieldMap: Record<string, unknown>,
): boolean {
  const expectedFields = new Set(Object.keys(fieldMap));
  if (expectedFields.size === 0) {
    return false;
  }

  const extractedFields = Object.keys(parsed.fields);
  const missingFields = parsed.missingFields;

  const unknownExtracted = extractedFields.some((field) => !expectedFields.has(field));
  if (unknownExtracted) {
    return false;
  }

  const unknownMissing = missingFields.some((field) => !expectedFields.has(field));
  if (unknownMissing) {
    return false;
  }

  const overlap = missingFields.some((field) => extractedFields.includes(field));
  if (overlap) {
    return false;
  }

  return extractedFields.length > 0 || missingFields.length > 0;
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
  const runtimeModel = resolveExtractionRuntimeModel(payload.model);
  const attemptPlan = getExtractionAttemptPlan();

  log.info(
    {
      workflowType: 'extraction',
      projectId: payload.projectId,
      model: payload.model,
      runtimeModel,
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
  });

  let cumulativeCost = 0;
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
          cumulativeCostUsd: cumulativeCost,
          maxCostUsd: EXTRACTION_MAX_COST_USD,
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
          outputFormat: 'json',
          workflowType: 'extraction',
          extractionAttempt: attempt.attemptIndex,
          policyVersion: EXTRACTION_POLICY_VERSION,
          fallbackFromModel: attempt.isFallback ? attemptPlan[attempt.attemptIndex - 2]?.model ?? null : null,
          payloadModel: payload.model,
        },
      });

      const consumed = await consumeAttemptStream(stream, attempt.timeoutMs);
      cumulativeCost += consumed.costEstimate;

      let parseOk = false;
      let schemaOk = false;
      let consistencyOk = false;
      let success = false;
      let providerError = false;

      if (consumed.timedOut) {
        fallbackReason = 'timeout';
      } else if (consumed.errorMessage) {
        providerError = true;
        fallbackReason = 'provider_error';
      } else {
        let parsedObject: unknown;
        try {
          parsedObject = JSON.parse(consumed.tokenContent || '{}');
        } catch {
          parsedObject = null;
        }

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
            consistencyOk = isFieldMapConsistent(schemaParsed.data, payload.fieldMap);
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
          cumulativeCostUsd: cumulativeCost,
          maxCostUsd: EXTRACTION_MAX_COST_USD,
        },
      );

      if (policyDecision.reason) {
        fallbackReason = policyDecision.reason;
      }
      lastFallbackReason = fallbackReason;

      if (fallbackReason === 'budget_exceeded') {
        log.warn(
          {
            workflowType: 'extraction',
            projectId: payload.projectId,
            requestId,
            cumulativeCostUsd: cumulativeCost,
            maxCostUsd: EXTRACTION_MAX_COST_USD,
            attemptIndex: attempt.attemptIndex,
            runtimeModel: attempt.model,
          },
          'Extraction attempt chain stopped by budget policy',
        );
      }

      log.info(
        {
          workflowType: 'extraction',
          projectId: payload.projectId,
          requestId,
          attemptIndex: attempt.attemptIndex,
          runtimeModel: attempt.model,
          fallbackReason: success ? null : fallbackReason,
          duration_ms: Date.now() - attemptStartedAt,
          costEstimate: consumed.costEstimate,
          parseOk,
          schemaOk,
          consistencyOk,
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
          cumulativeCostUsd: cumulativeCost,
          maxCostUsd: EXTRACTION_MAX_COST_USD,
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
      policyVersion: EXTRACTION_POLICY_VERSION,
    },
    'Extraction fallback chain exhausted',
  );

  if (lastFallbackReason === 'budget_exceeded') {
    return apiError(
      'EXTRACTION_FAILED',
      'Estrazione interrotta: budget massimo per richiesta superato',
      503,
      {
        reason: 'budget_exceeded',
        maxCostUsd: EXTRACTION_MAX_COST_USD,
        cumulativeCostUsd: Number(cumulativeCost.toFixed(6)),
      },
    );
  }

  return apiError('EXTRACTION_FAILED', 'Impossibile completare l\'estrazione in modo affidabile', 503);
}
