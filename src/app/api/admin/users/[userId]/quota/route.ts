import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAdminUser } from '@/lib/tool-routes/guards';

const updateQuotaSchema = z.object({
  monthlyQuota: z.number().int().positive().optional(),
  monthlyBudget: z.number().positive().optional(),
  resetUsage: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const adminResult = await requireAdminUser();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const { userId } = await params;
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateQuotaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.monthlyQuota !== undefined) data.monthlyQuota = parsed.data.monthlyQuota;
  if (parsed.data.monthlyBudget !== undefined) data.monthlyBudget = parsed.data.monthlyBudget;
  if (parsed.data.resetUsage) {
    data.monthlyUsed = 0;
    data.monthlySpent = 0;
    data.resetDate = new Date();
  }

  const updated = await db.user.update({
    where: { id: userId },
    data,
    select: { id: true, monthlyQuota: true, monthlyUsed: true, monthlyBudget: true, monthlySpent: true, resetDate: true },
  });

  return NextResponse.json({ user: updated });
}
