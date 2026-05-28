'use server';

import { revalidatePath } from 'next/cache';
import { requestPayout, retryPayout } from '@/lib/services/payout.service';
import { createPayoutSchema } from '@/lib/schemas/payout.schema';
import { objectIdSchema } from '@/lib/schemas/common.schema';
import { getValidAccessToken } from '@/lib/auth';
import { decodeJWTPayload } from '@/lib/jwt';

async function requireAdminToken() {
  const token = await getValidAccessToken();

  if (!token) {
    return { error: { success: false, message: 'Unauthenticated session.' } };
  }

  const claims = decodeJWTPayload(token);
  if (!claims) {
    return { error: { success: false, message: 'Invalid administrative session.' } };
  }
  if (claims.role !== 'ADMIN') {
    return {
      error: {
        success: false,
        message: 'Forbidden: You do not have permission to manage payouts.',
      },
    };
  }

  return { token };
}

/**
 * Server Action: Records a completed manual payout settlement.
 *
 * @param {Object} formData - Form parameters containing barberId, bookingIds, UTR, transfer mode, and notes
 * @returns {Promise<{success: boolean, message: string, errors?: Array}>} Response state
 */
export async function handleRequestPayoutAction(formData) {
  try {
    const { token, error } = await requireAdminToken();
    if (error) return error;

    // Validate parameters
    const validation = createPayoutSchema.safeParse(formData);
    if (!validation.success) {
      const issues = validation.error.issues || validation.error.errors || [];
      return {
        success: false,
        message: 'Validation failed.',
        errors: issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }

    const result = await requestPayout(validation.data, token);

    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Failed to record manual payout.',
        errors: result.errors,
      };
    }

    revalidatePath('/payouts');
    return {
      success: true,
      message: 'Manual payout recorded successfully.',
    };
  } catch (error) {
    return {
      success: false,
      message: 'A server error occurred while recording manual payout.',
    };
  }
}

/**
 * Server Action: Retries a failed or reversed automatic payout.
 *
 * @param {string} payoutId - Target payout transaction ID
 * @returns {Promise<{success: boolean, message: string}>} Response state
 */
export async function handleRetryPayoutAction(payoutId) {
  try {
    const payoutIdValidation = objectIdSchema.safeParse(payoutId);
    if (!payoutIdValidation.success) {
      return {
        success: false,
        message: 'Invalid payout ID.',
      };
    }

    const { token, error } = await requireAdminToken();
    if (error) return error;

    const result = await retryPayout(payoutIdValidation.data, token);

    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Failed to retry payout.',
      };
    }

    revalidatePath('/payouts');
    revalidatePath(`/payouts/${payoutIdValidation.data}`);
    return {
      success: true,
      message: 'Payout retry initiated.',
    };
  } catch (error) {
    return {
      success: false,
      message: 'A server error occurred while retrying payout.',
    };
  }
}
