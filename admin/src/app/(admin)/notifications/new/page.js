import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { SectionHeader } from '@/components/ui/AdminPrimitives';
import { getValidAccessToken } from '@/lib/auth';
import { NotificationForm } from '../_components/NotificationForm';

export const dynamic = 'force-dynamic';

export default async function NewNotificationPage() {
  const token = await getValidAccessToken();
  if (!token) redirect('/login');

  return (
    <div className="space-y-6">
      {/* Main Header Row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <SectionHeader
          title="New Notification"
          description="Send a targeted Firebase Cloud Messaging broadcast to users."
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
      <NotificationForm />
    </div>
  );
}
