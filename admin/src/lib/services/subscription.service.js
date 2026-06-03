import { apiFetch } from '@/lib/api-client';
import { buildQuery } from './query';

export async function getSubscriptionSummary(token) {
  return apiFetch('/subscriptions/summary', { method: 'GET', token });
}

export async function getSubscriptions({
  page = 1,
  limit = 20,
  planId = '',
  status = '',
  token,
} = {}) {
  return apiFetch(`/subscriptions${buildQuery({ page, limit, planId, status })}`, {
    method: 'GET',
    token,
  });
}
