import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextLandToolContent } from '@/app/tools/nextland/NextLandToolContent';
import { initialSteps } from '@/app/tools/nextland/config';

const pushMock = jest.fn();
const useSearchParamsMock = jest.fn();
const useQueryMock = jest.fn();

const runProcessMock = jest.fn().mockResolvedValue(undefined);
const handleResumeFromArtifactsMock = jest.fn();
const handleRetryExtractionMock = jest.fn();
const handleAutoResumeFromIntentMock = jest.fn();

const useNextLandGenerationMock = jest.fn();
const useNextLandRecoveryMock = jest.fn();
const useNextLandExtractionMock = jest.fn();
const useNextLandUiStateMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => useSearchParamsMock(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

jest.mock('@/components/layout/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div data-testid="page-shell">{children}</div>,
}));

jest.mock('@/app/tools/nextland/components/NextLandSetupCard', () => ({
  NextLandSetupCard: ({ primaryAction, secondaryActions }: { primaryAction: { label: string; onClick?: () => void }; secondaryActions: Array<{ label: string; onClick: () => void }> }) => (
    <div>
      <button onClick={primaryAction.onClick}>{primaryAction.label}</button>
      {secondaryActions.map((action) => (
        <button key={action.label} onClick={action.onClick}>{action.label}</button>
      ))}
    </div>
  ),
}));

jest.mock('@/app/tools/nextland/components/NextLandStatusQuick', () => ({
  NextLandStatusQuick: () => <div data-testid="status-quick" />,
}));

jest.mock('@/app/tools/nextland/components/NextLandStepCards', () => ({
  NextLandStepCards: () => <div data-testid="step-cards" />,
}));

jest.mock('@/app/tools/nextland/hooks/useNextLandGeneration', () => ({
  useNextLandGeneration: (...args: unknown[]) => useNextLandGenerationMock(...args),
}));

jest.mock('@/app/tools/nextland/hooks/useNextLandRecovery', () => ({
  useNextLandRecovery: (...args: unknown[]) => useNextLandRecoveryMock(...args),
}));

jest.mock('@/app/tools/nextland/hooks/useNextLandExtraction', () => ({
  useNextLandExtraction: (...args: unknown[]) => useNextLandExtractionMock(...args),
}));

jest.mock('@/app/tools/nextland/hooks/useNextLandUiState', () => ({
  useNextLandUiState: (...args: unknown[]) => useNextLandUiStateMock(...args),
}));

function createSearchParams(params: Record<string, string>) {
  return {
    get: (key: string) => params[key] ?? null,
  };
}

describe('NextLand page flow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useQueryMock.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === 'projects') {
        return {
          data: {
            projects: [{ id: 'proj_1', name: 'Project A' }],
          },
        };
      }

      return {
        data: {
          models: [{ id: 'openai/gpt-4.1', name: 'GPT-4.1', default: true }],
        },
      };
    });

    useNextLandGenerationMock.mockReturnValue({
      steps: initialSteps,
      running: false,
      replaceSteps: jest.fn(),
      resetSteps: jest.fn(),
      runProcess: runProcessMock,
    });

    useNextLandExtractionMock.mockReturnValue({
      uploadedFileName: 'briefing.txt',
      extractionContext: 'contesto pronto',
      lastUploadedText: 'testo briefing',
      extractionLifecycle: 'completed_full',
      uploadError: null,
      extractionError: null,
      setExtractionContext: jest.fn(),
      setExtractionLifecycle: jest.fn(),
      resetExtractionState: jest.fn(),
      handleFileChange: jest.fn(),
      handleRetryExtraction: handleRetryExtractionMock,
    });

    useNextLandRecoveryMock.mockReturnValue({
      handleResumeFromArtifacts: handleResumeFromArtifactsMock,
      handleAutoResumeFromIntent: handleAutoResumeFromIntentMock,
    });

    useNextLandUiStateMock.mockImplementation((params: {
      intent: 'new' | 'resume' | 'regenerate';
      onRunProcess: () => void;
      onResumeFromArtifacts: () => void;
      onRegenerateNextLand: () => void;
    }) => {
      if (params.intent === 'resume') {
        return {
          isBriefingProcessing: false,
          hasExtractionReady: true,
          hasCheckpointBriefing: true,
          hasProjectSelected: true,
          hasBriefingSource: true,
          hasExtractionError: false,
          canRunGeneration: true,
          primaryAction: {
            label: 'Riprendi dal checkpoint',
            disabled: false,
            onClick: params.onRunProcess,
          },
          secondaryActions: [],
        };
      }

      if (params.intent === 'regenerate') {
        return {
          isBriefingProcessing: false,
          hasExtractionReady: true,
          hasCheckpointBriefing: false,
          hasProjectSelected: true,
          hasBriefingSource: true,
          hasExtractionError: false,
          canRunGeneration: true,
          primaryAction: {
            label: 'Rigenera ora',
            disabled: false,
            onClick: params.onRegenerateNextLand,
          },
          secondaryActions: [],
        };
      }

      return {
        isBriefingProcessing: false,
        hasExtractionReady: true,
        hasCheckpointBriefing: false,
        hasProjectSelected: true,
        hasBriefingSource: true,
        hasExtractionError: false,
        canRunGeneration: true,
        primaryAction: {
          label: 'Avvia generazione NextLand',
          disabled: false,
          onClick: params.onRunProcess,
        },
        secondaryActions: [{
          label: 'Riprendi da checkpoint',
          onClick: params.onResumeFromArtifacts,
        }],
      };
    });
  });

  it('new flow: esegue runProcess e supporta resume action', async () => {
    useSearchParamsMock.mockReturnValue(createSearchParams({ projectId: 'proj_1' }));

    render(<NextLandToolContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Avvia generazione NextLand' }));

    await waitFor(() => {
      expect(runProcessMock).toHaveBeenCalledWith(expect.objectContaining({
        projectId: 'proj_1',
        extractionContext: 'contesto pronto',
      }));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Riprendi da checkpoint' }));
    expect(handleResumeFromArtifactsMock).toHaveBeenCalled();
  });

  it('resume flow: mostra action di ripresa e invoca runProcess', async () => {
    useSearchParamsMock.mockReturnValue(createSearchParams({ projectId: 'proj_1', intent: 'resume' }));

    render(<NextLandToolContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Riprendi dal checkpoint' }));

    await waitFor(() => {
      expect(runProcessMock).toHaveBeenCalled();
    });

    expect(handleAutoResumeFromIntentMock).toHaveBeenCalled();
  });

  it('regenerate flow: invoca runProcess con baseSteps', async () => {
    useSearchParamsMock.mockReturnValue(createSearchParams({
      projectId: 'proj_1',
      intent: 'regenerate',
      sourceArtifactId: 'art_1',
    }));

    render(<NextLandToolContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Rigenera ora' }));

    await waitFor(() => {
      expect(runProcessMock).toHaveBeenCalledWith(expect.objectContaining({
        baseSteps: initialSteps,
      }));
    });
  });
});
