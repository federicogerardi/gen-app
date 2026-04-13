import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdminUser } from '@/lib/tool-routes/guards';

const createModelSchema = z.object({
  modelId: z.string().min(3),
  name: z.string().min(2),
  inputCostPer1k: z.number().positive(),
  outputCostPer1k: z.number().positive(),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
  pricingReviewedAt: z.string().datetime().optional(),
});

export async function GET() {
  const adminResult = await requireAdminUser();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  try {
    const models = await db.llmModel.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ models });
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: string }).code === 'P2021'
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Model registry table missing. Run prisma migrate deploy on this environment.',
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch models' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const adminResult = await requireAdminUser();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = createModelSchema.safeParse(body);
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
  const pricingReviewedAt = data.pricingReviewedAt ? new Date(data.pricingReviewedAt) : new Date();

  try {
    const created = await db.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.llmModel.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.llmModel.create({
        data: {
          modelId: data.modelId,
          name: data.name,
          inputCostPer1k: data.inputCostPer1k,
          outputCostPer1k: data.outputCostPer1k,
          isActive: data.isActive,
          isDefault: data.isDefault,
          pricingReviewedAt,
        },
      });
    });

    return NextResponse.json({ model: created }, { status: 201 });
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: string }).code === 'P2021'
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Model registry table missing. Run prisma migrate deploy on this environment.',
          },
        },
        { status: 500 },
      );
    }

    if (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Model already exists' } },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create model' } },
      { status: 500 },
    );
  }
}
