'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/hooks/useSidebarStore';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils/cn';

/**
 * Mobile navigation slide-out drawer panel.
 */
export function MobileNavigationDrawer() {
  const pathname = usePathname();
  const { isOpen, setOpen } = useSidebarStore();

  // Close the drawer automatically when pathname changes (user navigated)
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  // Trap scrolling behavior when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop blur overlay */}
      {isOpen && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Slide-out Panel container */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card transition-transform duration-300 transform lg:hidden shadow-2xl flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar className="w-full border-r-0 h-full flex-1" forceExpanded={true} onClose={() => setOpen(false)} />
      </div>
    </>
  );
}
export default MobileNavigationDrawer;
