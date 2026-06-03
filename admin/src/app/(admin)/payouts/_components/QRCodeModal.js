'use client';

import { useState, useEffect, useCallback } from 'react';
import { QrCode, X, Copy, Check, Download, ExternalLink } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

/**
 * Minimal & Elegant UPI QR Payment Modal.
 *
 * Implements:
 * - Dynamic theme support (Light and Dark mode native classes)
 * - Highly compact, clean layout (max-width: 320px)
 * - Typography-first design matching modern Stripe/Apple style
 * - Safe QR code rendering with a tiny center brand watermark
 * - Keyboard Escape accessibility and clean cleanup hooks
 */
export function QRCodeModal({ isOpen, onClose, upiDeepLink, amount, barberName, upiId }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate QR code on demand
  useEffect(() => {
    if (!isOpen || !upiDeepLink) return;

    let active = true;
    const timer = setTimeout(() => {
      setIsGenerating(true);
      setQrCodeUrl('');

      import('qrcode')
        .then((lib) => {
          if (!active) return;
          return lib.default.toDataURL(upiDeepLink, {
            width: 240,
            margin: 1,
            color: { dark: '#09090b', light: '#ffffff' }, // matches system backgrounds
            errorCorrectionLevel: 'M', // Medium is safer for smaller center logo overlays
          });
        })
        .then((url) => {
          if (!active) return;
          setQrCodeUrl(url || '');
          setIsGenerating(false);
        })
        .catch((err) => {
          console.error('QR generation failed:', err);
          if (active) setIsGenerating(false);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [upiDeepLink, isOpen]);

  // Escape key support
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Clipboard copy utility
  const handleCopyUpi = useCallback(async () => {
    if (!upiId) return;
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = upiId;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [upiId]);

  // Download QR code utility
  const handleDownload = useCallback(() => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `evercut-qr-${(barberName || 'payout').replace(/\s+/g, '-').toLowerCase()}.png`;
    link.click();
  }, [qrCodeUrl, barberName]);

  // Derive barber initials
  const initials = (barberName || 'B')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`UPI QR payment for ${barberName}`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      {/* Semi-transparent Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Card Content - Bottom Sheet on Mobile, Centered Card on Desktop */}
      <div className="relative w-full sm:max-w-xs bg-card text-foreground border-t sm:border border-border rounded-t-2xl sm:rounded-xl shadow-xl z-10 overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
        
        {/* Mobile Pull Handle Indicator */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Top bar with avatar & close button */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none mb-0.5">UPI Payout</p>
              <h3 className="font-bold text-sm leading-none truncate max-w-[150px]">
                {barberName || 'Barber'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close QR Modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Big clean currency amount */}
        <div className="text-center px-4 py-2 border-y border-border/50 bg-muted/20">
          <span className="text-2xl font-black font-mono tracking-tight text-foreground">
            ₹{(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* QR Code Presentation Box */}
        <div className="flex flex-col items-center p-4">
          <div className="relative bg-white rounded-lg p-2 border border-border/60 shadow-sm flex items-center justify-center w-[170px] h-[170px] overflow-hidden select-none">
            {isGenerating ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-zinc-400 bg-zinc-50">
                <QrCode className="h-7 w-7 animate-pulse text-zinc-300" />
                <span className="text-[9px] font-medium">Encrypting link...</span>
              </div>
            ) : qrCodeUrl ? (
              <div className="relative w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt={`UPI QR code to pay ₹${amount} to ${barberName}`}
                  className="w-full h-full block rounded"
                />
                
                {/* Tiny watermark inside QR code center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-0.5 rounded-full shadow border border-zinc-100 flex items-center justify-center w-7 h-7">
                  <Logo variant="icon" className="h-[16px] w-[16px] text-zinc-950 shrink-0" />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-zinc-400">
                <QrCode className="h-7 w-7 text-zinc-300" />
                <span className="text-[10px]">No payment link active</span>
              </div>
            )}
          </div>

          {/* Simple UPI string copying element */}
          {upiId && (
            <div className="w-full mt-3.5 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-muted/50 border border-border/50 text-[11px]">
              <span className="font-mono text-muted-foreground truncate select-all">
                {upiId}
              </span>
              <button
                onClick={handleCopyUpi}
                className="shrink-0 text-muted-foreground hover:text-foreground p-0.5 transition-colors"
                aria-label="Copy UPI ID"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Small compact footer button group */}
        <div className="flex gap-2 p-4 pt-0">
          <button
            onClick={handleDownload}
            disabled={!qrCodeUrl}
            className="flex-1 flex items-center justify-center gap-1.5 h-8.5 rounded-lg text-xs font-semibold border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Download QR PNG"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>

          {upiDeepLink ? (
            <a
              href={upiDeepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 h-8.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Pay Direct
            </a>
          ) : (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-1 h-8.5 rounded-lg text-xs font-semibold bg-muted text-muted-foreground cursor-not-allowed"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Pay Direct
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
