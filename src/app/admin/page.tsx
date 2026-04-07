import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { AdminClientPage } from './AdminClientPage';

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/dashboard');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [users, totalArtifacts, completedArtifacts, recentActivity, completedArtifactsSample, quotaHistory30d] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        monthlyQuota: true,
        monthlyUsed: true,
        monthlyBudget: true,
        monthlySpent: true,
        resetDate: true,
      },
    }),
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

  const usersForClient = users.map((user) => ({
    ...user,
    monthlyBudget: Number(user.monthlyBudget),
    monthlySpent: Number(user.monthlySpent),
  }));

  const recentActivityForClient = recentActivity.map((entry) => ({
    ...entry,
    costUSD: Number(entry.costUSD),
  }));

  const completionDurations = completedArtifactsSample
    .filter((artifact) => artifact.completedAt)
    .map((artifact) => (artifact.completedAt!.getTime() - artifact.createdAt.getTime()) / 1000)
    .filter((value) => Number.isFinite(value) && value >= 0);

  const quotaRequestCount30d = quotaHistory30d.reduce((acc, entry) => acc + entry.requestCount, 0);
  const quotaSuccessCount30d = quotaHistory30d
    .filter((entry) => entry.status === 'success')
    .reduce((acc, entry) => acc + entry.requestCount, 0);
  const quotaErrorCount30d = quotaHistory30d
    .filter((entry) => entry.status === 'error')
    .reduce((acc, entry) => acc + entry.requestCount, 0);
  const quotaRateLimitedCount30d = quotaHistory30d
    .filter((entry) => entry.status === 'rate_limited')
    .reduce((acc, entry) => acc + entry.requestCount, 0);

  const baselineMetrics = {
    generatedAt: new Date().toISOString(),
    completionRate: totalArtifacts > 0 ? completedArtifacts / totalArtifacts : 0,
    avgCompletionSeconds: avg(completionDurations),
    p95CompletionSeconds:
      completionDurations.length > 0
        ? completionDurations.sort((a, b) => a - b)[Math.floor(completionDurations.length * 0.95)]
        : 0,
    requestSuccessRate30d: quotaRequestCount30d > 0 ? quotaSuccessCount30d / quotaRequestCount30d : 0,
    requestErrorRate30d: quotaRequestCount30d > 0 ? quotaErrorCount30d / quotaRequestCount30d : 0,
    requestRateLimitedRate30d: quotaRequestCount30d > 0 ? quotaRateLimitedCount30d / quotaRequestCount30d : 0,
    sampleSizeArtifacts: completedArtifactsSample.length,
    sampleSizeRequests30d: quotaRequestCount30d,
  };

  return (
    <AdminClientPage
      users={usersForClient}
      totalArtifacts={totalArtifacts}
      completedArtifacts={completedArtifacts}
      recentActivity={recentActivityForClient}
      baselineMetrics={baselineMetrics}
    />
  );
}
