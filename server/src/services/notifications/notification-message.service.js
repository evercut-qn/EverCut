import config from '../../config/index.js';
import mediaRepository from '../../repositories/media.repository.js';
import { BadRequestError } from '../../utils/api-error.js';
import { MEDIA_PURPOSE, MEDIA_STATUS, MEDIA_TYPE } from '../../utils/constants.js';
import {
    buildFcmPayload,
    buildNotificationData,
    buildNotificationMessage,
    normalizeFcmData,
    normalizeNotificationData,
    toFcmDataValue,
} from '../../utils/notification-message.utils.js';
import { buildStableMediaUrl } from '../media/media-url.service.js';

const requireStableImageUrl = (imageUrl) => {
    let parsedUrl;
    try {
        parsedUrl = new URL(imageUrl);
    } catch {
        throw new BadRequestError('Notification image must use a valid stable long-lived URL');
    }

    const hasSignedParameter = [...parsedUrl.searchParams.keys()]
        .some((key) => key.toLowerCase() === 'exp' || key.toLowerCase() === 'token');
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || hasSignedParameter) {
        throw new BadRequestError('Notification image must use a valid stable long-lived URL');
    }

    return imageUrl;
};

export const resolveNotificationImageUrl = async ({
    imageUrl = null,
    imageMediaId = null,
} = {}) => {
    if (imageUrl) return requireStableImageUrl(imageUrl);

    if (imageMediaId) {
        const media = await mediaRepository.findById(imageMediaId);
        if (
            !media
            || media.type !== MEDIA_TYPE.IMAGE
            || media.status !== MEDIA_STATUS.READY
            || media.purpose !== MEDIA_PURPOSE.NOTIFICATION
        ) {
            throw new BadRequestError('Notification image must be a ready notification image');
        }

        return buildStableMediaUrl(media.r2Key);
    }

    return buildStableMediaUrl(config.notification.defaultImageR2Key);
};

export {
    buildFcmPayload,
    buildNotificationData,
    buildNotificationMessage,
    normalizeFcmData,
    normalizeNotificationData,
    toFcmDataValue,
};

const notificationMessageService = {
    buildNotificationMessage,
    buildNotificationData,
    buildFcmPayload,
    normalizeNotificationData,
    normalizeFcmData,
    resolveNotificationImageUrl,
    toFcmDataValue,
};

export default notificationMessageService;
