import Joi from 'joi';

import { objectId, paginationSchema } from './common.validator.js';
import {
    ALL_FCM_PLATFORMS,
    ALL_NOTIFICATION_AUDIENCE_MODES,
    ALL_NOTIFICATION_STATUSES,
    ALL_NOTIFICATION_CATEGORIES,
    ALL_NOTIFICATION_EVENTS,
    ALL_NOTIFICATION_TYPES,
    ALL_ROLES,
    NOTIFICATION_CATEGORY,
    NOTIFICATION_STATUS,
} from '../utils/constants.js';
import { normalizeNotificationData } from '../utils/notification-message.utils.js';

const fcmDataSchema = Joi.object()
    .unknown(true)
    .custom((value, helpers) => {
        try {
            return normalizeNotificationData(value);
        } catch (error) {
            return helpers.message(error.message);
        }
    }, 'FCM data key validation')
    .default({});

const audienceSchema = Joi.object({
    mode: Joi.string().valid(...ALL_NOTIFICATION_AUDIENCE_MODES).required(),
    filters: Joi.object({
        isActive: Joi.boolean(),
        search: Joi.string().trim().max(100),
    }).default({}),
});

export const registerFcmTokenSchema = Joi.object({
    token: Joi.string().trim().min(1).max(4096).required(),
    platform: Joi.string().valid(...ALL_FCM_PLATFORMS).required(),
    deviceId: Joi.string().trim().max(128).required(),
    appVersion: Joi.string().trim().max(64),
});

export const unregisterFcmTokenSchema = Joi.object({
    token: Joi.string().trim().min(1).max(4096).required(),
});

export const notificationListQuerySchema = paginationSchema.keys({
    read: Joi.boolean(),
    type: Joi.string().valid(...ALL_NOTIFICATION_TYPES),
    eventType: Joi.string().valid(...ALL_NOTIFICATION_EVENTS),
});

export const notificationIdParamSchema = Joi.object({
    id: objectId.required(),
});

export const notificationPatchSchema = Joi.object({
    read: Joi.boolean().valid(true).required(),
});

export const adminNotificationCreateSchema = Joi.object({
    title: Joi.string().trim().min(1).max(120).required(),
    body: Joi.string().trim().min(1).max(500).required(),
    type: Joi.string().valid(...ALL_NOTIFICATION_TYPES).default('hybrid'),
    category: Joi.string().valid(...ALL_NOTIFICATION_CATEGORIES).default(NOTIFICATION_CATEGORY.ADMIN_BROADCAST),
    status: Joi.string().valid(NOTIFICATION_STATUS.SENDING).default(NOTIFICATION_STATUS.SENDING),
    audience: audienceSchema.required(),
    imageMediaId: Joi.string().trim().max(128),
    data: fcmDataSchema,
    entityType: Joi.string().trim().max(64),
    entityId: Joi.string().trim().max(128),
    scheduledFor: Joi.date().iso().allow(null),
    dedupeKey: Joi.string().trim().max(256),
});

export const adminNotificationListQuerySchema = paginationSchema.keys({
    status: Joi.string().valid(...ALL_NOTIFICATION_STATUSES),
    category: Joi.string().valid(...ALL_NOTIFICATION_CATEGORIES),
    search: Joi.string().trim().max(100),
});

export const notificationRecipientListQuerySchema = paginationSchema.keys({
    status: Joi.string().valid(NOTIFICATION_STATUS.SENT, NOTIFICATION_STATUS.FAILED),
    roleType: Joi.string().valid(...ALL_ROLES),
});

export const notificationAuditLogListQuerySchema = paginationSchema.keys({
    limit: Joi.number().integer().min(1).max(100).default(50),
});
