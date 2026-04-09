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
});
