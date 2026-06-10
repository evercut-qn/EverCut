import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import {
    registerFcmTokenSchema,
    unregisterFcmTokenSchema,
    notificationListQuerySchema,
    notificationIdParamSchema,
    notificationPatchSchema,
    adminNotificationCreateSchema,
    adminNotificationListQuerySchema,
    notificationRecipientListQuerySchema,
    notificationAuditLogListQuerySchema,
} from '../validators/notification.validator.js';

const router = Router();
router.use(authenticate);

// ── Token Management ───────────────────────────────────────────────
router.post('/tokens', validate(registerFcmTokenSchema, 'body'), notificationController.registerFcmToken);
router.delete('/tokens/:token', validate(unregisterFcmTokenSchema, 'params'), notificationController.unregisterFcmToken);

// ── User Inbox ─────────────────────────────────────────────────────
router.get('/inbox', authorize(ROLES.CUSTOMER, ROLES.BARBER), validate(notificationListQuerySchema, 'query'), notificationController.listInboxNotifications);
router.get('/inbox/unread-count', authorize(ROLES.CUSTOMER, ROLES.BARBER), notificationController.getInboxUnreadCount);
router.patch('/inbox', authorize(ROLES.CUSTOMER, ROLES.BARBER), validate(notificationPatchSchema, 'body'), notificationController.markAllInboxRead);
router.get('/inbox/:id', authorize(ROLES.CUSTOMER, ROLES.BARBER), validate(notificationIdParamSchema, 'params'), notificationController.getInboxNotification);
router.patch('/inbox/:id', authorize(ROLES.CUSTOMER, ROLES.BARBER), validate(notificationIdParamSchema, 'params'), validate(notificationPatchSchema, 'body'), notificationController.markInboxRead);

// ── Admin Broadcasts ───────────────────────────────────────────────
router.get('/broadcasts', authorize(ROLES.ADMIN), validate(adminNotificationListQuerySchema, 'query'), notificationController.listBroadcasts);
router.post('/broadcasts', authorize(ROLES.ADMIN), validate(adminNotificationCreateSchema, 'body'), notificationController.createBroadcast);
router.get('/broadcasts/:id', authorize(ROLES.ADMIN), validate(notificationIdParamSchema, 'params'), notificationController.getBroadcast);
router.get('/broadcasts/:id/recipients', authorize(ROLES.ADMIN), validate(notificationIdParamSchema, 'params'), validate(notificationRecipientListQuerySchema, 'query'), notificationController.listBroadcastRecipients);
router.get('/broadcasts/:id/inbox-items', authorize(ROLES.ADMIN), validate(notificationIdParamSchema, 'params'), validate(notificationListQuerySchema, 'query'), notificationController.listBroadcastInboxItems);
router.get('/broadcasts/:id/audits', authorize(ROLES.ADMIN), validate(notificationIdParamSchema, 'params'), validate(notificationAuditLogListQuerySchema, 'query'), notificationController.listBroadcastAuditLogs);

export default router;
