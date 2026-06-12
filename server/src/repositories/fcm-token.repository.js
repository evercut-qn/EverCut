import FcmToken from '../models/fcm-token.model.js';
import { FCM_PLATFORM, FCM_TOKEN_STATUS } from '../utils/constants.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';

class FcmTokenRepository {
    async upsertForUserAndToken(userId, payload) {
        const now = new Date();
        return FcmToken.findOneAndUpdate(
            { token: payload.token },
            {
                $set: {
                    userId,
                    token: payload.token,
                    platform: payload.platform || FCM_PLATFORM.UNKNOWN,
                    status: FCM_TOKEN_STATUS.ACTIVE,
                    deviceId: payload.deviceId,
                    appVersion: payload.appVersion || null,
                    lastSeenAt: now,
                    refreshedAt: now,
                    revokedAt: null,
                    failureReason: null,
                },
                $setOnInsert: {
                    registeredAt: now,
                    failureCount: 0,
                    lastFailureAt: null,
                },
            },
            {
                upsert: true,
                returnDocument: 'after',
                runValidators: true,
            },
        );
    }

    async findActiveTokensByUserId(userId) {
        return FcmToken.find(trustQueryOperators({
            userId,
            revokedAt: null,
            status: FCM_TOKEN_STATUS.ACTIVE,
        })).sort({ lastSeenAt: -1 });
    }

    async findActiveTokensByUserIds(userIds = []) {
        if (!userIds.length) return [];
        return FcmToken.find(trustQueryOperators({
            userId: { $in: userIds },
            revokedAt: null,
            status: FCM_TOKEN_STATUS.ACTIVE,
        })).sort({ lastSeenAt: -1 });
    }

    async revokeTokenForUser(userId, token) {
        return FcmToken.findOneAndUpdate(
            trustQueryOperators({
                userId,
                token,
                revokedAt: null,
            }),
            {
                $set: {
                    revokedAt: new Date(),
                    status: FCM_TOKEN_STATUS.REVOKED,
                },
            },
            { returnDocument: 'after' },
        );
    }

    async markInvalidTokens(tokens = [], reason = 'Invalid FCM token') {
        if (!tokens.length) {
            return { modifiedCount: 0 };
        }

        return FcmToken.updateMany(
            trustQueryOperators({ token: { $in: tokens } }),
            {
                $set: {
                    revokedAt: new Date(),
                    status: FCM_TOKEN_STATUS.INVALID,
                    lastFailureAt: new Date(),
                    failureReason: reason,
                },
                $inc: {
                    failureCount: 1,
                },
            },
        );
    }

    async findStaleTokens(thresholdDate) {
        return FcmToken.find(trustQueryOperators({
            status: FCM_TOKEN_STATUS.ACTIVE,
            revokedAt: null,
            lastSeenAt: { $lt: thresholdDate },
            $or: [
                { lastSuccessfulDeliveryAt: null },
                { lastSuccessfulDeliveryAt: { $lt: thresholdDate } }
            ]
        }));
    }

    async updateLastSuccessfulDelivery(tokens = []) {
        if (!tokens.length) return { modifiedCount: 0 };
        return FcmToken.updateMany(
            trustQueryOperators({ token: { $in: tokens } }),
            { $set: { lastSuccessfulDeliveryAt: new Date() } }
        );
    }
}

export default new FcmTokenRepository();
