
## 14. Implementation Guide — Serializer Updates

### 14.1 Core Serializer Update

```diff
// serializers/core.serializer.js — UPDATE SENSITIVE_KEYS

 const SENSITIVE_KEYS = new Set([
     'pinHash',
     'refreshTokenHash',
-    'cloudinaryId',
-    'coverCloudinaryId',
-    'ownerPhotoCloudinaryId',
+    'r2Key',
+    'r2Bucket',
+    'coverR2Key',
+    'ownerPhotoR2Key',
+    'photoR2Key',
+    'multipartUploadId',
+    'declaredSize',
+    'uploadExpiresAt',
     'sdkOrderToken',
     'gatewayResponse',
     'webhookEventId',
     'bankAccount',
 ]);
```

### 14.2 Shop Serializer Updates

All shop serializers that emit `coverUrl` or `ownerPhotoUrl` must construct URLs from R2 keys:

```javascript
// In serializers/shop.serializer.js (or barber-profile.utils.js):
import { r2KeyToUrl } from '../services/media/media-url.service.js';

// Replace direct field access:
//   coverUrl: plain.coverUrl
// With URL construction from R2 key + backward-compat fallback:
//   coverUrl: r2KeyToUrl(plain.coverR2Key) ?? plain.coverUrl ?? null,
//   ownerPhotoUrl: r2KeyToUrl(plain.ownerPhotoR2Key) ?? plain.ownerPhotoUrl ?? null,
```

The `?? plain.coverUrl` fallback ensures backward compatibility during migration when some records still have old Cloudinary URLs before the data migration script runs.

### 14.3 Employee Serializer Updates

```javascript
// In serializers/employee.serializer.js:
import { r2KeyToUrl } from '../services/media/media-url.service.js';

// Replace:
//   photoUrl: plain.photoUrl
// With:
//   photoUrl: r2KeyToUrl(plain.photoR2Key) ?? plain.photoUrl ?? null,
```

### 14.4 Customer Serializer Updates

Same pattern:
```javascript
photoUrl: r2KeyToUrl(plain.photoR2Key) ?? plain.photoUrl ?? null,
```

### 14.5 Barber Profile Utils Updates

```diff
// utils/barber-profile.utils.js
+import { r2KeyToUrl } from '../services/media/media-url.service.js';

 export const serializeBarberProfile = (shop, userContext, extras = {}) => {
     // ...
     return {
         // ...
-        coverUrl: shop.coverUrl,
-        ownerPhotoUrl: shop.ownerPhotoUrl,
-        photos: extras.photos || [],
+        coverUrl: r2KeyToUrl(shop.coverR2Key) ?? shop.coverUrl ?? null,
+        ownerPhotoUrl: r2KeyToUrl(shop.ownerPhotoR2Key) ?? shop.ownerPhotoUrl ?? null,
+        gallery: extras.gallery || [],
     };
 };
```

---

## 15. Implementation Guide — Onboarding Service Refactoring

### 15.1 Customer Onboarding

```diff
// services/onboarding.service.js

-import photoRepository from '../repositories/photo.repository.js';
+import * as mediaService from './media/media.service.js';

-export const createCustomerOnboarding = async (phoneNumber, profileData, file) => {
+export const createCustomerOnboarding = async (phoneNumber, profileData) => {
     const verifiedPhoneNumber = normalizeVerifiedPhoneNumber(phoneNumber);
     if (!verifiedPhoneNumber) throw new BadRequestError('Verified phone number is required');
-    if (!file) throw new BadRequestError('Profile photo is required');
+    if (!profileData.photoMediaId) throw new BadRequestError('Profile photo is required');
+
+    // Validate media exists and is confirmed
+    // Note: userId is not yet created, so we validate by mediaId + status only
+    const media = await Media.findOne({
+        _id: profileData.photoMediaId,
+        status: MEDIA_STATUS.READY,
+    });
+    if (!media) throw new BadRequestError('Invalid or unconfirmed photo');

     // ...ensureUniqueUserIdentity, create user...

     const profile = await customerRepository.create({
         userId: user._id,
         // ...other fields...
-        photoUrl: file.path,
-        cloudinaryId: file.filename || file.public_id,
+        photoR2Key: media.r2Key,
     });

+    // Link media to the new user and entity
+    await mediaService.linkMediaToEntity(media._id, profile._id, 'Customer', 'avatar');
+    await Media.findByIdAndUpdate(media._id, { userId: user._id });
```

### 15.2 Barber Onboarding

```diff
-export const createBarberOnboarding = async (phoneNumber, shopData, file) => {
+export const createBarberOnboarding = async (phoneNumber, shopData) => {
     // ...validation...
-    if (!file) throw new BadRequestError('Shop image is required');
+    if (!shopData.photoMediaId) throw new BadRequestError('Shop image is required');
+
+    const media = await Media.findOne({
+        _id: shopData.photoMediaId,
+        status: MEDIA_STATUS.READY,
+    });
+    if (!media) throw new BadRequestError('Invalid or unconfirmed shop image');

-    const coverUrl = file.path;
-    const coverCloudinaryId = file.public_id || file.filename;

     const shopCreateData = {
         // ...other fields...
-        coverUrl,
-        coverCloudinaryId,
+        coverR2Key: media.r2Key,
         pinHash,
     };

     const createdShop = await shopRepository.create(shopCreateData);

-    const photo = await photoRepository.create({
-        shopId: createdShop._id,
-        photoUrl: file.path,
-        cloudinaryId: file.public_id || file.filename,
-        photoName: file.originalname || 'onboarding-shop-image',
-        photoType: 'shop_interior',
-        description: 'Uploaded during onboarding',
-        fileSize: file.size,
-        mimeType: file.mimetype,
-    });
+    // Link media as gallery item + cover for the new shop
+    await Media.findByIdAndUpdate(media._id, {
+        userId: user._id,
+        entityId: createdShop._id,
+        entityType: 'Shop',
+        purpose: 'gallery',
+        'metadata.category': 'shop_interior',
+        'metadata.description': 'Uploaded during onboarding',
+        'metadata.originalName': 'onboarding-shop-image',
+    });
```

### 15.3 All Route Updates

#### Onboarding Routes

```diff
// routes/onboarding.routes.js

-import { uploadBarberOnboardingImage, uploadCustomerPhoto } from '../middleware/upload.middleware.js';

 router.post(
     '/customers',
     authenticateOnboarding,
-    uploadCustomerPhoto,
     validate(customerOnboardingSchema, 'body'),
     onboardingController.createCustomerOnboarding,
 );

 router.post(
     '/barbers',
     authenticateOnboarding,
-    uploadBarberOnboardingImage,
     validate(barberOnboardingSchema, 'body'),
     onboardingController.createBarberOnboarding,
 );
```

#### Shop Routes

```diff
// routes/shops.routes.js

-import { uploadBarberProfilePhoto, uploadShopCover } from '../middleware/upload.middleware.js';
+import { mediaIdBodySchema } from '../validators/media.validator.js';

-router.patch('/me/media/picture', authenticate, authorize(ROLES.BARBER), uploadBarberProfilePhoto, shopController.updateMyPicture);
-router.patch('/me/media/cover', authenticate, authorize(ROLES.BARBER), uploadShopCover, shopController.updateMyCover);
+router.patch('/me/media/picture', authenticate, authorize(ROLES.BARBER), validate(mediaIdBodySchema, 'body'), shopController.updateMyPicture);
+router.patch('/me/media/cover', authenticate, authorize(ROLES.BARBER), validate(mediaIdBodySchema, 'body'), shopController.updateMyCover);
```

#### Employee Routes

```diff
// routes/employees.routes.js

-import { uploadEmployeePhoto } from '../middleware/upload.middleware.js';

-router.post('/', authorize(ROLES.BARBER), uploadEmployeePhoto, validate(addEmployeeSchema, 'body'), employeeController.addEmployee);
-router.patch('/:id', authorize(ROLES.BARBER), validate(employeeIdParamSchema, 'params'), uploadEmployeePhoto, validate(updateEmployeeSchema, 'body'), employeeController.updateEmployee);
+router.post('/', authorize(ROLES.BARBER), validate(addEmployeeSchema, 'body'), employeeController.addEmployee);
+router.patch('/:id', authorize(ROLES.BARBER), validate(employeeIdParamSchema, 'params'), validate(updateEmployeeSchema, 'body'), employeeController.updateEmployee);
```

#### Customer Routes

```diff
// routes/customers.routes.js

-import { uploadCustomerPhoto } from '../middleware/upload.middleware.js';

-router.patch('/me', uploadCustomerPhoto, validate(updateCustomerSchema, 'body'), customerController.updateMe);
+router.patch('/me', validate(updateCustomerSchema, 'body'), customerController.updateMe);
```

---

## 16. Implementation Guide — Cleanup & Lifecycle

### 16.1 Media Cleanup Service

```javascript
// services/media/media-cleanup.service.js — NEW FILE
import Media from '../../models/media.model.js';
import storageProvider from './storage-provider.service.js';
import logger from '../../utils/logger.js';
import { MEDIA_STATUS } from '../../utils/constants.js';

/**
 * Cleanup orphaned media uploads.
 * Targets pending uploads older than 24 hours that were never confirmed.
 * MongoDB TTL index also handles record deletion, but this ensures R2 cleanup.
 */
export const cleanupOrphanedUploads = async () => {
    const cutoff = new Date(Date.now() - 24 * 3600_000);

    const orphans = await Media.find({
        status: MEDIA_STATUS.PENDING,
        createdAt: { $lt: cutoff },
    }).limit(100);

    if (!orphans.length) return;

    logger.info('Cleaning up orphaned uploads', { count: orphans.length });

    for (const media of orphans) {
        try {
            await storageProvider.deleteObject(media.r2Key);
            await Media.findByIdAndDelete(media._id);
            logger.info('Orphaned upload cleaned', { mediaId: media._id, r2Key: media.r2Key });
        } catch (err) {
            logger.warn('Orphan cleanup failed', { mediaId: media._id, error: err.message });
        }
    }
};
```

### 16.2 Media Cleanup Cron Job

```javascript
// jobs/media-cleanup.cron.js — NEW FILE
import { cleanupOrphanedUploads } from '../services/media/media-cleanup.service.js';
import logger from '../utils/logger.js';

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

export const startMediaCleanupCron = () => {
    setInterval(async () => {
        try {
            await cleanupOrphanedUploads();
        } catch (err) {
            logger.error('Media cleanup cron failed', { error: err.message });
        }
    }, CLEANUP_INTERVAL);

    logger.info('Media cleanup cron started', { interval: '1 hour' });
};
```

### 16.3 Deleted Files

```
DELETE: utils/upload-cleanup.utils.js
Reason: Replaced by media-cleanup.service.js.
The old file cleaned Cloudinary assets when validation middleware rejected a request
after Multer already uploaded. With presigned URLs, upload happens directly to R2.
Validation failure at /confirm leaves the Media record in 'pending' status, and the
cleanup cron handles R2 deletion.

DELETE: config/cloudinary.config.js
Reason: Replaced by config/r2.config.js.

DELETE: middleware/upload.middleware.js
Reason: Uploads no longer flow through the backend. All 6 Multer+CloudinaryStorage
instances are obsolete.
```

### 16.4 Error Handler Update

```diff
// middleware/error-handler.middleware.js

-    // 1. Multer-specific errors
-    if (err.name === 'MulterError') {
-        const messages = {
-            LIMIT_FILE_SIZE: 'File too large. Maximum size is 5 MB.',
-            LIMIT_FILE_COUNT: 'Too many files uploaded.',
-            LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
-        };
-        const message = messages[err.code] || 'File upload error';
-        return res.status(400).json(ApiResponse.error(message));
-    }
+    // Note: Multer error handling removed — uploads no longer flow through backend.
+    // Upload size/type validation happens at presigned URL generation (/media/upload-url)
+    // and at confirmation (/media/confirm).
```

---

## 17. Environment Variables & Config

### 17.1 New Environment Variables

```bash
# .env — ADD these variables

# ---------------------------------------------------------------------------
# CLOUDFLARE R2 CONFIG
# ---------------------------------------------------------------------------
CF_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET=evercut-media-dev
CDN_BASE_URL=https://media.evercut.com

# HMAC secret for media token signing (256-bit random)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Must match Cloudflare Worker MEDIA_TOKEN_SECRET when Worker is deployed.
MEDIA_TOKEN_SECRET=generate_64_char_random_hex_string
```

### 17.2 .env.example Update

```diff
-# ---------------------------------------------------------------------------
-# CLOUDINARY CONFIG
-# ---------------------------------------------------------------------------
-CLOUDINARY_CLOUD_NAME=evercut-dev
-CLOUDINARY_API_KEY=replace_with_cloudinary_api_key
-CLOUDINARY_API_SECRET=replace_with_cloudinary_api_secret

+# ---------------------------------------------------------------------------
+# CLOUDFLARE R2 CONFIG
+# ---------------------------------------------------------------------------
+CF_ACCOUNT_ID=your_cloudflare_account_id
+R2_ACCESS_KEY_ID=your_r2_access_key_id
+R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
+R2_BUCKET=evercut-media-dev
+CDN_BASE_URL=https://media.evercut.com
+MEDIA_TOKEN_SECRET=generate_with_openssl_rand_hex_32
```

### 17.3 package.json Changes

```diff
 "dependencies": {
+    "@aws-sdk/client-s3": "^3.600.0",
+    "@aws-sdk/s3-request-presigner": "^3.600.0",
     "bcryptjs": "^3.0.3",
-    "cloudinary": "^2.9.0",
     "cors": "^2.8.6",
     "dotenv": "^17.3.1",
     "express": "^5.2.1",
     "firebase-admin": "^13.7.0",
     "joi": "^18.0.2",
     "jsonwebtoken": "^9.0.3",
     "mongodb": "^7.1.0",
     "mongoose": "^9.2.2",
-    "multer": "^2.0.2",
-    "multer-storage-cloudinary": "^4.0.0",
     "pdfkit": "^0.18.0",
+    "uuid": "^11.0.0"
 },
```

> **Note:** `multer` is removed because uploads no longer flow through the backend. If other features require file upload in the future (e.g., CSV import), reinstall multer with memory storage only.

---

## 18. Migration Execution Strategy

### 18.1 Phase Order

| Phase | Description | Duration | Risk |
|-------|-------------|----------|------|
| **Phase 0** | R2 bucket setup + seed service images | 1 day | Low |
| **Phase 1** | Add new media module (alongside existing code) | 2-3 days | Low |
| **Phase 2** | Migrate existing data (Cloudinary → R2) | 1 day | Medium |
| **Phase 3** | Switch all services to R2 + delete photo.* modules | 2-3 days | High |
| **Phase 4** | Update Flutter app to use presigned uploads | 3-5 days | High |
| **Phase 5** | Remove Cloudinary dependencies + cleanup | 1 day | Low |
| **Phase 6** | Deploy Cloudflare Worker for edge delivery | 1-2 days | Medium |

### 18.2 Complete File Change Inventory

**Files to CREATE (8):**

| File | Purpose |
|------|---------|
| `config/r2.config.js` | R2 S3Client initialization |
| `services/media/storage-provider.service.js` | R2 operations abstraction |
| `services/media/media.service.js` | Upload orchestration + gallery CRUD + entity attachment |
| `services/media/media-url.service.js` | CDN URL construction + HMAC tokens |
| `services/media/media-validation.service.js` | Magic byte + MIME validation |
| `services/media/media-cleanup.service.js` | Orphan cleanup logic |
| `controllers/media.controller.js` | Media API endpoints |
| `routes/media.routes.js` | Media route definitions |
| `models/media.model.js` | Unified media schema |
| `repositories/media.repository.js` | Media CRUD + entity queries |
| `validators/media.validator.js` | Media request validation |
| `serializers/media.serializer.js` | Media response shaping |
| `jobs/media-cleanup.cron.js` | Orphan cleanup cron |

**Files to DELETE (10):**

| File | Reason |
|------|--------|
| `config/cloudinary.config.js` | Replaced by `config/r2.config.js` |
| `middleware/upload.middleware.js` | Uploads no longer flow through backend |
| `utils/upload-cleanup.utils.js` | Replaced by `media-cleanup.service.js` |
| `services/photo.service.js` | Absorbed into `media.service.js` |
| `controllers/photo.controller.js` | Absorbed into `media.controller.js` |
| `routes/photos.routes.js` | Absorbed into `media.routes.js` |
| `models/photo.model.js` | Absorbed into `media.model.js` |
| `repositories/photo.repository.js` | Absorbed into `media.repository.js` |
| `serializers/photo.serializer.js` | Absorbed into `media.serializer.js` |
| `validators/photo.validator.js` | Absorbed into `media.validator.js` |

**Files to MODIFY (14):**

| File | Change Summary |
|------|---------------|
| `config/index.js` | Remove cloudinary config, add r2 config |
| `utils/constants.js` | Remove PHOTO_TYPE, add media constants |
| `services/employee.service.js` | Remove Cloudinary, use mediaService |
| `services/user.service.js` | Remove Cloudinary, use mediaService |
| `services/account.service.js` | Remove updateBarberProfilePicture (moved to media) |
| `services/onboarding.service.js` | Remove Cloudinary + photoRepository, use media |
| `services/shop.service.js` | Replace photoRepository with mediaService |
| `services/auth.service.js` | Replace photoRepository with mediaService |
| `services/service-catalog.service.js` | Remove Cloudinary API, use buildMediaUrl |
| `models/shop.model.js` | coverR2Key, ownerPhotoR2Key replace old fields |
| `models/employee.model.js` | photoR2Key replaces photoUrl + cloudinaryId |
| `models/customer.model.js` | photoR2Key replaces photoUrl + cloudinaryId |
| `serializers/core.serializer.js` | Update sensitive keys list |
| `middleware/error-handler.middleware.js` | Remove MulterError handling |
| `routes/index.js` | Replace /photos with /media |
| `routes/shops.routes.js` | Remove upload middleware, add body validation |
| `routes/employees.routes.js` | Remove upload middleware |
| `routes/customers.routes.js` | Remove upload middleware |
| `routes/onboarding.routes.js` | Remove upload middleware |

### 18.3 Data Migration Script

```javascript
// scripts/migrate-cloudinary-to-r2.js
// Run ONCE to copy all existing Cloudinary images to R2 and update DB records.

import mongoose from 'mongoose';
import Photo from '../src/models/photo.model.js';
import Shop from '../src/models/shop.model.js';
import Employee from '../src/models/employee.model.js';
import Customer from '../src/models/customer.model.js';
import Media from '../src/models/media.model.js';
import storageProvider from '../src/services/media/storage-provider.service.js';

const downloadAndUpload = async (cloudinaryUrl, r2Key) => {
    const response = await fetch(cloudinaryUrl);
    if (!response.ok) throw new Error(`Failed to fetch ${cloudinaryUrl}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    await storageProvider.putObject(r2Key, buffer, contentType);
    return { size: buffer.length, contentType };
};

// Migrate all Photo records → Media records
const migratePhotos = async () => {
    const photos = await Photo.find({ photoUrl: { $exists: true, $ne: null } });
    console.log(`Migrating ${photos.length} photos...`);

    for (const photo of photos) {
        try {
            const r2Key = `images/gallery/${photo.shopId}/${photo._id}.jpg`;
            const { size, contentType } = await downloadAndUpload(photo.photoUrl, r2Key);

            await Media.create({
                userId: null, // Will be set by a follow-up script
                type: 'image',
                status: 'ready',
                purpose: 'gallery',
                r2Key,
                r2Bucket: process.env.R2_BUCKET,
                contentType,
                declaredSize: size,
                actualSize: size,
                entityId: photo.shopId,
                entityType: 'Shop',
                metadata: {
                    category: photo.photoType || 'other',
                    description: photo.description,
                    originalName: photo.photoName,
                },
                uploadExpiresAt: new Date(Date.now() + 365 * 24 * 3600_000),
                confirmedAt: photo.createdAt,
            });
            console.log(`  ✓ Photo ${photo._id}`);
        } catch (err) {
            console.error(`  ✗ Photo ${photo._id}: ${err.message}`);
        }
    }
};

// Similar functions for Shop (coverUrl, ownerPhotoUrl), Employee, Customer...
// Follow the same pattern: download → upload to R2 → update model field.
```

### 18.4 Backward Compatibility

During migration, serializers output URLs using this priority:
1. If `r2Key` / `coverR2Key` / `photoR2Key` exists → construct CDN URL
2. If R2 key is null but old URL field exists → return Cloudinary URL
3. If both null → return null

This allows gradual migration without breaking existing clients.

---

## 19. Postman Testing Coverage

### 19.1 Collection Structure

```
EverCut Media Migration/
├── 01 — Setup/
│   ├── Auth — Login (get JWT)
│   └── Health Check
│
├── 02 — Image Upload Flow/
│   ├── Request Upload URL (JPEG, purpose: gallery)
│   ├── Request Upload URL (PNG, purpose: avatar)
│   ├── Request Upload URL (WebP, purpose: cover)
│   ├── Direct PUT to Presigned URL
│   ├── Confirm Upload
│   ├── Get Media by ID
│   └── Delete Media
│
├── 03 — Gallery Operations (replaces /photos)/
│   ├── Attach Media to Gallery (POST /media/gallery)
│   ├── Get Gallery (GET /media/gallery)
│   ├── Get Gallery Filtered by Category
│   ├── Attach Over Limit → 400
│   └── Attach Unconfirmed Media → 400
│
├── 04 — Validation Tests/
│   ├── Invalid MIME Type → 400
│   ├── Oversized File → 400
│   ├── Expired Presigned URL → 403
│   ├── Confirm Without Upload → 400
│   ├── Confirm Wrong User → 404
│   ├── Double Confirm → 404 (already ready)
│   └── Invalid MediaId → 404
│
├── 05 — Integration Tests/
│   ├── Upload + Set Shop Cover (PATCH /shops/me/media/cover with mediaId body)
│   ├── Upload + Set Profile Picture (PATCH /shops/me/media/picture with mediaId body)
│   ├── Upload + Add Employee with photoMediaId
│   ├── Upload + Update Customer Profile with photoMediaId
│   ├── Upload + Customer Onboarding with photoMediaId
│   └── Upload + Barber Onboarding with photoMediaId
│
├── 06 — Cleanup Tests/
│   ├── Delete Gallery Media (verify R2 cleanup)
│   ├── Replace Employee Photo (verify old R2 cleanup)
│   └── Replace Cover Image (verify old R2 cleanup)
│
└── 07 — Error Scenarios/
    ├── Unauthorized Upload URL Request → 401
    ├── Upload to Wrong Bucket Key → 403
    └── Concurrent Upload Race Condition
```

### 19.2 Key Test: Complete Gallery Upload Flow

```
// Test: Full Gallery Upload Lifecycle (replaces POST /photos flow)

// Step 1: Request presigned URL
POST {{baseUrl}}/media/upload-url
Authorization: Bearer {{authToken}}
Content-Type: application/json
{
    "contentType": "image/jpeg",
    "sizeBytes": 245760,
    "purpose": "gallery",
    "entityId": "{{shopId}}"
}
// Assert: 201, body.data.uploadUrl exists, body.data.mediaId exists
// Save: pm.collectionVariables.set("mediaId", body.data.mediaId)
// Save: pm.collectionVariables.set("uploadUrl", body.data.uploadUrl)

// Step 2: Upload directly to R2
PUT {{uploadUrl}}
Content-Type: image/jpeg
Body: <binary file>
// Assert: 200

// Step 3: Confirm upload
POST {{baseUrl}}/media/confirm
Authorization: Bearer {{authToken}}
Content-Type: application/json
{
    "mediaId": "{{mediaId}}"
}
// Assert: 200, body.data.cdnUrl exists, body.data.fileSize > 0

// Step 4: Attach to gallery
POST {{baseUrl}}/media/gallery
Authorization: Bearer {{authToken}}
Content-Type: application/json
{
    "mediaIds": ["{{mediaId}}"],
    "category": "work_sample",
    "description": "Latest haircut"
}
// Assert: 201, body.data[0].purpose === "gallery"

// Step 5: Verify gallery
GET {{baseUrl}}/media/gallery
Authorization: Bearer {{authToken}}
// Assert: 200, body.data.length >= 1
```

---

## 20. Rollback Strategy

### 20.1 Rollback Triggers

- Upload success rate drops below 90%
- Confirm endpoint error rate exceeds 5%
- CDN URL construction returns 404s
- Data migration script corrupts existing records

### 20.2 Rollback Procedure

1. **Revert Git** to pre-migration commit (restores all photo.* modules + Cloudinary imports)
2. **Restore .env** with Cloudinary credentials
3. **Reinstall packages** (`npm install` restores cloudinary + multer + multer-storage-cloudinary)
4. **DB fields intact** — old `photoUrl`, `cloudinaryId`, `coverUrl`, `coverCloudinaryId` fields are preserved during migration (not dropped until Phase 5)
5. **Cloudinary images intact** — originals are NOT deleted from Cloudinary until post-migration verification
6. **Photo model intact** — Photo collection in MongoDB is not dropped during migration; Media collection is additive

### 20.3 Point of No Return

The point of no return is **Phase 5** (Cloudinary dependency removal + photo.* deletion) combined with deletion of images from Cloudinary and dropping old DB fields. Until that point, rollback is straightforward.

**Recommendation:** Keep Cloudinary images and old DB fields for 30 days after full migration verification before final cleanup.

---

*End of Backend Migration Guide — Version 2.0*
