import * as bookingService from '../../services/booking.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { getValidatedRequestData } from '../../utils/request-validation.utils.js';

export const getBookings = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const result = await bookingService.getBookingsByShop(req.user._id, query);
        return res.status(200).json({
            success: true,
            message: 'Shop bookings fetched',
            data: {
                items: result.items,
                pagination: result.pagination,
                numberOfEmployees: result.numberOfEmployees,
                numberOfCustomers: result.numberOfCustomers,
            }
        });
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

export const deleteBooking = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const result = await bookingService.deleteBookingAfterPayment(params.id, req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Booking deleted'));
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
