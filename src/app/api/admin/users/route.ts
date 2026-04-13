import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getRequestLogger } from '@/lib/logger';
import { requireAdminUser } from '@/lib/tool-routes/guards';

/**
 * Pagination schema for admin users list
 * - limit: number of users per page (default 20, max 100)
 * - offset: skip N users (default 0)
 */
const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const routeLogger = getRequestLogger({
    requestId,
    route: '/api/admin/users',
    method: 'GET',
  });

  const adminResult = await requireAdminUser();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const userId = adminResult.data.userId;

  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const parsed = paginationSchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pagination parameters',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  const { limit, offset } = parsed.data;
  const logger = routeLogger.child({ userId, limit, offset });

  try {
    // Fetch total count and paginated users in parallel
    const [total, users] = await Promise.all([
      db.user.count(),
      db.user.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          monthlyQuota: true,
          monthlyUsed: true,
          monthlyBudget: true,
          monthlySpent: true,
          resetDate: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      users,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    logger.error({ err }, 'Admin users list error');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' } },
      { status: 500 },
    );
  }
}
