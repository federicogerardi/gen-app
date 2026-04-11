import { type ArtifactType, BaseAgent } from './agents/base';
import { ContentAgent } from './agents/content';
import { SeoAgent } from './agents/seo';
import { CodeAgent } from './agents/code';
import { ExtractionAgent } from './agents/extraction';
import { calculateCost } from './costs';
import { OpenRouterProvider } from './providers/openrouter';
import type { LLMProvider } from './providers/base';
import { z } from 'zod';

export interface ArtifactRequest {
  type: ArtifactType;
  model: string;
  input: unknown;
  promptOverride?: string;
  temperature?: number;
}

export interface ArtifactStreamEvent {
  type: 'start' | 'token' | 'progress' | 'complete' | 'error';
  artifactId?: string;
  token?: string;
  sequence?: number;
  workflowType?: string | null;
  format?: 'plain' | 'json' | 'markdown';
  tokens?: { input: number; output: number };
  estimatedTokens?: { input: number; output: number };
  cost?: number;
  costEstimate?: number;
  code?: string;
  message?: string;
}

export interface NormalizedArtifactContent {
  content: string;
  format: 'plain' | 'json' | 'markdown';
  warning?: string;
}

const metaAdsVariantSchema = z.object({
  headline: z.string().min(1),
  primary_text: z.string().min(1).optional(),
  primaryText: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  cta: z.string().min(1).optional(),
});

const metaAdsSchema = z.object({
  variants: z.array(metaAdsVariantSchema).min(1),
});

const funnelOptinVariantSchema = z.object({
  pre_headline: z.string().min(1).optional(),
  headline: z.string().min(1),
  subtitle: z.string().min(1).optional(),
  cta_primary: z.string().min(1).optional(),
  score_efficacia: z.number().int().min(0).max(100).optional(),
});

const funnelOptinSchema = z.object({
  variants: z.array(funnelOptinVariantSchema).min(1),
  winner: z.object({
    variant_index: z.number().int().optional(),
    motivazione: z.string().min(1).optional(),
  }).optional(),
});

const funnelQuizSchema = z.object({
  questions: z.array(z.object({
    question: z.string().min(1),
    category: z.string().min(1).optional(),
  })).min(1),
  segments: z.array(z.object({ name: z.string().min(1) })).optional(),
});

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeMarkdownWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripCodeFence(value: string): string {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/^```(?:json|text|txt|md|markdown)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('```');
}

function tryParseJson(raw: string): unknown | null {
  const candidate = stripCodeFence(raw);
  if (!candidate) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    // continue with repair mode
  }

  const repaired = candidate.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(repaired);
  } catch {
    // continue with object/array slice recovery
  }

  const objectStart = candidate.indexOf('{');
  const objectEnd = candidate.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    try {
      return JSON.parse(candidate.slice(objectStart, objectEnd + 1));
    } catch {
      // continue with array recovery
    }
  }

  const arrayStart = candidate.indexOf('[');
  const arrayEnd = candidate.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    try {
      return JSON.parse(candidate.slice(arrayStart, arrayEnd + 1));
    } catch {
      return null;
    }
  }

  return null;
}

function toReadableJsonFallback(parsed: unknown): string | null {
  if (!parsed) return null;

  if (typeof parsed === 'string') {
    const text = normalizeWhitespace(parsed);
    return text || null;
  }

  if (Array.isArray(parsed)) {
    const parts = parsed
      .map((entry) => {
        if (typeof entry === 'string') return normalizeWhitespace(entry);
        if (!entry || typeof entry !== 'object') return null;

        const record = entry as Record<string, unknown>;
        const text = [record.headline, record.title, record.description, record.text]
          .filter((value): value is string => typeof value === 'string')
          .map((value) => normalizeWhitespace(value))
          .filter(Boolean)
          .join(' - ');

        return text || null;
      })
      .filter((value): value is string => Boolean(value));

    return parts.length > 0 ? parts.join('\n') : null;
  }

  if (typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    const lines: string[] = [];

    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        const normalized = normalizeWhitespace(value);
        if (normalized) lines.push(`${key}: ${normalized}`);
      }

      if (lines.length >= 6) break;
    }

    return lines.length > 0 ? lines.join('\n') : null;
  }

  return null;
}

function formatMetaAdsOutput(parsed: unknown): string | null {
  const validated = metaAdsSchema.safeParse(parsed);
  if (!validated.success) return null;

  return validated.data.variants
    .map((variant, index) => {
      const primaryText = variant.primary_text ?? variant.primaryText ?? '';
      const sections = [
        `Variante ${index + 1}`,
        `Headline: ${variant.headline}`,
        primaryText ? `Primary text: ${primaryText}` : null,
        variant.description ? `Description: ${variant.description}` : null,
        variant.cta ? `CTA: ${variant.cta}` : null,
      ].filter((line): line is string => Boolean(line));

      return sections.join('\n');
    })
    .join('\n\n');
}

function formatFunnelOptinOutput(parsed: unknown): string | null {
  const validated = funnelOptinSchema.safeParse(parsed);
  if (!validated.success) return null;

  const variants = validated.data.variants
    .map((variant, index) => {
      const sections = [
        `Variante ${index + 1}`,
        variant.pre_headline ? `Pre-headline: ${variant.pre_headline}` : null,
        `Headline: ${variant.headline}`,
        variant.subtitle ? `Subtitle: ${variant.subtitle}` : null,
        variant.cta_primary ? `CTA primaria: ${variant.cta_primary}` : null,
        typeof variant.score_efficacia === 'number' ? `Score efficacia: ${variant.score_efficacia}/100` : null,
      ].filter((line): line is string => Boolean(line));

      return sections.join('\n');
    })
    .join('\n\n');

  const winner = validated.data.winner?.variant_index
    ? `\n\nWinner consigliata: Variante ${validated.data.winner.variant_index}`
    : '';

  return `${variants}${winner}`.trim();
}

function formatFunnelQuizOutput(parsed: unknown): string | null {
  const validated = funnelQuizSchema.safeParse(parsed);
  if (!validated.success) return null;

  const questionCount = validated.data.questions.length;
  const categories = new Set(
    validated.data.questions
      .map((question) => question.category)
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  );

  const segments = (validated.data.segments ?? []).map((segment) => segment.name).filter(Boolean);

  const lines = [
    `Quiz Funnel pronto (${questionCount} domande)`,
    categories.size > 0 ? `Categorie: ${Array.from(categories).join(', ')}` : null,
    segments.length > 0 ? `Segmenti: ${segments.join(', ')}` : null,
  ].filter((line): line is string => Boolean(line));

  return lines.join('\n');
}

function formatExtractionOutput(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const record = parsed as Record<string, unknown>;
  const fields = record.fields && typeof record.fields === 'object' && !Array.isArray(record.fields)
    ? (record.fields as Record<string, unknown>)
    : record;

  const lines: string[] = ['## Campi Estratti'];

  for (const [field, value] of Object.entries(fields)) {
    const normalizedValue = value === null || value === undefined
      ? 'null'
      : typeof value === 'string'
        ? value
        : JSON.stringify(value);

    lines.push(`### ${field}`);
    lines.push(`- Valore: ${normalizedValue}`);
  }

  const missingFields = Array.isArray(record.missingFields)
    ? record.missingFields.filter((field): field is string => typeof field === 'string')
    : [];

  if (missingFields.length > 0) {
    lines.push('');
    lines.push('## Campi Mancanti');
    for (const field of missingFields) {
      lines.push(`- ${field}`);
    }
  }

  return lines.join('\n');
}

function extractWorkflowTypeFromInput(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const maybe = (input as Record<string, unknown>).workflowType;
  return typeof maybe === 'string' ? maybe : null;
}

export class LLMOrchestrator {
  private agents: Map<ArtifactType, BaseAgent>;
  private provider: LLMProvider;

  constructor() {
    this.provider = new OpenRouterProvider();
    this.agents = new Map<ArtifactType, BaseAgent>([
      ['content', new ContentAgent()],
      ['seo', new SeoAgent()],
      ['code', new CodeAgent()],
      ['extraction', new ExtractionAgent()],
    ]);
  }

  getAgent(type: ArtifactType): BaseAgent {
    const agent = this.agents.get(type);
    if (!agent) throw new Error(`Unknown artifact type: ${type}`);
    return agent;
  }

  private async buildPrompt(request: ArtifactRequest): Promise<string> {
    if (request.promptOverride && request.promptOverride.trim().length > 0) {
      return request.promptOverride;
    }

    const agent = this.getAgent(request.type);
    await agent.validateInput(request.input);
    return agent.buildPrompt(request.input);
  }

  async generate(request: ArtifactRequest): Promise<{ content: string; inputTokens: number; outputTokens: number; cost: number }> {
    const agent = this.getAgent(request.type);
    const prompt = await this.buildPrompt(request);

    const response = await this.provider.generateText({
      model: request.model,
      prompt,
      temperature: request.temperature,
    });

    const rawContent = request.promptOverride ? response.content.trim() : (agent.parseResponse(response.content) as string);
    const normalized = this.normalizeOutput({
      rawContent,
      type: request.type,
      workflowType: extractWorkflowTypeFromInput(request.input),
    });
    const cost = calculateCost(request.model, response.inputTokens, response.outputTokens);

    return { content: normalized.content, inputTokens: response.inputTokens, outputTokens: response.outputTokens, cost };
  }

  async *generateStream(request: ArtifactRequest): AsyncGenerator<{ token: string }> {
    const prompt = await this.buildPrompt(request);

    for await (const chunk of this.provider.generateStream({
      model: request.model,
      prompt,
      temperature: request.temperature,
    })) {
      yield { token: chunk.token };
    }
  }

  normalizeOutput(params: { rawContent: string; type: ArtifactType; workflowType?: string | null }): NormalizedArtifactContent {
    const raw = params.rawContent.trim();
    if (!raw) {
      return { content: '', format: 'plain' };
    }

    const workflowType = params.workflowType ?? null;

    if (workflowType === 'meta_ads') {
      const parsed = tryParseJson(raw);
      if (parsed) {
        const formatted = formatMetaAdsOutput(parsed) ?? toReadableJsonFallback(parsed);
        if (formatted) {
          return { content: formatted, format: 'markdown' };
        }
      }

      if (looksLikeJson(raw)) {
        return {
          content: normalizeMarkdownWhitespace(stripCodeFence(raw)),
          format: 'markdown',
          warning: 'META_ADS_JSON_PARSE_FAILED',
        };
      }

      return {
        content: normalizeMarkdownWhitespace(stripCodeFence(raw)),
        format: 'markdown',
      };
    }

    if (workflowType === 'funnel_pages') {
      const parsed = tryParseJson(raw);
      if (parsed) {
        const formatted = formatFunnelOptinOutput(parsed) ?? formatFunnelQuizOutput(parsed) ?? toReadableJsonFallback(parsed);
        if (formatted) {
          return { content: formatted, format: 'markdown' };
        }

        return {
          content: normalizeMarkdownWhitespace(stripCodeFence(raw)),
          format: 'markdown',
          warning: 'FUNNEL_JSON_UNMAPPED_FALLBACK',
        };
      }

      return {
        content: normalizeMarkdownWhitespace(stripCodeFence(raw)),
        format: 'markdown',
      };
    }

    if (workflowType === 'extraction') {
      const parsed = tryParseJson(raw);
      if (parsed) {
        const formatted = formatExtractionOutput(parsed) ?? toReadableJsonFallback(parsed);
        if (formatted) {
          return { content: formatted, format: 'markdown' };
        }
      }

      if (looksLikeJson(raw)) {
        return {
          content: normalizeMarkdownWhitespace(stripCodeFence(raw)),
          format: 'markdown',
          warning: 'EXTRACTION_JSON_PARSE_FAILED',
        };
      }

      return {
        content: normalizeMarkdownWhitespace(stripCodeFence(raw)),
        format: 'markdown',
      };
    }

    const parsed = tryParseJson(raw);
    if (parsed) {
      const generic = toReadableJsonFallback(parsed);
      if (generic) {
        return { content: generic, format: 'json' };
      }
    }

    return { content: normalizeWhitespace(stripCodeFence(raw)), format: 'plain' };
  }
}
