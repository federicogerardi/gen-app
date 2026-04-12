import {
  extractionRequestSchema,
  funnelPagesRequestSchema,
  getLengthByFunnelStep,
  metaAdsRequestSchema,
} from '@/lib/tool-routes/schemas';

describe('tool route schemas', () => {
  const base = {
    projectId: 'cjld2cyuq0000t3rmniod1foy',
    model: 'openai/gpt-4-turbo',
    tone: 'professional' as const,
  };

  it('accepts legacy top-level customer fields for meta ads', () => {
    const parsed = metaAdsRequestSchema.safeParse({
      ...base,
      product: 'CRM SaaS',
      audience: 'Small business owners',
      offer: 'Free 14-day trial',
      objective: 'Lead generation',
      angle: 'Problem-solution',
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.customerContext).toEqual({
      product: 'CRM SaaS',
      audience: 'Small business owners',
      offer: 'Free 14-day trial',
    });
  });

  it('accepts explicit customerContext fields for meta ads', () => {
    const parsed = metaAdsRequestSchema.safeParse({
      ...base,
      customerContext: {
        product: 'CRM SaaS',
        audience: 'Small business owners',
        offer: 'Free 14-day trial',
      },
      objective: 'Lead generation',
    });

    expect(parsed.success).toBe(true);
  });

  it('requires optinOutput for quiz funnel step', () => {
    const parsed = funnelPagesRequestSchema.safeParse({
      ...base,
      customerContext: {
        product: 'Corso AI',
        audience: 'Freelancer',
        offer: 'Sconto 50%',
      },
      step: 'quiz',
      promise: 'Piu clienti in 30 giorni',
    });

    expect(parsed.success).toBe(false);
  });

  it('requires both optinOutput and quizOutput for vsl funnel step', () => {
    const parsed = funnelPagesRequestSchema.safeParse({
      ...base,
      customerContext: {
        product: 'Corso AI',
        audience: 'Freelancer',
        offer: 'Sconto 50%',
      },
      step: 'vsl',
      promise: 'Piu clienti in 30 giorni',
      optinOutput: 'optin',
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts unified funnel V2 payload', () => {
    const parsed = funnelPagesRequestSchema.safeParse({
      ...base,
      step: 'optin',
      briefing: {
        business_context: {
          business_type: 'B2B',
          sector_niche: 'Marketing automation',
          offer_price_range: '2000-5000 EUR',
          target_profile: 'Founder di PMI',
          operational_context: 'Team vendita di 3 persone',
        },
        offer_context: {
          core_problem: 'Lead poco qualificati',
          new_opportunity: 'Diagnosi e segmentazione in ingresso',
          old_method: 'Advertising broad + call per tutti',
          delivery_model: 'done-for-you',
          client_involvement_required: 'Validazione settimanale',
        },
        qualification_context: {
          must_have_criteria: 'Budget adv minimo e decision maker presente',
          disqualification_criteria: 'Nessun budget media o nessuna urgenza',
          minimum_operational_capabilities: 'CRM attivo e team commerciale base',
        },
        optin_context: {
          optin_title_promise: 'Diagnosi lead 4 minuti',
          promised_benefit: 'Capire dove perdi contratti',
          promised_result_format: 'video',
          email_already_collected: true,
        },
        segmentation_context: {
          primary_segmentation_basis: 'Maturita commerciale',
          desired_cluster_count: 3,
        },
        belief_context: {
          false_belief_vehicle: 'Basta aumentare il budget',
          false_belief_internal: 'Non abbiamo tempo per migliorare il funnel',
          false_belief_external: 'Il mercato e saturo',
        },
        funnel_goals: {
          funnel_primary_goal: 'Aumentare appuntamenti qualificati',
          success_metrics: 'Tasso show-up e close rate',
          next_customer_journey_step: 'Call strategica',
        },
        proof_context: {},
        generated_context: {},
        assumptions_and_constraints: {
          assumptions_allowed: true,
        },
      },
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.schemaVersion).toBe('v2');
  });

  it('rejects V2 payload with desired_cluster_count out of range', () => {
    const parsed = funnelPagesRequestSchema.safeParse({
      ...base,
      step: 'optin',
      briefing: {
        business_context: {
          business_type: 'B2B',
          sector_niche: 'Marketing automation',
          offer_price_range: '2000-5000 EUR',
          target_profile: 'Founder di PMI',
        },
        offer_context: {
          core_problem: 'Lead poco qualificati',
          new_opportunity: 'Diagnosi e segmentazione in ingresso',
          old_method: 'Advertising broad + call per tutti',
          delivery_model: 'done-for-you',
        },
        qualification_context: {
          must_have_criteria: 'Budget adv minimo e decision maker presente',
          disqualification_criteria: 'Nessun budget media o nessuna urgenza',
          minimum_operational_capabilities: 'CRM attivo e team commerciale base',
        },
        optin_context: {
          optin_title_promise: 'Diagnosi lead 4 minuti',
          promised_benefit: 'Capire dove perdi contratti',
          promised_result_format: 'video',
          email_already_collected: true,
        },
        segmentation_context: {
          primary_segmentation_basis: 'Maturita commerciale',
          desired_cluster_count: 2,
        },
        belief_context: {
          false_belief_vehicle: 'Basta aumentare il budget',
          false_belief_internal: 'Non abbiamo tempo per migliorare il funnel',
          false_belief_external: 'Il mercato e saturo',
        },
        funnel_goals: {
          funnel_primary_goal: 'Aumentare appuntamenti qualificati',
          success_metrics: 'Tasso show-up e close rate',
          next_customer_journey_step: 'Call strategica',
        },
        proof_context: {},
        generated_context: {},
        assumptions_and_constraints: {
          assumptions_allowed: true,
        },
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts funnel V3 payload with extracted fields', () => {
    const parsed = funnelPagesRequestSchema.safeParse({
      ...base,
      step: 'optin',
      extractedFields: {
        business_context: 'Agenzia B2B per PMI',
        market_awareness: 'Problem aware',
      },
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.schemaVersion).toBe('v3');
  });

  it('assigns schemaVersion v1 for legacy payload without discriminant', () => {
    const parsed = funnelPagesRequestSchema.safeParse({
      ...base,
      customerContext: {
        product: 'Corso AI',
        audience: 'Freelancer',
        offer: 'Sconto 50%',
      },
      step: 'optin',
      promise: 'Piu clienti in 30 giorni',
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.schemaVersion).toBe('v1');
  });

  it('rejects invalid schemaVersion discriminant', () => {
    const parsed = funnelPagesRequestSchema.safeParse({
      ...base,
      schemaVersion: 'v9',
      customerContext: {
        product: 'Corso AI',
        audience: 'Freelancer',
        offer: 'Sconto 50%',
      },
      step: 'optin',
      promise: 'Piu clienti in 30 giorni',
    });

    expect(parsed.success).toBe(false);
  });

  it('requires optinOutput for quiz step in V3 payload', () => {
    const parsed = funnelPagesRequestSchema.safeParse({
      ...base,
      step: 'quiz',
      extractedFields: {
        business_context: 'Agenzia B2B per PMI',
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('returns the expected generation length for each funnel step', () => {
    expect(getLengthByFunnelStep('optin')).toBe(1200);
    expect(getLengthByFunnelStep('quiz')).toBe(1400);
    expect(getLengthByFunnelStep('vsl')).toBe(3200);
  });

  it('accepts extraction request with field map', () => {
    const parsed = extractionRequestSchema.safeParse({
      ...base,
      rawContent: 'Azienda B2B, target founder PMI, obiettivo aumentare lead qualificati.',
      fieldMap: {
        business_type: {
          type: 'select',
          required: true,
          description: 'Tipo di business B2B o B2C',
        },
        target_profile: {
          type: 'textarea',
          required: true,
          description: 'Profilo target ideale',
        },
      },
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects extraction request with empty field map', () => {
    const parsed = extractionRequestSchema.safeParse({
      ...base,
      rawContent: 'Contenuto testuale lungo abbastanza per il parser.',
      fieldMap: {},
    });

    expect(parsed.success).toBe(false);
  });
});
