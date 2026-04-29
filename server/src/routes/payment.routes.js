import { Router } from 'express';

import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as paymentController from '../controllers/payment.controller.js';
import {
    initiatePaymentSchema,
    paymentIdParamSchema,
    verifyPaymentSchema,
} from '../validators/payment.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.post('/webhook', paymentController.handleWebhook);

router.post(
    '/',
    authenticate,
    authorize(ROLES.CUSTOMER),
    validate(initiatePaymentSchema, 'body'),
    paymentController.initiatePayment,
);

router.post(
    '/:id/verify',
    authenticate,
    authorize(ROLES.CUSTOMER),
    validate(paymentIdParamSchema, 'params'),
    validate(verifyPaymentSchema, 'body'),
    paymentController.verifyPayment,
);

router.get(
    '/:id',
    authenticate,
    validate(paymentIdParamSchema, 'params'),
    paymentController.getPaymentStatus,
);

export default router;
