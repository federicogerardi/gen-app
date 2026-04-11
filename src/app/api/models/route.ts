import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRequestLogger } from '@/lib/logger';
import { SUPPORTED_MODELS, MODEL_METADATA, getPricingStaleness } from '@/lib/llm/models';

const MODELS = SUPPORTED_MODELS.map((id) => ({
  id,
  ...MODEL_METADATA[id],
}));

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  const pricing = getPricingStaleness();
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
    models: MODELS,
    pricing,
  });
}
