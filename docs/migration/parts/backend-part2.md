
## 5. Upload Strategy Decision

### 5.1 Strategy Evaluation

| Strategy | Description | Pros | Cons | Verdict |
|----------|-------------|------|------|---------|
| **Backend Proxy (Current)** | Client → Backend → R2 | Simple; backend controls everything | Bandwidth bottleneck; double transfer; memory pressure; no resume | ❌ Reject |
| **Presigned Direct Upload** | Client → R2 (presigned PUT) | Zero backend bandwidth; linear path; scalable | Two-step flow; URL expiry handling | ✅ **Primary** |
| **Multipart Presigned** | Client → R2 (presigned parts) | Resume support; parallel parts; large file support | Complex client state; part tracking | ✅ **For videos** |
| **Hybrid** | Small files via backend; large via presigned | Best of both | Complex routing; two upload paths | ❌ Over-engineered |
| **tus Protocol** | Client → tus server → R2 | Industry standard resume | Requires tus server deployment; R2 doesn't support natively | ❌ Over-engineered |

### 5.2 Final Upload Strategy

**Decision: Dual-path presigned upload architecture.**

- **Images (< 10 MB):** Single presigned PUT URL. Client uploads directly to R2.
- **Videos (> 10 MB):** Multipart presigned upload. Client uploads parts in parallel to R2.

**Why not hybrid (backend proxy for small files)?**

1. Keeps the backend in the binary data path — the exact anti-pattern being eliminated
2. Doubles testing surface area (two upload implementations)
3. Requires client-side routing logic based on file size
4. Provides no benefit — presigned PUT for a 200KB image is simpler than multipart/form-data

### 5.3 Upload Flow — Images (Detailed)

```
Step 1: REQUEST PRESIGNED URL
──────────────────────────────
Flutter → POST /api/v1/media/upload-url
Headers: Authorization: Bearer {jwt}
Body: {
  "contentType": "image/jpeg",
  "sizeBytes": 245760,
  "purpose": "gallery",
  "entityId": "6654abc..."          // Optional — shopId for gallery, etc.
}

Backend:
  1. Validate JWT → extract userId
  2. Validate contentType against allowlist
  3. Validate sizeBytes against limit (10 MB for images)
  4. Generate UUID for mediaId
  5. Compute R2 object key: `images/{purpose}/{entityContext}/{uuid}.{ext}`
  6. Create Media record (status: 'pending', r2Key, userId)
  7. Generate presigned PUT URL with:
     - ContentType locked to declared type
     - ContentLength locked to declared size
     - Expiry: 15 minutes
  8. Return { mediaId, uploadUrl, r2Key, expiresAt }

Step 2: DIRECT UPLOAD TO R2
───────────────────────────
Flutter → PUT {uploadUrl}
Headers: Content-Type: image/jpeg
         Content-Length: 245760
Body: <raw binary bytes>

R2 validates:
  - Signature matches (presigned URL)
  - Content-Type matches declared type
  - Content-Length matches declared size
  - Not expired

Step 3: CONFIRM UPLOAD
──────────────────────
Flutter → POST /api/v1/media/confirm
Headers: Authorization: Bearer {jwt}
Body: {
  "mediaId": "uuid-from-step-1"
}

Backend:
  1. Validate JWT → extract userId
  2. Find Media record by mediaId where userId matches and status is 'pending'
  3. HeadObject on R2 to verify object exists
  4. Verify Content-Type matches declared type
  5. Download first 16 bytes → magic byte validation
  6. Update Media record:
     - status: 'ready'
     - actualSize: from HeadObject
     - confirmedAt: now
  7. Construct CDN URL from r2Key
  8. Return { mediaId, cdnUrl, r2Key, fileSize, contentType }
```

### 5.4 Upload Flow — Videos (Detailed)

```
Step 1: INITIATE MULTIPART UPLOAD
──────────────────────────────────
Flutter → POST /api/v1/media/video/initiate
Headers: Authorization: Bearer {jwt}
Body: {
  "contentType": "video/mp4",
  "sizeBytes": 52428800,          // 50 MB
  "durationSeconds": 120          // Optional — client-detected
}

Backend:
  1. Validate JWT → extract userId
  2. Validate contentType against video allowlist
  3. Validate sizeBytes against limit (500 MB for videos)
  4. Generate UUID for videoId
  5. Compute R2 key: `videos/raw/{videoId}.mp4`
  6. CreateMultipartUpload on R2 → receive uploadId
  7. Calculate part count (ceil(sizeBytes / 50MB))
  8. Generate presigned part URLs (TTL: 15 min each)
  9. Create Media record (status: 'uploading', type: 'video')
  10. Return { videoId, uploadId, parts: [{partNumber, uploadUrl}], expiresAt }

Step 2: UPLOAD PARTS (PARALLEL)
───────────────────────────────
Flutter uploads each 50MB chunk to its presigned URL.
Concurrency: 3 parts in parallel on mobile.
Collect ETag from each response → persist to SecureStorage.

Step 3: EXPIRED PART URL RE-ISSUE
──────────────────────────────────
If a part upload returns 403 (URL expired):
Flutter → POST /api/v1/media/video/part-url/{videoId}/{partNumber}
Backend → generates new presigned URL for that part.

Step 4: COMPLETE MULTIPART
──────────────────────────
Flutter → POST /api/v1/media/video/complete
Body: {
  "videoId": "uuid",
  "uploadId": "r2-multipart-id",
  "parts": [
    { "partNumber": 1, "etag": "\"abc123...\"" },
    { "partNumber": 2, "etag": "\"def456...\"" }
  ]
}

Backend:
  1. CompleteMultipartUpload on R2 with parts + ETags
  2. Update Media record (status: 'processing')
  3. Enqueue transcoding job (BullMQ — future phase)
  4. Return { videoId, status: 'processing' }
```

### 5.5 R2 Object Key Design

```
R2 Bucket: evercut-media-{env}

Key Structure:
images/
├── avatars/{userId}/{uuid}.jpg          → Customer profile photos
├── profiles/{userId}/{uuid}.jpg         → Barber owner profile photos
├── covers/{shopId}/{uuid}.jpg           → Shop cover images
├── gallery/{shopId}/{uuid}.jpg          → Shop gallery photos
├── employees/{shopId}/{uuid}.jpg        → Employee photos
├── onboarding/{sessionId}/{uuid}.jpg    → Onboarding (promoted on completion)
└── services/{folder}/{serviceName}.jpg  → Service catalog images (seeded)

videos/
├── raw/{videoId}.mp4                    → Raw upload (deleted after transcode)
└── hls/{videoId}/
    ├── master.m3u8
    ├── 720p.m3u8
    ├── 480p.m3u8
    └── segments/
        ├── 720p_0000.ts
        └── 480p_0000.ts

thumbnails/
└── videos/{videoId}/
    ├── thumb_lg.jpg
    ├── thumb_sm.jpg
    └── preview.webp
```

**Key design principles:**
1. Keys generated server-side only — never trust client-provided keys
2. UUID-based — no PII in keys
3. Path-structured with `/` for logical grouping
4. Extension derived from validated content type
5. Database stores only the key string — never the full CDN URL

---

## 6. Database Schema Migration

### 6.1 New Unified Media Model (Replaces Photo Model)

```javascript
// models/media.model.js — NEW (replaces photo.model.js)
import mongoose from 'mongoose';
import {
    ALL_MEDIA_TYPES,
    ALL_MEDIA_STATUSES,
    ALL_MEDIA_PURPOSES,
    ALL_MEDIA_ENTITY_TYPES,
    ALL_GALLERY_CATEGORIES,
} from '../utils/constants.js';

const mediaSchema = new mongoose.Schema(
    {
        // ── Who uploaded ─────────────────────────────
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // ── What it is ───────────────────────────────
        type: {
            type: String,
            enum: ALL_MEDIA_TYPES,        // 'image', 'video'
            required: true,
        },
        status: {
            type: String,
            enum: ALL_MEDIA_STATUSES,     // 'pending', 'ready', 'processing', 'failed', 'deleted'
            default: 'pending',
            required: true,
        },
        purpose: {
            type: String,
            enum: ALL_MEDIA_PURPOSES,
            required: true,
        },

        // ── Where it lives ───────────────────────────
        r2Key: {
            type: String,
            required: true,
            unique: true,
        },
        r2Bucket: {
            type: String,
            required: true,
        },
        contentType: {
            type: String,
            required: true,
        },
        declaredSize: {
            type: Number,
            required: true,
        },
        actualSize: {
            type: Number,
            default: null,
        },

        // ── Domain association (replaces photo.shopId) ─
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
        },
        entityType: {
            type: String,
            enum: ALL_MEDIA_ENTITY_TYPES, // 'Shop', 'Employee', 'Customer', 'Service', null
            default: null,
        },

        // ── Domain metadata (replaces photo-specific fields) ─
        metadata: {
            category: {
                type: String,
                enum: [...ALL_GALLERY_CATEGORIES, null],
                default: null,
            },
            description: {
                type: String,
                maxlength: 500,
                default: null,
            },
            originalName: {
                type: String,
                default: null,
            },
        },

        // ── Video-specific ───────────────────────────
        durationSeconds: { type: Number, default: null },
        multipartUploadId: { type: String, default: null },
        hlsR2Prefix: { type: String, default: null },
        thumbnailR2Key: { type: String, default: null },

        // ── Upload lifecycle ─────────────────────────
        uploadExpiresAt: {
            type: Date,
            required: true,
        },
        confirmedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────
mediaSchema.index({ entityId: 1, entityType: 1, status: 1 });
mediaSchema.index({ userId: 1, status: 1 });
mediaSchema.index({ status: 1, createdAt: 1 });
mediaSchema.index({ uploadExpiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL for pending

// ── Statics (replaces Photo.getActiveCountByShop) ────
mediaSchema.statics.countByEntity = function (entityId, entityType, extraFilter = {}) {
    return this.countDocuments({
        entityId,
        entityType,
        status: 'ready',
        ...extraFilter,
    });
};

const Media = mongoose.model('Media', mediaSchema);
export default Media;
```

### 6.2 Photo Model — DELETED

The `photo.model.js` file is deleted entirely. All its functionality is absorbed into `media.model.js`:

| Photo Model Field | Media Model Equivalent |
|---|---|
| `shopId` | `entityId` + `entityType: 'Shop'` |
| `photoUrl` | `r2Key` (URL constructed at serialization time) |
| `cloudinaryId` | Not needed — `r2Key` serves as unique identifier |
| `photoName` | `metadata.originalName` |
| `photoType` | `metadata.category` |
| `description` | `metadata.description` |
| `fileSize` | `actualSize` |
| `mimeType` | `contentType` |
| `isActive` | `status !== 'deleted'` |
| `getActiveCountByShop(shopId)` | `countByEntity(shopId, 'Shop', { purpose: 'gallery' })` |

### 6.3 Existing Model Migrations

#### Shop Model Changes

```diff
// models/shop.model.js
-        coverUrl: {
-            type: String,
-            default: null,
-        },
-        coverCloudinaryId: {
-            type: String,
-            default: null,
-        },
-        ownerPhotoUrl: {
-            type: String,
-            default: null,
-        },
-        ownerPhotoCloudinaryId: {
-            type: String,
-            default: null,
-        },
+        coverR2Key: {
+            type: String,
+            default: null,
+        },
+        ownerPhotoR2Key: {
+            type: String,
+            default: null,
+        },
```

#### Employee Model Changes

```diff
// models/employee.model.js
-        photoUrl: {
-            type: String,
-            default: null,
-        },
-        cloudinaryId: {
-            type: String,
-            default: null,
-        },
+        photoR2Key: {
+            type: String,
+            default: null,
+        },
```

#### Customer Model Changes

```diff
// models/customer.model.js
-        photoUrl: {
-            type: String,
-            default: null,
-        },
-        cloudinaryId: {
-            type: String,
-            default: null,
-        },
+        photoR2Key: {
+            type: String,
+            default: null,
+        },
```

### 6.4 Constants Updates

```javascript
// utils/constants.js — REMOVE existing photo constants, ADD media constants

// ── REMOVE ───────────────────────────────────────────
// export const PHOTO_TYPE = Object.freeze({ ... });
// export const ALL_PHOTO_TYPES = Object.values(PHOTO_TYPE);
// export const MAX_PHOTOS_PER_SHOP = 10;

// ── ADD ──────────────────────────────────────────────

// ---------------------------------------------------------------------------
// Media Types
// ---------------------------------------------------------------------------
export const MEDIA_TYPE = Object.freeze({
    IMAGE: 'image',
    VIDEO: 'video',
});
export const ALL_MEDIA_TYPES = Object.values(MEDIA_TYPE);

// ---------------------------------------------------------------------------
// Media Statuses
// ---------------------------------------------------------------------------
export const MEDIA_STATUS = Object.freeze({
    PENDING: 'pending',
    READY: 'ready',
    PROCESSING: 'processing',
    FAILED: 'failed',
    DELETED: 'deleted',
});
export const ALL_MEDIA_STATUSES = Object.values(MEDIA_STATUS);

// ---------------------------------------------------------------------------
// Media Purposes
// ---------------------------------------------------------------------------
export const MEDIA_PURPOSE = Object.freeze({
    AVATAR: 'avatar',
    PROFILE: 'profile',
    COVER: 'cover',
    GALLERY: 'gallery',
    EMPLOYEE: 'employee',
    ONBOARDING: 'onboarding',
    SERVICE: 'service',
    VIDEO_RAW: 'video_raw',
    VIDEO_THUMBNAIL: 'video_thumbnail',
});
export const ALL_MEDIA_PURPOSES = Object.values(MEDIA_PURPOSE);

// ---------------------------------------------------------------------------
// Media Entity Types (for polymorphic association)
// ---------------------------------------------------------------------------
export const MEDIA_ENTITY_TYPE = Object.freeze({
    SHOP: 'Shop',
    EMPLOYEE: 'Employee',
    CUSTOMER: 'Customer',
    SERVICE: 'Service',
});
export const ALL_MEDIA_ENTITY_TYPES = [...Object.values(MEDIA_ENTITY_TYPE), null];

// ---------------------------------------------------------------------------
// Gallery Categories (replaces PHOTO_TYPE)
// ---------------------------------------------------------------------------
export const GALLERY_CATEGORY = Object.freeze({
    SHOP_INTERIOR: 'shop_interior',
    SHOP_EXTERIOR: 'shop_exterior',
    WORK_SAMPLE: 'work_sample',
    BEFORE_AFTER: 'before_after',
    TEAM: 'team',
    OTHER: 'other',
});
export const ALL_GALLERY_CATEGORIES = Object.values(GALLERY_CATEGORY);

// ---------------------------------------------------------------------------
// Media Limits
// ---------------------------------------------------------------------------
export const MEDIA_LIMITS = Object.freeze({
    MAX_IMAGE_SIZE: 10 * 1024 * 1024,          // 10 MB
    MAX_VIDEO_SIZE: 500 * 1024 * 1024,         // 500 MB
    MAX_GALLERY_PER_SHOP: 10,                  // replaces MAX_PHOTOS_PER_SHOP
    PRESIGNED_URL_TTL: 15 * 60,                // 15 minutes (seconds)
    MULTIPART_PART_SIZE: 50 * 1024 * 1024,     // 50 MB per part
    MAX_MULTIPART_PARTS: 100,
    PENDING_UPLOAD_TTL_HOURS: 24,              // Auto-delete unconfirmed uploads
});

// ---------------------------------------------------------------------------
// Allowed MIME Types
// ---------------------------------------------------------------------------
export const ALLOWED_IMAGE_MIMES = Object.freeze([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);

export const ALLOWED_VIDEO_MIMES = Object.freeze([
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
]);

export const ALLOWED_MEDIA_MIMES = Object.freeze([
    ...ALLOWED_IMAGE_MIMES,
    ...ALLOWED_VIDEO_MIMES,
]);

// ---------------------------------------------------------------------------
// Content Type → Extension Mapping
// ---------------------------------------------------------------------------
export const MIME_TO_EXTENSION = Object.freeze({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/webm': 'webm',
});
```

