import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { createArtifactStream } from '@/lib/llm/streaming';
import { z } from 'zod';

const ALLOWED_MODELS = ['openai/gpt-4-turbo', 'anthropic/claude-3-opus', 'mistralai/mistral-large'];
const ALLOWED_TYPES = ['content', 'seo', 'code'] as const;

const generateSchema = z.object({
  projectId: z.string().cuid(),
  type: z.enum(ALLOWED_TYPES),
  model: z.string().refine((m) => ALLOWED_MODELS.includes(m), { message: 'Unsupported model' }),
  input: z.record(z.unknown()),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  const userId = session.user.id;

  // Check quota
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } }, { status: 401 });
  }

  if (user.monthlyUsed >= user.monthlyQuota) {
    return NextResponse.json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Monthly quota exhausted' } }, { status: 429 });
  }

  const budgetNum = Number(user.monthlyBudget);
  const spentNum = Number(user.monthlySpent);
  if (spentNum >= budgetNum) {
    return NextResponse.json({ error: { code: 'PAYMENT_REQUIRED', message: 'Monthly budget exhausted' } }, { status: 402 });
  }

  // Redis rate limit
  const { allowed } = await rateLimit(userId);
  if (!allowed) {
    return NextResponse.json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } }, { status: 400 });
  }

  const { projectId, type, model, input } = parsed.data;

  // Verify project ownership
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });
  }
  if (project.userId !== userId) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
  }

  try {
    const stream = await createArtifactStream({ userId, projectId, type, model, input });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch {
    return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'LLM service unavailable' } }, { status: 503 });
  }
}
