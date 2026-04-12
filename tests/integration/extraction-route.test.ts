/** @jest-environment node */

import { POST } from '@/app/api/tools/extraction/generate/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { createArtifactStream } from '@/lib/llm/streaming';
import { buildExtractionPrompt } from '@/lib/tool-prompts/extraction';
import {
  EXTRACTION_FALLBACK_MODELS,
  EXTRACTION_PRIMARY_MODEL,
} from '@/lib/llm/extraction-model-policy';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn() }));
jest.mock('@/lib/llm/streaming', () => ({ createArtifactStream: jest.fn() }));
jest.mock('@/lib/tool-prompts/extraction', () => ({ buildExtractionPrompt: jest.fn() }));

jest.mock('@/lib/db', () => jest.requireActual('./db-mock').createDbMock());

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockedStream = createArtifactStream as jest.MockedFunction<typeof createArtifactStream>;
const mockedBuildExtractionPrompt = buildExtractionPrompt as jest.MockedFunction<typeof buildExtractionPrompt>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findUser = (db as any).user.findUnique as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findProject = (db as any).project.findUnique as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findActiveModel = (db as any).llmModel.findFirst as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateUser = (db as any).user.update as jest.Mock;

const projectId = 'cjld2cyuq0000t3rmniod1foy';
const baseBody = {
  projectId,
  model: 'openai/gpt-4-turbo',
  tone: 'professional',
  rawContent: 'Azienda B2B, target founder PMI, obiettivo lead qualificati.',
  fieldMap: {
    business_type: {
      type: 'select',
      required: true,
      description: 'Tipo business',
    },
  },
};

const makeRequest = (payload: unknown) =>
  new Request('http://localhost/api/tools/extraction/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

function createSseStream(events: Array<Record<string, unknown>>): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.close();
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 10 });
  mockedStream.mockResolvedValue(createSseStream([
    { type: 'start', artifactId: 'art_1', workflowType: 'extraction', format: 'json' },
    {
      type: 'token',
      token: '{"fields":{"business_type":"B2B"},"missingFields":[],"notes":"ok"}',
      sequence: 1,
    },
    {
      type: 'complete',
      artifactId: 'art_1',
      content: '{"fields":{"business_type":"B2B"},"missingFields":[],"notes":"ok"}',
      cost: 0.01,
    },
  ]));
  mockedBuildExtractionPrompt.mockResolvedValue('EXTRACTION PROMPT');
  findActiveModel.mockImplementation(async ({ where }: { where?: { modelId?: string } }) => {
    const modelId = where?.modelId;
    const allowedModels = [
      'openai/gpt-4-turbo',
      EXTRACTION_PRIMARY_MODEL,
      ...EXTRACTION_FALLBACK_MODELS,
    ];

    return modelId && allowedModels.includes(modelId)
      ? { id: `model_${modelId}` }
      : null;
  });
  findUser.mockResolvedValue({ id: 'user_1', monthlyUsed: 1, monthlyQuota: 100, monthlySpent: '1', monthlyBudget: '10' });
  findProject.mockResolvedValue({ id: projectId, userId: 'user_1' });
});

describe('POST /api/tools/extraction/generate', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(makeRequest(baseBody));
    expect(res.status).toBe(401);
  });

  it('returns 400 when fieldMap is empty', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const res = await POST(makeRequest({ ...baseBody, fieldMap: {} }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when project missing', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue(null);
    const res = await POST(makeRequest(baseBody));
    expect(res.status).toBe(404);
  });

  it('routes extraction prompt builder and stream', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const res = await POST(makeRequest(baseBody));

    expect(res.status).toBe(200);
    expect(mockedBuildExtractionPrompt).toHaveBeenCalled();
    expect(mockedStream).toHaveBeenCalledWith(expect.objectContaining({
      workflowType: 'extraction',
      type: 'extraction',
      model: EXTRACTION_PRIMARY_MODEL,
    }));
  });

  it('falls back to second model when first attempt returns invalid JSON', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    mockedStream
      .mockResolvedValueOnce(createSseStream([
        { type: 'start', artifactId: 'art_1', workflowType: 'extraction', format: 'json' },
        { type: 'token', token: 'not-json', sequence: 1 },
        { type: 'complete', artifactId: 'art_1', content: 'not-json', cost: 0.01 },
      ]))
      .mockResolvedValueOnce(createSseStream([
        { type: 'start', artifactId: 'art_2', workflowType: 'extraction', format: 'json' },
        {
          type: 'token',
          token: '{"fields":{"business_type":"B2B"},"missingFields":[],"notes":"ok"}',
          sequence: 1,
        },
        {
          type: 'complete',
          artifactId: 'art_2',
          content: '{"fields":{"business_type":"B2B"},"missingFields":[],"notes":"ok"}',
          cost: 0.02,
        },
      ]));

    const res = await POST(makeRequest(baseBody));

    expect(res.status).toBe(200);
    expect(mockedStream).toHaveBeenCalledTimes(2);
    expect(mockedStream).toHaveBeenNthCalledWith(1, expect.objectContaining({ model: EXTRACTION_PRIMARY_MODEL }));
    expect(mockedStream).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: EXTRACTION_FALLBACK_MODELS[0] }));
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ monthlyUsed: expect.objectContaining({ increment: 1 }) }),
    }));
  });

  it('returns EXTRACTION_FAILED when fallback chain is exhausted', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    mockedStream
      .mockResolvedValueOnce(createSseStream([
        { type: 'start', artifactId: 'art_1', workflowType: 'extraction', format: 'json' },
        { type: 'token', token: 'invalid-output-1', sequence: 1 },
        { type: 'complete', artifactId: 'art_1', content: 'invalid-output-1', cost: 0.01 },
      ]))
      .mockResolvedValueOnce(createSseStream([
        { type: 'start', artifactId: 'art_2', workflowType: 'extraction', format: 'json' },
        { type: 'token', token: 'invalid-output-2', sequence: 1 },
        { type: 'complete', artifactId: 'art_2', content: 'invalid-output-2', cost: 0.02 },
      ]))
      .mockResolvedValueOnce(createSseStream([
        { type: 'start', artifactId: 'art_3', workflowType: 'extraction', format: 'json' },
        { type: 'token', token: 'invalid-output-3', sequence: 1 },
        { type: 'complete', artifactId: 'art_3', content: 'invalid-output-3', cost: 0.02 },
      ]));

    const res = await POST(makeRequest(baseBody));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toEqual(expect.objectContaining({
      error: expect.objectContaining({
        code: 'EXTRACTION_FAILED',
      }),
    }));
    expect(mockedStream).toHaveBeenCalledTimes(3);
    expect(updateUser).toHaveBeenCalledTimes(1);
  });

  it('stops escalation when cumulative attempt cost exceeds extraction budget', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    mockedStream
      .mockResolvedValueOnce(createSseStream([
        { type: 'start', artifactId: 'art_1', workflowType: 'extraction', format: 'json' },
        { type: 'token', token: 'invalid-output-1', sequence: 1 },
        { type: 'complete', artifactId: 'art_1', content: 'invalid-output-1', cost: 0.05 },
      ]))
      .mockResolvedValueOnce(createSseStream([
        { type: 'start', artifactId: 'art_2', workflowType: 'extraction', format: 'json' },
        { type: 'token', token: 'invalid-output-2', sequence: 1 },
        { type: 'complete', artifactId: 'art_2', content: 'invalid-output-2', cost: 0.05 },
      ]));

    const res = await POST(makeRequest(baseBody));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toEqual(expect.objectContaining({
      error: expect.objectContaining({
        code: 'EXTRACTION_FAILED',
      }),
    }));
    expect(mockedStream).toHaveBeenCalledTimes(2);
    expect(updateUser).toHaveBeenCalledTimes(1);
  });

  it('skips unavailable primary runtime model and succeeds on next available fallback', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    findActiveModel.mockImplementation(async ({ where }: { where?: { modelId?: string } }) => {
      const modelId = where?.modelId;
      const allowedModels = [
        'openai/gpt-4-turbo',
        EXTRACTION_FALLBACK_MODELS[0],
        EXTRACTION_FALLBACK_MODELS[1],
      ];

      return modelId && allowedModels.includes(modelId)
        ? { id: `model_${modelId}` }
        : null;
    });

    const res = await POST(makeRequest(baseBody));

    expect(res.status).toBe(200);
    expect(mockedStream).toHaveBeenCalledTimes(1);
    expect(mockedStream).toHaveBeenCalledWith(expect.objectContaining({ model: EXTRACTION_FALLBACK_MODELS[0] }));
    expect(updateUser).toHaveBeenCalledTimes(1);
  });
});
