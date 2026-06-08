import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Eye } from 'lucide-react';

import { ErrorNotice, EmptyState, SectionHeader, TableShell } from '@/components/ui/AdminPrimitives';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TableSearchBar } from '@/components/ui/TableSearchBar';
import { getValidAccessToken } from '@/lib/auth';
import { normalizePagination } from '@/lib/pagination';
import { customerDirectoryQuerySchema } from '@/lib/schemas/admin-resource.schema';
import { getCustomers } from '@/lib/services/user.service';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({ searchParams }) {
  const token = await getValidAccessToken();
  if (!token) redirect('/login');

  const resolvedParams = await searchParams;
  const parsed = customerDirectoryQuerySchema.safeParse(resolvedParams);
  const query = parsed.success ? parsed.data : { page: 1, limit: 20, search: '', isActive: '' };
  const response = await getCustomers({ ...query, token });
  const items = response.success ? response.data || [] : [];
  const pagination = normalizePagination(response.meta, { page: query.page, totalDocuments: items.length });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Customer Directory"
        description="Search customer registrations, account state, and booking activity."
      />
      <ErrorNotice message={!response.success ? response.message : null} />

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <TableSearchBar queryParam="search" placeholder="Search phone, email, or name" />
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

      {items.length === 0 ? (
        <EmptyState title="No customers found" />
      ) : (
        <TableShell>
          <table className="w-full min-w-245 text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Contact</th>
                <th className="px-4 py-3 text-left font-semibold">Customer ID</th>
                <th className="px-4 py-3 text-left font-semibold">Address</th>
                <th className="px-4 py-3 text-right font-semibold">Bookings</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Registered</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {customer.fullName || 'Unnamed'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{customer.contact?.phoneNumber || 'Phone unavailable'}</div>
                    <div className="text-xs">{customer.contact?.email || 'Email unavailable'}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{customer.id}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={customer.address}>
                    {customer.address || 'Address unavailable'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{customer.totalBookings || 0}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={customer.isActive ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {customer.registeredAt ? new Date(customer.registeredAt).toLocaleDateString('en-IN') : 'Registration date unavailable'}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={`/customers/${customer.id}`} 
                        className="inline-flex h-8 items-center gap-1.5 rounded border border-border px-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </div>
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
