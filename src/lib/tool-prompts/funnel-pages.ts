import 'server-only';

import { loadPromptSource } from './loader';
import { TOOL_PROMPT_REGISTRY } from './registry';
import type { FunnelUnifiedBriefing } from '@/lib/tool-routes/schemas';

interface FunnelBriefingInput {
  product: string;
  audience: string;
  offer: string;
  promise: string;
  tone: 'professional' | 'casual' | 'formal' | 'technical';
  notes?: string;
}

type FunnelUnifiedBriefingInput = {
  briefing: FunnelUnifiedBriefing;
  tone: 'professional' | 'casual' | 'formal' | 'technical';
  notes?: string;
};

type FunnelExtractionContextInput = {
  contextText: string;
  tone: 'professional' | 'casual' | 'formal' | 'technical';
  notes?: string;
};

function buildLegacyBriefingText(input: FunnelBriefingInput): string {
  return [
    `Prodotto/Servizio: ${input.product}`,
    `Audience target: ${input.audience}`,
    `Offerta: ${input.offer}`,
    `Promessa principale: ${input.promise}`,
    `Tono richiesto: ${input.tone}`,
    `Note aggiuntive: ${input.notes?.trim() || 'Nessuna'}`,
  ].join('\n');
}

function buildUnifiedBriefingText(input: FunnelUnifiedBriefingInput): string {
  const { briefing } = input;
  const clusterProfiles = briefing.segmentation_context.cluster_profiles ?? [];
  const leadMagnets = briefing.segmentation_context.lead_magnets_by_cluster ?? [];
  const caseStudies = briefing.proof_context.case_studies ?? [];
  const testimonialSources = briefing.proof_context.testimonials_sources ?? [];
  const visualProofAssets = briefing.proof_context.visual_proof_assets ?? [];

  return [
    '### Business Context',
    `- Tipo business: ${briefing.business_context.business_type}`,
    `- Settore/Nicchia: ${briefing.business_context.sector_niche}`,
    `- Fascia prezzo offerta: ${briefing.business_context.offer_price_range}`,
    `- Profilo target ideale: ${briefing.business_context.target_profile}`,
    `- Contesto operativo: ${briefing.business_context.operational_context || 'Non specificato'}`,
    '',
    '### Offer Context',
    `- Problema principale: ${briefing.offer_context.core_problem}`,
    `- Nuova opportunita: ${briefing.offer_context.new_opportunity}`,
    `- Metodo tradizionale: ${briefing.offer_context.old_method}`,
    `- Modello erogazione: ${briefing.offer_context.delivery_model}`,
    `- Coinvolgimento richiesto: ${briefing.offer_context.client_involvement_required || 'Non specificato'}`,
    '',
    '### Qualification Context',
    `- Must-have: ${briefing.qualification_context.must_have_criteria}`,
    `- Nice-to-have: ${briefing.qualification_context.nice_to_have_criteria || 'Non specificato'}`,
    `- Criteri squalifica: ${briefing.qualification_context.disqualification_criteria}`,
    `- Capacita operative minime: ${briefing.qualification_context.minimum_operational_capabilities}`,
    `- Redirect fuori target: ${briefing.qualification_context.disqualified_redirect_offer || 'Non specificato'}`,
    '',
    '### Optin Context',
    `- Titolo/Promessa optin: ${briefing.optin_context.optin_title_promise}`,
    `- Beneficio promesso: ${briefing.optin_context.promised_benefit}`,
    `- Formato risultato promesso: ${briefing.optin_context.promised_result_format}`,
    `- Email gia raccolta: ${briefing.optin_context.email_already_collected ? 'SI' : 'NO'}`,
    '',
    '### Segmentation Context',
    `- Segmentazione primaria: ${briefing.segmentation_context.primary_segmentation_basis}`,
    `- Numero cluster desiderati: ${briefing.segmentation_context.desired_cluster_count}`,
    `- Profili cluster: ${clusterProfiles.length > 0 ? JSON.stringify(clusterProfiles) : 'Non specificati'}`,
    `- Regola overlap cluster: ${briefing.segmentation_context.cluster_overlap_management || 'Non specificata'}`,
    `- Lead magnet per cluster: ${leadMagnets.length > 0 ? JSON.stringify(leadMagnets) : 'Non specificati'}`,
    '',
    '### Belief Context',
    `- False belief veicolo: ${briefing.belief_context.false_belief_vehicle}`,
    `- False belief interne: ${briefing.belief_context.false_belief_internal}`,
    `- False belief esterne: ${briefing.belief_context.false_belief_external}`,
    '',
    '### Funnel Goals',
    `- Obiettivo primario funnel: ${briefing.funnel_goals.funnel_primary_goal}`,
    `- Metriche di successo: ${briefing.funnel_goals.success_metrics}`,
    `- Step successivo journey: ${briefing.funnel_goals.next_customer_journey_step}`,
    '',
    '### Proof Context',
    `- Casi studio: ${caseStudies.length > 0 ? JSON.stringify(caseStudies) : 'Non specificati'}`,
    `- Fonti testimonianze: ${testimonialSources.length > 0 ? JSON.stringify(testimonialSources) : 'Non specificate'}`,
    `- Asset credibilita: ${briefing.proof_context.authority_assets || 'Non specificati'}`,
    `- Prove visive: ${visualProofAssets.length > 0 ? JSON.stringify(visualProofAssets) : 'Non specificate'}`,
    '',
    '### Generated Context',
    `- Output optin gia generato: ${briefing.generated_context.optin_output_context || 'Non disponibile'}`,
    `- Output quiz gia generato: ${briefing.generated_context.quiz_output_context || 'Non disponibile'}`,
    `- Note contesto funnel: ${briefing.generated_context.funnel_context_notes || 'Nessuna'}`,
    '',
    '### Assunzioni e vincoli',
    `- Assunzioni consentite: ${briefing.assumptions_and_constraints.assumptions_allowed ? 'SI' : 'NO'}`,
    `- Note assunzioni: ${briefing.assumptions_and_constraints.assumption_notes || 'Nessuna'}`,
    `- Termini/claim vietati: ${briefing.assumptions_and_constraints.forbidden_terms_or_claims || 'Nessuno'}`,
    `- Tono richiesto: ${input.tone}`,
    `- Note aggiuntive: ${input.notes?.trim() || 'Nessuna'}`,
  ].join('\n');
}

function isUnifiedBriefingInput(input: FunnelBriefingInput | FunnelUnifiedBriefingInput | FunnelExtractionContextInput): input is FunnelUnifiedBriefingInput {
  return 'briefing' in input;
}

function isExtractionContextInput(input: FunnelBriefingInput | FunnelUnifiedBriefingInput | FunnelExtractionContextInput): input is FunnelExtractionContextInput {
  return 'contextText' in input;
}

function buildBriefingText(input: FunnelBriefingInput | FunnelUnifiedBriefingInput | FunnelExtractionContextInput): string {
  if (isExtractionContextInput(input)) {
    return [
      '### Extraction Context',
      input.contextText.trim(),
      '',
      `### Tono richiesto`,
      input.tone,
      '',
      `### Note aggiuntive`,
      input.notes?.trim() || 'Nessuna',
    ].join('\n');
  }

  if (isUnifiedBriefingInput(input)) {
    return buildUnifiedBriefingText(input);
  }

  return buildLegacyBriefingText(input);
}

export async function buildFunnelOptinPrompt(input: FunnelBriefingInput | FunnelUnifiedBriefingInput | FunnelExtractionContextInput): Promise<string> {
  const template = await loadPromptSource(TOOL_PROMPT_REGISTRY.funnel.optin);
  return `${template}\n\n## BRIEFING OPERATIVO\n${buildBriefingText(input)}\n\nNota aggiuntiva per questo step:\nnell'optin page puoi usare emoji in modo persuasivo e misurato per aumentare attenzione, leggibilita e click intent, evitando abuso, tono infantile o perdita di credibilita.\n\nRestituisci output rigorosamente conforme alle regole del prompt.`;
}

export async function buildFunnelQuizPrompt(
  input: (FunnelBriefingInput | FunnelUnifiedBriefingInput | FunnelExtractionContextInput) & { optinOutput: string },
): Promise<string> {
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

export async function buildFunnelVslPrompt(
  input: (FunnelBriefingInput | FunnelUnifiedBriefingInput | FunnelExtractionContextInput) & { optinOutput: string; quizOutput: string },
): Promise<string> {
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
export type { FunnelUnifiedBriefingInput };
export type { FunnelExtractionContextInput };
