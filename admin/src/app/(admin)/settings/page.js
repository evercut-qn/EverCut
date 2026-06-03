import { redirect } from 'next/navigation';
import { getValidAccessToken } from '@/lib/auth';
import { decodeJWTPayload } from '@/lib/jwt';
import { SettingsClient } from './_components/SettingsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Settings & Profile | EverCut Admin',
  description: 'Manage your administrator profile details and session security credentials.',
};

/**
 * Settings & Profile Server Page.
 * Authenticates the session, decodes parameters, and passes data to the client panel.
 */
export default async function SettingsPage() {
  const token = await getValidAccessToken();

  if (!token) {
    redirect('/login');
  }

  const payload = decodeJWTPayload(token);
  if (!payload) {
    redirect('/login');
  }

  // Extract primary properties and separate meta fields
  const { name, role, phone, sub } = payload;
  const user = { 
    name: name || payload.name || 'Administrator', 
    role: role || payload.role || 'Admin', 
    phone: phone || payload.phoneNumber || payload.phone || null,
    id: sub || payload.id || null
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl lg:text-3xl font-bold font-display tracking-tight text-foreground">
          Settings & Profile
        </h1>
        <p className="text-xs text-muted-foreground mt-1.5 leading-normal">
          View your administrator profile details and manage sign-out operations.
        </p>
      </div>

      {/* Interactive Main settings Client Panel */}
      <SettingsClient user={user} />

    </div>
  );
}
