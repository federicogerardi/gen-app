import { useState, useCallback } from 'react';
import type { ToolStepState, StreamResult, ApiErrorPayload } from '../types/tool.types';
import { withRetry, RetryableRequestError, getRetryMeta } from '../lib/retryLogic';

export interface GenerateStreamRequest {
  projectId: string;
  model: string;
  tone: string;
  step: string;
  extractionContext: string;
  notes?: string;
  [key: string]: unknown;
}

export interface UseStepGenerationConfig {
  generateEndpoint: string;
}

export function useStepGeneration(config: UseStepGenerationConfig) {
  const [steps, setSteps] = useState<ToolStepState[]>([]);
  const [running, setRunning] = useState(false);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);

  const updateStep = useCallback((key: string, patch: Partial<ToolStepState>) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.key === key ? { ...step, ...patch } : step,
      ),
    );
  }, []);

  const generateStream = useCallback(
    async (request: GenerateStreamRequest): Promise<StreamResult> => {
      const response = await fetch(config.generateEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as ApiErrorPayload | null;
        const retryMeta = getRetryMeta(response.status, data);
        const message = data?.error?.message ?? 'Generazione fallita';
        if (retryMeta.retryable) {
          throw new RetryableRequestError(message);
        }

        throw new Error(message);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream non disponibile');

      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';
      let artifactId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() ?? '';

        for (const line of parts) {
          if (!line.startsWith('data: ')) continue;
          const payload = JSON.parse(line.slice(6)) as Record<string, unknown>;
          if (payload.type === 'start')
            artifactId = (payload.artifactId as string) ?? artifactId;
          if (payload.type === 'token') content += (payload.token as string) ?? '';
          if (payload.type === 'complete') {
            if (payload.content) content = payload.content as string;
            if (payload.artifactId) artifactId = payload.artifactId as string;
          }
          if (payload.type === 'error')
            throw new Error((payload.message as string) ?? 'Errore di stream');
        }
      }

      return { content, artifactId };
    },
    [config],
  );

  const generateStepWithRetry = useCallback(
    async (
      request: GenerateStreamRequest,
      stepKey: string,
      onRetry?: (msg: string) => void,
    ): Promise<StreamResult> => {
      return withRetry(
        () => generateStream(request),
        {
          onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
            const notice = `Step ${stepKey}: tentativo ${attempt + 1}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s (${errorMessage}).`;
            setRetryNotice(notice);
            onRetry?.(notice);
          },
        },
      );
    },
    [generateStream],
  );

  const reset = useCallback(() => {
    setSteps([]);
    setRunning(false);
    setRetryNotice(null);
  }, []);

  return {
    steps,
    running,
    retryNotice,
    setRunning,
    updateStep,
    generateStepWithRetry,
    setRetryNotice,
    reset,
  };
}
