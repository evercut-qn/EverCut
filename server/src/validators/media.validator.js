import Joi from 'joi';
import config from '../config/index.js';
import {
    ALL_MEDIA_PURPOSES,
} from '../utils/constants.js';

export const uploadUrlSchema = Joi.object({
    contentType: Joi.string()
        .valid(...config.media.allowedImageMimes, ...config.media.allowedVideoMimes)
        .required()
        .messages({ 'any.only': 'Unsupported content type' }),
    sizeBytes: Joi.number()
        .integer()
        .positive()
        .max(config.media.maxVideoSize)
        .required(),
    purpose: Joi.string()
        .valid(...ALL_MEDIA_PURPOSES)
        .required(),
});

export const confirmUploadSchema = Joi.object({
    mediaId: Joi.string().required(),
});

export const attachGallerySchema = Joi.object({
    mediaIds: Joi.array()
        .items(Joi.string().required())
        .min(1)
        .max(config.media.maxFiles)
        .required(),
});

export const mediaIdBodySchema = Joi.object({
    mediaId: Joi.string().required(),
});

export const mediaIdParamSchema = Joi.object({
    id: Joi.string().required(),
});
