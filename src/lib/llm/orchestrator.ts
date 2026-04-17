import { type ArtifactType } from '@/lib/types/artifact';
import { BaseAgent } from './agents/base';
import { ContentAgent } from './agents/content';
import { SeoAgent } from './agents/seo';
import { CodeAgent } from './agents/code';
import { ExtractionAgent } from './agents/extraction';
import { calculateCostAccurate } from './costs';
import { OpenRouterProvider } from './providers/openrouter';
import type { LLMProvider } from './providers/base';
import {
  extractWorkflowTypeFromInput,
  formatExtractionOutput,
  formatFunnelOptinOutput,
  formatFunnelQuizOutput,
  formatMetaAdsOutput,
  looksLikeJson,
  normalizeMarkdownWhitespace,
  normalizeWhitespace,
  stripCodeFence,
  toReadableJsonFallback,
  tryParseJson,
} from './normalizers';

export interface ArtifactRequest {
  type: ArtifactType;
  model: string;
  input: unknown;
  promptOverride?: string;
  temperature?: number;
  abortSignal?: AbortSignal;
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
      abortSignal: request.abortSignal,
    });

    const rawContent = request.promptOverride ? response.content.trim() : (agent.parseResponse(response.content) as string);
    const normalized = this.normalizeOutput({
      rawContent,
      type: request.type,
      workflowType: extractWorkflowTypeFromInput(request.input),
    });
    const cost = calculateCostAccurate(request.model, response.inputTokens, response.outputTokens);

    return { content: normalized.content, inputTokens: response.inputTokens, outputTokens: response.outputTokens, cost };
  }

  async *generateStream(request: ArtifactRequest): AsyncGenerator<{
    token: string;
    usage?: { inputTokens?: number; outputTokens?: number };
  }> {
    const prompt = await this.buildPrompt(request);

    for await (const chunk of this.provider.generateStream({
      model: request.model,
      prompt,
      temperature: request.temperature,
      abortSignal: request.abortSignal,
    })) {
      yield {
        token: chunk.token,
        usage: chunk.usage,
      };
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

    if (workflowType === 'funnel_pages' || workflowType === 'nextland') {
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
