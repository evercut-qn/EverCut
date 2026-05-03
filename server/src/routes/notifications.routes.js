import { Router } from 'express';

import * as notificationController from '../controllers/notification.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
    notificationIdParamSchema,
    notificationListQuerySchema,
    registerFcmTokenSchema,
    unregisterFcmTokenSchema,
} from '../validators/notification.validator.js';

const router = Router();

router.use(authenticate);

router.post('/tokens', validate(registerFcmTokenSchema, 'body'), notificationController.registerFcmToken);
router.delete('/tokens', validate(unregisterFcmTokenSchema, 'body'), notificationController.unregisterFcmToken);
router.get('/', validate(notificationListQuerySchema, 'query'), notificationController.listNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllNotificationsRead);
router.patch('/:id/read', validate(notificationIdParamSchema, 'params'), notificationController.markNotificationRead);

export default router;
