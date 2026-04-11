import { createDbMock } from './db-mock';
/** @jest-environment node */

import { GET as getUsers } from '@/app/api/admin/users/route';
import { GET as getMetrics } from '@/app/api/admin/metrics/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    artifact: {
      count: jest.fn(),
    },
  },
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const findUsers = db.user.findMany as jest.Mock;
const countUsers = db.user.count as jest.Mock;
const aggregateUsers = db.user.aggregate as jest.Mock;
const countArtifacts = db.artifact.count as jest.Mock;

const adminSession = { user: { id: 'admin_1', role: 'admin' } };
const userSession = { user: { id: 'user_1', role: 'user' } };

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

    const res = await getUsers();
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns 403 for non-admin user', async () => {
    mockedAuth.mockResolvedValue(userSession as never);

    const res = await getUsers();
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns user list for admin', async () => {
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

    const res = await getUsers();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.users).toHaveLength(1);
    expect(data.users[0].email).toBe('mario@example.com');
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
