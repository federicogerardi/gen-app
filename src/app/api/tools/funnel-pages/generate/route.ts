import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { createArtifactStream } from '@/lib/llm/streaming';
import {
  buildFunnelOptinPrompt,
  buildFunnelQuizPrompt,
  buildFunnelVslPrompt,
} from '@/lib/tool-prompts/funnel-pages';

const ALLOWED_MODELS = ['openai/gpt-4-turbo', 'anthropic/claude-3-opus', 'mistralai/mistral-large'];

const schema = z.object({
  projectId: z.string().cuid(),
  model: z.string().refine((m) => ALLOWED_MODELS.includes(m), { message: 'Unsupported model' }),
  tone: z.enum(['professional', 'casual', 'formal', 'technical']),
  step: z.enum(['optin', 'quiz', 'vsl']),
  product: z.string().min(3),
  audience: z.string().min(3),
  offer: z.string().min(3),
  promise: z.string().min(3),
  notes: z.string().optional(),
  optinOutput: z.string().optional(),
  quizOutput: z.string().optional(),
});

function getLengthByStep(step: 'optin' | 'quiz' | 'vsl') {
  if (step === 'optin') return 1200;
  if (step === 'quiz') return 1400;
  return 3200;
}

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

  const payload = parsed.data;

  if (payload.step === 'quiz' && !payload.optinOutput) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'optinOutput is required for quiz step' } }, { status: 400 });
  }
  if (payload.step === 'vsl' && (!payload.optinOutput || !payload.quizOutput)) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'optinOutput and quizOutput are required for vsl step' } }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } }, { status: 401 });
  }
  if (user.monthlyUsed >= user.monthlyQuota) {
    await db.quotaHistory.create({
      data: { userId, requestCount: 1, costUSD: 0, model: payload.model, artifactType: 'content', status: 'rate_limited' },
    });
    return NextResponse.json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Monthly quota exhausted' } }, { status: 429 });
  }

  if (Number(user.monthlySpent) >= Number(user.monthlyBudget)) {
    await db.quotaHistory.create({
      data: { userId, requestCount: 1, costUSD: 0, model: payload.model, artifactType: 'content', status: 'rate_limited' },
    });
    return NextResponse.json({ error: { code: 'PAYMENT_REQUIRED', message: 'Monthly budget exhausted' } }, { status: 402 });
  }

  const { allowed } = await rateLimit(userId);
  if (!allowed) {
    await db.quotaHistory.create({
      data: { userId, requestCount: 1, costUSD: 0, model: payload.model, artifactType: 'content', status: 'rate_limited' },
    });
    return NextResponse.json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } }, { status: 429 });
  }

  const project = await db.project.findUnique({ where: { id: payload.projectId } });
  if (!project) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, { status: 404 });
  }
  if (project.userId !== userId) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
  }

  let prompt = '';
  if (payload.step === 'optin') {
    prompt = await buildFunnelOptinPrompt(payload);
  } else if (payload.step === 'quiz') {
    prompt = await buildFunnelQuizPrompt({ ...payload, optinOutput: payload.optinOutput! });
  } else {
    prompt = await buildFunnelVslPrompt({ ...payload, optinOutput: payload.optinOutput!, quizOutput: payload.quizOutput! });
  }

  try {
    const stream = await createArtifactStream({
      userId,
      projectId: payload.projectId,
      type: 'content',
      workflowType: 'funnel_pages',
      model: payload.model,
      promptOverride: prompt,
      input: {
        topic: prompt,
        tone: payload.tone,
        length: getLengthByStep(payload.step),
        outputFormat: payload.step === 'vsl' ? 'plain' : 'json',
        workflowType: 'funnel_pages',
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
