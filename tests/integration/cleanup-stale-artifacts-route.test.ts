/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/cleanup-stale-artifacts/route';
import { db } from '@/lib/db';

jest.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
    VERCEL_CRON_SECRET: 'cron-secret',
  },
}));

import { env } from '@/lib/env';

jest.mock('@/lib/db', () => jest.requireActual('./db-mock').createDbMock());

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const updateManyArtifacts = db.artifact.updateMany as jest.Mock;
const envMock = env as {
  NODE_ENV: 'production' | 'development' | 'test';
  VERCEL_ENV: 'production' | 'preview' | 'development';
  VERCEL_CRON_SECRET?: string;
};

function makeRequest(authHeader?: string): NextRequest {
  return new NextRequest('http://localhost/api/cron/cleanup-stale-artifacts', {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe('GET /api/cron/cleanup-stale-artifacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    envMock.NODE_ENV = 'production';
    envMock.VERCEL_ENV = 'production';
    envMock.VERCEL_CRON_SECRET = 'cron-secret';
  });

  it('returns 403 when authorization header is missing', async () => {
    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns cleaned: 0 when no stale artifacts are found', async () => {
    updateManyArtifacts.mockResolvedValue({ count: 0 });

    const res = await GET(makeRequest('Bearer cron-secret'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.cleaned).toBe(0);
    expect(updateManyArtifacts).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'generating' }),
        data: { status: 'failed', failureReason: 'stale' },
      }),
    );
  });

  it('returns number of cleaned artifacts when updateMany updates rows', async () => {
    updateManyArtifacts.mockResolvedValue({ count: 3 });

    const res = await GET(makeRequest('Bearer cron-secret'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.cleaned).toBe(3);
    expect(data.message).toContain('3');
  });

  it('returns 500 in Vercel production when cron secret is missing', async () => {
    envMock.VERCEL_CRON_SECRET = undefined;

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Server misconfiguration');
  });

  it('returns 503 outside Vercel production when cron secret is missing', async () => {
    envMock.VERCEL_ENV = 'preview';
    envMock.VERCEL_CRON_SECRET = undefined;

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toBe('Cron endpoint is not configured');
  });
});
