import 'server-only';

import { loadPromptSource } from './loader';
import { TOOL_PROMPT_REGISTRY } from './registry';

interface FunnelBriefingInput {
  product: string;
  audience: string;
  offer: string;
  promise: string;
  tone: 'professional' | 'casual' | 'formal' | 'technical';
  notes?: string;
}

function buildBriefingText(input: FunnelBriefingInput): string {
  return [
    `Prodotto/Servizio: ${input.product}`,
    `Audience target: ${input.audience}`,
    `Offerta: ${input.offer}`,
    `Promessa principale: ${input.promise}`,
    `Tono richiesto: ${input.tone}`,
    `Note aggiuntive: ${input.notes?.trim() || 'Nessuna'}`,
  ].join('\n');
}

export async function buildFunnelOptinPrompt(input: FunnelBriefingInput): Promise<string> {
  const template = await loadPromptSource(TOOL_PROMPT_REGISTRY.funnel.optin);
  return `${template}\n\n## BRIEFING OPERATIVO\n${buildBriefingText(input)}\n\nRestituisci output rigorosamente conforme alle regole del prompt.`;
}

export async function buildFunnelQuizPrompt(input: FunnelBriefingInput & { optinOutput: string }): Promise<string> {
  const template = await loadPromptSource(TOOL_PROMPT_REGISTRY.funnel.quiz);
  return [
    template,
    '## BRIEFING OPERATIVO',
    buildBriefingText(input),
    '## CONTESTO OPTIN PAGE GIA GENERATA',
    input.optinOutput,
    'Restituisci output rigorosamente conforme alle regole del prompt.',
  ].join('\n\n');
}

export async function buildFunnelVslPrompt(input: FunnelBriefingInput & { optinOutput: string; quizOutput: string }): Promise<string> {
  const template = await loadPromptSource(TOOL_PROMPT_REGISTRY.funnel.vsl);
  return [
    template,
    '## BRIEFING OPERATIVO',
    buildBriefingText(input),
    '## CONTESTO OPTIN PAGE GIA GENERATA',
    input.optinOutput,
    '## CONTESTO QUIZ GIA GENERATO',
    input.quizOutput,
    'Restituisci output rigorosamente conforme alle regole del prompt.',
  ].join('\n\n');
}

export type { FunnelBriefingInput };
