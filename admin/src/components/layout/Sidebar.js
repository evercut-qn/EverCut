'use client';

import { useState, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/hooks/useSidebarStore';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils/cn';
import { handleLogoutAction } from '@/app/(admin)/_actions/logout.action';
import { 
  Scissors, LayoutDashboard, Users, CreditCard, 
  Settings, LogOut, ChevronLeft, ChevronRight, Loader2, X
} from 'lucide-react';

/**
 * Collapsible navigation sidebar. Hides administrative routes
 * based on user privileges.
 *
 * @param {Object} props
 * @param {string} [props.className] - Sidebar layout overrides
 */
export function Sidebar({ className, forceExpanded = false, onClose }) {
  const pathname = usePathname();
  const user = useAuth();
  const { isCollapsed: storeCollapsed, toggleCollapse } = useSidebarStore();
  const isCollapsed = forceExpanded ? false : storeCollapsed;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    startTransition(async () => {
      await handleLogoutAction();
    });
  };

  const links = [
    { href: '/overview', label: 'Overview', icon: LayoutDashboard },
    { href: '/payouts', label: 'Payouts', icon: CreditCard },
  ];

  return (
    <aside className={cn(
      "flex flex-col bg-card border-r border-border transition-all duration-300 h-screen sticky top-0 z-40",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Sidebar Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <Link href="/overview" className="flex items-center gap-2 font-bold font-display text-primary">
          <Scissors className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span className="text-sm tracking-wide font-bold">EverCut Admin</span>}
        </Link>
        {onClose ? (
          <button 
            onClick={onClose} 
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Close menu drawer"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button 
            onClick={toggleCollapse} 
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground hidden lg:block"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Navigation Options List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          if (link.roles && !link.roles.includes(user?.role)) return null;
          const isActive = pathname.startsWith(link.href);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Admin Profile & Sign Out Footer */}
      <div className="p-3 border-t border-border bg-muted/20">
        {!isCollapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-semibold truncate text-foreground">{user?.name || 'Administrator'}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{user?.role || 'Guest'}</p>
          </div>
        )}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            onClick={() => !isPending && setShowLogoutConfirm(false)} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
          />
          <div className="relative w-full max-w-sm bg-card border border-border text-card-foreground rounded-lg shadow-2xl p-6 z-10 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-full shrink-0">
                <LogOut className="h-6 w-6" />
              </div>
              
              <div className="space-y-2">
                <h3 className="font-bold text-lg font-display text-foreground">Confirm Logout</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to end your active session? You will need to verify your OTP code to log back in.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2 px-4 border border-border bg-muted/50 hover:bg-muted text-foreground rounded text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleLogout}
                  className="flex-1 py-2 px-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Logout'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
}
export default Sidebar;
