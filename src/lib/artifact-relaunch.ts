import { getEffectiveArtifactWorkflowType } from '@/lib/artifact-preview';

type ArtifactRelaunchInput = {
  id: string;
  projectId?: string | null;
  workflowType?: string | null;
  input?: unknown;
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

export function buildArtifactRelaunchHref(payload: ArtifactRelaunchInput): string | null {
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
    appendIfPresent(params, 'tone', readString(inputRecord, 'tone'));
    appendIfPresent(params, 'notes', readString(inputRecord, 'notes'));

    return `/tools/funnel-pages?${params.toString()}`;
  }

  return null;
}
