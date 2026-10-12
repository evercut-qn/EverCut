'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Globe, MapPin, Shield } from 'lucide-react';

export function LandingFooter({ onOpenLegal }) {
  const currentYear = new Date().getFullYear();

  const handleLegal = (e, audience, docType) => {
    e.preventDefault();
    if (onOpenLegal) {
      onOpenLegal(audience, docType);
    }
  };

  return (
    <footer className="bg-[#080B10] border-t border-slate-800 pt-16 pb-12 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Brand Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-evercut-green/50 flex items-center justify-center text-white font-bold text-xs">
                <span className="text-white">Ever</span>
                <span className="text-evercut-green">cut</span>
              </div>
              <span className="font-heading text-xl font-bold text-white tracking-tight">evercut.in</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Evercut is India&apos;s on-demand salon and grooming platform connecting clients to top neighborhood parlors with precision 5-minute scheduling.
            </p>
            <p className="text-xs text-slate-500">
              &copy; {currentYear} QUANTNEURAL PRIVATE LIMITED. All rights reserved.
            </p>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#screens" className="hover:text-evercut-green transition">
                  App Screens
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-evercut-green transition">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#download-section" className="hover:text-evercut-green transition">
                  Download Customer App
                </a>
              </li>
              <li>
                <a href="#merchants" className="hover:text-evercut-green transition">
                  Download Merchant App
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Documentation Links */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Legal & Policies</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={(e) => handleLegal(e, 'customer', 'privacy')}
                  className="hover:text-evercut-green transition w-full text-left"
                >
                  Customer Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleLegal(e, 'merchant', 'privacy')}
                  className="hover:text-evercut-green transition w-full text-left"
                >
                  Merchant Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleLegal(e, 'customer', 'terms')}
                  className="hover:text-evercut-green transition w-full text-left"
                >
                  Terms and Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleLegal(e, 'shared', 'refund')}
                  className="hover:text-evercut-green transition w-full text-left text-emerald-400 font-medium"
                >
                  Cancellation & Refund Policy
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleLegal(e, 'shared', 'partner')}
                  className="hover:text-evercut-green transition w-full text-left"
                >
                  Merchant Partner Agreement
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Customer Support</h4>
            <div className="space-y-3 text-xs">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-evercut-green shrink-0" />
                <a href="mailto:support@evercut.in" className="hover:text-evercut-green">
                  support@evercut.in
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <a href="mailto:grievance@evercut.in" className="hover:text-evercut-green">
                  grievance@evercut.in
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-evercut-green shrink-0" />
                <span>https://evercut.in</span>
              </p>
              <p className="flex items-center gap-2 text-slate-500">
                <MapPin className="w-4 h-4 text-evercut-green shrink-0" />
                <span>HOUSE NO. 288/1/15, WARD NO. Kandri, Nagpur, Maharashtra – 441401</span>
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Credits */}
        <div className="pt-8 border-t border-slate-900 text-[11px] text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={(e) => handleLegal(e, 'customer', 'privacy')}
              className="hover:underline hover:text-slate-300"
            >
              Privacy Policy
            </button>
            <button
              onClick={(e) => handleLegal(e, 'customer', 'terms')}
              className="hover:underline hover:text-slate-300"
            >
              Terms of Service
            </button>
            <button
              onClick={(e) => handleLegal(e, 'shared', 'refund')}
              className="hover:underline hover:text-slate-300 font-medium text-emerald-400"
            >
              Refund Policy
            </button>
            <button
              onClick={(e) => handleLegal(e, 'shared', 'partner')}
              className="hover:underline hover:text-slate-300"
            >
              Merchant Agreement
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
