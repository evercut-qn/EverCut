import * as userService from '../services/user.service.js';
import { ApiResponse } from '../utils/api-response.js';

export const getUserSummary = async (_req, res, next) => {
    try {
        const result = await userService.getUserSummary();
        return res.status(200).json(ApiResponse.success(result, 'User summary fetched'));
    } catch (error) {
        next(error);
    }
};
