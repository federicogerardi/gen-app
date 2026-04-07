import 'server-only';

import { injectTemplateValues, loadPromptSource } from './loader';
import { TOOL_PROMPT_REGISTRY } from './registry';

interface MetaAdsPromptInput {
  product: string;
  audience: string;
  offer: string;
  objective: string;
  tone: 'professional' | 'casual' | 'formal' | 'technical';
  angle?: string;
}

export async function buildMetaAdsPrompt(input: MetaAdsPromptInput): Promise<string> {
  const template = await loadPromptSource(TOOL_PROMPT_REGISTRY.metaAds.generation);

  const context = [
    `Prodotto/Servizio: ${input.product}`,
    `Audience: ${input.audience}`,
    `Offerta: ${input.offer}`,
    `Obiettivo campagna: ${input.objective}`,
    `Tono richiesto: ${input.tone}`,
    `Creative angle: ${input.angle?.trim() || 'Non specificato'}`,
  ].join('\n');

  return injectTemplateValues(template, { context });
}
