import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Bell, Eye, Plus } from 'lucide-react';

import { EmptyState, ErrorNotice, MetricCard, SectionHeader, TableShell } from '@/components/ui/AdminPrimitives';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TableSearchBar } from '@/components/ui/TableSearchBar';
import { getValidAccessToken } from '@/lib/auth';
import { normalizePagination } from '@/lib/pagination';
import { notificationQuerySchema } from '@/lib/schemas/notification.schema';
import { getNotifications } from '@/lib/services/notification.service';

export const dynamic = 'force-dynamic';

const formatDate = (value) => (value ? new Date(value).toLocaleString('en-IN') : 'Not sent');

export default async function NotificationsPage({ searchParams }) {
  const token = await getValidAccessToken();
  if (!token) redirect('/login');

  const resolvedParams = await searchParams;
  const parsed = notificationQuerySchema.safeParse(resolvedParams);
  const query = parsed.success ? parsed.data : { page: 1, limit: 20, status: '', category: '', search: '' };
  const response = await getNotifications({ ...query, token });
  const items = response.success ? response.data || [] : [];
  const pagination = normalizePagination(response.meta, { page: query.page, totalDocuments: items.length });

  const sentCount = items.filter((item) => item.status === 'sent').length;
  const sendingCount = items.filter((item) => item.status === 'sending').length;
  const failedCount = items.filter((item) => item.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionHeader
          title="Notifications"
          description="Create, send, and audit Firebase Cloud Messaging broadcast notifications."
        />
        <Link
          href="/notifications/new"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Notification
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Visible Notifications" value={items.length} detail="Current filtered result page" icon={Bell} tone="sky" />
        <MetricCard label="Processing" value={sendingCount} detail="Currently dispatching to audience" icon={Bell} tone="amber" />
        <MetricCard label="Completed" value={sentCount} detail={`${failedCount} failed on this page`} icon={Bell} tone={failedCount ? 'red' : 'green'} />
      </div>

      <ErrorNotice message={!response.success ? response.message : null} />

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <TableSearchBar queryParam="search" placeholder="Search title or message" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <FilterSelect
            name="status"
            label="Status"
            value={query.status}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'sending', label: 'Processing' },
              { value: 'sent', label: 'Completed' },
              { value: 'failed', label: 'Failed' },
            ]}
          />
          <FilterSelect
            name="category"
            label="Category"
            value={query.category}
            options={[
              { value: '', label: 'All categories' },
              { value: 'admin_broadcast', label: 'Admin broadcast' },
              { value: 'system_alert', label: 'System alert' },
              { value: 'transactional', label: 'Transactional' },
              { value: 'silent_sync', label: 'Silent sync' },
              { value: 'promotional', label: 'Promotional' },
            ]}
          />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No notifications found" />
      ) : (
        <TableShell>
          <table className="w-full min-w-230 text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Notification</th>
                <th className="px-4 py-3 text-left font-semibold">Audience</th>
                <th className="px-4 py-3 text-right font-semibold">Recipients</th>
                <th className="px-4 py-3 text-right font-semibold">Success</th>
                <th className="px-4 py-3 text-right font-semibold">Failures</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Sent</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((notification) => (
                <tr key={notification.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {notification.imageUrl && (
                        <Image
                          src={notification.imageUrl}
                          alt=""
                          width={64}
                          height={40}
                          unoptimized
                          className="h-10 w-16 rounded border border-border object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{notification.title}</div>
                        <div className="max-w-md truncate text-xs text-muted-foreground">{notification.body}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {String(notification.audience?.mode || 'unknown').replaceAll('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{notification.metrics?.recipientCount || 0}</td>
                  <td className="px-4 py-3 text-right font-mono">{notification.metrics?.successCount || 0}</td>
                  <td className="px-4 py-3 text-right font-mono">{notification.metrics?.failureCount || 0}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={notification.status} label={notification.displayStatus} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(notification.sentAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Link
                        href={`/notifications/${notification.id}`}
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
