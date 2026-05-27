import { NextResponse } from 'next/server';
import { refreshTokens } from './lib/auth';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
};

const PUBLIC_PATHS = ['/login'];

/**
 * Edge Proxy to enforce authentication and verify role routing rules.
 * Automatically performs rolling refreshes using the refresh token if the session expires.
 *
 * @param {import('next/server').NextRequest} request - Incoming request context
 * @returns {NextResponse} Result routing response
 */
export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('evercut_admin_session')?.value;

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  // 1. Unauthenticated session trying to load private files
  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Active session loading public auth path
  if (token && isPublicPath) {
    return NextResponse.redirect(new URL('/overview', request.url));
  }

  // 3. Evaluate active session state
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const isExpired = payload.exp * 1000 - 30000 < Date.now(); // 30s buffer

        if (isExpired) {
          const refreshTokenVal = request.cookies.get('evercut_admin_refresh_token')?.value;
          if (refreshTokenVal) {
            const newTokens = await refreshTokens(refreshTokenVal);
            if (newTokens?.accessToken) {
              const response = NextResponse.next();
              response.cookies.set('evercut_admin_session', newTokens.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: newTokens.expiresIn,
                path: '/',
              });
              response.cookies.set('evercut_admin_refresh_token', newTokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: newTokens.refreshExpiresIn,
                path: '/',
              });
              return response;
            }
          }

          // Refresh failed: clear cookies and redirect
          const response = NextResponse.redirect(new URL('/login', request.url));
          response.cookies.delete('evercut_admin_session');
          response.cookies.delete('evercut_admin_refresh_token');
          return response;
        }

        // Enforce administrative role for all dashboard pages
        if (payload.role !== 'ADMIN') {
          const response = NextResponse.redirect(new URL('/login', request.url));
          response.cookies.delete('evercut_admin_session');
          response.cookies.delete('evercut_admin_refresh_token');
          return response;
        }
      }
    } catch (e) {
      // Decode failed: clear cookies and redirect
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('evercut_admin_session');
      response.cookies.delete('evercut_admin_refresh_token');
      return response;
    }
  }

  return NextResponse.next();
}
export default proxy;
