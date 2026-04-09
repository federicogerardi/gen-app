# ADR 001: Modular LLM Controller Architecture

**Status**: ACCEPTED  
**Date**: 2026-04-07  
**Deciders**: Architecture Team  
**Affect Scope**: Core Backend, LLM Integration, Module System

## Context

The application must support multiple AI generation tools (content, SEO, code artifacts). Each tool has different requirements but shares common infrastructure:
- OpenRouter API integration
- Multi-model support (GPT-4, Claude 3, Mistral)
- Request/response processing
- Streaming vs batch handling
- Error handling and retry logic

The architecture must allow future tools to be added as plugins without modifying core code.

## Decision

Implement a **modular LLM controller** with **provider abstraction layer** and **orchestrator pattern**:

```
LLM Module Architecture:

┌─────────────────────────────────────────────────────────┐
│                   API Route Handler                      │
│              (/api/artifacts/generate)                    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              LLM Orchestrator                            │
│  - Route to correct agent based on artifact type        │
│  - Handle streaming/batch decision                      │
│  - Manage user quota & rate limits                      │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐  ┌──────▼──────┐  ┌───▼──────┐
   │Content  │  │SEO Agent    │  │Code      │
   │Agent    │  │             │  │Agent     │
   └────┬────┘  └──────┬──────┘  └───┬──────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │    LLM Provider Layer       │
        │ - OpenRouter Adapter        │
        │ - Request validation        │
        │ - Response parsing          │
        │ - Error handling            │
        └─────────────────────────────┘
```

### Core Components

#### 1. Base Agent Interface (TypeScript)
```typescript
// src/lib/llm/agents/base.ts
import { z } from 'zod';

export abstract class BaseAgent {
  abstract type: 'content' | 'seo' | 'code';
  
  abstract validateInput(input: unknown): Promise<void>;
  abstract buildPrompt(context: unknown): string;
  abstract parseResponse(response: string): unknown;
  
  async execute(input: any) {
    await this.validateInput(input);
    const prompt = this.buildPrompt(input);
    return this.parseResponse(prompt);
  }
}
```

#### 2. Provider Abstraction
```typescript
// src/lib/llm/providers/base.ts
export interface LLMProvider {
  generateText(request: GenerateRequest): Promise<GenerateResponse>;
  generateStream(request: GenerateRequest): AsyncGenerator<StreamChunk>;
}

// src/lib/llm/providers/openrouter.ts
export class OpenRouterProvider implements LLMProvider {
  // Implementation handles OpenRouter-specific logic
}
```

#### 3. Central Orchestrator
```typescript
// src/lib/llm/orchestrator.ts
export class LLMOrchestrator {
  private agents: Map<string, BaseAgent>;
  private provider: LLMProvider;
  
  async generate(request: ArtifactRequest) {
    const agent = this.getAgent(request.type);
    const validatedInput = await agent.validateInput(request.input);
    const prompt = agent.buildPrompt(validatedInput);
    
    const response = await this.provider.generateText({
      model: request.model,
      prompt,
      temperature: agent.temperature,
    });
    
    return agent.parseResponse(response);
  }
}
```

## Consequences

### Positive
- ✅ Easy to add new artifact types (new Agent class)
- ✅ Provider agnostic (can swap OpenRouter for Bedrock)
- ✅ Clear separation of concerns
- ✅ Type-safe with Zod validation
- ✅ Testable with mock agents/providers
- ✅ AI agents can understand tool structure clearly

### Negative
- ⚠️ Extra abstraction layer (slight performance overhead)
- ⚠️ More boilerplate than monolithic approach
- ⚠️ Requires careful dependency injection

### Mitigation
- Caching at orchestrator level minimizes perf impact
- Well-documented types reduce learning curve
- Dependency injection container simplifies wiring

## Alternatives Considered

### A) Monolithic Handler
Single function handling all artifact types
- ❌ Hard to test different tools independently
- ❌ Difficult to scale to many artifact types

### B) Separate Services
Different microservices per artifact type
- ❌ Over-complexity for 50 internal users
- ❌ High operational overhead
- ❌ Overkill rispetto all'hosting target su Vercel per 50 utenti interni

## Validation

- ✅ Allows AI agents to understand tool structure
- ✅ Handles future plugins without core changes
- ✅ Clear contracts for tool integration
- ✅ JSON communication between orchestrator and agents

## Related ADRs
- ADR 002: Streaming vs Batch LLM Response
- ADR 003: Rate Limiting & Quota Strategy
