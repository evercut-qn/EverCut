import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { ErrorNotice, MetricCard, SectionHeader, TableShell } from '@/components/ui/AdminPrimitives';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getValidAccessToken } from '@/lib/auth';
import { customerDetailParamSchema } from '@/lib/schemas/admin-resource.schema';
import { getCustomerDetail } from '@/lib/services/user.service';

export const dynamic = 'force-dynamic';

const money = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
const fullName = (person) => person ? [person.firstName, person.lastName].filter(Boolean).join(' ') : 'Unnamed';

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

export default async function CustomerDetailPage({ params }) {
  const token = await getValidAccessToken();
  if (!token) redirect('/login');

  const resolvedParams = await params;
  const parsed = customerDetailParamSchema.safeParse(resolvedParams);
  if (!parsed.success) notFound();

  const response = await getCustomerDetail(parsed.data.id, token);
  const customer = response.success ? response.data : null;
  if (!customer && response.message?.toLowerCase().includes('not found')) notFound();

  const metrics = customer?.metrics || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionHeader 
          title={fullName(customer)} 
          description={`Customer ID: ${parsed.data.id}`} 
        />
        <div className="flex items-center gap-2">
          {customer && (
            <StatusBadge value={customer.user?.isActive ? 'active' : 'inactive'} />
          )}
          <Link href="/customers" className="group inline-flex h-6 items-center gap-1 rounded border border-border bg-card px-2 text-[11px] font-semibold uppercase tracking-normal text-foreground transition-colors hover:bg-muted active:scale-95">
            <ArrowLeft className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Back to Customers</span>
          </Link>
        </div>
      </div>

      <ErrorNotice message={!response.success ? response.message : null} />

      {customer && (
        <>
          {/* Metrics Panel */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="LIFETIME BOOKINGS" value={metrics.lifetimeBookings ?? 0} tone="primary" />
            <MetricCard label="COMPLETED BOOKINGS" value={metrics.completedBookings ?? 0} tone="green" />
            <MetricCard label="LIFETIME SPEND" value={money(metrics.lifetimeSpend)} tone="sky" />
            <MetricCard label="SUCCESS RATE" value={`${metrics.bookingSuccessRate ?? 0}%`} tone="amber" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="CANCELLED BOOKINGS" value={metrics.cancelledBookings ?? 0} tone="red" />
            <MetricCard label="NO SHOWS" value={metrics.noShows ?? 0} tone="red" />
            <MetricCard label="REFUNDED BOOKINGS" value={metrics.refundedBookings ?? 0} tone="amber" />
            <MetricCard label="AVG BOOKING VALUE" value={money(metrics.averageBookingValue)} tone="primary" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Left: Identity Credentials */}
            <TableShell>
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Profile & Account Info</h2>
              </div>
              <dl className="px-4">
                <DetailRow label="User ID" value={customer.userId} />
                <DetailRow label="Gender" value={customer.gender} />
                <DetailRow label="DOB" value={customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString('en-IN') : null} />
                <DetailRow label="Waivers Used" value={`${customer.feeWaiverBookingsUsed || 0} / ${customer.feeWaiverQuota || 0}`} />
                <DetailRow label="Registered" value={customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-IN') : null} />
                <DetailRow label="Last Login" value={customer.user?.lastLoginAt ? new Date(customer.user.lastLoginAt).toLocaleString('en-IN') : null} />
              </dl>
            </TableShell>

            {/* Right: Contact & Geographics */}
            <TableShell>
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Contact & Geographics</h2>
              </div>
              <dl className="px-4">
                <DetailRow label="Phone Number" value={customer.user?.phoneNumber} />
                <DetailRow label="Email Address" value={customer.user?.email} />
                <DetailRow label="Address" value={customer.address} />
                <DetailRow label="Coordinates" value={customer.location?.coordinates ? `${customer.location.coordinates[1]}, ${customer.location.coordinates[0]}` : null} />
                <DetailRow 
                  label="Google Maps" 
                  value={customer.location?.coordinates ? (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${customer.location.coordinates[1]},${customer.location.coordinates[0]}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Open in Maps
                    </a>
                  ) : null} 
                />
              </dl>
            </TableShell>
          </div>

          {/* Recent Bookings Table */}
          <TableShell>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Recent Bookings</h2>
            </div>
            {customer.recentBookings?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No bookings found for this customer.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Booking ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Shop</th>
                    <th className="px-4 py-3 text-left font-semibold">Schedule</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.recentBookings?.map((booking) => (
                    <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link href={`/bookings/${booking.id}`} className="text-primary hover:underline">
                          {booking.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">
                          {booking.shop?.shopName ? (
                            <Link href={`/barbers/${booking.shop?.barberId || booking.barber?.id}`} className="text-primary hover:underline">
                              {booking.shop.shopName}
                            </Link>
                          ) : 'Shop Unavailable'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {booking.barber?.fullName ? (
                            <Link href={`/barbers/${booking.shop?.barberId}`} className="hover:underline">
                              {booking.barber.fullName}
                            </Link>
                          ) : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {booking.date ? new Date(booking.date).toLocaleDateString('en-IN') : ''} {booking.time || ''}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{money(booking.totalAmount)}</td>
                      <td className="px-4 py-3"><StatusBadge value={booking.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TableShell>

          {/* Recent Payments Table */}
          <TableShell>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Recent Payments</h2>
            </div>
            {customer.recentPayments?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No payments found for this customer.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Payment ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Merchant Order</th>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Mode</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.recentPayments?.map((payment) => (
                    <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs text-foreground font-semibold">
                        {payment.id}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{payment.merchantOrderId || 'N/A'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleString('en-IN') : ''}
                      </td>
                      <td className="px-4 py-3 font-medium text-xs text-muted-foreground uppercase">{payment.paymentMode || 'N/A'}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{money(payment.amountInRupees)}</td>
                      <td className="px-4 py-3"><StatusBadge value={payment.status?.toLowerCase()} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TableShell>
        </>
      )}
    </div>
  );
}
