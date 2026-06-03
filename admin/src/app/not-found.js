'use client';

import React from 'react';
import Link from 'next/link';
import { Home, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

/**
 * High-fidelity, theme-adaptive 404 Page Not Found view.
 */
export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      {/* Premium background gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <div className="absolute inset-0 bg-[grid-line-pattern] opacity-[0.02] dark:opacity-[0.05] pointer-events-none" />

      <div className="relative w-full max-w-md bg-card border border-border rounded-lg p-8 sm:p-10 shadow-2xl text-card-foreground text-center animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center">
          {/* Logo container */}
          <Logo variant="full" className="h-12 w-auto mb-6 text-foreground" />

          {/* Interactive illustration shell */}
          <div className="relative mb-6">
            <div className="text-8xl font-extrabold font-mono tracking-widest text-primary/20 select-none">
              404
            </div>
          </div>

          <h2 className="text-xl font-bold font-display text-foreground mb-2">Lost in the Cut?</h2>
          <p className="text-xs text-muted-foreground leading-relaxed mb-8 max-w-xs">
            The page you are looking for doesn&apos;t exist, has been archived, or you do not have permission to view it.
          </p>

          {/* Action redirects */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <button
              onClick={() => window.history.back()}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-md font-semibold text-sm border border-border bg-muted/50 hover:bg-muted text-foreground transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
            <Link
              href="/overview"
              className="w-full sm:flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-md font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-md shadow-primary/20"
            >
              <Home className="h-4 w-4" />
              Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
