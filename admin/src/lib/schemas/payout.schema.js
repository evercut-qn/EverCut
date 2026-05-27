import { z } from 'zod';
import { objectIdSchema } from './common.schema';

/** Schema to validate manual payouts request submissions */
export const createPayoutSchema = z.object({
  barberId: objectIdSchema,
  bookingIds: z.union([
    z.array(objectIdSchema).min(1, 'Must contain at least one valid Booking ID'),
    z.string()
      .trim()
      .min(1, 'Please enter at least one Booking ID')
      .transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean))
      .pipe(z.array(objectIdSchema).min(1, 'Must contain at least one valid Booking ID'))
  ]),
  utr: z
    .string({ required_error: 'UTR reference number is required' })
    .trim()
    .toUpperCase()
    .min(3, 'UTR must be at least 3 characters long')
    .max(50, 'UTR must be at most 50 characters')
    .regex(/^[A-Z0-9]+$/, 'UTR must contain only alphanumeric characters'),
  transferMode: z
    .enum(['upi', 'imps', 'neft', 'rtgs', 'banktransfer'], {
      required_error: 'Please select a transfer mode',
    })
    .default('upi'),
  notes: z
    .string()
    .trim()
    .max(500, 'Audit notes must be at most 500 characters')
    .optional()
    .or(z.literal('')),
});

export default createPayoutSchema;
