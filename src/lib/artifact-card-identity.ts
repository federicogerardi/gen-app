import { getArtifactDisplayTypeLabel } from '@/lib/artifact-preview';
import { isArtifactType } from '@/lib/types/artifact';

type ArtifactCardIdentityInput = {
  id: string;
  type: string;
  workflowType?: string | null;
  input: unknown;
  projectName?: string | null;
};

type ArtifactCardIdentity = {
  title: string;
  subtitle: string;
};

const FUNNEL_STEP_LABEL: Record<string, string> = {
  funnel_optin: 'Step Optin',
  funnel_quiz: 'Step Quiz',
  funnel_vsl: 'Step VSL',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
}

function prettify(value: string): string {
  const normalized = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return value;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function shortArtifactId(id: string): string {
  return id.slice(-6).toUpperCase();
}

function extractTopic(record: Record<string, unknown> | null): string | null {
  if (!record) return null;

  const preferredKeys = ['headline', 'title', 'name', 'objective', 'campaignName', 'campaign', 'offer', 'topic'];
  for (const key of preferredKeys) {
    const value = firstString(record[key]);
    if (value) return value;
  }

  return null;
}

function resolveFunnelStepLabel(topic: string | null): string | null {
  if (!topic) return null;
  const lowered = topic.toLowerCase();
  return FUNNEL_STEP_LABEL[lowered] ?? null;
}

export function buildArtifactCardIdentity(input: ArtifactCardIdentityInput): ArtifactCardIdentity {
  const shortId = shortArtifactId(input.id);
  const parsedInput = asRecord(input.input);
  const topic = extractTopic(parsedInput);
  const stepLabel = resolveFunnelStepLabel(topic);
  const tone = firstString(parsedInput?.tone);

  const safeType = isArtifactType(input.type) ? input.type : 'content';
  const typeLabel = getArtifactDisplayTypeLabel({
    type: safeType,
    workflowType: input.workflowType ?? null,
  });

  let title: string;

  if (input.workflowType === 'meta_ads') {
    title = topic ? `Meta Ads • ${prettify(topic)}` : 'Meta Ads';
  } else if (input.workflowType === 'funnel_pages') {
    if (stepLabel) {
      title = `Funnel Pages • ${stepLabel}`;
    } else if (topic) {
      title = `Funnel Pages • ${prettify(topic)}`;
    } else {
      title = 'Funnel Pages';
    }
  } else if (input.workflowType === 'extraction') {
    title = topic ? `Estrazione • ${prettify(topic)}` : 'Estrazione campi';
  } else if (topic) {
    title = `${typeLabel} • ${prettify(topic)}`;
  } else {
    title = `${typeLabel} • Generazione ${shortId}`;
  }

  const subtitleParts: string[] = [];
  if (input.projectName) subtitleParts.push(input.projectName);
  if (tone) subtitleParts.push(`Tono: ${tone}`);
  subtitleParts.push(`ID ${shortId}`);

  return {
    title,
    subtitle: subtitleParts.join(' · '),
  };
}