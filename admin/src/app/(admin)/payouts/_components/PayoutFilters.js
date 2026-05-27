'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, RotateCcw } from 'lucide-react';

import { PAYOUT_GATEWAY_OPTIONS, PAYOUT_SORT_OPTIONS, PAYOUT_STATUS_OPTIONS } from './shared/payout-format';

export function PayoutFilters() {
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
    <form onSubmit={applyFilters} className="rounded-md border border-border bg-card p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Status</span>
          <select
            name="status"
            defaultValue={searchParams.get('status') || ''}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
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
            defaultValue={searchParams.get('gateway') || ''}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">All gateways</option>
            {PAYOUT_GATEWAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1 md:col-span-2 xl:col-span-1">
          <span className="text-xs font-semibold text-muted-foreground">Barber ID</span>
          <input
            name="barberId"
            defaultValue={searchParams.get('barberId') || ''}
            placeholder="ObjectId"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm font-mono"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">From</span>
          <input
            type="date"
            name="startDate"
            defaultValue={searchParams.get('startDate') || ''}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">To</span>
          <input
            type="date"
            name="endDate"
            defaultValue={searchParams.get('endDate') || ''}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Sort</span>
          <select
            name="sort"
            defaultValue={searchParams.get('sort') || 'createdAt:desc'}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {PAYOUT_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="inline-flex h-9 items-center gap-2 rounded bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Filter className="h-4 w-4" />
          Apply filters
        </button>
        <Link
          href="?tab=history&page=1"
          className="inline-flex h-9 items-center gap-2 rounded border border-border px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Link>
      </div>
    </form>
  );
}

export default PayoutFilters;
