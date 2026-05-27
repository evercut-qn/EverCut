'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { handleRetryPayoutAction } from '../../_actions/payout.action';

export function PayoutDetailActions({ payout }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const status = String(payout?.status || '').toUpperCase();
  const isCashfreeRetryable = payout?.gateway === 'cashfree' && ['FAILED', 'REVERSED'].includes(status);

  if (!isCashfreeRetryable) {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        No administrative action is available for this payout state.
      </div>
    );
  }

  function retry() {
    startTransition(async () => {
      const result = await handleRetryPayoutAction(payout.id);
      if (result.success) {
        toast.success(result.message || 'Payout retry initiated.');
        router.refresh();
      } else {
        toast.error(result.message || 'Retry failed.');
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-4">
      <button
        onClick={retry}
        disabled={isPending}
        className="inline-flex h-9 items-center gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 text-sm font-semibold text-amber-600 hover:bg-amber-500/20 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Retry Cashfree payout
      </button>
    </div>
  );
}

export default PayoutDetailActions;
