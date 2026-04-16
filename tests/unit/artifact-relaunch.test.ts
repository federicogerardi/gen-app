import { buildArtifactRelaunchActions, buildArtifactRelaunchHref } from '@/lib/artifact-relaunch';

describe('artifact relaunch', () => {
  it('builds funnel relaunch actions with resume as primary when a reusable checkpoint exists', () => {
    const actions = buildArtifactRelaunchActions({
      id: 'art_funnel_1',
      projectId: 'proj_1',
      workflowType: 'funnel_pages',
      input: {
        workflowType: 'funnel_pages',
        tone: 'professional',
        notes: 'brief note',
      },
      hasReusableCheckpoint: true,
    });

    expect(actions).toEqual([
      {
        href: '/tools/funnel-pages?sourceArtifactId=art_funnel_1&projectId=proj_1&intent=resume&tone=professional&notes=brief+note',
        label: 'Riprendi dal checkpoint',
        intent: 'resume',
        variant: 'primary',
      },
      {
        href: '/tools/funnel-pages?sourceArtifactId=art_funnel_1&projectId=proj_1&intent=regenerate&tone=professional&notes=brief+note',
        label: 'Rigenera variante',
        intent: 'regenerate',
        variant: 'secondary',
      },
    ]);
  });

  it('falls back to regenerate as primary when no checkpoint is reusable', () => {
    expect(buildArtifactRelaunchHref({
      id: 'art_funnel_2',
      projectId: 'proj_1',
      workflowType: 'funnel_pages',
      input: {
        workflowType: 'funnel_pages',
        tone: 'professional',
      },
      hasReusableCheckpoint: false,
    })).toBe('/tools/funnel-pages?sourceArtifactId=art_funnel_2&projectId=proj_1&intent=regenerate&tone=professional');
  });

  it('keeps meta ads relaunch mapped to a single regenerate action', () => {
    const actions = buildArtifactRelaunchActions({
      id: 'art_meta_1',
      projectId: 'proj_1',
      workflowType: 'meta_ads',
      input: {
        workflowType: 'meta_ads',
        product: 'Prodotto',
        audience: 'Audience',
        offer: 'Offerta',
        objective: 'lead generation',
        tone: 'professional',
      },
    });

    expect(actions).toEqual([
      {
        href: '/tools/meta-ads?sourceArtifactId=art_meta_1&projectId=proj_1&product=Prodotto&audience=Audience&offer=Offerta&objective=lead+generation&tone=professional',
        label: 'Rigenera variante',
        intent: 'regenerate',
        variant: 'primary',
      },
    ]);
  });
});