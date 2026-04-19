import { useCallback, useState } from 'react';
import {
  RetryableRequestError,
  getRetryMeta,
  withRetry,
} from '@/tools/shared';
import { TONES, initialSteps } from '../config';
import type {
  ApiErrorPayload,
  FunnelStepKey,
  FunnelStepState,
  StreamResult,
} from '../types';

interface GenerateStreamRequest {
  projectId: string;
  model: string;
  tone: (typeof TONES)[number];
  step: FunnelStepKey;
  extractionContext: string;
  notes?: string;
  optinOutput?: string;
  quizOutput?: string;
}

interface UseFunnelGenerationOptions {
  onRetryNoticeChange: (message: string | null) => void;
}

async function generateStream(request: GenerateStreamRequest): Promise<StreamResult> {
  const response = await fetch('/api/tools/funnel-pages/generate', {
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
  if (!reader) {
    throw new Error('Stream non disponibile');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let artifactId: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';

    for (const line of parts) {
      if (!line.startsWith('data: ')) {
        continue;
      }

      const payload = JSON.parse(line.slice(6)) as Record<string, unknown>;
      if (payload.type === 'start') {
        artifactId = (payload.artifactId as string) ?? artifactId;
      }
      if (payload.type === 'token') {
        content += (payload.token as string) ?? '';
      }
      if (payload.type === 'error') {
        throw new Error((payload.message as string) ?? 'Errore di stream');
      }
    }
  }

  return { content, artifactId };
}

export function useFunnelGeneration({ onRetryNoticeChange }: UseFunnelGenerationOptions) {
  const [steps, setSteps] = useState<FunnelStepState[]>(initialSteps);
  const [running, setRunning] = useState(false);

  const replaceSteps = useCallback((nextSteps: FunnelStepState[]) => {
    setSteps(nextSteps);
  }, []);

  const resetSteps = useCallback(() => {
    setSteps(initialSteps);
    setRunning(false);
  }, []);

  const runProcess = useCallback(async (params: {
    projectId: string;
    model: string;
    tone: (typeof TONES)[number];
    extractionContext: string;
    notes: string;
    baseSteps?: FunnelStepState[];
  }) => {
    const {
      projectId,
      model,
      tone,
      extractionContext,
      notes,
      baseSteps,
    } = params;

    if (!projectId || !extractionContext) {
      return;
    }

    const workingSteps: FunnelStepState[] = (baseSteps ?? steps).map((step) => ({
      ...step,
      error: null,
      status: step.status === 'done' ? 'done' : 'idle',
    }));

    onRetryNoticeChange(null);
    setSteps(workingSteps);
    setRunning(true);

    const updateStep = (key: FunnelStepKey, patch: Partial<FunnelStepState>) => {
      setSteps((prev) => prev.map((step) => (step.key === key ? { ...step, ...patch } : step)));
    };

    let currentStep: FunnelStepKey = 'optin';
    let optinContent = workingSteps.find((step) => step.key === 'optin')?.content ?? '';
    let quizContent = workingSteps.find((step) => step.key === 'quiz')?.content ?? '';

    try {
      const optinStep = workingSteps.find((step) => step.key === 'optin');
      if (!(optinStep?.status === 'done' && optinStep.content.trim().length > 0)) {
        updateStep('optin', { status: 'running', error: null });
        currentStep = 'optin';
        const optin = await withRetry(() => generateStream({
          projectId,
          model,
          tone,
          step: 'optin',
          extractionContext,
          notes: notes || undefined,
        }), {
          onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
            onRetryNoticeChange(`Step optin: tentativo ${attempt + 1}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s (${errorMessage}).`);
          },
        });
        optinContent = optin.content;
        updateStep('optin', { status: 'done', content: optin.content, artifactId: optin.artifactId });
      }

      const quizStep = workingSteps.find((step) => step.key === 'quiz');
      if (!(quizStep?.status === 'done' && quizStep.content.trim().length > 0)) {
        updateStep('quiz', { status: 'running', error: null });
        currentStep = 'quiz';
        const quiz = await withRetry(() => generateStream({
          projectId,
          model,
          tone,
          step: 'quiz',
          extractionContext,
          notes: notes || undefined,
          optinOutput: optinContent,
        }), {
          onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
            onRetryNoticeChange(`Step quiz: tentativo ${attempt + 1}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s (${errorMessage}).`);
          },
        });
        quizContent = quiz.content;
        updateStep('quiz', { status: 'done', content: quiz.content, artifactId: quiz.artifactId });
      }

      const vslStep = workingSteps.find((step) => step.key === 'vsl');
      if (!(vslStep?.status === 'done' && vslStep.content.trim().length > 0)) {
        updateStep('vsl', { status: 'running', error: null });
        currentStep = 'vsl';
        const vsl = await withRetry(() => generateStream({
          projectId,
          model,
          tone,
          step: 'vsl',
          extractionContext,
          notes: notes || undefined,
          optinOutput: optinContent,
          quizOutput: quizContent,
        }), {
          onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
            onRetryNoticeChange(`Step vsl: tentativo ${attempt + 1}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s (${errorMessage}).`);
          },
        });
        updateStep('vsl', { status: 'done', content: vsl.content, artifactId: vsl.artifactId });
      }

      onRetryNoticeChange(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore inatteso';
      updateStep(currentStep, { status: 'error', error: message });
      onRetryNoticeChange(null);
    } finally {
      setRunning(false);
    }
  }, [onRetryNoticeChange, steps]);

  return {
    steps,
    running,
    replaceSteps,
    resetSteps,
    runProcess,
  };
}
