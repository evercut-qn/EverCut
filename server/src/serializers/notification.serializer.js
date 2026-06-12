import { sanitizeForResponse, toIdString, toPlainObject } from './core.serializer.js';

const compact = (value) => Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
);

export const serializeInboxNotification = (notification) => {
    const plain = sanitizeForResponse(toPlainObject(notification));
    if (!plain) return null;

    return {
        id: plain.id,
        notificationId: plain.notificationId ? toIdString(plain.notificationId) : null,
        recipientId: plain.recipientId ? toIdString(plain.recipientId) : null,
        recipientUserId: toIdString(plain.recipientUserId),
        actorUserId: plain.actorUserId ? toIdString(plain.actorUserId) : null,
        type: plain.type,
        category: plain.category || null,
        eventType: plain.eventType,
        title: plain.title,
        body: plain.body,
        data: plain.data || {},
        entityType: plain.entityType || null,
        entityId: plain.entityId || null,
        status: plain.status,
        delivery: plain.delivery || { successCount: 0, failureCount: 0 },
        readAt: plain.readAt || null,
        deliveredAt: plain.deliveredAt || null,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    };
};

export const serializeFcmTokenRegistration = (token) => {
    const plain = sanitizeForResponse(toPlainObject(token));
    if (!plain) return null;

    return compact({
        id: plain.id,
        userId: toIdString(plain.userId),
        platform: plain.platform ?? null,
        deviceId: plain.deviceId ?? null,
        appVersion: plain.appVersion ?? null,
        lastSeenAt: plain.lastSeenAt ?? null,
        revokedAt: plain.revokedAt ?? null,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    });
};

export const serializeNotification = (notification) => {
    const plain = sanitizeForResponse(toPlainObject(notification));
    if (!plain) return null;

    const displayStatusMap = {
        sending: 'Processing',
        sent: 'Completed',
        failed: 'System Error',
    };

    return {
        id: plain.id,
        title: plain.title,
        body: plain.body,
        type: plain.type,
        category: plain.category,
        status: plain.status,
        displayStatus: displayStatusMap[plain.status] || plain.status,
        createdByUserId: plain.createdByUserId ? toIdString(plain.createdByUserId) : null,
        updatedByUserId: plain.updatedByUserId ? toIdString(plain.updatedByUserId) : null,
        sentByUserId: plain.sentByUserId ? toIdString(plain.sentByUserId) : null,
        audience: plain.audience || {},
        data: plain.payload || plain.data || {},
        entityType: plain.entityType || null,
        entityId: plain.entityId || null,
        metrics: plain.metrics || {},
        reporting: plain.reporting || null,
        scheduledFor: plain.scheduledFor || null,
        sentAt: plain.sentAt || null,
        completedAt: plain.completedAt || null,
        cancelledAt: plain.cancelledAt || null,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    };
};

export const serializeNotificationRecipient = (recipient) => {
    const plain = sanitizeForResponse(toPlainObject(recipient));
    if (!plain) return null;

    return {
        id: plain.id,
        notificationId: toIdString(plain.notificationId),
        userId: toIdString(plain.userId),
        roleType: plain.roleType,
        customerId: plain.customerId ? toIdString(plain.customerId) : null,
        barberId: plain.barberId ? toIdString(plain.barberId) : null,
        status: plain.status,
        tokenCount: plain.tokenCount || 0,
        successCount: plain.successCount || 0,
        failureCount: plain.failureCount || 0,
        invalidTokenCount: plain.invalidTokenCount || 0,
        skippedReason: plain.skippedReason || null,
        tokenAttempts: (plain.tokenAttempts || []).map((a) => ({
            fcmTokenId: a.fcmTokenId ? toIdString(a.fcmTokenId) : null,
            platform: a.platform || 'unknown',
            success: Boolean(a.success),
            invalidToken: Boolean(a.invalidToken),
            firebaseMessageId: a.firebaseMessageId || null,
            firebaseErrorCode: a.firebaseErrorCode || null,
            firebaseErrorMessage: a.firebaseErrorMessage || null,
            sentAt: a.sentAt || null,
            failedAt: a.failedAt || null,
        })),
        processedAt: plain.processedAt || null,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    };
};

export const serializeNotificationAuditLog = (auditLog) => {
    const plain = sanitizeForResponse(toPlainObject(auditLog));
    if (!plain) return null;

    return {
        id: plain.id,
        actorUserId: plain.actorUserId ? toIdString(plain.actorUserId) : null,
        action: plain.action,
        resourceType: plain.resourceType,
        resourceId: plain.resourceId ? toIdString(plain.resourceId) : null,
        before: plain.before || null,
        after: plain.after || null,
        metadata: plain.metadata || {},
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    };
};
