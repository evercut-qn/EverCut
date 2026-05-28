import { cookies } from 'next/headers';
import { decodeJWTPayload } from './jwt';

/**
 * Server-side helper to retrieve the access token, check its validity and expiry.
 * Read-only helper: does not mutate cookies or refresh tokens.
 * Safe to call from Server Components, Actions, and Route Handlers.
 *
 * @returns {Promise<string|null>} Valid access token or null if expired/absent
 */
export async function getValidAccessToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('evercut_admin_session')?.value;

  if (!token) return null;

  const payload = decodeJWTPayload(token);
  if (!payload) return null;

  // Check expiry with a 30-second clock-drift buffer
  const isExpired = payload.exp * 1000 - 30000 < Date.now();
  if (isExpired) return null;

  return token;
}
