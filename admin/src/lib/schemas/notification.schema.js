import { z } from 'zod';

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().default(''),
  category: z.string().default(''),
  search: z.string().default(''),
});

export const notificationParamSchema = z.object({
  notificationId: z.string().min(1),
});

export const notificationFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  body: z.string().trim().min(1, 'Body is required').max(500),
  type: z.enum(['push', 'silent', 'hybrid']).default('hybrid'),
  category: z.enum(['transactional', 'admin_broadcast', 'silent_sync', 'system_alert', 'promotional']).default('admin_broadcast'),
  audienceMode: z.enum(['customers', 'barbers', 'customers_and_barbers']).default('customers'),
  dataJson: z.string().default('{}'),
}).superRefine((value, ctx) => {
  try {
    JSON.parse(value.dataJson || '{}');
  } catch {
    ctx.addIssue({
      code: 'custom',
      path: ['dataJson'],
      message: 'Data payload must be valid JSON.',
    });
  }
});

export function toNotificationPayload(values) {
  const data = JSON.parse(values.dataJson || '{}');

  return {
    title: values.title,
    body: values.body,
    type: values.type,
    category: values.category,
    audience: {
      mode: values.audienceMode,
      filters: {},
    },
    data,
  };
}
