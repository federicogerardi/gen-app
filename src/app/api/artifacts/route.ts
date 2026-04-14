import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { apiError } from '@/lib/tool-routes/responses';
import { stripArtifactCost } from '@/lib/api/artifact-serializer';

const querySchema = z.object({
  projectId: z.string().cuid().optional(),
  status: z.enum(['generating', 'completed', 'failed']).optional(),
  type: z.enum(['content', 'seo', 'code', 'extraction']).optional(),
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

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query', 400, parsed.error.flatten());
  }

  const { projectId, status, type, limit, offset } = parsed.data;

  if (projectId) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return apiError('NOT_FOUND', 'Project not found', 404);
    }
    if (project.userId !== session.user.id) {
      return apiError('FORBIDDEN', 'Access denied', 403);
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
