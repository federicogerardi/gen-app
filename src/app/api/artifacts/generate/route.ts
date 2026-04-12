import { createArtifactStream } from '@/lib/llm/streaming';
import { getRequestLogger } from '@/lib/logger';
import { z } from 'zod';
import {
  enforceUsageGuards,
  parseAndValidateRequest,
  requireAvailableModel,
  requireAuthenticatedUser,
  requireOwnedProject,
} from '@/lib/tool-routes/guards';
import { serviceUnavailableError } from '@/lib/tool-routes/responses';

// Note: 'extraction' type is tool-specific, only available through /api/tools/extraction/generate
const ALLOWED_TYPES = ['content', 'seo', 'code'] as const;

const generateSchema = z.object({
  projectId: z.string().cuid(),
  type: z.enum(ALLOWED_TYPES),
  model: z.string().min(1),
  input: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const userId = authResult.data.userId;
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = getRequestLogger({
    requestId,
    route: '/api/artifacts/generate',
    method: 'POST',
    userId,
  });

  const parsed = await parseAndValidateRequest(request, generateSchema);
  if (!parsed.ok) {
    log.warn({ reason: 'validation-error' }, 'Artifact generation rejected due to invalid payload');
    return parsed.response;
  }

  const { projectId, type, model, input } = parsed.data;

  const modelResult = await requireAvailableModel(model);
  if (!modelResult.ok) {
    return modelResult.response;
  }

  const usageResult = await enforceUsageGuards(userId, model, type);
  if (!usageResult.ok) {
    return usageResult.response;
  }

  const ownershipResult = await requireOwnedProject(projectId, userId);
  if (!ownershipResult.ok) {
    return ownershipResult.response;
  }

  try {
    log.info({ projectId, type, model }, 'Starting artifact stream generation');
    const stream = await createArtifactStream({ userId, projectId, type, model, input });

    log.info({ projectId, type, model }, 'Artifact stream initialized');
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'x-request-id': requestId,
      },
    });
  } catch (error) {
    log.error({ error, projectId, type, model }, 'Artifact generation failed with provider error');
    return serviceUnavailableError();
  }
}
