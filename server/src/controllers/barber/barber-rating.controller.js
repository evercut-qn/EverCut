import * as ratingService from '../../services/rating.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { getValidatedRequestData } from '../../utils/request-validation.utils.js';

export const getRatings = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const result = await ratingService.getRatingsByShopForBarber(req.user._id, query);
        return res.status(200).json(ApiResponse.paginated(result.items, result.pagination, 'Ratings fetched'));
    } catch (err) {
        next(err);
    }
};

export const addReply = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const { replyText } = getValidatedRequestData(req, 'body');
        const result = await ratingService.addReplyToRating(params.id, replyText, req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Reply added successfully'));
    } catch (err) {
        next(err);
    }
};

export const updateReply = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const { replyText } = getValidatedRequestData(req, 'body');
        const result = await ratingService.updateReplyToRating(params.id, replyText, req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Reply updated successfully'));
    } catch (err) {
        next(err);
    }
};

export const deleteReply = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const result = await ratingService.deleteReplyFromRating(params.id, req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Reply deleted successfully'));
    } catch (err) {
        next(err);
    }
};

export const removeRating = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const result = await ratingService.removeRating(params.id, req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Rating removed'));
    } catch (err) {
        next(err);
    }
};
