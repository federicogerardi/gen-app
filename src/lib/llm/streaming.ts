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

export async function createArtifactStream(params: StreamParams): Promise<ReadableStream> {
  const { userId, projectId, type, model, input, promptOverride } = params;
  const workflowType = params.workflowType ?? extractWorkflowType(input);
  const outputFormat = extractOutputFormat(input);
  const modelPricing = await getModelPricingForRuntime(model);

  const artifact = await db.artifact.create({
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

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (obj: object) => {
        const line = `data: ${JSON.stringify(obj)}\n\n`;
        return new TextEncoder().encode(line);
      };

      controller.enqueue(encode({
        type: 'start',
        artifactId: artifact.id,
        workflowType,
        format: outputFormat,
      }));

      let accumulated = '';
      let fallbackOutputTokenCount = 0;
      const sourcePrompt = promptOverride ?? JSON.stringify(input);
      const fallbackInputTokenCount = estimateUtfAwareTokens(sourcePrompt);
      let providerInputTokenCount: number | null = null;
      let providerOutputTokenCount: number | null = null;
      let tokenSequence = 0;
      let pendingUpdate: Promise<void> | null = null;

      try {
        for await (const chunk of orchestrator.generateStream({ type, model, input, promptOverride })) {
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

          controller.enqueue(encode({
            type: 'token',
            token: chunk.token,
            sequence: tokenSequence,
            workflowType,
            format: outputFormat,
          }));

          if (tokenSequence % 20 === 0) {
            controller.enqueue(encode({
              type: 'progress',
              workflowType,
              format: outputFormat,
              estimatedTokens: {
                input: estimatedInputTokens,
                output: estimatedOutputTokens,
              },
              costEstimate,
            }));
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

        const resolvedInputTokens = resolveTokenCount(providerInputTokenCount, fallbackInputTokenCount);
        const resolvedOutputTokens = resolveTokenCount(providerOutputTokenCount, fallbackOutputTokenCount);
        const cost = calculateCostWithPricing(modelPricing, resolvedInputTokens, resolvedOutputTokens);
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

        // Invariant: completed artifacts must have positive token counts.
        // Clamp to 1 rather than persisting zeros that would corrupt cost accounting.
        const safeInputTokens = Math.max(resolvedInputTokens, 1);
        const safeOutputTokens = Math.max(resolvedOutputTokens, 1);
        if (resolvedInputTokens < 1 || resolvedOutputTokens < 1) {
          logger.warn(
            {
              artifactId: artifact.id,
              inputTokenCount: resolvedInputTokens,
              outputTokenCount: resolvedOutputTokens,
              fallbackInputTokenCount,
              fallbackOutputTokenCount,
              providerInputTokenCount,
              providerOutputTokenCount,
            },
            'Token count invariant violation: clamping to 1 before completed persist',
          );
        }

        await db.artifact.update({
          where: { id: artifact.id },
          data: {
            content: normalized.content,
            status: 'completed',
            inputTokens: safeInputTokens,
            outputTokens: safeOutputTokens,
            costUSD: cost,
            completedAt: new Date(),
          },
        });

        // Note: monthlyUsed increment now happens atomically inside enforceUsageGuards (guards.ts)
        // Only update monthlySpent here (already persisted in artifact, cost already calculated)
        await db.user.update({
          where: { id: userId },
          data: {
            monthlySpent: { increment: cost },
          },
        });

        await db.quotaHistory.create({
          data: {
            userId,
            requestCount: 1,
            costUSD: cost,
            model,
            artifactType: type,
            status: 'success' as QuotaEventStatus,
          },
        });

        controller.enqueue(encode({
          type: 'complete',
          artifactId: artifact.id,
          content: normalized.content,
          workflowType,
          format: normalized.format,
          tokens: { input: safeInputTokens, output: safeOutputTokens },
          cost,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed';

        await db.artifact.update({
          where: { id: artifact.id },
          data: { status: 'failed' },
        });

        await db.quotaHistory.create({
          data: {
            userId,
            requestCount: 1,
            costUSD: 0,
            model,
            artifactType: type,
            status: 'error' as QuotaEventStatus,
          },
        });

        controller.enqueue(encode({
          type: 'error',
          code: 'INTERNAL_ERROR',
          message,
          workflowType,
          format: outputFormat,
        }));
      } finally {
        controller.close();
      }
    },
    cancel() {
      // S1-06: Handle client disconnect by marking artifact as failed
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
