import fcmTokenRepository from '../../repositories/fcm-token.repository.js';
import { serializeFcmTokenRegistration } from '../../serializers/notification.serializer.js';

const compact = (value) => Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
);

export const registerToken = async (userId, payload) => {
    const token = await fcmTokenRepository.upsertForUserAndToken(userId, compact({
        token: payload.token,
        platform: payload.platform,
        deviceId: payload.deviceId,
        appVersion: payload.appVersion,
    }));

    return serializeFcmTokenRegistration(token);
};

export const revokeToken = async (userId, token) => ({
    revoked: Boolean(await fcmTokenRepository.revokeTokenForUser(userId, token)),
});

const notificationTokenService = {
    registerToken,
    revokeToken,
};

export default notificationTokenService;
