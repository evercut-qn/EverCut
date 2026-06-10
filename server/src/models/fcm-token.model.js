import mongoose from 'mongoose';

import {
    ALL_FCM_PLATFORMS,
    ALL_FCM_TOKEN_STATUSES,
    FCM_PLATFORM,
    FCM_TOKEN_STATUS,
} from '../utils/constants.js';

const fcmTokenSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        token: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        platform: {
            type: String,
            enum: ALL_FCM_PLATFORMS,
            default: FCM_PLATFORM.UNKNOWN,
            index: true,
        },
        status: {
            type: String,
            enum: ALL_FCM_TOKEN_STATUSES,
            default: FCM_TOKEN_STATUS.ACTIVE,
            index: true,
        },
        deviceId: {
            type: String,
            required: true,
            trim: true,
            maxlength: 128,
        },
        appVersion: {
            type: String,
            trim: true,
            default: null,
            maxlength: 64,
        },
        registeredAt: {
            type: Date,
            default: Date.now,
        },
        refreshedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        lastSeenAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        lastSuccessfulDeliveryAt: {
            type: Date,
            default: null,
            index: true,
        },
        revokedAt: {
            type: Date,
            default: null,
            index: true,
        },
        failureCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastFailureAt: {
            type: Date,
            default: null,
        },
        failureReason: {
            type: String,
            default: null,
            maxlength: 256,
        },
    },
    { timestamps: true },
);

fcmTokenSchema.index({ userId: 1, platform: 1, revokedAt: 1 });
fcmTokenSchema.index({ userId: 1, status: 1, lastSeenAt: -1 });
fcmTokenSchema.index({ status: 1, lastSeenAt: 1 });
fcmTokenSchema.index(
    { userId: 1, deviceId: 1 },
    {
        partialFilterExpression: {
            deviceId: { $type: 'string' },
            revokedAt: null,
        },
    },
);

const FcmToken = mongoose.models.FcmToken || mongoose.model('FcmToken', fcmTokenSchema);
export default FcmToken;
