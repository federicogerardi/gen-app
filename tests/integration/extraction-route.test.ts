/** @jest-environment node */

import { POST } from '@/app/api/tools/extraction/generate/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { createArtifactStream } from '@/lib/llm/streaming';
import { buildExtractionPrompt } from '@/lib/tool-prompts/extraction';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn() }));
jest.mock('@/lib/llm/streaming', () => ({ createArtifactStream: jest.fn() }));
jest.mock('@/lib/tool-prompts/extraction', () => ({ buildExtractionPrompt: jest.fn() }));

jest.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: jest.fn() },
    project: { findUnique: jest.fn() },
    quotaHistory: { create: jest.fn() },
  },
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockedStream = createArtifactStream as jest.MockedFunction<typeof createArtifactStream>;
const mockedBuildExtractionPrompt = buildExtractionPrompt as jest.MockedFunction<typeof buildExtractionPrompt>;
const findUser = db.user.findUnique as jest.Mock;
const findProject = db.project.findUnique as jest.Mock;

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

beforeEach(() => {
  jest.clearAllMocks();
  mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 10 });
  mockedStream.mockResolvedValue(new ReadableStream());
  mockedBuildExtractionPrompt.mockResolvedValue('EXTRACTION PROMPT');
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
    expect(mockedStream).toHaveBeenCalledWith(expect.objectContaining({ workflowType: 'extraction', type: 'extraction' }));
  });
});
