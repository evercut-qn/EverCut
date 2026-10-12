import { NextResponse } from 'next/server';
import { refreshTokens } from './lib/refresh';
import { decodeJWTPayload } from './lib/jwt';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|screenshots|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};

const PUBLIC_PATHS = ['/login', '/adminevercut'];

/**
 * Proxy Middleware to enforce administration authorization
 * and perform background session/token refresh when access tokens expire.
 */
export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const isPublicPath = pathname === '/' || pathname.startsWith('/screenshots') || PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  const token = request.cookies.get('evercut_admin_session')?.value;
  const refreshTokenVal = request.cookies.get('evercut_admin_refresh_token')?.value;

  // Validate active session
  let payload = decodeJWTPayload(token);
  let isExpired = payload ? payload.exp * 1000 - 30000 < Date.now() : true;
  let isValidAdmin = payload && payload.role === 'ADMIN';

  // 1. Unauthenticated or expired with no refresh token -> redirect to /login
  if ((!payload || isExpired) && !refreshTokenVal) {
    if (isPublicPath) return NextResponse.next();
    
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Expired or missing session but refresh token is present -> trigger refresh
  if ((!token || isExpired) && refreshTokenVal) {
    const newTokens = await refreshTokens(refreshTokenVal);

    if (newTokens?.accessToken) {
      // Reconstruct cookies and write request headers for downstream RSCs
      request.cookies.set('evercut_admin_session', newTokens.accessToken);
      if (newTokens.refreshToken) {
        request.cookies.set('evercut_admin_refresh_token', newTokens.refreshToken);
      }

      const cookieHeader = request.cookies.getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('cookie', cookieHeader);
      requestHeaders.set('x-user-token', newTokens.accessToken);

      // Create the single response object passing the modified headers
      const response = isPublicPath 
        ? NextResponse.redirect(new URL('/overview', request.url))
        : NextResponse.next({
            request: { headers: requestHeaders },
          });

      // Update response cookies on the SAME response object for browser storage
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      };
      
      const newClaims = decodeJWTPayload(newTokens.accessToken);
      const tokenDuration = newTokens.expiresIn || (newClaims?.exp ? (newClaims.exp - (newClaims.iat || Math.floor(Date.now() / 1000))) : 900);

      response.cookies.set('evercut_admin_session', newTokens.accessToken, {
        ...cookieOptions,
        maxAge: tokenDuration,
      });

      if (newTokens.refreshToken) {
        const refreshDuration = newTokens.refreshExpiresIn || (60 * 60 * 24 * 30);
        response.cookies.set('evercut_admin_refresh_token', newTokens.refreshToken, {
          ...cookieOptions,
          maxAge: refreshDuration,
        });
      }

      return response;
    }

    // Refresh failed -> clear cookies and send to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('evercut_admin_session', '', { path: '/', maxAge: -1 });
    response.cookies.set('evercut_admin_refresh_token', '', { path: '/', maxAge: -1 });
    return response;
  }

  // 3. Authenticated session loading login -> redirect to overview
  if (isValidAdmin && !isExpired && isPublicPath) {
    return NextResponse.redirect(new URL('/overview', request.url));
  }

  // 4. Authenticated but not an admin -> reject session
  if (payload && !isValidAdmin) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('evercut_admin_session', '', { path: '/', maxAge: -1 });
    response.cookies.set('evercut_admin_refresh_token', '', { path: '/', maxAge: -1 });
    return response;
  }

  return NextResponse.next();
}

export default proxy;
