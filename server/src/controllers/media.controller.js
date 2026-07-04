import * as mediaService from '../services/media/media.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { getValidatedRequestData } from '../utils/request-validation.utils.js';

export const requestUploadUrl = async (req, res, next) => {
    try {
        const body = getValidatedRequestData(req, 'body');
        const result = await mediaService.requestUploadUrl(
            req.user._id,
            body,
            { roleType: req.user.roleType },
        );
        return res.status(201).json(ApiResponse.success(result, 'Upload URL generated'));
    } catch (err) {
        next(err);
    }
};

export const requestOnboardingUploadUrl = async (req, res, next) => {
    try {
        const body = getValidatedRequestData(req, 'body');
        const result = await mediaService.requestUploadUrl(req.onboardingContext.phoneNumber, body);
        return res.status(201).json(ApiResponse.success(result, 'Upload URL generated'));
    } catch (err) {
        next(err);
    }
};

export const confirmUpload = async (req, res, next) => {
    try {
        const { mediaId } = getValidatedRequestData(req, 'body');
        const result = await mediaService.confirmUpload(req.user._id, mediaId);
        return res.status(200).json(ApiResponse.success(result, 'Upload confirmed'));
    } catch (err) {
        next(err);
    }
};

export const confirmOnboardingUpload = async (req, res, next) => {
    try {
        const { mediaId } = getValidatedRequestData(req, 'body');
        const result = await mediaService.confirmUpload(req.onboardingContext.phoneNumber, mediaId);
        return res.status(200).json(ApiResponse.success(result, 'Upload confirmed'));
    } catch (err) {
        next(err);
    }
};

export const getMedia = async (req, res, next) => {
    try {
        const { id } = getValidatedRequestData(req, 'params');
        const result = await mediaService.getMediaById(req.user._id, id);
        return res.status(200).json(ApiResponse.success(result, 'Media fetched'));
    } catch (err) {
        next(err);
    }
};

export const deleteMedia = async (req, res, next) => {
    try {
        const { id } = getValidatedRequestData(req, 'params');
        const result = await mediaService.deleteMedia(req.user._id, id);
        return res.status(200).json(ApiResponse.success(result, 'Media deleted'));
    } catch (err) {
        next(err);
    }
};

export const attachGallery = async (req, res, next) => {
    try {
        const { mediaIds } = getValidatedRequestData(req, 'body');
        const result = await mediaService.attachGalleryMedia(req.user._id, mediaIds);
        return res.status(201).json(ApiResponse.success(result, 'Gallery media attached'));
    } catch (err) {
        next(err);
    }
};

export const getGallery = async (req, res, next) => {
    try {
        const result = await mediaService.getShopGallery(req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Gallery fetched'));
    } catch (err) {
        next(err);
    }
};

export const getGalleryUsage = async (req, res, next) => {
    try {
        const result = await mediaService.getGalleryUsage(req.user._id);
        return res.status(200).json(ApiResponse.success(result, 'Gallery usage fetched'));
    } catch (err) {
        next(err);
    }
};
