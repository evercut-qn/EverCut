import notificationRepository from '../../repositories/notification.repository.js';
import { buildPagination } from '../../utils/pagination.utils.js';
import {
    NOTIFICATION_AUDIT_ACTION,
    NOTIFICATION_STATUS,
    NOTIFICATION_CATEGORY,
    NOTIFICATION_EVENT,
} from '../../utils/constants.js';
import {
    serializeInboxNotification,
    serializeNotificationAuditLog,
    serializeNotification,
    serializeNotificationRecipient,
} from '../../serializers/notification.serializer.js';
import { NotFoundError } from '../../utils/api-error.js';
import {
    buildNotificationData,
    resolveNotificationImageUrl,
} from './notification-message.service.js';

const toNotificationPayload = async (body, actorUserId) => {
    const imageUrl = await resolveNotificationImageUrl({
        imageUrl: body.imageUrl,
        imageMediaId: body.imageMediaId,
    });

    return {
        title: body.title,
        body: body.body,
        imageUrl,
        imageMediaId: body.imageMediaId || null,
        type: body.type || 'hybrid',
        category: body.category || NOTIFICATION_CATEGORY.ADMIN_BROADCAST,
        status: body.status || NOTIFICATION_STATUS.SENDING,
        createdByUserId: actorUserId,
        audience: body.audience,
        payload: buildNotificationData({
            data: body.data,
            eventType: NOTIFICATION_EVENT.SYSTEM_ALERT,
            entityType: body.entityType,
            entityId: body.entityId,
        }),
        entityType: body.entityType || null,
        entityId: body.entityId || null,
        scheduledFor: body.scheduledFor || null,
        dedupeKey: body.dedupeKey || null,
    };
};

export const createNotification = async ({ actorUserId, body, ip = null, userAgent = null }) => {
    const payload = await toNotificationPayload(body, actorUserId);
    const notification = await notificationRepository.createNotification(payload);
    await notificationRepository.createAuditLog({
        actorUserId,
        action: NOTIFICATION_AUDIT_ACTION.NOTIFICATION_CREATED,
        resourceType: 'Notification',
        resourceId: notification._id,
        after: notification,
        ip,
        userAgent,
    });
    return serializeNotification(notification);
};

export const listNotifications = async (query = {}) => {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;
    if (query.search) {
        const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ title: regex }, { body: regex }];
    }
    const total = await notificationRepository.countNotifications(filter);
    const { skip, limit, pagination } = buildPagination(query, total);
    const notifications = await notificationRepository.listNotifications(filter, { skip, limit });
    return {
        items: notifications.map(serializeNotification),
        pagination,
    };
};

export const getNotification = async (notificationId) => {
    const notification = await notificationRepository.findNotificationById(notificationId);
    if (!notification) throw new NotFoundError('Notification');

    const derived = await notificationRepository.getDerivedCampaignMetrics(notificationId);
    const notificationObj = typeof notification.toObject === 'function'
        ? notification.toObject()
        : { ...notification };
    notificationObj.reporting = derived;

    return serializeNotification(notificationObj);
};

export const listNotificationRecipients = async (notificationId, query = {}) => {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.roleType) filter.roleType = query.roleType;
    const total = await notificationRepository.countRecipientsByNotification(notificationId, filter);
    const { skip, limit, pagination } = buildPagination(query, total);
    const recipients = await notificationRepository.listRecipientsByNotification(notificationId, filter, { skip, limit });
    return {
        items: recipients.map(serializeNotificationRecipient),
        pagination,
    };
};

export const listInboxNotifications = async (notificationId, query = {}) => {
    const total = await notificationRepository.countInboxNotificationsByBroadcastId(notificationId);
    const { skip, limit, pagination } = buildPagination(query, total);
    const inboxNotifications = await notificationRepository.listInboxNotificationsByBroadcastId(notificationId, { skip, limit });
    return {
        items: inboxNotifications.map(serializeInboxNotification),
        pagination,
    };
};

export const listNotificationAuditLogs = async (notificationId, query = {}) => {
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
    const auditLogs = await notificationRepository.listAuditLogsByResource(
        'Notification',
        notificationId,
        { limit },
    );
    return {
        items: auditLogs.map(serializeNotificationAuditLog),
        pagination: {
            currentPage: 1,
            totalPages: 1,
            totalDocuments: auditLogs.length,
            hasNextPage: false,
            hasPrevPage: false,
        },
    };
};

const notificationBroadcastService = {
    createNotification,
    getNotification,
    listNotifications,
    listNotificationAuditLogs,
    listInboxNotifications,
    listNotificationRecipients,
};

export default notificationBroadcastService;
