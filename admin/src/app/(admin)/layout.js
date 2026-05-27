import { redirect } from 'next/navigation';
import { AuthProvider } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNavigationDrawer } from '@/components/layout/MobileNavigationDrawer';
import { getValidAccessToken } from '@/lib/auth';

/**
 * Administrative shell enclosing Sidebar, Header, and Mobile Navigation components.
 * Hydrates AuthProvider with active session data decoded from secure cookies.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Main routing screen content
 */
export default async function AdminLayout({ children }) {
  const token = await getValidAccessToken();

  if (!token) {
    redirect('/login');
  }

  // Decode JWT payload on server
  let userProfile = null;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      userProfile = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    }
  } catch (e) {
    // Malformed token, redirect to login
    redirect('/login');
  }

  if (!userProfile) {
    redirect('/login');
  }

  return (
    <AuthProvider value={userProfile}>
      <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
        {/* Mobile slide-in navigation drawer */}
        <MobileNavigationDrawer />

        {/* Desktop Collapsible Navigation Sidebar */}
        <Sidebar className="hidden lg:block shrink-0" />

        {/* Content Container Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top persistent header */}
          <Header className="w-full shrink-0" />

          {/* Main content viewport */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-8 max-w-8xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
export { metadata } from '../layout';
