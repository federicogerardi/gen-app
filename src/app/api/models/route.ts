import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SUPPORTED_MODELS, MODEL_METADATA } from '@/lib/llm/models';

const MODELS = SUPPORTED_MODELS.map((id) => ({
  id,
  ...MODEL_METADATA[id],
}));

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  return NextResponse.json({
    models: MODELS,
  });
}
