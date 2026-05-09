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
│  Flutter   │ ──────────────────────────► │  Node.js API │ ─────────────────────► │  Cloudinary   │
│   Client   │                             │  (Express)   │                        │  (CDN + Store) │
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
| **Utils** | `utils/constants.js` | PHOTO_TYPE enum, MAX_PHOTOS_PER_SHOP | **MODIFY** |

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
| `photoType` (shop_interior, work_sample, etc.) | `metadata.category` |
| `description` | `metadata.description` |
| `photoName` | `metadata.originalName` |
| `MAX_PHOTOS_PER_SHOP = 10` | `MEDIA_LIMITS.MAX_GALLERY_PER_SHOP = 10` |
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
┌───────────┐  POST /api/v1/media/upload-url  ┌──────────────┐
│  Flutter   │ ──────────────────────────────► │  Node.js API │
│   Client   │                                 │  (Express)   │
│            │  ◄─── { uploadUrl, mediaId }    │              │
│            │                                 │  - Validate  │
│            │  PUT {presigned_url}             │  - Gen UUID  │
│            │ ──────────────────────────────► │  - Gen URL   │──► R2 (direct)
│            │                                 │              │
│            │  POST /api/v1/media/confirm     │              │
│            │ ──────────────────────────────► │  - HeadObject│
│            │  ◄─── { cdnUrl, mediaId }       │  - Validate  │
└───────────┘                                 │  - Update DB │
                                              └──────────────┘
```

```
TARGET FLOW (Video Upload — Multipart):
┌───────────┐  POST /api/v1/media/video/initiate  ┌──────────────┐
│  Flutter   │ ──────────────────────────────────► │  Node.js API │
│            │  ◄─── { videoId, uploadId, parts }  │              │
│            │                                     │              │
│            │  PUT {part_urls} × N (parallel)     │              │
│            │ ──────────────────────────────────► │              │──► R2 (direct)
│            │                                     │              │
│            │  POST /api/v1/media/video/complete  │              │
│            │ ──────────────────────────────────► │  - Complete  │
│            │  ◄─── { videoId, status }           │  - Enqueue   │
└───────────┘                                     └──────────────┘
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
│   └── constants.js                     ← MODIFY: Add media constants, remove PHOTO_TYPE
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

