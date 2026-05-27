import { z } from 'zod';
import { objectIdSchema, paginationSchema, searchSchema } from './common.schema';

export const payoutStatusSchema = z.enum(['INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'REVERSED']);
export const payoutGatewaySchema = z.enum(['cashfree', 'manual']);

export const payoutSortSchema = z.enum([
  'createdAt:desc',
  'createdAt:asc',
  'amount:desc',
  'amount:asc',
  'amountInRupees:desc',
  'amountInRupees:asc',
  'processedAt:desc',
  'processedAt:asc',
]);

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

/** Schema to validate payout history filter query parameters */
export const payoutListQuerySchema = paginationSchema.extend({
  tab: z.enum(['pending', 'history']).catch('pending'),
  status: payoutStatusSchema.or(z.literal('')).catch(''),
  gateway: payoutGatewaySchema.or(z.literal('')).catch(''),
  barberId: objectIdSchema.or(z.literal('')).catch(''),
  startDate: z.iso.date().or(z.literal('')).catch(''),
  endDate: z.iso.date().or(z.literal('')).catch(''),
  sort: payoutSortSchema.catch('createdAt:desc'),
  search: searchSchema.or(z.literal('')).catch(''),
}).refine(
  (value) => !value.startDate || !value.endDate || value.endDate >= value.startDate,
  {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  },
);

export default createPayoutSchema;
