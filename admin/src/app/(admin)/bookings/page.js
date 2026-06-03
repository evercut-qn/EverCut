import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState, ErrorNotice, SectionHeader, TableShell } from '@/components/ui/AdminPrimitives';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TableSearchBar } from '@/components/ui/TableSearchBar';
import { getValidAccessToken } from '@/lib/auth';
import { normalizePagination } from '@/lib/pagination';
import { bookingLookupQuerySchema } from '@/lib/schemas/admin-resource.schema';
import { getBookings } from '@/lib/services/booking.service';

export const dynamic = 'force-dynamic';

const money = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
const fullName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(' ');
const secondaryId = (value) => (value ? String(value).slice(-8) : null);
const serviceSummary = (services = []) => {
  const names = services.map((service) => service.serviceName).filter(Boolean);
  if (names.length === 0) return 'No service details';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
};

export default async function BookingsPage({ searchParams }) {
  const token = await getValidAccessToken();
  if (!token) redirect('/login');

  const resolvedParams = await searchParams;
  const parsed = bookingLookupQuerySchema.safeParse(resolvedParams);
  const query = parsed.success ? parsed.data : { page: 1, limit: 20, search: '' };
  const response = await getBookings({ ...query, token });
  const items = response.success ? response.data || [] : [];
  const pagination = normalizePagination(response.meta, { page: query.page, totalDocuments: items.length });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Booking Lookup"
        description="Search bookings by ID, customer contact, or shop name."
      />
      <ErrorNotice message={!response.success ? response.message : null} />
      {!parsed.success && <ErrorNotice message="Some filters were invalid and have been ignored." />}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <TableSearchBar queryParam="search" placeholder="Search booking, customer, or shop" />
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            name="status"
            label="Booking"
            value={query.status}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'awaiting_confirmation', label: 'Awaiting' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'no-show', label: 'No-show' },
            ]}
          />
          <FilterSelect
            name="paymentStatus"
            label="Payment"
            value={query.paymentStatus}
            options={[
              { value: '', label: 'All payments' },
              { value: 'success', label: 'Success' },
              { value: 'failed', label: 'Failed' },
              { value: 'refunded', label: 'Refunded' },
              { value: 'refund_pending', label: 'Refund pending' },
            ]}
          />
          <FilterSelect
            name="payoutStatus"
            label="Payout"
            value={query.payoutStatus}
            options={[
              { value: '', label: 'All payouts' },
              { value: 'not_initiated', label: 'Not initiated' },
              { value: 'pending', label: 'Pending' },
              { value: 'completed', label: 'Completed' },
              { value: 'failed', label: 'Failed' },
            ]}
          />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No bookings found" />
      ) : (
        <TableShell>
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Barber / Shop</th>
                <th className="px-4 py-3 text-left font-semibold">Services</th>
                <th className="px-4 py-3 text-left font-semibold">Schedule</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Booking</th>
                <th className="px-4 py-3 text-left font-semibold">Payment</th>
                <th className="px-4 py-3 text-left font-semibold">Payout</th>
              </tr>
            </thead>
            <tbody>
              {items.map((booking) => (
                <tr key={booking.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/bookings/${booking.id}`} className="font-semibold text-foreground hover:text-primary hover:underline">
                      {fullName(booking.customer) || 'Customer unavailable'}
                    </Link>
                    <div className="text-xs text-muted-foreground">{booking.customer?.contact?.phoneNumber || booking.customer?.contact?.email || 'Contact unavailable'}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">Booking ...{secondaryId(booking.id)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{booking.barber?.fullName || fullName(booking.barber) || 'Barber unavailable'}</div>
                    <div className="text-xs text-muted-foreground">{booking.shop?.shopName || 'Shop unavailable'}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{serviceSummary(booking.services)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{booking.date ? `${String(booking.date).slice(0, 10)} ${[booking.time, booking.endTime].filter(Boolean).join(' - ')}` : 'Schedule unavailable'}</td>
                  <td className="px-4 py-3 text-right font-mono">{money(booking.totalAmount)}</td>
                  <td className="px-4 py-3"><StatusBadge value={booking.status} /></td>
                  <td className="px-4 py-3"><StatusBadge value={booking.paymentStatus} /></td>
                  <td className="px-4 py-3"><StatusBadge value={booking.payoutStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      <PaginationControls pagination={pagination} pageSize={query.limit} />
    </div>
  );
}
