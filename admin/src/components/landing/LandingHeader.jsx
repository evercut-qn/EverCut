'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Download, Menu, X, Shield, FileText } from 'lucide-react';

export function LandingHeader({ onOpenLegal }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const handleLegalClick = (e, audience, docType) => {
    e.preventDefault();
    if (onOpenLegal) {
      onOpenLegal(audience, docType);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 glass-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-[#141A23] border border-evercut-green/40 flex items-center justify-center shadow-lg group-hover:border-evercut-green transition-all">
            <div className="flex items-center text-white font-bold tracking-tight text-sm">
              <span className="text-white">Ever</span>
              <span className="text-evercut-green flex items-center">
                cut<span className="w-1.5 h-1.5 rounded-full bg-evercut-green ml-0.5 inline-block"></span>
              </span>
            </div>
          </div>
          <div>
            <span className="font-heading text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              Evercut
            </span>
            <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider -mt-0.5">
              Salon Booking & Styling App
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#screens" className="hover:text-evercut-green transition-colors">
            App Screens
          </a>
          <a href="#workflow" className="hover:text-evercut-green transition-colors">
            How It Works
          </a>
          <a href="#merchants" className="hover:text-evercut-green transition-colors">
            For Salons
          </a>
          <button
            onClick={(e) => handleLegalClick(e, 'customer', 'privacy')}
            className="hover:text-evercut-green transition-colors focus:outline-none"
          >
            Privacy Policy
          </button>
          <button
            onClick={(e) => handleLegalClick(e, 'customer', 'terms')}
            className="hover:text-evercut-green transition-colors focus:outline-none"
          >
            Terms of Service
          </button>
        </nav>

        {/* Download CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <a
            href="#download-section"
            className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-evercut-green text-white hover:bg-evercut-greenHover transition shadow-lg shadow-emerald-900/30 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Get The App
          </a>
        </div>

        {/* Mobile Drawer Toggle */}
        <button
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation"
          className="md:hidden p-2 text-slate-300 hover:text-white rounded-lg focus:outline-none"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-6 border-t border-slate-800 bg-[#0E131A] text-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-3 font-medium text-slate-300 pt-2">
            <a
              href="#screens"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 hover:text-evercut-green"
            >
              App Screens
            </a>
            <a
              href="#workflow"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 hover:text-evercut-green"
            >
              How It Works
            </a>
            <a
              href="#merchants"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 hover:text-evercut-green"
            >
              For Salon Owners
            </a>
            <button
              onClick={(e) => handleLegalClick(e, 'customer', 'privacy')}
              className="py-2 text-left hover:text-evercut-green"
            >
              Privacy Policy
            </button>
            <button
              onClick={(e) => handleLegalClick(e, 'customer', 'terms')}
              className="py-2 text-left hover:text-evercut-green"
            >
              Terms & Conditions
            </button>
            <a
              href="#download-section"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full text-center py-3 rounded-xl font-bold bg-evercut-green text-white shadow-lg mt-2"
            >
              Download on Google Play
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
