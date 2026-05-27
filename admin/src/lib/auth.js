import { cookies } from 'next/headers';

/**
 * Calls the backend /auth/token/refresh API to exchange the refresh token for a new token pair.
 *
 * @param {string} refreshToken - The active refresh token string
 * @returns {Promise<Object|null>} Token pair object or null on failure
 */
export async function refreshTokens(refreshToken) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const res = await fetch(`${apiUrl}/auth/token/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      return null;
    }

    const payload = await res.json();
    return payload.data;
  } catch (err) {
    return null;
  }
}

/**
 * Server-side helper to retrieve the access token, check its expiry,
 * perform a rolling refresh if expired, and update cookies dynamically.
 * Safe to call from Server Actions and Route Handlers.
 *
 * @returns {Promise<string|null>} Valid access token or null if unauthenticated
 */
export async function getValidAccessToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('evercut_admin_session')?.value;

  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    // Check if token has expired or is about to expire within 30 seconds
    const isExpired = payload.exp * 1000 - 30000 < Date.now();

    if (isExpired) {
      const refreshTokenVal = cookieStore.get('evercut_admin_refresh_token')?.value;
      if (refreshTokenVal) {
        const newTokens = await refreshTokens(refreshTokenVal);
        if (newTokens?.accessToken) {
          cookieStore.set('evercut_admin_session', newTokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: newTokens.expiresIn,
            path: '/',
          });
          cookieStore.set('evercut_admin_refresh_token', newTokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: newTokens.refreshExpiresIn,
            path: '/',
          });
          return newTokens.accessToken;
        }
      }

      // Refresh failed or no refresh token: clear credentials
      cookieStore.delete('evercut_admin_session');
      cookieStore.delete('evercut_admin_refresh_token');
      return null;
    }

    return token;
  } catch (e) {
    return null;
  }
}
