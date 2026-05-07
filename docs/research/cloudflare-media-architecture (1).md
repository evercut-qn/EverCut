# Cloudflare Media Infrastructure — Production Architecture Research
## Photo Storage, Video Storage, Streaming, CDN Delivery & Secure Access

**Prepared:** May 2026  
**Stack:** Flutter (Android + iOS) · Node.js + Express.js  
**Exchange Rate:** 1 USD = ₹94.15 *(May 7, 2026 — verified via Trading Economics, Wise, BookMyForex)*  
**Pricing Verified:** Cloudflare official documentation (May 2026)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Complete Architecture Overview](#2-complete-architecture-overview)
3. [Recommended Production Architecture](#3-recommended-production-architecture)
4. [Cloudflare Service Breakdown](#4-cloudflare-service-breakdown)
5. [Upload Architecture](#5-upload-architecture)
6. [Image Storage & Delivery Flow](#6-image-storage--delivery-flow)
7. [Video Storage Flow](#7-video-storage-flow)
8. [Video Streaming Architecture](#8-video-streaming-architecture)
9. [Thumbnail & Preview Strategy](#9-thumbnail--preview-strategy)
10. [Secure Media Access & Signed URL Strategy](#10-secure-media-access--signed-url-strategy)
11. [Authentication & Authorization Flow](#11-authentication--authorization-flow)
12. [CDN & Edge Caching Strategy](#12-cdn--edge-caching-strategy)
13. [Media Optimization Strategy](#13-media-optimization-strategy)
14. [Public vs Private Storage Strategy](#14-public-vs-private-storage-strategy)
15. [Database Metadata Strategy](#15-database-metadata-strategy)
16. [Flutter Integration Strategy](#16-flutter-integration-strategy)
17. [Node.js + Express Integration Strategy](#17-nodejs--express-integration-strategy)
18. [Direct Upload vs Backend Upload](#18-direct-upload-vs-backend-upload)
19. [Media Lifecycle Management](#19-media-lifecycle-management)
20. [Cost Analysis in INR](#20-cost-analysis-in-inr)
21. [Provider Comparison](#21-provider-comparison)
22. [Scalability & High-Traffic Handling](#22-scalability--high-traffic-handling)
23. [Production Security Best Practices](#23-production-security-best-practices)
24. [Failure Scenarios & Recovery](#24-failure-scenarios--recovery)
25. [Monitoring & Logging](#25-monitoring--logging)
26. [Rate Limiting & Abuse Protection](#26-rate-limiting--abuse-protection)
27. [Cost Optimization Strategy](#27-cost-optimization-strategy)
28. [Best Practices Checklist](#28-best-practices-checklist)
29. [Final Recommended Architecture](#29-final-recommended-architecture)

---

## 1. Executive Summary

For a Flutter + Node.js application requiring photo storage, video storage, and streaming, the optimal architecture is built entirely on Cloudflare's developer platform, combining:

- **Cloudflare R2** for photo and video file storage (S3-compatible, zero egress fees)
- **Cloudflare Images** for on-demand image transformation and optimization (optional layer over R2)
- **Cloudflare Workers** for authentication, access control, range-request proxying, and caching logic
- **Cloudflare CDN** (built into the network) for global edge delivery
- **Pre-transcoded HLS** stored in R2 for adaptive video streaming (instead of Cloudflare Stream, except in specific high-volume or live-streaming scenarios)

This architecture eliminates egress fees entirely, delivers content from 330+ global edge locations, integrates natively with the existing Node.js backend, and scales linearly without architectural changes from 1K to 1M users.

**Key Decision: R2 + Worker + HLS over Cloudflare Stream**

Cloudflare Stream charges $5/1,000 minutes stored + $1/1,000 minutes delivered. At 10K active video users, Stream costs exceed R2 by 60–80×. For apps without a live streaming requirement, the R2 + HLS approach is the objectively superior architecture — the only trade-off is a one-time engineering investment of 1–2 weeks.

---

## 2. Complete Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FLUTTER APP (Client)                    │
│              Android & iOS — HTTP/HTTPS                     │
└────────────────────────┬────────────────────────────────────┘
                         │
               ┌─────────┴──────────┐
               │                    │
        ┌──────▼──────┐    ┌────────▼─────────┐
        │  Node.js +  │    │  Cloudflare CDN  │
        │  Express.js │    │  (330+ PoPs)     │
        │  Backend    │    └────────┬─────────┘
        └──────┬──────┘            │
               │           ┌───────┴───────┐
        ┌──────▼──────┐    │               │
        │ Auth / JWT  │    ▼               ▼
        │ Presigned   │  Cloudflare     Cloudflare
        │ URL Gen     │  Workers        Images
        └──────┬──────┘  (Auth/Proxy)  (Transform)
               │               │
               │           ┌───▼────────────────┐
               └──────────►│  Cloudflare R2     │
                           │  - Photos (orig.)  │
                           │  - Videos (MP4/HLS)│
                           │  - Thumbnails      │
                           └────────────────────┘
```

**Layers:**

| Layer | Service | Responsibility |
|---|---|---|
| Client | Flutter App | Upload, playback, display |
| API | Node.js + Express | Auth, presigned URL generation, metadata |
| Auth + Proxy | Cloudflare Workers | JWT validation, signed URL generation, range proxying |
| Storage | Cloudflare R2 | All binary assets (photos, videos, thumbnails) |
| Transformation | Cloudflare Images | On-demand resizing, format conversion (WebP/AVIF) |
| Delivery | Cloudflare CDN | Global edge caching, TLS, DDoS protection |
| Transcoding | Self-hosted ffmpeg worker | HLS conversion pipeline (async, per upload) |
| Database | PostgreSQL / MongoDB | Metadata, keys, status, URLs |

---

## 3. Recommended Production Architecture

### Architecture Decision Summary

| Decision | Chosen Approach | Reason |
|---|---|---|
| Storage | Cloudflare R2 | Zero egress, S3-compatible, ₹1.41/GB/month |
| Photo optimization | R2 + Cloudflare Images Transformations | On-demand variants without pre-generating copies |
| Video storage | R2 (HLS segments + MP4) | 60–80× cheaper than Stream at scale |
| Video streaming | Pre-transcoded HLS via R2 + Worker | Adaptive bitrate without Stream per-minute fees |
| Access control | Cloudflare Workers + JWT | Edge-level auth without backend round-trip |
| CDN | Cloudflare CDN (auto) | R2 + Workers responses cached at 330+ PoPs |
| Upload method | Direct-to-R2 via presigned URL | Eliminates backend bandwidth costs |
| Transcoding | ffmpeg on VPS / queue worker | One-time per video, no per-view costs |
| Live streaming | Cloudflare Stream (if required) | Only justifiable for actual live streaming feature |

### When to Use Cloudflare Stream Instead

Cloudflare Stream becomes the appropriate choice only if:

- Live streaming (RTMP/SRT ingest) is a product requirement
- Engineering team cannot maintain a transcoding pipeline
- Total stored video is under 100 hours (Stream economical at small scale)
- Built-in per-video analytics dashboard is required without custom instrumentation

---

## 4. Cloudflare Service Breakdown

### 4.1 Cloudflare R2 — Object Storage

**What it is:** S3-compatible object storage with zero egress fees, built on Cloudflare's global network.

**Pricing (May 2026):**

| Dimension | Rate (USD) | Rate (INR) | Free Tier |
|---|---|---|---|
| Standard Storage | $0.015/GB/month | ₹1.41/GB/month | 10 GB/month |
| Infrequent Access Storage | $0.010/GB/month | ₹0.94/GB/month | — |
| IA Data Retrieval | $0.010/GB | ₹0.94/GB | — |
| Class A Ops (writes) | $4.50/million | ₹423.68/million | 1M/month |
| Class B Ops (reads) | $0.36/million | ₹33.89/million | 10M/month |
| Egress / Bandwidth | **$0.00** | **₹0.00** | Always free |
| Delete, AbortMultipart | Free | ₹0 | Always free |
| Unauthorized (401) requests | Not billed | ₹0 | Always |

**Key capabilities:** S3-compatible API, HTTP Range request support (essential for video seek), presigned URLs, CORS configuration, multipart upload for large files (>100MB), event notifications, metadata, lifecycle policies.

**Critical R2 limitation:** No native server-side image transformation. Image resizing requires either Cloudflare Images (separate product) or a Worker-based transformation layer.

**ToS clarification (October 2025):** Serving video from R2 via Cloudflare CDN is explicitly permitted. This was definitively resolved — video delivery from R2 does not violate terms of service.

---

### 4.2 Cloudflare Images — Transformation Layer

**What it is:** On-demand image transformation service. Can pull from any origin including R2 buckets. Generates WebP/AVIF automatically, supports resizing, cropping, quality adjustment, blur, and watermarking.

**Pricing (May 2026):**

| Dimension | Rate (USD) | Rate (INR) | Free Tier |
|---|---|---|---|
| Image Transformations | $0.50/1,000 unique ops | ₹47.08/1,000 | 5,000/month |
| Storage in Images (optional) | $5.00/100,000 images | ₹470.75/100K | — |
| Delivery from Images (optional) | $1.00/100,000 delivered | ₹94.15/100K | — |

**Critical architecture note:** If images are stored in R2 (not in Cloudflare Images' own storage), only transformation fees apply — storage and delivery are covered by R2's pricing. This is the recommended approach: **use R2 as storage origin, use Cloudflare Images only for transformation.**

**Key capabilities:** Up to 100 named variants (thumbnail, hero, avatar, etc.), automatic format negotiation (AVIF/WebP/JPEG by browser), URL-based transformation parameters, built-in CDN caching of transformed variants.

---

### 4.3 Cloudflare Stream — Managed Video Platform

**What it is:** Fully managed video-as-a-service. Handles upload, encoding, storage, and delivery with one API. Auto-transcodes to multiple quality levels.

**Pricing (May 2026):**

| Dimension | Rate (USD) | Rate (INR) |
|---|---|---|
| Video Storage | $5.00/1,000 min stored | ₹470.75/1,000 min |
| Video Delivery | $1.00/1,000 min delivered | ₹94.15/1,000 min |
| Encoding / Ingress | Free | ₹0 |
| Egress / Bandwidth | Free (included in delivery) | ₹0 |

**Billing nuance:** Storage rounds up to the nearest 1,000 minutes. Delivery counts HTTP requests for video segments — client-side buffering and preloading is counted as billable delivery.

**Key capabilities:** Automatic ABR encoding (multiple quality levels), signed tokens for private video, built-in iframe player or HLS endpoint for custom players, live streaming via RTMP/SRT with automatic recording, per-video analytics (views, watch time, errors), watermarking, captions, video clipping.

---

### 4.4 Cloudflare Workers — Edge Compute

**Pricing (May 2026):**

| Plan | Cost | Included Requests | Additional Requests |
|---|---|---|---|
| Free | $0 | 100K/day (3M/month) | — |
| Paid | $5/month (₹470.75/month) | 10M/month | $0.30/million |

**Role in architecture:** Workers function as the authentication + access control layer between clients and R2. They validate JWTs, generate and verify signed tokens for private media, enforce referrer policies, pass Range headers for video seek support, and populate Cloudflare's edge cache.

---

### 4.5 Cloudflare CDN — Edge Delivery

**What it is:** Cloudflare's global CDN is automatically available for any content served through Cloudflare's network. Workers responses, R2 public bucket content, and Images transformations are all cacheable at the edge. There are no separate CDN fees — bandwidth from R2 to end users is always free.

**330+ global Points of Presence** ensure content is served from the nearest data center to every user, including robust presence across India (Mumbai, Chennai, Bangalore, Delhi, Hyderabad).

---

## 5. Upload Architecture

### 5.1 Direct Upload Flow (Recommended)

Direct-to-R2 upload via presigned PUT URLs is the production-standard approach. The backend never handles the binary data, eliminating backend bandwidth costs and reducing latency.

```
Flutter App ──► POST /api/media/upload-url ──► Node.js Backend
                                                     │
                              ① Validate JWT token   │
                              ② Generate R2 presigned PUT URL (TTL: 15 min)
                              ③ Generate unique object key
                              ④ Record pending upload in DB
                                                             │
                Flutter App ◄── presigned URL + object key ◄─┘
                     │
                     │ ② PUT request directly to R2
                     │    (multipart if >100MB)
                     ▼
              Cloudflare R2 Bucket
                     │
                     │ ③ App confirms upload to backend
                     ▼
              Node.js Backend
              ③ Marks upload complete in DB
              ④ Enqueues transcoding job (for video)
              ⑤ Returns delivery URL
```

**Object key naming convention:**
```
users/{userId}/photos/{uuid}.{ext}
users/{userId}/videos/raw/{uuid}.mp4
users/{userId}/videos/hls/{uuid}/master.m3u8
users/{userId}/videos/hls/{uuid}/720p.m3u8
users/{userId}/videos/hls/{uuid}/720p_{n}.ts
users/{userId}/videos/thumbnails/{uuid}.jpg
```

**Key design principles:**
- Store the R2 object key in the database, not the full URL. Generate delivery URLs on demand to allow future domain/CDN changes without data migration.
- Presigned PUT URLs are single-use and time-limited (15-minute expiry recommended).
- Generate a UUID for each asset at the backend — never trust client-provided filenames or keys.
- For videos >100MB, instruct the client to use multipart upload (the AWS SDK handles this automatically using the same presigned URL flow).

### 5.2 Multipart Upload Strategy for Large Videos

R2 supports S3-compatible multipart upload. For files larger than 100MB:

- Initiate multipart upload → receive upload ID
- Upload parts in parallel (recommended part size: 10–50MB each)
- Complete multipart upload with assembled manifest

This allows resumable uploads and parallel chunk transfer, critical for mobile networks where connections drop. Store the upload ID and completed parts in the database to enable resume from interruption.

### 5.3 Upload Validation

Before issuing a presigned URL, the Node.js backend should:

- Validate file type via declared MIME type and enforce allowlist (image/jpeg, image/png, image/webp, video/mp4)
- Enforce maximum file size limits (e.g., 10MB for photos, 500MB for videos) at the presigned URL TTL stage using R2's `Content-Length` constraint
- Validate user quota (storage per user/account tier) before generating the URL
- Rate-limit presigned URL generation per user (e.g., 10 uploads/minute)

---

## 6. Image Storage & Delivery Flow

### 6.1 Architecture: R2 + Cloudflare Images

Store original high-resolution images in R2. Serve transformed variants on demand via Cloudflare Images, which pulls from R2 as an origin. Cache transformed variants at the Cloudflare edge.

```
Flutter App
    │
    ├── Display request: GET /media/photos/{userId}/{uuid}?w=400&h=400&fit=crop&format=auto
    │
    ▼
Cloudflare Edge Cache
    │ (cache HIT → return immediately)
    │ (cache MISS → forward to Worker)
    ▼
Cloudflare Worker (optional: auth check for private photos)
    │
    ▼
Cloudflare Images Transformation
    │ (pulls original from R2, applies w/h/fit/format params)
    │ (caches result at edge for subsequent requests)
    ▼
Cloudflare R2 (original image source)
```

### 6.2 Variant Strategy

Define named variants for consistent, cacheable transformations:

| Variant Name | Use Case | Dimensions | Format | Quality |
|---|---|---|---|---|
| `thumbnail` | Grid/list views | 200×200 | auto (WebP/AVIF) | 80% |
| `preview` | Detail cards | 600×400 | auto | 85% |
| `full` | Full-screen view | 1200×900 | auto | 90% |
| `avatar` | User profile pics | 96×96 | auto | 80% |
| `hero` | Banner/header | 1600×500 | auto | 85% |
| `original` | Download | Original | Original | 100% |

The `format=auto` parameter automatically serves AVIF to Chrome, WebP to Safari, and JPEG to legacy browsers — a single upload generates optimal formats for all devices without storage overhead.

### 6.3 Image Delivery URL Pattern

For public photos:
```
https://media.yourdomain.com/photos/{userId}/{uuid}?variant=thumbnail
```

For private photos (require Worker auth):
```
https://media.yourdomain.com/private/photos/{userId}/{uuid}?variant=preview&token={signed_token}
```

Route configuration: use a Cloudflare Worker on routes matching `/private/*` to enforce authentication. Public routes on `/photos/*` serve directly with CDN caching.

### 6.4 Photo Upload Flow (Detailed)

```
1. Flutter requests upload URL
   POST /api/photos/upload-url
   Body: { contentType, fileSizeBytes, metadata }

2. Backend validates request, generates presigned PUT URL
   - Key: users/{userId}/photos/{uuid}.jpg
   - TTL: 15 minutes
   - Required Content-Type header

3. Flutter uploads directly to R2 via presigned URL
   PUT {presigned_url}
   Header: Content-Type: image/jpeg
   Body: [raw image bytes]

4. Flutter confirms completion
   POST /api/photos/{uuid}/complete
   Body: { uploadedAt }

5. Backend records metadata in DB:
   { userId, objectKey, variant: 'original', mimeType, sizeBytes, createdAt, status: 'active' }

6. Backend returns delivery URL
   { url: "https://media.yourdomain.com/photos/{userId}/{uuid}" }
```

---

## 7. Video Storage Flow

### 7.1 Raw Video Storage in R2

All uploaded videos are stored in R2 as raw MP4 files first. The HLS transcoding pipeline runs asynchronously after the upload completes.

**Storage lifecycle for a single video:**

| Stage | Files in R2 | Size | Status |
|---|---|---|---|
| Upload complete | `users/{id}/videos/raw/{uuid}.mp4` | ~44MB (avg 5min) | `raw_uploaded` |
| Transcoding queued | Same | ~44MB | `transcoding` |
| Transcoding complete | Raw MP4 + HLS segments | ~88–130MB | `ready` |
| Raw MP4 deleted (optional) | HLS segments only | ~44–86MB | `ready_optimized` |

**Decision on raw MP4 retention:** Retain the raw MP4 as a backup for re-transcoding if quality levels need to change. Move to R2 Infrequent Access storage class after 30 days to reduce cost by 33%.

### 7.2 Video Transcoding Pipeline

**Architecture:**

```
R2 Raw Video
    │
    │ Trigger: upload confirmation webhook OR queue message
    ▼
Transcoding Worker (VPS / Docker container)
    │ ① Download raw MP4 from R2 via presigned GET URL
    │ ② Run ffmpeg — output: master.m3u8 + quality playlists + .ts segments
    │ ③ Apply faststart flag to any MP4 derivatives
    │ ④ Upload all HLS files back to R2
    │    Key pattern: users/{id}/videos/hls/{uuid}/
    │ ⑤ Extract thumbnail frame (at 1s mark)
    │ ⑥ Upload thumbnail to R2
    │    Key: users/{id}/videos/thumbnails/{uuid}.jpg
    │ ⑦ Notify backend: transcoding complete, duration, qualities available
    ▼
Backend DB: update video status → 'ready', store duration, thumbnail key, HLS master key
```

**HLS Quality Ladder (recommended for mobile):**

| Profile | Resolution | Video Bitrate | Audio | Segment Duration |
|---|---|---|---|---|
| 1080p | 1920×1080 | 4,500 kbps | 128 kbps | 4 seconds |
| 720p | 1280×720 | 2,800 kbps | 128 kbps | 4 seconds |
| 480p | 854×480 | 1,400 kbps | 128 kbps | 4 seconds |
| 360p | 640×360 | 700 kbps | 96 kbps | 4 seconds |

For mobile-first apps in India (variable 4G quality), the 480p + 720p ladder is sufficient for most content. Add 1080p only if the content demands it (e.g., professional photography tutorials, high-detail product videos).

**HLS storage multiplier:** 2-quality HLS (720p + 480p) ≈ 1.5–2× raw MP4 size. 3-quality (1080p + 720p + 480p) ≈ 2–3× raw size.

**Transcoding infrastructure options:**

| Option | Cost (INR/month) | Notes |
|---|---|---|
| Self-hosted VPS with ffmpeg queue | ₹750–₹2,000 | Best cost; requires queue management (Redis/BullMQ) |
| Railway/Render worker container | ₹1,500–₹4,000 | Managed hosting, easier DevOps |
| AWS Elastic Transcoder | ~₹127/hour of output | Pay-per-use, no infrastructure management |
| AWS MediaConvert | ~₹1.27/min of output video | Tiered pricing, cost-effective at scale |
| Google Cloud Transcoder API | ~₹1.27/min | Similar to MediaConvert |

For a product with moderate video upload volume (<500 videos/day), a single VPS with a BullMQ-based ffmpeg queue is the most cost-effective approach.

---

## 8. Video Streaming Architecture

### 8.1 HLS Streaming via R2 + Worker

HLS (HTTP Live Streaming) is the industry-standard adaptive streaming protocol supported natively on iOS and Android. The architecture delivers HLS segments from R2 via a Cloudflare Worker that handles authentication and Range request passthrough, with Cloudflare's edge CDN caching segment files.

**Streaming request flow:**

```
Flutter Video Player (hls_video_player / video_player + HLS)
    │
    │ 1. Request master playlist
    │    GET https://media.yourdomain.com/v/{uuid}/master.m3u8
    │    Header: Authorization: Bearer {jwt_token}
    │
    ▼
Cloudflare Worker (/v/* route)
    │ ① Validate JWT
    │ ② Check edge cache
    │ ③ On cache miss: fetch from R2
    │    Key: users/{userId}/videos/hls/{uuid}/master.m3u8
    │ ④ Set Cache-Control headers
    │ ⑤ Return playlist with absolute URLs for quality playlists
    ▼
Flutter Player selects quality level (auto-adaptive)
    │
    │ 2. Request quality playlist + segments
    │    GET .../v/{uuid}/720p.m3u8
    │    GET .../v/{uuid}/720p_000.ts (4-second segment)
    │    GET .../v/{uuid}/720p_001.ts
    │    ... (player fetches segments ahead of playhead)
    ▼
Cloudflare Edge Cache (segments served from PoP nearest to user)
```

### 8.2 Caching Strategy for HLS

HLS segments are immutable once created — they never change after transcoding. This makes them ideal for aggressive CDN caching.

| Asset Type | Cache-Control | Rationale |
|---|---|---|
| Master playlist (.m3u8) | `public, max-age=3600` | Changes rarely; short TTL for flexibility |
| Quality playlists (.m3u8) | `public, max-age=86400` | Immutable; can be cached indefinitely |
| Segment files (.ts) | `public, max-age=31536000, immutable` | Immutable; permanent caching |
| Thumbnails (.jpg) | `public, max-age=86400` | Rarely changes; long TTL |
| Photo originals | `public, max-age=31536000` (or private) | Immutable after upload |

Once a segment is cached at a Cloudflare PoP, all subsequent views of that segment from the same region cost zero R2 Class B operations — only the first view per PoP triggers an R2 read.

### 8.3 Range Request Support

R2 natively supports HTTP Range requests. The Cloudflare Worker must pass the `Range` header from the client through to R2 and return a `206 Partial Content` response with the correct `Content-Range` header. This is essential for:

- Video seeking (jump to any point without re-downloading)
- Progressive video loading on slow connections
- MP4 direct playback (for short clips without full HLS transcoding)

### 8.4 Flutter Video Player Integration

**Recommended library:** `video_player` package + `flutter_hls_parser` or `chewie` for controls. For HLS-specific adaptive streaming, the `video_player` package on Android uses ExoPlayer (full HLS ABR support) and on iOS uses AVPlayer (native HLS support). Both handle playlist parsing, segment fetching, and quality switching automatically.

**Authentication pattern for HLS:** Include the JWT token as a URL parameter or in request headers. Since HLS players make independent HTTP requests for each segment, token injection must happen at the URL level or via a local proxy that adds headers. The recommended approach is including a short-lived signed token as a URL query parameter (e.g., `?token={signed_token}`), with the Worker validating it per request.

---

## 9. Thumbnail & Preview Strategy

### 9.1 Video Thumbnail Generation

Generate thumbnails during the transcoding pipeline — not on-demand. Extract a representative frame at the 1-second mark (avoids black frames common at t=0) using ffmpeg's frame extraction.

**Thumbnail storage:** `users/{userId}/videos/thumbnails/{uuid}.jpg`  
**Recommended size:** 1280×720 (16:9), JPEG at 85% quality  
**Delivery:** Via Cloudflare Images transformation from R2 (generates `thumbnail` variant: 320×180 or `preview` variant: 640×360 on the fly)

### 9.2 Animated Preview (Optional)

For richer UX, generate a 3-second animated GIF or WebP preview (extracted at 30% into the video) during transcoding. Store in R2, serve via CDN. These are high-value UX features for content discovery feeds.

### 9.3 Photo Thumbnails

Photo thumbnails are generated on-demand by Cloudflare Images — no pre-generation required. The first request triggers the transformation, which is then cached at the edge for all subsequent requests. The 5,000/month free transformation tier covers most small-to-medium applications.

### 9.4 Placeholder Strategy

Return a low-quality image placeholder (LQIP) in the API response for progressive loading:
- Generate a 20×20px thumbnail during upload processing
- Encode as a base64 string and store in the database
- Flutter app displays the blurred LQIP immediately while the full-quality variant loads from CDN

---

## 10. Secure Media Access & Signed URL Strategy

### 10.1 Public vs Signed Access Decision Matrix

| Content Type | Access Model | Implementation |
|---|---|---|
| Profile photos | Public (no auth) | R2 public bucket URL, Cloudflare CDN |
| Post/feed photos | Public (no auth) | R2 public URL, Cloudflare CDN |
| User-private photos | Signed URL | Worker-generated time-limited tokens |
| Video thumbnails | Public (no auth) | R2 public URL |
| HLS segments (public content) | Public (no auth) | R2 CDN-cached segments |
| HLS segments (gated content) | Signed tokens | Worker JWT validation per request |
| Raw video downloads | Signed URL | Presigned GET URL with TTL |
| Original photo downloads | Signed URL | Presigned GET URL with TTL |

### 10.2 R2 Presigned URL Generation

Node.js backend generates time-limited presigned URLs using the AWS SDK v3 (S3-compatible with R2 endpoint). Configuration:

| Parameter | Value | Reason |
|---|---|---|
| PUT URL TTL | 15 minutes | Short enough to prevent abuse, long enough for slow connections |
| GET URL TTL | 1 hour | Standard read access duration |
| Download URL TTL | 5 minutes | Strict — only for intentional downloads |
| Signed token TTL (Worker) | 4 hours | HLS streaming session duration |

**Critical:** Presigned URLs generate unique URLs per session, which **bypasses Cloudflare CDN caching**. For high-traffic public content (feed thumbnails, profile photos), use a public CDN URL instead. Reserve presigned URLs for private, download, or authenticated access scenarios.

### 10.3 Worker-Based Signed Token Flow

For private video streaming where CDN cacheability must be preserved:

```
1. Flutter requests video playback token
   POST /api/videos/{uuid}/playback-token
   Header: Authorization: Bearer {jwt}

2. Backend validates JWT, checks access rights
   Returns: { token: "{hmac_signed_token}", expiresAt: ... }
   Token payload: { videoId, userId, exp: now + 4h }
   Signature: HMAC-SHA256 with secret key

3. Flutter appends token to HLS URL
   GET https://media.yourdomain.com/v/{uuid}/master.m3u8?token={token}

4. Worker validates token on every segment request
   - Verify HMAC signature
   - Check expiry
   - Optionally validate IP binding
   - On valid: serve from R2/cache
   - On invalid: return 401
```

Worker-validated tokens, unlike presigned URLs, use the same URL path across all users — enabling Cloudflare edge caching. The token is in the query string but the cache key is the path only (configured via `cf.cacheKey`).

---

## 11. Authentication & Authorization Flow

### 11.1 Token Architecture

```
Flutter App ──POST /auth/login──► Node.js Backend
                                       │
                           Validate credentials
                           Issue: Access Token (JWT, 15min TTL)
                                  Refresh Token (opaque, 30-day TTL)
                                       │
Flutter App ◄── { accessToken, refreshToken } ◄─┘
       │
       │ Store tokens securely (Flutter Secure Storage)
       │
       │ All API requests: Authorization: Bearer {accessToken}
       │ All media requests: ?token={media_signed_token}
       │
       │ On 401: request new accessToken using refreshToken
       │ POST /auth/refresh → new accessToken
```

### 11.2 Media Authorization vs API Authorization

These are deliberately separate tokens:

| Token Type | Used For | TTL | Issuer |
|---|---|---|---|
| JWT Access Token | API calls to Node.js backend | 15 minutes | Node.js backend (HS256) |
| Media Signed Token | HLS streaming, private photo access | 4 hours | Node.js backend (HMAC-SHA256) |
| Presigned PUT URL | Direct upload to R2 | 15 minutes | Node.js backend via AWS SDK |
| Presigned GET URL | Private file download | 1 hour | Node.js backend via AWS SDK |

The separation allows CDN caching of media (the Worker validates the media token without touching the backend), while keeping API authentication tight.

### 11.3 Worker Token Validation (Edge Auth)

The Cloudflare Worker validates media tokens at the edge — no backend round-trip required for video segment delivery. The Worker:

1. Extracts token from query string
2. Verifies HMAC signature using a shared secret (stored in Workers Secrets)
3. Checks expiry timestamp
4. Allows or rejects the request
5. On allow: fetches from R2 and populates edge cache

This pattern enables authenticated content delivery at CDN speed — edge validation adds ~1–2ms overhead versus unauthenticated delivery.

---

## 12. CDN & Edge Caching Strategy

### 12.1 Cloudflare CDN Integration

Cloudflare CDN is automatically active for any content served through Cloudflare Workers or R2 public buckets connected to a custom domain. There is no additional setup or cost.

**Cache zones:**
- **Edge Cache:** Content cached at the specific Cloudflare PoP serving the user. Fastest.
- **Tiered Cache (Argo/Cache Reserve):** Optional paid feature. Reduces origin hits by routing through a regional "parent" cache before hitting R2.

For most applications, the default edge cache is sufficient. Cache Reserve (starts at $0.015/GB/month stored in reserve) is beneficial for very large video catalogs with infrequent access patterns.

### 12.2 Cache Key Design

Default Cloudflare cache keys use the full URL including query parameters. For Worker-authenticated media, configure a custom cache key that excludes the token:

```
Cache key: {protocol}://{hostname}/{path}
Excludes: ?token=... query parameter
```

This ensures the same segment file is cached regardless of which user requests it, maximizing cache hit rates. The Worker validates the token before serving from cache — cached content is only returned after successful authentication.

### 12.3 Cache-Control Configuration

Apply these headers from the Worker response:

| Content | Cache-Control Value |
|---|---|
| HLS .ts segments | `public, max-age=31536000, immutable` |
| HLS .m3u8 playlists | `public, max-age=3600` |
| Image thumbnails | `public, max-age=86400` |
| Profile photos | `public, max-age=86400, stale-while-revalidate=86400` |
| Signed/private content | `private, no-store` |
| API responses | `no-cache, no-store` |

### 12.4 Cache Invalidation

R2 does not support automatic cache invalidation (unlike some CDN-native storage). For content that must be updated:

- **Photos:** Assign a new UUID on update rather than overwriting the same key. Update the database to point to the new key. Old cached URL naturally expires.
- **Videos:** Same UUID approach — new transcode = new HLS folder path.
- **Explicit purge:** Use Cloudflare Cache API or dashboard to purge specific URLs when necessary (e.g., content moderation removal).

---

## 13. Media Optimization Strategy

### 13.1 Image Optimization

**Format strategy:** Always serve images in modern formats. Cloudflare Images' `format=auto` parameter automatically selects:
- AVIF for Chrome 85+, Edge 121+
- WebP for Safari 16+, older Chrome
- JPEG for legacy browsers

AVIF provides 40–50% smaller file sizes vs JPEG at equivalent quality. WebP provides 25–35% smaller. The automatic format negotiation is handled entirely by Cloudflare Images — zero engineering effort after initial setup.

**Quality settings:** Use 80–85% quality for thumbnails, 88–92% for preview images. This typically achieves 3–5× file size reduction vs unoptimized JPEG at visually identical quality.

**Pre-upload client-side compression:** Before uploading, compress images on the Flutter client to a maximum of 2MP and 80% JPEG quality. This reduces upload time, R2 storage costs, and the size of the original that Cloudflare Images transforms. Do not compress below 1MP — Cloudflare Images needs sufficient resolution to generate quality variants.

### 13.2 Video Optimization

**Pre-upload client compression:** On mobile devices, use Flutter's video compression capabilities (via `video_compress` package) to cap upload quality at 720p/1080p and 5 Mbps before upload. This reduces raw storage and transcoding time significantly.

**Faststart for MP4:** Any MP4 file served directly (short clips, fallback player) must have the `moov` atom at the beginning of the file. This is achieved by running ffmpeg with the `-movflags faststart` flag during transcoding. Without this, browsers must download the entire file before playback begins.

**Segment duration:** 4-second HLS segments are the industry standard. They balance:
- Seek precision (maximum 4-second seek inaccuracy)
- Request overhead (shorter segments = more HTTP requests)
- Buffering resilience (longer segments = smoother buffering on poor networks)

**Codec:** H.264/AVC remains the recommended video codec for maximum device compatibility on Android and iOS. H.265/HEVC offers 40–50% better compression but lacks universal hardware decoding support on older Android devices. HEVC is suitable only if your user base is predominantly on devices from 2018+.

---

## 14. Public vs Private Storage Strategy

### 14.1 Bucket Architecture

Maintain separate R2 buckets by access pattern — do not mix public and private content in the same bucket.

| Bucket | Access Model | Content | Worker Required |
|---|---|---|---|
| `media-public` | Public URL | Profile photos, feed thumbnails, video thumbnails | No |
| `media-private` | Private (Worker auth) | User-private photos, gated video content | Yes |
| `media-videos` | Private (Worker auth) | HLS segments and playlists | Yes (for gated) |
| `media-originals` | Private (no CDN delivery) | Raw uploaded originals | Presigned URLs only |

**R2 CORS configuration:** Set explicit CORS policies per bucket. Public buckets: allow all origins for GET requests. Private buckets: allow only your app's domain.

### 14.2 Access Control Decision

For most social/portfolio applications, the majority of media content is legitimately public (it's meant to be discovered). Keep this content in the public bucket with direct CDN URLs — no token overhead, maximum CDN cache efficiency, lowest latency.

Reserve the authenticated access pattern for:
- Subscription-gated content (premium videos)
- User-private photos (explicitly marked private by user)
- Purchase-required downloads
- Draft/unpublished content not yet meant for public viewing

---

## 15. Database Metadata Strategy

### 15.1 Schema Design

Store R2 object keys (not full URLs) in the database. Generate delivery URLs dynamically at the API layer.

**Photos table:**
```
id, userId, objectKey, bucketName, mimeType, sizeBytes,
width, height, isPublic, status, createdAt, updatedAt
```

**Videos table:**
```
id, userId, rawObjectKey, hlsMasterKey, thumbnailKey,
durationSeconds, sizeBytes, status (raw_uploaded | transcoding | ready | failed),
qualities (json: [720p, 480p, 360p]), isPublic,
createdAt, transcodedAt, updatedAt
```

**URL generation pattern (Node.js API layer):**
```
function getPhotoUrl(objectKey, variant) {
  return `https://media.yourdomain.com/${objectKey}?variant=${variant}`
}

function getVideoUrl(hlsMasterKey, token) {
  return `https://media.yourdomain.com/${hlsMasterKey}?token=${token}`
}
```

### 15.2 Metadata Fields to Store

Never store in database: full CDN URLs, presigned URLs, temporary tokens. These expire and must be regenerated on each API response.

Always store in database: R2 object key, bucket name, file metadata (size, dimensions, duration, MIME type), processing status, access control flags.

---

## 16. Flutter Integration Strategy

### 16.1 Upload Flow

**Photo upload package:** `http` or `dio` for HTTP requests; `image_picker` for camera/gallery access; `image` package for client-side compression before upload.

**Video upload package:** `video_picker` for selection; `video_compress` for client-side compression; `dio` with `MultipartFile` for multipart upload with progress tracking.

**Upload progress tracking:** The presigned URL PUT request is a direct HTTP request to R2. Use `dio` with a progress callback on the PUT request to display a real-time upload progress bar.

**Retry strategy:** Implement exponential backoff for failed segments in multipart uploads. Store the upload ID and completed parts in local storage (`shared_preferences`) to enable resume after app termination.

### 16.2 Image Display

Use `cached_network_image` package for all media display. This handles:
- Memory and disk caching of downloaded images
- Progressive loading with placeholder support
- Automatic retry on failed loads

**URL construction pattern:**
```
Base URL: https://media.yourdomain.com/{objectKey}
Thumbnail: ?variant=thumbnail (or ?w=200&h=200&fit=crop&format=auto)
Preview: ?variant=preview
Full: ?variant=full (or no params for raw)
```

Pass the `cacheKey` parameter to `cached_network_image` using just the object key (without variant query params) when you want the same underlying image cached regardless of the variant being displayed.

### 16.3 Video Playback

**Package:** `video_player` (official Flutter plugin) + `chewie` for controls. The `video_player` plugin uses ExoPlayer on Android (full HLS ABR support) and AVPlayer on iOS (native HLS). Both handle HLS playlist parsing and quality switching natively.

**Private video pattern:** Obtain a media token from the backend before constructing the HLS URL. Include the token as a query parameter in the master playlist URL. The player's subsequent requests for quality playlists and segments will also include the token (since they're relative URLs resolved against the base).

**Preloading:** Pre-fetch the master playlist and first 2 segments before the user taps play. This eliminates the startup latency perception. Implement this in a background isolate when a video comes within 2 items of the viewport in a scroll list.

### 16.4 Offline Support

For apps requiring offline video access:
- Download HLS segments to local storage during connectivity
- Use `path_provider` + `flutter_file_downloader` for segment management
- Build a local file server or use a local HTTP server to serve segments to the video player from local storage

---

## 17. Node.js + Express Integration Strategy

### 17.1 R2 Client Setup

Use the AWS SDK v3 S3 client, configured to point at the R2 endpoint. R2 is fully compatible with the S3 API — the only difference is the endpoint URL and no region requirement.

**Environment configuration:**
```
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_api_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret
R2_BUCKET_PUBLIC=media-public
R2_BUCKET_PRIVATE=media-private
R2_BUCKET_VIDEOS=media-videos
R2_ENDPOINT=https://{accountId}.r2.cloudflarestorage.com
WORKER_SECRET=your_hmac_signing_secret_for_media_tokens
CDN_BASE_URL=https://media.yourdomain.com
```

### 17.2 API Route Architecture

| Route | Method | Description |
|---|---|---|
| `/api/media/photo/upload-url` | POST | Generate presigned PUT URL for photo |
| `/api/media/photo/:id/complete` | POST | Mark photo upload complete |
| `/api/media/photo/:id` | GET | Return photo metadata + CDN URLs |
| `/api/media/photo/:id` | DELETE | Delete photo from R2 + DB |
| `/api/media/video/upload-url` | POST | Generate presigned PUT URL for video |
| `/api/media/video/:id/complete` | POST | Mark upload complete, enqueue transcoding |
| `/api/media/video/:id` | GET | Return video metadata + playback token |
| `/api/media/video/:id/status` | GET | Transcoding progress polling |
| `/api/media/video/:id` | DELETE | Delete all R2 assets + DB record |

### 17.3 Transcoding Queue Integration

Use BullMQ (Redis-backed job queue) to manage the ffmpeg transcoding pipeline:

- `video:transcode` queue: receives job when upload completes
- Worker process runs ffmpeg, uploads HLS files to R2
- On completion: updates DB record status, sends push notification to user
- On failure: retries up to 3 times with exponential backoff; marks status `failed` and alerts monitoring

**Environment separation:** Run the transcoding worker as a separate Node.js process (or Docker container) from the Express API server. This prevents transcoding CPU usage from impacting API response times.

### 17.4 Signed Media Token Generation

Generate HMAC-SHA256 signed tokens for media access authorization:

Token payload structure:
```
{
  sub: userId,
  vid: videoId,
  exp: unixTimestamp (now + 4 hours),
  iat: unixTimestamp
}
```

Sign with a rotating secret stored in environment variables. Rotate secrets on a 30-day schedule; maintain the previous secret for the remaining TTL of tokens issued before rotation.

---

## 18. Direct Upload vs Backend Upload

### 18.1 Comparison

| Dimension | Direct Upload (Presigned URL) | Backend Upload (Via Server) |
|---|---|---|
| Backend bandwidth | None — zero bytes pass through server | Full file bandwidth through server |
| Upload speed | Faster — direct path to R2 | Slower — extra hop through backend |
| Backend load | Minimal (only URL generation) | High CPU + memory + network |
| Cost | Lowest | Higher (EC2/VPS bandwidth + compute) |
| Validation | Limited to pre-upload checks | Full post-upload validation possible |
| Security | Requires strict TTL management | All control at backend |
| Resume support | Requires client-side multipart logic | Easier server-side management |
| File size limit | Enforced at R2 (can set max bytes) | Enforced at server middleware |
| Progress tracking | Native in HTTP client | Requires streaming pass-through |

### 18.2 Recommendation: Direct Upload Always

For a mobile application, direct upload to R2 via presigned URL is non-negotiable at scale. Backend-proxied uploads cause:
- Doubled storage bandwidth (upload → server → R2)
- Server memory pressure (holding file in memory or temp disk)
- Server cost linear with media volume

The only valid exception is server-side processing before storage (e.g., content moderation scanning via an API that requires sending the file to the scan service first). In this case, stream the upload from client to server and immediately stream to R2 without buffering the entire file.

---

## 19. Media Lifecycle Management

### 19.1 Retention Policies

| Content Type | Active Storage | Archival Trigger | Archive Action |
|---|---|---|---|
| Raw uploaded videos | R2 Standard | 30 days after transcoding | Move to R2 Infrequent Access |
| HLS segments | R2 Standard | Never (always active) | — |
| Deleted user content | Mark deleted in DB | Immediately | Schedule R2 deletion (24h delay for safety) |
| Thumbnails | R2 Standard | With parent video deletion | Delete together |
| Original photos | R2 Standard | User-initiated deletion | 30-day soft delete |

### 19.2 Soft Delete Strategy

Never immediately delete from R2 on user deletion request. Instead:
1. Mark as `soft_deleted` in database (immediately invisible to users)
2. Schedule hard deletion from R2 after 30 days (allows recovery, handles disputes)
3. On hard delete: delete all associated R2 objects (photo, all variants, thumbnail) in a background job
4. Content moderation flags: immediate hard deletion, no soft delete period

### 19.3 Storage Quota Enforcement

Track cumulative storage per user in the database. Enforce quotas at presigned URL generation time — reject requests if the user's quota would be exceeded. Update the stored size on upload completion.

For accurate tracking, record the actual uploaded file size (returned by R2 in the ETag response or via a HEAD request after upload) rather than the client-declared size.

---

## 20. Cost Analysis in INR

**Assumptions:**
- Exchange rate: 1 USD = ₹94.15 (May 7, 2026 — verified)
- Photo-heavy app: 10 photos/active creator, avg 500KB each, 50 views/photo/month
- Video-heavy app: 3 videos/active creator, avg 5 min/44MB each, 10 views/video/month
- Mixed: both photo and video profiles above combined
- Active creators: 20% of registered users
- High streaming: 50 views/video/month (5× base video scenario)
- All videos use R2+HLS approach (not Cloudflare Stream)
- Workers Paid plan included from 10K users

---

### 20.1 Cloudflare R2 Pricing Reference (May 2026)

| Component | Rate | INR Equivalent |
|---|---|---|
| Standard Storage | $0.015/GB/month | ₹1.41/GB/month |
| IA Storage | $0.010/GB/month | ₹0.94/GB/month |
| Class A Ops | $4.50/million | ₹423.68/million |
| Class B Ops | $0.36/million | ₹33.89/million |
| Egress | $0.00 | ₹0.00 |
| **Free tier** | 10GB + 1M Class A + 10M Class B | Monthly |

---

### 20.2 Photo-Heavy Application

**Per-user storage:** 10 photos × 500KB = 5MB/creator  
**Monthly reads:** 10 photos × 50 views = 500 Class B ops/creator

| Scale | Creators | Storage | Read Ops | Workers Paid | Transforms | **Total/Month** |
|---|---|---|---|---|---|---|
| 1K users | 200 | 1GB (free) | 100K (free) | ₹0 | Free tier | **₹0–₹55** |
| 10K users | 2K | 10GB (at free limit) | 1M (free) | ₹0 | Free tier | **₹0–₹110** |
| 100K users | 20K | 100GB → ₹127 | 10M (free) | ₹470.75 | 100K→₹47 | **~₹645/month** |
| 1M users | 200K | 1TB → ₹1,398 | 100M → ₹3,050 | ₹470.75 | 1M→₹471 | **~₹5,390/month** |

---

### 20.3 Video-Heavy Application (R2 + HLS)

**Per-creator storage:** 3 videos × 44MB raw + 1.8× HLS = ~237MB/creator  
**Monthly reads:** 3 videos × 10 views × ~15 segment requests = 450 Class B ops/creator

| Scale | Creators | Storage | Workers | Read Ops | **Total/Month** |
|---|---|---|---|---|---|
| 1K users | 200 | 47.4GB → ₹52.82 | ₹0 | 90K (free) | **~₹53–₹145** |
| 10K users | 2K | 474GB → ₹655 | ₹470.75 | 900K (free) | **~₹1,126/month** |
| 100K users | 20K | 4.74TB → ₹6,680 | ₹470.75 | 9M (free) | **~₹7,151/month** |
| 1M users | 200K | 47.4TB → ₹66,927 | ₹470.75 | 90M → ₹2,712 | **~₹70,110/month** |

---

### 20.4 Mixed Media Application

**Per-creator:** 5MB photos + 237MB videos = ~242MB/creator  
**Monthly reads:** photo ops + video ops combined

| Scale | Storage Cost | Operations Cost | Workers | **Total/Month** |
|---|---|---|---|---|
| 1K users | ₹53 | ₹0 | ₹0 | **~₹53–₹170** |
| 10K users | ₹655 | ₹0 | ₹470.75 | **~₹1,126/month** |
| 100K users | ₹6,680 | ₹34 | ₹470.75 | **~₹7,185/month** |
| 1M users | ₹66,927 | ₹5,761 | ₹470.75 | **~₹73,159/month** |

---

### 20.5 High Streaming Traffic (Video × 50 views/month)

**Scenario:** 200K creators × 3 videos × 50 views × 15 segment reads = 450M Class B ops/month at 1M users

| Scale | Storage | Extra Read Ops Cost | Workers Cost | **Total/Month** |
|---|---|---|---|---|
| 1K users | ₹53 | ₹0 (within free) | ₹0 | **~₹53** |
| 10K users | ₹655 | ₹0 (within free) | ₹470.75 | **~₹1,126** |
| 100K users | ₹6,680 | ₹1,525 (45M ops over free) | ₹470.75 | **~₹8,676/month** |
| 1M users | ₹66,927 | ₹14,913 (440M ops over free) | ₹470.75 + ₹26,562 (extra Workers) | **~₹1,08,873/month** |

*High-traffic read operations are the primary cost driver at 1M users in streaming scenarios. Mitigation: aggressive CDN caching reduces effective R2 Class B ops significantly — first-request caching means each segment is read from R2 only once per Cloudflare PoP.*

---

### 20.6 Cloudflare Stream Cost (for comparison — same video-heavy scenario)

Stream charges per minute stored and per minute delivered.  
3 videos × 5 min = 15 min/creator. 10 views/month = 150 min delivered/creator.

| Scale | Creators | Min Stored | Storage Cost | Min Delivered | Delivery Cost | **Total/Month** |
|---|---|---|---|---|---|---|
| 1K users | 200 | 3,000 min | $15 = ₹1,412.25 | 30,000 min | $30 = ₹2,824.50 | **₹4,236.75** |
| 10K users | 2K | 30,000 min | $150 = ₹14,122.50 | 300,000 min | $300 = ₹28,245 | **₹42,367.50** |
| 100K users | 20K | 300,000 min | $1,500 = ₹1,41,225 | 3M min | $3,000 = ₹2,82,450 | **₹4,23,675/month** |
| 1M users | 200K | 3M min | $15,000 = ₹14,12,250 | 30M min | $30,000 = ₹28,24,500 | **₹42,36,750/month** |

**R2+HLS vs Stream cost ratio:** ~80–82× cheaper at all scales for VOD content.

---

### 20.7 Infrastructure Addition Costs

| Service | Cost (INR/month) | Required At |
|---|---|---|
| Transcoding VPS (2 vCPU, ffmpeg queue) | ₹750–₹2,000 | All scales |
| Redis (BullMQ queue) | ₹0–₹425 (free tier available) | All scales |
| Additional transcoding capacity | ₹2,000–₹8,000 | 100K+ users (high upload volume) |
| Cloudflare Workers Paid | ₹470.75 | 10K+ users |

---

## 21. Provider Comparison

### 21.1 Storage Provider Comparison

| Dimension | Cloudflare R2 | AWS S3 + CloudFront | Firebase Storage | Supabase Storage | Bunny.net CDN |
|---|---|---|---|---|---|
| Storage cost/GB | ₹1.41 | ₹2.17 (S3 Standard) | ₹2.21 | ₹1.78 ($21/mo Pro incl. 100GB) | ₹0.94 |
| Egress cost/GB | **₹0** | ₹8.47 (after 100GB free) | ₹11.30 | ₹0 (CDN) | ₹0.47 |
| S3 API compatible | ✅ Yes | ✅ Native | ❌ No | ✅ Yes | ❌ No |
| Global PoPs | 330+ | 600+ (CloudFront) | Google Network | Fly.io regions | 100+ |
| CDN integration | Built-in | Requires CloudFront setup | Built-in | Manual | Built-in |
| Image transforms | Via Images add-on | Via Lambda@Edge | Via Extensions | Via imgproxy | Limited |
| Video streaming | Via HLS/R2 or Stream | Via MediaConvert + CF | Manual | Manual | Manual |
| Workers / Edge compute | ✅ Native | Lambda@Edge | Cloud Functions | Edge Functions | Edge Rules |
| Free tier | 10GB + ops | 5GB (12 months) | 5GB + 1GB/day egress | 500MB | None |
| India latency | Excellent (Mumbai PoP) | Good (Mumbai region) | Good | Fair | Good |
| Auth/signed URLs | ✅ Presigned + Worker | ✅ Presigned + CF signed | ✅ Firebase Rules | ✅ Built-in | ✅ Token auth |
| Vendor lock-in | Low (S3 compat.) | Medium (CloudFront) | High (Firebase SDK) | Low (S3 compat.) | Medium |

### 21.2 Video Platform Comparison

| Dimension | R2 + HLS (Recommended) | Cloudflare Stream | Mux | AWS MediaConvert + S3 |
|---|---|---|---|---|
| Storage model | Per GB | Per minute stored | Per minute stored | Per GB |
| Delivery model | ₹0 egress | Per minute delivered | Per minute delivered | CloudFront per GB |
| Auto transcoding | No (manual ffmpeg) | Yes | Yes | Yes (per-job cost) |
| Adaptive bitrate | Manual HLS | Automatic | Automatic | Manual or auto |
| Live streaming | No | Yes | Yes | Yes (IVS) |
| Analytics | Manual/custom | Built-in | Built-in (detailed) | CloudWatch |
| DRM | No (open HLS) | No | Yes (FairPlay/Widevine) | Via AWS DRM |
| Custom player | Required | Optional (iframe or HLS) | Optional | Required |
| Engineer investment | High (1–2 weeks) | Low (1–2 days) | Low (1–2 days) | High (2–4 weeks) |
| Cost at 10K users | ~₹1,126/month | ~₹42,368/month | ~₹12,000–₹25,000/month | ~₹5,000–₹15,000/month |
| Vendor lock-in | None (S3+HLS) | Moderate | High | Moderate |

### 21.3 Why Not Firebase Storage or AWS S3?

**Firebase Storage:**
- Egress cost ($0.12/GB = ₹11.30/GB) is prohibitive for video delivery
- Requires Firebase SDK dependency — increases Flutter app size and ties you to Google ecosystem
- No native image transformation
- Storage at $0.026/GB is 72% more expensive than R2
- At 100K users with moderate video: egress alone would exceed ₹50,000/month

**AWS S3 + CloudFront:**
- S3 standard storage is 53% more expensive per GB than R2
- CloudFront setup requires separate configuration, origin access control, signed URL policies
- Within the same AWS region, S3→CloudFront transfer is free — the main case where S3+CF becomes cost-competitive with R2
- MediaConvert transcoding adds per-minute cost on top
- Total complexity is significantly higher for a startup or mid-size team
- Lock-in to AWS ecosystem makes future migration expensive

**Supabase Storage:**
- Convenient for teams already on Supabase (auth, database, storage in one platform)
- Storage is S3-compatible
- However, lacks native image transformation at scale, no native video transcoding, limited CDN options
- Suitable for MVP; outgrown as media volume scales

**Bunny.net:**
- Excellent CDN with low egress cost (₹0.47/GB)
- BunnyCDN Storage ($0.01/GB) is cheaper than R2
- No Workers equivalent for edge compute
- No image transformation product
- More appropriate as a pure CDN in front of another storage backend
- Reasonable choice for read-heavy workloads if you're already on another storage provider

---

## 22. Scalability & High-Traffic Handling

### 22.1 R2 Scalability Characteristics

Cloudflare R2 has no documented throughput limits — it is designed for unlimited concurrent reads and writes. The underlying infrastructure powers Cloudflare's CDN, which serves 20% of global internet traffic. Practically, R2 scales automatically without configuration.

**Cloudflare CDN amplification:** The first request for any content at each PoP hits R2 (Class B op). All subsequent requests are served from the edge cache at zero additional cost. For popular content (widely viewed videos, common thumbnails), the effective R2 operation rate approaches 0 per additional viewer.

### 22.2 Scaling Stages

**Stage 1 (0–10K users):**
- Single Node.js instance, single VPS for transcoding
- R2 free tier covers most storage costs
- Workers Free plan (100K req/day) sufficient
- Total infrastructure cost: ₹0–₹2,000/month

**Stage 2 (10K–100K users):**
- Node.js with PM2 cluster mode or horizontal scaling
- Multiple transcoding workers with BullMQ concurrency control
- Workers Paid plan essential (₹470.75/month)
- Storage costs begin to be significant
- Add database read replicas for metadata queries
- Total infrastructure cost: ₹2,000–₹15,000/month

**Stage 3 (100K–1M users):**
- Node.js behind a load balancer (multiple instances)
- Auto-scaling transcoding workers (Kubernetes or managed containers)
- Database sharding or read replica pool
- Cache Reserve for popular video segments
- Total infrastructure cost: ₹15,000–₹1,00,000/month

**Stage 4 (1M+ users):**
- Multi-region Node.js deployment
- Dedicated CDN optimization review with Cloudflare
- Tiered storage: hot videos in Standard, old videos in Infrequent Access
- Negotiate volume pricing with Cloudflare
- Consider hybrid: R2 for storage, Cloudflare Stream only for top-creator content

### 22.3 Upload Surge Handling

During viral events or promotional launches, upload rates may spike. R2 handles this automatically. The bottleneck is typically the transcoding pipeline. Mitigation:

- Use a message queue (BullMQ) with configurable concurrency
- Spin up additional transcoding workers dynamically
- Implement upload queue depth monitoring with alerts
- Consider priority queuing (premium user uploads transcoded first)

### 22.4 Read Surge / CDN Performance

Popular videos that go viral are entirely handled by Cloudflare's edge CDN once cached. The viral video is read from R2 once per PoP, then served from cache for millions of subsequent views. No backend changes required.

---

## 23. Production Security Best Practices

### 23.1 R2 Access Key Security

- Create dedicated R2 API keys with minimum required permissions (bucket-level, not account-level)
- Separate keys for read-only operations (CDN Worker) and read-write operations (backend upload)
- Store API keys in environment variables only — never commit to version control
- Rotate API keys every 90 days; automate rotation where possible
- Use Cloudflare Workers Secrets for secrets used in Workers (encrypted at rest, never exposed in logs)

### 23.2 Presigned URL Security

- Set strict TTLs — 15 minutes for upload URLs, 1 hour for read URLs
- Enforce Content-Type matching at the presigned URL level (prevents MIME type confusion attacks)
- Validate file size server-side after upload completes (R2 provides ETag + size in the response headers)
- Never expose presigned PUT URLs to the public — only issue to authenticated users
- Log all presigned URL generation events with user ID, IP, and timestamp

### 23.3 Worker Security

- Validate all incoming tokens cryptographically (HMAC-SHA256 — do not use simple comparisons)
- Implement `timingSafeEqual` for token comparison to prevent timing attacks
- Set strict `Access-Control-Allow-Origin` headers (only your app's domain)
- Implement IP binding for high-value content (bind media tokens to the issuing IP)
- Log authentication failures — sustained 401 patterns indicate brute force or token theft

### 23.4 Content Security

- Validate MIME types before issuing presigned URLs (allowlist: image/jpeg, image/png, image/webp, image/gif, video/mp4)
- Scan uploaded content through a content moderation API (Google Vision SafeSearch, AWS Rekognition) before marking as `ready` in the database
- For flagged content: immediately soft-delete from database (hidden from users) and schedule R2 deletion
- Implement file size limits at the API level (not just client-side): reject presigned URL requests for files exceeding limits

### 23.5 TLS and Transport Security

- Cloudflare enforces TLS 1.2+ on all custom domains — no additional configuration required
- Enable "Always Use HTTPS" in Cloudflare dashboard
- Set HSTS (HTTP Strict Transport Security) headers via Worker
- Enable Minimum TLS Version to 1.2 in Cloudflare SSL/TLS settings

### 23.6 DDoS Protection

Cloudflare's DDoS protection is automatically active at the CDN and network layer. At the application layer:

- Enable Cloudflare's rate limiting rules for presigned URL generation endpoints
- Use Cloudflare's Bot Management or Bot Fight Mode to block automated upload attempts
- Configure firewall rules to restrict presigned URL generation API to expected geographic regions (if applicable)

---

## 24. Failure Scenarios & Recovery

### 24.1 Scenario: R2 Upload Failure

**Cause:** Network interruption during upload, R2 service degradation  
**Detection:** Client-side timeout or HTTP 5xx response  
**Recovery:**
- For small files (<100MB): retry the entire upload (re-request presigned URL if original expired)
- For large files: resume using multipart upload — the Upload ID remains valid for 24 hours; complete parts are not re-uploaded
- Store `uploadId` and completed part ETags in Flutter's local storage for resume capability
- Expose a "Resume Upload" button in the app UI after failure detection

### 24.2 Scenario: Transcoding Job Failure

**Cause:** ffmpeg crash, VPS memory exhaustion, corrupt input file  
**Detection:** BullMQ job failure event, job moves to failed queue  
**Recovery:**
- Automatically retry up to 3 times with exponential backoff (1 min, 5 min, 15 min)
- After max retries: mark video status as `transcoding_failed` in DB, notify user
- Provide "Retry Transcoding" endpoint for manual re-trigger (useful for transient failures)
- Alert engineering team via PagerDuty/Slack on transcoding failure rate > 5%
- Log ffmpeg stderr output for diagnosis

### 24.3 Scenario: Worker Authentication Failure

**Cause:** Expired secret key, misconfigured Worker, R2 connectivity issue  
**Detection:** User reports video not playing; 401/403 errors in Worker logs  
**Recovery:**
- Worker health check endpoint that validates R2 connectivity and secret key availability
- Automatic alert if Worker error rate exceeds 1% over 5 minutes
- Cloudflare's Worker retry logic automatically retries transient R2 failures
- Rollback mechanism: deploy previous Worker version via Cloudflare dashboard in < 2 minutes

### 24.4 Scenario: R2 Regional Degradation

**Cause:** Cloudflare infrastructure issue (extremely rare — R2 is built on the same infrastructure as Cloudflare CDN)  
**Detection:** Cloudflare's status page (status.cloudflare.com), increased error rates  
**Recovery:**
- Cloudflare publishes real-time incident updates
- R2 has no concept of "regions" — data is globally distributed; a PoP outage doesn't affect R2 availability
- Implement read-fallback: if Worker cannot reach R2, return a 503 with `Retry-After` header

### 24.5 Scenario: Presigned URL Expiry Before Upload

**Cause:** User pauses mid-upload, poor connectivity, app backgrounded  
**Detection:** R2 returns 403 on PUT with "Request has expired" message  
**Recovery:**
- Detect 403 on upload attempt; automatically re-request a new presigned URL from the backend
- The backend re-issues for the same object key (overwrite is idempotent for new uploads)
- The DB record remains in `pending` state; the new upload overwrites the partial or missing file

---

## 25. Monitoring & Logging

### 25.1 Cloudflare Analytics

Available without additional cost:
- **Workers Analytics:** Request count, error rate, CPU time per Worker invocation, subrequest breakdown
- **R2 Analytics:** Total operations, data stored, Class A/B operation counts, storage growth
- **Cloudflare Images Analytics:** Transformation count, cache hit rate, format distribution

Access via Cloudflare Dashboard → Analytics & Logs.

### 25.2 Custom Observability

**Structured logging from Workers:**  
Use `console.log` in Workers with JSON-structured payloads. Pipe to Cloudflare Logpush (paid feature) or use the Workers Analytics Engine (free, custom metrics) for custom dashboards.

**Key metrics to track:**

| Metric | Alert Threshold | Action |
|---|---|---|
| Worker error rate | > 1% over 5 min | Investigate Worker logs, possible secret rotation needed |
| R2 Class B ops/hour | > 80% of free tier | Confirm CDN cache hit rate is adequate |
| Transcoding queue depth | > 100 jobs | Spin up additional transcoding worker |
| Upload failure rate | > 5% | Check R2 connectivity, presigned URL TTL |
| Video play failure rate | > 2% | Check HLS segment availability, Worker auth |
| Storage growth/week | > 150% of previous week | Check for abuse, enforce quotas |

**Application-level logging:**  
Node.js backend: use `pino` (structured JSON logging) with log levels. Push logs to a log aggregation service (Datadog, Logtail, or Cloudflare's own Logs Explorer for Worker logs).

### 25.3 Database Metrics

Track in the application database:
- Upload events (count, size, user, success/failure)
- Transcoding job completion times and failure rates
- Storage per user (for quota enforcement)
- Media deletion events (for storage cost reconciliation)

---

## 26. Rate Limiting & Abuse Protection

### 26.1 Cloudflare Rate Limiting

Configure Cloudflare Rate Limiting rules (available on all plans) for:

| Endpoint | Limit | Window | Action |
|---|---|---|---|
| `POST /api/media/photo/upload-url` | 10 requests | Per minute per IP | Block for 1 hour |
| `POST /api/media/video/upload-url` | 3 requests | Per minute per IP | Block for 1 hour |
| `POST /auth/login` | 5 requests | Per minute per IP | Block for 10 minutes |
| `GET /api/media/video/*/playback-token` | 30 requests | Per minute per user | Return 429 |

### 26.2 Storage Quota Enforcement

- Per-user storage quota (e.g., 1GB photos, 5GB video for free tier)
- Per-user daily upload limit (e.g., 50 photos/day, 5 videos/day)
- Check quota at presigned URL generation — reject before upload begins
- Expose quota status in user profile API response for UI display

### 26.3 Content Abuse Prevention

- Scan all uploaded images for NSFW content using Google Vision SafeSearch or AWS Rekognition before marking `ready`
- Scan video thumbnails (extracted frame) for NSFW content
- Hash-based duplicate detection: store SHA-256 hash of every upload; flag exact duplicates across accounts
- Implement perceptual hashing (pHash) for near-duplicate video detection to prevent re-upload of banned content

### 26.4 Hotlink Protection

Configure the Cloudflare Worker to validate the `Referer` header for public media endpoints. Block requests not originating from your app's domain. This prevents:
- Other websites embedding your R2 CDN URLs (free bandwidth theft)
- Automated scraping and bulk download of your media catalog

Exception: allow empty Referer for direct URL access (iOS/Android apps typically send no Referer).

---

## 27. Cost Optimization Strategy

### 27.1 Maximize CDN Cache Hit Rate

The most impactful cost optimization is maximizing Cloudflare edge cache hits. Every cache hit for a video segment means zero R2 Class B operations. Strategies:

- Set `immutable` Cache-Control on HLS segments (they never change)
- Use consistent URL patterns — avoid cache-busting parameters on immutable content
- Configure Workers to set proper cache keys (exclude auth tokens from cache key)
- Enable Tiered Caching (Argo or Cache Reserve) if content has long-tail access patterns

### 27.2 R2 Infrequent Access for Archive

Move raw MP4 originals (retained as backup) to R2 Infrequent Access storage after 30 days:
- IA storage: $0.010/GB/month vs Standard $0.015/GB — 33% savings
- IA data retrieval: $0.010/GB applies only when re-downloading originals for re-transcoding
- Implement an R2 lifecycle policy to automate the Standard → IA transition

### 27.3 Delete Unused Content

- Implement a grace period for soft-deleted content (30 days), then hard-delete from R2
- Purge HLS segments when a video is deleted — each 5-minute video generates 60–90 segment files
- Clear presigned upload URLs for abandoned uploads after 24 hours (check if object exists in R2; if not, mark the DB record as `abandoned`)

### 27.4 Client-Side Compression Before Upload

Compress photos to max 2MP and 80% JPEG quality before upload. Compress videos to 720p/1080p max. This directly reduces:
- R2 storage cost
- Transcoding time and compute cost
- Workers bandwidth for read proxying

A 5MB JPEG compressed to 800KB on-device saves ₹0.0054 in storage per photo, per month. Trivial per photo, but significant across millions of assets.

### 27.5 Image Transformation Cost Control

- Use Cloudflare Images' named variants (not URL parameter transforms) — named variants count as unique transformations per month once, not per request
- Cache transformed images aggressively with long TTLs — the 5,000/month free transformation tier covers 5,000 unique image+variant combinations before charges begin
- For public feed thumbnails, serve directly from R2 (pre-generated thumbnails) rather than using Cloudflare Images — eliminates transformation costs for highest-volume content

---

## 28. Best Practices Checklist

### Storage & Upload

- [ ] Use presigned PUT URLs for all client uploads — never proxy binary data through backend
- [ ] Generate UUIDs on the backend for all object keys — never trust client-provided names
- [ ] Store R2 object keys in the database, not full URLs
- [ ] Enforce MIME type allowlist at presigned URL generation
- [ ] Set Content-Length limit on presigned URLs to enforce file size constraints
- [ ] Implement multipart upload for files >100MB with resume support
- [ ] Apply client-side compression before upload (photos: max 2MP; videos: max 1080p)

### Security

- [ ] Rotate R2 API keys every 90 days
- [ ] Store all secrets in environment variables or Workers Secrets — never in code
- [ ] Use HMAC-SHA256 (not HMAC-MD5 or plain tokens) for media signed tokens
- [ ] Implement `timingSafeEqual` for all token comparisons in Workers
- [ ] Enforce strict TTLs: upload URLs 15 min, read URLs 1 hour, streaming tokens 4 hours
- [ ] Enable Cloudflare Bot Fight Mode and rate limiting for upload endpoints
- [ ] Scan all uploaded content for NSFW via moderation API before serving
- [ ] Implement hotlink protection via Referer checking in Worker

### Video Pipeline

- [ ] Apply `-movflags faststart` to all MP4 outputs during transcoding
- [ ] Use 4-second HLS segment duration
- [ ] Set `max-age=31536000, immutable` on all HLS segment files (.ts)
- [ ] Pass Range headers through Worker to R2 for seek support
- [ ] Include `Accept-Ranges: bytes` header in all video responses
- [ ] Use a job queue (BullMQ) for transcoding — never synchronous
- [ ] Implement transcoding retry (3× with backoff) and failure alerting

### Cost

- [ ] Keep popular content in Standard storage; archive originals to IA after 30 days
- [ ] Set immutable Cache-Control on HLS segments to maximize CDN hits
- [ ] Use named variants in Cloudflare Images (not URL params) for cache deduplication
- [ ] Monitor R2 Class B operation usage weekly — spikes indicate cache miss problems
- [ ] Hard-delete from R2 on content deletion — unused storage accrues cost silently
- [ ] Use Workers Paid plan from 10K+ users — daily cap on free plan will cause outages

### Monitoring

- [ ] Alert on Worker error rate > 1%
- [ ] Alert on transcoding queue depth > 100 jobs
- [ ] Alert on upload failure rate > 5%
- [ ] Monitor storage growth weekly and project costs monthly
- [ ] Log all presigned URL generation with user ID for audit trail
- [ ] Track CDN cache hit rate — target > 85% for video segments

---

## 29. Final Recommended Architecture

### 29.1 Production Architecture Summary

```
UPLOAD FLOW:
Flutter App
  → POST /api/media/upload-url (Node.js)    [Auth: JWT]
  ← Presigned PUT URL + Object Key
  → PUT {presigned_url}                     [Direct to R2]
  → POST /api/media/complete                [Node.js marks ready, enqueues transcode]
  → BullMQ Queue → ffmpeg Worker → HLS segments → R2
  → DB: status='ready', hlsMasterKey, thumbnailKey

DELIVERY FLOW (Photos):
Flutter App
  → GET https://media.{domain}.com/{objectKey}?variant=thumbnail
  → Cloudflare Images (transform from R2 origin)
  → Cloudflare CDN (cache transformed result)
  ← WebP/AVIF thumbnail (cached at edge)

DELIVERY FLOW (Videos — Gated):
Flutter App
  → POST /api/media/video/{id}/playback-token   [Auth: JWT]
  ← { token: "HMAC_SIGNED_TOKEN", expiresAt }
  → GET https://media.{domain}.com/v/{uuid}/master.m3u8?token={token}
  → Cloudflare Worker: validate HMAC token
  → R2: fetch master playlist
  ← m3u8 playlist (with absolute segment URLs including token)
  → Flutter Player: fetches 720p.m3u8, then 720p_000.ts, 720p_001.ts ...
  → Cloudflare CDN: serve cached .ts segments (cache miss → R2 read, cache hit → edge)
```

### 29.2 Service Stack

| Component | Technology | Plan/Tier |
|---|---|---|
| Object Storage | Cloudflare R2 | Pay-as-you-go (10GB free tier) |
| Image Transformation | Cloudflare Images | Pay-as-you-go (5K transforms free) |
| Edge Compute / Auth | Cloudflare Workers | Workers Paid ($5/month) from 10K users |
| CDN | Cloudflare CDN | Included (0 additional cost) |
| Video Transcoding | Self-hosted ffmpeg + BullMQ | ₹750–₹2,000/month VPS |
| Queue | Redis (BullMQ) | ₹0 (self-hosted on transcoding VPS) |
| Database | PostgreSQL | Existing backend DB |
| API | Node.js + Express | Existing backend |
| Mobile Client | Flutter | Android + iOS |

### 29.3 Approximate Total Monthly Cost by Scale

| Scale | Storage | Workers | Transcoding VPS | Operations | **Total Infra** |
|---|---|---|---|---|---|
| 1K users | ₹0–₹50 | ₹0 | ₹750 | ₹0 | **~₹750–₹800/month** |
| 10K users | ₹500–₹800 | ₹470.75 | ₹1,500 | ₹0 | **~₹2,471–₹2,771/month** |
| 100K users | ₹5,000–₹7,500 | ₹470.75 | ₹4,000 | ₹500–₹2,000 | **~₹9,971–₹13,971/month** |
| 1M users | ₹50,000–₹80,000 | ₹470.75 | ₹8,000–₹15,000 | ₹3,000–₹15,000 | **~₹61,471–₹1,10,471/month** |

*Note: 1M user costs assume mixed media app. High-streaming scenarios increase operations costs significantly — CDN caching is the primary mitigation.*

### 29.4 Why This Architecture is Optimal

**Cost:** Zero egress fees from R2 make this architecture's delivery cost entirely independent of traffic volume. Competitors charge ₹7–₹10/GB in egress — at 10TB/month delivery, R2 saves ₹70,000–₹1,00,000 compared to AWS S3 + CloudFront or Firebase.

**Performance:** Cloudflare's 330+ PoP network ensures sub-50ms media delivery to users across India and globally. HLS segment caching at the edge means the 2nd–Nth viewer of any segment gets CDN-speed delivery.

**Scalability:** R2 and Cloudflare CDN scale automatically without configuration. The only component requiring manual scaling is the transcoding pipeline, which is queue-isolated from the API and scales independently.

**Developer Experience:** S3-compatible API means existing Node.js/AWS SDK knowledge applies directly. No new SDK or paradigm shift required. Workers use standard JavaScript/TypeScript. Flutter integrates via standard HTTP and video_player APIs.

**Security:** HMAC-signed tokens with edge validation, separate public/private buckets, rate limiting, and content scanning provide defense in depth without architectural complexity.

**Maintainability:** The architecture has four independently deployable components (API, Worker, transcoding pipeline, storage). Each can be updated, scaled, or replaced independently. No proprietary streaming protocol or vendor-specific player required.

**Lock-in:** R2's S3 compatibility and standard HLS format ensure zero lock-in. Migrating to any S3-compatible provider (Backblaze B2, AWS S3) requires only changing the endpoint URL — no data format changes, no SDK rewrites, no video re-encoding.

---

*Research compiled from official Cloudflare documentation, reference project files, and verified pricing sources as of May 2026. All INR values at 1 USD = ₹94.15 (May 2026 market rate). Prices are subject to change — verify current rates at developers.cloudflare.com/r2/pricing and developers.cloudflare.com/stream/pricing before finalization.*

*Primary sources: Cloudflare R2 Docs, Cloudflare Stream Docs, Cloudflare Images Docs, Cloudflare Workers Pricing, Cloudflare ToS Update (October 2025), LeanOps R2 Analysis (April 2026), Object Storage Research Report (March 2026).*