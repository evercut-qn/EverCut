import { apiFetch } from '@/lib/api-client';
import { buildQuery } from './query';

export async function getShopSummary(token) {
  return apiFetch('/shops/summary', { method: 'GET', token });
}

export async function getBarbers({ page = 1, limit = 20, search = '', isOpen = '', isActive = '', token } = {}) {
  return apiFetch(`/barbers${buildQuery({ page, limit, search, isOpen, isActive })}`, {
    method: 'GET',
    token,
  });
}

export async function getBarberDetail(barberId, token) {
  return apiFetch(`/barbers/${barberId}`, {
    method: 'GET',
    token,
  });
}
