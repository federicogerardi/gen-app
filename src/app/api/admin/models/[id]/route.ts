import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError } from '@/lib/tool-routes/responses';
import { requireAdminUser } from '@/lib/tool-routes/guards';

const updateModelSchema = z.object({
  name: z.string().min(2).optional(),
  inputCostPer1k: z.number().positive().optional(),
  outputCostPer1k: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  pricingReviewedAt: z.string().datetime().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminResult = await requireAdminUser();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const { id } = await params;
  const existing = await db.llmModel.findUnique({ where: { id } });
  if (!existing) {
    return apiError('NOT_FOUND', 'Model not found', 404);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateModelSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
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
      where: { id },
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
  { params }: { params: Promise<{ id: string }> },
) {
  const adminResult = await requireAdminUser();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const { id } = await params;
  const existing = await db.llmModel.findUnique({ where: { id } });
  if (!existing) {
    return apiError('NOT_FOUND', 'Model not found', 404);
  }

  if (existing.isDefault) {
    return apiError('VALIDATION_ERROR', 'Cannot delete default model', 400);
  }

  await db.llmModel.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
