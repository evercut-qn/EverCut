import { apiFetch } from '@/lib/api-client';

/**
 * Sends a POST request to request an OTP code for an administrative phone number.
 *
 * @param {string} phone - 10-digit Indian mobile number
 * @returns {Promise<{success: boolean, message: string, errors?: Array}>} Unified response payload
 */
export async function requestOTP(phone) {
  return apiFetch('/auth/otp/send', {
    method: 'POST',
    body: { mobile: phone },
  });
}

/**
 * Sends a POST request to verify the 6-digit OTP code.
 * Returns the session profile and JWT token on success.
 *
 * @param {string} phone - 10-digit Indian mobile number
 * @param {string} code - 6-digit OTP verification code
 * @returns {Promise<{success: boolean, message: string, data?: {token: string, user: Object}, errors?: Array}>} Unified response
 */
export async function verifyOTP(phone, code) {
  return apiFetch('/auth/otp/verify', {
    method: 'POST',
    body: { mobile: phone, otp: code },
  });
}
