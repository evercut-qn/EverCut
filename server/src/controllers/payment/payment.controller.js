import * as paymentService from '../../services/payment.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { getValidatedRequestData } from '../../utils/request-validation.utils.js';

export const initiatePayment = async (req, res, next) => {
    try {
        const { bookingId } = getValidatedRequestData(req, 'body');
        const result = await paymentService.initiatePayment(req.user._id, bookingId);
        return res.status(200).json(ApiResponse.success(result, 'Payment initiated'));
    } catch (error) {
        next(error);
    }
};

export const getPaymentStatus = async (req, res, next) => {
    try {
        const { id } = getValidatedRequestData(req, 'params');
        const result = await paymentService.getPaymentStatus(req.user._id, id);
        return res.status(200).json(ApiResponse.success(result, 'Payment status'));
    } catch (error) {
        next(error);
    }
};

export const getPaymentByBooking = async (req, res, next) => {
    try {
        const { bookingId } = getValidatedRequestData(req, 'params');
        const result = await paymentService.getPaymentByBooking(req.user._id, bookingId);
        return res.status(200).json(ApiResponse.success(result, 'Payment details'));
    } catch (error) {
        next(error);
    }
};

export const handleRedirect = async (req, res, next) => {
    try {
        const bookingId = req.query.bookingId || '';
        return res.redirect(`evercut://payment-result?bookingId=${encodeURIComponent(bookingId)}`);
    } catch (error) {
        next(error);
    }
};

export const initiateRefund = async (req, res, next) => {
    try {
        const { bookingId } = getValidatedRequestData(req, 'params');
        const { reason } = getValidatedRequestData(req, 'body');
        const result = await paymentService.initiateRefund(bookingId, reason);
        return res.status(200).json(ApiResponse.success(result, 'Refund initiated'));
    } catch (error) {
        next(error);
    }
};
