import { Router } from 'express';

import * as subscriptionController from '../controllers/subscription.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import {
    adminSubscriptionListQuerySchema,
    subscriptionPlanBodySchema,
    subscriptionTransactionQuerySchema,
} from '../validators/subscription.validator.js';

const router = Router();

router.get('/plans', subscriptionController.getPlans);

router.get('/', authenticate, authorize(ROLES.ADMIN), validate(adminSubscriptionListQuerySchema, 'query'), subscriptionController.listSubscriptions);
router.get('/summary', authenticate, authorize(ROLES.ADMIN), subscriptionController.getSubscriptionSummary);
router.get('/me', authenticate, authorize(ROLES.BARBER), subscriptionController.getMySubscription);
router.post('/subscribe', authenticate, authorize(ROLES.BARBER), validate(subscriptionPlanBodySchema, 'body'), subscriptionController.subscribe);
router.post('/upgrade', authenticate, authorize(ROLES.BARBER), validate(subscriptionPlanBodySchema, 'body'), subscriptionController.upgrade);
router.post('/downgrade', authenticate, authorize(ROLES.BARBER), validate(subscriptionPlanBodySchema, 'body'), subscriptionController.downgrade);
router.post('/cancel', authenticate, authorize(ROLES.BARBER), subscriptionController.cancel);
router.get('/transactions', authenticate, authorize(ROLES.BARBER), validate(subscriptionTransactionQuerySchema, 'query'), subscriptionController.getTransactions);

router.post('/webhook', subscriptionController.handleWebhook);

export default router;
