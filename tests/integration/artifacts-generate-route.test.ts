/** @jest-environment node */

import { POST } from '@/app/api/artifacts/generate/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { createArtifactStream } from '@/lib/llm/streaming';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

jest.mock('@/lib/db', () => jest.requireActual('./db-mock').createDbMock());

jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn() }));

jest.mock('@/lib/llm/streaming', () => ({ createArtifactStream: jest.fn() }));

jest.mock('@/lib/logger', () => ({
  getRequestLogger: jest.fn(() => ({
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    child: jest.fn(() => ({
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    })),
  })),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockedStream = createArtifactStream as jest.MockedFunction<typeof createArtifactStream>;
const findUser = db.user.findUnique as jest.Mock;
const findProject = db.project.findUnique as jest.Mock;
const createQuota = db.quotaHistory.create as jest.Mock;

const VALID_PROJECT_ID = 'cjld2cyuq0000t3rmniod1foy';

const VALID_BODY = {
  projectId: VALID_PROJECT_ID,
  type: 'content',
  model: 'openai/gpt-4-turbo',
  input: { topic: 'AI trends' },
};

const makeRequest = (body: unknown) =>
  new Request('http://localhost/api/artifacts/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const mockUser = {
  id: 'user_1',
  monthlyUsed: 5,
  monthlyQuota: 100,
  monthlyBudget: '50.00',
  monthlySpent: '10.00',
};

const mockProject = { id: VALID_PROJECT_ID, userId: 'user_1' };

beforeEach(() => {
  jest.clearAllMocks();
  createQuota.mockResolvedValue({});
  mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 999 });
  findUser.mockResolvedValue(mockUser);
  findProject.mockResolvedValue(mockProject);
  mockedStream.mockResolvedValue(new ReadableStream());
});

describe('POST /api/artifacts/generate', () => {
  it('returns 401 when session is missing', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await POST(makeRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for invalid payload (unsupported model)', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await POST(makeRequest({ ...VALID_BODY, model: 'unknown/model' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid payload (missing projectId)', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const bodyNoProject = {
      type: VALID_BODY.type,
      model: VALID_BODY.model,
      input: VALID_BODY.input,
    };
    const res = await POST(makeRequest(bodyNoProject));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when user record is not found in DB', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findUser.mockResolvedValue(null);

    const res = await POST(makeRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 429 when monthly quota is exhausted', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findUser.mockResolvedValue({ ...mockUser, monthlyUsed: 100, monthlyQuota: 100 });

    const res = await POST(makeRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(createQuota).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'rate_limited' }) }),
    );
  });

  it('returns 402 when monthly budget is exhausted', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findUser.mockResolvedValue({ ...mockUser, monthlyBudget: '50.00', monthlySpent: '50.00' });

    const res = await POST(makeRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(402);
    expect(data.error.code).toBe('PAYMENT_REQUIRED');
    expect(createQuota).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'rate_limited' }) }),
    );
  });

  it('returns 429 when Redis rate limit blocks the request', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    mockedRateLimit.mockResolvedValue({ allowed: false, remaining: 0 });

    const res = await POST(makeRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(createQuota).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'rate_limited' }) }),
    );
  });

  it('returns 404 when project does not exist', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue(null);

    const res = await POST(makeRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when project is owned by another user', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue({ ...mockProject, userId: 'other_user' });

    const res = await POST(makeRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns 503 when createArtifactStream throws', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    mockedStream.mockRejectedValue(new Error('LLM provider unavailable'));

    const res = await POST(makeRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('returns SSE stream response on success', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('x-request-id')).toBeDefined();
    expect(mockedStream).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        projectId: VALID_PROJECT_ID,
        type: 'content',
        model: 'openai/gpt-4-turbo',
      }),
    );
  });
});
