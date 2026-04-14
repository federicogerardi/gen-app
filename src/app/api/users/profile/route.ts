import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiError } from '@/lib/tool-routes/responses';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
  });

  return NextResponse.json({ user });
}
