import { apiFetch } from '@/lib/api-client';
import { buildQuery } from './query';

export async function getPaymentSummary(token) {
  return apiFetch('/payments/summary', { method: 'GET', token });
}

export async function getRefunds({
  page = 1,
  limit = 20,
  status = '',
  refundStatus = '',
  token,
} = {}) {
  return apiFetch(`/payments/refunds${buildQuery({ page, limit, status, refundStatus })}`, {
    method: 'GET',
    token,
  });
}
