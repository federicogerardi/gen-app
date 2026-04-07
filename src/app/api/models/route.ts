import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const MODELS = [
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', default: true },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', default: false },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', default: false },
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  return NextResponse.json({ models: MODELS });
}
