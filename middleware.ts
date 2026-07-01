import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionToken = request.cookies.get('session')?.value;
  const payload = sessionToken ? await decrypt(sessionToken) : null;

  // Protect Admin Routes
  if (pathname.startsWith('/admin')) {
    if (!payload || payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Protect Student Routes
  if (pathname.startsWith('/student') || pathname.startsWith('/exam')) {
    if (!payload || payload.role !== 'student') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect authenticated users away from login/register to their dashboard
  if (pathname === '/login' || pathname === '/register') {
    if (payload) {
      if (payload.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else {
        return NextResponse.redirect(new URL('/student', request.url));
      }
    }
  }

  // For API routes, no extra logic needed here for now
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/student/:path*', '/exam/:path*', '/login', '/register'],
};
