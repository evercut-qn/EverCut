'use client';

import React, { useState, useEffect, useCallback } from 'react';
import '@/styles/landing.css';

import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { LandingFacts } from '@/components/landing/LandingFacts';
import { CustomerBand, SalonBand } from '@/components/landing/LandingBands';
import { InteractiveShowcase } from '@/components/landing/InteractiveShowcase';
import { WorkflowGallery } from '@/components/landing/WorkflowGallery';
import { BookingSimulator } from '@/components/landing/BookingSimulator';
import { TimeCalculator } from '@/components/landing/TimeCalculator';
import { CustomerDownloadSection, MerchantDownloadSection } from '@/components/landing/DownloadSection';
import { SalonOwnerBoard } from '@/components/landing/SalonOwnerBoard';
import { LandingFAQ } from '@/components/landing/LandingFAQ';
import { LegalReader, LEGAL_DOCS } from '@/components/landing/LegalReader';
import { LandingFooter } from '@/components/landing/LandingFooter';

const validDocIds = LEGAL_DOCS.map((d) => d.id);
const hashAliasMap = {
  'privacy-policy': 'customer-privacy',
  'privacy': 'customer-privacy',
  'merchant-privacy': 'merchant-privacy',
  'terms-and-conditions': 'terms',
  'terms': 'terms',
  'terms-of-service': 'terms',
  'cancellation-refund': 'refund',
  'refund': 'refund',
  'refund-policy': 'refund',
  'merchant-agreement': 'merchant-agreement',
  'partner': 'merchant-agreement'
};

export default function HomePage() {
  const [theme, setThemeState] = useState('light');
  const [activeDocId, setActiveDocId] = useState('customer-privacy');

  // Initialize theme from localStorage or system prefers-color-scheme
  useEffect(() => {
    let initialTheme = 'light';
    try {
      const saved = localStorage.getItem('evercut-theme');
      if (saved && ['light', 'dark', 'green'].includes(saved)) {
        initialTheme = saved;
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        initialTheme = 'dark';
      }
    } catch (e) {
      // Ignore localStorage access errors in private browsing
    }
    setThemeState(initialTheme);
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('evercut-theme', newTheme);
    } catch (e) {
      // Ignore
    }
  }, []);

  const handleSelectDoc = useCallback((docId, jump = false) => {
    const targetId = hashAliasMap[docId] || docId;
    if (validDocIds.includes(targetId)) {
      setActiveDocId(targetId);
      if (jump && typeof document !== 'undefined') {
        const legalEl = document.getElementById('legal');
        if (legalEl) {
          legalEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, []);

  // Listen to hash changes for deep linking to legal reader
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').trim().toLowerCase();
      if (hash) {
        const mappedId = hashAliasMap[hash] || hash;
        if (validDocIds.includes(mappedId)) {
          setActiveDocId(mappedId);
          const legalEl = document.getElementById('legal');
          if (legalEl) {
            legalEl.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return (
    <div className="evercut-landing" data-theme={theme}>
      {/* Ambient background refraction fields */}
      <div className="field" style={{ width: 520, height: 520, top: -120, right: -120 }}></div>
      <div className="field" style={{ width: 420, height: 420, top: 900, left: -180 }}></div>

      <LandingHeader theme={theme} setTheme={setTheme} />

      <main>
        <HeroSection />
        <LandingFacts />
        <CustomerBand />
        <InteractiveShowcase />
        <WorkflowGallery />
        <BookingSimulator />
        <TimeCalculator />
        <CustomerDownloadSection />
        <SalonBand />
        <SalonOwnerBoard />
        <MerchantDownloadSection />
        <LandingFAQ onSelectDoc={handleSelectDoc} />
        <LegalReader activeDocId={activeDocId} onSelectDoc={handleSelectDoc} />
      </main>

      <LandingFooter onSelectDoc={handleSelectDoc} />
    </div>
  );
}
