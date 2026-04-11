import type { ArtifactType, ArtifactStatus } from '@/lib/types/artifact';

type PreviewInput = {
  type: ArtifactType;
  status: ArtifactStatus;
  content: string | null | undefined;
  workflowType?: string | null;
};

type PreviewOutput = {
  label: string;
  text: string;
};

type DisplayOutput = {
  title: string;
  text: string;
};

type DisplayLabelInput = {
  type: ArtifactType;
  workflowType?: string | null;
};

const MAX_PREVIEW_LENGTH = 260;

const DEFAULT_TYPE_LABELS: Record<string, string> = {
  content: 'Contenuto',
  seo: 'SEO',
  code: 'Code',
};

const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  funnel_pages: 'Funnel Pages',
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength = MAX_PREVIEW_LENGTH): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

function stripCodeFence(value: string): string {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function prettifyKey(key: string): string {
  const spaced = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function getArtifactDisplayTypeLabel(input: DisplayLabelInput): string {
  if (input.workflowType && WORKFLOW_TYPE_LABELS[input.workflowType]) {
    return WORKFLOW_TYPE_LABELS[input.workflowType];
  }

  return DEFAULT_TYPE_LABELS[input.type] ?? prettifyKey(input.type);
}

export function getArtifactWorkflowType(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const maybe = (input as Record<string, unknown>).workflowType;
  return typeof maybe === 'string' ? maybe : null;
}

export function getEffectiveArtifactWorkflowType(workflowType: string | null | undefined, input: unknown): string | null {
  return workflowType ?? getArtifactWorkflowType(input);
}

function normalizeJsonLikeText(raw: string): string {
  const stripped = stripCodeFence(raw)
    .replace(/"([a-zA-Z0-9_]+)"\s*:/g, '$1: ')
    .replace(/[{}\[\]]/g, ' ')
    .replace(/"/g, '')
    .replace(/\s*,\s*/g, ' - ');

  return normalizeWhitespace(stripped);
}

function parseWithRepair(candidate: string): unknown {
  try {
    return JSON.parse(candidate);
  } catch {
    // continue to repair mode
  }

  const repaired = candidate.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    trimmed.startsWith('```json') ||
    trimmed.startsWith('```')
  );
}

function tryParseJson(raw: string): unknown {
  const trimmed = stripCodeFence(raw.trim());

  if (!trimmed) return null;

  const direct = parseWithRepair(trimmed);
  if (direct) return direct;

  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    const objectCandidate = trimmed.slice(objectStart, objectEnd + 1);
    const objectParsed = parseWithRepair(objectCandidate);
    if (objectParsed) return objectParsed;
  }

  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    const arrayCandidate = trimmed.slice(arrayStart, arrayEnd + 1);
    return parseWithRepair(arrayCandidate);
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = normalizeWhitespace(value);
    return normalized.length > 0 ? normalized : null;
  }
  return null;
}

function extractFromArray(value: unknown): string | null {
  if (!Array.isArray(value)) return null;

  const collected: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      const text = normalizeWhitespace(item);
      if (text) collected.push(text);
    } else {
      const itemRecord = asRecord(item);
      if (!itemRecord) continue;

      for (const key of ['title', 'headline', 'name', 'text', 'description', 'content']) {
        const maybe = firstString(itemRecord[key]);
        if (maybe) {
          collected.push(maybe);
          break;
        }
      }
    }

    if (collected.length >= 2) break;
  }

  if (collected.length === 0) return null;
  return collected.join(' - ');
}

function pickFields(record: Record<string, unknown>, keys: string[]): string | null {
  const values: string[] = [];

  for (const key of keys) {
    const raw = record[key];
    const text = firstString(raw);
    if (text) {
      values.push(text);
      if (values.length >= 3) break;
      continue;
    }

    const fromArray = extractFromArray(raw);
    if (fromArray) {
      values.push(fromArray);
      if (values.length >= 3) break;
    }
  }

  if (values.length === 0) return null;
  return values.join(' - ');
}

function formatContentJson(record: Record<string, unknown>): string | null {
  return pickFields(record, [
    'headline',
    'hook',
    'primaryText',
    'primary_text',
    'body',
    'cta',
    'call_to_action',
    'sections',
    'title',
    'description',
    'content',
    'text',
  ]);
}

function formatSeoJson(record: Record<string, unknown>): string | null {
  return pickFields(record, [
    'title',
    'metaTitle',
    'meta_title',
    'metaDescription',
    'meta_description',
    'description',
    'keywords',
    'summary',
  ]);
}

function formatCodeJson(record: Record<string, unknown>): string | null {
  const language = firstString(record.language) ?? firstString(record.lang) ?? firstString(record.framework);
  const intent =
    firstString(record.intent) ??
    firstString(record.goal) ??
    firstString(record.summary) ??
    firstString(record.description);

  if (language && intent) return `${language} - ${intent}`;
  if (intent) return intent;
  if (language) return `${language} code artifact pronto per revisione`;

  const generic = pickFields(record, ['summary', 'description', 'code', 'snippet']);
  return generic;
}

function formatParsedJson(type: ArtifactType, parsed: unknown): string | null {
  const record = asRecord(parsed);
  if (!record) {
    const asArray = extractFromArray(parsed);
    return asArray;
  }

  if (type === 'seo') return formatSeoJson(record);
  if (type === 'code') return formatCodeJson(record);
  return formatContentJson(record);
}

function extractGenericRecordText(record: Record<string, unknown>, maxItems: number): string | null {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(record)) {
    const direct = firstString(value);
    if (direct) {
      lines.push(`${prettifyKey(key)}: ${direct}`);
    } else {
      const fromArray = extractFromArray(value);
      if (fromArray) {
        lines.push(`${prettifyKey(key)}: ${fromArray}`);
      } else {
        const nested = asRecord(value);
        if (nested) {
          const nestedSummary = pickFields(nested, ['title', 'headline', 'name', 'text', 'description', 'content', 'summary']);
          if (nestedSummary) lines.push(`${prettifyKey(key)}: ${nestedSummary}`);
        }
      }
    }

    if (lines.length >= maxItems) break;
  }

  return lines.length > 0 ? lines.join(' - ') : null;
}

function extractDisplayLines(type: ArtifactType, record: Record<string, unknown>): string[] {
  const keysByType: Record<string, string[]> = {
    content: [
      'headline',
      'hook',
      'primaryText',
      'primary_text',
      'body',
      'cta',
      'call_to_action',
      'sections',
      'title',
      'description',
      'content',
      'text',
    ],
    seo: ['title', 'metaTitle', 'meta_title', 'metaDescription', 'meta_description', 'description', 'keywords', 'summary', 'sections'],
    code: ['summary', 'description', 'intent', 'goal', 'language', 'framework', 'snippet', 'code'],
  };

  const keys = keysByType[type] ?? keysByType.content;
  const lines: string[] = [];

  for (const key of keys) {
    const raw = record[key];
    const text = firstString(raw);
    if (text) {
      lines.push(text);
      continue;
    }

    const fromArray = extractFromArray(raw);
    if (fromArray) lines.push(fromArray);

    if (lines.length >= 6) break;
  }

  return Array.from(new Set(lines));
}

export function formatArtifactContentForDisplay(input: PreviewInput): DisplayOutput {
  if (input.status === 'generating') {
    return {
      title: 'Output in elaborazione',
      text: 'La generazione è in corso. Al completamento vedrai qui il contenuto finale in formato leggibile.',
    };
  }

  if (input.status === 'failed') {
    return {
      title: 'Output non disponibile',
      text: 'La generazione non è andata a buon fine. Riprova dal tool di origine o avvia una nuova generazione.',
    };
  }

  const raw = (input.content ?? '').trim();
  if (!raw) {
    return {
      title: 'Output non disponibile',
      text: 'Nessun contenuto disponibile per questo artefatto.',
    };
  }

  const parsed = tryParseJson(raw);
  const record = asRecord(parsed);

  if (record) {
    const lines = extractDisplayLines(input.type, record);
    if (lines.length > 0) {
      return {
        title: 'Output elaborato',
        text: lines.join('\n\n'),
      };
    }

    const generic = extractGenericRecordText(record, 8);
    if (generic) {
      return {
        title: 'Output elaborato',
        text: generic,
      };
    }
  }

  const parsedPreview = parsed ? formatParsedJson(input.type, parsed) : null;
  if (parsedPreview) {
    return {
      title: 'Output elaborato',
      text: parsedPreview,
    };
  }

  if (looksLikeJson(raw)) {
    const fallbackText = normalizeJsonLikeText(raw);
    return {
      title: 'Output elaborato',
      text: fallbackText || 'Contenuto disponibile ma non formattabile automaticamente.',
    };
  }

  return {
    title: 'Output elaborato',
    text: raw,
  };
}

export function formatArtifactPreview(input: PreviewInput): PreviewOutput {
  if (input.status === 'generating') {
    return {
      label: 'Anteprima',
      text: 'Generazione in corso. Anteprima disponibile al completamento.',
    };
  }

  if (input.status === 'failed') {
    return {
      label: 'Anteprima',
      text: 'Generazione non completata. Apri il dettaglio per verificare e riprovare.',
    };
  }

  const raw = (input.content ?? '').trim();
  if (!raw) {
    return {
      label: 'Anteprima',
      text: 'Nessun contenuto disponibile.',
    };
  }

  const parsed = tryParseJson(raw);
  const parsedPreview = parsed ? formatParsedJson(input.type, parsed) : null;
  if (parsedPreview) {
    return {
      label: 'Anteprima',
      text: truncate(parsedPreview),
    };
  }

  const parsedRecord = asRecord(parsed);
  if (parsedRecord) {
    const generic = extractGenericRecordText(parsedRecord, 3);
    if (generic) {
      return {
        label: 'Anteprima',
        text: truncate(generic),
      };
    }
  }

  if (looksLikeJson(raw)) {
    const fallbackText = normalizeJsonLikeText(raw);
    return {
      label: 'Anteprima',
      text: truncate(fallbackText || 'Contenuto disponibile ma non formattabile automaticamente.'),
    };
  }

  return {
    label: 'Anteprima',
    text: truncate(normalizeWhitespace(raw)),
  };
}
