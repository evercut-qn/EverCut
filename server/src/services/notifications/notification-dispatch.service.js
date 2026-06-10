import fcmTokenRepository from '../../repositories/fcm-token.repository.js';
import notificationRepository from '../../repositories/notification.repository.js';
import fcmService from './fcm.service.js';
import notificationAudienceService from './notification-audience.service.js';
import {
    NOTIFICATION_AUDIT_ACTION,
    NOTIFICATION_STATUS,
} from '../../utils/constants.js';
import { serializeNotification } from '../../serializers/notification.serializer.js';
import { BadRequestError, NotFoundError } from '../../utils/api-error.js';

const toIdString = (value) => String(value?._id || value || '');

const statusFromCounts = ({ successCount, failureCount, skippedCount }) => {
    if (successCount > 0 || skippedCount > 0) return NOTIFICATION_STATUS.SENT;
    if (failureCount > 0) return NOTIFICATION_STATUS.FAILED;
    return NOTIFICATION_STATUS.FAILED;
};

const groupTokensByUser = (tokens) => tokens.reduce((map, tokenDoc) => {
    const userId = toIdString(tokenDoc.userId);
    if (!map.has(userId)) map.set(userId, []);
    map.get(userId).push(tokenDoc);
    return map;
}, new Map());

const buildTokenAttempts = (recipientTokens, delivery) => recipientTokens.map((tokenDoc) => {
    const success = delivery.successes.find((item) => item.token === tokenDoc.token);
    const failure = delivery.failures.find((item) => item.token === tokenDoc.token);
    const invalid = Boolean(failure?.invalidToken);

    return {
        fcmTokenId: tokenDoc._id,
        platform: tokenDoc.platform || 'unknown',
        success: Boolean(success),
        invalidToken: invalid,
        firebaseMessageId: success?.messageId || null,
        firebaseErrorCode: failure?.code || null,
        firebaseErrorMessage: failure?.message || null,
        sentAt: success ? new Date() : null,
        failedAt: failure ? new Date() : null,
    };
});

export const sendNotification = async (notificationId, { actorUserId = null, ip = null, userAgent = null } = {}) => {
    const notification = await notificationRepository.claimNotificationForSending(notificationId, actorUserId);
    if (!notification) {
        const existingNotification = await notificationRepository.findNotificationById(notificationId);
        if (!existingNotification) throw new NotFoundError('Notification');
        throw new BadRequestError('Notification cannot be sent from its current status');
    }

    const metrics = {
        recipientCount: 0,
        tokenCount: 0,
        successCount: 0,
        failureCount: 0,
        invalidTokenCount: 0,
        skippedCount: 0,
    };

    try {
        const audience = await notificationAudienceService.resolveAudience(notification.audience || {});
        const recipients = await notificationRepository.bulkCreateRecipients(
            audience.recipients.map((recipient) => ({
                notificationId,
                ...recipient,
            })),
        );

        const inboxNotifications = await notificationRepository.bulkCreateInboxNotifications(
            recipients.map((recipient) => ({
                notificationId,
                recipientId: recipient._id,
                recipientUserId: recipient.userId,
                type: notification.type,
                category: notification.category,
                eventType: 'system.alert',
                title: notification.title,
                body: notification.body,
                data: notification.payload || {},
                entityType: notification.entityType || null,
                entityId: notification.entityId || null,
            })),
        );

        const tokens = await fcmTokenRepository.findActiveTokensByUserIds(recipients.map((recipient) => recipient.userId));
        const tokensByUser = groupTokensByUser(tokens);
        metrics.recipientCount = recipients.length;
        metrics.tokenCount = tokens.length;

        const batchSize = 50;
        for (let i = 0; i < recipients.length; i += batchSize) {
            const batchIndices = Array.from({ length: Math.min(batchSize, recipients.length - i) }, (_, idx) => i + idx);
            await Promise.all(
                batchIndices.map(async (index) => {
                    const recipient = recipients[index];
                    const inboxNotification = inboxNotifications[index];
                    const recipientTokens = tokensByUser.get(toIdString(recipient.userId)) || [];

                    if (recipientTokens.length === 0) {
                        metrics.skippedCount += 1;
                        await notificationRepository.updateRecipientById(recipient._id, {
                            status: NOTIFICATION_STATUS.SENT,
                            skippedReason: 'No active FCM tokens',
                            processedAt: new Date(),
                            inboxNotificationId: inboxNotification._id,
                        });
                        return;
                    }

                    const delivery = await fcmService.deliverToTokens({
                        tokens: recipientTokens.map((tokenDoc) => tokenDoc.token),
                        payload: {
                            id: toIdString(inboxNotification._id),
                            type: notification.type,
                            eventType: inboxNotification.eventType,
                            title: notification.title,
                            body: notification.body,
                            entityType: inboxNotification.entityType,
                            entityId: inboxNotification.entityId ? toIdString(inboxNotification.entityId) : null,
                            data: notification.payload || {},
                        },
                    });

                    metrics.successCount += delivery.successCount;
                    metrics.failureCount += delivery.failureCount;
                    metrics.invalidTokenCount += delivery.invalidTokens.length;

                    const tokenAttempts = buildTokenAttempts(recipientTokens, delivery);

                    await notificationRepository.updateRecipientById(recipient._id, {
                        status: delivery.successCount > 0
                            ? NOTIFICATION_STATUS.SENT
                            : NOTIFICATION_STATUS.FAILED,
                        tokenCount: recipientTokens.length,
                        successCount: delivery.successCount,
                        failureCount: delivery.failureCount,
                        invalidTokenCount: delivery.invalidTokens.length,
                        tokenAttempts,
                        processedAt: new Date(),
                        inboxNotificationId: inboxNotification._id,
                    });
                })
            );
        }

        const status = statusFromCounts(metrics);
        const updated = await notificationRepository.updateNotificationById(notificationId, {
            status,
            metrics,
            completedAt: new Date(),
        });
        await notificationRepository.createAuditLog({
            actorUserId,
            action: NOTIFICATION_AUDIT_ACTION.NOTIFICATION_SENT,
            resourceType: 'Notification',
            resourceId: notificationId,
            after: updated,
            ip,
            userAgent,
        });

        return serializeNotification(updated);
    } catch (error) {
        const failed = await notificationRepository.updateNotificationById(notificationId, {
            status: NOTIFICATION_STATUS.FAILED,
            metrics,
            completedAt: new Date(),
            failureReason: error.message,
        });
        await notificationRepository.createAuditLog({
            actorUserId,
            action: NOTIFICATION_AUDIT_ACTION.DELIVERY_COMPLETED,
            resourceType: 'Notification',
            resourceId: notificationId,
            after: failed,
            metadata: {
                error: error.message,
            },
            ip,
            userAgent,
        });
        throw error;
    }
};

const notificationDispatchService = {
    sendNotification,
};

export default notificationDispatchService;
