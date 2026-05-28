'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { handleRetryPayoutAction } from '../_actions/payout.action';
import { PayoutGatewayBadge, PayoutStatusBadge } from './shared/PayoutBadges';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { formatCurrency, formatDateTime, getPayoutRecipientName } from './shared/payout-format';

export function PayoutsTable({ initialData = [], pagination, defaultLimit = 20 }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function retry(payoutId) {
    startTransition(async () => {
      const result = await handleRetryPayoutAction(payoutId);
      if (result.success) {
        toast.success(result.message || 'Payout retry initiated.');
        router.refresh();
      } else {
        toast.error(result.message || 'Retry failed.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="w-full overflow-x-auto rounded-md border border-border bg-card shadow-sm">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="p-4 font-semibold text-muted-foreground">Recipient</th>
              <th className="p-4 font-semibold text-muted-foreground">Amount</th>
              <th className="p-4 font-semibold text-muted-foreground">Status</th>
              <th className="p-4 font-semibold text-muted-foreground">Gateway</th>
              <th className="p-4 font-semibold text-muted-foreground">UTR / Transfer</th>
              <th className="p-4 font-semibold text-muted-foreground">Processed</th>
              <th className="p-4 text-right font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialData.length > 0 ? (
              initialData.map((payout) => {
                const status = String(payout.status || '').toUpperCase();
                const isCashfreeRetryable = payout.gateway === 'cashfree' && ['FAILED', 'REVERSED'].includes(status);

                return (
                  <tr key={payout.id} className="border-b border-border last:border-b-0 hover:bg-muted/10">
                    <td className="p-4 align-middle">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{getPayoutRecipientName(payout)}</span>
                        <span className="max-w-[220px] truncate font-mono text-[10px] text-muted-foreground">
                          {payout.barberId || payout.id}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 align-middle font-mono font-semibold text-foreground">
                      {formatCurrency(payout.amountInRupees, payout.amount)}
                    </td>
                    <td className="p-4 align-middle">
                      <PayoutStatusBadge status={payout.status} />
                    </td>
                    <td className="p-4 align-middle">
                      <PayoutGatewayBadge gateway={payout.gateway} />
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex max-w-[180px] flex-col">
                        <span className="truncate font-mono text-xs text-foreground">{payout.utr || '—'}</span>
                        <span className="truncate font-mono text-[10px] text-muted-foreground">{payout.transferId || '—'}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle text-xs text-muted-foreground">
                      {formatDateTime(payout.processedAt || payout.createdAt)}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/payouts/${payout.id}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded border border-border px-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>

                        {isCashfreeRetryable && (
                          <button
                            onClick={() => retry(payout.id)}
                            disabled={isPending}
                            className="inline-flex h-8 items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            Retry
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-12 text-center text-muted-foreground">
                  No payout transactions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls pagination={pagination} pageSize={defaultLimit} />
    </div>
  );
}

export default PayoutsTable;
