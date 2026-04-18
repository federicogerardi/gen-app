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

  it('builds nextland relaunch actions with resume as primary when a reusable checkpoint exists', () => {
    const actions = buildArtifactRelaunchActions({
      id: 'art_nextland_1',
      projectId: 'proj_2',
      workflowType: 'nextland',
      input: {
        workflowType: 'nextland',
        tone: 'formal',
        notes: 'step 2 in sospeso',
      },
      hasReusableCheckpoint: true,
    });

    expect(actions).toEqual([
      {
        href: '/tools/nextland?sourceArtifactId=art_nextland_1&projectId=proj_2&intent=resume&tone=formal&notes=step+2+in+sospeso',
        label: 'Riprendi dal checkpoint',
        intent: 'resume',
        variant: 'primary',
      },
      {
        href: '/tools/nextland?sourceArtifactId=art_nextland_1&projectId=proj_2&intent=regenerate&tone=formal&notes=step+2+in+sospeso',
        label: 'Rigenera variante',
        intent: 'regenerate',
        variant: 'secondary',
      },
    ]);
  });

  it('falls back to regenerate href for nextland when no checkpoint is reusable', () => {
    expect(buildArtifactRelaunchHref({
      id: 'art_nextland_2',
      projectId: 'proj_2',
      workflowType: 'nextland',
      input: {
        workflowType: 'nextland',
        tone: 'casual',
      },
      hasReusableCheckpoint: false,
    })).toBe('/tools/nextland?sourceArtifactId=art_nextland_2&projectId=proj_2&intent=regenerate&tone=casual');
  });

  it('returns no relaunch actions for meta ads artifacts', () => {
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

    expect(actions).toEqual([]);
    expect(buildArtifactRelaunchHref({
      id: 'art_meta_1',
      projectId: 'proj_1',
      workflowType: 'meta_ads',
      input: {
        workflowType: 'meta_ads',
      },
    })).toBeNull();
  });
});