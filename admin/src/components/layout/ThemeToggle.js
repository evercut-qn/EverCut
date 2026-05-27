'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * SSR-safe, accessible button to switch between dark and light themes.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Sync state after mount to avoid hydration mismatches
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-md border border-border bg-muted/20" />;
  }

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors"
      aria-label="Toggle visual theme"
    >
      {isDark ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-amber-500" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] text-slate-700" />
      )}
    </button>
  );
}
export default ThemeToggle;
