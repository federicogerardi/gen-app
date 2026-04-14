import { asTestimonialSources, mapExtractedFieldsToBriefing } from '@/lib/tool-routes/funnel-mapping';

describe('asTestimonialSources', () => {
  it('normalizes testimonial entries from extraction payload', () => {
    const result = asTestimonialSources([
      {
        text: 'In 90 giorni abbiamo triplicato le richieste.',
        testimonial_name_role: 'Marco Bianchi, CEO',
        specific_result: 'Pipeline commerciale stabilizzata',
        metrics: '-42% CPL e +180% lead qualificati',
      },
    ]);

    expect(result).toEqual([
      {
        quote: 'In 90 giorni abbiamo triplicato le richieste.',
        source: 'Marco Bianchi, CEO',
        timestamp: '',
        achieved_result: 'Pipeline commerciale stabilizzata',
        measurable_results: '-42% CPL e +180% lead qualificati',
      },
    ]);
  });
});

describe('mapExtractedFieldsToBriefing', () => {
  it('maps extracted testimonial sources into proof_context for prompt generation', () => {
    const briefing = mapExtractedFieldsToBriefing({
      schemaVersion: 'v3',
      projectId: 'cjld2cyuq0000t3rmniod1foy',
      model: 'openai/gpt-4.1',
      tone: 'professional',
      step: 'optin',
      extractedFields: {
        business_type: 'B2B',
        sector_niche: 'Consulenza marketing B2B',
        offer_price_range: '3000-7000 EUR',
        target_profile: 'Founder e sales manager',
        core_problem: 'Lead non qualificati',
        new_opportunity: 'Segmentazione guidata da quiz',
        old_method: 'Campagne broad non filtrate',
        delivery_model: 'done-for-you',
        must_have_criteria: 'Team commerciale attivo',
        disqualification_criteria: 'No budget marketing',
        minimum_operational_capabilities: 'CRM e processo commerciale minimo',
        optin_title_promise: 'Diagnosi funnel in 4 minuti',
        promised_benefit: 'Capire dove perdi conversioni',
        promised_result_format: 'video',
        primary_segmentation_basis: 'Maturita commerciale',
        false_belief_vehicle: 'Basta aumentare il budget ads',
        false_belief_internal: 'Non siamo pronti',
        false_belief_external: 'Nel nostro settore non funziona',
        funnel_primary_goal: 'Aumentare call qualificate',
        success_metrics: 'Show rate e close rate',
        next_customer_journey_step: 'Call strategica',
        testimonials_sources: [
          {
            quote: 'Abbiamo ridotto il CPL del 37% in 8 settimane.',
            source: 'Laura Rossi, Head of Growth',
            achieved_result: 'Riduzione costi acquisizione mantenendo il volume',
            measurable_results: '-37% CPL, +22% tasso appuntamenti',
          },
        ],
      },
    });

    expect(briefing.proof_context.testimonials_sources).toEqual([
      {
        quote: 'Abbiamo ridotto il CPL del 37% in 8 settimane.',
        source: 'Laura Rossi, Head of Growth',
        timestamp: '',
        achieved_result: 'Riduzione costi acquisizione mantenendo il volume',
        measurable_results: '-37% CPL, +22% tasso appuntamenti',
      },
    ]);
  });
});