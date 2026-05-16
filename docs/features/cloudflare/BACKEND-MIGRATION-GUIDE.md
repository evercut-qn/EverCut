# EverCut — Backend Migration & Implementation Guide
## Cloudinary → Cloudflare R2 Unified Media Architecture

**Document Version:** 2.0  
**Date:** May 2026  
**Stack:** Node.js + Express.js · Mongoose · MongoDB  
**Classification:** Production Migration Blueprint

---

## Table of Contents

1. [Architecture Audit — Current State](#1-architecture-audit--current-state)
2. [Cloudinary Dependency Map](#2-cloudinary-dependency-map)
3. [Requirement Analysis](#3-requirement-analysis)
4. [Target Architecture Design](#4-target-architecture-design)
5. [Upload Strategy Decision](#5-upload-strategy-decision)
6. [Database Schema Migration](#6-database-schema-migration)
7. [Implementation Guide — R2 Configuration](#7-implementation-guide--r2-configuration)
8. [Implementation Guide — Storage Provider](#8-implementation-guide--storage-provider)
9. [Implementation Guide — Media Validation Service](#9-implementation-guide--media-validation-service)
10. [Implementation Guide — Media URL Service](#10-implementation-guide--media-url-service)
11. [Implementation Guide — Media Service (Core)](#11-implementation-guide--media-service-core)
12. [Implementation Guide — Media Controller & Routes](#12-implementation-guide--media-controller--routes)
13. [Implementation Guide — Service Layer Refactoring](#13-implementation-guide--service-layer-refactoring)
14. [Implementation Guide — Serializer Updates](#14-implementation-guide--serializer-updates)
15. [Implementation Guide — Onboarding Service Refactoring](#15-implementation-guide--onboarding-service-refactoring)
16. [Implementation Guide — Cleanup & Lifecycle](#16-implementation-guide--cleanup--lifecycle)
17. [Environment Variables & Config](#17-environment-variables--config)
18. [Migration Execution Strategy](#18-migration-execution-strategy)
19. [Postman Testing Coverage](#19-postman-testing-coverage)
20. [Rollback Strategy](#20-rollback-strategy)

---

## 1. Architecture Audit — Current State

### 1.1 Current Upload Architecture

```
CURRENT FLOW (all media types):
┌───────────┐     multipart/form-data     ┌──────────────┐     Cloudinary SDK     ┌───────────────┐
│  Flutter  │ ──────────────────────────► │  Node.js API │ ─────────────────────► │  Cloudinary   │
│   Client  │                             │  (Express)   │                        │  (CDN + Store)│
└───────────┘                             └──────┬───────┘                        └──────┬────────┘
                                                 │                                       │
                                                 │ Store URL + publicId                  │ Returns:
                                                 ▼                                       │ - secure_url
                                          ┌──────────────┐                               │ - public_id
                                          │   MongoDB    │ ◄─────────────────────────────┘
                                          │  (Full URLs) │
                                          └──────────────┘
```

**Key characteristics:**
- Backend proxies ALL binary data (anti-pattern for scalability)
- Multer receives file into memory/temp → CloudinaryStorage streams to Cloudinary
- Full Cloudinary URLs stored in database (vendor lock-in)
- `cloudinaryId` (public_id) stored for deletion capability
- No presigned URLs — no direct client uploads
- No video support — image-only architecture
- Transformations applied at upload time (width/height cropping via Cloudinary SDK)
- Photo-specific architecture (dedicated photo module) — not extensible to videos/files

### 1.2 Current Module Inventory

| Layer | File | Media Role | Migration Action |
|-------|------|------------|------------------|
| **Config** | `config/cloudinary.config.js` | Cloudinary SDK initialization | **DELETE** |
| **Config** | `config/index.js` | Cloudinary credentials, upload limits | **MODIFY** |
| **Middleware** | `middleware/upload.middleware.js` | 6 Multer+CloudinaryStorage instances | **DELETE** |
| **Service** | `services/photo.service.js` | Gallery upload, delete, cover update | **DELETE** (absorbed into media) |
| **Service** | `services/user.service.js` | Customer profile photo update | **MODIFY** |
| **Service** | `services/employee.service.js` | Employee photo CRUD + cleanup | **MODIFY** |
| **Service** | `services/account.service.js` | Barber profile picture update | **MODIFY** |
| **Service** | `services/onboarding.service.js` | Customer + barber onboarding photos | **MODIFY** |
| **Service** | `services/service-catalog.service.js` | Service image resolution from Cloudinary | **MODIFY** |
| **Service** | `services/shop.service.js` | Uses photoRepository for gallery data | **MODIFY** |
| **Service** | `services/auth.service.js` | Uses photoRepository for login response | **MODIFY** |
| **Model** | `models/photo.model.js` | Photo schema (photoUrl, cloudinaryId) | **DELETE** (absorbed into media) |
| **Model** | `models/shop.model.js` | coverUrl, coverCloudinaryId, ownerPhotoUrl, ownerPhotoCloudinaryId | **MODIFY** |
| **Model** | `models/employee.model.js` | photoUrl, cloudinaryId | **MODIFY** |
| **Model** | `models/customer.model.js` | photoUrl, cloudinaryId | **MODIFY** |
| **Repository** | `repositories/photo.repository.js` | Photo CRUD operations | **DELETE** (absorbed into media) |
| **Controller** | `controllers/photo.controller.js` | Gallery photo endpoints | **DELETE** (absorbed into media) |
| **Controller** | `controllers/shop.controller.js` | Cover + profile picture endpoints | **MODIFY** |
| **Routes** | `routes/photos.routes.js` | Gallery routes | **DELETE** (absorbed into media) |
| **Routes** | `routes/shops.routes.js` | Cover/picture upload routes | **MODIFY** |
| **Routes** | `routes/employees.routes.js` | Employee photo routes | **MODIFY** |
| **Routes** | `routes/customers.routes.js` | Customer photo routes | **MODIFY** |
| **Routes** | `routes/onboarding.routes.js` | Onboarding photo routes | **MODIFY** |
| **Routes** | `routes/index.js` | Registers /photos route | **MODIFY** |
| **Serializer** | `serializers/photo.serializer.js` | Photo response shaping | **DELETE** (absorbed into media) |
| **Serializer** | `serializers/core.serializer.js` | Strips cloudinaryId from responses | **MODIFY** |
| **Validator** | `validators/photo.validator.js` | Photo upload/filter validation | **DELETE** (absorbed into media) |
| **Utils** | `utils/upload-cleanup.utils.js` | Cleanup uploaded assets on validation failure | **DELETE** |
| **Utils** | `utils/constants.js` | PHOTO_TYPE enum | **MODIFY** |

### 1.3 Upload Entry Points

| Route | Method | Middleware | Handler | Purpose |
|-------|--------|-----------|---------|---------|
| `POST /photos` | uploadShopPhotos | `multer.array('photos', 10)` | `photo.controller.uploadPhotos` | Gallery photos |
| `PATCH /shops/me/media/cover` | uploadShopCover | `multer.single('cover')` | `shop.controller.updateMyCover` | Shop cover image |
| `PATCH /shops/me/media/picture` | uploadBarberProfilePhoto | `multer.single('photo')` | `shop.controller.updateMyPicture` | Barber profile pic |
| `POST /employees` | uploadEmployeePhoto | `multer.single('photo')` | `employee.controller.addEmployee` | Employee photo |
| `PATCH /employees/:id` | uploadEmployeePhoto | `multer.single('photo')` | `employee.controller.updateEmployee` | Employee photo update |
| `PATCH /customers/me` | uploadCustomerPhoto | `multer.single('photo')` | `customer.controller.updateMe` | Customer profile |
| `POST /onboarding/customers` | uploadCustomerPhoto | `multer.single('photo')` | `onboarding.createCustomerOnboarding` | Customer signup |
| `POST /onboarding/barbers` | uploadBarberOnboardingImage | `multer.single('photo')` | `onboarding.createBarberOnboarding` | Barber signup |

### 1.4 Cloudinary Folder Structure (Current)

```
evercut/
├── customers/{userId}/          → Customer profile photos
├── shops/
│   ├── profile/{userId}/        → Barber owner profile photo
│   ├── cover/{userId}/          → Shop cover image
│   ├── gallery/{userId}/        → Gallery photos (multi-upload)
│   ├── employees/{userId}/      → Employee photos
│   └── onboarding/{phoneNumber}/ → Onboarding images
├── single/{serviceName}/        → Service catalog images (pre-uploaded)
├── bundled/{serviceName}/       → Bundle catalog images (pre-uploaded)
└── default/
    └── service.jpg              → Default service fallback image
```

---

## 2. Cloudinary Dependency Map

### 2.1 Direct Cloudinary SDK Usage

| File | Import | Operations Used |
|------|--------|-----------------|
| `config/cloudinary.config.js` | `v2 as cloudinary` | `.config()` — SDK initialization |
| `middleware/upload.middleware.js` | `CloudinaryStorage` from `multer-storage-cloudinary` | Storage engine for all uploads |
| `services/photo.service.js` | `cloudinary` | `uploader.destroy()` — delete gallery/cover photos |
| `services/user.service.js` | `cloudinary` | `uploader.destroy()` — delete old customer photos |
| `services/employee.service.js` | `cloudinary` | `uploader.destroy()` — delete employee photos |
| `services/account.service.js` | `cloudinary` | `uploader.destroy()` — delete barber profile pics |
| `services/service-catalog.service.js` | `cloudinary` | `api.resource()` — check if image exists; `cloudinary.url()` — construct fallback URL |
| `utils/upload-cleanup.utils.js` | `cloudinary` | `uploader.destroy()` — cleanup on validation failures |

### 2.2 NPM Dependencies to Remove

| Package | Version | Used By |
|---------|---------|---------|
| `cloudinary` | `^2.9.0` | All services above |
| `multer-storage-cloudinary` | `^4.0.0` | `middleware/upload.middleware.js` |
| `multer` | `^2.0.2` | `middleware/upload.middleware.js` |

### 2.3 NPM Dependencies to Add

| Package | Purpose |
|---------|---------|
| `@aws-sdk/client-s3` | S3-compatible R2 client (PutObject, GetObject, DeleteObject, HeadObject, multipart) |
| `@aws-sdk/s3-request-presigner` | Generate presigned upload/download URLs |
| `uuid` | Generate UUIDs for media object keys |

### 2.4 Database Fields Storing Cloudinary Data

| Model | Field | Current Content | Migration Action |
|-------|-------|-----------------|------------------|
| `Photo` | `photoUrl` | Full Cloudinary URL | **Model deleted** — absorbed into Media |
| `Photo` | `cloudinaryId` | Cloudinary public_id | **Model deleted** — absorbed into Media |
| `Shop` | `coverUrl` | Full Cloudinary URL | → `coverR2Key` |
| `Shop` | `coverCloudinaryId` | Cloudinary public_id | → Remove |
| `Shop` | `ownerPhotoUrl` | Full Cloudinary URL | → `ownerPhotoR2Key` |
| `Shop` | `ownerPhotoCloudinaryId` | Cloudinary public_id | → Remove |
| `Employee` | `photoUrl` | Full Cloudinary URL | → `photoR2Key` |
| `Employee` | `cloudinaryId` | Cloudinary public_id | → Remove |
| `Customer` | `photoUrl` | Full Cloudinary URL | → `photoR2Key` |
| `Customer` | `cloudinaryId` | Cloudinary public_id | → Remove |

### 2.5 Sensitive Keys in Core Serializer

`serializers/core.serializer.js` strips these from API responses:
- `cloudinaryId`
- `coverCloudinaryId`
- `ownerPhotoCloudinaryId`

These must be updated to strip R2-specific internal fields instead.

---

## 3. Requirement Analysis

### 3.1 Architectural Decision: Unified Media vs Photo + Media Split

**Decision:** Remove all `photo.*` modules entirely. Consolidate into a single `media.*` module.

**Rationale — why `photo.*` should not survive:**

The `photo.*` module (7 files, ~282 lines) contains **zero domain logic** unique to "photos":

| Photo-specific concept | Generic media equivalent |
|---|---|
| `shopId` | `entityId` + `entityType: 'Shop'` |
| `config.upload.maxPhotosPerShop = 10` | `config.media.maxGalleryPerShop` in `config/index.js` |
| `isActive` soft-delete | `status: 'deleted'` |
| `fileSize`, `mimeType` | `actualSize`, `contentType` |

Keeping both modules creates confusion ("do I import photo.service or media.service?"), duplicates patterns (both would have serializers, validators, repositories), and blocks future extensibility (video gallery would need a third module).

### 3.2 Current Architecture Strengths

| Strength | Details |
|----------|---------|
| Clean layer separation | Controller → Service → Repository → Model pattern consistently applied |
| Centralized upload middleware | Single `upload.middleware.js` handles all upload variants |
| Serializer-based response shaping | Sensitive fields stripped; response contracts enforced |
| Validation middleware | Joi schemas validate before handler execution |
| Error handler catches Multer errors | `error-handler.middleware.js` handles MulterError specifically |
| Upload cleanup on failure | `upload-cleanup.utils.js` destroys orphaned assets |

### 3.3 Current Architecture Weaknesses

| Weakness | Impact | Migration Fix |
|----------|--------|---------------|
| Backend proxies all binary data | CPU/memory/bandwidth bottleneck | Presigned direct upload |
| Full URLs stored in DB | Vendor lock-in; domain change = data migration | Store R2 object keys only |
| No upload confirmation step | Cannot validate file after upload | Two-phase: presign → confirm |
| No magic byte validation | MIME type trust from client header only | Post-upload magic byte check |
| No video support | Cannot scale to multimedia | Generic media architecture |
| Single upload strategy | No multipart/resumable support | Multipart for large files |
| Transformations at upload time | Fixed dimensions; no on-demand variants | CDN-based transforms |
| No media token system | URLs are permanent; no access revocation | HMAC-signed media tokens |
| Service catalog uses Cloudinary API for image resolution | Tight coupling to Cloudinary API | Static R2 key mapping |
| Photo-specific module | Cannot extend to video/file without new modules | Unified media module |

### 3.4 Migration Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Existing data has Cloudinary URLs in DB | **High** | DB migration script to convert URLs → R2 keys |
| Existing images stored in Cloudinary | **High** | Batch copy from Cloudinary to R2 before cutover |
| Multiple services coupled to Cloudinary `destroy()` | **Medium** | Replace with `storageProvider.deleteObject()` |
| Flutter app sends `multipart/form-data` to backend | **High** | New Flutter upload flow using presigned URLs |
| Service catalog image resolution via Cloudinary API | **Medium** | Seed R2 with service images; use static key mapping |
| `photo.*` consumers (shop.service, auth.service, onboarding) | **Medium** | Replace with `mediaRepository` queries |
| 7 photo module files deleted simultaneously | **Medium** | Unified media module covers all functionality |

---

## 4. Target Architecture Design

### 4.1 Architecture Decision: "Media" Naming Convention

**Decision:** Use `media` as the sole module namespace for all storage, upload, and content management.

**Rationale:**
- The system handles photos, profile pictures, cover images, and will add videos — all are "media"
- `files` implies generic document management (PDFs, spreadsheets) — not this domain
- `assets` conflicts with static build assets semantically
- `media` naturally encompasses images, videos, thumbnails, and previews
- The research document consistently uses `media` as the namespace
- No separate `photo.*` module — all photo functionality absorbed into `media.*`

### 4.2 Final Target Architecture

```
TARGET FLOW (Image Upload):
┌────────────┐  POST /api/v1/media/upload-url  ┌──────────────┐
│  Flutter   │ ──────────────────────────────► │  Node.js API │
│   Client   │                                 │  (Express)   │
│            │  ◄─── { uploadUrl, mediaId }    │              │
│            │                                 │  - Validate  │
│            │  PUT {presigned_url}            │  - Gen UUID  │
│            │ ──────────────────────────────► │  - Gen URL   │──► R2 (direct)
│            │                                 │              │
│            │  POST /api/v1/media/confirm     │              │
│            │ ──────────────────────────────► │  - HeadObject│
│            │  ◄─── { cdnUrl, mediaId }       │  - Validate  │
└────────────┘                                 │  - Update DB │
                                               └──────────────┘
```

```
TARGET FLOW (Video Upload — Multipart):
┌────────────┐  POST /api/v1/media/video/initiate  ┌──────────────┐
│  Flutter   │ ──────────────────────────────────► │  Node.js API │
│            │  ◄─── { videoId, uploadId, parts }  │              │
│            │                                     │              │
│            │  PUT {part_urls} × N (parallel)     │              │
│            │ ──────────────────────────────────► │              │──► R2 (direct)
│            │                                     │              │
│            │  POST /api/v1/media/video/complete  │              │
│            │ ──────────────────────────────────► │  - Complete  │
│            │  ◄─── { videoId, status }           │  - Enqueue   │
└────────────┘                                     └──────────────┘
```

### 4.3 Module Architecture

```
server/src/
├── config/
│   ├── r2.config.js                    ← NEW: R2 S3Client initialization
│   ├── index.js                        ← MODIFY: Remove cloudinary, add R2 config
│   └── cloudinary.config.js            ← DELETE
│
├── middleware/
│   ├── upload.middleware.js             ← DELETE entirely
│   └── error-handler.middleware.js      ← MODIFY: Remove MulterError handling
│
├── services/
│   ├── media/
│   │   ├── storage-provider.service.js  ← NEW: R2 operations (put, delete, head, presign)
│   │   ├── media.service.js             ← NEW: Upload orchestration + gallery CRUD + entity attachment
│   │   ├── media-url.service.js         ← NEW: CDN URL construction + HMAC tokens
│   │   ├── media-validation.service.js  ← NEW: Magic byte validation, MIME checks
│   │   └── media-cleanup.service.js     ← NEW: Orphan cleanup, lifecycle management
│   │
│   ├── photo.service.js                 ← DELETE (absorbed into media.service)
│   ├── user.service.js                  ← MODIFY: Remove Cloudinary, use media
│   ├── employee.service.js              ← MODIFY: Remove Cloudinary, use media
│   ├── account.service.js               ← MODIFY: Remove Cloudinary, use media
│   ├── onboarding.service.js            ← MODIFY: Remove Cloudinary + photoRepository, use media
│   ├── shop.service.js                  ← MODIFY: Replace photoRepository with mediaRepository
│   ├── auth.service.js                  ← MODIFY: Replace photoRepository with mediaRepository
│   └── service-catalog.service.js       ← MODIFY: Remove Cloudinary API calls
│
├── controllers/
│   ├── media.controller.js              ← NEW: Upload, confirm, gallery, delete endpoints
│   ├── photo.controller.js              ← DELETE (absorbed into media.controller)
│   └── shop.controller.js               ← MODIFY: Use media service for cover/picture
│
├── routes/
│   ├── media.routes.js                  ← NEW: /api/v1/media/* (upload + gallery + CRUD)
│   ├── photos.routes.js                 ← DELETE (absorbed into media.routes)
│   ├── shops.routes.js                  ← MODIFY: Remove upload middleware
│   ├── employees.routes.js              ← MODIFY: Remove upload middleware
│   ├── customers.routes.js              ← MODIFY: Remove upload middleware
│   ├── onboarding.routes.js             ← MODIFY: Remove upload middleware
│   └── index.js                         ← MODIFY: Replace /photos with /media
│
├── models/
│   ├── media.model.js                   ← NEW: Unified media schema (replaces photo.model)
│   ├── photo.model.js                   ← DELETE (absorbed into media.model)
│   ├── shop.model.js                    ← MODIFY: *R2Key fields replace *Url + *CloudinaryId
│   ├── employee.model.js                ← MODIFY: photoR2Key replaces photoUrl + cloudinaryId
│   └── customer.model.js                ← MODIFY: photoR2Key replaces photoUrl + cloudinaryId
│
├── repositories/
│   ├── media.repository.js              ← NEW: Media CRUD + entity-scoped queries
│   └── photo.repository.js              ← DELETE (absorbed into media.repository)
│
├── serializers/
│   ├── media.serializer.js              ← NEW: Media response shaping (replaces photo.serializer)
│   ├── photo.serializer.js              ← DELETE (absorbed into media.serializer)
│   └── core.serializer.js               ← MODIFY: Update sensitive keys list
│
├── validators/
│   ├── media.validator.js               ← NEW: Upload, confirm, gallery, video schemas
│   └── photo.validator.js               ← DELETE (absorbed into media.validator)
│
├── utils/
│   ├── upload-cleanup.utils.js          ← DELETE (replaced by media-cleanup.service)
│   └── constants.js                     ← MODIFY: Add media enums, remove PHOTO_TYPE
│
└── jobs/
    └── media-cleanup.cron.js            ← NEW: Orphan media cleanup cron
```

### 4.4 API Route Design

**New unified media routes:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/media/upload-url` | JWT | Generate presigned PUT URL |
| `POST` | `/api/v1/media/confirm` | JWT | Validate and confirm upload |
| `GET` | `/api/v1/media/:id` | JWT | Get media metadata + CDN URL |
| `DELETE` | `/api/v1/media/:id` | JWT | Soft-delete media |
| `POST` | `/api/v1/media/gallery` | JWT (Barber) | Attach confirmed media to shop gallery |
| `GET` | `/api/v1/media/gallery` | JWT (Barber) | Get shop gallery with filters |
| `POST` | `/api/v1/media/video/initiate` | JWT | Start multipart video upload |
| `POST` | `/api/v1/media/video/part-url/:videoId/:partNumber` | JWT | Re-issue expired part URL |
| `POST` | `/api/v1/media/video/complete` | JWT | Complete multipart upload |

**Existing routes that CHANGE behavior (URL stays the same):**

| Route | Change |
|-------|--------|
| `PATCH /shops/me/media/cover` | No longer accepts file upload; accepts `{ mediaId }` in JSON body |
| `PATCH /shops/me/media/picture` | No longer accepts file upload; accepts `{ mediaId }` in JSON body |
| `POST /employees` | `photo` field becomes `photoMediaId` in JSON body |
| `PATCH /employees/:id` | Same — `photoMediaId` replaces file field |
| `PATCH /customers/me` | Same — `photoMediaId` replaces file field |
| `POST /onboarding/customers` | Same — `photoMediaId` replaces file field |
| `POST /onboarding/barbers` | Same — `photoMediaId` replaces file field |

**Routes removed:**

| Route | Replacement |
|-------|-------------|
| `POST /photos` | `POST /media/gallery` |
| `GET /photos` | `GET /media/gallery` |
| `GET /photos/:id` | `GET /media/:id` |
| `DELETE /photos/:id` | `DELETE /media/:id` |
| `GET /photos/stats` | `GET /media/gallery/stats` (optional, in media.controller) |



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
}

Backend:
  1. Validate JWT → extract userId
  2. Validate contentType against allowlist
  3. Validate sizeBytes against limit (10 MB for images)
  4. Generate UUID for mediaId
  5. Compute R2 object key: `images/{purpose}/{userId}/{uuid}.{ext}`
  6. Create Media record (status: 'pending', r2Key, userId)
  7. Generate presigned PUT URL with:
     - ContentType locked to declared type
     - Content-Length is not signed because browser clients cannot set it manually
     - X-Amz-Content-Sha256 and X-Amz-Date remain in the query string
     - Expiry: 15 minutes
  8. Return { mediaId, uploadUrl, r2Key, expiresAt }

Step 2: DIRECT UPLOAD TO R2
───────────────────────────
Flutter → PUT {uploadUrl}
Headers: Content-Type: image/jpeg
Body: <raw binary bytes>

R2 validates:
  - Signature matches (presigned URL)
  - Content-Type matches declared type
  - Required signed headers are present
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

### 6.4 Constants & Config Updates

The media migration affects both `utils/constants.js` (enums — immutable system truths) and `config/index.js` (business rules — mutable limits, thresholds, and allowlists).

#### 6.4.1 Constants Updates (`utils/constants.js`)

Constants hold **only enum-like values that never change per environment or product decision.** A media type will always be `'image'` or `'video'`; a status will always be one of a fixed set of strings. These are true constants.

```javascript
// utils/constants.js — REMOVE existing photo constants, ADD media enums

// ── REMOVE ───────────────────────────────────────────
// export const PHOTO_TYPE = Object.freeze({ ... });
// export const ALL_PHOTO_TYPES = Object.values(PHOTO_TYPE);

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

#### 6.4.2 Config Updates (`config/index.js`)

Upload size limits, MIME allowlists, gallery caps, and presigned URL TTLs are **configurations** — mutable business levers that can change with product requirements (e.g., raising the image size limit from 10 MB to 15 MB, or expanding allowed MIME types). They belong in `config/index.js` alongside other business rule blocks (`booking`, `payment`, `shop`).

```javascript
// config/index.js — ADD media configuration block (replaces pruned upload block)

  /** Media business rules */
  media: Object.freeze({
    maxImageSize: 10 * 1024 * 1024,          // 10 MB
    maxVideoSize: 500 * 1024 * 1024,         // 500 MB
    maxGalleryPerShop: 10,                   // replaces config.upload.maxPhotosPerShop
    maxFiles: 10,                            // max items per multi-upload request
    presignedUrlTtl: 15 * 60,               // 15 minutes (seconds)
    multipartPartSize: 50 * 1024 * 1024,     // 50 MB per part
    maxMultipartParts: 100,
    pendingUploadTtlHours: 24,               // Auto-delete unconfirmed uploads
    allowedImageMimes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ],
    allowedVideoMimes: [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
    ],
  }),
```



## 7. Implementation Guide — R2 Configuration

### 7.0 Config Architecture Overview

Before adding the R2 block, understand the patterns already established in `config/index.js`. Every new config section must follow these conventions.

#### Env-var helper functions

Three helpers defined at the top of `config/index.js` control how environment variables are loaded:

| Helper | Behaviour | Used for |
|--------|-----------|---------|
| `requireEnv(key)` | Throws at startup if the variable is absent — always, in every environment | `MONGODB_URI`, Firebase creds, JWT secrets, MSG91 keys, **all R2 vars** |
| `optionalEnv(key, fallback)` | Returns the fallback when the variable is absent | `PORT`, `NODE_ENV`, timeout values, non-critical knobs |
| `providerEnv(key, fallback)` | Uses the fallback in development; throws in production if absent | PhonePe, Cashfree payment-gateway credentials |

All six R2 environment variables (`CF_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `CDN_BASE_URL`, `MEDIA_TOKEN_SECRET`) are loaded via `requireEnv`. A missing variable fails the process at startup — never silently in a live request.

#### Object.freeze pattern

Every config block is frozen at two levels:

```javascript
const config = Object.freeze({
    r2: Object.freeze({
        accountId: requireEnv('CF_ACCOUNT_ID'),
        // ...
    }),
});
```

Inner `Object.freeze` prevents mutation of the block itself. The outer `Object.freeze` prevents adding or removing blocks. Never spread config blocks into mutable objects.

#### Centralized business-rule config

`config/index.js` also holds non-credential, non-environment-variable business rule blocks — mutable levers that can change with product decisions or per-environment tuning (e.g. different timeouts for staging vs production). These include `booking`, `payment`, `payout`, `shop`, `media`, `slotCleanup`, `security`, and payment-gateway blocks. Do not confuse these with `utils/constants.js`:

| Lives in | Rule of thumb |
|----------|--------------|
| `config/index.js` | Values that can change per environment, per product decision, or are derived from env vars (timeouts, thresholds, credentials, URLs, **upload size limits, MIME allowlists, gallery caps**) |
| `utils/constants.js` | Values that never change: enum-like strings (statuses, roles, types), entity type names, content-type-to-extension mappings |

Upload size limits (`config.media.maxImageSize`), MIME allowlists (`config.media.allowedImageMimes`), gallery caps (`config.media.maxGalleryPerShop`), and presigned URL TTLs (`config.media.presignedUrlTtl`) are **configurations** — they live in the `media` block of `config/index.js` because they are mutable business levers that product requirements can change at any time.

---

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
// config/index.js — full set of changes

// ── 1. Remove cloudinary block, add r2 block ──────────────────────────────

-    cloudinary: Object.freeze({
-        cloudName: requireEnv('CLOUDINARY_CLOUD_NAME'),
-        apiKey: requireEnv('CLOUDINARY_API_KEY'),
-        apiSecret: requireEnv('CLOUDINARY_API_SECRET'),
-    }),

+    r2: Object.freeze({
+        accountId: requireEnv('CF_ACCOUNT_ID'),
+        accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
+        secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
+        bucket: requireEnv('R2_BUCKET'),
+        cdnBaseUrl: requireEnv('CDN_BASE_URL'),
+        mediaTokenSecret: requireEnv('MEDIA_TOKEN_SECRET'),
+    }),

// ── 2. Replace the upload block with the media block ──────────────────────
//    Cloudinary-specific fields (allowedImageFormats, imageTransformations)
//    are removed. Upload limits, MIME allowlists, gallery caps, and presigned
//    URL TTLs are business configurations — they stay here in config.

-    upload: Object.freeze({
-        maxFileSize: 5 * 1024 * 1024,
-        maxFiles: 10,
-        maxPhotosPerShop: 10,
-        allowedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
-        allowedMimeTypes: [
-            'image/jpeg',
-            'image/jpg',
-            'image/png',
-            'image/gif',
-            'image/webp',
-        ],
-        imageTransformations: Object.freeze({
-            profile: { width: 800, height: 800, crop: 'limit' },
-            cover: { width: 1200, height: 600, crop: 'limit' },
-        }),
-    }),

+    media: Object.freeze({
+        maxImageSize: 10 * 1024 * 1024,          // 10 MB
+        maxVideoSize: 500 * 1024 * 1024,         // 500 MB
+        maxGalleryPerShop: 10,                   // replaces maxPhotosPerShop
+        maxFiles: 10,                            // max items per multi-upload request
+        presignedUrlTtl: 15 * 60,               // 15 minutes (seconds)
+        multipartPartSize: 50 * 1024 * 1024,     // 50 MB per part
+        maxMultipartParts: 100,
+        pendingUploadTtlHours: 24,               // Auto-delete unconfirmed uploads
+        allowedImageMimes: [
+            'image/jpeg',
+            'image/png',
+            'image/webp',
+            'image/gif',
+        ],
+        allowedVideoMimes: [
+            'video/mp4',
+            'video/quicktime',
+            'video/x-msvideo',
+            'video/webm',
+        ],
+    }),
```

> **Why replace `config.upload` with `config.media`?**
>
> `maxFileSize` was a Multer hard-cap applied at the middleware layer. Multer is deleted. The equivalent cap for presigned uploads is `config.media.maxImageSize` (10 MB) enforced in `media.service.requestUploadUrl()`. `allowedImageFormats` was a Cloudinary SDK option (format names, not MIME types). `allowedMimeTypes` is now `config.media.allowedImageMimes`. `imageTransformations` was Cloudinary crop-at-upload; R2 stores originals and CDN serves variants on-the-fly. All limits and allowlists remain in `config` because they are mutable business rules, not immutable constants.

### 7.3 Supporting Config File Ecosystem

`config/index.js` is the single source of truth for all values. The other files in `server/src/config/` are thin adapters — they import from `index.js` and produce an initialized SDK client or a structured options object. **`cors.config.js` is the one exception — it reads `ALLOWED_ORIGINS` and `NODE_ENV` from `process.env` directly** because CORS resolution is environment-aware and must run before `config` is fully consumed by the Express middleware.

| File | Status | What it exports |
|------|--------|----------------|
| `config/r2.config.js` | **NEW** | `r2Client` — an initialized `S3Client` pointed at the R2 endpoint via `config.r2.*` |
| `config/cloudinary.config.js` | **DELETE** | _(replaced by r2.config.js)_ |
| `config/cors.config.js` | Stable — no changes | `createCorsOptions()` and `resolveAllowedOrigins(env)` |
| `config/database.config.js` | Stable — no changes | Default export `connectDB()`, named export `disconnectDB()` |
| `config/firebase.config.js` | Stable — no changes | Singleton Firebase Admin instance |
| `config/msg91.config.js` | Stable — no changes | Frozen MSG91 config with computed endpoint URLs |

**Key design points in the stable files (for reference):**

`cors.config.js` — environment-aware origins:
```javascript
// resolveAllowedOrigins reads ALLOWED_ORIGINS in production/staging;
// falls back to localhost defaults in development.
// Consumed as: app.use(cors(createCorsOptions()))
export const resolveAllowedOrigins = (env = process.env.NODE_ENV || 'development') => { ... };
export const createCorsOptions = () => { ... };
```

`database.config.js` — security hardening + graceful shutdown:
```javascript
// mongoose.sanitizeFilter prevents $gt/$ne query-injection on all queries,
// including those that don't go through express-mongo-sanitize (cron jobs, queues).
mongoose.set('sanitizeFilter', true);

// Named export for graceful shutdown hooks:
export const disconnectDB = async () => { ... };
```

`firebase.config.js` — singleton guard:
```javascript
// Prevents double-initialization when modules are hot-reloaded in dev.
if (admin.apps.length > 0) return admin;
```

These files are unaffected by the R2 migration and require no changes.

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
     * ContentType is locked into the signature. Size is validated after upload.
     */
    async generatePresignedPutUrl(key, contentType, expiresIn = 900) {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });

        const url = await getSignedUrl(this.client, command, {
            expiresIn,
            signableHeaders: new Set(['content-type']),
        });
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
import config from '../../config/index.js';

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
    const allowlist = mediaType === 'video' ? config.media.allowedVideoMimes : config.media.allowedImageMimes;
    return allowlist.includes(contentType);
};

/**
 * Validate file size against limits for the given media type.
 */
export const validateFileSize = (sizeBytes, mediaType) => {
    const limit = mediaType === 'video' ? config.media.maxVideoSize : config.media.maxImageSize;
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
export const requestUploadUrl = async (userId, { contentType, sizeBytes, purpose }) => {
    const mediaType = resolveMediaType(contentType);

    if (!validateContentType(contentType, mediaType)) {
        throw new BadRequestError(`Content type not allowed: ${contentType}`);
    }
    if (!validateFileSize(sizeBytes, mediaType)) {
        const limitMB = (mediaType === 'video'
            ? config.media.maxVideoSize
            : config.media.maxImageSize) / (1024 * 1024);
        throw new BadRequestError(`File size exceeds ${limitMB} MB limit`);
    }

    const mediaId = uuidv4();
    const extension = MIME_TO_EXTENSION[contentType] || 'bin';
    const contextId = userId.toString();
    const r2Key = buildR2Key(purpose, contextId, mediaId, extension);

    const { url: uploadUrl, expiresAt } = await storageProvider.generatePresignedPutUrl(
        r2Key,
        contentType,
        config.media.presignedUrlTtl,
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
        entityId: null,
        entityType: null,
        uploadExpiresAt: new Date(Date.now() + config.media.pendingUploadTtlHours * 3600_000),
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
    if (currentCount + mediaIds.length > config.media.maxGalleryPerShop) {
        throw new BadRequestError(
            `Gallery limit exceeded. Maximum ${config.media.maxGalleryPerShop} items allowed.`,
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
export const getShopGallery = async (ownerId) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const items = await mediaRepository.findByEntity(shop._id, MEDIA_ENTITY_TYPE.SHOP, { purpose: MEDIA_PURPOSE.GALLERY });
    return serializeMediaList(items);
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
router.get('/gallery', authorize(ROLES.BARBER), mediaController.getGallery);

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
import config from '../config/index.js';
import {
    ALL_MEDIA_PURPOSES,
} from '../utils/constants.js';
import { paginationSchema } from './common.validator.js';

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

// Gallery schemas (replace photo.validator schemas)
export const attachGallerySchema = Joi.object({
    mediaIds: Joi.array()
        .items(Joi.string().required())
        .min(1)
        .max(10)
        .required(),
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
        const sizeResult = await Media.aggregate([
            { $match: { entityId, entityType, status: 'ready', purpose: 'gallery' } },
            { $group: { _id: null, totalSize: { $sum: '$actualSize' } } },
        ]);

        const totalItems = await this.countByEntity(entityId, entityType, { purpose: 'gallery' });

        return {
            totalItems,
            totalSize: sizeResult[0]?.totalSize || 0,
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
 * Generic media resources expose one canonical URL field: `url`.
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
        contentType: plain.contentType,
        fileSize: plain.actualSize || plain.declaredSize,
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
// With URL construction from R2 key:
//   coverUrl: r2KeyToUrl(plain.coverR2Key),
//   ownerPhotoUrl: r2KeyToUrl(plain.ownerPhotoR2Key),
```

After the cutover finalizer runs, serializers must not read retired URL fields. Records without R2 keys return `null` for the media URL.

### 14.3 Employee Serializer Updates

```javascript
// In serializers/employee.serializer.js:
import { r2KeyToUrl } from '../services/media/media-url.service.js';

// Replace:
//   photoUrl: plain.photoUrl
// With:
//   photoUrl: r2KeyToUrl(plain.photoR2Key),
```

### 14.4 Customer Serializer Updates

Same pattern:
```javascript
photoUrl: r2KeyToUrl(plain.photoR2Key),
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
+    await mediaService.linkMediaToEntity(profileData.photoMediaId, profile._id, MEDIA_ENTITY_TYPE.CUSTOMER, MEDIA_PURPOSE.AVATAR);
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

+    const createdShop = await shopRepository.create(shopCreateData);
+
+    // Link media as cover for the new shop
+    await mediaService.linkMediaToEntity(shopData.photoMediaId, createdShop._id, MEDIA_ENTITY_TYPE.SHOP, MEDIA_PURPOSE.COVER);
+
+    const tokens = await issueAuthenticationTokens(user);
+
+    return {
+        user: serializeUser(user),
+        shop: serializeBarberProfile(createdShop, user),
+        tokens,
+    };
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
import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import { MEDIA_STATUS } from '../../utils/constants.js';

/**
 * Cleanup orphaned media uploads.
 * Targets pending uploads older than 24 hours that were never confirmed.
 * MongoDB TTL index also handles record deletion, but this ensures R2 cleanup.
 */
export const cleanupOrphanedUploads = async () => {
    const cutoff = new Date(Date.now() - config.media.pendingUploadTtlHours * 3600_000);

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
CDN_BASE_URL=https://media.evercut.in

# HMAC secret for media token signing (256-bit random)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Must match Cloudflare Worker MEDIA_TOKEN_SECRET when Worker is deployed.
MEDIA_TOKEN_SECRET=generate_64_char_random_hex_string
```

> **Loading contract:** All six R2 variables are consumed via `requireEnv()` in `config/index.js`. A missing variable throws synchronously at module load time — the process exits before accepting any HTTP connections. There is no silent fallback. This matches the loading pattern already used for `MONGODB_URI`, `JWT_ACCESS_SECRET`, and all Firebase credentials.


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
+CDN_BASE_URL=https://media.evercut.in
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
| `config/index.js` | Remove `cloudinary` block; replace `upload` block with `media` block containing size limits, MIME allowlists, gallery cap, presigned URL TTL, and multipart settings; add `r2` block loaded via `requireEnv` |
| `utils/constants.js` | Remove `PHOTO_TYPE` + `ALL_PHOTO_TYPES`; add `MEDIA_TYPE`, `MEDIA_STATUS`, `MEDIA_PURPOSE`, `MEDIA_ENTITY_TYPE`, `MIME_TO_EXTENSION` with their `ALL_*` array exports (enums only — limits and MIME allowlists stay in `config.media`) |
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

### 18.4 Final Cutover Compatibility

After migration finalization, serializers output URLs using this priority:
1. If `r2Key` / `coverR2Key` / `photoR2Key` exists, construct a signed CDN URL.
2. If the R2 key is null, return null.

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