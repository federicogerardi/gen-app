/** @jest-environment node */

import { createArtifactStream } from '@/lib/llm/streaming';
import { db } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  db: {
    artifact: { create: jest.fn(), update: jest.fn() },
    llmModel: { findFirst: jest.fn() },
    user: { update: jest.fn() },
    quotaHistory: { create: jest.fn() },
  },
}));

jest.mock('@/lib/llm/orchestrator', () => {
  return {
    LLMOrchestrator: jest.fn().mockImplementation(() => ({
      async *generateStream() {
        for (let i = 0; i < 20; i++) {
          yield { token: 'A' };
        }
      },
      normalizeOutput() {
        return { content: 'Normalized content', format: 'markdown' as const };
      },
    })),
  };
});

const mockedDb = db as unknown as {
  artifact: { create: jest.Mock; update: jest.Mock };
  llmModel: { findFirst: jest.Mock };
  user: { update: jest.Mock };
  quotaHistory: { create: jest.Mock };
};

describe('createArtifactStream SSE contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedDb.artifact.create.mockResolvedValue({ id: 'art_123' });
    mockedDb.artifact.update.mockResolvedValue({});
    mockedDb.llmModel.findFirst.mockResolvedValue(null);
    mockedDb.user.update.mockResolvedValue({});
    mockedDb.quotaHistory.create.mockResolvedValue({});
  });

  it('emits start/token/progress/complete events with additive metadata', async () => {
    const stream = await createArtifactStream({
      userId: 'user_1',
      projectId: 'proj_1',
      type: 'content',
      model: 'openai/gpt-4-turbo',
      workflowType: 'meta_ads',
      input: {
        workflowType: 'meta_ads',
        outputFormat: 'markdown',
      },
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
    }

    const events = full
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => JSON.parse(line.slice(6)));

    const start = events.find((event) => event.type === 'start');
    const tokens = events.filter((event) => event.type === 'token');
    const progress = events.find((event) => event.type === 'progress');
    const complete = events.find((event) => event.type === 'complete');

    expect(start).toEqual(expect.objectContaining({
      artifactId: 'art_123',
      workflowType: 'meta_ads',
      format: 'markdown',
    }));

    expect(tokens).toHaveLength(20);
    expect(tokens[0]).toEqual(expect.objectContaining({
      token: 'A',
      sequence: 1,
      workflowType: 'meta_ads',
      format: 'markdown',
    }));

    expect(progress).toEqual(expect.objectContaining({
      workflowType: 'meta_ads',
      format: 'markdown',
      estimatedTokens: expect.objectContaining({ input: 14, output: expect.any(Number) }),
    }));
    expect(progress?.estimatedTokens.output).toBeGreaterThan(0);

    expect(complete).toEqual(expect.objectContaining({
      artifactId: 'art_123',
      content: 'Normalized content',
      workflowType: 'meta_ads',
      format: 'markdown',
      tokens: expect.objectContaining({ input: 14, output: expect.any(Number) }),
    }));
    expect(complete?.tokens.output).toBe(progress?.estimatedTokens.output);
    expect(typeof complete.cost).toBe('number');
  });
});
