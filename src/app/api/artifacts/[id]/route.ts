import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

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
