import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRequestLogger } from '@/lib/logger';
import { getModelPricingStaleness, listPublicModels } from '@/lib/llm/model-registry';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  const [models, pricing] = await Promise.all([
    listPublicModels(),
    getModelPricingStaleness(),
  ]);
  const log = getRequestLogger({
    requestId: crypto.randomUUID(),
    route: '/api/models',
    method: 'GET',
    userId: session.user.id,
  });

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
