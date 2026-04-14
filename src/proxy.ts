import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const PUBLIC_PATHS = new Set(['/']);

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const isPlaywrightBypass = process.env.NODE_ENV !== 'production' && process.env.PLAYWRIGHT_AUTH_BYPASS === '1';

  if (isPlaywrightBypass) {
    return NextResponse.next();
  }

  const isAuthenticated = Boolean(request.auth);
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL('/', request.nextUrl.origin));
  }

  if (isAuthenticated && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};