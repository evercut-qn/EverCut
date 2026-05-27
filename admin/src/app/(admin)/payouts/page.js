import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getPayouts, getPendingPayouts } from '@/lib/services/payout.service';
import { PayoutsTable } from './_components/PayoutsTable';
import { PendingPayoutsTable } from './_components/PendingPayoutsTable';
import { cn } from '@/lib/utils/cn';
import { getValidAccessToken } from '@/lib/auth';

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

  const currentTab = resolvedParams.tab || 'pending';
  const page = Number(resolvedParams.page) || 1;
  const limit = Number(resolvedParams.limit) || 20;

  let pendingData = [];
  let pendingTotal = 0;
  let historyData = [];
  let historyTotal = 0;
  let fetchError = null;

  if (currentTab === 'pending') {
    const response = await getPendingPayouts({ 
      page, 
      limit, 
      search: resolvedParams.search || '', 
      token 
    });
    if (response.success) {
      pendingData = response.data || [];
      pendingTotal = response.meta?.pagination?.totalDocuments || pendingData.length;
    } else {
      fetchError = response.message;
    }
  } else {
    const response = await getPayouts({ 
      page, 
      limit, 
      status: resolvedParams.status || '', 
      gateway: resolvedParams.gateway || '', 
      token 
    });
    if (response.success) {
      historyData = response.data || [];
      historyTotal = response.meta?.pagination?.totalDocuments || historyData.length;
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
          Review outstanding barber balances, initiate manual settlements, and track transaction logs.
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
              totalItems={pendingTotal} 
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
            <PayoutsTable 
              initialData={historyData} 
              totalItems={historyTotal} 
              defaultLimit={limit} 
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
