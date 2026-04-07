import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
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