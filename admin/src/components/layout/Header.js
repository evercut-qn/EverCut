'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { UserProfileDropdown } from './UserProfileDropdown';
import { useSidebarStore } from '@/hooks/useSidebarStore';
import { cn } from '@/lib/utils/cn';

/**
 * Top navigation header bar for administrative layouts.
 * Includes page locator breadcrumbs, Theme Toggle, and User Profile Dropdown.
 *
 * @param {Object} props
 * @param {string} [props.className] - Header styling overrides
 */
export function Header({ className }) {
  const pathname = usePathname();
  const toggleOpen = useSidebarStore((state) => state.toggleOpen);

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
        
        <div className="text-base font-semibold font-display text-muted-foreground hidden md:block">
          {breadcrumbText || 'Overview'}
        </div>
      </div>

      {/* Global Utility Controls: Theme toggle & Profile Avatar Dropdown */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <UserProfileDropdown />
      </div>
    </header>
  );
}

export default Header;
