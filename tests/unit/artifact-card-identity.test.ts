import { buildArtifactCardIdentity } from '@/lib/artifact-card-identity';

describe('artifact card identity', () => {
  it('builds a Meta Ads title using topic/objective from input', () => {
    const result = buildArtifactCardIdentity({
      id: 'art_abcdef123456',
      type: 'content',
      workflowType: 'meta_ads',
      input: {
        topic: 'lead generation b2b',
        tone: 'professional',
      },
      projectName: 'Project Alpha',
    });

    expect(result.title).toBe('Meta Ads • Lead generation b2b');
    expect(result.subtitle).toContain('Project Alpha');
    expect(result.subtitle).toContain('Tono: professional');
    expect(result.subtitle).toContain('ID 123456');
  });

  it('builds a Funnel Pages title using step topic', () => {
    const result = buildArtifactCardIdentity({
      id: 'art_abcdef654321',
      type: 'content',
      workflowType: 'funnel_pages',
      input: {
        topic: 'funnel_quiz',
      },
    });

    expect(result.title).toBe('Funnel Pages • Step Quiz');
    expect(result.subtitle).toContain('ID 654321');
  });

  it('builds a NextLand title using workflow topic', () => {
    const result = buildArtifactCardIdentity({
      id: 'art_nextld123456',
      type: 'content',
      workflowType: 'nextland',
      input: {
        topic: 'nextland_thank_you',
      },
    });

    expect(result.title).toBe('NextLand • Thank-you Page');
    expect(result.subtitle).toContain('ID 123456');
  });

  it('falls back to deterministic title when no input signal is available', () => {
    const result = buildArtifactCardIdentity({
      id: 'art_zzzzzz111111',
      type: 'content',
      workflowType: null,
      input: {},
    });

    expect(result.title).toBe('Contenuto • Generazione 111111');
    expect(result.subtitle).toBe('ID 111111');
  });

  it('uses headline when topic is missing and normalizes spacing', () => {
    const result = buildArtifactCardIdentity({
      id: 'art_hhhhhh222222',
      type: 'content',
      workflowType: 'meta_ads',
      input: {
        headline: '  nuovo   lancio   premium ',
      },
    });

    expect(result.title).toBe('Meta Ads • Nuovo lancio premium');
    expect(result.subtitle).toBe('ID 222222');
  });

  it('uses workflow fallback title for meta ads when no semantic field is present', () => {
    const result = buildArtifactCardIdentity({
      id: 'art_metaaa333333',
      type: 'content',
      workflowType: 'meta_ads',
      input: {
        unknown: 'value',
      },
    });

    expect(result.title).toBe('Meta Ads');
    expect(result.subtitle).toBe('ID 333333');
  });

  it('builds extraction title from objective and keeps project name in subtitle', () => {
    const result = buildArtifactCardIdentity({
      id: 'art_extttt444444',
      type: 'extraction',
      workflowType: 'extraction',
      input: {
        objective: 'audit campagna q2',
      },
      projectName: 'Project Beta',
    });

    expect(result.title).toBe('Estrazione • Audit campagna q2');
    expect(result.subtitle).toContain('Project Beta');
    expect(result.subtitle).toContain('ID 444444');
  });

  it('falls back to content label when type is invalid and workflow is absent', () => {
    const result = buildArtifactCardIdentity({
      id: 'art_invalid555555',
      type: 'unexpected-type',
      workflowType: null,
      input: {
        topic: 'focus retention',
      },
    });

    expect(result.title).toBe('Contenuto • Focus retention');
    expect(result.subtitle).toBe('ID 555555');
  });
});