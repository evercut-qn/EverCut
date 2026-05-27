'use server';

import { revalidatePath } from 'next/cache';
import { requestPayout, approvePayoutService } from '@/lib/services/payout.service';
import { createPayoutSchema } from '@/lib/schemas/payout.schema';
import { getValidAccessToken } from '@/lib/auth';

/**
 * Server Action: Submits a manual payout request.
 *
 * @param {Object} formData - Form parameters containing barberId, amount, note, and payoutMethod
 * @returns {Promise<{success: boolean, message: string, errors?: Array}>} Response state
 */
export async function handleRequestPayoutAction(formData) {
  try {
    const token = await getValidAccessToken();

    if (!token) {
      return { success: false, message: 'Unauthenticated session.' };
    }

    // Role check: superadmin or finance
    const parts = token.split('.');
    const claims = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    const ALLOWED_ROLES = ['ADMIN'];
    if (!ALLOWED_ROLES.includes(claims.role)) {
      return {
        success: false,
        message: 'Forbidden: You do not have permission to execute payout requests.',
      };
    }

    // Validate parameters
    const validation = createPayoutSchema.safeParse(formData);
    if (!validation.success) {
      return {
        success: false,
        message: 'Validation failed.',
        errors: validation.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }

    // Call service dispatch
    const result = await requestPayout(validation.data, token);

    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Failed to request payout.',
        errors: result.errors,
      };
    }

    revalidatePath('/payouts');
    return {
      success: true,
      message: 'Payout request successfully dispatched.',
    };
  } catch (error) {
    return {
      success: false,
      message: 'A server error occurred while processing payout requests.',
    };
  }
}

/**
 * Server Action: Approves a pending payout.
 *
 * @param {string} payoutId - Target transaction ID
 * @returns {Promise<{success: boolean, message: string}>} Response state
 */
export async function handleApprovePayoutAction(payoutId) {
  try {
    const token = await getValidAccessToken();

    if (!token) {
      return { success: false, message: 'Unauthenticated session.' };
    }

    // Role check: superadmin or finance
    const parts = token.split('.');
    const claims = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    const ALLOWED_ROLES = ['ADMIN'];
    if (!ALLOWED_ROLES.includes(claims.role)) {
      return {
        success: false,
        message: 'Forbidden: You do not have permission to approve payout transactions.',
      };
    }

    const result = await approvePayoutService(payoutId, token);

    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Failed to approve payout.',
      };
    }

    revalidatePath('/payouts');
    return {
      success: true,
      message: 'Payout transaction successfully approved.',
    };
  } catch (error) {
    return {
      success: false,
      message: 'A server error occurred while approving payout.',
    };
  }
}
