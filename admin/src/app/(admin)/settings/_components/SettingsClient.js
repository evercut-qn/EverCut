'use client';

import { useTransition } from 'react';
import { LogOut, Loader2, Shield } from 'lucide-react';
import { handleLogoutAction } from '@/app/(admin)/_actions/logout.action';

/**
 * Settings Client Component.
 * Handles user profile details and sign-out actions.
 *
 * @param {Object} props
 * @param {Object} props.user - Active user profile parameters
 */
export function SettingsClient({ user }) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = (e) => {
    e.preventDefault();
    startTransition(async () => {
      await handleLogoutAction();
    });
  };

  // Generate initials for profile card avatar
  const initials = (user?.name || 'A')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="max-w-2xl space-y-6">
      
      {/* Card 1: User Profile details */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xl font-display select-none shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{user?.name || 'Administrator'}</h2>
            <p className="text-xs text-muted-foreground capitalize font-semibold flex items-center gap-1.5 mt-0.5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              {user?.role || 'Admin'} Permission Level
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Administrator Name</span>
            <p className="font-medium text-foreground bg-muted/40 p-2.5 rounded border border-border/50">
              {user?.name || '—'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Role Authorization</span>
            <p className="font-medium text-foreground bg-muted/40 p-2.5 rounded border border-border/50 uppercase tracking-wider">
              {user?.role || '—'}
            </p>
          </div>
          {user?.phone && (
            <div className="space-y-1 sm:col-span-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Verified Mobile Number</span>
              <p className="font-mono font-medium text-foreground bg-muted/40 p-2.5 rounded border border-border/50 select-all">
                {user.phone}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Card 2: Logout Controls */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground font-display">Sign Out Control</h3>
          <p className="text-xs text-muted-foreground mt-1">
            End your active administration session. You will be redirected to the login panel immediately.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleLogout}
            className="inline-flex items-center gap-2 py-2.5 px-4 bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 rounded-md text-xs font-bold transition-colors cursor-pointer select-none"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <LogOut className="h-4 w-4 shrink-0" />
            )}
            Sign Out Account
          </button>
        </div>
      </div>

    </div>
  );
}

export default SettingsClient;
