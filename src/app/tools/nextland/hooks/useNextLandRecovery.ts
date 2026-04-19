import { useCallback, useRef } from 'react';
import { initialSteps } from '../config';
import type {
  ExtractionLifecycleState,
  NextLandIntent,
  NextLandStepKey,
  NextLandStepState,
  Phase,
  ResumeCandidateArtifact,
} from '../types';

function parseTerminalOutcome(input: Record<string, unknown> | undefined): string | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const terminalState = input.terminalState as Record<string, unknown> | undefined;
  const outcome = terminalState?.completionOutcome;
  return typeof outcome === 'string' ? outcome : null;
}

function mapOutcomeToLifecycle(outcome: string | null): ExtractionLifecycleState {
  if (outcome === 'completed_partial') {
    return 'completed_partial';
  }

  if (outcome === 'completed_full') {
    return 'completed_full';
  }

  if (outcome === 'failed_hard') {
    return 'failed_hard';
  }

  return 'idle';
}

function parseStepFromArtifactInput(input: Record<string, unknown> | undefined): NextLandStepKey | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const topic = input.topic;
  if (topic === 'nextland_landing') return 'landing';
  if (topic === 'nextland_thank_you') return 'thank_you';
  return null;
}

interface UseNextLandRecoveryOptions {
  projectId: string;
  setResumeNotice: (value: string | null) => void;
  setRetryNotice: (value: string | null) => void;
  setHasRecoveredCheckpoint: (value: boolean) => void;
  setExtractionContext: (value: string | null) => void;
  setExtractionLifecycle: (value: ExtractionLifecycleState) => void;
  setPhase: (value: Phase) => void;
  replaceSteps: (steps: NextLandStepState[]) => void;
  setIntent: (value: NextLandIntent) => void;
}

interface AutoResumeParams {
  intent: NextLandIntent;
  sourceArtifactId: string | null;
  phase: Phase;
  running: boolean;
}

export function useNextLandRecovery(options: UseNextLandRecoveryOptions) {
  const {
    projectId,
    setResumeNotice,
    setRetryNotice,
    setHasRecoveredCheckpoint,
    setExtractionContext,
    setExtractionLifecycle,
    setPhase,
    replaceSteps,
    setIntent,
  } = options;

  const autoResumeAttemptKeyRef = useRef<string | null>(null);

  const handleResumeFromArtifacts = useCallback(async () => {
    if (!projectId) {
      setResumeNotice('Seleziona prima un progetto per riprendere una generazione.');
      return;
    }

    setResumeNotice(null);
    setRetryNotice(null);
    setHasRecoveredCheckpoint(false);

    try {
      const response = await fetch(`/api/artifacts?projectId=${projectId}&limit=100`);
      if (!response.ok) {
        throw new Error('Impossibile recuperare checkpoint artefatti.');
      }

      const payload = (await response.json()) as { items?: ResumeCandidateArtifact[] };
      const items = payload.items ?? [];

      const extractionArtifacts = items.filter((item) => {
        const workflow = item.workflowType ?? (item.input?.workflowType as string | undefined) ?? null;
        return item.type === 'extraction' && workflow === 'extraction' && item.content.trim().length > 0;
      });

      const prioritizedExtraction = extractionArtifacts.find((item) => item.status === 'generating')
        ?? extractionArtifacts.find((item) => parseTerminalOutcome(item.input) === 'completed_partial')
        ?? extractionArtifacts.find((item) => item.status === 'completed')
        ?? null;

      if (prioritizedExtraction) {
        setExtractionContext(prioritizedExtraction.content.trim());
        setExtractionLifecycle(
          prioritizedExtraction.status === 'generating'
            ? 'in_progress'
            : mapOutcomeToLifecycle(parseTerminalOutcome(prioritizedExtraction.input)),
        );
        setPhase('review');
      }

      const nextSteps = [...initialSteps];
      for (const item of items) {
        const workflow = item.workflowType ?? (item.input?.workflowType as string | undefined) ?? null;
        if (item.type !== 'content' || workflow !== 'nextland') {
          continue;
        }

        const stepKey = parseStepFromArtifactInput(item.input);
        if (!stepKey) {
          continue;
        }

        const index = nextSteps.findIndex((step) => step.key === stepKey);
        if (index < 0) {
          continue;
        }

        const existing = nextSteps[index];
        const shouldReplace = !existing.artifactId
          || (existing.status !== 'done' && item.status === 'completed')
          || (existing.status === 'idle' && item.status === 'generating');

        if (!shouldReplace) {
          continue;
        }

        const status: NextLandStepState['status'] = item.status === 'completed'
          ? 'done'
          : item.status === 'generating'
            ? 'running'
            : 'error';

        nextSteps[index] = {
          ...existing,
          status,
          content: item.content,
          artifactId: item.id,
          error: status === 'error' ? 'Step precedente terminato con errore.' : null,
        };
      }

      const hasRecoveredSteps = nextSteps.some((step) => step.artifactId || step.content);
      if (hasRecoveredSteps) {
        replaceSteps(nextSteps);
        setPhase('generating');
      }

      if (!prioritizedExtraction && !hasRecoveredSteps) {
        setHasRecoveredCheckpoint(false);
        setResumeNotice('Nessun checkpoint utile trovato per questo progetto.');
        return;
      }

      if (!prioritizedExtraction && hasRecoveredSteps) {
        setIntent('new');
        setHasRecoveredCheckpoint(false);
        setResumeNotice('Checkpoint parziale recuperato, ma manca il contesto estratto per riprendere. Carica di nuovo il briefing per rigenerare NextLand.');
        return;
      }

      setIntent('resume');
      setHasRecoveredCheckpoint(true);
      setResumeNotice('Checkpoint recuperato. Puoi riprendere dalla fase attuale.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore durante il recupero del checkpoint.';
      setHasRecoveredCheckpoint(false);
      setResumeNotice(message);
    }
  }, [
    projectId,
    replaceSteps,
    setExtractionContext,
    setExtractionLifecycle,
    setHasRecoveredCheckpoint,
    setIntent,
    setPhase,
    setResumeNotice,
    setRetryNotice,
  ]);

  const handleAutoResumeFromIntent = useCallback((params: AutoResumeParams) => {
    const {
      intent,
      sourceArtifactId,
      phase,
      running,
    } = params;

    if (intent !== 'resume' || !sourceArtifactId || !projectId) {
      return;
    }

    if (phase === 'uploading' || phase === 'extracting' || running) {
      return;
    }

    const attemptKey = `${projectId}:${sourceArtifactId}:${intent}`;
    if (autoResumeAttemptKeyRef.current === attemptKey) {
      return;
    }

    autoResumeAttemptKeyRef.current = attemptKey;
    void handleResumeFromArtifacts();
  }, [handleResumeFromArtifacts, projectId]);

  return {
    handleResumeFromArtifacts,
    handleAutoResumeFromIntent,
  };
}