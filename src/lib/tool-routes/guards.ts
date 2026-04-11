import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { apiError } from './responses';

interface GuardError {
  ok: false;
  response: NextResponse;
}

interface GuardSuccess<T> {
  ok: true;
  data: T;
}

type GuardResult<T> = GuardError | GuardSuccess<T>;

export async function parseAndValidateRequest<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<GuardResult<z.infer<T>>> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      ok: false,
      response: apiError('VALIDATION_ERROR', 'Invalid input', 400, parsed.error.flatten()),
    };
  }

  return { ok: true, data: parsed.data };
}

export async function requireAuthenticatedUser(): Promise<GuardResult<{ userId: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: apiError('UNAUTHORIZED', 'Authentication required', 401),
    };
  }

  return { ok: true, data: { userId: session.user.id } };
}

export async function enforceUsageGuards(
  userId: string,
  model: string,
  artifactType: string = 'content',
): Promise<GuardResult<void>> {
  // Early rate limit check (before DB round-trip) to reject burst traffic cheaply
  const { allowed } = await rateLimit(userId);
  if (!allowed) {
    await db.quotaHistory.create({
      data: { userId, requestCount: 1, costUSD: 0, model, artifactType, status: 'rate_limited' },
    });

    return {
      ok: false,
      response: apiError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429),
    };
  }

  // Atomic transaction: check quota/budget + increment monthlyUsed
  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      if (user.monthlyUsed >= user.monthlyQuota) {
        throw new Error('QUOTA_EXHAUSTED');
      }

      if (Number(user.monthlySpent) >= Number(user.monthlyBudget)) {
        throw new Error('BUDGET_EXHAUSTED');
      }

      // Increment monthlyUsed inside transaction (atomicity guarantee)
      await tx.user.update({
        where: { id: userId },
        data: { monthlyUsed: { increment: 1 } },
      });
    });
  } catch (err) {
    if ((err as Error).message === 'USER_NOT_FOUND') {
      return {
        ok: false,
        response: apiError('UNAUTHORIZED', 'User not found', 401),
      };
    }
    if ((err as Error).message === 'QUOTA_EXHAUSTED') {
      await db.quotaHistory.create({
        data: { userId, requestCount: 1, costUSD: 0, model, artifactType, status: 'rate_limited' },
      });
      return {
        ok: false,
        response: apiError('RATE_LIMIT_EXCEEDED', 'Monthly quota exhausted', 429),
      };
    }
    if ((err as Error).message === 'BUDGET_EXHAUSTED') {
      await db.quotaHistory.create({
        data: { userId, requestCount: 1, costUSD: 0, model, artifactType, status: 'rate_limited' },
      });
      return {
        ok: false,
        response: apiError('PAYMENT_REQUIRED', 'Monthly budget exhausted', 402),
      };
    }
    throw err;
  }

  return { ok: true, data: undefined };
}

export async function requireOwnedProject(projectId: string, userId: string): Promise<GuardResult<void>> {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return {
      ok: false,
      response: apiError('NOT_FOUND', 'Project not found', 404),
    };
  }

  if (project.userId !== userId) {
    return {
      ok: false,
      response: apiError('FORBIDDEN', 'Access denied', 403),
    };
  }

  return { ok: true, data: undefined };
}
