# Cloudflare R2 Media Upload — Frontend Implementation Guide

> Backend source of truth. Implementation-only. No theory.

---

## 1. Supported Formats

| Category | MIME Type | Extension(s) | Backend Validation |
|:-:|:-:|:-:|:-:|
| Image | `image/jpeg` | `.jpg`, `.jpeg` | Magic bytes |
| Image | `image/png` | `.png` | Magic bytes |
| Image | `image/webp` | `.webp` | Magic bytes (RIFF + WEBP) |
| Video | `video/mp4` | `.mp4` | Magic bytes (`ftyp` at offset 4) |
| Video | `video/quicktime` | `.mov` | Content-Type only |
| Video | `video/x-msvideo` | `.avi` | Content-Type only |
| Video | `video/webm` | `.webm` | Magic bytes |

| Unsupported | Reason |
|:-:|:-:|
| `.gif` | Not in `allowedImageMimes` |
| `.heic`, `.heif` | Not in `allowedImageMimes` |
| All other formats | Rejected by `uploadUrlSchema` |

---

## 2. Backend-Enforced Limits

| Rule | Value | Config |
|:-:|:-:|:--|
| Max image size | **10 MB** | `config.media.maxImageSize` |
| Max video size | **500 MB** | `config.media.maxVideoSize` |
| Max gallery items per shop | **10** | `config.media.maxGalleryPerShop` |
| Max gallery `mediaIds` per `POST /gallery` | **10** | `config.media.maxFiles` |
| Presigned upload URL TTL | **15 minutes** | `config.media.presignedUrlTtl` |
| Pending upload record TTL | **24 hours** | `config.media.pendingUploadTtlHours` |
| Signed CDN URL TTL | **1 hour** | `config.media.signedUrlTtl` |

---

## 3. Upload Flow Overview

```text
┌─────────────────┐         ┌──────────────┐         ┌──────────────────┐
│   Flutter App   │         │  Backend API │         │  Cloudflare R2   │
└────────┬────────┘         └──────┬───────┘         └────────┬─────────┘
         │                         │                          │
         │ 1. POST /upload-url     │                          │
         │ { contentType, sizeBytes, purpose }                │
         │────────────────────────>│                          │
         │                         │                          │
         │ 201 Created             │                          │
         │ { mediaId, uploadUrl, r2Key, expiresAt }           │
         │<────────────────────────│                          │
         │                         │                          │
         │ 2. PUT <uploadUrl>      │                          │
         │ (raw binary file)       │                          │
         │───────────────────────────────────────────────────>│
         │                         │                          │
         │                         │        200 OK            │
         │<───────────────────────────────────────────────────│
         │                         │                          │
         │ 3. POST /confirm        │                          │
         │ { mediaId }             │                          │
         │────────────────────────>│                          │
         │                         │                          │
         │ 200 OK                  │                          │
         │ { mediaId, cdnUrl, r2Key, contentType, fileSize }  │
         │<────────────────────────│                          │
         │                         │                          │
         │ 4. POST /gallery        │                          │
         │ (Optional — gallery purpose only)                  │
         │ { mediaIds: [...] }     │                          │
         │────────────────────────>│                          │
         │                         │                          │
         │ 201 Created             │                          │
         │ [{ id, url, type, purpose, fileSize, ... }]        │
         │<────────────────────────│                          │
```


- **Steps 1 → 2 → 3 are mandatory in sequence.**
- **Step 4 is required only for `purpose: "gallery"`.**

---

## 4. Route Reference

### `POST /api/v1/media/upload-url` (Authenticated)

| | Detail |
|:-:|:--|
| **Auth** | `Authorization: Bearer <accessToken>` |
| **Content-Type** | `application/json` |
| **Purpose** | Get presigned R2 URL for upload |

#### Request Body

| Field | Type | Required | Constraints |
|:-:|:-:|:-:|:--|
| `contentType` | `string` | Yes | Must be one of the allowed MIME types from Section 1 |
| `sizeBytes` | `number` | Yes | `integer > 0`, `≤ maxImageSize` for images, `≤ maxVideoSize` for videos |
| `purpose` | `string` | Yes | One of: `avatar`, `profile`, `cover`, `gallery`, `employee`, `onboarding`, `service`, `video_raw`, `video_thumbnail` |

#### Response: 201 Created

```json
{
  "success": true,
  "message": "Upload URL generated",
  "data": {
    "mediaId": "uuid-string",
    "uploadUrl": "https://{accountId}.r2.cloudflarestorage.com/{bucket}/{key}?X-Amz-...",
    "r2Key": "images/{purpose}/{contextId}/{uuid}.{ext}",
    "expiresAt": "2026-05-15T14:15:00.000Z"
  }
}
```

#### Failure Responses

| HTTP | Error | Trigger |
| :-: | :-- | :-- |
| `401` | `No token provided` / `Invalid or expired token` | Missing/invalid `Authorization` header |
| `400` | `Unsupported content type` | `contentType` not in allowed list |
| `400` | `File size exceeds X MB limit` | `sizeBytes` exceeds limit for media type |
| `400` | Validation error (Joi) | Missing/invalid field in body |

---

### `POST /api/v1/media/onboarding/upload-url` (Onboarding)

| | Detail |
|:-:|:--|
| **Auth** | `Authorization: Bearer <onboardingToken>` (JWT from onboarding flow) |
| **Content-Type** | `application/json` |
| **Purpose** | Same as above, but for user registration flow |

> Identical request/response structure as `POST /upload-url`.
> Backend uses `req.onboardingContext.phoneNumber` as owner identifier instead of `req.user._id`.

#### Failure Responses (additional)

| HTTP | Error | Trigger |
| :-: | :-- | :-- |
| `401` | `No token provided` / `Invalid or expired token` | Missing/invalid onboarding token |
| `409` | `Phone number already registered` | Phone number in onboarding token already exists (user already registered) |

---

### `PUT <uploadUrl>` — Upload to Cloudflare R2

| | Detail |
|:-:|:--|
| **Method** | `PUT` |
| **URL** | Full `uploadUrl` from Step 1 |
| **Body** | Raw binary file bytes |

#### Required Headers

| Header | Value | Rule |
|:-:|:-:|:--|
| `Content-Type` | Exact MIME from Step 1 | **MUST match** `"contentType"` sent in `POST /upload-url` |
| `Content-Length` | File size in bytes | Optional but recommended |

#### Prohibited

| Action | Why |
| :-- | :-- |
| `multipart/form-data` | R2 expects raw binary, not multipart |
| Changing `Content-Type` after URL generation | Triggers Content-Type mismatch on confirm |
| `POST` instead of `PUT` | Presigned URL is for `PUT` |

---

### `POST /api/v1/media/confirm` (Authenticated)

| | Detail |
|:-:|:--|
| **Auth** | `Authorization: Bearer <accessToken>` |
| **Content-Type** | `application/json` |
| **Purpose** | Tell backend to verify and finalize the upload |

#### Request Body

| Field | Type | Required |
|:-:|:-:|:-:|
| `mediaId` | `string` | Yes (from Step 1) |

#### Response: 200 OK

```json
{
  "success": true,
  "message": "Upload confirmed",
  "data": {
    "mediaId": "uuid-string",
    "cdnUrl": "https://cdn.evercut.app/{path}?exp={ts}&token={sig}",
    "r2Key": "images/gallery/{contextId}/{uuid}.jpg",
    "contentType": "image/jpeg",
    "fileSize": 2048576
  }
}
```

#### Failure Responses

| HTTP | Error | Trigger |
| :-: | :-- | :-- |
| `404` | `Pending upload` not found | `mediaId` doesn't exist, belongs to another user, or not in `PENDING` status |
| `400` | `Upload not found in storage. File may not have been uploaded yet.` | R2 HEAD request returns nothing (Step 2 not completed) |
| `400` | `Content-Type mismatch. Upload rejected.` | R2 `Content-Type` ≠ declared `contentType` |
| `400` | `File content does not match declared type. Upload rejected.` | Image magic bytes mismatch |

> On mismatch, backend **deletes the R2 object** and marks media as `FAILED`.

---

### `POST /api/v1/media/onboarding/confirm` (Onboarding)

| | Detail |
|:-:|:--|
| **Auth** | `Authorization: Bearer <onboardingToken>` |
| **Content-Type** | `application/json` |
| **Purpose** | Same as above, but for onboarding flow |

> Identical request/response structure as `POST /confirm`.

---

### `POST /api/v1/media/gallery` (Attach to Shop Gallery)

| | Detail |
|:-:|:--|
| **Auth** | `Authorization: Bearer <accessToken>` |
| **Role** | `BARBER` |
| **Content-Type** | `application/json` |
| **Purpose** | Attach confirmed media to shop gallery |

> ⚠️ **Only call this after `/confirm` returns `200 OK`.**
> ⚠️ Backend rejects unconfirmed or already-attached media.

#### Request Body

| Field | Type | Required | Constraints |
|:-:|:-:|:-:|:--|
| `mediaIds` | `string[]` | Yes | 1 ≤ length ≤ 10, each is a confirmed `mediaId` |

#### Response: 201 Created

```json
{
  "success": true,
  "message": "Gallery media attached",
  "data": [
    {
      "id": "uuid-string",
      "type": "image",
      "status": "ready",
      "purpose": "gallery",
      "url": "https://cdn.evercut.app/{path}?exp={ts}&token={sig}",
      "contentType": "image/jpeg",
      "fileSize": 2048576,
      "entityId": "shopId",
      "entityType": "Shop",
      "createdAt": "2026-05-15T10:00:00.000Z",
      "updatedAt": "2026-05-15T10:00:00.000Z"
    }
  ]
}
```

#### Failure Responses

| HTTP | Error | Trigger |
| :-: | :-- | :-- |
| `403` | `Access denied. Required role(s): BARBER` | User is not a `BARBER` |
| `400` | `No media IDs provided` | Empty `mediaIds` array |
| `400` | `Gallery limit exceeded. Maximum 10 items allowed.` | `currentCount + mediaIds.length > 10` |
| `400` | `Media {id} not found, unconfirmed, or already attached` | Media not `READY` or already has `entityId` |
| `404` | `Shop profile` not found | User has no shop |

---

## 5. Flow Comparison Table

| Context | Upload URL | Confirm | Auth Header | Owner ID |
|:-:|:-:|:-:|:-:|:-:|
| **Onboarding** | `POST /media/onboarding/upload-url` | `POST /media/onboarding/confirm` | `Bearer <onboarding>` | `phoneNumber` |
| **Authenticated** | `POST /media/upload-url` | `POST /media/confirm` | `Bearer <access>` | `user._id` |

---

## 6. Complete Frontend Implementation Examples

### 6.1 Authenticated Image Upload (Flutter/Dio)

```dart
import 'package:dio/dio.dart';
import 'package:mime/mime.dart';

Future<String?> uploadImage(File file, String purpose) async {
  final dio = Dio();
  final accessToken = await getAccessToken();
  final sizeBytes = await file.length();
  final contentType = lookupMimeType(file.path) ?? 'image/jpeg';

  // Step 1: Request upload URL
  final urlResponse = await dio.post(
    'https://api.evercut.app/api/v1/media/upload-url',
    data: {
      'contentType': contentType,
      'sizeBytes': sizeBytes,
      'purpose': purpose,
    },
    options: Options(
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
    ),
  );

  final uploadUrl = urlResponse.data['data']['uploadUrl'] as String;
  final mediaId = urlResponse.data['data']['mediaId'] as String;

  // Step 2: Upload raw binary to R2
  final fileBytes = await file.readAsBytes();
  await dio.put(
    uploadUrl,
    data: Stream.fromIterable(fileBytes.map((e) => [e])),
    options: Options(
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBytes.length.toString(),
      },
      requestEncoder: (request, options) => request,
    ),
  );

  // Step 3: Confirm upload
  await dio.post(
    'https://api.evercut.app/api/v1/media/confirm',
    data: {'mediaId': mediaId},
    options: Options(
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
    ),
  );

  // Step 4: Attach to gallery if needed
  if (purpose == 'gallery') {
    await dio.post(
      'https://api.evercut.app/api/v1/media/gallery',
      data: {'mediaIds': [mediaId]},
      options: Options(
        headers: {
          'Authorization': 'Bearer $accessToken',
          'Content-Type': 'application/json',
        },
      ),
    );
  }

  return mediaId;
}
```

### 6.2 Authenticated Video Upload

```dart
Future<String?> uploadVideo(File file, String purpose) async {
  final sizeBytes = await file.length();
  final contentType = lookupMimeType(file.path) ?? 'video/mp4'; // e.g., video/mp4, video/quicktime, video/webm
  final accessToken = await getAccessToken();
  final dio = Dio();

  // Step 1
  final urlResponse = await dio.post(
    'https://api.evercut.app/api/v1/media/upload-url',
    data: {
      'contentType': contentType,
      'sizeBytes': sizeBytes,
      'purpose': purpose, // e.g., "video_raw", "gallery"
    },
    options: Options(headers: {'Authorization': 'Bearer $accessToken', 'Content-Type': 'application/json'}),
  );

  final uploadUrl = urlResponse.data['data']['uploadUrl'] as String;
  final mediaId = urlResponse.data['data']['mediaId'] as String;

  // Step 2: Upload to R2 (binary, not multipart)
  final fileBytes = await file.readAsBytes();
  await dio.put(
    uploadUrl,
    data: Stream.fromIterable(fileBytes.map((e) => [e])),
    options: Options(
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBytes.length.toString(),
      },
      requestEncoder: (request, options) => request,
    ),
  );

  // Step 3: Confirm
  final confirmResponse = await dio.post(
    'https://api.evercut.app/api/v1/media/confirm',
    data: {'mediaId': mediaId},
    options: Options(headers: {'Authorization': 'Bearer $accessToken', 'Content-Type': 'application/json'}),
  );

  return confirmResponse.data['data']['cdnUrl'] as String;
}
```

### 6.3 Onboarding Image Upload

```dart
Future<String?> uploadOnboardingImage(File file, String onboardingToken) async {
  final dio = Dio();
  final sizeBytes = await file.length();
  final contentType = lookupMimeType(file.path) ?? 'image/jpeg';

  // Step 1: Onboarding upload URL
  final urlResponse = await dio.post(
    'https://api.evercut.app/api/v1/media/onboarding/upload-url',
    data: {
      'contentType': contentType,
      'sizeBytes': sizeBytes,
      'purpose': 'onboarding',
    },
    options: Options(
      headers: {
        'Authorization': 'Bearer $onboardingToken',
        'Content-Type': 'application/json',
      },
    ),
  );

  final uploadUrl = urlResponse.data['data']['uploadUrl'] as String;
  final mediaId = urlResponse.data['data']['mediaId'] as String;

  // Step 2: Upload to R2
  final fileBytes = await file.readAsBytes();
  await dio.put(
    uploadUrl,
    data: Stream.fromIterable(fileBytes.map((e) => [e])),
    options: Options(
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBytes.length.toString(),
      },
      requestEncoder: (request, options) => request,
    ),
  );

  // Step 3: Onboarding confirm
  await dio.post(
    'https://api.evercut.app/api/v1/media/onboarding/confirm',
    data: {'mediaId': mediaId},
    options: Options(
      headers: {
        'Authorization': 'Bearer $onboardingToken',
        'Content-Type': 'application/json',
      },
    ),
  );

  return mediaId;
}
```

### 6.4 Gallery Attachment

```dart
Future<void> attachToGallery(List<String> mediaIds) async {
  final dio = Dio();
  final accessToken = await getAccessToken();

  final response = await dio.post(
    'https://api.evercut.app/api/v1/media/gallery',
    data: {'mediaIds': mediaIds},
    options: Options(
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
    ),
  );

  // response.data['data'] → List<GalleryItem>
  return response.data['data'];
}
```

---

## 7. Full API Route Table

| # | Method | Route | Auth | Role | Content-Type | Purpose |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | `POST` | `/api/v1/media/onboarding/upload-url` | `Onboarding` | — | `application/json` | Get presigned URL (registration flow) |
| 2 | `POST` | `/api/v1/media/onboarding/confirm` | `Onboarding` | — | `application/json` | Confirm upload (registration flow) |
| 3 | `POST` | `/api/v1/media/upload-url` | `Access` | Any logged-in | `application/json` | Get presigned URL |
| 4 | `POST` | `/api/v1/media/confirm` | `Access` | Any logged-in | `application/json` | Finalize upload |
| 5 | `POST` | `/api/v1/media/gallery` | `Access` | `BARBER` | `application/json` | Attach confirmed media to gallery |
| 6 | `GET` | `/api/v1/media/gallery` | `Access` | `BARBER` | — | Fetch shop gallery |
| 7 | `GET` | `/api/v1/media/gallery/usage` | `Access` | `BARBER` | — | Get gallery usage (count, size) |
| 8 | `GET` | `/api/v1/media/:id` | `Access` | Owner | — | Get media by ID |
| 9 | `DELETE` | `/api/v1/media/:id` | `Access` | Owner | — | Soft-delete media + R2 object |
| 10 | `PATCH` | `/api/v1/customers/me/media/picture` | `Access` | Customer | `application/json` | Set customer profile picture |
| 11 | `DELETE` | `/api/v1/customers/me/media/picture` | `Access` | Customer | — | Remove customer profile picture |
| 12 | `PATCH` | `/api/v1/shops/me/media/picture` | `Access` | Barber | `application/json` | Set barber profile picture |
| 13 | `DELETE` | `/api/v1/shops/me/media/picture` | `Access` | Barber | — | Remove barber profile picture |
| 14 | `PATCH` | `/api/v1/shops/me/media/cover` | `Access` | Barber | `application/json` | Set shop cover image |
| 15 | `DELETE` | `/api/v1/shops/me/media/cover` | `Access` | Barber | — | Remove shop cover image |

---

## 8. Error Handling Matrix

| Error | HTTP | When | Resolution |
|:-:|:-:|:-:|:--|
| `No token provided` | `401` | Missing `Authorization` header | Include `Authorization: Bearer <token>` |
| `Invalid or expired token` | `401` | Bad/expired JWT | Refresh token or re-login |
| `Account is inactive or deleted` | `401` | User deleted/inactive during auth | Cannot recover |
| `Phone number already registered` | `409` | Onboarding token for existing phone | Redirect to login |
| `Unsupported content type` | `400` | `contentType` not in allowed list | Check Section 1 table |
| `File size exceeds X MB limit` | `400` | `sizeBytes` > limit | Compress/resample before upload |
| `Pending upload` not found | `404` | Wrong `mediaId` or expired | Regenerate URL (Step 1) |
| `Upload not found in storage...` | `400` | Step 2 not done or failed | Re-upload to R2, then confirm |
| `Content-Type mismatch. Upload rejected.` | `400` | R2 `Content-Type` header ≠ declared type | Ensure `Content-Type` header matches Step 1 |
| `File content does not match declared type.` | `400` | Magic bytes don't match extension | User file is not what it claims to be; reject/ask for reselection |
| `Access denied. Required role(s): BARBER` | `403` | Non-barber user attempting gallery | Check user role before calling |
| `Gallery limit exceeded. Maximum 10 items allowed.` | `400` | `currentCount + mediaIds.length > 10` | Delete old gallery items first |
| `Media {id} not found, unconfirmed, or already attached` | `400` | Unconfirmed media in `/gallery` | Call `/confirm` first |
| `No media IDs provided` | `400` | Empty `mediaIds` array | Include at least 1 `mediaId` |
| `Shop profile` not found | `404` | User has no shop | Create shop profile |

---

## 9. Upload Checklist

- [ ] Calculate exact `sizeBytes` as `int` before Step 1.
- [ ] Detect actual MIME type, don't trust file extension.
- [ ] Use `purpose` from the allowed list only.
- [ ] Send `POST /upload-url` with `Content-Type: application/json`.
- [ ] Receive `uploadUrl` and `mediaId`; save both.
- [ ] Send `PUT` (not `POST`) to `uploadUrl`.
- [ ] Send raw binary body, **never** `multipart/form-data`.
- [ ] Set `Content-Type` header on R2 `PUT` **exactly** as declared in Step 1.
- [ ] Set `Content-Length` if the HTTP client doesn't do it automatically.
- [ ] Wait for `200 OK` from R2 before proceeding.
- [ ] Call `POST /confirm` immediately after R2 success.
- [ ] Call `POST /gallery` **only if** `purpose == "gallery"` and `/confirm` succeeded.
- [ ] Handle errors at each step; never skip confirmation.
