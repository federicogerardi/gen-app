import { act, renderHook } from '@testing-library/react';
import { useNextLandExtraction } from '@/app/tools/nextland/hooks/useNextLandExtraction';

jest.mock('@/tools/shared', () => {
  class RetryableRequestError extends Error {}

  return {
    RetryableRequestError,
    getRetryMeta: jest.fn(() => ({ retryable: false })),
    getExtractionErrorMessage: jest.fn((payload: { error?: { message?: string } } | null) => payload?.error?.message ?? 'Estrazione fallita'),
    streamToText: jest.fn(async () => 'contesto estratto'),
    withRetry: jest.fn(async (action: () => Promise<unknown>) => action()),
  };
});

afterEach(() => {
  jest.restoreAllMocks();
});

function makeOptions(overrides?: Partial<Parameters<typeof useNextLandExtraction>[0]>) {
  return {
    projectId: 'proj_1',
    model: 'openai/gpt-4.1',
    tone: 'professional',
    setPhase: jest.fn(),
    setIntent: jest.fn(),
    intent: 'new' as const,
    sourceArtifactId: null,
    setHasRecoveredCheckpoint: jest.fn(),
    resetSteps: jest.fn(),
    setRetryNotice: jest.fn(),
    setResumeNotice: jest.fn(),
    ...overrides,
  };
}

describe('useNextLandExtraction', () => {
  it('rifiuta formato file non supportato', async () => {
    global.fetch = jest.fn();
    const options = makeOptions();
    const { result } = renderHook(() => useNextLandExtraction(options));

    const file = new File(['x'], 'briefing.pdf', { type: 'application/pdf' });
    const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(result.current.uploadError).toContain('Formato non supportato');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('esegue upload + extraction e porta lo stato in review', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: { text: 'briefing testuale' } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        body: {},
      } as unknown as Response);

    const options = makeOptions();
    const { result } = renderHook(() => useNextLandExtraction(options));

    const file = new File(['ciao'], 'briefing.txt', { type: 'text/plain' });
    const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.current.uploadedFileName).toBe('briefing.txt');
    expect(result.current.extractionContext).toBe('contesto estratto');
    expect(result.current.extractionLifecycle).toBe('completed_full');
    expect(options.setPhase).toHaveBeenCalledWith('uploading');
    expect(options.setPhase).toHaveBeenCalledWith('extracting');
    expect(options.setPhase).toHaveBeenCalledWith('review');
  });

  it('mostra errore retry quando manca testo caricato', async () => {
    const options = makeOptions();
    const { result } = renderHook(() => useNextLandExtraction(options));

    await act(async () => {
      await result.current.handleRetryExtraction();
    });

    expect(result.current.extractionError).toBe('Per riprovare l\'estrazione carica prima un documento valido.');
  });
});
