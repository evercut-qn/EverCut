
## 12. Implementation Guide — Media Controller & Routes

### 12.1 Media Controller

```javascript
// controllers/media.controller.js — NEW (replaces photo.controller.js)
import * as mediaService from '../services/media/media.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { getValidatedRequestData } from '../utils/request-validation.utils.js';

// ── Upload Infrastructure ────────────────────────────────────────────────

export const requestUploadUrl = async (req, res, next) => {
    try {
        const body = getValidatedRequestData(req, 'body');
        const result = await mediaService.requestUploadUrl(req.user._id, body);
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

// ── Media CRUD ───────────────────────────────────────────────────────────

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

// ── Gallery (replaces photo.controller.js) ───────────────────────────────

export const attachGallery = async (req, res, next) => {
    try {
        const { mediaIds, category, description } = getValidatedRequestData(req, 'body');
        const result = await mediaService.attachGalleryMedia(req.user._id, mediaIds, category, description);
        return res.status(201).json(ApiResponse.success(result, 'Gallery media attached'));
    } catch (err) {
        next(err);
    }
};

export const getGallery = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const result = await mediaService.getShopGallery(req.user._id, query);
        return res.status(200).json(ApiResponse.paginated(result.items, result.pagination, 'Gallery fetched'));
    } catch (err) {
        next(err);
    }
};
```

### 12.2 Media Routes

```javascript
// routes/media.routes.js — NEW (replaces photos.routes.js)
import { Router } from 'express';
import * as mediaController from '../controllers/media.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { objectIdParamSchema } from '../validators/common.validator.js';
import {
    uploadUrlSchema,
    confirmUploadSchema,
    attachGallerySchema,
    galleryFilterSchema,
} from '../validators/media.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// All media routes require authentication
router.use(authenticate);

// ── Upload Infrastructure ────────────────────────────────────────────────
router.post('/upload-url', validate(uploadUrlSchema, 'body'), mediaController.requestUploadUrl);
router.post('/confirm', validate(confirmUploadSchema, 'body'), mediaController.confirmUpload);

// ── Gallery (replaces /photos routes) ────────────────────────────────────
router.post('/gallery', authorize(ROLES.BARBER), validate(attachGallerySchema, 'body'), mediaController.attachGallery);
router.get('/gallery', authorize(ROLES.BARBER), validate(galleryFilterSchema, 'query'), mediaController.getGallery);

// ── Single Media CRUD ────────────────────────────────────────────────────
router.get('/:id', validate(objectIdParamSchema, 'params'), mediaController.getMedia);
router.delete('/:id', validate(objectIdParamSchema, 'params'), mediaController.deleteMedia);

export default router;
```

### 12.3 Routes Index Update

```diff
// routes/index.js

-import photosRoutes from './photos.routes.js';
+import mediaRoutes from './media.routes.js';

 router.use('/auth', authRoutes);
 router.use('/onboarding', onboardingRoutes);
 router.use('/account', accountRoutes);
-router.use('/photos', photosRoutes);
+router.use('/media', mediaRoutes);
 router.use('/customers', customersRoutes);
 router.use('/shops', shopsRoutes);
 router.use('/employees', employeesRoutes);
```

### 12.4 Media Validator

```javascript
// validators/media.validator.js — NEW (replaces photo.validator.js)
import Joi from 'joi';
import {
    ALL_MEDIA_PURPOSES,
    ALL_GALLERY_CATEGORIES,
    ALLOWED_MEDIA_MIMES,
} from '../utils/constants.js';
import { paginationSchema } from './common.validator.js';

export const uploadUrlSchema = Joi.object({
    contentType: Joi.string()
        .valid(...ALLOWED_MEDIA_MIMES)
        .required()
        .messages({ 'any.only': 'Unsupported content type' }),
    sizeBytes: Joi.number()
        .integer()
        .positive()
        .max(500 * 1024 * 1024)
        .required(),
    purpose: Joi.string()
        .valid(...ALL_MEDIA_PURPOSES)
        .required(),
    entityId: Joi.string()
        .pattern(/^[a-fA-F0-9]{24}$/)
        .optional(),
});

export const confirmUploadSchema = Joi.object({
    mediaId: Joi.string().required(),
});

// Gallery schemas (replace photo.validator schemas)
export const attachGallerySchema = Joi.object({
    mediaIds: Joi.array()
        .items(Joi.string().required())
        .min(1)
        .max(10)
        .required(),
    category: Joi.string()
        .valid(...ALL_GALLERY_CATEGORIES)
        .default('other'),
    description: Joi.string()
        .max(500)
        .allow('')
        .default(''),
});

export const galleryFilterSchema = paginationSchema.keys({
    category: Joi.string()
        .valid('all', ...ALL_GALLERY_CATEGORIES)
        .default('all'),
});

// Shared schema for endpoints that accept a mediaId in body
export const mediaIdBodySchema = Joi.object({
    mediaId: Joi.string().required(),
});
```

### 12.5 Media Repository

```javascript
// repositories/media.repository.js — NEW (replaces photo.repository.js)
import Media from '../models/media.model.js';

class MediaRepository {
    async create(data) {
        return Media.create(data);
    }

    async findById(id) {
        return Media.findById(id).lean();
    }

    async findByIdAndUser(id, userId) {
        return Media.findOne({ _id: id, userId }).lean();
    }

    /**
     * Find media items attached to a specific entity.
     * Replaces: photoRepository.findByShopId()
     */
    async findByEntity(entityId, entityType, extraFilter = {}, options = {}) {
        const filter = {
            entityId,
            entityType,
            status: 'ready',
            ...extraFilter,
        };
        const query = Media.find(filter).sort({ createdAt: -1 });
        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    /**
     * Count active media for an entity with optional purpose filter.
     * Replaces: photoRepository.getActiveCountByShop()
     */
    async countByEntity(entityId, entityType, extraFilter = {}) {
        return Media.countDocuments({
            entityId,
            entityType,
            status: 'ready',
            ...extraFilter,
        });
    }

    /**
     * Find and delete a media item by ID and entity scope.
     * Replaces: photoRepository.deleteByIdAndShop()
     */
    async softDeleteByIdAndEntity(id, entityId) {
        return Media.findOneAndUpdate(
            { _id: id, entityId, status: 'ready' },
            { status: 'deleted' },
            { new: true },
        );
    }

    /**
     * Get gallery statistics for a shop.
     * Replaces: photoRepository.getStatsByShop()
     */
    async getStatsByEntity(entityId, entityType) {
        const [byCategory, totalSize] = await Promise.all([
            Media.aggregate([
                { $match: { entityId, entityType, status: 'ready', purpose: 'gallery' } },
                { $group: { _id: '$metadata.category', count: { $sum: 1 }, totalSize: { $sum: '$actualSize' } } },
            ]),
            Media.aggregate([
                { $match: { entityId, entityType, status: 'ready', purpose: 'gallery' } },
                { $group: { _id: null, totalSize: { $sum: '$actualSize' } } },
            ]),
        ]);

        const totalItems = await this.countByEntity(entityId, entityType, { purpose: 'gallery' });

        return {
            totalItems,
            totalSize: totalSize[0]?.totalSize || 0,
            byCategory,
        };
    }

    async findExpiredPending(cutoffDate) {
        return Media.find({
            status: 'pending',
            uploadExpiresAt: { $lt: cutoffDate },
        }).lean();
    }

    async updateStatus(id, status, extraFields = {}) {
        return Media.findByIdAndUpdate(id, { status, ...extraFields }, { new: true });
    }
}

export default new MediaRepository();
```

### 12.6 Media Serializer

```javascript
// serializers/media.serializer.js — NEW (replaces photo.serializer.js)
import { sanitizeForResponse, toPlainObject } from './core.serializer.js';
import { r2KeyToUrl } from '../services/media/media-url.service.js';

const compact = (obj) => Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
);

/**
 * Serialize a single media item for API response.
 * This replaces serializePhoto — the output contract is backward-compatible.
 */
export const serializeMedia = (media) => {
    const plain = sanitizeForResponse(toPlainObject(media));
    if (!plain) return null;

    return compact({
        id: plain.id || plain._id?.toString(),
        type: plain.type,
        status: plain.status,
        purpose: plain.purpose,
        // URL construction — the ONLY place URLs are built from R2 keys
        url: r2KeyToUrl(plain.r2Key),
        // Backward compat: emit photoUrl for clients still expecting photo shape
        photoUrl: plain.purpose === 'gallery' ? r2KeyToUrl(plain.r2Key) : undefined,
        contentType: plain.contentType,
        fileSize: plain.actualSize || plain.declaredSize,
        // Domain metadata (replaces photoType, description, photoName)
        category: plain.metadata?.category ?? null,
        description: plain.metadata?.description ?? null,
        originalName: plain.metadata?.originalName ?? null,
        // Entity association
        entityId: plain.entityId?.toString() ?? null,
        entityType: plain.entityType ?? null,
        // Timestamps
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    });
};

/**
 * Serialize a list of media items. Replaces serializePhotos.
 */
export const serializeMediaList = (items = []) => (
    Array.isArray(items) ? items.map(serializeMedia).filter(Boolean) : []
);
```

---

## 13. Implementation Guide — Service Layer Refactoring

### 13.1 Refactoring Pattern

Every service that currently uses Cloudinary follows this pattern:

**BEFORE (Cloudinary):**
```javascript
// File arrives via Multer middleware as req.file
const photoUrl = file.path;
const cloudinaryId = file.public_id || file.filename;
// Save to database
// On delete: cloudinary.uploader.destroy(cloudinaryId)
```

**AFTER (R2):**
```javascript
// Client already uploaded via presigned URL and called /media/confirm
// The confirmed mediaId is passed in the request body
import * as mediaService from './media/media.service.js';

const media = await mediaService.resolveMediaForEntity(userId, data.photoMediaId);
const r2Key = media.r2Key;
// Save r2Key to domain model
// On delete: storageProvider.deleteObject(r2Key)
```

### 13.2 Shop Controller Updates

```diff
// controllers/shop.controller.js

-import * as photoService from '../services/photo.service.js';
+import * as mediaService from '../services/media/media.service.js';

 export const updateMyCover = async (req, res, next) => {
     try {
-        const result = await photoService.updateShopCover(req.user._id, req.file);
+        const { mediaId } = getValidatedRequestData(req, 'body');
+        const result = await mediaService.updateShopCover(req.user._id, mediaId);
         return res.status(200).json(ApiResponse.success(result, 'Cover image updated'));
     } catch (err) {
         next(err);
     }
 };

 export const updateMyPicture = async (req, res, next) => {
     try {
-        const result = await accountService.updateBarberProfilePicture(req.user._id, req.file);
+        const { mediaId } = getValidatedRequestData(req, 'body');
+        const result = await mediaService.updateBarberProfilePicture(req.user._id, mediaId);
         return res.status(200).json(ApiResponse.success(result, 'Profile picture updated'));
     } catch (err) {
         next(err);
     }
 };
```

### 13.3 Employee Service Refactoring

```diff
// services/employee.service.js

-import cloudinary from '../config/cloudinary.config.js';
+import storageProvider from './media/storage-provider.service.js';
+import * as mediaService from './media/media.service.js';

-const destroyCloudinaryAsset = async (publicId, context) => {
-    if (!publicId) return;
-    try { await cloudinary.uploader.destroy(publicId); }
-    catch (err) { logger.warn('Image cleanup failed', { publicId, context, error: err.message }); }
-};
+const deleteMediaAsset = async (r2Key, context) => {
+    if (!r2Key) return;
+    try { await storageProvider.deleteObject(r2Key); }
+    catch (err) { logger.warn('Image cleanup failed', { r2Key, context, error: err.message }); }
+};

 // In addEmployee:
-    if (file) {
-        employeeData.photoUrl = file.path;
-        employeeData.cloudinaryId = file.public_id || file.filename;
-    }
+    if (data.photoMediaId) {
+        const media = await mediaService.resolveMediaForEntity(ownerId, data.photoMediaId);
+        employeeData.photoR2Key = media.r2Key;
+        // Link media to employee after creation:
+        // await mediaService.linkMediaToEntity(media._id, newEmployee._id, 'Employee', 'employee');
+    }

 // In updateEmployee:
-    if (file) {
-        updateData.photoUrl = file.path;
-        updateData.cloudinaryId = file.public_id || file.filename;
-    }
+    if (data.photoMediaId) {
+        const media = await mediaService.resolveMediaForEntity(ownerId, data.photoMediaId);
+        updateData.photoR2Key = media.r2Key;
+    }

 // In deleteEmployee — cleanup:
-    if (employee.cloudinaryId) {
-        await destroyCloudinaryAsset(employee.cloudinaryId, 'delete-employee');
-    }
+    if (employee.photoR2Key) {
+        await deleteMediaAsset(employee.photoR2Key, 'delete-employee');
+    }

 // In updateEmployee — old photo cleanup:
-    if (updateData.cloudinaryId && employee.cloudinaryId && employee.cloudinaryId !== updateData.cloudinaryId) {
-        await destroyCloudinaryAsset(employee.cloudinaryId, 'replace-photo');
-    }
+    if (updateData.photoR2Key && employee.photoR2Key && employee.photoR2Key !== updateData.photoR2Key) {
+        await deleteMediaAsset(employee.photoR2Key, 'replace-photo');
+    }
```

### 13.4 User Service (Customer Profile) Refactoring

```diff
// services/user.service.js

-import cloudinary from '../config/cloudinary.config.js';
+import storageProvider from './media/storage-provider.service.js';
+import * as mediaService from './media/media.service.js';

 export const updateProfile = async (userId, data) => {
     // ...existing validation...

-    if (file) {
-        data.photoUrl = file.path;
-        data.cloudinaryId = file.filename || file.public_id;
-    }
+    if (data.photoMediaId) {
+        const media = await mediaService.resolveMediaForEntity(userId, data.photoMediaId);
+        data.photoR2Key = media.r2Key;
+        // Link media to customer after save:
+        // await mediaService.linkMediaToEntity(media._id, profile._id, 'Customer', 'avatar');
+    }

     // ... save profile ...

-    if (data.cloudinaryId && profile.cloudinaryId && profile.cloudinaryId !== data.cloudinaryId) {
-        try { await cloudinary.uploader.destroy(profile.cloudinaryId); } catch { }
-    }
+    if (data.photoR2Key && profile.photoR2Key && profile.photoR2Key !== data.photoR2Key) {
+        try { await storageProvider.deleteObject(profile.photoR2Key); } catch { }
+    }
```

### 13.5 Account Service Refactoring

```diff
// services/account.service.js

-import cloudinary from '../config/cloudinary.config.js';

-export const updateBarberProfilePicture = async (ownerId, file) => {
-    // ... Cloudinary upload logic ...
-};
+// REMOVED — updateBarberProfilePicture is now in media.service.js
+// Shop controller now calls mediaService.updateBarberProfilePicture() directly.
```

The `updateBarberProfilePicture` function previously in `account.service.js` is absorbed into `media.service.js` (see §11). The `shop.controller.js` now imports from `media.service` instead of `account.service` for this operation.

### 13.6 Shop Service Refactoring

```diff
// services/shop.service.js

-import photoRepository from '../repositories/photo.repository.js';
-import { serializePhotos } from '../serializers/photo.serializer.js';
+import * as mediaService from './media/media.service.js';

 export const getShopByOwner = async (ownerId, userContext) => {
     const shop = await shopRepository.findByOwnerId(ownerId);
     if (!shop) throw new NotFoundError('Shop profile');

-    const photos = await photoRepository.findByShopId(shop._id, {});
-    return serializeBarberProfile(shop, userContext, { photos });
+    const gallery = await mediaService.getGalleryByShopId(shop._id);
+    return serializeBarberProfile(shop, userContext, { gallery });
 };

 export const updateBusinessInfo = async (ownerId, body, userContext) => {
     // ... existing update logic ...

-    const photos = await photoRepository.findByShopId(updated._id, {});
-    return {
-        shop: serializeBarberProfile(updated, userContext, { photos }),
+    const gallery = await mediaService.getGalleryByShopId(updated._id);
+    return {
+        shop: serializeBarberProfile(updated, userContext, { gallery }),
         updatedFields: Object.keys(updateData),
     };
 };

 export const getShopInfoForCustomer = async (shopId) => {
     // ...
-    const [singleServices, bundledServices, photos, ratingSummary] = await Promise.all([
+    const [singleServices, bundledServices, gallery, ratingSummary] = await Promise.all([
         serviceRepository.findByShopIdAndType(shopId, 'single', '...'),
         serviceRepository.findByShopIdAndType(shopId, 'bundled', '...'),
-        photoRepository.findByShopId(shopId, {}),
+        mediaService.getGalleryByShopId(shopId),
         ratingRepository.getShopSummary(shopId),
     ]);

     return {
         shop: serializeShopProfile(shop, { privateView: false }),
         services: { ... },
-        photos: serializePhotos(photos),
+        gallery,
         ratings: { ... },
     };
 };
```

### 13.7 Auth Service Refactoring

```diff
// services/auth.service.js

-import photoRepository from '../repositories/photo.repository.js';
+import * as mediaService from './media/media.service.js';

 // In login response construction:
-    const photos = await photoRepository.findByShopId(shop._id, {});
+    const gallery = await mediaService.getGalleryByShopId(shop._id);
```

### 13.8 Service Catalog Refactoring

```diff
// services/service-catalog.service.js

-import cloudinary from '../config/cloudinary.config.js';
+import { buildMediaUrl } from './media/media-url.service.js';

-const resolveServiceImage = async (serviceName, serviceType) => {
-    const formattedName = serviceName.toLowerCase().replace(/\s+/g, '');
-    const folderPath = serviceType === 'bundled' ? 'evercut/bundled' : 'evercut/single';
-    const publicId = `${folderPath}/${formattedName}`;
-    try {
-        const resource = await cloudinary.api.resource(publicId);
-        return resource.secure_url;
-    } catch {
-        return cloudinary.url('evercut/default/service.jpg', { secure: true });
-    }
-};
+const DEFAULT_SERVICE_IMAGE_URL = buildMediaUrl('images/services/default/service.jpg');
+
+const resolveServiceImage = (serviceName, serviceType) => {
+    const formattedName = serviceName.toLowerCase().replace(/\s+/g, '');
+    const folder = serviceType === 'bundled' ? 'bundled' : 'single';
+    const r2Key = `images/services/${folder}/${formattedName}.jpg`;
+    return buildMediaUrl(r2Key);
+};
```

> **Note:** Service catalog images must be seeded into R2 before cutover. Create a migration script that downloads all images from `evercut/single/*` and `evercut/bundled/*` in Cloudinary and uploads them to `images/services/single/*` and `images/services/bundled/*` in R2. Include `images/services/default/service.jpg` as the fallback.

