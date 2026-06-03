import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getPayouts, getPendingPayouts } from '@/lib/services/payout.service';
import { PayoutsTable } from './_components/PayoutsTable';
import { PendingPayoutsTable } from './_components/PendingPayoutsTable';
import { PayoutFilters } from './_components/PayoutFilters';
import { cn } from '@/lib/utils/cn';
import { getValidAccessToken } from '@/lib/auth';
import { payoutListQuerySchema } from '@/lib/schemas/payout.schema';
import { getPagination } from './_components/shared/payout-format';

export const dynamic = 'force-dynamic';

/**
 * Server Component: Payouts Ledger & Pending Settlements.
 * Coordinates pending balances aggregations and processed transaction history logs.
 *
 * @param {Object} props
 * @param {Promise<Object>} props.searchParams - Routing search parameters
 */
export default async function PayoutsPage({ searchParams }) {
  const resolvedParams = await searchParams;
  const token = await getValidAccessToken();

  if (!token) {
    redirect('/login');
  }

  const parsedParams = payoutListQuerySchema.safeParse(resolvedParams);
  const query = parsedParams.success
    ? parsedParams.data
    : {
      tab: resolvedParams.tab === 'history' ? 'history' : 'pending',
      page: 1,
      limit: 20,
      sort: 'createdAt:desc',
      search: '',
    };

  const currentTab = query.tab;
  const page = query.page;
  const limit = query.limit;

  let pendingData = [];
  let pendingPagination = getPagination(null, { page, totalDocuments: 0 });
  let historyData = [];
  let historyPagination = getPagination(null, { page, totalDocuments: 0 });
  let fetchError = null;

  if (currentTab === 'pending') {
    const response = await getPendingPayouts({ 
      page, 
      limit, 
      search: query.search || '',
      token 
    });
    if (response.success) {
      pendingData = response.data || [];
      pendingPagination = getPagination(response.meta, {
        page,
        totalDocuments: pendingData.length,
      });
    } else {
      fetchError = response.message;
    }
  } else {
    const response = await getPayouts({ 
      page, 
      limit, 
      status: query.status || '',
      gateway: query.gateway || '',
      barberId: query.barberId || '',
      startDate: query.startDate || '',
      endDate: query.endDate || '',
      sort: query.sort || 'createdAt:desc',
      token 
    });
    if (response.success) {
      historyData = response.data || [];
      historyPagination = getPagination(response.meta, {
        page,
        totalDocuments: historyData.length,
      });
    } else {
      fetchError = response.message;
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight font-display text-foreground">Financial Ledger & Payouts</h1>
        <p className="text-sm text-muted-foreground">
          Review outstanding barber balances, record completed manual settlements, and track transaction logs.
        </p>
      </div>

      {/* Tabs Switcher Control */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          <Link
            href="?tab=pending&page=1"
            className={cn(
              "pb-3 text-sm font-semibold border-b-2 transition-colors -mb-[2px]",
              currentTab === 'pending'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Pending Payouts
          </Link>
          <Link
            href="?tab=history&page=1"
            className={cn(
              "pb-3 text-sm font-semibold border-b-2 transition-colors -mb-[2px]",
              currentTab === 'history'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Payout History
          </Link>
        </div>
      </div>

      {/* Database alerts */}
      {fetchError && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-sm">
          <strong>Database Sync Issue:</strong> {fetchError}
        </div>
      )}

      {!parsedParams.success && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          Some filters were invalid and have been ignored.
        </div>
      )}

      {/* Render selected view */}
      <div className="mt-4">
        {currentTab === 'pending' ? (
          <Suspense fallback={
            <div className="space-y-4">
              <div className="h-10 bg-muted animate-pulse rounded-md" />
              <div className="h-40 bg-muted animate-pulse rounded-md" />
            </div>
          }>
            <PendingPayoutsTable 
              initialData={pendingData} 
              pagination={pendingPagination}
              defaultLimit={limit} 
            />
          </Suspense>
        ) : (
          <Suspense fallback={
            <div className="space-y-4">
              <div className="h-10 bg-muted animate-pulse rounded-md" />
              <div className="h-40 bg-muted animate-pulse rounded-md" />
            </div>
          }>
            <div className="space-y-6">
              <PayoutFilters query={query} />
              <PayoutsTable 
                initialData={historyData} 
                pagination={historyPagination}
                defaultLimit={limit} 
              />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
}
