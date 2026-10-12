import * as userService from '../services/user.service.js';
import * as mediaService from '../services/media/media.service.js';
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

export const listCustomers = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const result = await userService.listCustomersForAdmin(query);
        return res.status(200).json(ApiResponse.paginated(
            result.items,
            result.pagination,
            'Customers fetched',
        ));
    } catch (err) {
        next(err);
    }
};

export const getCustomerById = async (req, res, next) => {
    try {
        const { id } = getValidatedRequestData(req, 'params');
        const profile = await userService.getCustomerProfileForAdmin(id);
        return res.status(200).json(ApiResponse.success(profile, 'Customer profile fetched'));
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
        const result = await mediaService.updateCustomerProfilePicture(req.user._id, mediaId);
        return res.status(200).json(ApiResponse.success(result, 'Profile picture updated'));
    } catch (err) {
        next(err);
    }
};

export const removeMyPicture = async (req, res, next) => {
    try {
        const result = await mediaService.removeCustomerProfilePicture(req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Profile picture removed'));
    } catch (err) {
        next(err);
    }
};

export const deleteMe = async (req, res, next) => {
    try {
        const result = await userService.deleteCustomerAccount(req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Account deleted successfully'));
    } catch (err) {
        next(err);
    }
};
