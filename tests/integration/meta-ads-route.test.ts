/** @jest-environment node */

import { POST } from '@/app/api/tools/meta-ads/generate/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { createArtifactStream } from '@/lib/llm/streaming';
import { buildMetaAdsPrompt } from '@/lib/tool-prompts/meta-ads';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn() }));
jest.mock('@/lib/llm/streaming', () => ({ createArtifactStream: jest.fn() }));
jest.mock('@/lib/tool-prompts/meta-ads', () => ({ buildMetaAdsPrompt: jest.fn() }));

jest.mock('@/lib/db', () => jest.requireActual('./db-mock').createDbMock());

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockedStream = createArtifactStream as jest.MockedFunction<typeof createArtifactStream>;
const mockedBuildPrompt = buildMetaAdsPrompt as jest.MockedFunction<typeof buildMetaAdsPrompt>;
const findUser = (db.user?.findUnique) as jest.Mock;
const findProject = (db.project?.findUnique) as jest.Mock;
const createQuota = (db.quotaHistory?.create) as jest.Mock;

const projectId = 'cjld2cyuq0000t3rmniod1foy';
const body = {
  projectId,
  model: 'openai/gpt-4-turbo',
  tone: 'professional',
  product: 'CRM SaaS',
  audience: 'SMB',
  offer: 'Free trial',
  objective: 'Leads',
};

const makeRequest = (payload: unknown) =>
  new Request('http://localhost/api/tools/meta-ads/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 10 });
  mockedStream.mockResolvedValue(new ReadableStream());
  mockedBuildPrompt.mockResolvedValue('PROMPT');
  findUser.mockResolvedValue({ id: 'user_1', monthlyUsed: 1, monthlyQuota: 100, monthlySpent: '1', monthlyBudget: '10' });
  findProject.mockResolvedValue({ id: projectId, userId: 'user_1' });
  createQuota.mockResolvedValue({});
});

describe('POST /api/tools/meta-ads/generate', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid payload', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const res = await POST(makeRequest({ ...body, model: 'bad/model' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 when user not found', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findUser.mockResolvedValue(null);
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(401);
  });

  it('returns 429 when monthly quota exhausted', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findUser.mockResolvedValue({ id: 'user_1', monthlyUsed: 100, monthlyQuota: 100, monthlySpent: '1', monthlyBudget: '10' });
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(429);
    expect(createQuota).toHaveBeenCalled();
  });

  it('returns 402 when budget exhausted', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findUser.mockResolvedValue({ id: 'user_1', monthlyUsed: 1, monthlyQuota: 100, monthlySpent: '10', monthlyBudget: '10' });
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(402);
  });

  it('returns 429 when rate limit denies', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    mockedRateLimit.mockResolvedValue({ allowed: false, remaining: 0 });
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(429);
  });

  it('returns 404 when project missing', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue(null);
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(404);
  });

  it('returns 403 when project owned by another user', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue({ id: projectId, userId: 'other' });
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(403);
  });

  it('returns 503 when stream creation fails', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    mockedStream.mockRejectedValue(new Error('provider down'));
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(503);
  });

  it('returns SSE response when successful', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(mockedBuildPrompt).toHaveBeenCalled();
    expect(mockedStream).toHaveBeenCalledWith(
      expect.objectContaining({ workflowType: 'meta_ads', type: 'content' }),
    );
  });
});
