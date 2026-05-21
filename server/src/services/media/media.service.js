import crypto from 'crypto';
import mediaRepository from '../../repositories/media.repository.js';
import barberRepository from '../../repositories/barber.repository.js';
import shopRepository from '../../repositories/shop.repository.js';
import subscriptionRepository from '../../repositories/subscription.repository.js';
import config from '../../config/index.js';
import { BadRequestError, NotFoundError } from '../../utils/api-error.js';
import {
    MEDIA_ENTITY_TYPE,
    MEDIA_PURPOSE,
    MEDIA_STATUS,
    MEDIA_TYPE,
    MIME_TO_EXTENSION,
} from '../../utils/constants.js';
import { getPlanCapabilities, PLAN_IDS } from '../../config/subscription.config.js';
import { serializeMedia, serializeMediaList } from '../../serializers/media.serializer.js';
import logger from '../../utils/logger.js';
import storageProvider from './storage-provider.service.js';
import { buildMediaUrl } from './media-url.service.js';
import { validateContentType, validateFileSize, validateMagicBytes } from './media-validation.service.js';

const resolveMediaType = (contentType) => {
    if (contentType?.startsWith('image/')) return MEDIA_TYPE.IMAGE;
    if (contentType?.startsWith('video/')) return MEDIA_TYPE.VIDEO;
    throw new BadRequestError('Unsupported media content type');
};

const buildR2Key = (purpose, contextId, mediaId, extension) => {
    const safeContext = String(contextId || 'unassigned').replace(/[^a-zA-Z0-9-_]/g, '-');
    const keyMap = {
        [MEDIA_PURPOSE.AVATAR]: `images/avatars/${safeContext}/${mediaId}.${extension}`,
        [MEDIA_PURPOSE.PROFILE]: `images/profiles/${safeContext}/${mediaId}.${extension}`,
        [MEDIA_PURPOSE.COVER]: `images/covers/${safeContext}/${mediaId}.${extension}`,
        [MEDIA_PURPOSE.GALLERY]: `images/gallery/${safeContext}/${mediaId}.${extension}`,
        [MEDIA_PURPOSE.EMPLOYEE]: `images/employees/${safeContext}/${mediaId}.${extension}`,
        [MEDIA_PURPOSE.ONBOARDING]: `images/onboarding/${safeContext}/${mediaId}.${extension}`,
        [MEDIA_PURPOSE.SERVICE]: `images/services/${mediaId}.${extension}`,
        [MEDIA_PURPOSE.VIDEO_RAW]: `videos/raw/${mediaId}.${extension}`,
        [MEDIA_PURPOSE.VIDEO_THUMBNAIL]: `thumbnails/videos/${mediaId}.${extension}`,
    };
    return keyMap[purpose] || `images/misc/${safeContext}/${mediaId}.${extension}`;
};

const resolveBarberForMediaOwner = async (userId) => barberRepository.findByUserId(userId);

const incrementGalleryUploadCounter = async (userId, media) => {
    if (media.purpose !== MEDIA_PURPOSE.GALLERY) {
        return { hiddenBySubscriptionLimit: false };
    }

    const barber = await resolveBarberForMediaOwner(userId);
    if (!barber) {
        return { hiddenBySubscriptionLimit: false };
    }

    const subscription = await subscriptionRepository.findByBarberId(barber._id)
        || await subscriptionRepository.upsertDefaultForBarber(barber._id, 'UPLOAD_ENFORCEMENT');

    const incremented = media.type === MEDIA_TYPE.VIDEO
        ? await subscriptionRepository.incrementVideoCounter(barber._id)
        : await subscriptionRepository.incrementPhotoCounter(barber._id);

    const planId = incremented?.planId || subscription?.planId || PLAN_IDS.BASIC;
    const capabilities = getPlanCapabilities(planId);
    const current = media.type === MEDIA_TYPE.VIDEO
        ? incremented?.totalVideosUploaded || 0
        : incremented?.totalPhotosUploaded || 0;
    const limit = media.type === MEDIA_TYPE.VIDEO
        ? capabilities.maxVideos
        : capabilities.maxPhotos;

    if (current <= limit) {
        return { hiddenBySubscriptionLimit: false };
    }

    logger.warn('Upload counter exceeded subscription limit after increment', {
        mediaId: media._id,
        barberId: barber._id,
        mediaType: media.type,
        current,
        limit,
    });

    await mediaRepository.updateById(media._id, { status: MEDIA_STATUS.HIDDEN });
    return {
        hiddenBySubscriptionLimit: true,
        quota: { current, limit },
    };
};

export const requestUploadUrl = async (userId, { contentType, sizeBytes, purpose }) => {
    const ownerKey = userId.toString();
    const mediaType = resolveMediaType(contentType);
    if (!validateContentType(contentType, mediaType)) {
        throw new BadRequestError('Unsupported media content type');
    }
    if (!validateFileSize(sizeBytes, mediaType)) {
        const limit = mediaType === MEDIA_TYPE.VIDEO ? config.media.maxVideoSize : config.media.maxImageSize;
        throw new BadRequestError(`File size exceeds ${Math.floor(limit / (1024 * 1024))} MB limit`);
    }

    const mediaId = crypto.randomUUID();
    const extension = MIME_TO_EXTENSION[contentType] || 'bin';
    const contextId = ownerKey;
    const r2Key = buildR2Key(purpose, contextId, mediaId, extension);
    const uploadUrl = await storageProvider.generateUploadUrl({
        key: r2Key,
        contentType,
        expiresIn: config.media.presignedUrlTtl,
    });
    const expiresAt = new Date(Date.now() + config.media.presignedUrlTtl * 1000).toISOString();

    const created = await mediaRepository.create({
        _id: mediaId,
        userId: ownerKey,
        type: mediaType,
        status: MEDIA_STATUS.PENDING,
        purpose,
        r2Key,
        r2Bucket: config.r2.bucket,
        contentType,
        declaredSize: sizeBytes,
        entityId: null,
        entityType: null,
        uploadExpiresAt: new Date(Date.now() + config.media.pendingUploadTtlHours * 3600_000),
    });

    logger.info('Presigned media upload issued', {
        mediaId: created._id.toString(),
        userId: ownerKey,
        purpose,
        contentType,
        sizeBytes,
    });

    return {
        mediaId: created._id.toString(),
        uploadUrl,
        r2Key,
        expiresAt,
    };
};

export const confirmUpload = async (userId, mediaId) => {
    const media = await mediaRepository.findByIdAndUser(mediaId, userId, { status: MEDIA_STATUS.PENDING });
    if (!media) throw new NotFoundError('Pending upload');

    let head;
    try {
        head = await storageProvider.headObject(media.r2Key);
    } catch {
        throw new BadRequestError('Upload not found in storage. File may not have been uploaded yet.');
    }

    if (head.ContentType && head.ContentType !== media.contentType) {
        await storageProvider.deleteObject(media.r2Key);
        await mediaRepository.updateById(mediaId, { status: MEDIA_STATUS.FAILED });
        throw new BadRequestError('Content-Type mismatch. Upload rejected.');
    }

    if (media.type === MEDIA_TYPE.IMAGE) {
        const bytes = await storageProvider.getObjectRange(media.r2Key, 0, 15);
        if (!validateMagicBytes(bytes, media.contentType)) {
            await storageProvider.deleteObject(media.r2Key);
            await mediaRepository.updateById(mediaId, { status: MEDIA_STATUS.FAILED });
            throw new BadRequestError('File content does not match declared type. Upload rejected.');
        }
    }

    const updated = await mediaRepository.updateById(mediaId, {
        status: MEDIA_STATUS.READY,
        actualSize: head.ContentLength || media.declaredSize,
        confirmedAt: new Date(),
    });

    const subscriptionResult = await incrementGalleryUploadCounter(userId, {
        ...media,
        ...updated,
        _id: updated._id || media._id,
        type: updated.type || media.type,
        purpose: updated.purpose || media.purpose,
    });

    return {
        mediaId: updated._id.toString(),
        cdnUrl: buildMediaUrl(updated.r2Key),
        r2Key: updated.r2Key,
        contentType: updated.contentType,
        fileSize: updated.actualSize,
        hiddenBySubscriptionLimit: subscriptionResult.hiddenBySubscriptionLimit,
        quota: subscriptionResult.quota,
    };
};

export const getMediaById = async (userId, mediaId) => {
    const media = await mediaRepository.findByIdAndUser(mediaId, userId, { status: { $ne: MEDIA_STATUS.DELETED } });
    if (!media) throw new NotFoundError('Media');
    return serializeMedia(media);
};

export const deleteMedia = async (userId, mediaId) => {
    const existing = await mediaRepository.findByIdAndUser(mediaId, userId, { status: { $ne: MEDIA_STATUS.DELETED } });
    if (!existing) throw new NotFoundError('Media');
    const media = await mediaRepository.softDeleteByIdAndUser(mediaId, userId);
    storageProvider.deleteObject(media.r2Key).catch((err) => {
        logger.warn('Deferred R2 delete failed', { mediaId, error: err.message });
    });

    if (existing.status === MEDIA_STATUS.HIDDEN && existing.purpose === MEDIA_PURPOSE.GALLERY) {
        const barber = await resolveBarberForMediaOwner(userId);
        const subscription = barber
            ? await subscriptionRepository.findByBarberId(barber._id)
            : null;
        if (barber && subscription && existing.entityId) {
            const lifecycle = await import('../subscription/subscription-lifecycle.service.js');
            await lifecycle.default.maybeReactivateOneAfterDelete(
                barber._id,
                existing.entityId,
                existing.type,
                subscription.planId,
            );
        }
    }

    return { message: 'Media deleted' };
};

export const attachGalleryMedia = async (ownerId, mediaIds) => {
    const shop = await shopRepository.findByBarberUserId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        throw new BadRequestError('No media IDs provided');
    }

    const candidateMedia = [];
    for (const mediaId of mediaIds) {
        const media = await mediaRepository.findReadyByIdAndUser(mediaId, ownerId);
        if (!media) throw new BadRequestError(`Media ${mediaId} not found, unconfirmed, or already attached`);
        candidateMedia.push(media);
    }

    const barber = await barberRepository.findByUserId(ownerId);
    if (barber) {
        const subscription = await subscriptionRepository.findByBarberId(barber._id)
            || await subscriptionRepository.upsertDefaultForBarber(barber._id, 'GALLERY_ENFORCEMENT');
        const capabilities = getPlanCapabilities(subscription.planId);
        const newPhotos = candidateMedia.filter((media) => media.type === MEDIA_TYPE.IMAGE).length;
        const newVideos = candidateMedia.filter((media) => media.type === MEDIA_TYPE.VIDEO).length;
        const [activePhotos, activeVideos] = await Promise.all([
            mediaRepository.countActiveGalleryMedia(shop._id, MEDIA_TYPE.IMAGE),
            mediaRepository.countActiveGalleryMedia(shop._id, MEDIA_TYPE.VIDEO),
        ]);

        if (activePhotos + newPhotos > capabilities.maxPhotos) {
            throw new BadRequestError(`Photo gallery limit exceeded. Maximum ${capabilities.maxPhotos} active photos allowed.`);
        }
        if (activeVideos + newVideos > capabilities.maxVideos) {
            throw new BadRequestError(`Video gallery limit exceeded. Maximum ${capabilities.maxVideos} active videos allowed.`);
        }
    }

    const attached = [];
    for (const media of candidateMedia) {
        const attachedMedia = await mediaRepository.attachReadyMedia(media._id, ownerId, {
            entityId: shop._id,
            entityType: MEDIA_ENTITY_TYPE.SHOP,
            purpose: MEDIA_PURPOSE.GALLERY,
        });
        if (!attachedMedia) throw new BadRequestError(`Media ${media._id} not found, unconfirmed, or already attached`);
        attached.push(attachedMedia);
    }

    return serializeMediaList(attached);
};

export const getShopGallery = async (ownerId) => {
    const shop = await shopRepository.findByBarberUserId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const items = await mediaRepository.findByEntity(shop._id, MEDIA_ENTITY_TYPE.SHOP, { purpose: MEDIA_PURPOSE.GALLERY });
    return serializeMediaList(items);
};

export const getGalleryByShopId = async (shopId) => (
    mediaRepository.findByEntity(shopId, MEDIA_ENTITY_TYPE.SHOP, { purpose: MEDIA_PURPOSE.GALLERY })
);

export const getGalleryStats = async (ownerId) => {
    const shop = await shopRepository.findByBarberUserId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');
    return mediaRepository.getStatsByEntity(shop._id, MEDIA_ENTITY_TYPE.SHOP);
};

export const updateShopCover = async (ownerId, mediaId) => {
    if (!mediaId) throw new BadRequestError('No cover media ID provided');
    const shop = await shopRepository.findByBarberUserId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const media = await mediaRepository.findReadyByIdAndUser(mediaId, ownerId);
    if (!media) throw new BadRequestError('Invalid or unconfirmed cover image');

    const oldR2Key = shop.coverR2Key;
    const updated = await shopRepository.updateByBarberUserId(ownerId, { coverR2Key: media.r2Key });
    await mediaRepository.updateById(mediaId, {
        entityId: shop._id,
        entityType: MEDIA_ENTITY_TYPE.SHOP,
        purpose: MEDIA_PURPOSE.COVER,
    });
    if (oldR2Key && oldR2Key !== media.r2Key) {
        storageProvider.deleteObject(oldR2Key).catch(() => {});
    }
    return { coverUrl: buildMediaUrl(updated.coverR2Key) };
};

export const updateBarberProfilePicture = async (ownerId, mediaId) => {
    if (!mediaId) throw new BadRequestError('No profile picture media ID provided');
    const barber = await barberRepository.findByUserId(ownerId);
    if (!barber) throw new NotFoundError('Barber profile');

    const media = await mediaRepository.findReadyByIdAndUser(mediaId, ownerId);
    if (!media) throw new BadRequestError('Invalid or unconfirmed photo');

    const oldR2Key = barber.photoR2Key;
    const updated = await barberRepository.updateByUserId(ownerId, { photoR2Key: media.r2Key });
    await mediaRepository.updateById(mediaId, {
        entityId: barber._id,
        entityType: MEDIA_ENTITY_TYPE.BARBER,
        purpose: MEDIA_PURPOSE.PROFILE,
    });
    if (oldR2Key && oldR2Key !== media.r2Key) {
        storageProvider.deleteObject(oldR2Key).catch(() => {});
    }

    const photoUrl = buildMediaUrl(updated.photoR2Key);
    return { photoUrl, profilePhotoUrl: photoUrl, ownerPhotoUrl: photoUrl };
};

export const resolveMediaForEntity = async (userId, mediaId) => {
    if (!mediaId) return null;
    const media = await mediaRepository.findReadyByIdAndUser(mediaId, userId);
    if (!media) throw new BadRequestError('Invalid or unconfirmed media');
    return media;
};

export const resolveReadyMediaById = async (mediaId) => {
    if (!mediaId) return null;
    const media = await mediaRepository.findById(mediaId);
    if (!media || media.status !== MEDIA_STATUS.READY) {
        throw new BadRequestError('Invalid or unconfirmed media');
    }
    return media;
};

export const linkMediaToEntity = async (mediaId, entityId, entityType, purpose) => {
    if (!mediaId) return null;
    return mediaRepository.updateById(mediaId, { entityId, entityType, purpose });
};

export const deleteObjectByKey = async (r2Key) => storageProvider.deleteObject(r2Key);
