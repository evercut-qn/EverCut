import { z } from 'zod';
import { objectIdSchema, paginationSchema, searchSchema } from './common.schema';

const booleanFilterSchema = z.enum(['true', 'false', '']).catch('');
const dateFilterSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).catch('');

export const customerDirectoryQuerySchema = paginationSchema.extend({
  search: searchSchema.or(z.literal('')).catch(''),
  isActive: booleanFilterSchema,
});

export const barberDirectoryQuerySchema = paginationSchema.extend({
  search: searchSchema.or(z.literal('')).catch(''),
  isOpen: booleanFilterSchema,
  isActive: booleanFilterSchema,
});

export const bookingLookupQuerySchema = paginationSchema.extend({
  search: searchSchema.or(z.literal('')).catch(''),
  status: z.enum(['pending', 'awaiting_confirmation', 'confirmed', 'completed', 'cancelled', 'no-show', '']).catch(''),
  paymentStatus: z.enum(['pending', 'initiated', 'success', 'failed', 'refund_pending', 'refunded', 'refund_failed', '']).catch(''),
  payoutStatus: z.enum(['not_initiated', 'initiated', 'pending', 'completed', 'failed', 'reversed', '']).catch(''),
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
}).refine((value) => !value.dateFrom || !value.dateTo || value.dateTo >= value.dateFrom, {
  message: 'Date To must be on or after Date From',
  path: ['dateTo'],
});

export const refundQuerySchema = paginationSchema.extend({
  status: z.enum(['initiated', 'pending', 'completed', 'failed', 'expired', 'refund_pending', 'refunded', 'refund_failed', '']).catch(''),
  refundStatus: z.enum(['pending', 'completed', 'failed', '']).catch(''),
});

export const subscriptionQuerySchema = paginationSchema.extend({
  planId: z.enum(['PLAN_BASIC', 'PLAN_POPULAR', 'PLAN_ADVANCED', '']).catch(''),
  status: z.enum(['ACTIVE', 'PENDING_PAYMENT', 'CANCELLED', 'EXPIRED', 'PAST_DUE', 'PAUSED', '']).catch(''),
});

export const bookingDetailParamSchema = z.object({
  bookingId: objectIdSchema,
});
