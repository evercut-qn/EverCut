'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Route-group error boundary component to capture unhandled runtime rendering exceptions.
 */
export default function AdminError({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled admin runtime error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center p-6">
      <div className="max-w-md w-full border border-border rounded-lg bg-card text-card-foreground shadow-sm p-8 space-y-6 animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold tracking-tight text-foreground font-display">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred in the administrative panel.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded text-sm font-semibold transition-colors"
          >
            Try again
          </button>
          <Link
            href="/overview"
            className="h-9 px-4 py-2 border border-border bg-muted text-foreground hover:bg-accent hover:text-accent-foreground rounded text-sm font-semibold flex items-center justify-center transition-colors"
          >
            Go to Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
