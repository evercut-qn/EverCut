import { z } from 'zod';
import { mobileSchema } from './common.schema';

/** Schema for requesting OTP: phone is required and validated */
export const requestOTPSchema = z.object({
  phone: mobileSchema,
});

/** Schema for verifying OTP: phone and 6-digit code are validated */
export const verifyOTPSchema = z.object({
  phone: mobileSchema,
  code: z
    .string({ required_error: 'Verification code is required' })
    .trim()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d+$/, 'Verification code must contain digits only'),
});
