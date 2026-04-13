import { useState, useCallback, useRef } from 'react';

export interface StreamEvent {
  type: 'start' | 'token' | 'progress' | 'complete' | 'error';
  artifactId?: string;
  content?: string;
  token?: string;
  sequence?: number;
  workflowType?: string | null;
  format?: 'plain' | 'json' | 'markdown';
  tokens?: { input: number; output: number };
  estimatedTokens?: { input: number; output: number };
  costEstimate?: number;
  cost?: number;
  code?: string;
  message?: string;
}

export interface GenerateRequest {
  projectId: string;
  type: 'content' | 'seo' | 'code' | 'extraction';
  model: string;
  input: Record<string, unknown>;
}

export interface StreamState {
  isStreaming: boolean;
  content: string;
  artifactId: string | null;
  error: string | null;
  workflowType: string | null;
  format: 'plain' | 'json' | 'markdown' | null;
  sequence: number;
  estimatedCost: number | null;
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
    workflowType: null,
    format: null,
    sequence: 0,
    estimatedCost: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (request: GenerateRequest | Record<string, unknown>, options?: GenerateOptions) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({
      isStreaming: true,
      content: '',
      artifactId: null,
      error: null,
      workflowType: null,
      format: null,
      sequence: 0,
      estimatedCost: null,
    });

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
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const event: StreamEvent = JSON.parse(line.slice(6));

          if (event.type === 'start') {
            setState((prev) => ({
              ...prev,
              artifactId: event.artifactId ?? null,
              workflowType: event.workflowType ?? prev.workflowType,
              format: event.format ?? prev.format,
            }));
          } else if (event.type === 'token') {
            setState((prev) => ({
              ...prev,
              content: prev.content + (event.token ?? ''),
              sequence: event.sequence ?? prev.sequence,
              workflowType: event.workflowType ?? prev.workflowType,
              format: event.format ?? prev.format,
            }));
          } else if (event.type === 'progress') {
            setState((prev) => ({
              ...prev,
              estimatedCost: typeof event.costEstimate === 'number' ? event.costEstimate : prev.estimatedCost,
              workflowType: event.workflowType ?? prev.workflowType,
              format: event.format ?? prev.format,
            }));
          } else if (event.type === 'complete') {
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              artifactId: event.artifactId ?? prev.artifactId,
              content: typeof event.content === 'string' ? event.content : prev.content,
              workflowType: event.workflowType ?? prev.workflowType,
              format: event.format ?? prev.format,
              estimatedCost: typeof event.cost === 'number' ? event.cost : prev.estimatedCost,
            }));
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
