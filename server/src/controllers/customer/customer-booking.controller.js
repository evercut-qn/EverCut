import * as bookingService from '../../services/booking.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { getValidatedRequestData } from '../../utils/request-validation.utils.js';

export const bookSalon = async (req, res, next) => {
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
        const { type } = query;
        const result = await bookingService.getCustomerBookings(req.user._id, type, query);
        return res.status(200).json(ApiResponse.paginated(result.items, result.pagination, 'Bookings fetched'));
    } catch (err) {
        next(err);
    }
};

export const getBookingDetails = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const result = await bookingService.getBookingDetails(params.id, req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Booking details fetched'));
    } catch (err) {
        next(err);
    }
};

export const cancelBooking = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const result = await bookingService.cancelBooking(params.id, req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Booking cancelled'));
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

export const deleteServiceFromBooking = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const result = await bookingService.deleteServiceFromBooking(params.id, req.user._id, params.serviceId);
        return res.status(200).json(ApiResponse.success(result, 'Service removed from booking'));
    } catch (err) {
        next(err);
    }
};

export const getEmployeeCalendar = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const query = getValidatedRequestData(req, 'query');
        const result = await bookingService.getEmployeeCalendar(params.id, query.date);
        return res.status(200).json(ApiResponse.success(result, 'Calendar fetched'));
    } catch (err) {
        next(err);
    }
};
