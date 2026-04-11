import { createArtifactStream } from '@/lib/llm/streaming';
import {
  buildFunnelOptinPrompt,
  buildFunnelQuizPrompt,
  buildFunnelVslPrompt,
  type FunnelBriefingInput,
  type FunnelUnifiedBriefingInput,
} from '@/lib/tool-prompts/funnel-pages';
import {
  enforceUsageGuards,
  parseAndValidateRequest,
  requireAuthenticatedUser,
  requireOwnedProject,
} from '@/lib/tool-routes/guards';
import { serviceUnavailableError, sseResponse } from '@/lib/tool-routes/responses';
import { normalizeExtractedFields } from '@/lib/tool-prompts/funnel-extraction-field-map';
import {
  funnelPagesRequestSchema,
  getLengthByFunnelStep,
  type FunnelPagesRequest,
  type FunnelPagesRequestV2,
  type FunnelPagesRequestV3,
} from '@/lib/tool-routes/schemas';

function isFunnelV2Payload(payload: FunnelPagesRequest): payload is FunnelPagesRequestV2 {
  return 'briefing' in payload;
}

function isFunnelV3Payload(payload: FunnelPagesRequest): payload is FunnelPagesRequestV3 {
  return 'extractedFields' in payload;
}

function asNonEmptyString(value: unknown, fallback = 'Non specificato'): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes' || normalized === 'si') {
      return true;
    }

    if (normalized === 'false' || normalized === 'no') {
      return false;
    }
  }

  return fallback;
}

function asDesiredClusterCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const rounded = Math.round(value);
    return Math.min(5, Math.max(3, rounded));
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.min(5, Math.max(3, parsed));
    }
  }

  return 3;
}

function asClusterProfiles(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      cluster_name: asNonEmptyString(item.cluster_name ?? item.label),
      cluster_description: asNonEmptyString(item.cluster_description ?? item.snapshot),
      psychographic_profile: asNonEmptyString(item.psychographic_profile),
    }))
    .filter((item) => item.cluster_name !== 'Non specificato');
}

function asLeadMagnetsByCluster(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      cluster_name: asNonEmptyString(item.cluster_name ?? item.cluster_label),
      title: asNonEmptyString(item.title),
      format: asLeadMagnetFormat(item.format),
      hook: asNonEmptyString(item.hook ?? item.promise),
      messaging: asNonEmptyString(item.messaging),
      next_step: asNonEmptyString(item.next_step ?? item.delivery_timing),
    }))
    .filter((item) => item.cluster_name !== 'Non specificato' || item.title !== 'Non specificato');
}

function asBusinessType(value: unknown): 'B2B' | 'B2C' {
  return value === 'B2C' ? 'B2C' : 'B2B';
}

function asDeliveryModel(value: unknown): 'done-for-you' | 'done-with-you' | 'fai-da-te' | 'corso' {
  const allowed = new Set(['done-for-you', 'done-with-you', 'fai-da-te', 'corso']);
  return typeof value === 'string' && allowed.has(value) ? (value as 'done-for-you' | 'done-with-you' | 'fai-da-te' | 'corso') : 'done-for-you';
}

function asPromisedResultFormat(value: unknown): 'video' | 'pdf' | 'analisi' | 'report' | 'altro' {
  const allowed = new Set(['video', 'pdf', 'analisi', 'report', 'altro']);
  return typeof value === 'string' && allowed.has(value) ? (value as 'video' | 'pdf' | 'analisi' | 'report' | 'altro') : 'report';
}

function asLeadMagnetFormat(value: unknown): 'VSL' | 'PDF' | 'Case Study' | 'Demo' | 'Altro' {
  const allowed = new Set(['VSL', 'PDF', 'Case Study', 'Demo', 'Altro']);
  return typeof value === 'string' && allowed.has(value) ? (value as 'VSL' | 'PDF' | 'Case Study' | 'Demo' | 'Altro') : 'Altro';
}

function mapExtractedFieldsToBriefing(payload: FunnelPagesRequestV3): FunnelPagesRequestV2['briefing'] {
  const extracted = normalizeExtractedFields(payload.extractedFields);
  const leadMagnetSingle =
    typeof extracted.lead_magnet === 'object' && extracted.lead_magnet !== null
      ? (extracted.lead_magnet as Record<string, unknown>)
      : undefined;

  const leadMagnetFromSingle = leadMagnetSingle
    ? [
        {
          cluster_name: asNonEmptyString(leadMagnetSingle.cluster_name ?? leadMagnetSingle.cluster_label, 'Cluster Principale'),
          title: asNonEmptyString(leadMagnetSingle.title),
          format: asLeadMagnetFormat(leadMagnetSingle.format),
          hook: asNonEmptyString(leadMagnetSingle.hook ?? leadMagnetSingle.promise),
          messaging: asNonEmptyString(leadMagnetSingle.messaging),
          next_step: asNonEmptyString(leadMagnetSingle.next_step ?? leadMagnetSingle.delivery_timing),
        },
      ]
    : [];

  const leadMagnets = asLeadMagnetsByCluster(extracted.lead_magnets_by_cluster);

  return {
    business_context: {
      business_type: asBusinessType(extracted.business_type),
      sector_niche: asNonEmptyString(extracted.sector_niche),
      offer_price_range: asNonEmptyString(extracted.offer_price_range),
      target_profile: asNonEmptyString(extracted.target_profile),
      operational_context: asNonEmptyString(extracted.operational_context, ''),
    },
    offer_context: {
      core_problem: asNonEmptyString(extracted.core_problem),
      new_opportunity: asNonEmptyString(extracted.new_opportunity),
      old_method: asNonEmptyString(extracted.old_method),
      delivery_model: asDeliveryModel(extracted.delivery_model),
      client_involvement_required: asNonEmptyString(extracted.client_involvement_required, ''),
    },
    qualification_context: {
      must_have_criteria: asNonEmptyString(extracted.must_have_criteria),
      nice_to_have_criteria: asNonEmptyString(extracted.nice_to_have_criteria, ''),
      disqualification_criteria: asNonEmptyString(extracted.disqualification_criteria),
      minimum_operational_capabilities: asNonEmptyString(extracted.minimum_operational_capabilities),
      disqualified_redirect_offer: asNonEmptyString(extracted.disqualified_redirect_offer, ''),
    },
    optin_context: {
      optin_title_promise: asNonEmptyString(extracted.optin_title_promise),
      promised_benefit: asNonEmptyString(extracted.promised_benefit),
      promised_result_format: asPromisedResultFormat(extracted.promised_result_format),
      email_already_collected: asBoolean(extracted.email_already_collected, true),
    },
    segmentation_context: {
      primary_segmentation_basis: asNonEmptyString(extracted.primary_segmentation_basis),
      desired_cluster_count: asDesiredClusterCount(extracted.desired_cluster_count),
      cluster_profiles: asClusterProfiles(extracted.cluster_profiles),
      cluster_overlap_management: asNonEmptyString(extracted.cluster_overlap_management, ''),
      lead_magnets_by_cluster: leadMagnets.length > 0 ? leadMagnets : leadMagnetFromSingle,
    },
    belief_context: {
      false_belief_vehicle: asNonEmptyString(extracted.false_belief_vehicle),
      false_belief_internal: asNonEmptyString(extracted.false_belief_internal),
      false_belief_external: asNonEmptyString(extracted.false_belief_external),
    },
    funnel_goals: {
      funnel_primary_goal: asNonEmptyString(extracted.funnel_primary_goal),
      success_metrics: asNonEmptyString(extracted.success_metrics),
      next_customer_journey_step: asNonEmptyString(extracted.next_customer_journey_step),
    },
    proof_context: {
      case_studies: [],
      testimonials_sources: [],
      authority_assets: asNonEmptyString(extracted.authority_assets, ''),
      visual_proof_assets: [],
    },
    generated_context: {
      optin_output_context: asNonEmptyString(payload.optinOutput ?? extracted.optin_output_context, ''),
      quiz_output_context: asNonEmptyString(payload.quizOutput ?? extracted.quiz_output_context, ''),
      funnel_context_notes: asNonEmptyString(payload.notes ?? extracted.funnel_context_notes, ''),
    },
    assumptions_and_constraints: {
      assumptions_allowed: asBoolean(extracted.assumptions_allowed, true),
      assumption_notes: asNonEmptyString(extracted.assumption_notes, ''),
      forbidden_terms_or_claims: asNonEmptyString(extracted.forbidden_terms_or_claims, ''),
    },
  };
}

function buildPromptBriefing(payload: FunnelPagesRequest): FunnelBriefingInput | FunnelUnifiedBriefingInput {
  if (isFunnelV2Payload(payload)) {
    return {
      briefing: payload.briefing,
      tone: payload.tone,
      notes: payload.notes,
    };
  }

  if (isFunnelV3Payload(payload)) {
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
  briefing: FunnelBriefingInput | FunnelUnifiedBriefingInput;
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

  const parsed = await parseAndValidateRequest(request, funnelPagesRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const payload = parsed.data;

  const usageResult = await enforceUsageGuards(userId, payload.model, 'funnel_pages');
  if (!usageResult.ok) {
    return usageResult.response;
  }

  const ownershipResult = await requireOwnedProject(payload.projectId, userId);
  if (!ownershipResult.ok) {
    return ownershipResult.response;
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
