import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, CalendarClock, CreditCard, ReceiptText, UserRound } from 'lucide-react';

import { getValidAccessToken } from '@/lib/auth';
import { getPayoutDetail } from '@/lib/services/payout.service';
import { objectIdSchema } from '@/lib/schemas/common.schema';
import { PayoutGatewayBadge, PayoutStatusBadge } from '../_components/shared/PayoutBadges';
import { formatCurrency, formatDateTime, getPayoutRecipientName } from '../_components/shared/payout-format';
import { PayoutDetailActions } from './_components/PayoutDetailActions';

export const dynamic = 'force-dynamic';

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0 sm:flex-row sm:justify-between sm:gap-6">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className={mono ? 'break-all font-mono text-sm text-foreground sm:text-right' : 'text-sm text-foreground sm:text-right'}>
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

  // Calculate totals for financial breakdown
  const totalBookingAmountInPaisa = payments.reduce((acc, curr) => acc + (curr.amountInPaisa || 0), 0);
  const totalPlatformFeeInPaisa = payments.reduce((acc, curr) => acc + (curr.settlement?.platformFee || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/payouts?tab=history&page=1" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to payout history
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Payout Detail</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Full settlement record, audit actors, linked bookings, and payment metadata.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PayoutStatusBadge status={payout.status} />
            <PayoutGatewayBadge gateway={payout.gateway} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Amount</span>
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">
            {formatCurrency(payout.amountInRupees, payout.amount)}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Recipient</span>
            <UserRound className="h-4 w-4 text-primary" />
          </div>
          <div className="truncate text-lg font-bold text-foreground">{getPayoutRecipientName(payout)}</div>
          <div className="mt-1 truncate font-mono text-xs text-muted-foreground">{payout.barber?.upiId || payout.barberId}</div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Bookings</span>
            <ReceiptText className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{payout.bookingIds?.length || 0}</div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Processed</span>
            <CalendarClock className="h-4 w-4 text-primary" />
          </div>
          <div className="text-sm font-semibold text-foreground">{formatDateTime(payout.processedAt)}</div>
        </div>
      </div>

      {/* Settlement Financial Breakdown Panel */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-3">
        <div>
          <h2 className="font-display text-base font-bold text-foreground">Settlement Financial Breakdown</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Clear balance reconciliation between customer billing, platform service fees, and net payouts.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Customer Paid (Gross)</p>
            <p className="text-xl font-bold font-mono text-foreground">
              {formatCurrency(undefined, totalBookingAmountInPaisa)}
            </p>
            <p className="text-[10px] text-muted-foreground">Combined billing collected from customers</p>
          </div>
          
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Service Fee (Platform Cut)</p>
            <p className="text-xl font-bold font-mono text-destructive dark:text-red-400">
              {formatCurrency(undefined, totalPlatformFeeInPaisa)}
            </p>
            <p className="text-[10px] text-muted-foreground">Convenience fees retained by EverCut</p>
          </div>
          
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Barber Payout (Net)</p>
            <p className="text-xl font-bold font-mono text-primary">
              {formatCurrency(payout.amountInRupees, payout.amount)}
            </p>
            <p className="text-[10px] text-muted-foreground">Net settled amount transferred to recipient</p>
          </div>
        </div>
      </div>

      <PayoutDetailActions payout={payout} />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-base font-bold text-foreground">Transaction Metadata</h2>
          <div className="mt-3">
            <DetailRow label="Payout ID" value={payout.id} mono />
            <DetailRow label="Transfer ID" value={payout.transferId} mono />
            <DetailRow label="Gateway Transfer ID" value={payout.gatewayTransferId} mono />
            <DetailRow label="Beneficiary ID" value={payout.beneficiaryId} mono />
            <DetailRow label="UTR" value={payout.utr} mono />
            <DetailRow label="Transfer Mode" value={payout.transferMode?.toUpperCase()} />
            <DetailRow label="Failure Reason" value={payout.failureReason} />
            <DetailRow label="Error Code" value={payout.errorCode} mono />
            <DetailRow label="Retry Count" value={`${payout.retryCount || 0} / ${payout.maxRetries || 0}`} />
            <DetailRow label="Last Retry At" value={formatDateTime(payout.lastRetryAt)} />
            <DetailRow label="Created At" value={formatDateTime(payout.createdAt)} />
            <DetailRow label="Updated At" value={formatDateTime(payout.updatedAt)} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-base font-bold text-foreground">Audit</h2>
          <div className="mt-3">
            <DetailRow label="Completed By" value={payout.completedByAdmin?.email || payout.completedByAdminId} />
            <DetailRow label="Admin Notes" value={payout.adminNotes} />
            <DetailRow label="Remarks" value={payout.remarks} />
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="font-display text-base font-bold text-foreground">Linked Bookings</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="pb-3 font-semibold">Booking</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Booking Status</th>
                <th className="pb-3 font-semibold">Payment</th>
                <th className="pb-3 font-semibold">Payout</th>
                <th className="pb-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(bookings.length ? bookings : payout.bookingIds || []).map((booking) => {
                const bookingObject = typeof booking === 'object' ? booking : { id: booking };
                return (
                  <tr key={bookingObject.id} className="border-b border-border last:border-b-0">
                    <td className="py-3 font-mono text-xs">{bookingObject.id}</td>
                    <td className="py-3 text-muted-foreground">{formatDateTime(bookingObject.date)}</td>
                    <td className="py-3">{bookingObject.status || '—'}</td>
                    <td className="py-3">{bookingObject.paymentStatus || '—'}</td>
                    <td className="py-3">{bookingObject.payoutStatus || '—'}</td>
                    <td className="py-3 text-right font-mono">{bookingObject.totalAmount ? formatCurrency(bookingObject.totalAmount) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="font-display text-base font-bold text-foreground">Linked Payments Details</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-210 text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="pb-3 font-semibold">Payment Transaction</th>
                <th className="pb-3 font-semibold">Merchant Order</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Customer Paid</th>
                <th className="pb-3 text-right font-semibold">Platform Fee</th>
                <th className="pb-3 text-right font-semibold">Barber Payout</th>
                <th className="pb-3 text-center font-semibold">Settled</th>
              </tr>
            </thead>
            <tbody>
              {(payments.length ? payments : payout.paymentTransactionIds || []).map((payment) => {
                const paymentObject = typeof payment === 'object' ? payment : { id: payment };
                const settlement = paymentObject.settlement || {};
                return (
                  <tr key={paymentObject.id} className="border-b border-border last:border-b-0 hover:bg-muted/10 transition-colors">
                    <td className="py-3 font-mono text-xs">{paymentObject.id}</td>
                    <td className="py-3 font-mono text-xs text-muted-foreground">{paymentObject.merchantOrderId || '—'}</td>
                    <td className="py-3">
                      <span className="capitalize">{paymentObject.status || '—'}</span>
                    </td>
                    <td className="py-3 text-right font-mono font-medium">
                      {paymentObject.amountInPaisa ? formatCurrency(undefined, paymentObject.amountInPaisa) : '—'}
                    </td>
                    <td className="py-3 text-right font-mono text-muted-foreground">
                      {settlement.platformFee ? formatCurrency(undefined, settlement.platformFee) : '—'}
                    </td>
                    <td className="py-3 text-right font-mono text-primary font-semibold">
                      {settlement.barberPayout ? formatCurrency(undefined, settlement.barberPayout) : '—'}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        settlement.settled 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {settlement.settled ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
