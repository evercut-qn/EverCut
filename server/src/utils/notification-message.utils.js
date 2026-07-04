const RESERVED_FCM_DATA_KEYS = new Set(['from', 'message_type']);
const RESERVED_FCM_DATA_KEY_PREFIXES = ['google.', 'gcm.', 'gcm.notification.'];

const isReservedFcmDataKey = (key) => (
    RESERVED_FCM_DATA_KEYS.has(key)
    ||
    RESERVED_FCM_DATA_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
);

const compactUndefined = (value) => Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
);

export const normalizeNotificationData = (data = {}) => {
    const output = {};

    for (const [key, value] of Object.entries(data || {})) {
        if (isReservedFcmDataKey(key)) {
            throw new Error(`FCM data key "${key}" uses a reserved prefix`);
        }

        if (value !== undefined) {
            output[key] = value;
        }
    }

    return output;
};

export const toFcmDataValue = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
};

export const normalizeFcmData = (data = {}) => Object.fromEntries(
    Object.entries(normalizeNotificationData(data))
        .map(([key, value]) => [key, toFcmDataValue(value)])
        .filter(([, value]) => value !== null),
);

export const buildNotificationMessage = ({
    id = null,
    title = null,
    body = null,
    imageUrl = null,
    data = {},
} = {}) => compactUndefined({
    id: id ? String(id) : null,
    title,
    body,
    imageUrl: imageUrl || null,
    data: normalizeNotificationData(data),
});

export const buildNotificationData = ({
    data = {},
    eventType = null,
    entityType = null,
    entityId = null,
} = {}) => normalizeNotificationData(compactUndefined({
    ...data,
    eventType: eventType || undefined,
    entityType: entityType || undefined,
    entityId: entityId ? String(entityId) : undefined,
}));

export const buildFcmPayload = (input = {}) => {
    const message = buildNotificationMessage(input);

    return {
        message,
        fcmData: normalizeFcmData({
            id: message.id,
            imageUrl: message.imageUrl,
            ...message.data,
        }),
    };
};
