import { act, renderHook } from '@testing-library/react';
import { useExtraction } from '@/tools/shared/hooks/useExtraction';

jest.mock('@/tools/shared/lib/retryLogic', () => ({
  RetryableRequestError: class RetryableRequestError extends Error {},
  getRetryMeta: jest.fn(() => ({ retryable: false })),
  withRetry: jest.fn(async (action: () => Promise<unknown>) => action()),
}));

jest.mock('@/tools/shared/lib/streamHelpers', () => ({
  streamToText: jest.fn(async () => 'contesto shared estratto'),
  getExtractionErrorMessage: jest.fn((payload: { error?: { message?: string } } | null) => payload?.error?.message ?? 'Estrazione fallita'),
}));

function makeConfig(overrides?: Partial<Parameters<typeof useExtraction>[0]>) {
  return {
    projectId: 'proj_1',
    model: 'openai/gpt-4.1',
    tone: 'professional',
    fieldMap: { target: 'target' },
    extractionEndpoint: '/api/tools/test/extract',
    uploadEndpoint: '/api/tools/test/upload',
    ...overrides,
  };
}

describe('useExtraction', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rifiuta file non supportato', async () => {
    global.fetch = jest.fn();
    const { result } = renderHook(() => useExtraction(makeConfig()));

    const file = new File(['raw'], 'briefing.pdf', { type: 'application/pdf' });

    await act(async () => {
      await result.current.handleFileChange(file);
    });

    expect(result.current.uploadError).toContain('Formato non supportato');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('esegue upload + extraction e aggiorna stato', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: { text: 'briefing testo' } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        body: {},
      } as unknown as Response);

    const { result } = renderHook(() => useExtraction(makeConfig()));
    const file = new File(['briefing testo'], 'briefing.txt', { type: 'text/plain' });

    await act(async () => {
      await result.current.handleFileChange(file);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.current.uploadedFileName).toBe('briefing.txt');
    expect(result.current.lastUploadedText).toBe('briefing testo');
    expect(result.current.extractionContext).toBe('contesto shared estratto');
    expect(result.current.extractionLifecycle).toBe('completed_full');
  });

  it('handleRetryExtraction segnala errore se manca testo precedente', async () => {
    const { result } = renderHook(() => useExtraction(makeConfig()));

    await act(async () => {
      await result.current.handleRetryExtraction();
    });

    expect(result.current.extractionError).toBe('Per riprovare l\'estrazione carica prima un documento valido.');
    expect(result.current.extractionLifecycle).toBe('idle');
  });
});
