import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BadgeIndianRupee,
  CalendarDays,
  CreditCard,
  IndianRupee,
  Scissors,
  Users,
} from 'lucide-react';

import { ErrorNotice, MetricCard, SectionHeader, TableShell } from '@/components/ui/AdminPrimitives';
import { getValidAccessToken } from '@/lib/auth';
import { getUserSummary } from '@/lib/services/user.service';
import { getShopSummary } from '@/lib/services/shop.service';
import { getBookingSummary } from '@/lib/services/booking.service';
import { getPaymentSummary } from '@/lib/services/payment.service';
import { getPayoutSummary } from '@/lib/services/payout.service';
import { getSubscriptionSummary } from '@/lib/services/subscription.service';

export const dynamic = 'force-dynamic';

const rupees = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
const count = (value) => Number(value || 0).toLocaleString('en-IN');
const safeData = (response) => (response.success ? response.data : null);

export default async function OverviewPage() {
  const token = await getValidAccessToken();
  if (!token) redirect('/login');

  const responses = await Promise.all([
    getUserSummary(token),
    getShopSummary(token),
    getBookingSummary(token),
    getPaymentSummary(token),
    getPayoutSummary(token),
    getSubscriptionSummary(token),
  ]);

  const [users, shops, bookings, payments, payouts, subscriptions] = responses.map(safeData);
  const error = responses.find((response) => !response.success)?.message;

  const topShops = bookings?.topShops || [];
  const bookingStatuses = bookings?.statusDistribution || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Operations Overview"
        description="Platform health, booking flow, customer payments, subscriptions, and payout status."
      />

      <ErrorNotice message={error} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Total Customers"
          value={count(users?.totalCustomers)}
          detail={`${count(users?.activeCustomers)} active customers`}
          icon={Users}
          tone="sky"
        />
        <MetricCard
          label="Total Shops"
          value={count(shops?.totalShops)}
          detail={`${count(shops?.openShops)} open`}
          icon={Scissors}
          tone="green"
        />
        <MetricCard
          label="Total Bookings"
          value={count(bookings?.totalBookings?.allTime)}
          detail={`${count(bookings?.totalBookings?.thisWeek)} this week`}
          icon={CalendarDays}
          tone="primary"
        />
        <MetricCard
          label="Customer Payments Collected"
          value={rupees(payments?.customerPaymentsCollectedInRupees)}
          detail={`${payments?.paymentSuccessRate || 0}% payment success`}
          icon={IndianRupee}
          tone="green"
        />
        <MetricCard
          label="Platform Fees Collected"
          value={rupees(payments?.platformFeesCollectedInRupees)}
          detail={`${count(payments?.successCount)} completed payments`}
          icon={CreditCard}
          tone="amber"
        />
        <MetricCard
          label="Active Subscriptions"
          value={count(subscriptions?.activeSubscriptions)}
          detail={`${rupees(subscriptions?.monthlyRecurringRevenueInRupees)} MRR`}
          icon={BadgeIndianRupee}
          tone="sky"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TableShell>
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Booking Status</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {bookingStatuses.map((row) => (
                <tr key={row.status} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">{String(row.status).replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{count(row.count)}</td>
                </tr>
              ))}
              {bookingStatuses.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-xs text-muted-foreground" colSpan={2}>No booking status data</td>
                </tr>
              )}
            </tbody>
          </table>
        </TableShell>

        <TableShell>
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Top Shops</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Shop</th>
                <th className="px-4 py-3 text-right font-semibold">Bookings</th>
                <th className="px-4 py-3 text-right font-semibold">Paid Service Value</th>
              </tr>
            </thead>
            <tbody>
              {topShops.map((shop) => (
                <tr key={shop.shopId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{shop.shopName}</td>
                  <td className="px-4 py-3 text-right font-mono">{count(shop.bookingCount)}</td>
                  <td className="px-4 py-3 text-right font-mono">{rupees(shop.paidServiceValueInRupees)}</td>
                </tr>
              ))}
              {topShops.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-xs text-muted-foreground" colSpan={3}>No shop ranking data</td>
                </tr>
              )}
            </tbody>
          </table>
        </TableShell>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted" href="/bookings">
          Booking Lookup
        </Link>
        <Link className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted" href="/payouts">
          Payouts
        </Link>
        <Link className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted" href="/refunds">
          Refunds
        </Link>
      </div>
    </div>
  );
}
