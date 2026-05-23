import * as userService from '../services/user.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { getValidatedRequestData } from '../utils/request-validation.utils.js';

export const getMe = async (req, res, next) => {
    try {
        const profile = await userService.getProfile(req.user._id);
        return res.status(200).json(ApiResponse.success(profile, 'Profile fetched'));
    } catch (err) {
        next(err);
    }
};

export const updateMe = async (req, res, next) => {
    try {
        const body = getValidatedRequestData(req, 'body');
        const updated = await userService.updateProfile(req.user._id, body);
        return res.status(200).json(ApiResponse.success(updated, 'Profile updated'));
    } catch (err) {
        next(err);
    }
};

export const updateMyPicture = async (req, res, next) => {
    try {
        const { mediaId } = getValidatedRequestData(req, 'body');
        const { default: mediaService } = await import('../services/media/media.service.js');
        const result = await mediaService.updateCustomerProfilePicture(req.user._id, mediaId);
        return res.status(200).json(ApiResponse.success(result, 'Profile picture updated'));
    } catch (err) {
        next(err);
    }
};

export const removeMyPicture = async (req, res, next) => {
    try {
        const { default: mediaService } = await import('../services/media/media.service.js');
        const result = await mediaService.removeCustomerProfilePicture(req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Profile picture removed'));
    } catch (err) {
        next(err);
    }
};
