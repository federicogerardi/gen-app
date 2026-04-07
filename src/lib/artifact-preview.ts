type ArtifactType = 'content' | 'seo' | 'code' | string;
type ArtifactStatus = 'generating' | 'completed' | 'failed' | string;

type PreviewInput = {
  type: ArtifactType;
  status: ArtifactStatus;
  content: string | null | undefined;
};

type PreviewOutput = {
  label: string;
  text: string;
};

type DisplayOutput = {
  title: string;
  text: string;
};

const MAX_PREVIEW_LENGTH = 260;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength = MAX_PREVIEW_LENGTH): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
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
  const trimmed = raw.trim();

  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue to fenced parsing fallback
  }

  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (!fencedMatch) return null;

  try {
    return JSON.parse(fencedMatch[1]);
  } catch {
    return null;
  }
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
    'body',
    'cta',
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
    'metaDescription',
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

function extractDisplayLines(type: ArtifactType, record: Record<string, unknown>): string[] {
  const keysByType: Record<string, string[]> = {
    content: ['headline', 'hook', 'primaryText', 'body', 'cta', 'sections', 'title', 'description', 'content', 'text'],
    seo: ['title', 'metaTitle', 'metaDescription', 'description', 'keywords', 'summary', 'sections'],
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
      text: 'La generazione e ancora in corso. Quando sara completata, qui vedrai il contenuto finale in formato leggibile.',
    };
  }

  if (input.status === 'failed') {
    return {
      title: 'Output non disponibile',
      text: 'La generazione non e andata a buon fine. Riprova dal tool di origine o crea una nuova generazione.',
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
  }

  const parsedPreview = parsed ? formatParsedJson(input.type, parsed) : null;
  if (parsedPreview) {
    return {
      title: 'Output elaborato',
      text: parsedPreview,
    };
  }

  if (looksLikeJson(raw)) {
    return {
      title: 'Output strutturato',
      text: 'Contenuto tecnico strutturato disponibile. Genera una nuova variante dal tool per ottenere un output testuale ottimizzato alla lettura operativa.',
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

  if (looksLikeJson(raw)) {
    return {
      label: 'Anteprima',
      text: 'Output strutturato disponibile. Apri il dettaglio per visualizzare tutti i campi.',
    };
  }

  return {
    label: 'Anteprima',
    text: truncate(normalizeWhitespace(raw)),
  };
}
