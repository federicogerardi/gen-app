import { getEffectiveArtifactWorkflowType } from '@/lib/artifact-preview';

type ArtifactRelaunchInput = {
  id: string;
  projectId?: string | null;
  workflowType?: string | null;
  input?: unknown;
  hasReusableCheckpoint?: boolean;
};

export type ArtifactRelaunchIntent = 'resume' | 'regenerate';

export type ArtifactRelaunchAction = {
  href: string;
  label: string;
  intent: ArtifactRelaunchIntent;
  variant: 'primary' | 'secondary';
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null;
  const value = record[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function appendIfPresent(params: URLSearchParams, key: string, value: string | null) {
  if (!value) return;
  params.set(key, value);
}

function buildArtifactIntentHref(payload: ArtifactRelaunchInput, intent: ArtifactRelaunchIntent): string | null {
  const inputRecord = asRecord(payload.input);
  const workflow = getEffectiveArtifactWorkflowType(payload.workflowType, payload.input);

  if (!workflow) return null;

  const params = new URLSearchParams();
  appendIfPresent(params, 'sourceArtifactId', payload.id);
  appendIfPresent(params, 'projectId', payload.projectId ?? null);

  if (workflow === 'meta_ads') {
    appendIfPresent(params, 'product', readString(inputRecord, 'product'));
    appendIfPresent(params, 'audience', readString(inputRecord, 'audience'));
    appendIfPresent(params, 'offer', readString(inputRecord, 'offer'));
    appendIfPresent(params, 'objective', readString(inputRecord, 'objective'));
    appendIfPresent(params, 'tone', readString(inputRecord, 'tone'));
    appendIfPresent(params, 'angle', readString(inputRecord, 'angle'));

    return `/tools/meta-ads?${params.toString()}`;
  }

  if (workflow === 'funnel_pages') {
    params.set('intent', intent);
    appendIfPresent(params, 'tone', readString(inputRecord, 'tone'));
    appendIfPresent(params, 'notes', readString(inputRecord, 'notes'));

    return `/tools/funnel-pages?${params.toString()}`;
  }

  return null;
}

export function buildArtifactRelaunchActions(payload: ArtifactRelaunchInput): ArtifactRelaunchAction[] {
  const workflow = getEffectiveArtifactWorkflowType(payload.workflowType, payload.input);

  if (!workflow) return [];

  if (workflow === 'funnel_pages') {
    const regenerateHref = buildArtifactIntentHref(payload, 'regenerate');
    if (!regenerateHref) return [];

    const actions: ArtifactRelaunchAction[] = [];

    if (payload.hasReusableCheckpoint) {
      const resumeHref = buildArtifactIntentHref(payload, 'resume');
      if (resumeHref) {
        actions.push({
          href: resumeHref,
          label: 'Riprendi dal checkpoint',
          intent: 'resume',
          variant: 'primary',
        });
      }
    }

    actions.push({
      href: regenerateHref,
      label: 'Rigenera variante',
      intent: 'regenerate',
      variant: actions.length === 0 ? 'primary' : 'secondary',
    });

    return actions;
  }

  const href = buildArtifactIntentHref(payload, 'regenerate');
  if (!href) return [];

  return [{
    href,
    label: 'Rigenera variante',
    intent: 'regenerate',
    variant: 'primary',
  }];
}

export function buildArtifactRelaunchHref(payload: ArtifactRelaunchInput): string | null {
  return buildArtifactRelaunchActions(payload)[0]?.href ?? null;
}
