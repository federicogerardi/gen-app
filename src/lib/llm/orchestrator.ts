import { type ArtifactType, BaseAgent } from './agents/base';
import { ContentAgent } from './agents/content';
import { SeoAgent } from './agents/seo';
import { CodeAgent } from './agents/code';
import { calculateCost } from './costs';
import { OpenRouterProvider } from './providers/openrouter';
import type { LLMProvider } from './providers/base';

export interface ArtifactRequest {
  type: ArtifactType;
  model: string;
  input: unknown;
  promptOverride?: string;
  temperature?: number;
}

export interface ArtifactStreamEvent {
  type: 'start' | 'token' | 'complete' | 'error';
  artifactId?: string;
  token?: string;
  tokens?: { input: number; output: number };
  cost?: number;
  message?: string;
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

    const content = request.promptOverride ? response.content.trim() : (agent.parseResponse(response.content) as string);
    const cost = calculateCost(request.model, response.inputTokens, response.outputTokens);

    return { content, inputTokens: response.inputTokens, outputTokens: response.outputTokens, cost };
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
}
