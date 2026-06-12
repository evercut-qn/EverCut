import logger from '../../utils/logger.js';
import notificationRepository from '../../repositories/notification.repository.js';
import fcmTokenRepository from '../../repositories/fcm-token.repository.js';
import fcmService from './fcm.service.js';
import { serializeInboxNotification } from '../../serializers/notification.serializer.js';
import {
    NOTIFICATION_CATEGORY,
    NOTIFICATION_STATUS,
    NOTIFICATION_TYPE,
} from '../../utils/constants.js';

const toObjectIdString = (value) => String(value?._id || value || '');

const updateDelivery = async (notificationId, updates) => {
    try {
        await notificationRepository.updateDeliveryStatus(notificationId, updates);
        return null;
    } catch (error) {
        logger.error('[NotificationDomainService] Failed to update notification delivery status', {
            notificationId,
            error: error.message,
        });
        return null;
    }
};

export const notifyUser = async ({
    recipientUserId,
    actorUserId = null,
    type = NOTIFICATION_TYPE.HYBRID,
    category = NOTIFICATION_CATEGORY.TRANSACTIONAL,
    eventType,
    title = null,
    body = null,
    data = {},
    entityType = null,
    entityId = null,
    dedupeKey = null,
    expiresAt = null,
}) => {
    const { created, notification } = await notificationRepository.createInboxNotificationIfNotExists({
        recipientUserId,
        actorUserId,
        type,
        category,
        eventType,
        title,
        body,
        data,
        entityType,
        entityId: entityId ? toObjectIdString(entityId) : null,
        dedupeKey,
        expiresAt,
    });

    if (!created) {
        return {
            notification: serializeInboxNotification(notification),
            duplicate: true,
            delivery: {
                skipped: true,
                reason: 'duplicate',
            },
        };
    }

    const tokens = await fcmTokenRepository.findActiveTokensByUserId(recipientUserId);
    if (tokens.length === 0) {
        await updateDelivery(notification._id, {
            status: NOTIFICATION_STATUS.SENT,
            failureReason: 'No active FCM tokens',
            delivery: {
                successCount: 0,
                failureCount: 0,
            },
        });

        return {
            notification: serializeInboxNotification(notification),
            duplicate: false,
            delivery: {
                successCount: 0,
                failureCount: 0,
                skipped: true,
                reason: 'no_active_tokens',
            },
        };
    }

    try {
        const delivery = await fcmService.deliverToTokens({
            tokens: tokens.map((tokenDoc) => tokenDoc.token),
            payload: {
                id: toObjectIdString(notification._id),
                type,
                eventType,
                title,
                body,
                entityType,
                entityId: entityId ? toObjectIdString(entityId) : null,
                data: fcmService.normalizeFcmData(data),
            },
        });

        const status = delivery.successCount > 0
            ? NOTIFICATION_STATUS.SENT
            : NOTIFICATION_STATUS.FAILED;
        await updateDelivery(notification._id, {
            status,
            deliveredAt: delivery.successCount > 0 ? new Date() : null,
            failureReason: delivery.failureCount > 0 ? 'One or more FCM deliveries failed' : null,
            delivery: {
                successCount: delivery.successCount,
                failureCount: delivery.failureCount,
            },
        });

        return {
            notification: serializeInboxNotification(notification),
            duplicate: false,
            delivery,
        };
    } catch (error) {
        logger.error('[NotificationDomainService] FCM delivery failed', {
            notificationId: notification._id,
            recipientUserId,
            eventType,
            error: error.message,
        });

        await updateDelivery(notification._id, {
            status: NOTIFICATION_STATUS.FAILED,
            deliveredAt: null,
            failureReason: error.message,
            delivery: {
                successCount: 0,
                failureCount: tokens.length,
            },
        });

        return {
            notification: serializeInboxNotification(notification),
            duplicate: false,
            delivery: {
                successCount: 0,
                failureCount: tokens.length,
                error: error.message,
            },
        };
    }
};

const notificationDomainService = {
    notifyUser,
};

export default notificationDomainService;
