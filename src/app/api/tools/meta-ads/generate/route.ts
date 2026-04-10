import { createArtifactStream } from '@/lib/llm/streaming';
import { buildMetaAdsPrompt } from '@/lib/tool-prompts/meta-ads';
import {
  enforceUsageGuards,
  parseAndValidateRequest,
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

  const parsed = await parseAndValidateRequest(request, metaAdsRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const payload = parsed.data;

  const usageResult = await enforceUsageGuards(userId, payload.model);
  if (!usageResult.ok) {
    return usageResult.response;
  }

  const ownershipResult = await requireOwnedProject(payload.projectId, userId);
  if (!ownershipResult.ok) {
    return ownershipResult.response;
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
        topic: prompt,
        tone: payload.tone,
        length: 1200,
        outputFormat: 'markdown',
        workflowType: 'meta_ads',
      },
    });

    return sseResponse(stream);
  } catch {
    return serviceUnavailableError();
  }
}
