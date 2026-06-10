import notificationTokenService from './notification-token.service.js';
import inboxNotificationService from './inbox-notification.service.js';
import notificationDomainService from './notification-domain.service.js';

export const registerFcmToken = notificationTokenService.registerToken;
export const unregisterFcmToken = notificationTokenService.revokeToken;
export const listNotifications = inboxNotificationService.listInboxNotifications;
export const getNotification = inboxNotificationService.getInboxNotification;
export const getNotificationUnreadCount = inboxNotificationService.getInboxNotificationUnreadCount;
export const patchNotification = inboxNotificationService.patchInboxNotification;
export const patchNotifications = inboxNotificationService.patchInboxNotifications;
export const notifyUser = notificationDomainService.notifyUser;

const notificationService = {
    registerFcmToken,
    unregisterFcmToken,
    listNotifications,
    getNotification,
    getNotificationUnreadCount,
    patchNotification,
    patchNotifications,
    notifyUser,
};

export default notificationService;
