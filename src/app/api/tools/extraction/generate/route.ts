import { createArtifactStream } from '@/lib/llm/streaming';
import { getRequestLogger } from '@/lib/logger';
import { buildExtractionPrompt } from '@/lib/tool-prompts/extraction';
import {
  enforceUsageGuards,
  parseAndValidateRequest,
  requireAvailableModel,
  requireAuthenticatedUser,
  requireOwnedProject,
} from '@/lib/tool-routes/guards';
import { serviceUnavailableError, sseResponse } from '@/lib/tool-routes/responses';
import { extractionRequestSchema } from '@/lib/tool-routes/schemas';

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const userId = authResult.data.userId;
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = getRequestLogger({
    requestId,
    route: '/api/tools/extraction/generate',
    method: 'POST',
    userId,
  });

  const parsed = await parseAndValidateRequest(request, extractionRequestSchema);
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
      workflowType: 'extraction',
      projectId: payload.projectId,
      model: payload.model,
    },
    'Tool generation started',
  );

  const usageResult = await enforceUsageGuards(userId, payload.model, 'extraction');
  if (!usageResult.ok) {
    return usageResult.response;
  }

  const ownershipResult = await requireOwnedProject(payload.projectId, userId);
  if (!ownershipResult.ok) {
    return ownershipResult.response;
  }

  const prompt = await buildExtractionPrompt({
    rawContent: payload.rawContent,
    fieldMap: payload.fieldMap,
    tone: payload.tone,
    notes: payload.notes,
  });

  try {
    const stream = await createArtifactStream({
      userId,
      projectId: payload.projectId,
      type: 'extraction',
      workflowType: 'extraction',
      model: payload.model,
      promptOverride: prompt,
      input: {
        rawContent: payload.rawContent,
        fieldMap: payload.fieldMap,
        tone: payload.tone,
        outputFormat: 'json',
        workflowType: 'extraction',
      },
    });

    log.info(
      {
        workflowType: 'extraction',
        projectId: payload.projectId,
        model: payload.model,
        duration_ms: Date.now() - startedAt,
      },
      'Tool generation stream initialized',
    );

    return sseResponse(stream);
  } catch (error) {
    const err = error instanceof Error
      ? { name: error.name, message: error.message }
      : { message: String(error) };

    log.error(
      {
        workflowType: 'extraction',
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
