import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { createArtifactStream } from '@/lib/llm/streaming';
import { getRequestLogger } from '@/lib/logger';
import { z } from 'zod';

const ALLOWED_MODELS = ['openai/gpt-4-turbo', 'anthropic/claude-3-opus', 'mistralai/mistral-large'];
const ALLOWED_TYPES = ['content', 'seo', 'code'] as const;

const generateSchema = z.object({
  projectId: z.string().cuid(),
  type: z.enum(ALLOWED_TYPES),
  model: z.string().refine((m) => ALLOWED_MODELS.includes(m), { message: 'Unsupported model' }),
  input: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const requestLogger = getRequestLogger({
    requestId,
    route: '/api/artifacts/generate',
    method: 'POST',
  });

  const session = await auth();
  if (!session?.user?.id) {
    requestLogger.warn({ reason: 'missing-session' }, 'Unauthorized artifact generation attempt');
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  const userId = session.user.id;
  const log = requestLogger.child({ userId });
  const body = await request.json().catch(() => null);
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    log.warn({ reason: 'validation-error' }, 'Artifact generation rejected due to invalid payload');
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } }, { status: 400 });
  }

  const { projectId, type, model, input } = parsed.data;

  // Check quota
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    log.warn({ reason: 'user-not-found' }, 'Artifact generation rejected because user record was missing');
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } }, { status: 401 });
  }

  if (user.monthlyUsed >= user.monthlyQuota) {
    log.info({ reason: 'quota-exhausted', monthlyUsed: user.monthlyUsed, monthlyQuota: user.monthlyQuota }, 'Artifact generation blocked by quota');
    await db.quotaHistory.create({
      data: { userId, requestCount: 1, costUSD: 0, model, artifactType: type, status: 'rate_limited' },
    });
    return NextResponse.json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Monthly quota exhausted' } }, { status: 429 });
  }

  const budgetNum = Number(user.monthlyBudget);
  const spentNum = Number(user.monthlySpent);
  if (spentNum >= budgetNum) {
    log.info({ reason: 'budget-exhausted', monthlySpent: spentNum, monthlyBudget: budgetNum }, 'Artifact generation blocked by budget');
    await db.quotaHistory.create({
      data: { userId, requestCount: 1, costUSD: 0, model, artifactType: type, status: 'rate_limited' },
    });
    return NextResponse.json({ error: { code: 'PAYMENT_REQUIRED', message: 'Monthly budget exhausted' } }, { status: 402 });
  }

  // Redis rate limit
  const { allowed } = await rateLimit(userId);
  if (!allowed) {
    log.info({ reason: 'rate-limited' }, 'Artifact generation blocked by rate limiter');
    await db.quotaHistory.create({
      data: { userId, requestCount: 1, costUSD: 0, model, artifactType: type, status: 'rate_limited' },
    });
    return NextResponse.json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } }, { status: 429 });
  }

  // Verify project ownership
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    log.warn({ reason: 'project-not-found', projectId }, 'Artifact generation rejected due to missing project');
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });
  }
  if (project.userId !== userId) {
    log.warn({ reason: 'ownership-mismatch', projectId }, 'Artifact generation rejected due to ownership mismatch');
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
  }

  try {
    log.info({ projectId, type, model }, 'Starting artifact stream generation');
    const stream = await createArtifactStream({ userId, projectId, type, model, input });

    log.info({ projectId, type, model }, 'Artifact stream initialized');
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'x-request-id': requestId,
      },
    });
  } catch (error) {
    log.error({ error, projectId, type, model }, 'Artifact generation failed with provider error');
    return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'LLM service unavailable' } }, { status: 503 });
  }
}
