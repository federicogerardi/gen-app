import { TextDecoder, TextEncoder } from 'node:util';
import { act, renderHook } from '@testing-library/react';
import { useNextLandGeneration } from '@/app/tools/nextland/hooks/useNextLandGeneration';

jest.mock('@/tools/shared', () => {
  class RetryableRequestError extends Error {}

  return {
    RetryableRequestError,
    getRetryMeta: jest.fn(() => ({ retryable: false })),
    withRetry: jest.fn(async (action: () => Promise<unknown>) => action()),
  };
});

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

function makeStreamBody(sseLines: string[]) {
  const encoder = new TextEncoder();
  const chunks = sseLines.map((line) => encoder.encode(line));
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

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useNextLandGeneration', () => {
  it('genera landing e thank-you in sequenza', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        body: makeStreamBody([
          'data: {"type":"start","artifactId":"art_landing"}\n\n',
          'data: {"type":"token","token":"Landing content"}\n\n',
        ]),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        body: makeStreamBody([
          'data: {"type":"start","artifactId":"art_thank_you"}\n\n',
          'data: {"type":"token","token":"Thank-you content"}\n\n',
        ]),
      } as unknown as Response);

    const onRetryNoticeChange = jest.fn();
    const { result } = renderHook(() => useNextLandGeneration({ onRetryNoticeChange }));

    await act(async () => {
      await result.current.runProcess({
        projectId: 'proj_1',
        model: 'openai/gpt-4.1',
        tone: 'professional',
        extractionContext: 'briefing',
        notes: 'note',
      });
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);

    const secondBody = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body as string) as { landingOutput?: string };
    expect(secondBody.landingOutput).toBe('Landing content');

    expect(result.current.steps[0]).toMatchObject({
      key: 'landing',
      status: 'done',
      content: 'Landing content',
      artifactId: 'art_landing',
    });
    expect(result.current.steps[1]).toMatchObject({
      key: 'thank_you',
      status: 'done',
      content: 'Thank-you content',
      artifactId: 'art_thank_you',
    });
    expect(result.current.running).toBe(false);
    expect(onRetryNoticeChange).toHaveBeenCalledWith(null);
  });

  it('non chiama API senza projectId o extractionContext', async () => {
    global.fetch = jest.fn();
    const { result } = renderHook(() => useNextLandGeneration({ onRetryNoticeChange: jest.fn() }));

    await act(async () => {
      await result.current.runProcess({
        projectId: '',
        model: 'openai/gpt-4.1',
        tone: 'professional',
        extractionContext: '',
        notes: '',
      });
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.steps.every((step) => step.status === 'idle')).toBe(true);
  });

  it('marca errore sullo step corrente quando la generazione fallisce', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ error: { message: 'Generazione KO' } }),
    } as unknown as Response);

    const { result } = renderHook(() => useNextLandGeneration({ onRetryNoticeChange: jest.fn() }));

    await act(async () => {
      await result.current.runProcess({
        projectId: 'proj_1',
        model: 'openai/gpt-4.1',
        tone: 'professional',
        extractionContext: 'briefing',
        notes: '',
      });
    });

    expect(result.current.steps[0].status).toBe('error');
    expect(result.current.steps[0].error).toBe('Generazione KO');
    expect(result.current.running).toBe(false);
  });
});
