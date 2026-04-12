import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const querySchema = z.object({
  projectId: z.string().cuid().optional(),
  status: z.enum(['generating', 'completed', 'failed']).optional(),
  type: z.enum(['content', 'seo', 'code']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const artifactListSelect = {
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
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  project: {
    select: { id: true, name: true },
  },
} as const;

function stripArtifactCost<T>(artifact: T): Omit<T, 'costUSD'> {
  const { costUSD: _costUSD, ...sanitizedArtifact } = artifact as T & { costUSD?: unknown };
  return sanitizedArtifact as Omit<T, 'costUSD'>;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: parsed.error.flatten() } }, { status: 400 });
  }

  const { projectId, status, type, limit, offset } = parsed.data;

  if (projectId) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });
    }
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }
  }

  const where = {
    userId: session.user.id,
    ...(projectId ? { projectId } : {}),
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  };

  const [items, total] = await Promise.all([
    db.artifact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      select: artifactListSelect,
    }),
    db.artifact.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((artifact) => stripArtifactCost(artifact)),
    total,
    limit,
    offset,
  });
}