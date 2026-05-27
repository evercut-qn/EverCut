'use client';

import { useTransition } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender 
} from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils/cn';
import { handleApprovePayoutAction } from '../_actions/payout.action';

/**
 * Paginated data grid for payouts tracking.
 *
 * @param {Object} props
 * @param {Array} props.initialData - Current list of payouts
 * @param {number} props.totalItems - Total records
 * @param {number} [props.defaultLimit=20] - Default limit
 */
export function PayoutsTable({ initialData = [], totalItems = 0, defaultLimit = 20 }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentPage = Number(searchParams.get('page')) || 1;
  const currentLimit = Number(searchParams.get('limit')) || defaultLimit;
  const totalPages = Math.ceil(totalItems / currentLimit);

  // Trigger payout transaction retry (mapped through the same server action)
  function onRetry(payoutId) {
    startTransition(async () => {
      try {
        const result = await handleApprovePayoutAction(payoutId);
        if (result.success) {
          toast.success(result.message || 'Payout retry initiated.');
        } else {
          toast.error(result.message || 'Retry failed.');
        }
      } catch (e) {
        toast.error('Connection error during retry operation.');
      }
    });
  }

  const columns = [
    {
      accessorKey: 'barberName',
      header: 'Barber Profile',
      cell: ({ row }) => {
        const barber = row.original.barber;
        const name = barber
          ? (barber.accountHolderName || `${barber.firstName} ${barber.lastName}`.trim())
          : (row.original.barberName || 'N/A');
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{name}</span>
            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">
              {row.original.barberId || row.original.id}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount (INR)',
      cell: ({ row }) => {
        const amountVal = row.original.amountInRupees !== undefined
          ? row.original.amountInRupees
          : (row.original.amount ? row.original.amount / 100 : 0);
        return (
          <span className="font-semibold font-mono text-foreground">
            ₹{amountVal.toLocaleString('en-IN')}
          </span>
        );
      },
    },
    {
      accessorKey: 'transferMode',
      header: 'Mode',
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-muted border border-border text-foreground uppercase">
          {row.original.transferMode || row.original.payoutMethod || 'UPI'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = (row.original.status || 'PENDING').toUpperCase();
        const colorMap = {
          PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
          INITIATED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
          SUCCESS: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
          FAILED: "bg-destructive/10 text-destructive border-destructive/20",
          REVERSED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        };
        return (
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize",
            colorMap[status] || "bg-muted text-muted-foreground border-border"
          )}>
            {status.toLowerCase()}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Requested Date',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }) : 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'utr',
      header: 'UTR Reference',
      cell: ({ row }) => (
        <span className="text-xs font-mono text-muted-foreground">
          {row.original.utr || '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const status = (row.original.status || 'PENDING').toUpperCase();
        const isRetryable = ['FAILED', 'REVERSED'].includes(status);
        if (!isRetryable) return null;

        return (
          <button
            onClick={() => onRetry(row.original.id || row.original._id)}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-500 rounded hover:bg-amber-500/20 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                Retry
              </>
            )}
          </button>
        );
      },
    },
  ];

  const table = useReactTable({
    data: initialData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  function handlePageChange(nextPage) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Table block */}
      <div className="w-full overflow-x-auto rounded-md border border-border bg-card shadow-sm">
        <table className="w-full min-w-max text-left border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-border bg-muted/30">
                {group.headers.map((header) => (
                  <th key={header.id} className="p-4 font-semibold text-muted-foreground select-none">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-muted/10 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-4 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-12 text-center text-muted-foreground">
                  No payout transactions logged in this cycle.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing page <strong>{currentPage}</strong> of <strong>{totalPages || 1}</strong> ({totalItems} total records)
        </span>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 border border-border rounded hover:bg-muted disabled:opacity-50 transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 border border-border rounded hover:bg-muted disabled:opacity-50 transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
export default PayoutsTable;
