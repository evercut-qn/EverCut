'use server';

import { cookies } from 'next/headers';
import { verifyOTP } from '@/lib/services/auth.service';
import { verifyOTPSchema } from '@/lib/schemas/auth.schema';
import { decodeJWTPayload } from '@/lib/jwt';

/**
 * Server Action to check the OTP verification code and create the session cookie.
 *
 * @param {Object} payload - Login payload parameters
 * @param {string} payload.phone - Mobile number
 * @param {string} payload.code - 6-digit OTP code
 * @returns {Promise<{success: boolean, message: string, errors?: Array}>} Response state
 */
export async function handleLoginAction({ phone, code }) {
  try {
    // 1. Validate inputs server-side
    const validation = verifyOTPSchema.safeParse({ phone, code });
    if (!validation.success) {
      return {
        success: false,
        message: 'Invalid inputs. Please verify code parameters.',
        errors: validation.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }

    // 2. Call verification endpoint
    const result = await verifyOTP(phone, code);

    if (!result.success || !result.data?.accessToken) {
      return {
        success: false,
        message: result.message || 'Verification failed. Please try again.',
        errors: result.errors,
      };
    }

    // Decode token to verify administrative role
    const claims = decodeJWTPayload(result.data.accessToken);
    if (!claims || claims.role !== 'ADMIN') {
      return {
        success: false,
        message: 'Access denied: Only platform administrators are allowed.',
      };
    }

    // 3. Write secure session cookies
    const cookieStore = await cookies();
    const tokenDuration = result.data.expiresIn || (claims.exp ? (claims.exp - (claims.iat || Math.floor(Date.now() / 1000))) : 900);

    cookieStore.set('evercut_admin_session', result.data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: tokenDuration,
      path: '/',
    });

    if (result.data.refreshToken) {
      cookieStore.set('evercut_admin_refresh_token', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: result.data.refreshExpiresIn || (60 * 60 * 24 * 30),
        path: '/',
      });
    }

    return {
      success: true,
      message: 'Login successful.',
    };
  } catch (error) {
    return {
      success: false,
      message: 'An unexpected server error occurred during login. Please try again.',
    };
  }
}
