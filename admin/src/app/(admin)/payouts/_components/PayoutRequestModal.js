'use client';

import { useTransition, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, X, CheckCircle } from 'lucide-react';

import { FormInput, FormSelect, FormTextarea } from '@/components/forms';
import { createPayoutSchema } from '@/lib/schemas/payout.schema';
import { handleRequestPayoutAction } from '../_actions/payout.action';
import { TRANSFER_MODE_OPTIONS } from './shared/payout-format';

/**
 * Modal dialog to record manual payout settlements.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Display trigger
 * @param {() => void} props.onClose - Close action callback
 * @param {Object} props.pendingPayout - Selected pending payout balance details
 */
export function PayoutRequestModal({ isOpen, onClose, pendingPayout }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createPayoutSchema),
    defaultValues: {
      barberId: '',
      bookingIds: [],
      utr: '',
      transferMode: 'upi',
      notes: '',
    },
    mode: 'onSubmit',
  });
  const watchedNotes = useWatch({ control, name: 'notes' });

  // Automatically load selected payout identifiers into form state
  useEffect(() => {
    if (pendingPayout && isOpen) {
      reset({
        barberId: pendingPayout.barberId || '',
        bookingIds: pendingPayout.bookingIds || [],
        utr: '',
        transferMode: 'upi',
        notes: '',
      });
    }
  }, [pendingPayout, isOpen, reset]);

  if (!isOpen) return null;

  async function onSubmit(data) {
    startTransition(async () => {
      try {
        const result = await handleRequestPayoutAction(data);

        if (!result.success) {
          if (result.errors) {
            result.errors.forEach(({ field, message }) => {
              setError(field, { type: 'server', message });
            });
            return;
          }
          toast.error(result.message || 'Failed to record manual payment.');
          return;
        }

        toast.success(result.message || 'Manual payout recorded successfully.');
        router.refresh();
        reset();
        onClose();
      } catch (e) {
        toast.error('Network dispatch failure.');
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm and Record Payout"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      {/* Semi-transparent Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
      />

      {/* Modal Dialog Card - Bottom Sheet on Mobile, Centered Card on Desktop */}
      <div className="relative w-full sm:max-w-md bg-card border-t sm:border border-border text-card-foreground rounded-t-2xl sm:rounded-xl shadow-xl z-10 p-5 flex flex-col animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
        
        {/* Mobile Pull Handle Indicator */}
        <div className="flex justify-center pb-2.5 sm:hidden">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-2.5 mb-3.5">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle className="h-4.5 w-4.5" />
            <h2 className="text-sm font-bold tracking-tight font-display text-foreground">Confirm & Record Payment</h2>
          </div>
          <button 
            onClick={onClose}
            type="button"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Payout Summary Read-Only Card */}
        <div className="bg-muted/30 border border-border/60 rounded-lg p-3.5 mb-3.5 space-y-1.5 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Recipient Name</span>
            <span className="font-semibold text-foreground text-right">{pendingPayout?.barberName || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Shop</span>
            <span className="font-semibold text-foreground text-right">{pendingPayout?.shopName || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">UPI ID / Address</span>
            <span className="font-mono text-foreground text-right">{pendingPayout?.upiId || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Associated Bookings</span>
            <span className="font-mono text-foreground text-right">{pendingPayout?.bookingCount || 0} booking(s)</span>
          </div>
          <div className="flex justify-between items-center border-t border-border/50 pt-2 text-xs mt-1">
            <span className="text-foreground font-semibold">Amount Settle</span>
            <span className="font-bold text-primary font-mono text-sm">
              ₹{(pendingPayout?.totalAmountInRupees || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
          
          {/* Hidden inputs to capture values in React Hook Form */}
          <input type="hidden" {...register('barberId')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* UTR Input */}
            <FormInput
              label="Transaction UTR / Ref ID"
              placeholder="UTR12345678"
              required
              className="font-mono uppercase h-8.5 text-xs"
              error={errors.utr?.message}
              {...register('utr')}
            />

            {/* Method options dropdown */}
            <FormSelect
              label="Payment Method"
              placeholder="Select mode..."
              options={TRANSFER_MODE_OPTIONS}
              error={errors.transferMode?.message}
              required
              className="h-8.5 text-xs"
              {...register('transferMode')}
            />
          </div>

          {/* Description Textarea note */}
          <FormTextarea
            label="Audit Notes"
            placeholder="Optional details, e.g. Paid via PhonePe bank transfer..."
            maxLength={500}
            rows={2}
            value={watchedNotes}
            error={errors.notes?.message}
            {...register('notes')}
          />

          {/* Action triggers - Side-by-side row */}
          <div className="flex gap-2.5 pt-3.5 border-t border-border/50 mt-4.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1.5 h-8.5 rounded-lg text-xs font-semibold border border-border bg-background text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1.5 h-8.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save & Settle
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

export default PayoutRequestModal;
