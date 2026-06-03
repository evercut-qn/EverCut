import { apiFetch } from '@/lib/api-client';
import { buildQuery } from './query';

export async function getCustomers({ page = 1, limit = 20, search = '', isActive = '', token } = {}) {
  return apiFetch(`/customers${buildQuery({ page, limit, search, isActive })}`, {
    method: 'GET',
    token,
  });
}
