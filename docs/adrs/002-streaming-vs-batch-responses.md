# ADR 002: Streaming vs Batch LLM Responses

**Status**: ACCEPTED  
**Date**: 2026-04-07  
**Deciders**: Architecture Team  
**Affect Scope**: API Design, Frontend UX, Backend Implementation

## Context

OpenRouter supports both:
1. **Streaming**: Real-time token-by-token via SSE (Server-Sent Events)
2. **Batch**: Full response returned after generation completes

Different artifact types have different requirements:
- **Content Generation**: Progressive display is better UX
- **SEO Analysis**: Can wait for complete response
- **Code Generation**: Progressive rendering saves time

### UX Comparison

| Aspect | Streaming | Batch |
|--------|-----------|-------|
| **Time to First Token** | ~50ms | ~30s |
| **User Perception** | App is responsive | App feels slow |
| **Network** | Progressive bandwidth | Spike then idle |
| **Implementation** | Complex (SSE/WebSocket) | Simple (REST) |
| **Error Handling** | Mid-response recovery | Binary success/fail |

## Decision

**Implement Streaming as Primary, Batch as Fallback**

Strategy per artifact type:

```
Content/SEO Tools:
└─ Streaming (real-time feedback) → better UX

Code Generation Tools:
└─ Streaming (lines of code appear progressively)

Fallback (errors/slow connections):
└─ Batch mode with loading skeleton
```

### Implementation Architecture

#### 1. Streaming Endpoint (Server-Sent Events)
```typescript
// src/app/api/artifacts/generate/route.ts
import { createReadableStream } from '@/lib/llm/streaming';

export async function POST(request: Request) {
  const body = await request.json();
  
  // Validate request and quota
  validateUserQuota(body.userId);
  
  return new Response(
    createReadableStream(body),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );
}

// src/lib/llm/streaming.ts
export async function* createReadableStream(request: ArtifactRequest) {
  const orchestrator = new LLMOrchestrator();
  const agent = orchestrator.getAgent(request.type);
  
  try {
    const stream = await orchestrator.generateStream(request);
    
    for await (const chunk of stream) {
      yield `data: ${JSON.stringify(chunk)}\n\n`;
      
      // Persist in database periodically
      await persistStreamChunk(request.artifactId, chunk);
    }
  } catch (error) {
    yield `data: ${JSON.stringify({ error: error.message })}\n\n`;
  }
}
```

#### 2. Frontend Streaming Consumer (React)
```typescript
// hooks/useStreamGeneration.ts
import { useCallback, useState } from 'react';

export function useStreamGeneration() {
  const [tokens, setTokens] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateStream = useCallback(async (request: ArtifactRequest) => {
    setIsStreaming(true);
    setTokens('');
    setError(null);

    try {
      const response = await fetch('/api/artifacts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      
      for (const { done, value } of await reader.read()) {
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              setError(data.error);
            } else if (data.token) {
              setTokens(prev => prev + data.token);
            }
          }
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { tokens, isStreaming, error, generateStream };
}
```

#### 3. Database Persistence During Streaming
```typescript
// src/lib/db/artifacts.ts
export async function persistStreamChunk(
  artifactId: string,
  chunk: StreamChunk
) {
  // Append to artifact content in real-time
  await prisma.artifact.update({
    where: { id: artifactId },
    data: {
      content: {
        increment: chunk.token,
      },
      lastStreamedAt: new Date(),
    },
  });
}
```

## Error Handling During Streaming

```typescript
// Graceful degradation on error
const handler = async () => {
  try {
    // Attempt streaming
    return createReadableStream(request);
  } catch (streamError) {
    // Fallback to batch mode
    console.warn('Streaming failed, falling back to batch', streamError);
    return generateBatch(request);
  }
};
```

## Performance Implications

### Streaming Benefits
- Time to First Token: ~50ms (vs 30s batch)
- User feels app is "alive" and responsive
- Progressive resource utilization
- Better for mobile networks

### Batch Benefits
- Simpler implementation
- No connection management
- Easier testing and debugging
- Better for slow/unreliable connections

### Recommendation
For 50 internal users with reliable network:
- **Primary**: Streaming (better UX)
- **Fallback**: Batch (reliability)
- **Default**: Streaming, auto-fallback on error

## Consequences

### Positive
- ✅ Superior user experience (real-time feedback)
- ✅ Better network utilization
- ✅ Can save partial artifacts if connection drops
- ✅ Matches modern SaaS UX expectations (ChatGPT, Claude)

### Negative
- ⚠️ More complex implementation
- ⚠️ Connection management overhead
- ⚠️ Browser/network failures mid-stream
- ⚠️ Testing more complex

### Mitigation
- Implement robust error handling and fallbacks
- Use comprehensive testing (E2E with mock streams)
- Monitor stream errors in production
- Cache partial results for connection recovery

## Validation

- ✅ Frontend agents can implement streaming consumer
- ✅ Backend agents can implement stream provider
- ✅ JSON events are parseable and typed
- ✅ Fallback path is clear and testable

## Related ADRs
- ADR 001: Modular LLM Controller
- ADR 003: Rate Limiting & Quota Strategy
