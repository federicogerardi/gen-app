import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const projectWithArtifactsSelect = {
  id: true,
  userId: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  artifacts: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      userId: true,
      projectId: true,
      type: true,
      workflowType: true,
      model: true,
      input: true,
      content: true,
      status: true,
      failureReason: true,
      inputTokens: true,
      outputTokens: true,
      streamedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

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
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    select: projectWithArtifactsSelect,
  });

  if (!project) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });
  }
  if (project.userId !== session.user.id) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
  }

  return NextResponse.json({
    project: {
      ...project,
      artifacts: project.artifacts.map((artifact) => stripArtifactCost(artifact)),
    },
  });
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
  const project = await db.project.findUnique({ where: { id } });

  if (!project) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });
  }
  if (project.userId !== session.user.id) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } }, { status: 400 });
  }

  const updated = await db.project.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ project: updated });
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
  const project = await db.project.findUnique({ where: { id } });

  if (!project) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });
  }
  if (project.userId !== session.user.id) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
  }

  await db.project.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
