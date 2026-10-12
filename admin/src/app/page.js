'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { InteractiveShowcase } from '@/components/landing/InteractiveShowcase';
import { WorkflowGallery } from '@/components/landing/WorkflowGallery';
import { DownloadSection } from '@/components/landing/DownloadSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LegalModal } from '@/components/landing/LegalModal';

const hashToDocMap = {
  'privacy-policy': { audience: 'customer', doc: 'privacy' },
  'privacy': { audience: 'customer', doc: 'privacy' },
  'merchant-privacy': { audience: 'merchant', doc: 'privacy' },
  'terms-and-conditions': { audience: 'customer', doc: 'terms' },
  'terms': { audience: 'customer', doc: 'terms' },
  'terms-of-service': { audience: 'customer', doc: 'terms' },
  'merchant-terms': { audience: 'merchant', doc: 'terms' },
  'cancellation-refund': { audience: 'shared', doc: 'refund' },
  'refund': { audience: 'shared', doc: 'refund' },
  'refund-policy': { audience: 'shared', doc: 'refund' },
  'merchant-agreement': { audience: 'shared', doc: 'partner' },
  'partner': { audience: 'shared', doc: 'partner' }
};

export default function HomePage() {
  const [legalModalState, setLegalModalState] = useState({
    isOpen: false,
    audience: 'customer',
    doc: 'privacy'
  });

  const handleOpenLegal = useCallback((audience = 'customer', doc = 'privacy') => {
    setLegalModalState({
      isOpen: true,
      audience,
      doc
    });
  }, []);

  const handleCloseLegal = useCallback(() => {
    setLegalModalState((prev) => ({ ...prev, isOpen: false }));
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(window.history.state || {}, document.title, window.location.pathname + window.location.search);
    }
  }, []);

  // Hash routing listener on mount & hash change
  useEffect(() => {
    const handleHashRouting = () => {
      const hash = window.location.hash.replace('#', '').trim().toLowerCase();
      if (hash && hashToDocMap[hash]) {
        const target = hashToDocMap[hash];
        setLegalModalState({
          isOpen: true,
          audience: target.audience,
          doc: target.doc
        });
      }
    };

    handleHashRouting();
    window.addEventListener('hashchange', handleHashRouting);
    return () => window.removeEventListener('hashchange', handleHashRouting);
  }, []);

  return (
    <div className="bg-evercut-dark text-slate-100 font-sans antialiased radial-bg min-h-screen flex flex-col justify-between selection:bg-evercut-green selection:text-white">
      <LandingHeader onOpenLegal={handleOpenLegal} />

      <main className="flex-1">
        <HeroSection />
        <InteractiveShowcase />
        <WorkflowGallery />
        <DownloadSection />
      </main>

      <LandingFooter onOpenLegal={handleOpenLegal} />

      <LegalModal
        isOpen={legalModalState.isOpen}
        onClose={handleCloseLegal}
        initialAudience={legalModalState.audience}
        initialDoc={legalModalState.doc}
      />
    </div>
  );
}
