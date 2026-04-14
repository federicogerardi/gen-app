import { createArtifactStream } from '@/lib/llm/streaming';
import { getRequestLogger } from '@/lib/logger';
import {
  buildFunnelOptinPrompt,
  buildFunnelQuizPrompt,
  buildFunnelVslPrompt,
  type FunnelBriefingInput,
  type FunnelExtractionContextInput,
  type FunnelUnifiedBriefingInput,
} from '@/lib/tool-prompts/funnel-pages';
import {
  enforceUsageGuards,
  parseAndValidateRequest,
  requireAvailableModel,
  requireAuthenticatedUser,
  requireOwnedProject,
} from '@/lib/tool-routes/guards';
import { serviceUnavailableError, sseResponse } from '@/lib/tool-routes/responses';
import { mapExtractedFieldsToBriefing } from '@/lib/tool-routes/funnel-mapping';
import {
  funnelPagesRequestSchema,
  getLengthByFunnelStep,
  type FunnelPagesRequest,
  type FunnelPagesRequestV2,
  type FunnelPagesRequestV3,
} from '@/lib/tool-routes/schemas';

function isFunnelV2Payload(payload: FunnelPagesRequest): payload is FunnelPagesRequestV2 {
  return payload.schemaVersion === 'v2';
}

function isFunnelV3Payload(payload: FunnelPagesRequest): payload is FunnelPagesRequestV3 {
  return payload.schemaVersion === 'v3';
}

function buildPromptBriefing(payload: FunnelPagesRequest): FunnelBriefingInput | FunnelUnifiedBriefingInput | FunnelExtractionContextInput {
  if (isFunnelV2Payload(payload)) {
    return {
      briefing: payload.briefing,
      tone: payload.tone,
      notes: payload.notes,
    };
  }

  if (isFunnelV3Payload(payload)) {
    if (payload.extractionContext && payload.extractionContext.trim().length > 0) {
      return {
        contextText: payload.extractionContext,
        tone: payload.tone,
        notes: payload.notes,
      };
    }

    return {
      briefing: mapExtractedFieldsToBriefing(payload),
      tone: payload.tone,
      notes: payload.notes,
    };
  }

  return {
    product: payload.customerContext.product,
    audience: payload.customerContext.audience,
    offer: payload.customerContext.offer,
    promise: payload.promise,
    tone: payload.tone,
    notes: payload.notes,
  };
}

async function buildFunnelPrompt(payload: {
  step: 'optin' | 'quiz' | 'vsl';
  briefing: FunnelBriefingInput | FunnelUnifiedBriefingInput | FunnelExtractionContextInput;
  optinOutput?: string;
  quizOutput?: string;
}) {
  if (payload.step === 'optin') {
    return buildFunnelOptinPrompt(payload.briefing);
  }

  if (payload.step === 'quiz') {
    return buildFunnelQuizPrompt({ ...payload.briefing, optinOutput: payload.optinOutput! });
  }

  return buildFunnelVslPrompt({
    ...payload.briefing,
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
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = getRequestLogger({
    requestId,
    route: '/api/tools/funnel-pages/generate',
    method: 'POST',
    userId,
  });

  const parsed = await parseAndValidateRequest(request, funnelPagesRequestSchema);
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
      workflowType: 'funnel_pages',
      projectId: payload.projectId,
      model: payload.model,
      step: payload.step,
    },
    'Tool generation started',
  );

  const ownershipResult = await requireOwnedProject(payload.projectId, userId);
  if (!ownershipResult.ok) {
    return ownershipResult.response;
  }

  const usageResult = await enforceUsageGuards(userId, payload.model, 'funnel_pages');
  if (!usageResult.ok) {
    return usageResult.response;
  }

  const prompt = await buildFunnelPrompt({
    step: payload.step,
    briefing: buildPromptBriefing(payload),
    optinOutput: payload.optinOutput,
    quizOutput: payload.quizOutput,
  });

  try {
    const stream = await createArtifactStream({
      userId,
      projectId: payload.projectId,
      type: 'content',
      workflowType: 'funnel_pages',
      model: payload.model,
      promptOverride: prompt,
      input: {
        topic: `funnel_${payload.step}`,
        tone: payload.tone,
        length: getLengthByFunnelStep(payload.step),
        outputFormat: 'markdown',
        workflowType: 'funnel_pages',
      },
    });

    log.info(
      {
        workflowType: 'funnel_pages',
        projectId: payload.projectId,
        model: payload.model,
        step: payload.step,
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
        workflowType: 'funnel_pages',
        projectId: payload.projectId,
        model: payload.model,
        step: payload.step,
        duration_ms: Date.now() - startedAt,
        err,
      },
      'Tool generation failed',
    );

    return serviceUnavailableError();
  }
}
