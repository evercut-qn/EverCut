import { Router } from 'express';

import * as bookingController from '../controllers/booking.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import {
    bookingListQuerySchema,
    bookSalonSchema,
    bookingIdParamSchema,
    bookingMilestoneProgressQuerySchema,
    bookingStatusSchema,
    bookingsByStatusQuerySchema,
    reorderSchema,
    rescheduleSchema,
    updateBookingSchema,
    paginationQuerySchema,
} from '../validators/booking.validator.js';

const router = Router();

router.use(authenticate);

// ============================================================================
// Collection Routes (no :id parameter)
// ============================================================================

router.post('/', authorize(ROLES.CUSTOMER), validate(bookSalonSchema, 'body'), bookingController.createBooking);
router.get('/', authorize(ROLES.CUSTOMER, ROLES.BARBER), validate(bookingListQuerySchema, 'query'), bookingController.getBookings);
router.get('/status', authorize(ROLES.BARBER), validate(bookingsByStatusQuerySchema, 'query'), bookingController.getBookingsByStatus);
router.get('/pending-confirmations', authorize(ROLES.BARBER), validate(paginationQuerySchema, 'query'), bookingController.getPendingConfirmations);
router.get('/stats', authorize(ROLES.BARBER), bookingController.getBookingStats);
router.get('/progress', authorize(ROLES.BARBER), validate(bookingMilestoneProgressQuerySchema, 'query'), bookingController.getBookingMilestoneProgress);

// ============================================================================
// Resource Routes (with :id parameter)
// ============================================================================

router.get('/:id', authorize(ROLES.CUSTOMER, ROLES.BARBER), validate(bookingIdParamSchema, 'params'), bookingController.getBookingById);
router.get('/:id/confirmation', authorize(ROLES.CUSTOMER), validate(bookingIdParamSchema, 'params'), bookingController.getBookingConfirmation);
router.put('/:id', authorize(ROLES.CUSTOMER), validate(bookingIdParamSchema, 'params'), validate(updateBookingSchema, 'body'), bookingController.updateBooking);
router.put('/:id/reschedule', authorize(ROLES.CUSTOMER), validate(bookingIdParamSchema, 'params'), validate(rescheduleSchema, 'body'), bookingController.rescheduleBooking);
router.post('/:id/reorder', authorize(ROLES.CUSTOMER), validate(bookingIdParamSchema, 'params'), validate(reorderSchema, 'body'), bookingController.reorderBooking);
router.put('/:id/favorite', authorize(ROLES.CUSTOMER), validate(bookingIdParamSchema, 'params'), bookingController.toggleFavorite);
router.patch('/:id/confirm', authorize(ROLES.BARBER), validate(bookingIdParamSchema, 'params'), bookingController.confirmBookingByBarber);
router.delete('/:id', authorize(ROLES.CUSTOMER, ROLES.BARBER), validate(bookingIdParamSchema, 'params'), bookingController.deleteBooking);
router.put('/:id/status', authorize(ROLES.BARBER), validate(bookingIdParamSchema, 'params'), validate(bookingStatusSchema, 'body'), bookingController.updateBookingStatus);

export default router;
