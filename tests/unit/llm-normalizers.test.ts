import {
  tryParseJson,
  stripCodeFence,
  normalizeWhitespace,
  normalizeMarkdownWhitespace,
  formatMetaAdsOutput,
  formatFunnelOptinOutput,
  formatFunnelQuizOutput,
  formatExtractionOutput,
  toReadableJsonFallback,
  extractWorkflowTypeFromInput,
} from '@/lib/llm/normalizers';

describe('stripCodeFence', () => {
  it('removes ```json ... ``` fences', () => {
    expect(stripCodeFence('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('removes plain ``` fences', () => {
    expect(stripCodeFence('```\nhello\n```')).toBe('hello');
  });

  it('returns unchanged string without fences', () => {
    expect(stripCodeFence('plain text')).toBe('plain text');
  });
});

describe('tryParseJson', () => {
  it('parses valid JSON', () => {
    expect(tryParseJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses JSON inside a code fence', () => {
    expect(tryParseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('repairs trailing commas', () => {
    expect(tryParseJson('{"a":1,}')).toEqual({ a: 1 });
  });

  it('returns null for non-JSON strings', () => {
    expect(tryParseJson('not json at all')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(tryParseJson('')).toBeNull();
  });
});

describe('normalizeWhitespace', () => {
  it('collapses multiple spaces', () => {
    expect(normalizeWhitespace('a   b')).toBe('a b');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeWhitespace('  hello  ')).toBe('hello');
  });

  it('collapses newlines to a single space', () => {
    expect(normalizeWhitespace('a\n\nb')).toBe('a b');
  });
});

describe('normalizeMarkdownWhitespace', () => {
  it('converts CRLF to LF', () => {
    expect(normalizeMarkdownWhitespace('a\r\nb')).toBe('a\nb');
  });

  it('collapses 3+ consecutive newlines to 2', () => {
    expect(normalizeMarkdownWhitespace('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('replaces non-breaking space with regular space', () => {
    expect(normalizeMarkdownWhitespace('a\u00a0b')).toBe('a b');
  });
});

describe('formatMetaAdsOutput', () => {
  const validAds = {
    variants: [
      { headline: 'H1', primary_text: 'Body1', description: 'Desc1', cta: 'CTA1' },
      { headline: 'H2', cta: 'CTA2' },
    ],
  };

  it('returns formatted markdown for valid meta ads', () => {
    const result = formatMetaAdsOutput(validAds);
    expect(result).toContain('Variante 1');
    expect(result).toContain('Headline: H1');
    expect(result).toContain('CTA: CTA1');
    expect(result).toContain('Variante 2');
    expect(result).toContain('Headline: H2');
  });

  it('returns null for invalid input', () => {
    expect(formatMetaAdsOutput({})).toBeNull();
    expect(formatMetaAdsOutput(null)).toBeNull();
    expect(formatMetaAdsOutput({ variants: [] })).toBeNull();
  });

  it('handles primaryText alias', () => {
    const withAlias = { variants: [{ headline: 'H', primaryText: 'Body via alias' }] };
    const result = formatMetaAdsOutput(withAlias);
    expect(result).toContain('Primary text: Body via alias');
  });
});

describe('formatFunnelOptinOutput', () => {
  const validOptin = {
    variants: [
      { headline: 'Scopri il metodo', pre_headline: 'Attenzione', cta_primary: 'Inizia', score_efficacia: 85 },
    ],
    winner: { variant_index: 1, motivazione: 'Più diretto' },
  };

  it('returns formatted output for valid optin data', () => {
    const result = formatFunnelOptinOutput(validOptin);
    expect(result).toContain('Variante 1');
    expect(result).toContain('Headline: Scopri il metodo');
    expect(result).toContain('Pre-headline: Attenzione');
    expect(result).toContain('Score efficacia: 85/100');
    expect(result).toContain('Winner consigliata: Variante 1');
  });

  it('returns null for missing variants', () => {
    expect(formatFunnelOptinOutput({ variants: [] })).toBeNull();
  });
});

describe('formatFunnelQuizOutput', () => {
  const validQuiz = {
    questions: [
      { question: 'Quanti anni hai?', category: 'demografia' },
      { question: 'Qual è la tua sfida?' },
    ],
    segments: [{ name: 'Principiante' }, { name: 'Avanzato' }],
  };

  it('returns summary with question count and segments', () => {
    const result = formatFunnelQuizOutput(validQuiz);
    expect(result).toContain('2 domande');
    expect(result).toContain('Categorie: demografia');
    expect(result).toContain('Segmenti: Principiante, Avanzato');
  });

  it('returns null for empty questions', () => {
    expect(formatFunnelQuizOutput({ questions: [] })).toBeNull();
  });
});

describe('formatExtractionOutput', () => {
  it('formats flat fields correctly', () => {
    const result = formatExtractionOutput({ name: 'Acme', sector: 'SaaS' });
    expect(result).toContain('## Campi Estratti');
    expect(result).toContain('### name');
    expect(result).toContain('- Valore: Acme');
  });

  it('unwraps nested fields object', () => {
    const result = formatExtractionOutput({ fields: { name: 'Acme' } });
    expect(result).toContain('### name');
  });

  it('lists missing fields when present', () => {
    const result = formatExtractionOutput({ name: 'X', missingFields: ['sector'] });
    expect(result).toContain('## Campi Mancanti');
    expect(result).toContain('- sector');
  });

  it('returns null for non-object input', () => {
    expect(formatExtractionOutput(null)).toBeNull();
    expect(formatExtractionOutput('string')).toBeNull();
    expect(formatExtractionOutput([1, 2])).toBeNull();
  });
});

describe('toReadableJsonFallback', () => {
  it('returns normalized string for string input', () => {
    expect(toReadableJsonFallback('  hello  world  ')).toBe('hello world');
  });

  it('extracts headlines from array of objects', () => {
    const result = toReadableJsonFallback([{ headline: 'H1' }, { headline: 'H2' }]);
    expect(result).toContain('H1');
    expect(result).toContain('H2');
  });

  it('returns null for null input', () => {
    expect(toReadableJsonFallback(null)).toBeNull();
  });
});

describe('extractWorkflowTypeFromInput', () => {
  it('returns workflowType string from object', () => {
    expect(extractWorkflowTypeFromInput({ workflowType: 'meta_ads' })).toBe('meta_ads');
  });

  it('returns null for missing workflowType', () => {
    expect(extractWorkflowTypeFromInput({})).toBeNull();
  });

  it('returns null for non-string workflowType', () => {
    expect(extractWorkflowTypeFromInput({ workflowType: 42 })).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(extractWorkflowTypeFromInput(null)).toBeNull();
    expect(extractWorkflowTypeFromInput('string')).toBeNull();
    expect(extractWorkflowTypeFromInput([1, 2])).toBeNull();
  });
});
