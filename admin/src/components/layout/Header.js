'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useSidebarStore } from '@/hooks/useSidebarStore';
import { cn } from '@/lib/utils/cn';

/**
 * Top navigation header bar for administrative layouts.
 * Includes page locator breadcrumbs and user control actions.
 *
 * @param {Object} props
 * @param {string} [props.className] - Header styling overrides
 */
export function Header({ className }) {
  const pathname = usePathname();
  const { toggleOpen } = useSidebarStore();

  // Generate dynamic breadcrumb label based on active route path
  const pathParts = pathname.split('/').filter(Boolean);
  const breadcrumbText = pathParts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ');

  return (
    <header className={cn("flex items-center justify-between h-16 px-4 lg:px-8 bg-card border-b border-border sticky top-0 z-30", className)}>
      {/* Mobile drawer toggle & Breadcrumb path */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleOpen}
          className="lg:hidden p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div className="text-sm font-semibold font-display text-muted-foreground hidden md:block">
          {breadcrumbText || 'Overview'}
        </div>
      </div>

      {/* Global Utility Controls */}
      <div className="flex items-center gap-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
export default Header;
