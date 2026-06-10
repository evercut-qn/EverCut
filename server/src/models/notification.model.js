import mongoose from 'mongoose';

import {
    ALL_NOTIFICATION_AUDIENCE_MODES,
    ALL_NOTIFICATION_AUDIT_ACTIONS,
    ALL_NOTIFICATION_EVENTS,
    ALL_NOTIFICATION_STATUSES,
    ALL_NOTIFICATION_TYPES,
    ALL_ROLES,
    NOTIFICATION_AUDIENCE_MODE,
    NOTIFICATION_CATEGORY,
    NOTIFICATION_STATUS,
    NOTIFICATION_TYPE,
} from '../utils/constants.js';

const deliverySchema = new mongoose.Schema(
    {
        successCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        failureCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        invalidTokenCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        skippedCount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { _id: false },
);

const audienceSchema = new mongoose.Schema(
    {
        mode: {
            type: String,
            enum: ALL_NOTIFICATION_AUDIENCE_MODES,
            default: NOTIFICATION_AUDIENCE_MODE.CUSTOMERS,
            required: true,
        },
        filters: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { _id: false },
);

const notificationMetricsSchema = new mongoose.Schema(
    {
        recipientCount: { type: Number, default: 0, min: 0 },
        tokenCount: { type: Number, default: 0, min: 0 },
        successCount: { type: Number, default: 0, min: 0 },
        failureCount: { type: Number, default: 0, min: 0 },
        invalidTokenCount: { type: Number, default: 0, min: 0 },
        skippedCount: { type: Number, default: 0, min: 0 },
    },
    { _id: false },
);

const notificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            required: true,
            maxlength: 120,
        },
        body: {
            type: String,
            trim: true,
            required: true,
            maxlength: 500,
        },
        type: {
            type: String,
            enum: ALL_NOTIFICATION_TYPES,
            default: NOTIFICATION_TYPE.HYBRID,
            index: true,
        },
        category: {
            type: String,
            enum: [NOTIFICATION_CATEGORY.TRANSACTIONAL, NOTIFICATION_CATEGORY.ADMIN_BROADCAST, NOTIFICATION_CATEGORY.SILENT_SYNC, NOTIFICATION_CATEGORY.SYSTEM_ALERT, NOTIFICATION_CATEGORY.PROMOTIONAL],
            default: NOTIFICATION_CATEGORY.ADMIN_BROADCAST,
            index: true,
        },
        status: {
            type: String,
            enum: ALL_NOTIFICATION_STATUSES,
            default: NOTIFICATION_STATUS.SENDING,
            index: true,
        },
        createdByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        updatedByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        sentByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        audience: {
            type: audienceSchema,
            required: true,
            default: () => ({ mode: NOTIFICATION_AUDIENCE_MODE.CUSTOMERS }),
        },
        payload: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        entityType: {
            type: String,
            trim: true,
            maxlength: 64,
            default: null,
            index: true,
        },
        entityId: {
            type: String,
            trim: true,
            maxlength: 128,
            default: null,
            index: true,
        },
        metrics: {
            type: notificationMetricsSchema,
            default: () => ({}),
        },
        scheduledFor: {
            type: Date,
            default: null,
            index: true,
        },
        sentAt: {
            type: Date,
            default: null,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        cancelledAt: {
            type: Date,
            default: null,
        },
        dedupeKey: {
            type: String,
            trim: true,
            maxlength: 256,
            default: null,
        },
        failureReason: {
            type: String,
            trim: true,
            maxlength: 512,
            default: null,
        },
    },
    { timestamps: true },
);

notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ createdByUserId: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });
notificationSchema.index(
    { dedupeKey: 1 },
    {
        unique: true,
        partialFilterExpression: {
            dedupeKey: { $type: 'string' },
        },
    },
);

const notificationRecipientSchema = new mongoose.Schema(
    {
        notificationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Notification',
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        roleType: {
            type: String,
            enum: ALL_ROLES,
            required: true,
            index: true,
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            default: null,
        },
        barberId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Barber',
            default: null,
        },
        inboxNotificationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InboxNotification',
            default: null,
            index: true,
        },
        status: {
            type: String,
            enum: ALL_NOTIFICATION_STATUSES,
            default: NOTIFICATION_STATUS.SENT,
            index: true,
        },
        tokenCount: { type: Number, default: 0, min: 0 },
        successCount: { type: Number, default: 0, min: 0 },
        failureCount: { type: Number, default: 0, min: 0 },
        invalidTokenCount: { type: Number, default: 0, min: 0 },
        skippedReason: {
            type: String,
            default: null,
            maxlength: 256,
        },
        tokenAttempts: {
            type: [
                new mongoose.Schema(
                    {
                        fcmTokenId: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: 'FcmToken',
                            required: true,
                        },
                        platform: {
                            type: String,
                            default: 'unknown',
                        },
                        success: {
                            type: Boolean,
                            required: true,
                        },
                        invalidToken: {
                            type: Boolean,
                            default: false,
                        },
                        firebaseMessageId: {
                            type: String,
                            default: null,
                            trim: true,
                        },
                        firebaseErrorCode: {
                            type: String,
                            default: null,
                            trim: true,
                        },
                        firebaseErrorMessage: {
                            type: String,
                            default: null,
                            trim: true,
                            maxlength: 512,
                        },
                        sentAt: { type: Date, default: null },
                        failedAt: { type: Date, default: null },
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },
        processedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

notificationRecipientSchema.index({ notificationId: 1, userId: 1 }, { unique: true });
notificationRecipientSchema.index({ notificationId: 1, status: 1 });
notificationRecipientSchema.index({ userId: 1, createdAt: -1 });


const notificationAuditLogSchema = new mongoose.Schema(
    {
        actorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        action: {
            type: String,
            enum: ALL_NOTIFICATION_AUDIT_ACTIONS,
            required: true,
            index: true,
        },
        resourceType: {
            type: String,
            required: true,
            trim: true,
            maxlength: 128,
        },
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        before: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        after: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        ip: {
            type: String,
            default: null,
            trim: true,
            maxlength: 64,
        },
        userAgent: {
            type: String,
            default: null,
            trim: true,
            maxlength: 512,
        },
    },
    { timestamps: true },
);

notificationAuditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
notificationAuditLogSchema.index({ actorUserId: 1, createdAt: -1 });
notificationAuditLogSchema.index({ action: 1, createdAt: -1 });

const inboxNotificationSchema = new mongoose.Schema(
    {
        notificationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Notification',
            default: null,
            index: true,
        },
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NotificationRecipient',
            default: null,
            index: true,
        },
        recipientUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        actorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        type: {
            type: String,
            enum: ALL_NOTIFICATION_TYPES,
            default: NOTIFICATION_TYPE.HYBRID,
            index: true,
        },
        category: {
            type: String,
            enum: [NOTIFICATION_CATEGORY.TRANSACTIONAL, NOTIFICATION_CATEGORY.ADMIN_BROADCAST, NOTIFICATION_CATEGORY.SILENT_SYNC, NOTIFICATION_CATEGORY.SYSTEM_ALERT, NOTIFICATION_CATEGORY.PROMOTIONAL],
            default: NOTIFICATION_CATEGORY.TRANSACTIONAL,
            index: true,
        },
        eventType: {
            type: String,
            enum: ALL_NOTIFICATION_EVENTS,
            required: true,
            index: true,
        },
        title: {
            type: String,
            trim: true,
            maxlength: 120,
            default: null,
        },
        body: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        entityType: {
            type: String,
            trim: true,
            maxlength: 64,
            default: null,
            index: true,
        },
        entityId: {
            type: String,
            trim: true,
            maxlength: 128,
            default: null,
            index: true,
        },
        dedupeKey: {
            type: String,
            trim: true,
            maxlength: 256,
            default: null,
        },
        status: {
            type: String,
            enum: ALL_NOTIFICATION_STATUSES,
            default: NOTIFICATION_STATUS.SENT,
            index: true,
        },
        delivery: {
            type: deliverySchema,
            default: () => ({ successCount: 0, failureCount: 0 }),
        },
        deliveredAt: {
            type: Date,
            default: null,
        },
        readAt: {
            type: Date,
            default: null,
            index: true,
        },
        failureReason: {
            type: String,
            default: null,
            maxlength: 512,
        },
        expiresAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

inboxNotificationSchema.index({ recipientUserId: 1, readAt: 1, createdAt: -1 });
inboxNotificationSchema.index({ recipientUserId: 1, eventType: 1, createdAt: -1 });
inboxNotificationSchema.index({ notificationId: 1, createdAt: -1 });
inboxNotificationSchema.index({ category: 1, createdAt: -1 });
inboxNotificationSchema.index(
    { dedupeKey: 1 },
    {
        unique: true,
        partialFilterExpression: {
            dedupeKey: { $type: 'string' },
        },
    },
);
inboxNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const NotificationRecipient = mongoose.models.NotificationRecipient
    || mongoose.model('NotificationRecipient', notificationRecipientSchema);
export const NotificationAuditLog = mongoose.models.NotificationAuditLog
    || mongoose.model('NotificationAuditLog', notificationAuditLogSchema);
export const InboxNotification = mongoose.models.InboxNotification
    || mongoose.model('InboxNotification', inboxNotificationSchema);

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export default Notification;
