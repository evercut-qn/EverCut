'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  RotateCcw,
  Handshake,
  X,
  AlertCircle,
  Users,
  Store
} from 'lucide-react';
import { legalPolicies } from '@/data/legalPolicies';

export function LegalModal({ isOpen, onClose, initialAudience = 'customer', initialDoc = 'privacy' }) {
  const [audience, setAudience] = useState(initialAudience); // 'customer' | 'merchant'
  const [docType, setDocType] = useState(initialDoc); // 'privacy' | 'terms' | 'refund' | 'partner'

  useEffect(() => {
    if (initialAudience) setAudience(initialAudience);
    if (initialDoc) setDocType(initialDoc);
  }, [initialAudience, initialDoc, isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Resolve current active policy
  let currentDoc;

  if (docType === 'refund') {
    currentDoc = legalPolicies.shared.refund;
  } else if (docType === 'partner') {
    currentDoc = legalPolicies.shared.partner;
  } else if (audience === 'merchant') {
    if (docType === 'terms') {
      currentDoc = legalPolicies.merchant.terms;
    } else {
      currentDoc = legalPolicies.merchant.privacy;
    }
  } else {
    if (docType === 'terms') {
      currentDoc = legalPolicies.customer.terms;
    } else {
      currentDoc = legalPolicies.customer.privacy;
    }
  }

  const handleTabChange = (type) => {
    setDocType(type);
    let hash = 'privacy-policy';
    if (type === 'refund') hash = 'cancellation-refund';
    else if (type === 'partner') hash = 'merchant-agreement';
    else if (audience === 'merchant') {
      hash = type === 'terms' ? 'merchant-terms' : 'merchant-privacy';
    } else {
      hash = type === 'terms' ? 'terms-and-conditions' : 'privacy-policy';
    }
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state || {}, '', `#${hash}`);
    }
  };

  const handleAudienceChange = (newAudience) => {
    setAudience(newAudience);
    if (docType === 'privacy' || docType === 'terms') {
      let hash = newAudience === 'merchant'
        ? (docType === 'terms' ? 'merchant-terms' : 'merchant-privacy')
        : (docType === 'terms' ? 'terms-and-conditions' : 'privacy-policy');
      if (typeof window !== 'undefined') {
        window.history.replaceState(window.history.state || {}, '', `#${hash}`);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-evercut-cardDark border border-evercut-green/30 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/90">
          
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-evercut-green/10 text-evercut-green flex items-center justify-center shrink-0">
              {docType === 'refund' ? (
                <RotateCcw className="w-4 sm:w-5 h-4 sm:h-5" />
              ) : docType === 'partner' ? (
                <Handshake className="w-4 sm:w-5 h-4 sm:h-5" />
              ) : docType === 'terms' ? (
                <FileText className="w-4 sm:w-5 h-4 sm:h-5" />
              ) : (
                <Shield className="w-4 sm:w-5 h-4 sm:h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2">
                {currentDoc.title}
                <span className="text-[9px] sm:text-[10px] uppercase font-mono font-bold bg-evercut-green/20 text-emerald-400 px-1.5 sm:px-2 py-0.5 rounded-full">
                  {currentDoc.audience}
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Evercut Technologies &bull; evercut.in Official Policies</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audience Toggle (Customer vs Merchant) */}
            <div className="flex bg-slate-800/90 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => handleAudienceChange('customer')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs transition ${
                  audience === 'customer'
                    ? 'bg-evercut-green text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Customer
              </button>
              <button
                onClick={() => handleAudienceChange('merchant')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs transition ${
                  audience === 'merchant'
                    ? 'bg-evercut-green text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" /> Merchant
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher Bar - Equal width uniform layout without horizontal scrollbar */}
        <div className="px-3 sm:px-6 py-2.5 bg-slate-900/80 border-b border-slate-800">
          <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 w-full">
            {[
              { id: 'privacy', label: 'Privacy Policy' },
              { id: 'terms', label: 'Terms of Service' },
              { id: 'refund', label: 'Cancellation & Refund' },
              { id: 'partner', label: 'Partner Agreement' },
            ].map((tab) => {
              const isActive = docType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full py-2.5 px-2 rounded-xl text-xs sm:text-xs md:text-sm font-semibold flex items-center justify-center text-center leading-snug transition-all ${
                    isActive
                      ? 'bg-evercut-green text-white font-bold shadow-md shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Content (Scrollable) */}
        <div className="p-6 sm:p-8 overflow-y-auto legal-scroll text-sm text-slate-300 space-y-6 leading-relaxed">
          
          {/* CRITICAL REFUND POLICY HIGHLIGHT BANNER (Displayed in Refund tab or if referenced) */}
          {docType === 'refund' && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border-2 border-evercut-green/40 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <AlertCircle className="w-5 h-5 text-evercut-green shrink-0" />
                <span>Explicit Platform Refund Mandate</span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 pt-1">
                {/* Rule 1: Merchant Cancellation */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Rule 1: If Cancel By Merchant
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                      100% Full Refund
                    </span>
                  </div>
                  <h5 className="font-extrabold text-white text-sm mb-1">Complete Money Refund</h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    If an appointment is cancelled, rejected, or cannot be honored by the salon merchant or stylist, the customer receives an automatic <strong>100% complete refund</strong> including the entire service fee and the platform convenience fee.
                  </p>
                </div>

                {/* Rule 2: Customer Cancellation */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      Rule 2: If Cancel By Customer
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                      Fee Deducted
                    </span>
                  </div>
                  <h5 className="font-extrabold text-white text-sm mb-1">Platform Fee Will Be Deducted</h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    If an appointment is cancelled by the customer, the platform convenience fee (₹4 for single service, ₹10-20 for bundle) is <strong>strictly non-refundable and will be deducted</strong>. Salon service charges are refunded subject to the standard 30-minute cancellation window.
                  </p>
                </div>
              </div>

              {/* Settlement Timelines */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-400">
                <span>⚡ UPI Instant Reversal: <strong>Within 2 Hours</strong></span>
                <span>🏦 Bank / Credit Card Reversal: <strong>2 - 5 Business Days</strong></span>
              </div>
            </div>
          )}

          {/* Section Summary */}
          {currentDoc.summary && (
            <p className="text-slate-400 italic text-xs border-l-2 border-evercut-green pl-3">
              {currentDoc.summary}
            </p>
          )}

          {/* Policy Sections */}
          {currentDoc.sections?.map((section, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-evercut-green">{section.title}</span>
              </h4>
              <div className="text-slate-300 text-xs sm:text-sm whitespace-pre-line leading-relaxed space-y-2">
                {section.content}
              </div>
            </div>
          ))}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Effective: {currentDoc.effectiveDate || '10 October 2026'} &bull; QUANTNEURAL PRIVATE LIMITED
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
