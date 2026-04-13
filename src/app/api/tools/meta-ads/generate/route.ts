import { createArtifactStream } from '@/lib/llm/streaming';
import { getRequestLogger } from '@/lib/logger';
import { buildMetaAdsPrompt } from '@/lib/tool-prompts/meta-ads';
import {
  enforceUsageGuards,
  parseAndValidateRequest,
  requireAvailableModel,
  requireAuthenticatedUser,
  requireOwnedProject,
} from '@/lib/tool-routes/guards';
import { serviceUnavailableError, sseResponse } from '@/lib/tool-routes/responses';
import { metaAdsRequestSchema } from '@/lib/tool-routes/schemas';

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const userId = authResult.data.userId;
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = getRequestLogger({
    requestId,
    route: '/api/tools/meta-ads/generate',
    method: 'POST',
    userId,
  });

  const parsed = await parseAndValidateRequest(request, metaAdsRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const payload = parsed.data;
  const startedAt = Date.now();

  const modelResult = await requireAvailableModel(payload.model);
  if (!modelResult.ok) {
    return modelResult.response;
  }

  log.info(
    {
      workflowType: 'meta_ads',
      projectId: payload.projectId,
      model: payload.model,
    },
    'Tool generation started',
  );

  const ownershipResult = await requireOwnedProject(payload.projectId, userId);
  if (!ownershipResult.ok) {
    return ownershipResult.response;
  }

  const usageResult = await enforceUsageGuards(userId, payload.model, 'meta_ads');
  if (!usageResult.ok) {
    return usageResult.response;
  }

  const prompt = await buildMetaAdsPrompt({
    product: payload.customerContext.product,
    audience: payload.customerContext.audience,
    offer: payload.customerContext.offer,
    objective: payload.objective,
    tone: payload.tone,
    angle: payload.angle,
  });

  try {
    const stream = await createArtifactStream({
      userId,
      projectId: payload.projectId,
      type: 'content',
      workflowType: 'meta_ads',
      model: payload.model,
      promptOverride: prompt,
      input: {
        topic: payload.objective,
        tone: payload.tone,
        length: 1200,
        outputFormat: 'markdown',
        workflowType: 'meta_ads',
      },
    });

    log.info(
      {
        workflowType: 'meta_ads',
        projectId: payload.projectId,
        model: payload.model,
        duration_ms: Date.now() - startedAt,
      },
      'Tool generation stream initialized',
    );

    return sseResponse(stream, requestId);
  } catch (error) {
    const err = error instanceof Error
      ? { name: error.name, message: error.message }
      : { message: String(error) };

    log.error(
      {
        workflowType: 'meta_ads',
        projectId: payload.projectId,
        model: payload.model,
        duration_ms: Date.now() - startedAt,
        err,
      },
      'Tool generation failed',
    );

    return serviceUnavailableError();
  }
}
