/** @jest-environment node */

import { TextDecoder } from 'node:util';
import { db } from '@/lib/db';
import { createArtifactStream } from '@/lib/llm/streaming';

let mockGenerateStream: jest.Mock;

jest.mock('@/lib/db', () => ({
  db: {
    artifact: {
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    quotaHistory: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/llm/orchestrator', () => ({
  LLMOrchestrator: jest.fn().mockImplementation(() => ({
    generateStream: (...args: unknown[]) => mockGenerateStream(...args),
    normalizeOutput: ({ rawContent }: { rawContent: string }) => ({
      content: rawContent,
      format: 'plain' as const,
    }),
  })),
}));

const createArtifact = db.artifact.create as jest.Mock;
const updateArtifact = db.artifact.update as jest.Mock;
const updateUser = db.user.update as jest.Mock;
const createQuotaHistory = db.quotaHistory.create as jest.Mock;

async function readAllSse(stream: ReadableStream): Promise<string[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const lines: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    lines.push(...chunk.split('\n').filter((l) => l.startsWith('data: ')));
  }

  return lines;
}

function makeTokenStream(tokens: string[]) {
  return (async function* () {
    for (const token of tokens) {
      yield { token };
    }
  })();
}

describe('createArtifactStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateStream = jest.fn();
    createArtifact.mockResolvedValue({ id: 'art_1' });
    updateArtifact.mockResolvedValue({});
    updateUser.mockResolvedValue({});
    createQuotaHistory.mockResolvedValue({});
  });

  it('streams start/token/complete events and persists success metadata', async () => {
    mockGenerateStream.mockReturnValue(makeTokenStream(['Hello', ' ', 'world']));

    const stream = await createArtifactStream({
      userId: 'user_1',
      projectId: 'proj_1',
      type: 'content',
      model: 'openai/gpt-4-turbo',
      input: { topic: 'AI' },
    });

    const lines = await readAllSse(stream);

    expect(lines.some((l) => l.includes('"type":"start"'))).toBe(true);
    expect(lines.some((l) => l.includes('"type":"token"'))).toBe(true);
    expect(lines.some((l) => l.includes('"type":"complete"'))).toBe(true);

    expect(updateArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }),
    );
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user_1' } }),
    );
    expect(createQuotaHistory).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'success' }) }),
    );
  });

  it('marks artifact failed and emits error event when generation throws', async () => {
    mockGenerateStream.mockImplementation(() => {
      throw new Error('Provider down');
    });

    const stream = await createArtifactStream({
      userId: 'user_1',
      projectId: 'proj_1',
      type: 'content',
      model: 'openai/gpt-4-turbo',
      input: { topic: 'AI' },
    });

    const lines = await readAllSse(stream);

    expect(lines.some((l) => l.includes('"type":"error"'))).toBe(true);
    expect(lines.some((l) => l.includes('Provider down'))).toBe(true);
    expect(updateArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
    );
    expect(createQuotaHistory).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'error' }) }),
    );
  });

  it('derives inputTokens from serialized input, not from accumulated output', async () => {
    // Input serializes to '{"topic":"AI"}' = 14 chars → ceil(14/4) = 4 tokens.
    // Output is deliberately >> 4 tokens to ensure inputTokens does not track output length.
    const testInput = { topic: 'AI' };
    const longOutput = Array.from({ length: 60 }, (_, i) => `word${i}`);
    mockGenerateStream.mockReturnValue(makeTokenStream(longOutput));

    const stream = await createArtifactStream({
      userId: 'user_1',
      projectId: 'proj_1',
      type: 'content',
      model: 'openai/gpt-4-turbo',
      input: testInput,
    });

    const lines = await readAllSse(stream);
    const completeLine = lines.find((l) => l.includes('"type":"complete"'))!;
    const completeEvent = JSON.parse(completeLine.replace('data: ', ''));

    const expectedInputTokens = Math.ceil(JSON.stringify(testInput).length / 4);
    expect(completeEvent.tokens.input).toBe(expectedInputTokens);
    // inputTokens must not have grown with the output
    expect(completeEvent.tokens.input).toBeLessThan(completeEvent.tokens.output);
  });

  it('derives inputTokens from promptOverride when provided', async () => {
    const override = 'You are a helpful assistant. Write about AI.';
    mockGenerateStream.mockReturnValue(makeTokenStream(['Hello', ' world']));

    const stream = await createArtifactStream({
      userId: 'user_1',
      projectId: 'proj_1',
      type: 'content',
      model: 'openai/gpt-4-turbo',
      input: { topic: 'AI' },
      promptOverride: override,
    });

    const lines = await readAllSse(stream);
    const completeLine = lines.find((l) => l.includes('"type":"complete"'))!;
    const completeEvent = JSON.parse(completeLine.replace('data: ', ''));

    const expectedInputTokens = Math.ceil(override.length / 4);
    expect(completeEvent.tokens.input).toBe(expectedInputTokens);
  });

  it('persists partial content every 20 tokens', async () => {
    const twentyTokens = Array.from({ length: 20 }, (_, i) => `t${i}`);
    mockGenerateStream.mockReturnValue(makeTokenStream(twentyTokens));

    const stream = await createArtifactStream({
      userId: 'user_1',
      projectId: 'proj_1',
      type: 'content',
      model: 'openai/gpt-4-turbo',
      input: { topic: 'AI', workflowType: 'meta_ads' },
    });

    await readAllSse(stream);

    expect(updateArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ streamedAt: expect.any(Date) }) }),
    );
  });

  it('clamps outputTokens to 1 when stream yields no tokens (zero-output invariant)', async () => {
    // Generator yields nothing → outputTokenCount = 0 → guard must clamp to 1
    mockGenerateStream.mockReturnValue(makeTokenStream([]));

    const stream = await createArtifactStream({
      userId: 'user_1',
      projectId: 'proj_1',
      type: 'content',
      model: 'openai/gpt-4-turbo',
      input: { topic: 'AI' },
    });

    await readAllSse(stream);

    const completedCall = (updateArtifact as jest.Mock).mock.calls.find(
      (args) => args[0]?.data?.status === 'completed',
    );
    expect(completedCall).toBeDefined();
    expect(completedCall[0].data.outputTokens).toBeGreaterThanOrEqual(1);
    expect(completedCall[0].data.inputTokens).toBeGreaterThanOrEqual(1);
  });
});
