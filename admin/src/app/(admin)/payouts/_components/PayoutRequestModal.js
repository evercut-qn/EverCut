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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-card border border-border text-card-foreground rounded-lg shadow-2xl p-6 flex flex-col z-10 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
            <CheckCircle className="h-5 w-5" />
            <h2 className="text-md font-bold tracking-tight font-display text-foreground">Confirm & Record Payment</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Payout Summary Read-Only Card */}
        <div className="bg-muted/50 border border-border rounded-md p-4 mb-4 space-y-2 text-xs">
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
          <div className="flex justify-between items-center border-t border-border pt-2.5 text-sm mt-1">
            <span className="text-foreground font-medium">Amount Settle</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-lg">
              ₹{(pendingPayout?.totalAmountInRupees || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          
          {/* Hidden inputs to capture values in React Hook Form */}
          <input type="hidden" {...register('barberId')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* UTR Input */}
            <FormInput
              label="Transaction UTR / Ref ID"
              placeholder="e.g. UTR12345678"
              required
              className="font-mono uppercase"
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
              {...register('transferMode')}
            />
          </div>

          {/* Description Textarea note */}
          <FormTextarea
            label="Audit Notes"
            placeholder="Optional details, e.g. Paid via PhonePe bank transfer..."
            maxLength={500}
            value={watchedNotes}
            error={errors.notes?.message}
            {...register('notes')}
          />

          {/* Action triggers */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save & Settle
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

export default PayoutRequestModal;
