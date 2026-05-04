import { Router } from 'express';

import * as bookingController from '../controllers/booking.controller.js';
import * as paymentController from '../controllers/payment.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import {
    bookingPatchSchema,
    bookingListQuerySchema,
    createBookingSchema,
    bookingIdParamSchema,
    bookingMilestoneProgressQuerySchema,
    queueFilterQuerySchema,
} from '../validators/booking.validator.js';
import { refundSchema } from '../validators/payment.validator.js';

const router = Router();

// ============================================================================
// Authenticated Booking Routes
// ============================================================================

router.use(authenticate);

// ============================================================================
// Collection Routes (no :id parameter)
// ============================================================================

router.post('/', authorize(ROLES.CUSTOMER), validate(createBookingSchema, 'body'), bookingController.createBooking);
router.get('/', authorize(ROLES.CUSTOMER, ROLES.BARBER), validate(bookingListQuerySchema, 'query'), bookingController.getBookings);
router.get('/analytics/summary', authorize(ROLES.BARBER), bookingController.getBookingStats);
router.get('/analytics/milestones', authorize(ROLES.BARBER), validate(bookingMilestoneProgressQuerySchema, 'query'), bookingController.getBookingMilestoneProgress);
router.get('/analytics/today', authorize(ROLES.BARBER), bookingController.getTodaysPulse);
router.get('/analytics/queue', authorize(ROLES.BARBER), validate(queueFilterQuerySchema, 'query'), bookingController.getTodaysQueue);

// ============================================================================
// Resource Routes (with :id parameter)
// ============================================================================

router.get('/:id', authorize(ROLES.CUSTOMER, ROLES.BARBER), validate(bookingIdParamSchema, 'params'), bookingController.getBookingById);
router.patch('/:id', authorize(ROLES.CUSTOMER, ROLES.BARBER), validate(bookingIdParamSchema, 'params'), validate(bookingPatchSchema, 'body'), bookingController.patchBooking);
router.put('/:id/favorite', authorize(ROLES.CUSTOMER), validate(bookingIdParamSchema, 'params'), bookingController.addFavoriteBooking);
router.delete('/:id/favorite', authorize(ROLES.CUSTOMER), validate(bookingIdParamSchema, 'params'), bookingController.removeFavoriteBooking);
router.post('/:id/refunds', authorize(ROLES.ADMIN, ROLES.BARBER), validate(bookingIdParamSchema, 'params'), validate(refundSchema, 'body'), paymentController.initiateRefund);

export default router;
