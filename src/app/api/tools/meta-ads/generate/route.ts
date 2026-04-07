import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { createArtifactStream } from '@/lib/llm/streaming';
import { buildMetaAdsPrompt } from '@/lib/tool-prompts/meta-ads';

const ALLOWED_MODELS = ['openai/gpt-4-turbo', 'anthropic/claude-3-opus', 'mistralai/mistral-large'];

const schema = z.object({
  projectId: z.string().cuid(),
  model: z.string().refine((m) => ALLOWED_MODELS.includes(m), { message: 'Unsupported model' }),
  tone: z.enum(['professional', 'casual', 'formal', 'technical']),
  product: z.string().min(3),
  audience: z.string().min(3),
  offer: z.string().min(3),
  objective: z.string().min(3),
  angle: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } }, { status: 400 });
  }

  const { projectId, model, tone, product, audience, offer, objective, angle } = parsed.data;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } }, { status: 401 });
  }
  if (user.monthlyUsed >= user.monthlyQuota) {
    await db.quotaHistory.create({
      data: { userId, requestCount: 1, costUSD: 0, model, artifactType: 'content', status: 'rate_limited' },
    });
    return NextResponse.json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Monthly quota exhausted' } }, { status: 429 });
  }

  if (Number(user.monthlySpent) >= Number(user.monthlyBudget)) {
    await db.quotaHistory.create({
      data: { userId, requestCount: 1, costUSD: 0, model, artifactType: 'content', status: 'rate_limited' },
    });
    return NextResponse.json({ error: { code: 'PAYMENT_REQUIRED', message: 'Monthly budget exhausted' } }, { status: 402 });
  }

  const { allowed } = await rateLimit(userId);
  if (!allowed) {
    await db.quotaHistory.create({
      data: { userId, requestCount: 1, costUSD: 0, model, artifactType: 'content', status: 'rate_limited' },
    });
    return NextResponse.json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } }, { status: 429 });
  }

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });
  }
  if (project.userId !== userId) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
  }

  const prompt = await buildMetaAdsPrompt({ product, audience, offer, objective, angle });

  try {
    const stream = await createArtifactStream({
      userId,
      projectId,
      type: 'content',
      workflowType: 'meta_ads',
      model,
      input: {
        topic: prompt,
        tone,
        length: 1200,
        outputFormat: 'markdown',
        workflowType: 'meta_ads',
      },
    });

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
