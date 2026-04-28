import { Router } from 'express';

import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as paymentController from '../controllers/payment.controller.js';
import {
    initiatePaymentSchema,
    paymentIdParamSchema,
} from '../validators/payment.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.post('/webhook', paymentController.handleWebhook);
router.get('/redirect', paymentController.handleRedirect);

router.post(
    '/',
    authenticate,
    authorize(ROLES.CUSTOMER),
    validate(initiatePaymentSchema, 'body'),
    paymentController.initiatePayment,
);

router.get(
    '/:id',
    authenticate,
    validate(paymentIdParamSchema, 'params'),
    paymentController.getPaymentStatus,
);

export default router;
