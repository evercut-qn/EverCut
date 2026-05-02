import { Router } from 'express';

import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as paymentController from '../controllers/payment.controller.js';
import {
    initiatePaymentSchema,
    paymentIdParamSchema,
    paymentListQuerySchema,
    verifyPaymentSchema,
} from '../validators/payment.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.post('/webhook', paymentController.handleWebhook);

router.get(
    '/',
    authenticate,
    authorize(ROLES.CUSTOMER, ROLES.BARBER, ROLES.ADMIN),
    validate(paymentListQuerySchema, 'query'),
    paymentController.getPayments,
);

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
    authorize(ROLES.CUSTOMER, ROLES.BARBER, ROLES.ADMIN),
    validate(paymentIdParamSchema, 'params'),
    paymentController.getPaymentStatus,
);

export default router;
