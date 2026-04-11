import 'server-only';

import { injectTemplateValues, loadPromptSource } from './loader';
import { TOOL_PROMPT_REGISTRY } from './registry';
import type { ExtractionRequest } from '@/lib/tool-routes/schemas';

export async function buildExtractionPrompt(input: Pick<ExtractionRequest, 'rawContent' | 'fieldMap' | 'tone' | 'notes'>): Promise<string> {
  const template = await loadPromptSource(TOOL_PROMPT_REGISTRY.extraction.generation);

  const fieldMap = Object.entries(input.fieldMap)
    .map(([fieldName, definition]) => {
      return `- ${fieldName}: type=${definition.type}, required=${definition.required ? 'true' : 'false'}, description=${definition.description}`;
    })
    .join('\n');

  const context = [
    `Tono richiesto: ${input.tone}`,
    'Field map:',
    fieldMap,
    `Note: ${input.notes?.trim() || 'Nessuna'}`,
    'Raw content:',
    input.rawContent,
  ].join('\n\n');

  return injectTemplateValues(template, { context });
}
