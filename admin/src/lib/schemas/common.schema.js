import { z } from 'zod';

/** Indian mobile number format validation: 10 digits starting with 6-9 */
export const mobileSchema = z
  .string({ required_error: 'Mobile number is required' })
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

/** MongoDB ObjectId hex string validation */
export const objectIdSchema = z
  .string({ required_error: 'Resource ID is required' })
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

/** Pagination query parameters validations */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Search criteria text schema */
export const searchSchema = z
  .string()
  .trim()
  .max(100, 'Search query is too long')
  .optional();
