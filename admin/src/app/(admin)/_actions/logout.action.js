'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Server Action to clear the admin session cookie and redirect the user.
 */
export async function handleLogoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get('evercut_admin_session')?.value;

  if (token) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      await fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (e) {
      // Ignore network errors on logout
    }
  }

  cookieStore.delete('evercut_admin_session');
  cookieStore.delete('evercut_admin_refresh_token');
  redirect('/login');
}
