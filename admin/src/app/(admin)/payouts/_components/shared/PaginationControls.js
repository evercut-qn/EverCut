'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PaginationControls({ pagination, pageSize }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentPage = pagination?.currentPage || 1;
  const totalPages = pagination?.totalPages || 1;
  const totalDocuments = pagination?.totalDocuments || 0;

  function goToPage(nextPage) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 px-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
        {' '}({totalDocuments} records, {pageSize} per page)
      </span>

      <div className="flex items-center gap-2">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded border border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded border border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default PaginationControls;
