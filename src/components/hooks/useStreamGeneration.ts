import { useState, useCallback, useRef } from 'react';

export interface StreamEvent {
  type: 'start' | 'token' | 'complete' | 'error';
  artifactId?: string;
  token?: string;
  tokens?: { input: number; output: number };
  cost?: number;
  message?: string;
}

export interface GenerateRequest {
  projectId: string;
  type: 'content' | 'seo' | 'code';
  model: string;
  input: Record<string, unknown>;
}

export interface StreamState {
  isStreaming: boolean;
  content: string;
  artifactId: string | null;
  error: string | null;
}

interface GenerateOptions {
  endpoint?: string;
}

export function useStreamGeneration() {
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    content: '',
    artifactId: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (request: GenerateRequest | Record<string, unknown>, options?: GenerateOptions) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({ isStreaming: true, content: '', artifactId: null, error: null });

    try {
      const response = await fetch(options?.endpoint ?? '/api/artifacts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        setState((prev) => ({ ...prev, isStreaming: false, error: data.error?.message ?? 'Generation failed' }));
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value, { stream: true }).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const event: StreamEvent = JSON.parse(line.slice(6));

          if (event.type === 'start') {
            setState((prev) => ({ ...prev, artifactId: event.artifactId ?? null }));
          } else if (event.type === 'token') {
            setState((prev) => ({ ...prev, content: prev.content + (event.token ?? '') }));
          } else if (event.type === 'complete') {
            setState((prev) => ({ ...prev, isStreaming: false }));
          } else if (event.type === 'error') {
            setState((prev) => ({ ...prev, isStreaming: false, error: event.message ?? 'Unknown error' }));
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState((prev) => ({ ...prev, isStreaming: false, error: 'Connection error' }));
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  return { ...state, generate, abort };
}
