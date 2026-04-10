import { funnelPagesRequestSchema, getLengthByFunnelStep, metaAdsRequestSchema } from '@/lib/tool-routes/schemas';

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

  it('returns the expected generation length for each funnel step', () => {
    expect(getLengthByFunnelStep('optin')).toBe(1200);
    expect(getLengthByFunnelStep('quiz')).toBe(1400);
    expect(getLengthByFunnelStep('vsl')).toBe(3200);
  });
});
