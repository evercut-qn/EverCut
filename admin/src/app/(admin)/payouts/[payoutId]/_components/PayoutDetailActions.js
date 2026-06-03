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
    return null;
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
    <button
      onClick={retry}
      disabled={isPending}
      className="inline-flex h-8 items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 disabled:opacity-50 cursor-pointer"
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
      Retry Cashfree Payout
    </button>
  );
}

export default PayoutDetailActions;
