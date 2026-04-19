import { useCallback, useState } from 'react';
import {
  RetryableRequestError,
  getRetryMeta,
  withRetry,
} from '@/tools/shared';
import { TONES, initialSteps } from '../config';
import type {
  ApiErrorPayload,
  NextLandStepKey,
  NextLandStepState,
  StreamResult,
} from '../types';

interface GenerateStreamRequest {
  projectId: string;
  model: string;
  tone: (typeof TONES)[number];
  step: NextLandStepKey;
  extractionContext: string;
  notes?: string;
  landingOutput?: string;
}

interface UseNextLandGenerationOptions {
  onRetryNoticeChange: (message: string | null) => void;
}

async function generateStream(request: GenerateStreamRequest): Promise<StreamResult> {
  const response = await fetch('/api/tools/nextland/generate', {
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
      if (payload.type === 'complete') {
        if (payload.content) content = payload.content as string;
        if (payload.artifactId) artifactId = payload.artifactId as string;
      }
      if (payload.type === 'error') {
        throw new Error((payload.message as string) ?? 'Errore di stream');
      }
    }
  }

  return { content, artifactId };
}

export function useNextLandGeneration({ onRetryNoticeChange }: UseNextLandGenerationOptions) {
  const [steps, setSteps] = useState<NextLandStepState[]>(initialSteps);
  const [running, setRunning] = useState(false);

  const replaceSteps = useCallback((nextSteps: NextLandStepState[]) => {
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
    baseSteps?: NextLandStepState[];
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

    const workingSteps: NextLandStepState[] = (baseSteps ?? steps).map((step) => ({
      ...step,
      error: null,
      status: step.status === 'done' ? 'done' : 'idle',
    }));

    onRetryNoticeChange(null);
    setSteps(workingSteps);
    setRunning(true);

    const updateStep = (key: NextLandStepKey, patch: Partial<NextLandStepState>) => {
      setSteps((prev) => prev.map((step) => (step.key === key ? { ...step, ...patch } : step)));
    };

    let currentStep: NextLandStepKey = 'landing';
    let landingContent = workingSteps.find((step) => step.key === 'landing')?.content ?? '';

    try {
      const landingStep = workingSteps.find((step) => step.key === 'landing');
      if (!(landingStep?.status === 'done' && landingStep.content.trim().length > 0)) {
        updateStep('landing', { status: 'running', error: null });
        currentStep = 'landing';
        const landing = await withRetry(() => generateStream({
          projectId,
          model,
          tone,
          step: 'landing',
          extractionContext,
          notes: notes || undefined,
        }), {
          onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
            onRetryNoticeChange(`Step landing: tentativo ${attempt + 1}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s (${errorMessage}).`);
          },
        });
        landingContent = landing.content;
        updateStep('landing', { status: 'done', content: landing.content, artifactId: landing.artifactId });
      }

      const thankYouStep = workingSteps.find((step) => step.key === 'thank_you');
      if (!(thankYouStep?.status === 'done' && thankYouStep.content.trim().length > 0)) {
        updateStep('thank_you', { status: 'running', error: null });
        currentStep = 'thank_you';
        const thankYou = await withRetry(() => generateStream({
          projectId,
          model,
          tone,
          step: 'thank_you',
          extractionContext,
          notes: notes || undefined,
          landingOutput: landingContent,
        }), {
          onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
            onRetryNoticeChange(`Step thank-you: tentativo ${attempt + 1}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s (${errorMessage}).`);
          },
        });
        updateStep('thank_you', { status: 'done', content: thankYou.content, artifactId: thankYou.artifactId });
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