import { redirect } from 'next/navigation';

import { EmptyState, ErrorNotice, SectionHeader, TableShell } from '@/components/ui/AdminPrimitives';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getValidAccessToken } from '@/lib/auth';
import { normalizePagination } from '@/lib/pagination';
import { refundQuerySchema } from '@/lib/schemas/admin-resource.schema';
import { getRefunds } from '@/lib/services/payment.service';

export const dynamic = 'force-dynamic';

const moneyFromPaisa = (value) => `Rs ${(Number(value || 0) / 100).toLocaleString('en-IN')}`;

export default async function RefundsPage({ searchParams }) {
  const token = await getValidAccessToken();
  if (!token) redirect('/login');

  const resolvedParams = await searchParams;
  const parsed = refundQuerySchema.safeParse(resolvedParams);
  const query = parsed.success ? parsed.data : { page: 1, limit: 20, status: '', refundStatus: '' };
  const response = await getRefunds({ ...query, token });
  const items = response.success ? response.data || [] : [];
  const pagination = normalizePagination(response.meta, { page: query.page, totalDocuments: items.length });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Refunds"
        description="Read-only refund status and payment references."
      />
      <ErrorNotice message={!response.success ? response.message : null} />

      <div className="flex flex-wrap gap-3">
        <FilterSelect
          name="refundStatus"
          label="Refund"
          value={query.refundStatus}
          options={[
            { value: '', label: 'All refunds' },
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' },
          ]}
        />
        <FilterSelect
          name="status"
          label="Payment"
          value={query.status}
          options={[
            { value: '', label: 'All payments' },
            { value: 'refund_pending', label: 'Refund pending' },
            { value: 'refunded', label: 'Refunded' },
            { value: 'refund_failed', label: 'Refund failed' },
          ]}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState title="No refunds found" />
      ) : (
        <TableShell>
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Refund</th>
                <th className="px-4 py-3 text-left font-semibold">Payment</th>
                <th className="px-4 py-3 text-left font-semibold">Booking</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Shop</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Initiated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((payment) => (
                <tr key={payment.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-foreground">{payment.refund?.merchantRefundId || 'Merchant refund id unavailable'}</div>
                    <div className="font-mono text-xs text-muted-foreground">{payment.refund?.gatewayRefundId || 'Gateway id not returned'}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{payment.id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{payment.booking?.id || payment.bookingId || 'Booking unavailable'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{payment.customer ? `${payment.customer.firstName || ''} ${payment.customer.lastName || ''}`.trim() : 'Customer unavailable'}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{payment.shop?.shopName || 'Shop unavailable'}</td>
                  <td className="px-4 py-3 text-right font-mono">{moneyFromPaisa(payment.refund?.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge value={payment.refund?.status || payment.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {payment.refund?.initiatedAt ? new Date(payment.refund.initiatedAt).toLocaleString('en-IN') : 'Initiation time unavailable'}
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
