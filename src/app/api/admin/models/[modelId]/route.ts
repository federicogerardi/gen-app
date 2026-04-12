import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const updateModelSchema = z.object({
  name: z.string().min(2).optional(),
  inputCostPer1k: z.number().positive().optional(),
  outputCostPer1k: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  pricingReviewedAt: z.string().datetime().optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return null;
  }

  return session;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ modelId: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
  }

  const { modelId } = await params;
  const existing = await db.llmModel.findUnique({ where: { id: modelId } });
  if (!existing) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Model not found' } }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateModelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const updated = await db.$transaction(async (tx) => {
    if (data.isDefault === true) {
      await tx.llmModel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.llmModel.update({
      where: { id: modelId },
      data: {
        name: data.name,
        inputCostPer1k: data.inputCostPer1k,
        outputCostPer1k: data.outputCostPer1k,
        isActive: data.isActive,
        isDefault: data.isDefault,
        pricingReviewedAt: data.pricingReviewedAt ? new Date(data.pricingReviewedAt) : undefined,
      },
    });
  });

  return NextResponse.json({ model: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ modelId: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
  }

  const { modelId } = await params;
  const existing = await db.llmModel.findUnique({ where: { id: modelId } });
  if (!existing) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Model not found' } }, { status: 404 });
  }

  if (existing.isDefault) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Cannot delete default model' } },
      { status: 400 },
    );
  }

  await db.llmModel.delete({ where: { id: modelId } });
  return NextResponse.json({ success: true });
}
