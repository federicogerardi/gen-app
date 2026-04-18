import { createArtifactStream } from '@/lib/llm/streaming';
import { getRequestLogger } from '@/lib/logger';
import {
  buildNextLandLandingPrompt,
  buildNextLandThankYouPrompt,
} from '@/lib/tool-prompts/nextland';
import type {
  FunnelBriefingInput,
  FunnelExtractionContextInput,
  FunnelUnifiedBriefingInput,
} from '@/lib/tool-prompts/funnel-pages';
import {
  enforceUsageGuards,
  parseAndValidateRequest,
  requireAvailableModel,
  requireAuthenticatedUser,
  requireOwnedProject,
} from '@/lib/tool-routes/guards';
import { mapExtractedFieldsToBriefing } from '@/lib/tool-routes/funnel-mapping';
import { serviceUnavailableError, sseResponse } from '@/lib/tool-routes/responses';
import {
  getLengthByNextLandStep,
  nextLandRequestSchema,
  type FunnelPagesRequestV3,
  type NextLandRequest,
  type NextLandRequestV2,
  type NextLandRequestV3,
} from '@/lib/tool-routes/schemas';

function isNextLandV2Payload(payload: NextLandRequest): payload is NextLandRequestV2 {
  return payload.schemaVersion === 'v2';
}

function isNextLandV3Payload(payload: NextLandRequest): payload is NextLandRequestV3 {
  return payload.schemaVersion === 'v3';
}

function buildPromptBriefing(payload: NextLandRequest): FunnelBriefingInput | FunnelUnifiedBriefingInput | FunnelExtractionContextInput {
  if (isNextLandV2Payload(payload)) {
    return {
      briefing: payload.briefing,
      tone: payload.tone,
      notes: payload.notes,
    };
  }

  if (isNextLandV3Payload(payload)) {
    if (payload.extractionContext && payload.extractionContext.trim().length > 0) {
      return {
        contextText: payload.extractionContext,
        tone: payload.tone,
        notes: payload.notes,
      };
    }

    // Reuse funnel v3 mapping by adapting the NextLand payload to the expected shape.
    const mappingPayload: FunnelPagesRequestV3 = {
      projectId: payload.projectId,
      model: payload.model,
      tone: payload.tone,
      schemaVersion: 'v3',
      step: 'optin',
      extractedFields: payload.extractedFields,
      extractionContext: payload.extractionContext,
      notes: payload.notes,
      optinOutput: payload.landingOutput,
    };

    return {
      briefing: mapExtractedFieldsToBriefing(mappingPayload),
      tone: payload.tone,
      notes: payload.notes,
    };
  }

  throw new Error('Unsupported NextLand payload');
}

async function buildNextLandPrompt(payload: {
  step: 'landing' | 'thank_you';
  briefing: FunnelBriefingInput | FunnelUnifiedBriefingInput | FunnelExtractionContextInput;
  landingOutput?: string;
}) {
  if (payload.step === 'landing') {
    return buildNextLandLandingPrompt(payload.briefing);
  }

  return buildNextLandThankYouPrompt({
    ...payload.briefing,
    landingOutput: payload.landingOutput!,
  });
}

function getTopicByStep(step: NextLandRequest['step']): 'nextland_landing' | 'nextland_thank_you' {
  if (step === 'landing') return 'nextland_landing';
  return 'nextland_thank_you';
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
    route: '/api/tools/nextland/generate',
    method: 'POST',
    userId,
  });

  const NEXTLAND_STREAM_DEADLINE_MS = 270_000;

  const parsed = await parseAndValidateRequest(request, nextLandRequestSchema);
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
      workflowType: 'nextland',
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

  const usageResult = await enforceUsageGuards(userId, payload.model, 'nextland');
  if (!usageResult.ok) {
    return usageResult.response;
  }

  const prompt = await buildNextLandPrompt({
    step: payload.step,
    briefing: buildPromptBriefing(payload),
    landingOutput: payload.landingOutput,
  });

  try {
    const stream = await createArtifactStream({
      userId,
      projectId: payload.projectId,
      type: 'content',
      workflowType: 'nextland',
      model: payload.model,
      promptOverride: prompt,
      streamDeadlineMs: NEXTLAND_STREAM_DEADLINE_MS,
      input: {
        topic: getTopicByStep(payload.step),
        tone: payload.tone,
        length: getLengthByNextLandStep(payload.step),
        outputFormat: 'markdown',
        workflowType: 'nextland',
      },
    });

    log.info(
      {
        workflowType: 'nextland',
        projectId: payload.projectId,
        model: payload.model,
        step: payload.step,
        streamDeadlineMs: NEXTLAND_STREAM_DEADLINE_MS,
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
        workflowType: 'nextland',
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