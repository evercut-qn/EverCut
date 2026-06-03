import { apiFetch } from '@/lib/api-client';

/**
 * Retrieves a list of payout transactions.
 *
 * @param {Object} params - Query filters
 * @param {number} [params.page=1] - Page number offset
 * @param {number} [params.limit=20] - Page size limit
 * @param {string} [params.status] - Filter by transaction status
 * @param {string} [params.gateway] - Filter by gateway
 * @param {string} [params.barberId] - Filter by barber ID
 * @param {string} [params.startDate] - Inclusive creation date lower bound
 * @param {string} [params.endDate] - Inclusive creation date upper bound
 * @param {string} [params.sort] - Backend sort expression
 * @param {string} params.token - Session JWT
 * @returns {Promise<{success: boolean, message: string, data?: Array, meta?: Object, errors?: Array}>} Response list
 */
export async function getPayouts({
  page = 1,
  limit = 20,
  status = '',
  gateway = '',
  barberId = '',
  startDate = '',
  endDate = '',
  sort = 'createdAt:desc',
  token,
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status) query.set('status', status);
  if (gateway) query.set('gateway', gateway);
  if (barberId) query.set('barberId', barberId);
  if (startDate) query.set('startDate', startDate);
  if (endDate) query.set('endDate', endDate);
  if (sort) query.set('sort', sort);

  // Map directly to backend `/payouts`
  return apiFetch(`/payouts?${query.toString()}`, {
    method: 'GET',
    token,
  });
}

/**
 * Retrieves aggregated pending payouts by barber.
 *
 * @param {Object} params - Query parameters
 * @param {number} [params.page=1] - Page offset
 * @param {number} [params.limit=20] - Size limit
 * @param {string} [params.search] - Search keywords
 * @param {string} params.token - Session JWT
 * @returns {Promise<{success: boolean, message: string, data?: Array, meta?: Object}>} Response list
 */
export async function getPendingPayouts({ page = 1, limit = 20, search = '', token }) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) query.set('search', search);

  return apiFetch(`/payouts/pending?${query.toString()}`, {
    method: 'GET',
    token,
  });
}

/**
 * Retrieves a single payout transaction with populated relations.
 *
 * @param {string} payoutId - Payout transaction ID
 * @param {string} token - Session JWT
 * @returns {Promise<{success: boolean, message: string, data?: Object, errors?: Array}>}
 */
export async function getPayoutDetail(payoutId, token) {
  return apiFetch(`/payouts/${payoutId}`, {
    method: 'GET',
    token,
  });
}

/**
 * Submits a new manual payout request to record a manual payment.
 *
 * @param {Object} payload - Manual payout parameters
 * @param {string} payload.barberId - Target barber ID
 * @param {Array<string>} payload.bookingIds - Associated booking IDs
 * @param {string} payload.utr - UTR transaction reference
 * @param {string} [payload.transferMode] - Transfer mode (upi, imps, neft, rtgs, banktransfer)
 * @param {string} [payload.notes] - Admin notes
 * @param {string} token - Session JWT
 * @returns {Promise<{success: boolean, message: string, data?: Object, errors?: Array}>} Response payload
 */
export async function requestPayout(payload, token) {
  return apiFetch('/payouts', {
    method: 'POST',
    body: payload,
    token,
  });
}

/**
 * Retries a failed or reversed payout.
 *
 * @param {string} payoutId - Payout transaction ID
 * @param {string} token - Session JWT
 * @returns {Promise<{success: boolean, message: string, data?: Object}>} Response payload
 */
export async function retryPayout(payoutId, token) {
  return apiFetch(`/payouts/${payoutId}/retry`, {
    method: 'POST',
    token,
  });
}
