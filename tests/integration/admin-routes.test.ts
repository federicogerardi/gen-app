/** @jest-environment node */

import { GET as getUsers } from '@/app/api/admin/users/route';
import { GET as getMetrics } from '@/app/api/admin/metrics/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

jest.mock('@/lib/db', () => jest.requireActual('./db-mock').createDbMock());

const mockChildLogger = {
  error: jest.fn(),
};

jest.mock('@/lib/logger', () => ({
  getRequestLogger: jest.fn(() => ({
    child: jest.fn(() => mockChildLogger),
  })),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findUsers = (db as any).user.findMany as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countUsers = (db as any).user.count as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const aggregateUsers = (db as any).user.aggregate as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const countArtifacts = (db as any).artifact.count as jest.Mock;

const adminSession = { user: { id: 'admin_1', role: 'admin' } };
const userSession = { user: { id: 'user_1', role: 'user' } };

// Helper to create a NextRequest with query params
function createRequest(queryParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/users');
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  return new NextRequest(url);
}

beforeEach(() => {
  jest.clearAllMocks();
  findUsers.mockResolvedValue([]);
  countUsers.mockResolvedValue(0);
  countArtifacts.mockResolvedValue(0);
  aggregateUsers.mockResolvedValue({ _sum: { monthlySpent: null } });
});

describe('GET /api/admin/users', () => {
  it('returns 403 for unauthenticated request', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await getUsers(createRequest());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for non-admin user', async () => {
    mockedAuth.mockResolvedValue(userSession as never);

    const res = await getUsers(createRequest());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns paginated user list for admin', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);
    const users = [
      {
        id: 'user_1',
        name: 'Mario Rossi',
        email: 'mario@example.com',
        role: 'user',
        monthlyQuota: 100,
        monthlyUsed: 10,
        monthlyBudget: '50.00',
        monthlySpent: '5.00',
        resetDate: new Date(),
        createdAt: new Date(),
      },
    ];
    findUsers.mockResolvedValue(users);
    countUsers.mockResolvedValue(42);

    const res = await getUsers(createRequest({ limit: '20', offset: '0' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.users).toHaveLength(1);
    expect(data.users[0].email).toBe('mario@example.com');
    expect(data.total).toBe(42);
    expect(data.limit).toBe(20);
    expect(data.offset).toBe(0);
    expect(data.hasMore).toBe(true);
  });

  it('accepts default pagination parameters', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);
    findUsers.mockResolvedValue([]);
    countUsers.mockResolvedValue(5);

    const res = await getUsers(createRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.limit).toBe(20);
    expect(data.offset).toBe(0);
    expect(data.hasMore).toBe(false);
  });

  it('validates pagination parameters', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);

    const res = await getUsers(createRequest({ limit: '999', offset: '-1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 500 and logs structured error when db query fails', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);
    findUsers.mockRejectedValue(new Error('db failure'));

    const res = await getUsers(createRequest({ limit: '20', offset: '0' }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error.code).toBe('INTERNAL_ERROR');
    expect(mockChildLogger.error).toHaveBeenCalled();
  });
});

describe('GET /api/admin/metrics', () => {
  it('returns 403 for unauthenticated request', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await getMetrics();
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for non-admin user', async () => {
    mockedAuth.mockResolvedValue(userSession as never);

    const res = await getMetrics();
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns aggregated metrics for admin', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);
    countUsers.mockResolvedValue(42);
    countArtifacts
      .mockResolvedValueOnce(150)  // total artifacts
      .mockResolvedValueOnce(120)  // completed
      .mockResolvedValueOnce(5);   // failed
    aggregateUsers.mockResolvedValue({ _sum: { monthlySpent: '123.45' } });

    const res = await getMetrics();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.metrics.totalUsers).toBe(42);
    expect(data.metrics.totalArtifacts).toBe(150);
    expect(data.metrics.completedArtifacts).toBe(120);
    expect(data.metrics.failedArtifacts).toBe(5);
    expect(data.metrics.totalMonthlySpent).toBe(123.45);
  });

  it('returns 0 for totalMonthlySpent when no spend recorded', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);
    aggregateUsers.mockResolvedValue({ _sum: { monthlySpent: null } });

    const res = await getMetrics();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.metrics.totalMonthlySpent).toBe(0);
  });
});
