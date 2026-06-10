import { redirect } from 'next/navigation';

import { EmptyState, ErrorNotice, SectionHeader, TableShell } from '@/components/ui/AdminPrimitives';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getValidAccessToken } from '@/lib/auth';
import { normalizePagination } from '@/lib/pagination';
import { subscriptionQuerySchema } from '@/lib/schemas/admin-resource.schema';
import { getSubscriptions } from '@/lib/services/subscription.service';

export const dynamic = 'force-dynamic';

const planLabel = (planId) => ({
  PLAN_BASIC: 'Basic',
  PLAN_POPULAR: 'Popular',
  PLAN_ADVANCED: 'Advanced',
}[planId] || planId || 'Plan unavailable');

export default async function SubscriptionsPage({ searchParams }) {
  const token = await getValidAccessToken();
  if (!token) redirect('/login');

  const resolvedParams = await searchParams;
  const parsed = subscriptionQuerySchema.safeParse(resolvedParams);
  const query = parsed.success ? parsed.data : { page: 1, limit: 20, planId: '', status: '' };
  const response = await getSubscriptions({ ...query, token });
  const items = response.success ? response.data || [] : [];
  const pagination = normalizePagination(response.meta, { page: query.page, totalDocuments: items.length });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Subscriptions"
        description="Read-only subscription levels and current barber status."
      />
      <ErrorNotice message={!response.success ? response.message : null} />

      <div className="flex flex-wrap gap-3">
        <FilterSelect
          name="planId"
          label="Plan"
          value={query.planId}
          options={[
            { value: '', label: 'All plans' },
            { value: 'PLAN_BASIC', label: 'Basic' },
            { value: 'PLAN_POPULAR', label: 'Popular' },
            { value: 'PLAN_ADVANCED', label: 'Advanced' },
          ]}
        />
        <FilterSelect
          name="status"
          label="Status"
          value={query.status}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'PENDING_PAYMENT', label: 'Pending payment' },
            { value: 'PAST_DUE', label: 'Past due' },
            { value: 'PAUSED', label: 'Paused' },
            { value: 'CANCELLED', label: 'Cancelled' },
            { value: 'EXPIRED', label: 'Expired' },
          ]}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState title="No subscriptions found" />
      ) : (
        <TableShell>
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Barber</th>
                <th className="px-4 py-3 text-left font-semibold">Shop</th>
                <th className="px-4 py-3 text-left font-semibold">Plan</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Period</th>
                <th className="px-4 py-3 text-right font-semibold">Photos</th>
                <th className="px-4 py-3 text-right font-semibold">Videos</th>
                <th className="px-4 py-3 text-right font-semibold">Statements</th>
              </tr>
            </thead>
            <tbody>
              {items.map((subscription) => (
                <tr key={subscription.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{subscription.barberName || 'Barber unavailable'}</div>
                    <div className="font-mono text-xs text-muted-foreground">{subscription.barberId}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{subscription.shopName || 'Shop unavailable'}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{planLabel(subscription.planId)}</td>
                  <td className="px-4 py-3"><StatusBadge value={subscription.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {[subscription.currentPeriodStart, subscription.currentPeriodEnd]
                      .filter(Boolean)
                      .map((value) => new Date(value).toLocaleDateString('en-IN'))
                      .join(' - ') || 'Period unavailable'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{subscription.usage?.photos || 0}</td>
                  <td className="px-4 py-3 text-right font-mono">{subscription.usage?.videos || 0}</td>
                  <td className="px-4 py-3 text-right font-mono">{subscription.usage?.statements || 0}</td>
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
