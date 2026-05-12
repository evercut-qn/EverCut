import crypto from 'crypto';
import mediaRepository from '../../repositories/media.repository.js';
import shopRepository from '../../repositories/shop.repository.js';
import config from '../../config/index.js';
import { BadRequestError, NotFoundError } from '../../utils/api-error.js';
import { buildPagination } from '../../utils/pagination.utils.js';
import {
    MEDIA_ENTITY_TYPE,
    MEDIA_PURPOSE,
    MEDIA_STATUS,
    MEDIA_TYPE,
    MIME_TO_EXTENSION,
} from '../../utils/constants.js';
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

export const requestUploadUrl = async (userId, { contentType, sizeBytes, purpose, entityId, originalName }) => {
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
    const contextId = entityId || ownerKey;
    const r2Key = buildR2Key(purpose, contextId, mediaId, extension);
    const uploadUrl = await storageProvider.generateUploadUrl({
        key: r2Key,
        contentType,
        contentLength: sizeBytes,
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
        entityId: entityId || null,
        entityType: null,
        metadata: {
            originalName: originalName || null,
        },
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

    return {
        mediaId: updated._id.toString(),
        cdnUrl: buildMediaUrl(updated.r2Key),
        r2Key: updated.r2Key,
        contentType: updated.contentType,
        fileSize: updated.actualSize,
    };
};

export const getMediaById = async (userId, mediaId) => {
    const media = await mediaRepository.findByIdAndUser(mediaId, userId, { status: { $ne: MEDIA_STATUS.DELETED } });
    if (!media) throw new NotFoundError('Media');
    return serializeMedia(media);
};

export const deleteMedia = async (userId, mediaId) => {
    const media = await mediaRepository.softDeleteByIdAndUser(mediaId, userId);
    if (!media) throw new NotFoundError('Media');
    storageProvider.deleteObject(media.r2Key).catch((err) => {
        logger.warn('Deferred R2 delete failed', { mediaId, error: err.message });
    });
    return { message: 'Media deleted' };
};

export const attachGalleryMedia = async (ownerId, mediaIds, category = 'other', description = '') => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        throw new BadRequestError('No media IDs provided');
    }

    const currentCount = await mediaRepository.countByEntity(shop._id, MEDIA_ENTITY_TYPE.SHOP, { purpose: MEDIA_PURPOSE.GALLERY });
    if (currentCount + mediaIds.length > config.media.maxGalleryPerShop) {
        throw new BadRequestError(`Gallery limit exceeded. Maximum ${config.media.maxGalleryPerShop} items allowed.`);
    }

    const attached = [];
    for (const mediaId of mediaIds) {
        const media = await mediaRepository.attachReadyMedia(mediaId, ownerId, {
            entityId: shop._id,
            entityType: MEDIA_ENTITY_TYPE.SHOP,
            purpose: MEDIA_PURPOSE.GALLERY,
            'metadata.category': category,
            'metadata.description': description,
        });
        if (!media) throw new BadRequestError(`Media ${mediaId} not found, unconfirmed, or already attached`);
        attached.push(media);
    }

    return serializeMediaList(attached);
};

export const getShopGallery = async (ownerId, queryFilters = {}) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const filter = { purpose: MEDIA_PURPOSE.GALLERY };
    if (queryFilters.category && queryFilters.category !== 'all') {
        filter['metadata.category'] = queryFilters.category;
    }

    const total = await mediaRepository.countByEntity(shop._id, MEDIA_ENTITY_TYPE.SHOP, filter);
    const { skip, limit, pagination } = buildPagination(queryFilters, total);
    const items = await mediaRepository.findByEntity(shop._id, MEDIA_ENTITY_TYPE.SHOP, filter, { skip, limit });

    return { items: serializeMediaList(items), pagination };
};

export const getGalleryByShopId = async (shopId) => (
    serializeMediaList(await mediaRepository.findByEntity(shopId, MEDIA_ENTITY_TYPE.SHOP, { purpose: MEDIA_PURPOSE.GALLERY }))
);

export const getGalleryStats = async (ownerId) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');
    return mediaRepository.getStatsByEntity(shop._id, MEDIA_ENTITY_TYPE.SHOP);
};

export const updateShopCover = async (ownerId, mediaId) => {
    if (!mediaId) throw new BadRequestError('No cover media ID provided');
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const media = await mediaRepository.findReadyByIdAndUser(mediaId, ownerId);
    if (!media) throw new BadRequestError('Invalid or unconfirmed cover image');

    const oldR2Key = shop.coverR2Key;
    const updated = await shopRepository.updateByOwnerId(ownerId, { coverR2Key: media.r2Key });
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
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const media = await mediaRepository.findReadyByIdAndUser(mediaId, ownerId);
    if (!media) throw new BadRequestError('Invalid or unconfirmed photo');

    const oldR2Key = shop.ownerPhotoR2Key;
    const updated = await shopRepository.updateByOwnerId(ownerId, { ownerPhotoR2Key: media.r2Key });
    await mediaRepository.updateById(mediaId, {
        entityId: shop._id,
        entityType: MEDIA_ENTITY_TYPE.SHOP,
        purpose: MEDIA_PURPOSE.PROFILE,
    });
    if (oldR2Key && oldR2Key !== media.r2Key) {
        storageProvider.deleteObject(oldR2Key).catch(() => {});
    }

    const photoUrl = buildMediaUrl(updated.ownerPhotoR2Key);
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
