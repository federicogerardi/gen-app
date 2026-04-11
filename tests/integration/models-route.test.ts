/** @jest-environment node */

import { GET } from '@/app/api/models/route';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
  getRequestLogger: jest.fn(() => ({
    warn: (logger.warn as jest.Mock),
  })),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedWarn = logger.warn as jest.Mock;

describe('GET /api/models', () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockedWarn.mockReset();
  });

  it('returns models for authenticated users', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1', role: 'user' } } as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'openai/gpt-4-turbo' }),
      ]),
    );
    expect(data.pricing).toEqual(
      expect.objectContaining({
        lastReviewedAt: expect.any(String),
        maxAgeDays: expect.any(Number),
        ageDays: expect.any(Number),
        stale: expect.any(Boolean),
      }),
    );
    expect(mockedWarn).not.toHaveBeenCalled();
  });

  it('logs warning when pricing metadata is stale', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse('2027-01-20T00:00:00.000Z'));
    mockedAuth.mockResolvedValue({ user: { id: 'user_1', role: 'user' } } as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pricing.stale).toBe(true);
    expect(mockedWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        pricing: expect.objectContaining({ stale: true }),
      }),
      'Model pricing metadata is stale',
    );
  });

  it('returns 401 for unauthenticated users', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
});