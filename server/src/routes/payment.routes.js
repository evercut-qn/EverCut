import { Router } from 'express';

import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as paymentController from '../controllers/payment.controller.js';
import {
    bookingIdParamSchema,
    initiatePaymentSchema,
    paymentIdParamSchema,
    refundSchema,
} from '../validators/payment.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.post('/webhook', paymentController.handleWebhook);
router.get('/redirect', paymentController.handleRedirect);

router.post(
    '/initiate',
    authenticate,
    authorize(ROLES.CUSTOMER),
    validate(initiatePaymentSchema, 'body'),
    paymentController.initiatePayment,
);

router.get(
    '/:id/status',
    authenticate,
    validate(paymentIdParamSchema, 'params'),
    paymentController.getPaymentStatus,
);

router.get(
    '/booking/:bookingId',
    authenticate,
    validate(bookingIdParamSchema, 'params'),
    paymentController.getPaymentByBooking,
);

router.post(
    '/:bookingId/refund',
    authenticate,
    authorize(ROLES.ADMIN, ROLES.BARBER),
    validate(bookingIdParamSchema, 'params'),
    validate(refundSchema, 'body'),
    paymentController.initiateRefund,
);

export default router;
