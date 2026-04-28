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
        const result = await bookingService.bookSalon(req.user._id, body);
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
            const result = await bookingService.getCustomerBookings(req.user._id, query.type, query);
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

        if (req.user.roleType === ROLES.CUSTOMER) {
            const result = await bookingService.getBookingDetails(params.id, req.user._id);
            return res.status(200).json(ApiResponse.success(result, 'Booking details fetched'));
        }

        if (req.user.roleType === ROLES.BARBER) {
            const result = await bookingService.getBookingDetailsForShopOwner(params.id, req.user._id);
            return res.status(200).json(ApiResponse.success(result, 'Booking details fetched'));
        }

        throw new ForbiddenError('This endpoint is available only to customers and barbers');
    } catch (err) {
        next(err);
    }
};

export const getBookingConfirmation = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const result = await bookingService.getBookingConfirmation(params.id, req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Confirmation fetched'));
    } catch (err) {
        next(err);
    }
};

export const updateBooking = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const body = getValidatedRequestData(req, 'body');
        const result = await bookingService.updateBooking(params.id, req.user._id, body);
        return res.status(200).json(ApiResponse.success(result, 'Booking updated'));
    } catch (err) {
        next(err);
    }
};

export const rescheduleBooking = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const { newDate, newTime } = getValidatedRequestData(req, 'body');
        const result = await bookingService.rescheduleBooking(params.id, req.user._id, newDate, newTime);
        return res.status(200).json(ApiResponse.success(result, 'Booking rescheduled'));
    } catch (err) {
        next(err);
    }
};

export const reorderBooking = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const { date, time } = getValidatedRequestData(req, 'body');
        const result = await bookingService.reorderBooking(req.user._id, params.id, date, time);
        return res.status(201).json(ApiResponse.success(result, 'Booking re-ordered'));
    } catch (err) {
        next(err);
    }
};

export const toggleFavorite = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const result = await bookingService.toggleFavorite(req.user._id, params.id);
        return res.status(200).json(ApiResponse.success(result, 'Favorite updated'));
    } catch (err) {
        next(err);
    }
};

export const cancelBooking = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');

        if (req.user.roleType === ROLES.CUSTOMER) {
            const result = await bookingService.cancelBooking(params.id, req.user._id);
            return res.status(200).json(ApiResponse.success(result, 'Booking cancelled'));
        }

        if (req.user.roleType === ROLES.BARBER) {
            const result = await bookingService.cancelBookingByBarber(params.id, req.user._id);
            return res.status(200).json(ApiResponse.success(result, 'Booking cancelled'));
        }

        throw new ForbiddenError('This endpoint is available only to customers and barbers');
    } catch (err) {
        next(err);
    }
};

// ============================================================================
// Barber: Booking Management
// ============================================================================

export const getPendingConfirmations = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const result = await bookingService.getPendingConfirmations(req.user._id, query);
        return res.status(200).json(ApiResponse.paginated(result.items, result.pagination, 'Pending confirmations fetched'));
    } catch (err) {
        next(err);
    }
};

export const confirmBookingByBarber = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const result = await bookingService.confirmBookingByBarber(params.id, req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Booking confirmed'));
    } catch (err) {
        next(err);
    }
};

export const updateBookingStatus = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const { status } = getValidatedRequestData(req, 'body');
        const booking = await bookingService.updateBookingStatus(params.id, status, req.user._id);
        return res.status(200).json(ApiResponse.success(booking, 'Status updated'));
    } catch (err) {
        next(err);
    }
};

export const getBookingsByStatus = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const { status } = query;
        const result = await bookingService.getBookingsByStatusDetailed(req.user._id, status, query);
        return res.status(200).json(ApiResponse.paginated(result.items, result.pagination, `Bookings with status: ${status}`));
    } catch (err) {
        next(err);
    }
};

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
