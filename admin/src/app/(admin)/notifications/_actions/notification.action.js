'use server';

import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/services/notification.service';
import { notificationFormSchema, toNotificationPayload } from '@/lib/schemas/notification.schema';
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
        message: 'Forbidden: You do not have permission to manage notifications.',
      },
    };
  }

  return { token };
}

/**
 * Server Action: Creates and dispatches a broadcast notification.
 *
 * @param {Object} formData - Form parameters containing title, body, type, category, audienceMode, and dataJson
 * @returns {Promise<{success: boolean, message: string, data?: any, errors?: Array}>} Response state
 */
export async function handleCreateNotificationAction(formData) {
  try {
    const { token, error } = await requireAdminToken();
    if (error) return error;

    // Validate parameters
    const validation = notificationFormSchema.safeParse(formData);
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

    const payload = toNotificationPayload(validation.data);
    const result = await createNotification(payload, { token });

    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Failed to send broadcast notification.',
        errors: result.errors,
      };
    }

    revalidatePath('/notifications');
    return {
      success: true,
      message: 'Broadcast created. Dispatch is in progress.',
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'A server error occurred while sending notification.',
    };
  }
}
