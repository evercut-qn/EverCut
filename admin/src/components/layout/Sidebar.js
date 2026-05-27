'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/hooks/useSidebarStore';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils/cn';
import { handleLogoutAction } from '@/app/(admin)/_actions/logout.action';
import { 
  LayoutDashboard, CreditCard, LogOut, Loader2, X
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

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

  const storeCollapsed = useSidebarStore((state) => state.isCollapsed);
  const setHovered = useSidebarStore((state) => state.setHovered);
  const setFocused = useSidebarStore((state) => state.setFocused);

  const isCollapsed = forceExpanded ? false : storeCollapsed;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleFocus = () => {
    setFocused(true);
  };

  const handleBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setFocused(false);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    // If an element inside the sidebar is focused, blur it to allow collapse on mouse leave
    if (document.activeElement && containerRef.current?.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  };

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

  const sidebarContent = (
    <>
      {/* Sidebar Brand Header */}
      <div className={cn(
        "h-16 flex items-center border-b border-border shrink-0 transition-all duration-300",
        isCollapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        <Link 
          href="/overview" 
          className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed ? "justify-center w-full" : "justify-start gap-2"
          )}
        >
          <div className={cn("transition-all duration-300 shrink-0", isCollapsed ? "opacity-100 scale-100 w-5" : "opacity-0 scale-90 w-0 h-0 overflow-hidden")}>
            <Logo variant="icon" className="h-5 w-5 text-foreground" />
          </div>
          <div className={cn("transition-all duration-300 origin-left shrink-0", !isCollapsed ? "opacity-100 scale-100 w-auto" : "opacity-0 scale-90 w-0 h-0 overflow-hidden")}>
            <Logo variant="full" className="h-8 w-auto text-foreground" />
          </div>
        </Link>
        {onClose && (
          <button 
            onClick={onClose} 
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Close menu drawer"
          >
            <X className="h-5 w-5" />
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
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors overflow-hidden whitespace-nowrap",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={cn(
                "transition-all duration-300 ease-in-out origin-left whitespace-nowrap",
                isCollapsed ? "opacity-0 w-0 scale-95 pointer-events-none" : "opacity-100 w-auto scale-100"
              )}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Admin Profile & Sign Out Footer */}
      <div className="p-3 border-t border-border bg-muted/20 shrink-0">
        <div className={cn(
          "transition-all duration-300 origin-left overflow-hidden whitespace-nowrap",
          isCollapsed ? "opacity-0 h-0 w-0 pointer-events-none mb-0" : "opacity-100 w-auto mb-2 px-3 py-2"
        )}>
          <p className="text-xs font-semibold truncate text-foreground">{user?.name || 'Administrator'}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{user?.role || 'Guest'}</p>
        </div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors overflow-hidden whitespace-nowrap"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={cn(
            "transition-all duration-300 ease-in-out origin-left whitespace-nowrap",
            isCollapsed ? "opacity-0 w-0 scale-95 pointer-events-none" : "opacity-100 w-auto scale-100"
          )}>
            Logout
          </span>
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
    </>
  );

  if (forceExpanded) {
    return (
      <aside className={cn(
        "flex flex-col bg-card h-full w-full overflow-hidden",
        className
      )}>
        {sidebarContent}
      </aside>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("hidden lg:block w-16 h-screen sticky top-0 z-40 shrink-0", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <aside className={cn(
        "flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out h-screen absolute top-0 left-0 z-40 overflow-hidden",
        isCollapsed ? "w-16 shadow-none" : "w-64 shadow-2xl"
      )}>
        {sidebarContent}
      </aside>
    </div>
  );
}
export default Sidebar;
