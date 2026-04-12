import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { apiError } from '@/lib/tool-routes/responses';

const updateArtifactSchema = z.object({
  content: z.string().min(1).max(100_000),
});

function stripArtifactCost<T>(artifact: T): Omit<T, 'costUSD'> {
  const { costUSD: _costUSD, ...sanitizedArtifact } = artifact as T & { costUSD?: unknown };
  return sanitizedArtifact as Omit<T, 'costUSD'>;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const { id } = await params;
  const artifact = await db.artifact.findUnique({ where: { id } });

  if (!artifact) {
    return apiError('NOT_FOUND', 'Artifact not found', 404);
  }
  if (artifact.userId !== session.user.id) {
    return apiError('FORBIDDEN', 'Access denied', 403);
  }

  return NextResponse.json({ artifact: stripArtifactCost(artifact) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const { id } = await params;
  const artifact = await db.artifact.findUnique({ where: { id } });

  if (!artifact) {
    return apiError('NOT_FOUND', 'Artifact not found', 404);
  }
  if (artifact.userId !== session.user.id) {
    return apiError('FORBIDDEN', 'Access denied', 403);
  }

  await db.artifact.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const { id } = await params;
  const artifact = await db.artifact.findUnique({ where: { id } });

  if (!artifact) {
    return apiError('NOT_FOUND', 'Artifact not found', 404);
  }
  if (artifact.userId !== session.user.id) {
    return apiError('FORBIDDEN', 'Access denied', 403);
  }

  // S1-08: Reject PUT on non-terminal artifact status
  if (['generating', 'failed'].includes(artifact.status)) {
    return apiError('CONFLICT', 'Cannot modify non-terminal artifact', 409);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateArtifactSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten());
  }

  const updated = await db.artifact.update({
    where: { id },
    data: {
      content: parsed.data.content,
    },
  });

  return NextResponse.json({ artifact: stripArtifactCost(updated) });
}
