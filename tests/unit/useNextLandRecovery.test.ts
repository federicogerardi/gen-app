import { act, renderHook } from '@testing-library/react';
import { useNextLandRecovery } from '@/app/tools/nextland/hooks/useNextLandRecovery';

afterEach(() => {
  jest.restoreAllMocks();
});

function makeOptions(overrides?: Partial<Parameters<typeof useNextLandRecovery>[0]>) {
  return {
    projectId: 'proj_1',
    setResumeNotice: jest.fn(),
    setRetryNotice: jest.fn(),
    setHasRecoveredCheckpoint: jest.fn(),
    setExtractionContext: jest.fn(),
    setExtractionLifecycle: jest.fn(),
    setPhase: jest.fn(),
    replaceSteps: jest.fn(),
    setIntent: jest.fn(),
    ...overrides,
  };
}

describe('useNextLandRecovery', () => {
  it('segnala errore quando manca projectId', async () => {
    global.fetch = jest.fn();
    const options = makeOptions({ projectId: '' });
    const { result } = renderHook(() => useNextLandRecovery(options));

    await act(async () => {
      await result.current.handleResumeFromArtifacts();
    });

    expect(options.setResumeNotice).toHaveBeenCalledWith('Seleziona prima un progetto per riprendere una generazione.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('recupera extraction e step NextLand e imposta intent resume', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'ext_1',
            type: 'extraction',
            workflowType: 'extraction',
            status: 'completed',
            content: 'Contesto estratto',
            createdAt: '2026-04-18T10:00:00.000Z',
            input: {
              terminalState: { completionOutcome: 'completed_partial' },
            },
          },
          {
            id: 'content_1',
            type: 'content',
            workflowType: 'nextland',
            status: 'completed',
            content: 'Landing contenuto',
            createdAt: '2026-04-18T10:05:00.000Z',
            input: { topic: 'nextland_landing' },
          },
        ],
      }),
    } as unknown as Response);

    const options = makeOptions();
    const { result } = renderHook(() => useNextLandRecovery(options));

    await act(async () => {
      await result.current.handleResumeFromArtifacts();
    });

    expect(options.setExtractionContext).toHaveBeenCalledWith('Contesto estratto');
    expect(options.setExtractionLifecycle).toHaveBeenCalledWith('completed_partial');
    expect(options.replaceSteps).toHaveBeenCalledTimes(1);
    expect(options.setIntent).toHaveBeenCalledWith('resume');
    expect(options.setHasRecoveredCheckpoint).toHaveBeenCalledWith(true);
    expect(options.setResumeNotice).toHaveBeenCalledWith('Checkpoint recuperato. Puoi riprendere dalla fase attuale.');
    expect(options.setPhase).toHaveBeenCalledWith('review');
    expect(options.setPhase).toHaveBeenCalledWith('generating');
  });

  it('passa a intent new quando trova solo step senza extraction', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'content_2',
            type: 'content',
            workflowType: 'nextland',
            status: 'completed',
            content: 'Thank you contenuto',
            createdAt: '2026-04-18T10:06:00.000Z',
            input: { topic: 'nextland_thank_you' },
          },
        ],
      }),
    } as unknown as Response);

    const options = makeOptions();
    const { result } = renderHook(() => useNextLandRecovery(options));

    await act(async () => {
      await result.current.handleResumeFromArtifacts();
    });

    expect(options.setIntent).toHaveBeenCalledWith('new');
    expect(options.setHasRecoveredCheckpoint).toHaveBeenCalledWith(false);
    expect(options.setResumeNotice).toHaveBeenCalledWith(
      'Checkpoint parziale recuperato, ma manca il contesto estratto per riprendere. Carica di nuovo il briefing per rigenerare NextLand.',
    );
  });
});
