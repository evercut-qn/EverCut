import { Router } from 'express';

import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as payoutController from '../controllers/payout/payout.controller.js';
import * as payoutWebhookController from '../controllers/payout/payout-webhook.controller.js';
import { payoutIdParamSchema } from '../validators/payout.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.post('/webhook', payoutWebhookController.handlePayoutWebhook);

router.post(
    '/:payoutId/retry',
    authenticate,
    authorize(ROLES.ADMIN),
    validate(payoutIdParamSchema, 'params'),
    payoutController.retryPayout,
);

export default router;
