import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function MetricCard({ label, value, detail, icon: Icon, tone = 'primary' }) {
  const toneClass = {
    primary: 'bg-primary/10 border-primary/20 text-primary',
    green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
    red: 'bg-destructive/10 border-destructive/20 text-destructive',
    sky: 'bg-sky-500/10 border-sky-500/20 text-sky-600',
  }[tone] || 'bg-primary/10 border-primary/20 text-primary';

  return (
    <div className="flex min-h-28 items-center justify-between rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="min-w-0 space-y-1">
        <span className="block text-xs font-semibold text-muted-foreground">{label}</span>
        <div className="truncate font-mono text-2xl font-bold tracking-normal text-foreground">{value}</div>
        {detail && <p className="truncate text-[11px] font-medium text-muted-foreground">{detail}</p>}
      </div>
      {Icon && (
        <div className={cn('ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border', toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

export function SectionHeader({ title, description }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function ErrorNotice({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ title = 'No records found', description = 'Try adjusting the current filters.' }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function TableShell({ children }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
