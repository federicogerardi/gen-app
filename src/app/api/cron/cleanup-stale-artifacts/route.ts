import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * S1-07: Scheduled cron job to clean up stale artifacts.
 * 
 * Cron runs daily (see vercel.json).
 * Finds artifacts in 'generating' status older than 24h and marks as 'failed'.
 * 
 * Requires VERCEL_CRON_SECRET env var for authentication.
 */
export async function GET(request: NextRequest) {
  try {
    if (!env.VERCEL_CRON_SECRET) {
      logger.error({}, 'Missing VERCEL_CRON_SECRET for cron endpoint');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // Verify Vercel Cron secret
    const authHeader = request.headers.get('authorization');
    const expectedHeader = `Bearer ${env.VERCEL_CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedHeader) {
      logger.warn({}, 'Unauthorized cron request: invalid or missing secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Calculate 24h threshold
    const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const cleanupResult = await db.artifact.updateMany({
      where: {
        status: 'generating',
        createdAt: { lt: staleThreshold },
      },
      data: {
        status: 'failed',
        failureReason: 'stale',
      },
    });

    if (cleanupResult.count === 0) {
      logger.info({}, 'Stale artifact cleanup: no stale artifacts found');
      return NextResponse.json({ cleaned: 0, message: 'No stale artifacts found' }, { status: 200 });
    }

    logger.info(
      { count: cleanupResult.count, staleThreshold: staleThreshold.toISOString() },
      'Stale artifact cleanup completed',
    );

    return NextResponse.json(
      { cleaned: cleanupResult.count, message: `Cleaned ${cleanupResult.count} stale artifacts` },
      { status: 200 },
    );
  } catch (err) {
    logger.error({ err }, 'Error during stale artifact cleanup');
    return NextResponse.json(
      { error: 'Internal server error', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
