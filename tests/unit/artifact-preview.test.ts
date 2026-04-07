import { formatArtifactContentForDisplay, formatArtifactPreview, getArtifactDisplayTypeLabel, getArtifactWorkflowType } from '@/lib/artifact-preview';

describe('formatArtifactPreview', () => {
  it('estrare preview semantica da JSON content', () => {
    const preview = formatArtifactPreview({
      type: 'content',
      status: 'completed',
      content: JSON.stringify({
        headline: 'Headline forte',
        primaryText: 'Testo principale di valore',
        cta: 'Prenota ora',
      }),
    });

    expect(preview.label).toBe('Anteprima');
    expect(preview.text).toContain('Headline forte');
    expect(preview.text).toContain('Prenota ora');
    expect(preview.text).not.toContain('{');
  });

  it('supporta campi snake_case nei payload tool', () => {
    const preview = formatArtifactPreview({
      type: 'content',
      status: 'completed',
      content: JSON.stringify({
        headline: 'Nuova headline',
        primary_text: 'Copy principale da Meta Ads',
        cta: 'Scopri di piu',
      }),
    });

    expect(preview.text).toContain('Nuova headline');
    expect(preview.text).toContain('Copy principale da Meta Ads');
  });

  it('usa fallback sicuro su JSON invalido', () => {
    const preview = formatArtifactPreview({
      type: 'content',
      status: 'completed',
      content: '{"headline": "x",',
    });

    expect(preview.text).toContain('headline: x');
    expect(preview.text).not.toContain('Output strutturato disponibile');
  });

  it('mantiene plain text non JSON', () => {
    const preview = formatArtifactPreview({
      type: 'content',
      status: 'completed',
      content: 'Messaggio marketing pronto per revisione',
    });

    expect(preview.text).toBe('Messaggio marketing pronto per revisione');
  });

  it('usa placeholder dedicato per stato generating', () => {
    const preview = formatArtifactPreview({
      type: 'seo',
      status: 'generating',
      content: 'qualsiasi',
    });

    expect(preview.text).toContain('Generazione in corso');
  });

  it('usa messaggio sintetico per stato failed', () => {
    const preview = formatArtifactPreview({
      type: 'code',
      status: 'failed',
      content: 'stack trace tecnico',
    });

    expect(preview.text).toContain('Generazione non completata');
  });

  it('formatta output detail leggibile anche da JSON generico', () => {
    const display = formatArtifactContentForDisplay({
      type: 'content',
      status: 'completed',
      content: JSON.stringify({
        sectionOne: 'Introduzione al framework',
        sectionTwo: 'Benefici principali e use-case',
      }),
    });

    expect(display.title).toBe('Output elaborato');
    expect(display.text).toContain('Introduzione al framework');
    expect(display.text).not.toContain('Contenuto tecnico strutturato disponibile');
  });

  it('espone label workflow-specific per Meta Ads e Funnel Pages', () => {
    expect(getArtifactDisplayTypeLabel({ type: 'content', workflowType: 'meta_ads' })).toBe('Meta Ads');
    expect(getArtifactDisplayTypeLabel({ type: 'content', workflowType: 'funnel_pages' })).toBe('Funnel Pages');
    expect(getArtifactDisplayTypeLabel({ type: 'seo' })).toBe('SEO');
  });

  it('estrae workflowType in modo sicuro da input JSON eterogeneo', () => {
    expect(getArtifactWorkflowType({ workflowType: 'meta_ads' })).toBe('meta_ads');
    expect(getArtifactWorkflowType({ foo: 'bar' })).toBeNull();
    expect(getArtifactWorkflowType('plain')).toBeNull();
  });
});
