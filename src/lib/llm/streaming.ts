import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { LLMOrchestrator } from './orchestrator';
import type { ArtifactType, OutputFormat, QuotaEventStatus } from '@/lib/types/artifact';
import { calculateCostWithPricing } from './costs';
import { getModelPricingForRuntime } from './model-registry';

const orchestrator = new LLMOrchestrator();

interface StreamParams {
  userId: string;
  projectId: string;
  type: ArtifactType;
  model: string;
  input: unknown;
  workflowType?: string | null;
  promptOverride?: string;
  artifactId?: string;
  persistFailure?: boolean;
  persistPartialOnTimeout?: boolean;
}

interface PersistArtifactSuccessParams {
  artifactId: string;
  userId: string;
  type: ArtifactType;
  model: string;
  workflowType: string | null;
  content: string;
  promptSource: string;
  inputSnapshot?: Record<string, unknown>;
  completionOutcome?: string;
  completionReason?: string;
  fallbackReason?: string | null;
  timeoutKind?: string | null;
  attemptIndex?: number;
  providerInputTokens?: number | null;
  providerOutputTokens?: number | null;
}

interface PersistArtifactFailureParams {
  artifactId: string;
  userId: string;
  type: ArtifactType;
  model: string;
  failureReason: string;
  inputSnapshot?: Record<string, unknown>;
  completionOutcome?: string;
  completionReason?: string;
  fallbackReason?: string | null;
  timeoutKind?: string | null;
  attemptIndex?: number;
}

function estimateUtfAwareTokens(text: string): number {
  if (!text) return 0;
  const utf8Bytes = new TextEncoder().encode(text).length;
  return Math.ceil(utf8Bytes / 4);
}

function resolveTokenCount(providerCount: number | null, fallbackCount: number): number {
  if (providerCount !== null && providerCount > 0) {
    return providerCount;
  }
  return fallbackCount;
}

function extractWorkflowType(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const maybe = (input as Record<string, unknown>).workflowType;
  return typeof maybe === 'string' ? maybe : null;
}

function extractOutputFormat(input: unknown): OutputFormat {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'plain';

  const maybe = (input as Record<string, unknown>).outputFormat;
  if (maybe === 'markdown') return 'markdown';
  if (maybe === 'json') return 'json';
  return 'plain';
}

export async function persistArtifactSuccess(params: PersistArtifactSuccessParams): Promise<{
  inputTokens: number;
  outputTokens: number;
  cost: number;
}> {
  const modelPricing = await getModelPricingForRuntime(params.model);
  const fallbackInputTokenCount = estimateUtfAwareTokens(params.promptSource);
  const fallbackOutputTokenCount = estimateUtfAwareTokens(params.content);
  const resolvedInputTokens = resolveTokenCount(params.providerInputTokens ?? null, fallbackInputTokenCount);
  const resolvedOutputTokens = resolveTokenCount(params.providerOutputTokens ?? null, fallbackOutputTokenCount);
  const cost = calculateCostWithPricing(modelPricing, resolvedInputTokens, resolvedOutputTokens);
  const safeInputTokens = Math.max(resolvedInputTokens, 1);
  const safeOutputTokens = Math.max(resolvedOutputTokens, 1);

  if (resolvedInputTokens < 1 || resolvedOutputTokens < 1) {
    logger.warn(
      {
        artifactId: params.artifactId,
        inputTokenCount: resolvedInputTokens,
        outputTokenCount: resolvedOutputTokens,
        fallbackInputTokenCount,
        fallbackOutputTokenCount,
        providerInputTokenCount: params.providerInputTokens ?? null,
        providerOutputTokenCount: params.providerOutputTokens ?? null,
      },
      'Token count invariant violation: clamping to 1 before completed persist',
    );
  }

  const terminalState: Record<string, unknown> = {
    completionOutcome: params.completionOutcome ?? 'completed_full',
    completionReason: params.completionReason ?? null,
    fallbackReason: params.fallbackReason ?? null,
    timeoutKind: params.timeoutKind ?? null,
    attemptIndex: params.attemptIndex ?? null,
    finalizedAt: new Date().toISOString(),
  };

  const artifactData: {
    content: string;
    status: 'completed';
    failureReason: null;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
    completedAt: Date;
    input?: Record<string, unknown>;
  } = {
    content: params.content,
    status: 'completed',
    failureReason: null,
    inputTokens: safeInputTokens,
    outputTokens: safeOutputTokens,
    costUSD: cost,
    completedAt: new Date(),
  };

  if (params.inputSnapshot) {
    artifactData.input = {
      ...params.inputSnapshot,
      terminalState,
    };
  }

  await db.$transaction(async (tx) => {
    await tx.artifact.update({
      where: { id: params.artifactId },
      data: artifactData,
    });

    await tx.user.update({
      where: { id: params.userId },
      data: {
        monthlySpent: { increment: cost },
      },
    });

    await tx.quotaHistory.create({
      data: {
        userId: params.userId,
        requestCount: 1,
        costUSD: cost,
        model: params.model,
        artifactType: params.type,
        status: 'success' as QuotaEventStatus,
      },
    });
  });

  return {
    inputTokens: safeInputTokens,
    outputTokens: safeOutputTokens,
    cost,
  };
}

export async function persistArtifactFailure(params: PersistArtifactFailureParams): Promise<void> {
  const terminalState: Record<string, unknown> = {
    completionOutcome: params.completionOutcome ?? 'failed_hard',
    completionReason: params.completionReason ?? null,
    fallbackReason: params.fallbackReason ?? params.failureReason,
    timeoutKind: params.timeoutKind ?? null,
    attemptIndex: params.attemptIndex ?? null,
    finalizedAt: new Date().toISOString(),
  };

  const artifactData: {
    status: 'failed';
    failureReason: string;
    input?: Record<string, unknown>;
  } = {
    status: 'failed',
    failureReason: params.failureReason,
  };

  if (params.inputSnapshot) {
    artifactData.input = {
      ...params.inputSnapshot,
      terminalState,
    };
  }

  await db.$transaction(async (tx) => {
    await tx.artifact.update({
      where: { id: params.artifactId },
      data: artifactData,
    });

    await tx.quotaHistory.create({
      data: {
        userId: params.userId,
        requestCount: 1,
        costUSD: 0,
        model: params.model,
        artifactType: params.type,
        status: 'error' as QuotaEventStatus,
      },
    });
  });
}

export async function createArtifactStream(params: StreamParams): Promise<ReadableStream> {
  const { userId, projectId, type, model, input, promptOverride } = params;
  const workflowType = params.workflowType ?? extractWorkflowType(input);
  const outputFormat = extractOutputFormat(input);
  const modelPricing = await getModelPricingForRuntime(model);
  const providerAbortController = new AbortController();
  const persistFailure = params.persistFailure ?? true;
  const persistPartialOnTimeout = params.persistPartialOnTimeout ?? true;

  const artifact = params.artifactId
    ? { id: params.artifactId }
    : await db.artifact.create({
      data: {
        userId,
        projectId,
        type,
        workflowType,
        model,
        input: input as object,
        status: 'generating',
      },
    });

  if (params.artifactId) {
    await db.artifact.update({
      where: { id: params.artifactId },
      data: {
        workflowType,
        model,
        input: input as object,
        content: '',
        status: 'generating',
        failureReason: null,
      },
    });
  }

  let cancellationReason: 'timeout' | 'client_disconnect' | 'other' | null = null;
  let terminalState: 'open' | 'completed' | 'failed' = 'open';
  let controllerClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (obj: object) => {
        const line = `data: ${JSON.stringify(obj)}\n\n`;
        return new TextEncoder().encode(line);
      };

      const transitionTerminalState = (nextState: 'completed' | 'failed') => {
        if (terminalState !== 'open') {
          return false;
        }

        terminalState = nextState;
        return true;
      };

      const enqueueEvent = (payload: object) => {
        if (controllerClosed) {
          return;
        }

        controller.enqueue(encode(payload));
      };

      const closeController = () => {
        if (controllerClosed) {
          return;
        }

        controllerClosed = true;
        controller.close();
      };

      enqueueEvent({
        type: 'start',
        artifactId: artifact.id,
        workflowType,
        format: outputFormat,
      });

      let accumulated = '';
      let fallbackOutputTokenCount = 0;
      const sourcePrompt = promptOverride ?? JSON.stringify(input);
      const fallbackInputTokenCount = estimateUtfAwareTokens(sourcePrompt);
      let providerInputTokenCount: number | null = null;
      let providerOutputTokenCount: number | null = null;
      let tokenSequence = 0;
      let pendingUpdate: Promise<void> | null = null;

      try {
        for await (const chunk of orchestrator.generateStream({
          type,
          model,
          input,
          promptOverride,
          abortSignal: providerAbortController.signal,
        })) {
          accumulated += chunk.token;
          fallbackOutputTokenCount = estimateUtfAwareTokens(accumulated);
          tokenSequence++;

          if (chunk.usage?.inputTokens && chunk.usage.inputTokens > 0) {
            providerInputTokenCount = chunk.usage.inputTokens;
          }

          if (chunk.usage?.outputTokens && chunk.usage.outputTokens > 0) {
            providerOutputTokenCount = chunk.usage.outputTokens;
          }

          const estimatedInputTokens = resolveTokenCount(providerInputTokenCount, fallbackInputTokenCount);
          const estimatedOutputTokens = resolveTokenCount(providerOutputTokenCount, fallbackOutputTokenCount);
          const costEstimate = calculateCostWithPricing(modelPricing, estimatedInputTokens, estimatedOutputTokens);

          enqueueEvent({
            type: 'token',
            token: chunk.token,
            sequence: tokenSequence,
            workflowType,
            format: outputFormat,
          });

          if (tokenSequence % 20 === 0) {
            enqueueEvent({
              type: 'progress',
              workflowType,
              format: outputFormat,
              estimatedTokens: {
                input: estimatedInputTokens,
                output: estimatedOutputTokens,
              },
              costEstimate,
            });
          }

          // S3-02: Batch database writes every 50 tokens to reduce DB pressure
          // Old threshold was 20 tokens, resulting in ~800 writes/sec at scale.
          // New threshold of 50 tokens reduces this to ~320 writes/sec.
          if (tokenSequence % 50 === 0) {
            // Don't await here — let update run in background while streaming continues
            // This implements backpressure: pending updates accumulate if DB is slow
            pendingUpdate ??= (async () => {
              await db.artifact.update({
                where: { id: artifact.id },
                data: { content: accumulated, streamedAt: new Date() },
              });
              pendingUpdate = null;
            })();
          }
        }

        // Ensure any pending update completes before marking artifact as completed
        if (pendingUpdate) {
          await pendingUpdate;
        }

        const normalized = orchestrator.normalizeOutput({
          rawContent: accumulated,
          type,
          workflowType,
        });

        if (normalized.warning) {
          logger.warn(
            {
              artifactId: artifact.id,
              workflowType,
              warning: normalized.warning,
            },
            'Artifact output normalization fallback applied',
          );
        }

        if (!transitionTerminalState('completed')) {
          return;
        }

        const persisted = await persistArtifactSuccess({
          artifactId: artifact.id,
          userId,
          type,
          model,
          workflowType,
          content: normalized.content,
          promptSource: sourcePrompt,
          providerInputTokens: providerInputTokenCount,
          providerOutputTokens: providerOutputTokenCount,
        });

        enqueueEvent({
          type: 'complete',
          artifactId: artifact.id,
          content: normalized.content,
          workflowType,
          format: normalized.format,
          tokens: { input: persisted.inputTokens, output: persisted.outputTokens },
          cost: persisted.cost,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed';

        const hasUsefulPartialContent = accumulated.trim().length >= 120;
        const canPersistPartialTimeout = providerAbortController.signal.aborted
          && cancellationReason === 'timeout'
          && hasUsefulPartialContent;

        if (canPersistPartialTimeout && persistPartialOnTimeout) {
          if (!transitionTerminalState('completed')) {
            return;
          }

          await persistArtifactSuccess({
            artifactId: artifact.id,
            userId,
            type,
            model,
            workflowType,
            content: accumulated,
            promptSource: sourcePrompt,
            providerInputTokens: providerInputTokenCount,
            providerOutputTokens: providerOutputTokenCount,
          });
        } else if (cancellationReason === 'client_disconnect') {
          return;
        } else if (persistFailure) {
          if (!transitionTerminalState('failed')) {
            return;
          }

          await persistArtifactFailure({
            artifactId: artifact.id,
            userId,
            type,
            model,
            failureReason: providerAbortController.signal.aborted && cancellationReason === 'timeout'
              ? 'timeout'
              : 'error',
            inputSnapshot: input as Record<string, unknown>,
          });

          if (!providerAbortController.signal.aborted) {
            enqueueEvent({
              type: 'error',
              code: 'INTERNAL_ERROR',
              message,
              workflowType,
              format: outputFormat,
            });
          }
        } else {
          await db.artifact.update({
            where: { id: artifact.id },
            data: {
              content: accumulated,
              streamedAt: accumulated ? new Date() : undefined,
              status: 'generating',
              failureReason: null,
            },
          });

          if (!providerAbortController.signal.aborted) {
            enqueueEvent({
              type: 'error',
              code: 'INTERNAL_ERROR',
              message,
              workflowType,
              format: outputFormat,
            });
          }
        }
      } finally {
        try {
          closeController();
        } catch {
          // Stream may already be cancelled by caller timeout handling.
        }
      }
    },
    cancel(reason) {
      const normalizedReason = typeof reason === 'string'
        ? reason
        : reason instanceof Error
          ? reason.message
          : 'stream_cancelled';

      cancellationReason = normalizedReason === 'timeout'
        ? 'timeout'
        : normalizedReason === 'stream_cancelled'
          ? 'client_disconnect'
          : 'other';

      providerAbortController.abort(
        reason instanceof Error ? reason : new Error(normalizedReason),
      );

      // Mark as failed only for actual client disconnects.
      // Timeout cancellations may still be accepted upstream with useful partial content.
      if (cancellationReason !== 'client_disconnect') {
        return;
      }

      if (terminalState !== 'open') {
        return;
      }

      terminalState = 'failed';

      db.artifact.update({
        where: { id: artifact.id },
        data: {
          status: 'failed',
          failureReason: 'client_disconnect',
        },
      }).catch((err) => {
        logger.error(
          { artifactId: artifact.id, err },
          'Failed to mark artifact as failed on stream cancel',
        );
      });
    },
  });

  return stream;
}
