import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJWTPayload } from '@/lib/jwt';

export const metadata = {
  title: 'EverCut Admin — Portal Gateway',
  description: 'Designated administrative route access gateway for EverCut operations.',
};

/**
 * Designated entry route: /adminevercut
 * Validates admin session before granting entry to admin panel.
 */
export default async function AdminEvercutEntryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('evercut_admin_session')?.value;

  if (token) {
    const payload = decodeJWTPayload(token);
    const isValidAdmin = payload && payload.role === 'ADMIN';
    const isExpired = payload ? payload.exp * 1000 < Date.now() : true;

    if (isValidAdmin && !isExpired) {
      redirect('/overview');
    }
  }

  // Not logged in or expired session -> redirect to login with destination
  redirect('/login?returnTo=/overview');
}
