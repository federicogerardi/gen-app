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

    // Find stale artifacts
    const staleArtifacts = await db.artifact.findMany({
      where: {
        status: 'generating',
        createdAt: { lt: staleThreshold },
      },
    });

    if (staleArtifacts.length === 0) {
      logger.info({}, 'Stale artifact cleanup: no stale artifacts found');
      return NextResponse.json({ cleaned: 0, message: 'No stale artifacts found' }, { status: 200 });
    }

    // Mark all stale artifacts as failed with reason 'stale'
    const updatePromises = staleArtifacts.map((artifact) =>
      db.artifact.update({
        where: { id: artifact.id },
        data: {
          status: 'failed',
          failureReason: 'stale',
        },
      }),
    );

    const results = await Promise.all(updatePromises);

    logger.info(
      { count: results.length, staleThreshold: staleThreshold.toISOString() },
      'Stale artifact cleanup completed',
    );

    return NextResponse.json(
      { cleaned: results.length, message: `Cleaned ${results.length} stale artifacts` },
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
