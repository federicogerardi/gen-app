/** @jest-environment node */

import { LLMOrchestrator } from '@/lib/llm/orchestrator';

describe('LLMOrchestrator.normalizeOutput', () => {
  const orchestrator = new LLMOrchestrator();

  it('normalizes Meta Ads JSON payload into readable text', () => {
    const result = orchestrator.normalizeOutput({
      type: 'content',
      workflowType: 'meta_ads',
      rawContent: JSON.stringify({
        variants: [
          {
            headline: 'Headline A',
            primary_text: 'Primary text A',
            description: 'Description A',
            cta: 'Scopri di piu',
          },
          {
            headline: 'Headline B',
            primary_text: 'Primary text B',
            cta: 'Prenota ora',
          },
        ],
      }),
    });

    expect(result.format).toBe('markdown');
    expect(result.content).toContain('Variante 1');
    expect(result.content).toContain('Headline: Headline A');
    expect(result.content).toContain('CTA: Scopri di piu');
    expect(result.content).not.toContain('{');
  });

  it('normalizes Funnel optin-like JSON payload into readable text', () => {
    const result = orchestrator.normalizeOutput({
      type: 'content',
      workflowType: 'funnel_pages',
      rawContent: JSON.stringify({
        variants: [
          {
            pre_headline: 'Per imprenditori',
            headline: 'Scopri cosa blocca le conversioni',
            subtitle: 'Quiz gratuito in 4 minuti',
            cta_primary: 'Fai il test',
            score_efficacia: 92,
          },
        ],
        winner: {
          variant_index: 1,
          motivazione: 'Miglior equilibrio tra chiarezza e urgenza',
        },
      }),
    });

    expect(result.format).toBe('markdown');
    expect(result.content).toContain('Variante 1');
    expect(result.content).toContain('CTA primaria: Fai il test');
    expect(result.content).toContain('Winner consigliata: Variante 1');
  });

  it('normalizes Funnel quiz-like JSON payload into summary text', () => {
    const result = orchestrator.normalizeOutput({
      type: 'content',
      workflowType: 'funnel_pages',
      rawContent: JSON.stringify({
        questions: [
          { question: 'Qual e il tuo obiettivo principale?', category: 'segmentation' },
          { question: 'Quanto e urgente risolvere il problema?', category: 'urgency' },
        ],
        segments: [{ name: 'segmento-a' }, { name: 'segmento-b' }],
      }),
    });

    expect(result.format).toBe('markdown');
    expect(result.content).toContain('Quiz Funnel pronto (2 domande)');
    expect(result.content).toContain('Categorie: segmentation, urgency');
    expect(result.content).toContain('Segmenti: segmento-a, segmento-b');
  });

  it('falls back safely on malformed Meta Ads JSON without throwing', () => {
    const result = orchestrator.normalizeOutput({
      type: 'content',
      workflowType: 'meta_ads',
      rawContent: '{"variants":[{"headline":"A"}',
    });

    expect(result.format).toBe('markdown');
    expect(result.warning).toBe('META_ADS_JSON_PARSE_FAILED');
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('keeps Funnel VSL plain text output readable', () => {
    const result = orchestrator.normalizeOutput({
      type: 'content',
      workflowType: 'funnel_pages',
      rawContent: '```text\nScript VSL pronto per la telecamera.\n```',
    });

    expect(result.format).toBe('markdown');
    expect(result.content).toBe('Script VSL pronto per la telecamera.');
    expect(result.warning).toBeUndefined();
  });

  it('normalizes extraction JSON payload into markdown sections', () => {
    const result = orchestrator.normalizeOutput({
      type: 'extraction',
      workflowType: 'extraction',
      rawContent: JSON.stringify({
        fields: {
          business_type: 'B2B',
          desired_cluster_count: 3,
        },
        missingFields: ['case_studies'],
      }),
    });

    expect(result.format).toBe('markdown');
    expect(result.content).toContain('## Campi Estratti');
    expect(result.content).toContain('### business_type');
    expect(result.content).toContain('## Campi Mancanti');
    expect(result.content).toContain('case_studies');
  });
});
