/** @jest-environment node */

import { GET as getQuota } from '@/app/api/users/quota/route';
import { GET as getProfile } from '@/app/api/users/profile/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

jest.mock('@/lib/db', () => jest.requireActual('./db-mock').createDbMock());

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const findUser = db.user.findUnique as jest.Mock;

const session = { user: { id: 'user_1' } };

beforeEach(() => {
  jest.clearAllMocks();
  findUser.mockResolvedValue(null);
});

describe('GET /api/users/quota', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await getQuota();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns quota for authenticated user', async () => {
    mockedAuth.mockResolvedValue(session as never);
    const quota = {
      monthlyQuota: 100,
      monthlyUsed: 20,
      resetDate: new Date().toISOString(),
    };
    findUser.mockResolvedValue(quota);

    const res = await getQuota();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.quota.monthlyQuota).toBe(100);
    expect(data.quota).not.toHaveProperty('monthlyBudget');
    expect(data.quota).not.toHaveProperty('monthlySpent');
    expect(findUser).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user_1' } }),
    );
  });
});

describe('GET /api/users/profile', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await getProfile();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns profile for authenticated user', async () => {
    mockedAuth.mockResolvedValue(session as never);
    const profile = {
      id: 'user_1',
      name: 'Mario Rossi',
      email: 'mario@example.com',
      image: null,
      role: 'user',
      createdAt: new Date(),
    };
    findUser.mockResolvedValue(profile);

    const res = await getProfile();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user.email).toBe('mario@example.com');
    expect(findUser).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user_1' } }),
    );
  });
});
