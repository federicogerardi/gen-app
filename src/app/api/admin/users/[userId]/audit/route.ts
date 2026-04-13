import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminUser } from '@/lib/tool-routes/guards';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const adminResult = await requireAdminUser();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const { userId } = await params;
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
  if (!user) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 });
  }

  const history = await db.quotaHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ user, history });
}