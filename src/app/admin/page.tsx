import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { AdminClientPage } from './AdminClientPage';
import { Decimal } from '@prisma/client-runtime-utils';

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/dashboard');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalUsers, totalArtifacts, completedArtifacts, recentActivity, completedArtifactsSample, quotaHistory30d] = await Promise.all([
    db.user.count(),
    db.artifact.count(),
    db.artifact.count({ where: { status: 'completed' } }),
    db.quotaHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { user: { select: { email: true, name: true } } },
    }),
    db.artifact.findMany({
      where: {
        status: 'completed',
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: 500,
      select: {
        createdAt: true,
        completedAt: true,
      },
    }),
    db.quotaHistory.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        status: true,
        requestCount: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  ]);

  const recentActivityForClient = recentActivity.map((entry: typeof recentActivity[number]) => ({
    id: entry.id,
    artifactType: entry.artifactType,
    model: entry.model,
    status: entry.status,
    costUSD: entry.costUSD instanceof Decimal ? entry.costUSD.toNumber() : Number(entry.costUSD),
    createdAt: entry.createdAt,
    user: {
      email: entry.user?.email ?? '',
      name: entry.user?.name ?? null,
    },
  }));

  const completionDurations = completedArtifactsSample
    .filter((artifact: typeof completedArtifactsSample[number]) => artifact.completedAt)
    .map((artifact: typeof completedArtifactsSample[number]) => (artifact.completedAt!.getTime() - artifact.createdAt.getTime()) / 1000)
    .filter((value: number) => Number.isFinite(value) && value >= 0);

  const quotaRequestCount30d = quotaHistory30d.reduce((acc: number, entry: typeof quotaHistory30d[number]) => acc + entry.requestCount, 0);
  const quotaSuccessCount30d = quotaHistory30d
    .filter((entry: typeof quotaHistory30d[number]) => entry.status === 'success')
    .reduce((acc: number, entry: typeof quotaHistory30d[number]) => acc + entry.requestCount, 0);
  const quotaErrorCount30d = quotaHistory30d
    .filter((entry: typeof quotaHistory30d[number]) => entry.status === 'error')
    .reduce((acc: number, entry: typeof quotaHistory30d[number]) => acc + entry.requestCount, 0);
  const quotaRateLimitedCount30d = quotaHistory30d
    .filter((entry: typeof quotaHistory30d[number]) => entry.status === 'rate_limited')
    .reduce((acc: number, entry: typeof quotaHistory30d[number]) => acc + entry.requestCount, 0);

  const baselineMetrics = {
    generatedAt: new Date().toISOString(),
    completionRate: totalArtifacts > 0 ? completedArtifacts / totalArtifacts : 0,
    avgCompletionSeconds: avg(completionDurations),
    p95CompletionSeconds:
      completionDurations.length > 0
        ? [...completionDurations].sort((a: number, b: number) => a - b)[Math.floor(completionDurations.length * 0.95)]
        : 0,
    requestSuccessRate30d: quotaRequestCount30d > 0 ? quotaSuccessCount30d / quotaRequestCount30d : 0,
    requestErrorRate30d: quotaRequestCount30d > 0 ? quotaErrorCount30d / quotaRequestCount30d : 0,
    requestRateLimitedRate30d: quotaRequestCount30d > 0 ? quotaRateLimitedCount30d / quotaRequestCount30d : 0,
    sampleSizeArtifacts: completedArtifactsSample.length,
    sampleSizeRequests30d: quotaRequestCount30d,
  };

  return (
    <AdminClientPage
      totalUsers={totalUsers}
      totalArtifacts={totalArtifacts}
      completedArtifacts={completedArtifacts}
      recentActivity={recentActivityForClient}
      baselineMetrics={baselineMetrics}
    />
  );
}
