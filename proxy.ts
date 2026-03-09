import { NextRequest, NextResponse } from 'next/server'

// Middleware runs in Edge runtime - check cookie only (no Prisma/Node.js)
// Full session validation happens in server components and API routes
export async function proxy(request: NextRequest) {
  const sessionToken = request.cookies.get('__Secure-better-auth.session_token') ||
    request.cookies.get('better-auth.session_token')

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register')

  if (!sessionToken && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
