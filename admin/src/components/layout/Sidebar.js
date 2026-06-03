'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/hooks/useSidebarStore';
import { cn } from '@/lib/utils/cn';
import { LayoutDashboard, CreditCard, X, Settings } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

/**
 * Collapsible navigation sidebar.
 *
 * @param {Object} props
 * @param {string} [props.className] - Sidebar layout overrides
 */
export function Sidebar({ className, forceExpanded = false, onClose }) {
  const pathname = usePathname();

  const storeCollapsed = useSidebarStore((state) => state.isCollapsed);
  const setHovered = useSidebarStore((state) => state.setHovered);
  const setFocused = useSidebarStore((state) => state.setFocused);

  const isCollapsed = forceExpanded ? false : storeCollapsed;
  const containerRef = useRef(null);

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

      {/* Settings/Profile Section at the Bottom */}
      <div className="p-3 border-t border-border bg-muted/20 shrink-0">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors overflow-hidden whitespace-nowrap",
            pathname.startsWith('/settings')
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className={cn(
            "transition-all duration-300 ease-in-out origin-left whitespace-nowrap",
            isCollapsed ? "opacity-0 w-0 scale-95 pointer-events-none" : "opacity-100 w-auto scale-100"
          )}>
            Settings
          </span>
        </Link>
      </div>
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
