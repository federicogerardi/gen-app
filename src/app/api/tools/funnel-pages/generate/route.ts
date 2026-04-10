import { createArtifactStream } from '@/lib/llm/streaming';
import {
  buildFunnelOptinPrompt,
  buildFunnelQuizPrompt,
  buildFunnelVslPrompt,
} from '@/lib/tool-prompts/funnel-pages';
import {
  enforceUsageGuards,
  parseAndValidateRequest,
  requireAuthenticatedUser,
  requireOwnedProject,
} from '@/lib/tool-routes/guards';
import { serviceUnavailableError, sseResponse } from '@/lib/tool-routes/responses';
import { funnelPagesRequestSchema, getLengthByFunnelStep } from '@/lib/tool-routes/schemas';

async function buildFunnelPrompt(payload: {
  step: 'optin' | 'quiz' | 'vsl';
  customerContext: { product: string; audience: string; offer: string };
  promise: string;
  tone: 'professional' | 'casual' | 'formal' | 'technical';
  notes?: string;
  optinOutput?: string;
  quizOutput?: string;
}) {
  const briefing = {
    product: payload.customerContext.product,
    audience: payload.customerContext.audience,
    offer: payload.customerContext.offer,
    promise: payload.promise,
    tone: payload.tone,
    notes: payload.notes,
  };

  if (payload.step === 'optin') {
    return buildFunnelOptinPrompt(briefing);
  }

  if (payload.step === 'quiz') {
    return buildFunnelQuizPrompt({ ...briefing, optinOutput: payload.optinOutput! });
  }

  return buildFunnelVslPrompt({
    ...briefing,
    optinOutput: payload.optinOutput!,
    quizOutput: payload.quizOutput!,
  });
}

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const userId = authResult.data.userId;

  const parsed = await parseAndValidateRequest(request, funnelPagesRequestSchema);
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

  const prompt = await buildFunnelPrompt(payload);

  try {
    const stream = await createArtifactStream({
      userId,
      projectId: payload.projectId,
      type: 'content',
      workflowType: 'funnel_pages',
      model: payload.model,
      promptOverride: prompt,
      input: {
        topic: prompt,
        tone: payload.tone,
        length: getLengthByFunnelStep(payload.step),
        outputFormat: 'markdown',
        workflowType: 'funnel_pages',
      },
    });

    return sseResponse(stream);
  } catch {
    return serviceUnavailableError();
  }
}
