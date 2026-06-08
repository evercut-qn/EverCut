import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { ErrorNotice, MetricCard, SectionHeader, TableShell } from '@/components/ui/AdminPrimitives';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getValidAccessToken } from '@/lib/auth';
import { barberDetailParamSchema } from '@/lib/schemas/admin-resource.schema';
import { getBarberDetail } from '@/lib/services/shop.service';

export const dynamic = 'force-dynamic';

const money = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
const planLabel = (planId) => ({
  PLAN_BASIC: 'Basic',
  PLAN_POPULAR: 'Popular',
  PLAN_ADVANCED: 'Advanced',
}[planId] || planId || 'N/A');

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

export default async function BarberDetailPage({ params }) {
  const token = await getValidAccessToken();
  if (!token) redirect('/login');

  const resolvedParams = await params;
  const parsed = barberDetailParamSchema.safeParse(resolvedParams);
  if (!parsed.success) notFound();

  const response = await getBarberDetail(parsed.data.id, token);
  const barber = response.success ? response.data : null;
  if (!barber && response.message?.toLowerCase().includes('not found')) notFound();

  const metrics = barber?.metrics || {};
  const payout = barber?.payout || {};
  const shop = barber?.shop || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionHeader 
          title={barber?.barberName || 'Barber Details'} 
          description={`Barber ID: ${parsed.data.id}`} 
        />
        <div className="flex items-center gap-2">
          {barber && (
            <StatusBadge value={barber.isActive ? 'active' : 'inactive'} />
          )}
          <Link href="/barbers" className="group inline-flex h-6 items-center gap-1 rounded border border-border bg-card px-2 text-[11px] font-semibold uppercase tracking-normal text-foreground transition-colors hover:bg-muted active:scale-95">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Back to Directory</span>
          </Link>
        </div>
      </div>

      <ErrorNotice message={!response.success ? response.message : null} />

      {barber && (
        <>
          {/* Barber Performance Metrics Panel */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="TOTAL BOOKINGS" value={metrics.totalBookings ?? 0} tone="primary" />
            <MetricCard label="PAID SERVICE VALUE" value={money(metrics.paidServiceValue)} tone="green" />
            <MetricCard label="TOTAL PAYOUTS" value={money(metrics.totalPayouts)} tone="sky" />
            <MetricCard label="AVERAGE RATING" value={`${metrics.averageRating ?? 0} ★`} tone="amber" />
          </div>

          {/* Barber Identity and Payout Details */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Identity Card */}
            <TableShell>
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Barber Identity & Account</h2>
              </div>
              <dl className="px-4">
                <DetailRow label="User Email" value={barber.user?.email} />
                <DetailRow label="Phone Number" value={barber.user?.phoneNumber} />
                <DetailRow label="Years of Experience" value={barber.yearsOfExperience ? `${barber.yearsOfExperience} years` : null} />
                <DetailRow label="Gender" value={barber.gender} />
                <DetailRow label="DOB" value={barber.dateOfBirth ? new Date(barber.dateOfBirth).toLocaleDateString('en-IN') : null} />
                <DetailRow label="Registered" value={barber.createdAt ? new Date(barber.createdAt).toLocaleDateString('en-IN') : null} />
                <DetailRow label="Last Login" value={barber.user?.lastLoginAt ? new Date(barber.user.lastLoginAt).toLocaleString('en-IN') : null} />
              </dl>
            </TableShell>

            {/* Payout/Bank Settings */}
            <TableShell>
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Verified Bank & Payouts</h2>
              </div>
              <dl className="px-4">
                <DetailRow label="UPI ID" value={payout.upiId} />
                <DetailRow label="Beneficiary ID" value={payout.beneficiaryId} />
                <DetailRow label="Account Holder" value={payout.accountHolderName} />
                <DetailRow label="Bank Name" value={payout.bankName} />
                <DetailRow label="Account Number" value={payout.bankAccount} />
                <DetailRow label="IFSC Code" value={payout.ifsc} />
                <DetailRow label="Verification Status" value={payout.verificationStatus ? <StatusBadge value={payout.verificationStatus} /> : null} />
                <DetailRow label="Verified At" value={payout.verifiedAt ? new Date(payout.verifiedAt).toLocaleString('en-IN') : null} />
              </dl>
            </TableShell>
          </div>

          {/* Consolidated Linked Shop Venue Details */}
          {shop.id ? (
            <div className="space-y-6">
              {/* Missed Confirmations Alert */}
              {shop.missedConfirmations?.count > 0 && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 flex items-center justify-between text-destructive text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <span>⚠️ Shop venue has {shop.missedConfirmations.count} missed confirmations!</span>
                    {shop.missedConfirmations.lastMissedAt && (
                      <span className="font-normal text-muted-foreground">
                        (Last missed: {new Date(shop.missedConfirmations.lastMissedAt).toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Shop Venue Section Header */}
              <div className="border-b border-border pb-2">
                <h2 className="text-lg font-bold text-foreground">Linked Shop Venue: {shop.shopName}</h2>
                <p className="text-xs text-muted-foreground">Detailed specifications, timings, and subscription plan for this physical location.</p>
              </div>

              {/* Shop Metrics Panel */}
              {shop.metrics && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard label="VENUE TOTAL BOOKINGS" value={shop.metrics.totalBookings ?? 0} tone="primary" />
                  <MetricCard label="VENUE SUCCESS RATE" value={`${shop.metrics.bookingSuccessRate ?? 0}%`} tone="amber" />
                  <MetricCard label="VENUE TOTAL REVENUE" value={money(shop.metrics.totalRevenue)} tone="green" />
                  <MetricCard label="VENUE AVG REV/BOOKING" value={money(shop.metrics.averageRevenuePerBooking)} tone="sky" />
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* Shop Configurations & Specifications */}
                <TableShell>
                  <div className="border-b border-border px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">Shop Configuration & Location</h2>
                  </div>
                  <dl className="px-4">
                    <DetailRow label="Category" value={shop.category} />
                    <DetailRow label="Target Customers" value={shop.targetCustomers} />
                    <DetailRow label="Employees Count" value={shop.numberOfEmployees} />
                    <DetailRow label="Amenities" value={shop.amenities?.join(', ')} />
                    <DetailRow label="Bio" value={shop.bio} />
                    <DetailRow label="Address" value={shop.address} />
                    <DetailRow label="Coordinates" value={shop.location?.coordinates ? `${shop.location.coordinates[1]}, ${shop.location.coordinates[0]}` : null} />
                    <DetailRow 
                      label="Google Maps" 
                      value={shop.location?.coordinates ? (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${shop.location.coordinates[1]},${shop.location.coordinates[0]}`} 
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

                {/* Shop Schedule & Subscription Details */}
                <div className="space-y-6">
                  {/* Timings */}
                  <TableShell>
                    <div className="border-b border-border px-4 py-3">
                      <h2 className="text-sm font-semibold text-foreground">Schedule & Timings</h2>
                    </div>
                    <dl className="px-4">
                      <DetailRow label="Working Days" value={shop.workingDays?.join(', ')} />
                      <DetailRow label="Working Hours" value={shop.workingHours ? `${shop.workingHours.openTime} - ${shop.workingHours.closeTime}` : null} />
                      <DetailRow 
                        label="Break Times" 
                        value={shop.breakTimes?.map((b) => `${b.start} - ${b.end}`).join(', ') || 'None'} 
                      />
                      <DetailRow label="Shop Status" value={<StatusBadge value={shop.isOpen ? 'open' : 'closed'} />} />
                    </dl>
                  </TableShell>

                  {/* Subscription details */}
                  <TableShell>
                    <div className="border-b border-border px-4 py-3">
                      <h2 className="text-sm font-semibold text-foreground">Razorpay Subscription</h2>
                    </div>
                    {shop.subscription ? (
                      <dl className="px-4">
                        <DetailRow label="Subscription Plan" value={shop.subscription.planId ? planLabel(shop.subscription.planId) : 'N/A'} />
                        <DetailRow label="Subscription Status" value={shop.subscription.status ? <StatusBadge value={shop.subscription.status} /> : 'N/A'} />
                        <DetailRow 
                          label="Media Usage" 
                          value={shop.subscription.usage ? `Photos: ${shop.subscription.usage.photos || 0} / Videos: ${shop.subscription.usage.videos || 0}` : null} 
                        />
                      </dl>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">No subscription details found for this shop venue.</div>
                    )}
                  </TableShell>
                </div>
              </div>
            </div>
          ) : (
            <TableShell>
              <div className="p-4 text-center text-sm text-muted-foreground">No shop linked to this barber.</div>
            </TableShell>
          )}

          {/* Bookings Ledger Table */}
          <TableShell>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Recent Bookings</h2>
            </div>
            {barber.recentBookings?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No bookings found for this barber.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Booking ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold">Schedule</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {barber.recentBookings?.map((booking) => (
                    <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link href={`/bookings/${booking.id}`} className="text-primary hover:underline">
                          {booking.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">
                          {booking.customer ? (
                            <Link href={`/customers/${booking.customer.id}`} className="text-primary hover:underline">
                              {booking.customer.fullName || 'Unnamed'}
                            </Link>
                          ) : 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">{booking.customer?.contact?.phoneNumber || ''}</div>
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

          {/* Recent Payments Table (Shop level) */}
          {shop.id && (
            <TableShell>
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Recent Payments (Venue)</h2>
              </div>
              {shop.recentPayments?.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No payments found for this shop venue.</div>
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
                    {shop.recentPayments?.map((payment) => (
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
          )}

          {/* Recent Payouts Table */}
          <TableShell>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Recent Payouts</h2>
            </div>
            {barber.recentPayouts?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No payouts found for this barber.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Payout ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Transfer Ref</th>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">UTR</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {barber.recentPayouts?.map((payout) => (
                    <tr key={payout.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link href={`/payouts/${payout.id}`} className="text-primary hover:underline">
                          {payout.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{payout.transferId || 'N/A'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {payout.processedAt ? new Date(payout.processedAt).toLocaleString('en-IN') : (payout.createdAt ? new Date(payout.createdAt).toLocaleString('en-IN') : '')}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{payout.utr || 'N/A'}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{money(payout.amountInRupees)}</td>
                      <td className="px-4 py-3"><StatusBadge value={payout.status?.toLowerCase()} /></td>
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
