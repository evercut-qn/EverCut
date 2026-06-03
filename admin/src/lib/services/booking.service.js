import { apiFetch } from '@/lib/api-client';
import { buildQuery } from './query';

export async function getBookingSummary(token) {
  return apiFetch('/bookings/summary', { method: 'GET', token });
}

export async function getBookings({
  page = 1,
  limit = 20,
  search = '',
  status = '',
  paymentStatus = '',
  payoutStatus = '',
  dateFrom = '',
  dateTo = '',
  token,
} = {}) {
  return apiFetch(`/bookings${buildQuery({
    page,
    limit,
    search,
    status,
    paymentStatus,
    payoutStatus,
    dateFrom,
    dateTo,
  })}`, {
    method: 'GET',
    token,
  });
}

export async function getBookingDetail(bookingId, token) {
  return apiFetch(`/bookings/${bookingId}`, { method: 'GET', token });
}
