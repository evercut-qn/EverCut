import { cn } from '@/lib/utils/cn';

const toneByStatus = {
  active: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300',
  open: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300',
  success: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300',
  completed: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300',
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300',
  initiated: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
  inactive: 'bg-muted text-muted-foreground border-border',
  closed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

export function StatusBadge({ value, label }) {
  const key = String(value || '').toLowerCase();

  return (
    <span className={cn(
      'inline-flex h-6 items-center rounded border px-2 text-[11px] font-semibold uppercase tracking-normal',
      toneByStatus[key] || 'bg-muted text-muted-foreground border-border'
    )}>
      {label || String(value || 'unknown').replaceAll('_', ' ')}
    </span>
  );
}

export default StatusBadge;
