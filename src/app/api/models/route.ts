import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRequestLogger } from '@/lib/logger';
import { getModelPricingStaleness, listPublicModels } from '@/lib/llm/model-registry';
import { apiError } from '@/lib/tool-routes/responses';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const log = getRequestLogger({
    requestId: crypto.randomUUID(),
    route: '/api/models',
    method: 'GET',
    userId: session.user.id,
  });

  const [models, pricing] = await Promise.all([
    listPublicModels(),
    getModelPricingStaleness(),
  ]);

  if (pricing.stale) {
    log.warn(
      {
        pricing,
      },
      'Model pricing metadata is stale',
    );
  }

  return NextResponse.json({
    models,
    pricing,
  });
}
