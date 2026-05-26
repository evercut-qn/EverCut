import { Router } from 'express';

import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as payoutController from '../controllers/payout.controller.js';
import {
    createManualPayoutSchema,
    listPayoutsQuerySchema,
    payoutIdParamSchema,
    pendingPayoutsQuerySchema,
    updatePayoutStatusSchema,
} from '../validators/payout.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// Webhook route - public but protected by signature verification in service layer
router.post('/webhook', payoutController.handlePayoutWebhook);

// All other payout routes require authentication
router.use(authenticate);

router.get(
    '/',
    authorize(ROLES.ADMIN),
    validate(listPayoutsQuerySchema, 'query'),
    payoutController.listPayouts,
);

router.post(
    '/',
    authorize(ROLES.ADMIN),
    validate(createManualPayoutSchema, 'body'),
    payoutController.createManualPayout,
);

router.get(
    '/pending',
    authorize(ROLES.ADMIN),
    validate(pendingPayoutsQuerySchema, 'query'),
    payoutController.getPendingPayouts,
);

router.get(
    '/:payoutId',
    authorize(ROLES.ADMIN),
    validate(payoutIdParamSchema, 'params'),
    payoutController.getPayoutDetail,
);

router.patch(
    '/:payoutId',
    authorize(ROLES.ADMIN),
    validate(payoutIdParamSchema, 'params'),
    validate(updatePayoutStatusSchema, 'body'),
    payoutController.updatePayout,
);

router.post(
    '/:payoutId/retry',
    authorize(ROLES.ADMIN),
    validate(payoutIdParamSchema, 'params'),
    payoutController.retryPayout,
);

export default router;
