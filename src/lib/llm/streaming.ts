import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { LLMOrchestrator } from './orchestrator';
import type { ArtifactType } from './agents/base';
import { calculateCost } from './costs';

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

type OutputFormat = 'plain' | 'json' | 'markdown';

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
      let outputTokenCount = 0;
      const inputTokenCount = Math.ceil((promptOverride ?? JSON.stringify(input)).length / 4);
      let tokenSequence = 0;

      try {
        for await (const chunk of orchestrator.generateStream({ type, model, input, promptOverride })) {
          accumulated += chunk.token;
          outputTokenCount++;
          tokenSequence++;
          const estimatedInputTokens = inputTokenCount;
          const costEstimate = calculateCost(model, estimatedInputTokens, outputTokenCount);

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
                output: outputTokenCount,
              },
              costEstimate,
            }));
          }

          // Persist every 20 tokens to avoid losing progress on crash
          if (outputTokenCount % 20 === 0) {
            await db.artifact.update({
              where: { id: artifact.id },
              data: { content: accumulated, streamedAt: new Date() },
            });
          }
        }

        const cost = calculateCost(model, inputTokenCount, outputTokenCount);
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
        const safeInputTokens = Math.max(inputTokenCount, 1);
        const safeOutputTokens = Math.max(outputTokenCount, 1);
        if (inputTokenCount < 1 || outputTokenCount < 1) {
          logger.warn(
            { artifactId: artifact.id, inputTokenCount, outputTokenCount },
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
            status: 'success',
          },
        });

        controller.enqueue(encode({
          type: 'complete',
          artifactId: artifact.id,
          content: normalized.content,
          workflowType,
          format: normalized.format,
          tokens: { input: inputTokenCount, output: outputTokenCount },
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
            status: 'error',
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
  });

  return stream;
}
