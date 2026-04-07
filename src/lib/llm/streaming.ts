import { db } from '@/lib/db';
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
}

export async function createArtifactStream(params: StreamParams): Promise<ReadableStream> {
  const { userId, projectId, type, model, input } = params;

  const artifact = await db.artifact.create({
    data: {
      userId,
      projectId,
      type,
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

      controller.enqueue(encode({ type: 'start', artifactId: artifact.id }));

      let accumulated = '';
      let outputTokenCount = 0;
      let inputTokenCount = 0;

      try {
        for await (const chunk of orchestrator.generateStream({ type, model, input })) {
          accumulated += chunk.token;
          outputTokenCount++;
          controller.enqueue(encode({ type: 'token', token: chunk.token }));

          // Persist every 20 tokens to avoid losing progress on crash
          if (outputTokenCount % 20 === 0) {
            await db.artifact.update({
              where: { id: artifact.id },
              data: { content: accumulated, streamedAt: new Date() },
            });
          }
        }

        // Estimate input tokens (rough: 1 token ≈ 4 chars of prompt)
        inputTokenCount = Math.ceil(accumulated.length / 4);
        const cost = calculateCost(model, inputTokenCount, outputTokenCount);

        await db.artifact.update({
          where: { id: artifact.id },
          data: {
            content: accumulated,
            status: 'completed',
            inputTokens: inputTokenCount,
            outputTokens: outputTokenCount,
            costUSD: cost,
            completedAt: new Date(),
          },
        });

        await db.user.update({
          where: { id: userId },
          data: {
            monthlyUsed: { increment: 1 },
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

        controller.enqueue(encode({ type: 'error', message }));
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}
