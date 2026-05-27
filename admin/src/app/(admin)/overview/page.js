import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPayouts, getPendingPayouts } from '@/lib/services/payout.service';
import { CreditCard, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { getValidAccessToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Server Component: Administrative Operations Overview.
 * Displays metrics strictly computed from the active payouts backend API.
 */
export default async function OverviewPage() {
  const token = await getValidAccessToken();

  if (!token) {
    redirect('/login');
  }

  // Fetch actual payout ledgers & pending lists from backend
  const [payoutsRes, pendingRes] = await Promise.all([
    getPayouts({ page: 1, limit: 100, token }),
    getPendingPayouts({ page: 1, limit: 100, token }),
  ]);

  const payouts = payoutsRes.success ? (Array.isArray(payoutsRes.data) ? payoutsRes.data : payoutsRes.data?.payouts || []) : [];
  const pendingItems = pendingRes.success ? (Array.isArray(pendingRes.data) ? pendingRes.data : pendingRes.data?.items || []) : [];

  // Compute actual metrics
  const settledPayouts = payouts.filter((p) => (p.status || '').toUpperCase() === 'SUCCESS');
  const totalSettledAmount = settledPayouts.reduce((sum, p) => {
    const amt = p.amountInRupees !== undefined ? p.amountInRupees : (p.amount ? p.amount / 100 : 0);
    return sum + amt;
  }, 0);

  const pendingBarbersCount = pendingItems.length;
  const totalPendingAmount = pendingItems.reduce((sum, item) => sum + (item.totalAmountInRupees || 0), 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight font-display text-foreground">Operations Overview</h1>
        <p className="text-sm text-muted-foreground">
          Real-time summary of administrative settlements, EOD payouts, and pending ledger status.
        </p>
      </div>

      {/* Actual Payout Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Settled Amount */}
        <div className="border border-border rounded-lg p-6 bg-card text-card-foreground shadow-sm flex items-center justify-between">
          <div className="space-y-1.5 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground select-none block">Total Settled Amount</span>
            <h3 className="text-2xl font-bold tracking-tight text-foreground truncate font-mono">
              ₹{totalSettledAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-emerald-500 font-semibold truncate leading-normal">
              {settledPayouts.length} successful payouts
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 2: Pending Settlements */}
        <div className="border border-border rounded-lg p-6 bg-card text-card-foreground shadow-sm flex items-center justify-between">
          <div className="space-y-1.5 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground select-none block">Pending Settlements</span>
            <h3 className="text-2xl font-bold tracking-tight text-foreground truncate font-mono">
              ₹{totalPendingAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-amber-500 font-semibold truncate leading-normal">
              {pendingBarbersCount} barber(s) outstanding
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 3: Active Payout Requests */}
        <div className="border border-border rounded-lg p-6 bg-card text-card-foreground shadow-sm flex items-center justify-between">
          <div className="space-y-1.5 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground select-none block">Total Ledger Items</span>
            <h3 className="text-2xl font-bold tracking-tight text-foreground truncate font-mono">
              {payouts.length}
            </h3>
            <p className="text-[10px] text-muted-foreground truncate leading-normal">
              All transactions logged
            </p>
          </div>
          <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-full shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Payouts Ledger Quick Link Section */}
      <div className="border border-border rounded-lg p-6 bg-card shadow-sm space-y-4">
        <h3 className="font-bold tracking-tight text-foreground text-sm">Ledger Navigation</h3>
        <p className="text-xs text-muted-foreground">
          View completed bank transfers, manage payment errors, check transaction IDs, or initiate manual settlements.
        </p>
        <div>
          <Link
            href="/payouts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            Go to Payouts Ledger
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
