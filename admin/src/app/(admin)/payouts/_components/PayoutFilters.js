'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, RotateCcw } from 'lucide-react';

import { PAYOUT_GATEWAY_OPTIONS, PAYOUT_SORT_OPTIONS, PAYOUT_STATUS_OPTIONS } from './shared/payout-format';

export function PayoutFilters({ query = {} }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function applyFilters(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'history');
    params.set('page', '1');

    for (const key of ['status', 'gateway', 'barberId', 'startDate', 'endDate', 'sort']) {
      const value = String(formData.get(key) || '').trim();
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    router.push(`?${params.toString()}`);
  }

  return (
    <form key={JSON.stringify(query)} onSubmit={applyFilters} className="rounded-md border border-border bg-card p-4 transition-all duration-200">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Status</span>
          <select
            name="status"
            defaultValue={query.status || ''}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-150"
          >
            <option value="">All statuses</option>
            {PAYOUT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Gateway</span>
          <select
            name="gateway"
            defaultValue={query.gateway || ''}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-150"
          >
            <option value="">All gateways</option>
            {PAYOUT_GATEWAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Barber ID</span>
          <input
            name="barberId"
            defaultValue={query.barberId || ''}
            placeholder="ObjectId"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-150"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Sort</span>
          <select
            name="sort"
            defaultValue={query.sort || 'createdAt:desc'}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-150"
          >
            {PAYOUT_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">From</span>
          <input
            type="date"
            name="startDate"
            defaultValue={query.startDate || ''}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-150"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">To</span>
          <input
            type="date"
            name="endDate"
            defaultValue={query.endDate || ''}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-150"
          />
        </label>

        {/* Buttons container embedded in the grid */}
        <div className="flex items-center gap-2 self-end h-9 mt-2 sm:mt-0 sm:col-span-2 md:col-span-3 lg:col-span-2">
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-2 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors duration-150 cursor-pointer"
          >
            <Filter className="h-4 w-4" />
            Apply filters
          </button>
          <Link
            href="?tab=history&page=1"
            className="inline-flex h-9 items-center gap-2 rounded border border-border px-4 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Link>
        </div>
      </div>
    </form>
  );
}

export default PayoutFilters;
