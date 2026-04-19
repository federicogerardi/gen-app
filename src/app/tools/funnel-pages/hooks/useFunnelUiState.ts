import type {
  ExtractionLifecycleState,
  FunnelIntent,
  FunnelStepState,
  FunnelUiState,
  Phase,
} from '../types';

interface PrimaryAction {
  label: string;
  disabled: boolean;
  onClick?: () => void;
}

interface SecondaryAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface UseFunnelUiStateParams {
  phase: Phase;
  running: boolean;
  intent: FunnelIntent;
  sourceArtifactId: string | null;
  projectId: string;
  model: string;
  uploadedFileName: string | null;
  extractionContext: string | null;
  uploadError: string | null;
  extractionError: string | null;
  lastUploadedText: string | null;
  extractionLifecycle: ExtractionLifecycleState;
  steps: FunnelStepState[];
  hasRecoveredCheckpoint: boolean;
  onRunProcess: () => void;
  onResumeFromArtifacts: () => void;
  onRetryExtraction: () => void;
  onRegenerateFunnel: () => void;
  onResetAll: () => void;
  onOpenLatestArtifact: (artifactId: string) => void;
  onOpenFilePicker: () => void;
}

export function useFunnelUiState(params: UseFunnelUiStateParams) {
  const {
    phase,
    running,
    intent,
    sourceArtifactId,
    projectId,
    model,
    uploadedFileName,
    extractionContext,
    uploadError,
    extractionError,
    lastUploadedText,
    extractionLifecycle,
    steps,
    hasRecoveredCheckpoint,
    onRunProcess,
    onResumeFromArtifacts,
    onRetryExtraction,
    onRegenerateFunnel,
    onResetAll,
    onOpenLatestArtifact,
    onOpenFilePicker,
  } = params;

  const isBriefingProcessing = phase === 'uploading' || phase === 'extracting';
  const hasExtractionReady = Boolean(extractionContext?.trim());
  const hasCheckpointBriefing = hasExtractionReady && !uploadedFileName;
  const hasProjectSelected = Boolean(projectId);
  const hasBriefingSource = Boolean(uploadedFileName || hasCheckpointBriefing);
  const hasExtractionError = Boolean(uploadError || extractionError);
  const hasCompletedSteps = steps.every((step) => step.status === 'done' && step.content.trim().length > 0);
  const hasRecoveredSteps = steps.some((step) => step.artifactId || step.content.trim().length > 0);
  const hasRecoveryData = hasRecoveredCheckpoint && (hasExtractionReady || hasRecoveredSteps);
  const latestArtifactId = steps.find((step) => step.key === 'vsl' && step.artifactId)?.artifactId
    ?? steps.find((step) => step.key === 'quiz' && step.artifactId)?.artifactId
    ?? steps.find((step) => step.key === 'optin' && step.artifactId)?.artifactId
    ?? null;

  let uiState: FunnelUiState;
  if (running) {
    uiState = 'running';
  } else if (isBriefingProcessing) {
    uiState = 'processing-briefing';
  } else if (hasCompletedSteps) {
    uiState = 'completed';
  } else if (!hasExtractionReady && hasRecoveredSteps && !hasRecoveredCheckpoint) {
    uiState = 'resume-needs-briefing';
  } else if (intent === 'resume' && hasRecoveryData) {
    uiState = 'paused-with-checkpoint';
  } else if (intent === 'regenerate' && Boolean(sourceArtifactId) && hasExtractionReady) {
    uiState = 'prefilled-regenerate';
  } else if (hasExtractionReady) {
    uiState = 'draft-ready';
  } else {
    uiState = 'draft-empty';
  }

  const canRunGeneration = Boolean(projectId && model && hasExtractionReady);
  const canResumeCheckpoint = Boolean(projectId && !running && !isBriefingProcessing);
  const canRetryExtraction = Boolean(projectId && model && lastUploadedText && !running && !isBriefingProcessing);

  const primaryAction: PrimaryAction = (() => {
    if (uiState === 'processing-briefing') {
      return {
        label: phase === 'uploading' ? 'Caricamento in corso...' : 'Estrazione in corso...',
        disabled: true,
      };
    }

    if (uiState === 'running') {
      return {
        label: 'Generazione in corso...',
        disabled: true,
      };
    }

    if (uiState === 'paused-with-checkpoint') {
      return {
        label: 'Riprendi dal checkpoint',
        disabled: !canRunGeneration,
        onClick: onRunProcess,
      };
    }

    if (uiState === 'resume-needs-briefing') {
      return {
        label: 'Carica nuovo briefing',
        disabled: !projectId,
        onClick: onOpenFilePicker,
      };
    }

    if (uiState === 'prefilled-regenerate') {
      return {
        label: 'Rigenera ora',
        disabled: !canRunGeneration,
        onClick: onRegenerateFunnel,
      };
    }

    if (uiState === 'draft-ready') {
      return {
        label: 'Avvia generazione funnel',
        disabled: !canRunGeneration,
        onClick: onRunProcess,
      };
    }

    if (uiState === 'completed' && latestArtifactId) {
      return {
        label: 'Apri ultimo artefatto',
        disabled: false,
        onClick: () => onOpenLatestArtifact(latestArtifactId),
      };
    }

    return {
      label: 'Completa dati obbligatori',
      disabled: true,
    };
  })();

  const secondaryActions: SecondaryAction[] = [];

  if ((uiState === 'draft-empty' || uiState === 'resume-needs-briefing') && canResumeCheckpoint) {
    secondaryActions.push({
      label: 'Riprendi da checkpoint',
      onClick: onResumeFromArtifacts,
    });
  }

  if ((uiState === 'draft-empty' || uiState === 'draft-ready') && canRetryExtraction && extractionLifecycle === 'failed_hard') {
    secondaryActions.push({
      label: 'Riprova estrazione',
      onClick: onRetryExtraction,
    });
  }

  if (uiState === 'paused-with-checkpoint' && hasExtractionReady) {
    secondaryActions.push({
      label: 'Rigenera da zero',
      onClick: onRegenerateFunnel,
    });
  }

  if (uiState === 'completed' && hasExtractionReady) {
    secondaryActions.push({
      label: 'Rigenera funnel',
      onClick: onRegenerateFunnel,
    });
  }

  if (uiState !== 'processing-briefing' && uiState !== 'running' && (uiState !== 'draft-empty' || Boolean(projectId || uploadedFileName || extractionContext))) {
    secondaryActions.push({
      label: uiState === 'completed' ? 'Nuova generazione' : 'Resetta setup',
      onClick: onResetAll,
    });
  }

  return {
    isBriefingProcessing,
    hasExtractionReady,
    hasCheckpointBriefing,
    hasProjectSelected,
    hasBriefingSource,
    hasExtractionError,
    canRunGeneration,
    primaryAction,
    secondaryActions,
  };
}
