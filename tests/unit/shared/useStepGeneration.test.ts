import { TextDecoder, TextEncoder } from 'node:util';
import { act, renderHook } from '@testing-library/react';
import { useStepGeneration } from '@/tools/shared/hooks/useStepGeneration';

jest.mock('@/tools/shared/lib/retryLogic', () => ({
  RetryableRequestError: class RetryableRequestError extends Error {},
  getRetryMeta: jest.fn(() => ({ retryable: false })),
  withRetry: jest.fn(async (action: () => Promise<unknown>, options?: { onRetry?: (attempt: number, maxAttempts: number, delayMs: number, errorMessage: string) => void }) => {
    options?.onRetry?.(1, 3, 1000, 'retry');
    return action();
  }),
}));

beforeAll(() => {
  Object.defineProperty(globalThis, 'TextEncoder', {
    value: TextEncoder,
    writable: true,
  });
  Object.defineProperty(globalThis, 'TextDecoder', {
    value: TextDecoder,
    writable: true,
  });
});

function makeStreamBody(lines: string[]) {
  const encoder = new TextEncoder();
  const chunks = lines.map((line) => encoder.encode(line));
  let index = 0;

  return {
    getReader: () => ({
      read: jest.fn().mockImplementation(() => {
        if (index < chunks.length) {
          return Promise.resolve({ done: false, value: chunks[index++] });
        }
        return Promise.resolve({ done: true, value: undefined });
      }),
    }),
  };
}

describe('useStepGeneration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('genera stream e ritorna contenuto + artifactId', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: makeStreamBody([
        'data: {"type":"start","artifactId":"art_1"}\n\n',
        'data: {"type":"token","token":"ciao "}\n\n',
        'data: {"type":"token","token":"mondo"}\n\n',
      ]),
    } as unknown as Response);

    const { result } = renderHook(() => useStepGeneration({ generateEndpoint: '/api/tools/test/generate' }));

    let output: { content: string; artifactId: string | null } | null = null;

    await act(async () => {
      output = await result.current.generateStepWithRetry({
        projectId: 'proj_1',
        model: 'openai/gpt-4.1',
        tone: 'professional',
        step: 'landing',
        extractionContext: 'contesto',
      }, 'landing');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/tools/test/generate', expect.objectContaining({ method: 'POST' }));
    expect(output).toEqual({ content: 'ciao mondo', artifactId: 'art_1' });
    expect(result.current.retryNotice).toContain('Step landing: tentativo 2/3');
  });

    it('gestisce replay stream (start+complete senza token) usando complete.content', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: makeStreamBody([
          'data: {"type":"start","artifactId":"art_replay"}\n\n',
          'data: {"type":"complete","content":"contenuto normalizzato","artifactId":"art_replay"}\n\n',
        ]),
      } as unknown as Response);

      const { result } = renderHook(() => useStepGeneration({ generateEndpoint: '/api/tools/test/generate' }));

      let output: { content: string; artifactId: string | null } | null = null;

      await act(async () => {
        output = await result.current.generateStepWithRetry({
          projectId: 'proj_1',
          model: 'openai/gpt-4.1',
          tone: 'professional',
          step: 'landing',
          extractionContext: 'contesto',
        }, 'landing');
      });

      expect(output).toEqual({ content: 'contenuto normalizzato', artifactId: 'art_replay' });
    });

    it('complete.content sovrascrive i token accumulati (server normalizes output)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: makeStreamBody([
          'data: {"type":"start","artifactId":"art_norm"}\n\n',
          'data: {"type":"token","token":"raw "}\n\n',
          'data: {"type":"token","token":"token"}\n\n',
          'data: {"type":"complete","content":"contenuto finale normalizzato","artifactId":"art_norm"}\n\n',
        ]),
      } as unknown as Response);

      const { result } = renderHook(() => useStepGeneration({ generateEndpoint: '/api/tools/test/generate' }));

      let output: { content: string; artifactId: string | null } | null = null;

      await act(async () => {
        output = await result.current.generateStepWithRetry({
          projectId: 'proj_1',
          model: 'openai/gpt-4.1',
          tone: 'professional',
          step: 'landing',
          extractionContext: 'contesto',
        }, 'landing');
      });

      expect(output).toEqual({ content: 'contenuto finale normalizzato', artifactId: 'art_norm' });
    });

  it('updateStep aggiorna lo step target e reset pulisce stato', () => {
    const { result } = renderHook(() => useStepGeneration({ generateEndpoint: '/api/tools/test/generate' }));

    act(() => {
      result.current.updateStep('landing', { status: 'done' });
    });

    // Nessun passo iniziale: update non deve causare errori.
    expect(result.current.steps).toEqual([]);

    act(() => {
      result.current.setRunning(true);
      result.current.setRetryNotice('notice');
      result.current.reset();
    });

    expect(result.current.running).toBe(false);
    expect(result.current.retryNotice).toBeNull();
    expect(result.current.steps).toEqual([]);
  });
});
