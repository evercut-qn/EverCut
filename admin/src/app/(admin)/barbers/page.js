import { redirect } from 'next/navigation';

import { EmptyState, ErrorNotice, SectionHeader, TableShell } from '@/components/ui/AdminPrimitives';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TableSearchBar } from '@/components/ui/TableSearchBar';
import { getValidAccessToken } from '@/lib/auth';
import { normalizePagination } from '@/lib/pagination';
import { barberDirectoryQuerySchema } from '@/lib/schemas/admin-resource.schema';
import { getBarbers } from '@/lib/services/shop.service';

export const dynamic = 'force-dynamic';

export default async function BarbersPage({ searchParams }) {
  const token = await getValidAccessToken();
  if (!token) redirect('/login');

  const resolvedParams = await searchParams;
  const parsed = barberDirectoryQuerySchema.safeParse(resolvedParams);
  const query = parsed.success ? parsed.data : { page: 1, limit: 20, search: '', isOpen: '', isActive: '' };
  const response = await getBarbers({ ...query, token });
  const items = response.success ? response.data || [] : [];
  const pagination = normalizePagination(response.meta, { page: query.page, totalDocuments: items.length });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Barber & Shop Directory"
        description="Review barber ownership, shop state, payout identifiers, and rating summaries."
      />
      <ErrorNotice message={!response.success ? response.message : null} />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <TableSearchBar queryParam="search" placeholder="Search shop, barber, or payout ID" />
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            name="isOpen"
            label="Operating"
            value={query.isOpen}
            options={[
              { value: '', label: 'All shops' },
              { value: 'true', label: 'Open' },
              { value: 'false', label: 'Closed' },
            ]}
          />
          <FilterSelect
            name="isActive"
            label="Account"
            value={query.isActive}
            options={[
              { value: '', label: 'All accounts' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
          />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No barbers found" />
      ) : (
        <TableShell>
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Barber</th>
                <th className="px-4 py-3 text-left font-semibold">Shop</th>
                <th className="px-4 py-3 text-left font-semibold">Payout</th>
                <th className="px-4 py-3 text-left font-semibold">Location</th>
                <th className="px-4 py-3 text-right font-semibold">Rating</th>
                <th className="px-4 py-3 text-left font-semibold">State</th>
                <th className="px-4 py-3 text-left font-semibold">Account</th>
              </tr>
            </thead>
            <tbody>
              {items.map((barber) => (
                <tr key={barber.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{barber.barberName || 'Unnamed'}</div>
                    <div className="font-mono text-xs text-muted-foreground">{barber.barberUserId || barber.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{barber.shopName || 'Shop unavailable'}</div>
                    <div className="font-mono text-xs text-muted-foreground">{barber.shopId || 'Shop id unavailable'}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{barber.payout?.upiId || 'UPI unavailable'}</div>
                    <div className="text-xs">{barber.payout?.beneficiaryId || 'Beneficiary not created'}</div>
                  </td>
                  <td className="max-w-64 px-4 py-3 text-muted-foreground">{barber.address || 'Address unavailable'}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {barber.rating?.average ? `${barber.rating.average} (${barber.rating.count})` : 'No ratings'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={barber.isOpen ? 'open' : 'closed'} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={barber.isActive ? 'active' : 'inactive'} />
                  </td>
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
