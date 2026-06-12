import logger from '../../utils/logger.js';
import { NOTIFICATION_TYPE } from '../../utils/constants.js';

const INVALID_TOKEN_CODES = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
    'messaging/invalid-argument',
]);

const RETRYABLE_TOKEN_CODES = new Set([
    'messaging/server-unavailable',
    'messaging/internal-error',
    'messaging/unknown-error',
    'messaging/too-many-messages',
]);

const RESERVED_FCM_DATA_KEY_PREFIXES = ['google.', 'gcm.', 'gcm.notification.'];

const toFcmDataValue = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
};

const assertAllowedFcmDataKey = (key) => {
    if (RESERVED_FCM_DATA_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        throw new Error(`FCM data key "${key}" uses a reserved prefix`);
    }
};

export const normalizeFcmData = (data = {}) => Object.fromEntries(
    Object.entries(data)
        .map(([key, value]) => {
            assertAllowedFcmDataKey(key);
            return [key, toFcmDataValue(value)];
        })
        .filter(([, value]) => value !== null),
);

export const chunkTokens = (tokens = [], chunkSize = 500) => {
    const uniqueTokens = [...new Set(tokens.filter(Boolean))];
    const chunks = [];
    for (let index = 0; index < uniqueTokens.length; index += chunkSize) {
        chunks.push(uniqueTokens.slice(index, index + chunkSize));
    }
    return chunks;
};

export const buildMulticastMessage = ({ tokens, payload }) => {
    const includeNotification = payload.type !== NOTIFICATION_TYPE.SILENT
        && Boolean(payload.title || payload.body);
    const data = normalizeFcmData({
        id: payload.id,
        type: payload.type,
        eventType: payload.eventType,
        entityType: payload.entityType,
        entityId: payload.entityId,
        ...payload.data,
    });

    const message = {
        tokens,
        data,
        android: {
            priority: 'high',
        },
        apns: {
            headers: {
                'apns-priority': includeNotification ? '10' : '5',
            },
            payload: {
                aps: {
                    contentAvailable: true,
                },
            },
        },
        webpush: {
            headers: {
                Urgency: 'high',
            },
        },
    };

    if (includeNotification) {
        message.notification = {
            title: payload.title || 'EverCut',
            body: payload.body || '',
        };
        message.android.notification = {
            channelId: 'evercut_default',
            sound: 'default',
        };
        message.apns.payload.aps.sound = 'default';
        message.webpush.notification = {
            title: payload.title || 'EverCut',
            body: payload.body || '',
        };
    }

    return message;
};

export const classifyFirebaseMessagingError = (error = {}) => {
    const code = error?.code || 'messaging/unknown-error';
    return {
        code,
        message: error?.message || 'FCM delivery failed',
        invalidToken: INVALID_TOKEN_CODES.has(code),
        retryable: RETRYABLE_TOKEN_CODES.has(code),
    };
};

export const normalizeMulticastResponse = (response, tokens = []) => {
    const failures = [];
    const successes = [];
    const invalidTokens = [];

    response.responses.forEach((result, index) => {
        const token = tokens[index];
        if (result.success) {
            successes.push({ token, messageId: result.messageId || null });
            return;
        }

        const classified = classifyFirebaseMessagingError(result.error);
        failures.push({ token, ...classified });

        if (classified.invalidToken) {
            invalidTokens.push(token);
        }
    });

    return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
        successes,
        failures,
    };
};

export const sendMulticast = async ({ tokens = [], payload = {}, attempt = 1, maxAttempts = 3 }) => {
    const chunks = chunkTokens(tokens);
    if (chunks.length === 0) {
        return {
            successCount: 0,
            failureCount: 0,
            invalidTokens: [],
            successes: [],
            failures: [],
        };
    }

    const { default: firebaseAdmin } = await import('../../config/firebase.config.js');
    const aggregate = {
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
        successes: [],
        failures: [],
    };

    const retryTokens = [];

    for (const chunk of chunks) {
        const message = buildMulticastMessage({ tokens: chunk, payload });
        const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
        const normalized = normalizeMulticastResponse(response, chunk);

        aggregate.successCount += normalized.successCount;
        aggregate.invalidTokens.push(...normalized.invalidTokens);
        aggregate.successes.push(...normalized.successes);

        for (const failure of normalized.failures) {
            if (failure.retryable && attempt < maxAttempts) {
                retryTokens.push(failure.token);
            } else {
                aggregate.failureCount += 1;
                aggregate.failures.push(failure);
            }
        }
    }

    if (retryTokens.length > 0 && attempt < maxAttempts) {
        const baseDelay = 500 * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 200;
        const delay = baseDelay + jitter;

        logger.info(`[FcmService] Retrying delivery for ${retryTokens.length} tokens`, {
            attempt: attempt + 1,
            delayMs: Math.round(delay),
        });

        await new Promise((resolve) => setTimeout(resolve, delay));

        const retryResult = await sendMulticast({
            tokens: retryTokens,
            payload,
            attempt: attempt + 1,
            maxAttempts,
        });

        aggregate.successCount += retryResult.successCount;
        aggregate.failureCount += retryResult.failureCount;
        aggregate.invalidTokens.push(...retryResult.invalidTokens);
        aggregate.successes.push(...retryResult.successes);
        aggregate.failures.push(...retryResult.failures);
    }

    if (attempt === 1 && aggregate.failures.length > 0) {
        logger.warn('[FcmService] Multicast delivery completed with failures', {
            successCount: aggregate.successCount,
            failureCount: aggregate.failureCount,
            invalidTokenCount: aggregate.invalidTokens.length,
        });
    }

    return aggregate;
};

export const deliverToTokens = async ({ tokens = [], payload = {} }) => {
    const delivery = await fcmService.sendMulticast({ tokens, payload });

    if (delivery.invalidTokens.length > 0) {
        const { default: fcmTokenRepository } = await import('../../repositories/fcm-token.repository.js');
        await fcmTokenRepository.markInvalidTokens(
            delivery.invalidTokens,
            'FCM reported token invalid or unregistered',
        );
    }

    if (delivery.successes.length > 0) {
        const { default: fcmTokenRepository } = await import('../../repositories/fcm-token.repository.js');
        const successfulTokens = delivery.successes.map((s) => s.token);
        await fcmTokenRepository.updateLastSuccessfulDelivery(successfulTokens);
    }

    return delivery;
};

const fcmService = {
    normalizeFcmData,
    chunkTokens,
    buildMulticastMessage,
    classifyFirebaseMessagingError,
    normalizeMulticastResponse,
    sendMulticast,
    deliverToTokens,
};

export default fcmService;
