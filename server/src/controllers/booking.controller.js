import * as bookingService from '../services/booking.service.js';
import { ForbiddenError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { ROLES } from '../utils/constants.js';
import { getValidatedRequestData } from '../utils/request-validation.utils.js';

const assertSupportedBookingRole = (roleType) => {
    if (![ROLES.CUSTOMER, ROLES.BARBER].includes(roleType)) {
        throw new ForbiddenError('This endpoint is available only to customers and barbers');
    }
};

// ============================================================================
// Customer: Booking Management
// ============================================================================

export const createBooking = async (req, res, next) => {
    try {
        const body = getValidatedRequestData(req, 'body');
        const result = await bookingService.createBooking(req.user._id, body);
        return res.status(201).json(ApiResponse.success(result, 'Booking created'));
    } catch (err) {
        next(err);
    }
};

export const getBookings = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        assertSupportedBookingRole(req.user.roleType);

        if (req.user.roleType === ROLES.CUSTOMER) {
            const result = await bookingService.getCustomerBookings(req.user._id, query);
            return res.status(200).json(ApiResponse.paginated(result.items, result.pagination, 'Bookings fetched'));
        }

        const result = await bookingService.getBookingsByShop(req.user._id, query);
        return res.status(200).json(
            ApiResponse.paginated(
                result.items,
                result.pagination,
                'Bookings fetched',
                {
                    numberOfEmployees: result.numberOfEmployees,
                    numberOfCustomers: result.numberOfCustomers,
                },
            ),
        );
    } catch (err) {
        next(err);
    }
};

export const getBookingById = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const result = await bookingService.getBookingDetailsForUser(params.id, req.user);
        return res.status(200).json(ApiResponse.success(result, 'Booking details fetched'));
    } catch (err) {
        next(err);
    }
};

export const patchBooking = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const body = getValidatedRequestData(req, 'body');

        if (body.status) {
            const result = await bookingService.updateBookingStatus(params.id, req.user, body.status);
            return res.status(200).json(ApiResponse.success(result, 'Booking status updated'));
        }

        const result = await bookingService.updateBookingSchedule(params.id, req.user._id, body);
        return res.status(200).json(ApiResponse.success(result, 'Booking updated'));
    } catch (err) {
        next(err);
    }
};

export const addFavoriteBooking = async (req, res, next) => {
    try {
        const { id } = getValidatedRequestData(req, 'params');
        const result = await bookingService.addFavoriteBooking(req.user._id, id);
        return res.status(200).json(ApiResponse.success(result, 'Booking added to favorites'));
    } catch (err) {
        next(err);
    }
};

export const removeFavoriteBooking = async (req, res, next) => {
    try {
        const { id } = getValidatedRequestData(req, 'params');
        const result = await bookingService.removeFavoriteBooking(req.user._id, id);
        return res.status(200).json(ApiResponse.success(result, 'Booking removed from favorites'));
    } catch (err) {
        next(err);
    }
};

// ============================================================================
// Barber: Booking Management
// ============================================================================

export const getBookingStats = async (req, res, next) => {
    try {
        const stats = await bookingService.getBookingStats(req.user._id);
        return res.status(200).json(ApiResponse.success(stats, 'Booking stats'));
    } catch (err) {
        next(err);
    }
};

export const getBookingMilestoneProgress = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const progress = await bookingService.getBookingMilestoneProgress(req.user._id, query);
        return res.status(200).json(ApiResponse.success(progress, 'Booking milestone progress'));
    } catch (err) {
        next(err);
    }
};

/**
 * Get today's pulse metrics (moved from dashboard)
 */
export const getTodaysPulse = async (req, res, next) => {
    try {
        const pulse = await bookingService.getTodaysPulse(req.user._id);
        return res.status(200).json(ApiResponse.success(pulse, 'Today\'s pulse fetched'));
    } catch (err) {
        next(err);
    }
};

/**
 * Get today's queue (active/upcoming) (moved from dashboard)
 */
export const getTodaysQueue = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const filter = query.filter || 'active';
        const queue = await bookingService.getTodaysQueue(req.user._id, filter);
        return res.status(200).json(ApiResponse.success(queue, 'Today\'s queue fetched'));
    } catch (err) {
        next(err);
    }
};
