'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Scissors, Send, KeyRound, PhoneCall } from 'lucide-react';

import { FormInput } from '@/components/forms';
import { requestOTPSchema, verifyOTPSchema } from '@/lib/schemas/auth.schema';
import { requestOTP } from '@/lib/services/auth.service';
import { handleLoginAction } from '../_actions/login.action';

/**
 * OTP Login Form Component.
 * Orchestrates requesting phone validation and executing JWT verification.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Step 1: 'phone' (collect number) | Step 2: 'otp' (collect verification code)
  const [step, setStep] = useState('phone');
  const [phoneVal, setPhoneVal] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Timer countdown hook for resending codes
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Form instance for Step 1
  const phoneForm = useForm({
    resolver: zodResolver(requestOTPSchema),
    defaultValues: { phone: '' },
    mode: 'onSubmit',
  });

  // Form instance for Step 2
  const otpForm = useForm({
    resolver: zodResolver(verifyOTPSchema),
    defaultValues: { phone: '', code: '' },
    mode: 'onSubmit',
  });

  // Handle phone submission to dispatch OTP code
  async function onPhoneSubmit(data) {
    startTransition(async () => {
      try {
        const result = await requestOTP(data.phone);

        if (!result.success) {
          phoneForm.setError('phone', { type: 'server', message: result.message || 'Phone number not recognized.' });
          toast.error(result.message || 'OTP dispatch failed.');
          return;
        }

        toast.success(result.message || 'OTP sent successfully (mock OTP is 123456).');
        setPhoneVal(data.phone);
        otpForm.setValue('phone', data.phone);
        setStep('otp');
        setResendTimer(60);
      } catch (error) {
        toast.error('Failed to contact login service.');
      }
    });
  }

  // Handle OTP verification submit
  async function onOtpSubmit(data) {
    startTransition(async () => {
      try {
        const result = await handleLoginAction(data);

        if (!result.success) {
          otpForm.setError('code', { type: 'server', message: result.message || 'Verification failed.' });
          toast.error(result.message || 'Verification failed.');
          return;
        }

        toast.success('Access verified. Loading overview...');
        const returnTo = searchParams.get('returnTo') || '/overview';
        router.push(returnTo);
      } catch (error) {
        toast.error('Session configuration error.');
      }
    });
  }

  // Action to resend code
  async function handleResend() {
    if (resendTimer > 0) return;
    startTransition(async () => {
      try {
        const result = await requestOTP(phoneVal);
        if (result.success) {
          toast.success('Code re-sent successfully.');
          setResendTimer(60);
        } else {
          toast.error(result.message || 'Resend request failed.');
        }
      } catch (e) {
        toast.error('Network error during request.');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col items-center text-center">
        <div className="p-3 bg-primary/10 rounded-full border border-primary/20 mb-3 text-primary">
          <Scissors className="h-6 w-6 animate-pulse" />
        </div>
        <h1 className="text-xl font-bold font-display text-foreground">EverCut Admin Portal</h1>
        <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
          {step === 'phone' 
            ? 'Enter your administrative mobile number to request a session code.' 
            : `Enter the code sent to verified line +91 ${phoneVal}`}
        </p>
      </div>

      {/* Step 1: Input mobile number */}
      {step === 'phone' && (
        <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4" noValidate>
          <FormInput
            label="Administrative Mobile"
            placeholder="e.g. 9876543210"
            required
            maxLength={10}
            type="tel"
            error={phoneForm.formState.errors.phone?.message}
            {...phoneForm.register('phone')}
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-md font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Request OTP
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 2: Input code details */}
      {step === 'otp' && (
        <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4" noValidate>
          <FormInput
            label="6-Digit OTP Code"
            placeholder="e.g. 123456"
            required
            maxLength={6}
            type="text"
            className="font-mono tracking-widest text-center text-lg"
            error={otpForm.formState.errors.code?.message}
            {...otpForm.register('code')}
          />
          <div className="flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <PhoneCall className="h-3 w-3" />
              Change Number
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendTimer > 0 || isPending}
              className="text-primary hover:underline disabled:text-muted-foreground/50 disabled:no-underline"
            >
              {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
            </button>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-md font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Verify OTP
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
export default LoginForm;
