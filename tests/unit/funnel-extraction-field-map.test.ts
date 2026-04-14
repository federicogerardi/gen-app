import {
  EXTRACTION_SECTION_KEYS,
  FUNNEL_EXTRACTION_FIELD_MAP,
  normalizeExtractedFields,
} from '@/lib/tool-prompts/funnel-extraction-field-map';

describe('EXTRACTION_SECTION_KEYS', () => {
  it('contains the expected section keys', () => {
    expect(EXTRACTION_SECTION_KEYS).toContain('business_context');
    expect(EXTRACTION_SECTION_KEYS).toContain('offer_context');
    expect(EXTRACTION_SECTION_KEYS).toContain('assumptions_and_constraints');
    expect(EXTRACTION_SECTION_KEYS).toHaveLength(10);
  });
});

describe('FUNNEL_EXTRACTION_FIELD_MAP', () => {
  it('includes structured testimonial extraction field', () => {
    expect(FUNNEL_EXTRACTION_FIELD_MAP.testimonials_sources).toEqual(
      expect.objectContaining({
        type: 'array',
      }),
    );
  });
});

describe('normalizeExtractedFields', () => {
  it('returns a copy with top-level fields unchanged', () => {
    const input = { name: 'Acme', sector: 'SaaS' };
    const result = normalizeExtractedFields(input);
    expect(result).toEqual({ name: 'Acme', sector: 'SaaS' });
    expect(result).not.toBe(input); // ensure it's a copy
  });

  it('unwraps nested fields wrapper', () => {
    const input = { fields: { name: 'Acme', sector: 'SaaS' } };
    const result = normalizeExtractedFields(input);
    expect(result.name).toBe('Acme');
    expect(result.sector).toBe('SaaS');
  });

  it('unwraps data wrapper', () => {
    const input = { data: { price: '997 EUR' } };
    const result = normalizeExtractedFields(input);
    expect(result.price).toBe('997 EUR');
  });

  it('unwraps result wrapper', () => {
    const input = { result: { offer: 'Coaching' } };
    const result = normalizeExtractedFields(input);
    expect(result.offer).toBe('Coaching');
  });

  it('hoists nested fields from a section key to top level', () => {
    const input = {
      business_context: { sector_niche: 'SaaS per PMI', business_type: 'B2B' },
    };
    const result = normalizeExtractedFields(input);
    expect(result.sector_niche).toBe('SaaS per PMI');
    expect(result.business_type).toBe('B2B');
  });

  it('does not overwrite existing non-empty top-level values', () => {
    const input = {
      sector_niche: 'existing value',
      business_context: { sector_niche: 'should not overwrite' },
    };
    const result = normalizeExtractedFields(input);
    expect(result.sector_niche).toBe('existing value');
  });

  it('overwrites empty string top-level values from section keys', () => {
    const input = {
      sector_niche: '',
      business_context: { sector_niche: 'replacement' },
    };
    const result = normalizeExtractedFields(input);
    expect(result.sector_niche).toBe('replacement');
  });

  it('overwrites null top-level values from section keys', () => {
    const input = {
      sector_niche: null,
      business_context: { sector_niche: 'replacement' },
    };
    const result = normalizeExtractedFields(input as unknown as Record<string, unknown>);
    expect(result.sector_niche).toBe('replacement');
  });

  it('ignores null/undefined/empty nested values when hoisting', () => {
    const input = {
      business_context: { sector_niche: null, business_type: '', offer_price: undefined },
    };
    const result = normalizeExtractedFields(input as unknown as Record<string, unknown>);
    expect('sector_niche' in result).toBe(false);
    expect('business_type' in result).toBe(false);
    expect('offer_price' in result).toBe(false);
  });

  it('ignores non-object section key values', () => {
    const input = { business_context: 'not an object' };
    const result = normalizeExtractedFields(input);
    expect(result.business_context).toBe('not an object');
  });

  it('does not hoist from non-section-key nested objects', () => {
    const input = { some_other_key: { nested: 'value' } };
    const result = normalizeExtractedFields(input);
    expect('nested' in result).toBe(false);
  });
});
