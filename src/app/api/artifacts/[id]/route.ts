import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateArtifactSchema = z.object({
  content: z.string().min(1).max(100_000),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  const { id } = await params;
  const artifact = await db.artifact.findUnique({ where: { id } });

  if (!artifact) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Artifact not found' } }, { status: 404 });
  }
  if (artifact.userId !== session.user.id) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
  }

  return NextResponse.json({ artifact });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  const { id } = await params;
  const artifact = await db.artifact.findUnique({ where: { id } });

  if (!artifact) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Artifact not found' } }, { status: 404 });
  }
  if (artifact.userId !== session.user.id) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
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
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  const { id } = await params;
  const artifact = await db.artifact.findUnique({ where: { id } });

  if (!artifact) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Artifact not found' } }, { status: 404 });
  }
  if (artifact.userId !== session.user.id) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateArtifactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } }, { status: 400 });
  }

  const updated = await db.artifact.update({
    where: { id },
    data: {
      content: parsed.data.content,
      status: 'completed',
    },
  });

  return NextResponse.json({ artifact: updated });
}
