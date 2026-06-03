'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { ChevronRight, Check, Loader2, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { handleLogoutAction } from '@/app/(admin)/_actions/logout.action';
import { cn } from '@/lib/utils/cn';

/**
 * Premium user profile dropdown menu.
 * Offers quick links to settings, visual theme selection, and direct logout.
 */
export function UserProfileDropdown() {
  const user = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState(null);
  const [isPending, startTransition] = useTransition();

  const dropdownRef = useRef(null);

  // Click outside listener to auto-close dropdown options
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveSubMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    startTransition(async () => {
      await handleLogoutAction();
    });
  };

  const name = user?.name || 'Administrator';

  return (
    <div ref={dropdownRef} className="relative flex items-center">
      {/* Avatar Button with exact ThemeToggle button styling shell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors focus:outline-none shrink-0 cursor-pointer select-none"
        aria-label="Open profile options menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256" className="h-[1.2rem] w-[1.2rem]" aria-hidden="true">
          <path d="M230.93,220a8,8,0,0,1-6.93,4H32a8,8,0,0,1-6.92-12c15.23-26.33,38.7-45.21,66.09-54.16a72,72,0,1,1,73.66,0c27.39,8.95,50.86,27.83,66.09,54.16A8,8,0,0,1,230.93,220Z" />
        </svg>
      </button>

      {/* Main Dropdown Menu Box */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border text-foreground rounded-lg shadow-xl p-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150 select-none">
          
          {/* User Identity Info Header */}
          <div className="px-3.5 py-2 border-b border-border/50 select-none mb-1">
            <p className="text-xs font-bold text-foreground truncate select-all">{name}</p>
            <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{user?.role || 'Guest'}</p>
          </div>

          {/* Menu Actions List */}
          <div className="space-y-0.5">
            {/* Profile Action */}
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1.5 text-left w-full hover:bg-muted hover:text-foreground transition-colors duration-100 block cursor-pointer rounded-md border border-transparent text-xs font-semibold"
            >
              Profile
            </Link>

            {/* Theme Sub-menu row */}
            <div 
              className="relative"
              onMouseLeave={() => setActiveSubMenu(null)}
            >
              <button
                onMouseEnter={() => setActiveSubMenu('appearance')}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSubMenu(activeSubMenu === 'appearance' ? null : 'appearance');
                }}
                className={cn(
                  "px-3.5 py-1.5 w-full transition-colors duration-100 flex items-center justify-between text-left cursor-pointer rounded-md border border-transparent text-xs font-semibold",
                  activeSubMenu === 'appearance' 
                    ? "bg-muted text-foreground" 
                    : "hover:bg-muted hover:text-foreground"
                )}
              >
                <span>Appearance</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {/* Nested Appearance Flyout */}
              {activeSubMenu === 'appearance' && (
                <div className="absolute right-full top-0 mr-1.5 w-40 bg-card border border-border text-foreground rounded-lg shadow-xl p-1 z-50 animate-in fade-in slide-in-from-right-1 duration-100">
                  {['light', 'dark', 'system'].map((mode) => {
                    const label = mode.charAt(0).toUpperCase() + mode.slice(1) + (mode === 'system' ? '' : ' mode');
                    const isSelected = theme === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => {
                          setTheme(mode);
                          setIsOpen(false);
                          setActiveSubMenu(null);
                        }}
                        className="px-3.5 py-1.5 hover:bg-muted hover:text-foreground transition-colors duration-100 flex items-center justify-between w-full text-left font-semibold text-xs cursor-pointer rounded-md border border-transparent"
                      >
                        <span>{label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-border/50 my-1" />

            {/* Logout Action */}
            <button
              onClick={handleLogout}
              disabled={isPending}
              className="px-3.5 py-1.5 w-full hover:bg-destructive/10 text-destructive disabled:opacity-50 transition-colors duration-100 flex items-center gap-2 text-left font-bold text-xs cursor-pointer rounded-md border border-transparent"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
              <span>Log out</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

export default UserProfileDropdown;
