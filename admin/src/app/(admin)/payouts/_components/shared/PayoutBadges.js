import { cn } from '@/lib/utils/cn';

const STATUS_CLASSES = {
  INITIATED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  SUCCESS: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  FAILED: 'bg-destructive/10 text-destructive border-destructive/20',
  REVERSED: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
};

const GATEWAY_CLASSES = {
  manual: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  cashfree: 'bg-muted text-muted-foreground border-border',
};

export function PayoutStatusBadge({ status }) {
  const normalized = String(status || 'PENDING').toUpperCase();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        STATUS_CLASSES[normalized] || 'bg-muted text-muted-foreground border-border',
      )}
    >
      {normalized.toLowerCase()}
    </span>
  );
}

export function PayoutGatewayBadge({ gateway }) {
  const normalized = String(gateway || 'cashfree').toLowerCase();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase',
        GATEWAY_CLASSES[normalized] || GATEWAY_CLASSES.cashfree,
      )}
    >
      {normalized}
    </span>
  );
}
