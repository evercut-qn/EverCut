
## 7. Implementation Guide — R2 Configuration

### 7.1 R2 Client Setup

```javascript
// config/r2.config.js — NEW FILE
import { S3Client } from '@aws-sdk/client-s3';
import config from './index.js';

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
    },
});

export default r2Client;
```

### 7.2 Config Module Update

```diff
// config/index.js — REMOVE cloudinary block, ADD r2 block

-cloudinary: Object.freeze({
-    cloudName: requireEnv('CLOUDINARY_CLOUD_NAME'),
-    apiKey: requireEnv('CLOUDINARY_API_KEY'),
-    apiSecret: requireEnv('CLOUDINARY_API_SECRET'),
-}),

+r2: Object.freeze({
+    accountId: requireEnv('CF_ACCOUNT_ID'),
+    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
+    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
+    bucket: requireEnv('R2_BUCKET'),
+    cdnBaseUrl: requireEnv('CDN_BASE_URL'),
+    mediaTokenSecret: requireEnv('MEDIA_TOKEN_SECRET'),
+}),
```

---

## 8. Implementation Guide — Storage Provider

```javascript
// services/media/storage-provider.service.js — NEW FILE
import {
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import r2Client from '../../config/r2.config.js';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

class StorageProvider {
    constructor() {
        this.client = r2Client;
        this.bucket = config.r2.bucket;
    }

    // ── Presigned URL Generation ─────────────────────────────────────────

    /**
     * Generate a presigned PUT URL for direct client upload.
     * ContentType and ContentLength are locked into the signature.
     */
    async generatePresignedPutUrl(key, contentType, contentLength, expiresIn = 900) {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
            ContentLength: contentLength,
        });

        const url = await getSignedUrl(this.client, command, { expiresIn });
        return { url, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
    }

    // ── Object Operations ────────────────────────────────────────────────

    /**
     * Verify an object exists and return its metadata (size, content-type, etag).
     */
    async headObject(key) {
        const command = new HeadObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        return this.client.send(command);
    }

    /**
     * Download a byte range from an object (for magic byte validation).
     */
    async getObjectRange(key, start, end) {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Range: `bytes=${start}-${end}`,
        });
        const response = await this.client.send(command);
        return Buffer.from(await response.Body.transformToByteArray());
    }

    /**
     * Delete an object from R2. Non-fatal — logs warning on failure.
     */
    async deleteObject(key) {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        try {
            await this.client.send(command);
            logger.info('R2 object deleted', { key });
        } catch (err) {
            logger.warn('R2 delete failed (non-fatal)', { key, error: err.message });
        }
    }

    /**
     * Upload a buffer directly from the backend (used by migration script only).
     */
    async putObject(key, buffer, contentType) {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        });
        return this.client.send(command);
    }

    // ── Multipart Upload Operations ──────────────────────────────────────

    async createMultipartUpload(key, contentType) {
        const command = new CreateMultipartUploadCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });
        const response = await this.client.send(command);
        return response.UploadId;
    }

    async generatePresignedPartUrl(key, uploadId, partNumber, expiresIn = 900) {
        const command = new UploadPartCommand({
            Bucket: this.bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
        });
        const url = await getSignedUrl(this.client, command, { expiresIn });
        return { url, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
    }

    async completeMultipartUpload(key, uploadId, parts) {
        const command = new CompleteMultipartUploadCommand({
            Bucket: this.bucket,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: parts.map((p) => ({
                    PartNumber: p.partNumber,
                    ETag: p.etag,
                })),
            },
        });
        return this.client.send(command);
    }

    async abortMultipartUpload(key, uploadId) {
        const command = new AbortMultipartUploadCommand({
            Bucket: this.bucket,
            Key: key,
            UploadId: uploadId,
        });
        try {
            await this.client.send(command);
            logger.info('Multipart upload aborted', { key, uploadId });
        } catch (err) {
            logger.warn('Multipart abort failed (non-fatal)', { key, error: err.message });
        }
    }
}

export default new StorageProvider();
```

---

## 9. Implementation Guide — Media Validation Service

```javascript
// services/media/media-validation.service.js — NEW FILE
import { ALLOWED_IMAGE_MIMES, ALLOWED_VIDEO_MIMES, MEDIA_LIMITS } from '../../utils/constants.js';

/**
 * Magic byte signatures for file type verification.
 * Used to validate that uploaded file content matches declared MIME type.
 */
const MAGIC_SIGNATURES = Object.freeze({
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png':  [[0x89, 0x50, 0x4E, 0x47]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]],   // RIFF header
    'image/gif':  [[0x47, 0x49, 0x46, 0x38]],
    'video/mp4':  [[0x66, 0x74, 0x79, 0x70]],    // ftyp at offset 4
    'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]],   // EBML header
});

/**
 * Validate content type against allowlist for the given media type.
 */
export const validateContentType = (contentType, mediaType) => {
    const allowlist = mediaType === 'video' ? ALLOWED_VIDEO_MIMES : ALLOWED_IMAGE_MIMES;
    return allowlist.includes(contentType);
};

/**
 * Validate file size against limits for the given media type.
 */
export const validateFileSize = (sizeBytes, mediaType) => {
    const limit = mediaType === 'video' ? MEDIA_LIMITS.MAX_VIDEO_SIZE : MEDIA_LIMITS.MAX_IMAGE_SIZE;
    return sizeBytes > 0 && sizeBytes <= limit;
};

/**
 * Validate magic bytes match declared content type.
 * @param {Buffer} bytes — First 16 bytes of uploaded file
 * @param {string} declaredContentType
 * @returns {boolean}
 */
export const validateMagicBytes = (bytes, declaredContentType) => {
    const signatures = MAGIC_SIGNATURES[declaredContentType];
    if (!signatures) return false;

    // MP4 has 'ftyp' at byte offset 4 (first 4 bytes are the box size)
    if (declaredContentType === 'video/mp4') {
        const ftypSignature = [0x66, 0x74, 0x79, 0x70];
        return ftypSignature.every((byte, i) => bytes[4 + i] === byte);
    }

    return signatures.some((sig) =>
        sig.every((byte, i) => bytes[i] === byte),
    );
};
```

---

## 10. Implementation Guide — Media URL Service

```javascript
// services/media/media-url.service.js — NEW FILE
import crypto from 'crypto';
import config from '../../config/index.js';

const CDN_BASE = config.r2.cdnBaseUrl;
const TOKEN_SECRET = config.r2.mediaTokenSecret;

/**
 * Construct a CDN-deliverable URL from an R2 object key.
 * This is the ONLY place in the codebase that constructs media URLs.
 *
 * Phase 1 (no Worker): returns simple CDN URL.
 * Phase 2 (Worker deployed): use buildAuthenticatedMediaUrl() instead.
 */
export const buildMediaUrl = (r2Key) => {
    if (!r2Key) return null;
    return `${CDN_BASE}/${r2Key}`;
};

/**
 * Build a CDN URL with an HMAC media token for authenticated delivery.
 * Use this when the Cloudflare Worker is deployed for edge authentication.
 */
export const buildAuthenticatedMediaUrl = (r2Key, { userId, resourceType = 'image', ttlSeconds = 3600 } = {}) => {
    if (!r2Key) return null;

    const payload = {
        sub: userId,
        rtype: resourceType,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    };

    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto
        .createHmac('sha256', TOKEN_SECRET)
        .update(encoded)
        .digest('base64url');

    const token = `${encoded}.${sig}`;
    return {
        url: `${CDN_BASE}/${r2Key}?token=${token}`,
        token,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    };
};

/**
 * Backward-compatible helper used by serializers during migration.
 * Converts an R2 key to a full CDN URL for API responses.
 */
export const r2KeyToUrl = (r2Key) => buildMediaUrl(r2Key);
```

---

## 11. Implementation Guide — Media Service (Core)

This is the central orchestration service. It replaces **both** `photo.service.js` (gallery CRUD + cover update) and the upload infrastructure.

```javascript
// services/media/media.service.js — NEW FILE
import { v4 as uuidv4 } from 'uuid';
import Media from '../../models/media.model.js';
import shopRepository from '../../repositories/shop.repository.js';
import storageProvider from './storage-provider.service.js';
import { validateContentType, validateFileSize, validateMagicBytes } from './media-validation.service.js';
import { buildMediaUrl } from './media-url.service.js';
import { serializeMedia, serializeMediaList } from '../../serializers/media.serializer.js';
import { buildPagination } from '../../utils/pagination.utils.js';
import config from '../../config/index.js';
import { BadRequestError, NotFoundError } from '../../utils/api-error.js';
import {
    MEDIA_LIMITS,
    MEDIA_STATUS,
    MEDIA_TYPE,
    MIME_TO_EXTENSION,
} from '../../utils/constants.js';
import logger from '../../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const resolveMediaType = (contentType) => {
    if (contentType.startsWith('image/')) return MEDIA_TYPE.IMAGE;
    if (contentType.startsWith('video/')) return MEDIA_TYPE.VIDEO;
    throw new BadRequestError(`Unsupported content type: ${contentType}`);
};

const buildR2Key = (purpose, contextId, uuid, extension) => {
    const keyMap = {
        avatar:          `images/avatars/${contextId}/${uuid}.${extension}`,
        profile:         `images/profiles/${contextId}/${uuid}.${extension}`,
        cover:           `images/covers/${contextId}/${uuid}.${extension}`,
        gallery:         `images/gallery/${contextId}/${uuid}.${extension}`,
        employee:        `images/employees/${contextId}/${uuid}.${extension}`,
        onboarding:      `images/onboarding/${contextId}/${uuid}.${extension}`,
        service:         `images/services/${uuid}.${extension}`,
        video_raw:       `videos/raw/${uuid}.${extension}`,
        video_thumbnail: `thumbnails/videos/${uuid}.${extension}`,
    };
    return keyMap[purpose] || `images/misc/${contextId}/${uuid}.${extension}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Step 1: Generate a presigned upload URL.
 */
export const requestUploadUrl = async (userId, { contentType, sizeBytes, purpose, entityId }) => {
    const mediaType = resolveMediaType(contentType);

    if (!validateContentType(contentType, mediaType)) {
        throw new BadRequestError(`Content type not allowed: ${contentType}`);
    }
    if (!validateFileSize(sizeBytes, mediaType)) {
        const limitMB = (mediaType === 'video'
            ? MEDIA_LIMITS.MAX_VIDEO_SIZE
            : MEDIA_LIMITS.MAX_IMAGE_SIZE) / (1024 * 1024);
        throw new BadRequestError(`File size exceeds ${limitMB} MB limit`);
    }

    const mediaId = uuidv4();
    const extension = MIME_TO_EXTENSION[contentType] || 'bin';
    const contextId = entityId || userId.toString();
    const r2Key = buildR2Key(purpose, contextId, mediaId, extension);

    const { url: uploadUrl, expiresAt } = await storageProvider.generatePresignedPutUrl(
        r2Key,
        contentType,
        sizeBytes,
        MEDIA_LIMITS.PRESIGNED_URL_TTL,
    );

    await Media.create({
        _id: mediaId,
        userId,
        type: mediaType,
        status: MEDIA_STATUS.PENDING,
        purpose,
        r2Key,
        r2Bucket: config.r2.bucket,
        contentType,
        declaredSize: sizeBytes,
        entityId: entityId || null,
        entityType: null,
        uploadExpiresAt: new Date(Date.now() + MEDIA_LIMITS.PENDING_UPLOAD_TTL_HOURS * 3600_000),
    });

    logger.info('Presigned upload URL issued', {
        mediaId,
        userId: userId.toString(),
        purpose,
        contentType,
        sizeBytes,
    });

    return { mediaId, uploadUrl, r2Key, expiresAt };
};

/**
 * Step 2: Confirm an upload after the client PUT completes.
 */
export const confirmUpload = async (userId, mediaId) => {
    const media = await Media.findOne({
        _id: mediaId,
        userId,
        status: MEDIA_STATUS.PENDING,
    });

    if (!media) {
        throw new NotFoundError('Pending upload not found or does not belong to user');
    }

    // Verify the object actually exists in R2
    let head;
    try {
        head = await storageProvider.headObject(media.r2Key);
    } catch (err) {
        throw new BadRequestError('Upload not found in storage. File may not have been uploaded yet.');
    }

    // Verify content type matches what was declared
    if (head.ContentType && head.ContentType !== media.contentType) {
        await storageProvider.deleteObject(media.r2Key);
        await Media.findByIdAndUpdate(mediaId, { status: MEDIA_STATUS.FAILED });
        throw new BadRequestError('Content-Type mismatch — upload rejected');
    }

    // Magic byte validation for images
    if (media.type === MEDIA_TYPE.IMAGE) {
        const magicBytes = await storageProvider.getObjectRange(media.r2Key, 0, 15);
        if (!validateMagicBytes(magicBytes, media.contentType)) {
            await storageProvider.deleteObject(media.r2Key);
            await Media.findByIdAndUpdate(mediaId, { status: MEDIA_STATUS.FAILED });
            throw new BadRequestError('File content does not match declared type — upload rejected');
        }
    }

    // Update to ready
    media.status = MEDIA_STATUS.READY;
    media.actualSize = head.ContentLength;
    media.confirmedAt = new Date();
    await media.save();

    logger.info('Upload confirmed', { mediaId, r2Key: media.r2Key, actualSize: head.ContentLength });

    return {
        mediaId: media._id,
        cdnUrl: buildMediaUrl(media.r2Key),
        r2Key: media.r2Key,
        contentType: media.contentType,
        fileSize: head.ContentLength,
    };
};

// ═══════════════════════════════════════════════════════════════════════════
// MEDIA CRUD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get media metadata by ID (with ownership check).
 */
export const getMediaById = async (userId, mediaId) => {
    const media = await Media.findOne({
        _id: mediaId,
        userId,
        status: { $ne: MEDIA_STATUS.DELETED },
    });
    if (!media) throw new NotFoundError('Media not found');
    return serializeMedia(media);
};

/**
 * Soft-delete a media item and remove from R2.
 */
export const deleteMedia = async (userId, mediaId) => {
    const media = await Media.findOne({ _id: mediaId, userId });
    if (!media) throw new NotFoundError('Media not found');

    if (media.status !== MEDIA_STATUS.DELETED) {
        media.status = MEDIA_STATUS.DELETED;
        await media.save();
    }

    // Delete from R2 (non-blocking, non-fatal)
    storageProvider.deleteObject(media.r2Key).catch((err) => {
        logger.warn('Deferred R2 delete failed', { mediaId, error: err.message });
    });

    return { message: 'Media deleted' };
};

// ═══════════════════════════════════════════════════════════════════════════
// GALLERY OPERATIONS (replaces photo.service.js)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Attach confirmed media items to a shop gallery.
 * Replaces: photo.service.uploadPhotos()
 */
export const attachGalleryMedia = async (ownerId, mediaIds, category = 'other', description = '') => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    if (!mediaIds || mediaIds.length === 0) {
        throw new BadRequestError('No media IDs provided');
    }

    const currentCount = await Media.countByEntity(shop._id, 'Shop', { purpose: 'gallery' });
    if (currentCount + mediaIds.length > MEDIA_LIMITS.MAX_GALLERY_PER_SHOP) {
        throw new BadRequestError(
            `Gallery limit exceeded. Maximum ${MEDIA_LIMITS.MAX_GALLERY_PER_SHOP} items allowed.`,
        );
    }

    const attached = [];
    for (const mediaId of mediaIds) {
        const media = await Media.findOneAndUpdate(
            {
                _id: mediaId,
                userId: ownerId,
                status: MEDIA_STATUS.READY,
                entityId: null, // Not yet attached to any entity
            },
            {
                entityId: shop._id,
                entityType: 'Shop',
                purpose: 'gallery',
                'metadata.category': category,
                'metadata.description': description,
            },
            { new: true },
        );
        if (!media) {
            throw new BadRequestError(`Media ${mediaId} not found, unconfirmed, or already attached`);
        }
        attached.push(media);
    }

    return serializeMediaList(attached);
};

/**
 * Get gallery media for the current barber's shop.
 * Replaces: photo.service.getPhotos()
 */
export const getShopGallery = async (ownerId, queryFilters = {}) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const filter = {
        entityId: shop._id,
        entityType: 'Shop',
        purpose: 'gallery',
        status: MEDIA_STATUS.READY,
    };

    if (queryFilters.category && queryFilters.category !== 'all') {
        filter['metadata.category'] = queryFilters.category;
    }

    const total = await Media.countDocuments(filter);
    const { skip, limit, pagination } = buildPagination(queryFilters, total);

    const items = await Media.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    return {
        items: serializeMediaList(items),
        pagination,
    };
};

/**
 * Get gallery media for a shop by shopId (public-facing, used by customers).
 * Replaces: photoRepository.findByShopId() calls in shop.service.js
 */
export const getGalleryByShopId = async (shopId) => {
    const items = await Media.find({
        entityId: shopId,
        entityType: 'Shop',
        purpose: 'gallery',
        status: MEDIA_STATUS.READY,
    })
        .sort({ createdAt: -1 })
        .lean();

    return serializeMediaList(items);
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTITY MEDIA OPERATIONS (replaces cover/profile updates in photo.service)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update shop cover image from a confirmed media item.
 * Replaces: photo.service.updateShopCover()
 */
export const updateShopCover = async (ownerId, mediaId) => {
    if (!mediaId) throw new BadRequestError('No cover media ID provided');

    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const media = await Media.findOne({
        _id: mediaId,
        userId: ownerId,
        status: MEDIA_STATUS.READY,
    });
    if (!media) throw new BadRequestError('Invalid or unconfirmed cover image');

    const oldR2Key = shop.coverR2Key;

    await shopRepository.updateByOwnerId(ownerId, { coverR2Key: media.r2Key });

    // Link media to entity
    await Media.findByIdAndUpdate(mediaId, {
        entityId: shop._id,
        entityType: 'Shop',
        purpose: 'cover',
    });

    // Clean up old cover image from R2
    if (oldR2Key && oldR2Key !== media.r2Key) {
        storageProvider.deleteObject(oldR2Key).catch(() => {});
    }

    return { coverUrl: buildMediaUrl(media.r2Key) };
};

/**
 * Update barber owner profile picture.
 * Replaces: account.service.updateBarberProfilePicture()
 */
export const updateBarberProfilePicture = async (ownerId, mediaId) => {
    if (!mediaId) throw new BadRequestError('No profile picture media ID provided');

    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const media = await Media.findOne({
        _id: mediaId,
        userId: ownerId,
        status: MEDIA_STATUS.READY,
    });
    if (!media) throw new BadRequestError('Invalid or unconfirmed photo');

    const oldR2Key = shop.ownerPhotoR2Key;

    await shopRepository.updateByOwnerId(ownerId, { ownerPhotoR2Key: media.r2Key });

    await Media.findByIdAndUpdate(mediaId, {
        entityId: shop._id,
        entityType: 'Shop',
        purpose: 'profile',
    });

    if (oldR2Key && oldR2Key !== media.r2Key) {
        storageProvider.deleteObject(oldR2Key).catch(() => {});
    }

    return { photoUrl: buildMediaUrl(media.r2Key) };
};

/**
 * Resolve a confirmed media item for use during entity creation.
 * Used by employee.service and onboarding.service when they need the r2Key.
 */
export const resolveMediaForEntity = async (userId, mediaId) => {
    if (!mediaId) return null;

    const media = await Media.findOne({
        _id: mediaId,
        userId,
        status: MEDIA_STATUS.READY,
    });
    if (!media) throw new BadRequestError('Invalid or unconfirmed media');

    return media;
};

/**
 * Link a media record to an entity after entity creation.
 */
export const linkMediaToEntity = async (mediaId, entityId, entityType, purpose) => {
    await Media.findByIdAndUpdate(mediaId, { entityId, entityType, purpose });
};
```

