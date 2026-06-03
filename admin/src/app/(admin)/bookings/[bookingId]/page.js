import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ErrorNotice, SectionHeader, TableShell } from '@/components/ui/AdminPrimitives';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getValidAccessToken } from '@/lib/auth';
import { bookingDetailParamSchema } from '@/lib/schemas/admin-resource.schema';
import { getBookingDetail } from '@/lib/services/booking.service';

export const dynamic = 'force-dynamic';

const money = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
const fullName = (person) => person?.fullName || [person?.firstName, person?.lastName].filter(Boolean).join(' ');

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-3">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="sm:col-span-2 text-sm text-foreground">{value || 'Unavailable'}</dd>
    </div>
  );
}

export default async function BookingDetailPage({ params }) {
  const token = await getValidAccessToken();
  if (!token) redirect('/login');

  const resolvedParams = await params;
  const parsed = bookingDetailParamSchema.safeParse(resolvedParams);
  if (!parsed.success) notFound();

  const response = await getBookingDetail(parsed.data.bookingId, token);
  const booking = response.success ? response.data : null;
  if (!booking && response.message?.toLowerCase().includes('not found')) notFound();

  const customerName = fullName(booking?.customer);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionHeader title="Booking Detail" description={parsed.data.bookingId} />
        <Link href="/bookings" className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
          Back to Bookings
        </Link>
      </div>

      <ErrorNotice message={!response.success ? response.message : null} />

      {booking && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <TableShell>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Booking</h2>
            </div>
            <dl className="px-4">
              <DetailRow label="Customer" value={customerName} />
              <DetailRow label="Customer Phone" value={booking.customer?.contact?.phoneNumber} />
              <DetailRow label="Customer Email" value={booking.customer?.contact?.email} />
              <DetailRow label="Barber" value={fullName(booking.barber)} />
              <DetailRow label="Shop" value={booking.shop?.shopName} />
              <DetailRow label="Employee" value={fullName(booking.employee)} />
              <DetailRow label="Date" value={booking.date ? String(booking.date).slice(0, 10) : null} />
              <DetailRow label="Time" value={[booking.time, booking.endTime].filter(Boolean).join(' - ')} />
              <DetailRow label="Total" value={money(booking.totalAmount)} />
            </dl>
          </TableShell>

          <TableShell>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">State</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">Booking</div>
                <StatusBadge value={booking.status} />
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">Payment</div>
                <StatusBadge value={booking.paymentStatus} />
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">Payout</div>
                <StatusBadge value={booking.payoutStatus} />
              </div>
            </div>
          </TableShell>

          <TableShell>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Services</h2>
            </div>
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Service</th>
                  <th className="px-4 py-3 text-right font-semibold">Duration</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(booking.services || []).map((service) => (
                  <tr key={service.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{service.serviceName}</td>
                    <td className="px-4 py-3 text-right font-mono">{service.duration || service.totalDuration || 0} min</td>
                    <td className="px-4 py-3 text-right font-mono">{money(service.finalPrice || service.totalPrice || service.offerPrice || service.actualPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>

          <TableShell>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">References</h2>
            </div>
            <dl className="px-4">
              <DetailRow label="Payment Transaction" value={booking.paymentTransactionId} />
              <DetailRow label="Merchant Order" value={booking.merchantOrderId} />
              <DetailRow label="Payout Transaction" value={booking.payoutTransactionId} />
              <DetailRow label="Barber UTR" value={booking.barberUtr} />
            </dl>
          </TableShell>
        </div>
      )}
    </div>
  );
}
