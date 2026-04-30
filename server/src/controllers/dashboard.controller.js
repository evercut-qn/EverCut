import * as dashboardService from '../services/dashboard.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { getValidatedRequestData } from '../utils/request-validation.utils.js';

/**
 * Get today's pulse metrics
 */
export const getTodaysPulse = async (req, res, next) => {
    try {
        const pulse = await dashboardService.getTodaysPulse(req.user._id);
        return res.status(200).json(ApiResponse.success(pulse, 'Today\'s pulse fetched'));
    } catch (err) {
        next(err);
    }
};

/**
 * Get staff availability and progress
 */
export const getStaffAvailability = async (req, res, next) => {
    try {
        const staff = await dashboardService.getStaffAvailability(req.user._id);
        return res.status(200).json(ApiResponse.success(staff, 'Staff availability fetched'));
    } catch (err) {
        next(err);
    }
};

/**
 * Get today's queue (active/upcoming)
 */
export const getTodaysQueue = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const filter = query.filter || 'active';
        const queue = await dashboardService.getTodaysQueue(req.user._id, filter);
        return res.status(200).json(ApiResponse.success(queue, 'Today\'s queue fetched'));
    } catch (err) {
        next(err);
    }
};

/**
 * Get comprehensive dashboard overview
 */
export const getDashboardOverview = async (req, res, next) => {
    try {
        const dashboard = await dashboardService.getDashboardOverview(req.user._id);
        return res.status(200).json(ApiResponse.success(dashboard, 'Dashboard overview fetched'));
    } catch (err) {
        next(err);
    }
};
