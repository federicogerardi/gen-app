import { createArtifactStream } from '@/lib/llm/streaming';
import { buildExtractionPrompt } from '@/lib/tool-prompts/extraction';
import {
  enforceUsageGuards,
  parseAndValidateRequest,
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

  const parsed = await parseAndValidateRequest(request, extractionRequestSchema);
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

    return sseResponse(stream);
  } catch {
    return serviceUnavailableError();
  }
}
