/**
 * Mapping helpers for the funnel-pages v3 (extractedFields) request format.
 *
 * These functions normalize values extracted by the extraction tool into the
 * structured briefing expected by v2 funnel prompt builders.
 * Keeping them here makes it easy to unit-test in isolation from the route handler.
 */

import { normalizeExtractedFields } from '@/lib/tool-prompts/funnel-extraction-field-map';
import type { FunnelPagesRequestV2, FunnelPagesRequestV3 } from '@/lib/tool-routes/schemas';

export function asNonEmptyString(value: unknown, fallback = 'Non specificato'): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
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

export function asDesiredClusterCount(value: unknown): number {
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

export function asLeadMagnetFormat(value: unknown): 'VSL' | 'PDF' | 'Case Study' | 'Demo' | 'Altro' {
  const allowed = new Set(['VSL', 'PDF', 'Case Study', 'Demo', 'Altro']);
  return typeof value === 'string' && allowed.has(value) ? (value as 'VSL' | 'PDF' | 'Case Study' | 'Demo' | 'Altro') : 'Altro';
}

export function asBusinessType(value: unknown): 'B2B' | 'B2C' {
  return value === 'B2C' ? 'B2C' : 'B2B';
}

export function asDeliveryModel(value: unknown): 'done-for-you' | 'done-with-you' | 'fai-da-te' | 'corso' {
  const allowed = new Set(['done-for-you', 'done-with-you', 'fai-da-te', 'corso']);
  return typeof value === 'string' && allowed.has(value) ? (value as 'done-for-you' | 'done-with-you' | 'fai-da-te' | 'corso') : 'done-for-you';
}

export function asPromisedResultFormat(value: unknown): 'video' | 'pdf' | 'analisi' | 'report' | 'altro' {
  const allowed = new Set(['video', 'pdf', 'analisi', 'report', 'altro']);
  return typeof value === 'string' && allowed.has(value) ? (value as 'video' | 'pdf' | 'analisi' | 'report' | 'altro') : 'report';
}

export function asClusterProfiles(value: unknown) {
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

export function asLeadMagnetsByCluster(value: unknown) {
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

export function asTestimonialSources(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      quote: asNonEmptyString(item.quote ?? item.testo ?? item.text),
      source: asNonEmptyString(item.source ?? item.name_role ?? item.testimonial_name_role),
      timestamp: asNonEmptyString(item.timestamp, ''),
      achieved_result: asNonEmptyString(item.achieved_result ?? item.result ?? item.specific_result, ''),
      measurable_results: asNonEmptyString(item.measurable_results ?? item.numbers ?? item.metrics, ''),
    }))
    .filter((item) => item.quote !== 'Non specificato' || item.source !== 'Non specificato');
}

export function mapExtractedFieldsToBriefing(payload: FunnelPagesRequestV3): FunnelPagesRequestV2['briefing'] {
  const extracted = normalizeExtractedFields(payload.extractedFields ?? {});
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
      testimonials_sources: asTestimonialSources(extracted.testimonials_sources),
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
