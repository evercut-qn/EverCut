'use client';

import { useTransition, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';

/**
 * Search input component that syncs its value with URL search parameters.
 * Debounces keyboard inputs to avoid spamming search queries.
 *
 * @param {Object} props
 * @param {string} [props.placeholder='Search...'] - Search input placeholder
 * @param {string} [props.queryParam='q'] - URL parameter key to map to
 * @param {number} [props.debounceMs=400] - Keyboard debounce timing
 */
export function TableSearchBar({ placeholder = 'Search...', queryParam = 'q', debounceMs = 400 }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [value, setValue] = useState(searchParams.get(queryParam) || '');

  useEffect(() => {
    const handler = setTimeout(() => {
      const currentParam = searchParams.get(queryParam) || '';
      if (value === currentParam) {
        return; // Avoid loop if value hasn't changed from URL param
      }

      const params = new URLSearchParams(searchParams.toString());
      
      if (value) {
        params.set(queryParam, value);
      } else {
        params.delete(queryParam);
      }
      
      // Reset page to 1 on filter trigger
      params.set('page', '1');

      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [value, queryParam, searchParams, router, debounceMs]);

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 border border-border rounded-md text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-shadow"
      />
      {isPending && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
export default TableSearchBar;
