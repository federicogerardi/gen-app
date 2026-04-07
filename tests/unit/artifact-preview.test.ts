import { formatArtifactPreview } from '@/lib/artifact-preview';

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

  it('usa fallback sicuro su JSON invalido', () => {
    const preview = formatArtifactPreview({
      type: 'content',
      status: 'completed',
      content: '{"headline": "x",',
    });

    expect(preview.text).toContain('Output strutturato disponibile');
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
});
