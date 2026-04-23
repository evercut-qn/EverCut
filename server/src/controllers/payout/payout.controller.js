import * as payoutService from '../../services/payout.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { getValidatedRequestData } from '../../utils/request-validation.utils.js';

export const retryPayout = async (req, res, next) => {
    try {
        const { payoutId } = getValidatedRequestData(req, 'params');
        const result = await payoutService.retryPayout(payoutId);
        return res.status(200).json(ApiResponse.success(result, 'Payout retry initiated'));
    } catch (error) {
        next(error);
    }
};
