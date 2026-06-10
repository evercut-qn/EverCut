import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

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
      <dd className="sm:col-span-2 text-sm text-foreground">
        {value !== undefined && value !== null && value !== '' ? value : 'Unavailable'}
      </dd>
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
  const barberId = booking?.shop?.barberId || booking?.barber?.id;

  return (
    <div className="space-y-6">
      {/* Main Header Row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <SectionHeader title="Booking Detail" description={parsed.data.bookingId} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {booking && (
            <>
              <StatusBadge value={booking.status} />
              <StatusBadge value={booking.paymentStatus} />
              <StatusBadge value={booking.payoutStatus} />
            </>
          )}
          <Link href="/bookings" className="group inline-flex h-6 items-center gap-1 rounded border border-border bg-card px-2 text-[11px] font-semibold uppercase tracking-normal text-foreground transition-colors hover:bg-muted active:scale-95">
            <ArrowLeft className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Back to Bookings</span>
          </Link>
        </div>
      </div>

      <ErrorNotice message={!response.success ? response.message : null} />

      {booking && (
        <div className="space-y-6">
          {/* Cancellation Banner */}
          {booking.status === 'cancelled' && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive text-sm font-semibold space-y-1">
              <div className="flex items-center gap-2">
                <span>⚠️ Booking Cancelled</span>
                {booking.cancelledAt && (
                  <span className="font-normal text-muted-foreground text-xs">
                    on {new Date(booking.cancelledAt).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              {booking.cancellationNote && (
                <div className="text-xs font-normal text-muted-foreground">
                  Reason: <span className="text-foreground">{booking.cancellationNote}</span>
                </div>
              )}
            </div>
          )}

          {/* Primary details grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* Left Column: People & Venue */}
            <div className="space-y-6">
              
              {/* Client & Staff Details */}
              <TableShell>
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Client & Staff Details</h2>
                </div>
                <dl className="px-4">
                  <DetailRow 
                    label="Customer" 
                    value={booking.customer?.id ? (
                      <Link href={`/customers/${booking.customer.id}`} className="text-primary hover:underline font-semibold">
                        {customerName}
                      </Link>
                    ) : customerName} 
                  />
                  <DetailRow label="Customer Phone" value={booking.customer?.contact?.phoneNumber} />
                  <DetailRow label="Customer Email" value={booking.customer?.contact?.email} />
                  <DetailRow 
                    label="Barber" 
                    value={barberId ? (
                      <Link href={`/barbers/${barberId}`} className="text-primary hover:underline font-semibold">
                        {fullName(booking.barber)}
                      </Link>
                    ) : fullName(booking.barber)} 
                  />
                  <DetailRow 
                    label="Shop" 
                    value={barberId ? (
                      <Link href={`/barbers/${barberId}`} className="text-primary hover:underline font-semibold">
                        {booking.shop?.shopName}
                      </Link>
                    ) : booking.shop?.shopName} 
                  />
                  <DetailRow label="Employee" value={fullName(booking.employee)} />
                </dl>
              </TableShell>

              {/* Transaction References */}
              <TableShell>
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Transaction References</h2>
                </div>
                <dl className="px-4">
                  <DetailRow 
                    label="Payment ID" 
                    value={booking.paymentTransactionId ? (
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {booking.paymentTransactionId}
                      </span>
                    ) : null} 
                  />
                  <DetailRow label="Merchant Order ID" value={booking.merchantOrderId} />
                  <DetailRow 
                    label="Payout ID" 
                    value={booking.payoutTransactionId ? (
                      <Link href={`/payouts/${booking.payoutTransactionId}`} className="text-primary hover:underline font-mono text-xs font-semibold">
                        {booking.payoutTransactionId}
                      </Link>
                    ) : null} 
                  />
                  <DetailRow label="Barber UTR" value={booking.barberUtr} />
                </dl>
              </TableShell>

            </div>

            {/* Right Column: Appointment Schedule & Financials */}
            <div className="space-y-6">

              {/* Schedule Details */}
              <TableShell>
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Schedule Details</h2>
                </div>
                <dl className="px-4">
                  <DetailRow label="Date" value={booking.date ? new Date(booking.date).toLocaleDateString('en-IN') : null} />
                  <DetailRow label="Time Slot" value={[booking.time, booking.endTime].filter(Boolean).join(' - ')} />
                  <DetailRow label="Duration" value={booking.durationMinutes ? `${booking.durationMinutes} mins` : null} />
                  <DetailRow label="Reschedules" value={booking.rescheduleCount || 0} />
                  {booking.completedAt && (
                    <DetailRow label="Completed At" value={new Date(booking.completedAt).toLocaleString('en-IN')} />
                  )}
                  {booking.autoCancelledAt && (
                    <DetailRow label="Auto Cancelled At" value={new Date(booking.autoCancelledAt).toLocaleString('en-IN')} />
                  )}
                  {booking.noShowAt && (
                    <DetailRow label="No Show Marked At" value={new Date(booking.noShowAt).toLocaleString('en-IN')} />
                  )}
                </dl>
              </TableShell>

              {/* Financial Summary */}
              <TableShell>
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Financial Summary</h2>
                </div>
                <dl className="px-4">
                  <DetailRow label="Service Amount" value={money(booking.serviceAmount || booking.totalAmount)} />
                  {booking.platformFee !== undefined && (
                    <DetailRow label="Platform Fee" value={money(booking.platformFee)} />
                  )}
                  <DetailRow label="Total Amount" value={money(booking.totalAmount)} />
                  <DetailRow label="Payment Mode" value={booking.paymentMode ? String(booking.paymentMode).toUpperCase() : null} />
                  <DetailRow label="Paid At" value={booking.paidAt ? new Date(booking.paidAt).toLocaleString('en-IN') : null} />
                </dl>
              </TableShell>

            </div>

          </div>

          {/* Services Booked */}
          <TableShell>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Services Booked</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-130 text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Service</th>
                    <th className="px-4 py-3 text-right font-semibold">Duration</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(booking.services || []).map((service) => (
                    <tr key={service.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-3 font-medium text-foreground">{service.serviceName}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{service.duration || service.totalDuration || 0} min</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-foreground">{money(service.finalPrice || service.totalPrice || service.offerPrice || service.actualPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableShell>
        </div>
      )}
    </div>
  );
}
