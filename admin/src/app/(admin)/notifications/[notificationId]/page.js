import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Bell, CheckCircle2, Users, XCircle } from 'lucide-react';

import { ErrorNotice, MetricCard, SectionHeader, TableShell } from '@/components/ui/AdminPrimitives';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getValidAccessToken } from '@/lib/auth';
import { notificationParamSchema } from '@/lib/schemas/notification.schema';
import {
  getNotification,
  getNotificationAuditLogs,
  getNotificationRecipients,
} from '@/lib/services/notification.service';

export const dynamic = 'force-dynamic';

const formatDate = (value) => (value ? new Date(value).toLocaleString('en-IN') : 'Unavailable');
const labelize = (value) => String(value || 'unknown').replaceAll('_', ' ');

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-3">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="sm:col-span-2 text-sm text-foreground">{value || 'Unavailable'}</dd>
    </div>
  );
}

function TokenAttemptRow({ attempt }) {
  return (
    <tr className="border-b border-border/50 last:border-0 bg-muted/10">
      <td className="pl-10 pr-4 py-2 font-mono text-xs text-muted-foreground" colSpan={2}>
        {attempt.platform || 'unknown'}
      </td>
      <td className="px-4 py-2 text-right font-mono text-xs">{attempt.success ? 1 : 0}</td>
      <td className="px-4 py-2 text-right font-mono text-xs">{attempt.success ? 0 : 1}</td>
      <td className="px-4 py-2">
        {attempt.success ? (
          <StatusBadge value="sent" />
        ) : attempt.invalidToken ? (
          <StatusBadge value="invalid_token" />
        ) : (
          <StatusBadge value="failed" />
        )}
      </td>
      <td className="px-4 py-2 font-mono text-xs text-muted-foreground truncate max-w-48">
        {attempt.firebaseMessageId || attempt.firebaseErrorCode || '—'}
      </td>
    </tr>
  );
}

export default async function NotificationDetailPage({ params }) {
  const token = await getValidAccessToken();
  if (!token) redirect('/login');

  const resolvedParams = await params;
  const parsed = notificationParamSchema.safeParse(resolvedParams);
  if (!parsed.success) notFound();

  const { notificationId } = parsed.data;
  const [notificationResponse, recipientsResponse, auditsResponse] = await Promise.all([
    getNotification(notificationId, { token }),
    getNotificationRecipients(notificationId, { page: 1, limit: 25, token }),
    getNotificationAuditLogs(notificationId, { limit: 25, token }),
  ]);

  if (!notificationResponse.success) notFound();

  const notification = notificationResponse.data;
  const recipients = recipientsResponse.success ? recipientsResponse.data || [] : [];
  const audits = auditsResponse.success ? auditsResponse.data || [] : [];
  const metrics = notification.metrics || {};

  return (
    <div className="space-y-6">
      {/* Main Header Row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <SectionHeader
            title={notification.title}
            description={notification.body}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link 
            href="/notifications" 
            className="group inline-flex h-6 items-center gap-1 rounded border border-border bg-card px-2 text-[11px] font-semibold uppercase tracking-normal text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            <ArrowLeft className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Back to Notifications</span>
          </Link>
        </div>
      </div>

      <ErrorNotice message={!recipientsResponse.success ? recipientsResponse.message : null} />
      <ErrorNotice message={!auditsResponse.success ? auditsResponse.message : null} />

      {/* User Delivery Outcome */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">User Delivery Outcome</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Target Audience" value={metrics.recipientCount || 0} detail={labelize(notification.audience?.mode)} icon={Users} tone="sky" />
          <MetricCard label="Delivered" value={notification.reporting?.deliveredUsers ?? 0} detail="Received push on >= 1 device" icon={CheckCircle2} tone="green" />
          <MetricCard label="Failed" value={notification.reporting?.failedUsers ?? 0} detail="All push delivery attempts failed" icon={XCircle} tone={notification.reporting?.failedUsers ? 'red' : 'green'} />
          <MetricCard label="Offline" value={notification.reporting?.offlineUsers ?? 0} detail="No registered app devices" icon={Bell} tone="amber" />
        </div>
      </div>

      {/* Technical Device Metrics */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Technical Device Metrics</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Registered Devices" value={metrics.tokenCount || 0} detail="Active devices targeted" icon={Bell} tone="primary" />
          <MetricCard label="Push Alerts Sent" value={metrics.successCount || 0} detail="Pushes accepted by FCM" icon={CheckCircle2} tone="green" />
          <MetricCard label="Push Alert Failures" value={metrics.failureCount || 0} detail="Pushes rejected by FCM" icon={XCircle} tone={metrics.failureCount ? 'red' : 'green'} />
          <MetricCard label="Expired Registrations" value={metrics.invalidTokenCount || 0} detail="Tokens marked invalid" icon={XCircle} tone="amber" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Notification</h2>
          <dl className="mt-2">
            <DetailRow label="Status" value={<StatusBadge value={notification.status} label={notification.displayStatus} />} />
            <DetailRow label="Type" value={labelize(notification.type)} />
            <DetailRow label="Category" value={labelize(notification.category)} />
            <DetailRow label="Created" value={formatDate(notification.createdAt)} />
            <DetailRow label="Sent" value={formatDate(notification.sentAt)} />
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Audience &amp; Payload</h2>
          <dl className="mt-2">
            <DetailRow label="Mode" value={labelize(notification.audience?.mode)} />
            <DetailRow label="Payload" value={<code className="break-all text-xs">{JSON.stringify(notification.data || {})}</code>} />
          </dl>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Recipients &amp; Token Delivery</h2>
        <TableShell>
          <table className="w-full min-w-200 text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">User</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-right font-semibold">Success</th>
                <th className="px-4 py-3 text-right font-semibold">Failure</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Firebase / Error</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((recipient) => (
                <>
                  <tr key={recipient.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{recipient.userId}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{recipient.roleType}</td>
                    <td className="px-4 py-3 text-right font-mono">{recipient.successCount || 0}</td>
                    <td className="px-4 py-3 text-right font-mono">{recipient.failureCount || 0}</td>
                    <td className="px-4 py-3"><StatusBadge value={recipient.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {recipient.skippedReason
                        ? <span className="italic">{recipient.skippedReason}</span>
                        : `${recipient.tokenCount || 0} token(s)`}
                    </td>
                  </tr>
                  {(recipient.tokenAttempts || []).map((attempt, i) => (
                    <TokenAttemptRow key={`${recipient.id}-token-${i}`} attempt={attempt} />
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </TableShell>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Audit Log</h2>
        <TableShell>
          <table className="w-full min-w-160 text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Action</th>
                <th className="px-4 py-3 text-left font-semibold">Actor</th>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs font-semibold text-foreground">{audit.action}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{audit.actorUserId || 'System'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(audit.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </section>
    </div>
  );
}
