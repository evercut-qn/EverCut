import { NotFoundError } from '../../utils/api-error.js';
import { buildPagination } from '../../utils/pagination.utils.js';
import notificationRepository from '../../repositories/notification.repository.js';
import { serializeInboxNotification } from '../../serializers/notification.serializer.js';

const buildInboxNotificationFilter = (query = {}) => {
    const filter = {};

    if (query.read === true) filter.readAt = { $ne: null };
    if (query.read === false) filter.readAt = null;
    if (query.type) filter.type = query.type;
    if (query.eventType) filter.eventType = query.eventType;

    return filter;
};

export const listInboxNotifications = async (userId, query = {}) => {
    const filter = buildInboxNotificationFilter(query);
    const total = await notificationRepository.countInboxNotifications(userId, filter);
    const { skip, limit, pagination } = buildPagination(query, total);
    const notifications = await notificationRepository.listInboxNotifications(userId, filter, { skip, limit });

    return {
        items: notifications.map(serializeInboxNotification),
        pagination,
    };
};

export const getInboxNotificationUnreadCount = async (userId) => ({
    unreadCount: await notificationRepository.countUnreadInboxNotifications(userId),
});

export const patchInboxNotification = async (userId, notificationId) => {
    const notification = await notificationRepository.markInboxNotificationRead(userId, notificationId);
    if (!notification) throw new NotFoundError('Notification');
    return serializeInboxNotification(notification);
};

export const patchInboxNotifications = async (userId) => {
    const result = await notificationRepository.markAllInboxNotificationsRead(userId);
    return {
        modifiedCount: result.modifiedCount || 0,
    };
};

export const getInboxNotification = async (userId, notificationId) => {
    const notification = await notificationRepository.findInboxNotificationByIdAndUser(notificationId, userId);
    if (!notification) throw new NotFoundError('Notification');
    return serializeInboxNotification(notification);
};

const inboxNotificationService = {
    listInboxNotifications,
    getInboxNotificationUnreadCount,
    patchInboxNotification,
    patchInboxNotifications,
    getInboxNotification,
};

export default inboxNotificationService;
