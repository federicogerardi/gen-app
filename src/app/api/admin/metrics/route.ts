import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminUser } from '@/lib/tool-routes/guards';

export async function GET() {
  const adminResult = await requireAdminUser();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const [totalUsers, totalArtifacts, completedArtifacts, failedArtifacts, userSpend] = await Promise.all([
    db.user.count(),
    db.artifact.count(),
    db.artifact.count({ where: { status: 'completed' } }),
    db.artifact.count({ where: { status: 'failed' } }),
    db.user.aggregate({ _sum: { monthlySpent: true } }),
  ]);

  return NextResponse.json({
    metrics: {
      totalUsers,
      totalArtifacts,
      completedArtifacts,
      failedArtifacts,
      totalMonthlySpent: Number(userSpend._sum.monthlySpent ?? 0),
    },
  });
}
