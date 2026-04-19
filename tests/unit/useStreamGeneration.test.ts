import { TextDecoder, TextEncoder } from 'node:util';
import { renderHook, act } from '@testing-library/react';
import { useStreamGeneration } from '@/components/hooks/useStreamGeneration';

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
        if (index < chunks.length) return Promise.resolve({ done: false, value: chunks[index++] });
        return Promise.resolve({ done: true, value: undefined });
      }),
    }),
  };
}
afterEach(() => {
  jest.restoreAllMocks();
});

describe('useStreamGeneration', () => {
  const request = {
    projectId: 'cjld2cyuq0000t3rmniod1foy',
    type: 'content' as const,
    model: 'openai/gpt-4-turbo',
    input: { topic: 'AI' },
  };

  it('starts in idle state', () => {
    const { result } = renderHook(() => useStreamGeneration());

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.content).toBe('');
    expect(result.current.artifactId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets error when fetch returns non-ok and uses error message from response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ error: { message: 'Invalid input' } }),
    } as unknown as Response);

    const { result } = renderHook(() => useStreamGeneration());

    await act(async () => {
      await result.current.generate(request);
    });

    expect(result.current.error).toBe('Invalid input');
    expect(result.current.isStreaming).toBe(false);
  });

  it('falls back to default error message when none in response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);

    const { result } = renderHook(() => useStreamGeneration());

    await act(async () => {
      await result.current.generate(request);
    });

    expect(result.current.error).toBe('Generation failed');
  });

  it('accumulates tokens from SSE stream and finalizes on complete event', async () => {
    const body = makeStreamBody([
      'data: {"type":"start","artifactId":"art_test_1"}\n\n',
      'data: {"type":"token","token":"Hello "}\n\n',
      'data: {"type":"token","token":"world"}\n\n',
      'data: {"type":"complete","content":"## Variante 1\\nHeadline: Hello world"}\n\n',
    ]);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, body } as unknown as Response);

    const { result } = renderHook(() => useStreamGeneration());

    await act(async () => {
      await result.current.generate(request);
    });

    expect(result.current.content).toBe('## Variante 1\nHeadline: Hello world');
    expect(result.current.artifactId).toBe('art_test_1');
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error from SSE error event', async () => {
    const body = makeStreamBody([
      'data: {"type":"error","message":"LLM provider unavailable"}\n\n',
    ]);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, body } as unknown as Response);

    const { result } = renderHook(() => useStreamGeneration());

    await act(async () => {
      await result.current.generate(request);
    });

    expect(result.current.error).toBe('LLM provider unavailable');
    expect(result.current.isStreaming).toBe(false);
  });

  it('sets connection error when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useStreamGeneration());

    await act(async () => {
      await result.current.generate(request);
    });

    expect(result.current.error).toBe('Connection error');
    expect(result.current.isStreaming).toBe(false);
  });

  it('abort() sets isStreaming to false', async () => {
    const { result } = renderHook(() => useStreamGeneration());

    act(() => {
      result.current.abort();
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it('passes custom endpoint to fetch when provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);

    const { result } = renderHook(() => useStreamGeneration());

    await act(async () => {
      await result.current.generate(request, { endpoint: '/api/tools/funnel-pages/generate' });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/tools/funnel-pages/generate',
      expect.any(Object),
    );
  });
});
