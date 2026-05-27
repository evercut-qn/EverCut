export const PAYOUT_STATUS_OPTIONS = [
  { value: 'INITIATED', label: 'Initiated' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REVERSED', label: 'Reversed' },
];

export const PAYOUT_GATEWAY_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'cashfree', label: 'Cashfree' },
];

export const PAYOUT_SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'amount:desc', label: 'Amount high to low' },
  { value: 'amount:asc', label: 'Amount low to high' },
  { value: 'processedAt:desc', label: 'Processed newest' },
  { value: 'processedAt:asc', label: 'Processed oldest' },
];

export const TRANSFER_MODE_OPTIONS = [
  { value: 'upi', label: 'UPI' },
  { value: 'imps', label: 'IMPS' },
  { value: 'neft', label: 'NEFT' },
  { value: 'rtgs', label: 'RTGS' },
  { value: 'banktransfer', label: 'Bank transfer' },
];

export function formatCurrency(amountInRupees, amountInPaisa) {
  const value = Number.isFinite(Number(amountInRupees))
    ? Number(amountInRupees)
    : Number(amountInPaisa || 0) / 100;

  return `₹${value.toLocaleString('en-IN', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  })}`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getPayoutRecipientName(payout) {
  const barber = payout?.barber;
  if (barber) {
    return barber.accountHolderName || `${barber.firstName || ''} ${barber.lastName || ''}`.trim() || 'Unknown barber';
  }
  return payout?.barberName || payout?.accountHolderName || 'Unknown barber';
}

export function getPagination(meta, fallback = {}) {
  return {
    currentPage: meta?.pagination?.currentPage || fallback.page || 1,
    totalPages: meta?.pagination?.totalPages || fallback.totalPages || 1,
    totalDocuments: meta?.pagination?.totalDocuments ?? fallback.totalDocuments ?? 0,
    hasNextPage: Boolean(meta?.pagination?.hasNextPage),
    hasPrevPage: Boolean(meta?.pagination?.hasPrevPage),
  };
}
