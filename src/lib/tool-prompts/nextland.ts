import 'server-only';

import { loadPromptSource } from './loader';
import { TOOL_PROMPT_REGISTRY } from './registry';
import {
  buildToolBriefingText,
  type FunnelBriefingInput,
  type FunnelExtractionContextInput,
  type FunnelUnifiedBriefingInput,
} from './funnel-pages';

export async function buildNextLandLandingPrompt(
  input: FunnelBriefingInput | FunnelUnifiedBriefingInput | FunnelExtractionContextInput,
): Promise<string> {
  const template = await loadPromptSource(TOOL_PROMPT_REGISTRY.nextland.landing);

  return [
    template,
    '## BRIEFING OPERATIVO',
    buildToolBriefingText(input),
    'Restituisci output rigorosamente conforme alle regole del prompt.',
  ].join('\n\n');
}

export async function buildNextLandThankYouPrompt(
  input: (FunnelBriefingInput | FunnelUnifiedBriefingInput | FunnelExtractionContextInput) & { landingOutput: string },
): Promise<string> {
  const template = await loadPromptSource(TOOL_PROMPT_REGISTRY.nextland.thankYou);

  return [
    template,
    '## BRIEFING OPERATIVO',
    buildToolBriefingText(input),
    '## CONTESTO LANDING PAGE GIA GENERATA',
    input.landingOutput,
    'Restituisci output rigorosamente conforme alle regole del prompt.',
  ].join('\n\n');
}