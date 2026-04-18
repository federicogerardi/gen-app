import { act, renderHook } from '@testing-library/react';
import { useNextLandUiState } from '@/app/tools/nextland/hooks/useNextLandUiState';
import { initialSteps } from '@/app/tools/nextland/config';

function makeParams(overrides?: Partial<Parameters<typeof useNextLandUiState>[0]>) {
  return {
    phase: 'idle' as const,
    running: false,
    intent: 'new' as const,
    sourceArtifactId: null,
    projectId: 'proj_1',
    model: 'openai/gpt-4.1',
    uploadedFileName: 'briefing.txt',
    extractionContext: 'contesto pronto',
    uploadError: null,
    extractionError: null,
    lastUploadedText: 'raw briefing',
    extractionLifecycle: 'completed_full' as const,
    steps: initialSteps,
    hasRecoveredCheckpoint: false,
    onRunProcess: jest.fn(),
    onResumeFromArtifacts: jest.fn(),
    onRetryExtraction: jest.fn(),
    onRegenerateNextLand: jest.fn(),
    onResetAll: jest.fn(),
    onOpenLatestArtifact: jest.fn(),
    onOpenFilePicker: jest.fn(),
    ...overrides,
  };
}

describe('useNextLandUiState', () => {
  it('espone action primaria Avvia generazione in stato draft-ready', () => {
    const params = makeParams({
      steps: initialSteps,
      extractionContext: 'briefing pronto',
    });

    const { result } = renderHook(() => useNextLandUiState(params));

    expect(result.current.canRunGeneration).toBe(true);
    expect(result.current.primaryAction.label).toBe('Avvia generazione NextLand');
    expect(result.current.primaryAction.disabled).toBe(false);
  });

  it('in stato completed apre l ultimo artefatto', () => {
    const onOpenLatestArtifact = jest.fn();
    const { result } = renderHook(() => useNextLandUiState(makeParams({
      steps: [
        { ...initialSteps[0], status: 'done', content: 'landing', artifactId: 'a1' },
        { ...initialSteps[1], status: 'done', content: 'thankyou', artifactId: 'a2' },
      ],
      onOpenLatestArtifact,
    })));

    expect(result.current.primaryAction.label).toBe('Apri ultimo artefatto');
    expect(result.current.primaryAction.disabled).toBe(false);

    act(() => {
      result.current.primaryAction.onClick?.();
    });

    expect(onOpenLatestArtifact).toHaveBeenCalledWith('a2');
  });

  it('mostra azione secondaria riprova estrazione su failed_hard', () => {
    const onRetryExtraction = jest.fn();
    const { result } = renderHook(() => useNextLandUiState(makeParams({
      extractionLifecycle: 'failed_hard',
      onRetryExtraction,
    })));

    const retryAction = result.current.secondaryActions.find((action) => action.label === 'Riprova estrazione');
    expect(retryAction).toBeDefined();

    act(() => {
      retryAction?.onClick();
    });

    expect(onRetryExtraction).toHaveBeenCalled();
  });
});
