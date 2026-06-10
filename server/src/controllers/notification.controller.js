import notificationService from '../services/notifications/notification.service.js';
import notificationBroadcastService from '../services/notifications/notification-broadcast.service.js';
import notificationDispatchService from '../services/notifications/notification-dispatch.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { getValidatedRequestData } from '../utils/request-validation.utils.js';
import logger from '../utils/logger.js';

export const registerFcmToken = async (req, res, next) => {
    try {
        const body = getValidatedRequestData(req, 'body');
        const token = await notificationService.registerFcmToken(req.user._id, body);
        return res.status(200).json(ApiResponse.success(token, 'FCM token registered'));
    } catch (err) {
        next(err);
    }
};

export const unregisterFcmToken = async (req, res, next) => {
    try {
        const { token } = getValidatedRequestData(req, 'params');
        const result = await notificationService.unregisterFcmToken(req.user._id, token);
        return res.status(200).json(ApiResponse.success(result, 'FCM token unregistered'));
    } catch (err) {
        next(err);
    }
};

// ── User Inbox Handlers ──────────────────────────────────────────────
export const listInboxNotifications = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const result = await notificationService.listNotifications(req.user._id, query);
        return res.status(200).json(ApiResponse.paginated(
            result.items,
            result.pagination,
            'Inbox notifications fetched',
        ));
    } catch (err) {
        next(err);
    }
};

export const getInboxUnreadCount = async (req, res, next) => {
    try {
        const result = await notificationService.getNotificationUnreadCount(req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Inbox unread count fetched'));
    } catch (err) {
        next(err);
    }
};

export const markAllInboxRead = async (req, res, next) => {
    try {
        const result = await notificationService.patchNotifications(req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'All inbox notifications marked as read'));
    } catch (err) {
        next(err);
    }
};

export const getInboxNotification = async (req, res, next) => {
    try {
        const { id } = getValidatedRequestData(req, 'params');
        const result = await notificationService.getNotification(req.user._id, id);
        return res.status(200).json(ApiResponse.success(result, 'Inbox notification fetched'));
    } catch (err) {
        next(err);
    }
};

export const markInboxRead = async (req, res, next) => {
    try {
        const { id } = getValidatedRequestData(req, 'params');
        const result = await notificationService.patchNotification(req.user._id, id);
        return res.status(200).json(ApiResponse.success(result, 'Inbox notification marked as read'));
    } catch (err) {
        next(err);
    }
};

// ── Admin Broadcast Handlers ─────────────────────────────────────────
export const listBroadcasts = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const result = await notificationBroadcastService.listNotifications(query);
        return res.status(200).json(ApiResponse.paginated(
            result.items,
            result.pagination,
            'Broadcasts fetched',
        ));
    } catch (err) {
        next(err);
    }
};

export const createBroadcast = async (req, res, next) => {
    try {
        const body = getValidatedRequestData(req, 'body');
        const notification = await notificationBroadcastService.createNotification({
            actorUserId: req.user._id,
            body,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });

        res.status(201).json(ApiResponse.success(notification, 'Broadcast created. Dispatch is in progress.'));

        setImmediate(() => {
            notificationDispatchService.sendNotification(notification.id, {
                actorUserId: req.user._id,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            }).catch((err) => {
                logger.error('Broadcast dispatch failed', {
                    notificationId: notification.id,
                    error: err.message,
                });
            });
        });
    } catch (err) {
        next(err);
    }
};

export const getBroadcast = async (req, res, next) => {
    try {
        const { id } = getValidatedRequestData(req, 'params');
        const result = await notificationBroadcastService.getNotification(id);
        return res.status(200).json(ApiResponse.success(result, 'Broadcast fetched'));
    } catch (err) {
        next(err);
    }
};

export const listBroadcastRecipients = async (req, res, next) => {
    try {
        const { id } = getValidatedRequestData(req, 'params');
        const query = getValidatedRequestData(req, 'query');
        const result = await notificationBroadcastService.listNotificationRecipients(id, query);
        return res.status(200).json(ApiResponse.paginated(
            result.items,
            result.pagination,
            'Broadcast recipients fetched',
        ));
    } catch (err) {
        next(err);
    }
};

export const listBroadcastInboxItems = async (req, res, next) => {
    try {
        const { id } = getValidatedRequestData(req, 'params');
        const query = getValidatedRequestData(req, 'query');
        const result = await notificationBroadcastService.listInboxNotifications(id, query);
        return res.status(200).json(ApiResponse.paginated(
            result.items,
            result.pagination,
            'Broadcast inbox items fetched',
        ));
    } catch (err) {
        next(err);
    }
};

export const listBroadcastAuditLogs = async (req, res, next) => {
    try {
        const { id } = getValidatedRequestData(req, 'params');
        const query = getValidatedRequestData(req, 'query');
        const result = await notificationBroadcastService.listNotificationAuditLogs(id, query);
        return res.status(200).json(ApiResponse.paginated(
            result.items,
            result.pagination,
            'Broadcast audit logs fetched',
        ));
    } catch (err) {
        next(err);
    }
};


