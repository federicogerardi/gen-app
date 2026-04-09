/** @jest-environment node */

import { PUT } from '@/app/api/admin/users/[userId]/quota/route';
import { GET } from '@/app/api/admin/users/[userId]/audit/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    quotaHistory: {
      findMany: jest.fn(),
    },
  },
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const findUser = db.user.findUnique as jest.Mock;
const updateUser = db.user.update as jest.Mock;
const findHistory = db.quotaHistory.findMany as jest.Mock;

const USER_ID = 'target_user_123';
const makeParams = (id = USER_ID) => ({ params: Promise.resolve({ userId: id }) });

const adminSession = { user: { id: 'admin_1', role: 'admin' } };
const userSession = { user: { id: 'user_1', role: 'user' } };
const mockTarget = { id: USER_ID, name: 'Test User', email: 'test@example.com' };

const makePutRequest = (body: unknown) =>
  new Request('http://localhost', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  jest.clearAllMocks();
  findUser.mockResolvedValue(mockTarget);
  updateUser.mockResolvedValue({ id: USER_ID, monthlyQuota: 200, monthlyUsed: 0, monthlyBudget: '100', monthlySpent: '0', resetDate: new Date() });
  findHistory.mockResolvedValue([]);
});

describe('PUT /api/admin/users/[userId]/quota', () => {
  it('returns 403 for unauthenticated request', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await PUT(makePutRequest({ monthlyQuota: 200 }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for non-admin user', async () => {
    mockedAuth.mockResolvedValue(userSession as never);

    const res = await PUT(makePutRequest({ monthlyQuota: 200 }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 when target user not found', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);
    findUser.mockResolvedValue(null);

    const res = await PUT(makePutRequest({ monthlyQuota: 200 }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for invalid input (negative quota)', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);

    const res = await PUT(makePutRequest({ monthlyQuota: -10 }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates quota successfully', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);

    const res = await PUT(makePutRequest({ monthlyQuota: 500 }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).toBeDefined();
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({ monthlyQuota: 500 }),
      }),
    );
  });

  it('resets usage when resetUsage is true', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);

    const res = await PUT(makePutRequest({ resetUsage: true }), makeParams());
    await res.json();

    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ monthlyUsed: 0, monthlySpent: 0 }),
      }),
    );
  });
});

describe('GET /api/admin/users/[userId]/audit', () => {
  it('returns 403 for unauthenticated request', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for non-admin user', async () => {
    mockedAuth.mockResolvedValue(userSession as never);

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 when user not found', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);
    findUser.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('returns user and history for admin', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);
    const history = [
      { id: 'h1', userId: USER_ID, artifactType: 'content', model: 'openai/gpt-4-turbo', status: 'success', costUSD: '0.05', requestCount: 1, createdAt: new Date() },
    ];
    findHistory.mockResolvedValue(history);

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).toBeDefined();
    expect(data.history).toHaveLength(1);
  });
});
