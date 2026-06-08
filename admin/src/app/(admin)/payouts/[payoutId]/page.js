import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { 
  ArrowLeft, CalendarClock, CreditCard, ReceiptText, 
  UserRound, ShieldCheck, FileText, ClipboardList, 
  Activity, ArrowDown, HelpCircle, Check, Info, AlertTriangle,
  ChevronRight, CheckCircle2, AlertCircle, Clock, FileX
} from 'lucide-react';

import { getValidAccessToken } from '@/lib/auth';
import { getPayoutDetail } from '@/lib/services/payout.service';
import { objectIdSchema } from '@/lib/schemas/common.schema';
import { PayoutGatewayBadge, PayoutStatusBadge } from '../_components/shared/PayoutBadges';
import { formatCurrency, formatDateTime, getPayoutRecipientName } from '../_components/shared/payout-format';
import { PayoutDetailActions } from './_components/PayoutDetailActions';
import { SectionHeader } from '@/components/ui/AdminPrimitives';

export const dynamic = 'force-dynamic';

/**
 * Modern parameters table row.
 */
function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/40 last:border-b-0 gap-6">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      <span className={`text-xs text-foreground text-right truncate max-w-45 ${
        mono ? 'font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded text-[10px] tracking-tight' : 'font-medium'
      }`} title={value || ''}>
        {value || '—'}
      </span>
    </div>
  );
}

export default async function PayoutDetailPage({ params }) {
  const resolvedParams = await params;
  const payoutIdResult = objectIdSchema.safeParse(resolvedParams.payoutId);
  if (!payoutIdResult.success) {
    notFound();
  }

  const token = await getValidAccessToken();
  if (!token) {
    redirect('/login');
  }

  const response = await getPayoutDetail(payoutIdResult.data, token);
  if (!response.success) {
    if (/not found/i.test(response.message || '')) {
      notFound();
    }
    return (
      <div className="space-y-4">
        <Link href="/payouts?tab=history&page=1" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to payout history
        </Link>
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {response.message || 'Unable to load payout detail.'}
        </div>
      </div>
    );
  }

  const payout = response.data;
  const bookings = payout.bookings || [];
  const payments = payout.payments || [];

  // Reconcile and merge Bookings and Payments into a unified transaction ledger list
  const transactions = bookings.map((booking) => {
    const payment = payments.find((p) => p.bookingId === booking.id) || {};
    return {
      id: booking.id,
      date: booking.date,
      time: booking.time,
      bookingStatus: booking.status,
      paymentStatus: booking.paymentStatus,
      payoutStatus: booking.payoutStatus,
      customerPaid: payment.amountInRupees || booking.totalAmount || 0,
      platformFee: (payment.settlement?.platformFee || 0) / 100,
      barberPayout: (payment.settlement?.barberPayout || 0) / 100,
      settled: payment.settlement?.settled || false,
      merchantOrderId: payment.merchantOrderId || null,
    };
  });

  // Calculate dynamic settlement statistics
  const totalBookingAmount = transactions.reduce((sum, t) => sum + t.customerPaid, 0);
  const totalPlatformFees = transactions.reduce((sum, t) => sum + t.platformFee, 0);

  // Recipient initials for avatar
  const initials = (getPayoutRecipientName(payout) || 'B')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <SectionHeader title="Payout Detail" description={`Payout ID: ${payout.id}`} />
          <p className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-2">
            <span>Recipient:</span>
            <span className="font-semibold text-foreground font-sans">{getPayoutRecipientName(payout)}</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] select-all">{payout.barber?.upiId || payout.barberId}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <PayoutStatusBadge status={payout.status} />
          <PayoutGatewayBadge gateway={payout.gateway} />
          <PayoutDetailActions payout={payout} />
          <Link href="/payouts?tab=history&page=1" className="group inline-flex h-6 items-center gap-1 rounded border border-border bg-card px-2 text-[11px] font-semibold uppercase tracking-normal text-foreground transition-colors hover:bg-muted active:scale-95">
            <ArrowLeft className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Back to Payouts</span>
          </Link>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Net Disbursed */}
        <div className="border border-border rounded-xl p-5 bg-card text-card-foreground shadow-xs flex items-center justify-between">
          <div className="space-y-1.5 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground select-none block uppercase tracking-wider text-[10px]">Net Disbursed</span>
            <h3 className="text-2xl font-bold tracking-tight text-primary font-mono leading-none">
              {formatCurrency(payout.amountInRupees, payout.amount)}
            </h3>
            <p className="text-[10px] text-muted-foreground truncate leading-normal">
              Method: {payout.transferMode?.toUpperCase() || 'UPI'}
            </p>
          </div>
          <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-full shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: UTR Reference */}
        <div className="border border-border rounded-xl p-5 bg-card text-card-foreground shadow-xs flex items-center justify-between">
          <div className="space-y-1.5 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground select-none block uppercase tracking-wider text-[10px]">UTR / Reference ID</span>
            <h3 className="text-sm font-mono font-bold tracking-tight text-foreground truncate select-all py-1.5 leading-none" title={payout.utr || '—'}>
              {payout.utr || '—'}
            </h3>
            <p className="text-[10px] text-muted-foreground truncate leading-normal">
              ID: {payout.transferId || '—'}
            </p>
          </div>
          <div className="p-3 bg-muted border border-border text-muted-foreground rounded-full shrink-0">
            <ReceiptText className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: Processed Date */}
        <div className="border border-border rounded-xl p-5 bg-card text-card-foreground shadow-xs flex items-center justify-between">
          <div className="space-y-1.5 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground select-none block uppercase tracking-wider text-[10px]">Processed Date</span>
            <h3 className="text-sm font-semibold tracking-tight text-foreground py-1.5 leading-none">
              {payout.processedAt ? formatDateTime(payout.processedAt) : 'Pending Settlement'}
            </h3>
            <p className="text-[10px] text-muted-foreground truncate leading-normal">
              Created: {formatDateTime(payout.createdAt)}
            </p>
          </div>
          <div className="p-3 bg-muted border border-border text-muted-foreground rounded-full shrink-0">
            <CalendarClock className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Linked Transactions */}
        <div className="border border-border rounded-xl p-5 bg-card text-card-foreground shadow-xs flex items-center justify-between">
          <div className="space-y-1.5 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground select-none block uppercase tracking-wider text-[10px]">Linked Transactions</span>
            <h3 className="text-2xl font-bold tracking-tight text-foreground font-mono leading-none">
              {transactions.length}
            </h3>
            <p className="text-[10px] text-muted-foreground truncate leading-normal">
              Platform Fee: {formatCurrency(totalPlatformFees)}
            </p>
          </div>
          <div className="p-3 bg-muted border border-border text-muted-foreground rounded-full shrink-0">
            <Activity className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Summary Cards Grid (3 columns on desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Settlement Reconciliation */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 className="text-sm font-bold font-display uppercase tracking-widest text-muted-foreground text-[10px]">Settlement Reconciliation</h2>
            <span className="text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded uppercase">Breakdown</span>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-foreground">Gross Collections</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Sum of all booking total payments</p>
              </div>
              <span className="font-mono font-bold text-foreground">{formatCurrency(totalBookingAmount)}</span>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-foreground">Platform Service Fee</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Convenience charges cuts (10%)</p>
              </div>
              <span className="font-mono font-bold text-destructive dark:text-red-400">-{formatCurrency(totalPlatformFees)}</span>
            </div>
            
            <div className="border-t border-dashed border-border pt-3 flex justify-between items-center bg-muted/20 p-2.5 rounded-lg border mt-1">
              <span className="font-bold text-foreground">Net Payee Disbursed</span>
              <span className="font-mono text-sm font-black text-primary">{formatCurrency(payout.amountInRupees, payout.amount)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Beneficiary Details */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 className="text-sm font-bold font-display uppercase tracking-widest text-muted-foreground text-[10px]">Beneficiary Details</h2>
            <span className="text-[9px] font-bold bg-muted border border-border/50 text-muted-foreground px-1.5 py-0.5 rounded uppercase">Barber</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs font-display select-none shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate text-xs">{getPayoutRecipientName(payout)}</p>
              <p className="text-[10px] text-muted-foreground truncate font-mono select-all">{payout.barber?.upiId || payout.barberId}</p>
            </div>
          </div>
          <div className="space-y-2 text-xs pt-1">
            {payout.barber?.accountHolderName && (
              <div className="flex justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Holder</span>
                <span className="text-foreground font-medium truncate max-w-32.5">{payout.barber.accountHolderName}</span>
              </div>
            )}
            {payout.barber?.bankAccountNumber && (
              <div className="flex justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Account</span>
                <span className="text-foreground font-mono truncate max-w-32.5">{payout.barber.bankAccountNumber}</span>
              </div>
            )}
            {payout.barber?.ifscCode && (
              <div className="flex justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">IFSC</span>
                <span className="text-foreground font-mono">{payout.barber.ifscCode}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border/30 pt-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Gateway User</span>
              <span className="text-foreground font-mono truncate max-w-32.5" title={payout.beneficiaryId || ''}>{payout.beneficiaryId || '—'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Technical Reference */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h2 className="text-sm font-bold font-display uppercase tracking-widest text-muted-foreground text-[10px]">Technical Reference</h2>
            <span className="text-[9px] font-bold bg-muted border border-border/50 text-muted-foreground px-1.5 py-0.5 rounded uppercase">Logs</span>
          </div>
          <div className="space-y-1">
            <InfoRow label="System ID" value={payout.id} mono />
            <InfoRow label="Transfer ID" value={payout.transferId} mono />
            <InfoRow label="CF Gateway ID" value={payout.gatewayTransferId} mono />
            <InfoRow label="Beneficiary ID" value={payout.beneficiaryId} mono />
            <InfoRow label="Attempts" value={`${payout.retryCount || 0} / ${payout.maxRetries || 3}`} />
          </div>
        </div>
      </div>

      {/* Administrative Timeline & Audit Log Card (Full width, stacked above the table) */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="border-b border-border pb-3">
          <h2 className="text-base font-bold text-foreground font-display">Administrative Timeline & Audit Log</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Timeline Event Node Tracker */}
          <div className="space-y-4 text-xs">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 select-none">Gateway Action Timeline</p>
            <div className="relative pl-6 border-l border-border space-y-5">
              
              {/* Event 1: Initiated */}
              <div className="relative">
                <div className="absolute -left-7.5 top-0.5 h-4 w-4 rounded-full bg-card border-2 border-muted-foreground/30 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground">Payout Settlement Initiated</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(payout.createdAt)}</p>
              </div>

              {/* Event 2: Retried (if retry count > 0) */}
              {payout.lastRetryAt && (
                <div className="relative">
                  <div className="absolute -left-7.5 top-0.5 h-4 w-4 rounded-full bg-card border-2 border-amber-500/30 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  </div>
                  <p className="font-semibold text-foreground">Gateway Retried Attempt</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(payout.lastRetryAt)} (Attempt {payout.retryCount} of {payout.maxRetries})</p>
                </div>
              )}

              {/* Event 3: Processed */}
              <div className="relative">
                <div className={`absolute -left-7.5 top-0.5 h-4 w-4 rounded-full bg-card border-2 flex items-center justify-center ${
                  payout.status === 'SUCCESS' 
                    ? 'border-emerald-500/30 text-emerald-500' 
                    : payout.status === 'FAILED' 
                    ? 'border-destructive/30 text-destructive'
                    : 'border-amber-500/30 text-amber-500'
                }`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    payout.status === 'SUCCESS' 
                      ? 'bg-emerald-500' 
                      : payout.status === 'FAILED' 
                      ? 'bg-destructive' 
                      : 'bg-amber-500'
                  }`} />
                </div>
                <p className="font-semibold text-foreground capitalize">Settlement Status: {payout.status?.toLowerCase()}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{payout.processedAt ? formatDateTime(payout.processedAt) : 'Pending final validation'}</p>
              </div>
            </div>
          </div>

          {/* Admin approvals and comments */}
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Approving Operator</span>
                <p className="font-medium text-foreground bg-muted/40 p-2 rounded border border-border/50 text-[11px] truncate" title={payout.completedByAdmin?.email || payout.completedByAdminId || 'Automated System'}>
                  {payout.completedByAdmin?.email || payout.completedByAdminId || 'Automated System'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Method Type</span>
                <p className="font-medium text-foreground bg-muted/40 p-2 rounded border border-border/50 text-[11px] font-mono uppercase tracking-tight">
                  {payout.transferMode || 'upi'}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Remarks</span>
              <p className="font-medium text-foreground bg-muted/40 p-2.5 rounded border border-border/50 text-[11px] leading-relaxed">
                {payout.remarks || 'No automatic system remarks registered.'}
              </p>
            </div>

            {payout.adminNotes && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Admin Note Details</span>
                <p className="font-medium text-foreground bg-primary/5 p-2.5 rounded border border-primary/10 text-[11px] leading-relaxed">
                  {payout.adminNotes}
                </p>
              </div>
            )}

            {payout.failureReason && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-destructive uppercase tracking-widest">Failure Reason</span>
                <p className="font-semibold text-destructive bg-destructive/5 p-2.5 rounded border border-destructive/20 text-[11px] leading-relaxed">
                  [{payout.errorCode || 'ERR'}] {payout.failureReason}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Linked settled Transactions Table Card (Spans complete page width 100% at the bottom) */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden py-5 space-y-4">
        <div className="px-6 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground font-display">Linked Transactions Ledger</h2>
          <span className="text-xs font-semibold bg-muted px-2.5 py-1 rounded text-muted-foreground">
            {transactions.length} Item{transactions.length === 1 ? '' : 's'}
          </span>
        </div>

        {transactions.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-240 text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Merchant Order ID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Booking Status</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4 text-right">Customer Paid</th>
                  <th className="py-3 px-4 text-right">Platform Fee</th>
                  <th className="py-3 px-4 text-right">Barber Share</th>
                  <th className="py-3 px-6 text-center">Settled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-foreground font-medium">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-muted/15 transition-colors duration-150 group border-b border-border/40 last:border-b-0">
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground text-xs select-all">
                      <Link href={`/bookings/${txn.id}`} className="text-primary hover:underline">
                        {txn.id}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground select-all">
                      {txn.merchantOrderId || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {txn.date ? formatDateTime(txn.date) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-foreground font-semibold capitalize">{txn.bookingStatus || '—'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-foreground capitalize">{txn.paymentStatus || '—'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground text-xs">
                      {formatCurrency(txn.customerPaid)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-muted-foreground text-xs">
                      -{formatCurrency(txn.platformFee)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-primary font-bold text-xs">
                      {formatCurrency(txn.barberPayout)}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                        txn.settled 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {txn.settled ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* High fidelity empty state view */
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <div className="p-4 bg-muted border border-border text-muted-foreground rounded-full mb-4 shrink-0">
              <FileX className="h-8 w-8 text-muted-foreground/80" />
            </div>
            <h3 className="text-sm font-bold text-foreground font-display leading-none">No Settled Transactions Linked</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-2 leading-relaxed">
              This manual or cron-initiated payout does not reference any active customer booking settled items. If this is a technical balance correction, details can be tracked in the timeline remarks below.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
