import { z } from 'zod';

const RESERVED_FCM_DATA_KEYS = new Set(['from', 'message_type']);
const RESERVED_FCM_DATA_KEY_PREFIXES = ['google.', 'gcm.', 'gcm.notification.'];

const isReservedFcmDataKey = (key) => (
  RESERVED_FCM_DATA_KEYS.has(key)
  || RESERVED_FCM_DATA_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
);

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
  imageMediaId: z.string().trim().optional().nullable(),
  dataJson: z.string().default('{}'),
}).superRefine((value, ctx) => {
  let parsedData;
  try {
    parsedData = JSON.parse(value.dataJson || '{}');
  } catch {
    ctx.addIssue({
      code: 'custom',
      path: ['dataJson'],
      message: 'Data payload must be valid JSON.',
    });
    return;
  }

  if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
    ctx.addIssue({
      code: 'custom',
      path: ['dataJson'],
      message: 'Data payload must be a JSON object.',
    });
    return;
  }

  const reservedKey = Object.keys(parsedData).find(isReservedFcmDataKey);
  if (reservedKey) {
    ctx.addIssue({
      code: 'custom',
      path: ['dataJson'],
      message: `Data key "${reservedKey}" is reserved by Firebase Cloud Messaging.`,
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
    imageMediaId: values.imageMediaId || undefined,
    data,
  };
}
