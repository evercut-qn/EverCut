# EverCut — Media System: Old vs New

---

## What Is This About?

EverCut is moving its media infrastructure from **Cloudinary** to **Cloudflare R2 + Workers**.

This affects how all photos and videos are uploaded, stored, protected, and delivered — for barbers and customers alike.

---

## What Media Does EverCut Handle?

| Media Type | Who Uploads It | Examples |
|---|---|---|
| Profile photos | Customers, Barbers | Avatar shown on profile |
| Shop cover images | Barbers | Banner at top of shop page |
| Gallery photos | Barbers | Work samples, haircut showcases |
| Employee photos | Barbers | Staff directory photos |
| Onboarding photos | Both | Captured during account creation |
| Videos *(new)* | Barbers | Haircut videos, technique demos |

---

## The Old System — Cloudinary

### How an Upload Works Today

```
Flutter App
    │
    │  Sends full photo as multipart/form-data
    ▼
Node.js API Server   ← file is buffered into server memory here
    │
    │  Streams file to Cloudinary via SDK
    ▼
Cloudinary
    │
    │  Returns URL + public ID
    ▼
MongoDB   ← stores the full Cloudinary URL
```

### What Gets Stored in the Database

- A full Cloudinary URL — e.g. `https://res.cloudinary.com/evercut/image/upload/v123/...`
- A Cloudinary public ID — needed to delete the file later

### Where Files Live

```
evercut/ (Cloudinary account root)
├── customers/{userId}/          → Profile photos
├── shops/
│   ├── profile/{userId}/        → Barber owner photo
│   ├── cover/{userId}/          → Shop cover image
│   ├── gallery/{userId}/        → Work sample photos
│   └── employees/{userId}/      → Staff photos
├── single/{serviceName}/        → Service catalog images
└── default/service.jpg          → Fallback image
```

---

## Why the Old System Has Problems

### Problem 1 — The Server Carries Every File

Every upload passes through our own Node.js server before reaching Cloudinary. This creates three compounding issues:

**A) Memory fills up under concurrent uploads**

- Multer (the upload middleware) buffers each incoming file entirely into the server's heap memory before forwarding it
- Each file sits in RAM until Cloudinary confirms receipt
- 30 barbers uploading simultaneously at ~4 MB each = ~120 MB of buffers held in memory at once

**B) Garbage collection pauses affect everyone**

- Node.js uses a garbage collector (GC) to reclaim memory
- When the heap fills up from buffered uploads, the GC triggers a **major collection cycle**
- Major GC cycles are **stop-the-world** events — JavaScript execution on the server pauses entirely until the cycle completes
- During this pause, **every user's request stalls** — not just the people uploading

> **Real-world example:** A customer opens EverCut to book an appointment on a Saturday evening. At the same time, 30 barbers are uploading gallery photos from the day. The server's heap is under pressure. A GC cycle fires. The customer's booking request stalls for 150–300 ms — not because anything went wrong with their request, but because the upload traffic caused a memory event that froze the server briefly. This can repeat in waves throughout the upload peak.

**C) Server bandwidth is consumed twice per upload**

- Every byte of a file crosses the server's network interface twice: once arriving from the app, once departing to Cloudinary
- Regular API traffic (booking requests, logins, appointment data) competes for the same bandwidth

**Note on what does and does not block Node.js:**
Node.js is designed around asynchronous I/O — network reads and writes are non-blocking and do not literally freeze the event loop. The more precise problem is that **large file buffers in heap memory trigger GC pauses that do freeze execution**, and that **synchronous CPU operations** (MIME type inspection, magic byte validation, checksum computation) run on the main thread and do block all other requests for their duration.

---

### Problem 2 — No Video Support

| Requirement | Current System |
|---|---|
| Large file uploads (100 MB+) | Not supported — would fill heap memory |
| Chunked / resumable upload | Not supported |
| Video transcoding | Not supported |
| Adaptive streaming playback | Not supported |

Adding video would require a full rebuild of the upload pipeline.

---

### Problem 3 — No Upload Progress Bar

- The file goes to our server → our server forwards to Cloudinary
- The Flutter app has no visibility into how far the transfer has progressed
- Users see an indefinite loading spinner, no matter how long the upload takes

> **Real-world example:** A customer on a 4G connection uploads their profile photo during onboarding. The spinner runs for 12 seconds, then the request times out. They don't know if the photo reached the server. They try again. No indication of progress either time.

---

### Problem 4 — Vendor Lock-In in the Database

- Full Cloudinary URLs are embedded directly in MongoDB across multiple models
- These aren't just display values — the API builds responses around them
- If Cloudinary changes pricing, has an outage, or alters their URL structure, every stored image link is affected

> **Real-world example:** Cloudinary raises prices or goes offline. Every `photoUrl`, `coverUrl`, and `ownerPhotoUrl` in the database points to their domain. Images break for all users immediately. Migrating away requires a full database migration, re-uploading every file, and updating every part of the codebase that reads those fields.

---

### Problem 5 — Cost Grows With Every Upload and Every View

| What Cloudinary Charges For | Notes |
|---|---|
| Storage volume | Grows with every upload |
| Transformation operations | Resizing/cropping charged per operation |
| Delivery bandwidth (egress) | Every image load incurs a bandwidth fee |

No free egress tier. Every view of every photo costs money.

---

## The New System — Cloudflare R2 + Workers

### Core Principle

> The server no longer touches file data. It only issues credentials and records outcomes. Files travel directly between the app and Cloudflare.

---

### How an Upload Works — Three Steps

**Step 1 — App requests a presigned URL**

```
Flutter App  ──►  POST /media/upload-url  ──►  Node.js API
                  { mimeType, sizeBytes, purpose }

Node.js API  ──►  Flutter App
                   { uploadUrl, mediaId }
```

- The server receives and returns only small JSON — no file data
- The `uploadUrl` is a **presigned URL**: a time-limited, cryptographically signed link that grants permission to upload exactly one specific file (correct type, correct size, correct destination) within 15 minutes
- The app must send the Content-Type header matching the contentType it declared in the request body during the direct PUT
- The direct R2 request must not include the EverCut bearer token; the presigned URL already contains the temporary R2 authorization in its query string

**Step 2 — App uploads directly to Cloudflare R2**

```
Flutter App  ──────────────────────────────────►  Cloudflare R2
             PUT {uploadUrl}  (binary file data)
             ◄──  200 OK
```

- The Node.js server is **completely absent** from this step
- No heap memory consumed, no server bandwidth used, no event loop impact
- The app has full byte-level visibility into the transfer → real-time progress bar

**Step 3 — App confirms the upload**

```
Flutter App  ──►  POST /media/confirm  ──►  Node.js API
                  { mediaId }
                       │
                       │  HeadObject (metadata check — no download)
                       ▼
                  Cloudflare R2  ──►  "File exists, size and type match"
                       │
                       ▼
                  MongoDB  ──►  status: pending → ready
                       │
                       ▼
Flutter App  ◄──  { cdnUrl, mediaId }
```

- The server verifies the file exists and matches what was declared in Step 1
- Only a metadata check — no file data crosses the server

---

### How Files Are Delivered — Cloudflare Worker

All media is served through `media.evercut.in`, handled by a **Cloudflare Worker** — a lightweight runtime that executes at the Cloudflare edge (the data centre nearest to the user), not on our origin server.

**On every media request, the Worker:**

1. **Checks for an HMAC-signed token** — every URL includes a short-lived cryptographic token proving it was issued by our server. No token → `401 Unauthorized`.
2. **Verifies the token signature** — using timing-safe comparison to prevent timing attacks.
3. **Checks token expiry** — expired tokens are rejected even if the signature is valid.
4. **Checks the revocation store** — queries Cloudflare Workers KV for whether the user has been logged out or their session revoked.
5. **Looks in the edge cache** — if the file was recently served, it's returned from the nearest Cloudflare data centre instantly. R2 and the origin server are not contacted.
6. **Fetches from R2 on cache miss** — retrieves the file, caches it at the edge with an appropriate expiry (images: 30 days; video segments: 1 day; playlists: 5 minutes), and returns it.

---

### What Gets Stored in the Database

| Old System | New System |
|---|---|
| Full Cloudinary URL (vendor-tied) | Short R2 key — `images/gallery/{uuid}.jpg` |
| Cloudinary public ID | Not needed |
| Spread across `photoUrl`, `coverUrl`, etc. | Unified `r2Key` field per media record |

The full delivery URL is constructed at response time from the R2 key. The database no longer has any dependency on an external vendor's URL format.

---

### File Storage Layout

```
Cloudflare R2 bucket (private)
├── images/
│   ├── avatars/        → Customer + barber profile photos
│   ├── covers/         → Shop cover images
│   ├── gallery/        → Work sample photos
│   ├── employees/      → Staff photos
│   └── thumbnails/     → Video preview frames
└── videos/
    ├── raw/            → Original uploads (deleted after transcoding)
    └── hls/{videoId}/  → Processed stream segments + playlist files
```

---

### Video Upload — How It Handles Large Files

For large video files, the app uses **multipart upload**:

- The file is split into chunks (5–100 MB each)
- Each chunk is uploaded to R2 independently
- Completed chunk state is saved to the device
- If the connection drops, only the remaining chunks are re-sent
- Once all chunks land, R2 assembles the full file
- A transcoding job converts it to **HLS (HTTP Live Streaming)** format

**HLS playback means:**
- Playback starts in seconds — no waiting for the full file to download
- Quality adjusts automatically based on the viewer's connection speed
- Each video segment is independently cached at Cloudflare's edge

---

## Side-by-Side Comparison

| Topic | Old (Cloudinary) | New (Cloudflare R2 + Workers) |
|---|---|---|
| Upload path | App → Server → Cloudinary | App → R2 directly |
| Server role in upload | Buffers and relays all file data | Issues credentials only |
| Heap memory impact | Large — one buffer per concurrent upload | Zero — no file data on server |
| GC pressure | High under concurrent uploads | None |
| Server bandwidth per upload | 2× — in from app, out to Cloudinary | Near zero — only JSON payloads |
| Upload progress bar | Not possible | Fully supported |
| Dropped connection recovery | Restart from zero | Resume from last chunk (video) |
| Video support | None | Full — multipart + HLS streaming |
| File access control | Cloudinary URLs are effectively public | All files private, HMAC-token-gated |
| Token revocation | No mechanism | Per-user, per-request revocation via KV |
| CDN caching | Managed by Cloudinary | Cloudflare edge, up to 30-day TTL |
| Database storage | Full vendor URLs embedded in schema | Short internal R2 keys |
| Vendor dependency | Deep — URL structure in DB and code | Minimal — keys are portable paths |
| Egress (delivery) cost | Charged per GB | Free |

---

## Real-World Scenarios

### Scenario 1 — 30 Barbers Upload Photos on a Saturday Evening

| | Old System | New System |
|---|---|---|
| What the server does | Buffers ~120 MB of file data in heap | Handles ~30 tiny JSON requests |
| GC impact | Major GC cycle likely, pausing all requests | None |
| Customers booking at the same time | May experience request delays during GC pauses | Unaffected |
| Progress shown to barbers | None | Live progress bar per photo |

---

### Scenario 2 — Customer Updates Profile Photo on a Patchy 4G Connection

**Old system:**
- App sends photo → spinner appears
- Connection drops at 60% through
- Server discards the partial data
- User gets a generic error with no context
- Must re-upload from zero

**New system:**
- App requests a presigned URL (instant)
- Upload begins directly to R2, progress bar visible
- Connection drops at 60%
- For images: re-upload is fast since images are small
- For videos: the app resumes from the last confirmed chunk
- User sees exactly where the upload stopped and what's happening when it retries

---

### Scenario 3 — A Barber's Phone Is Stolen

**Old system:**
- Cloudinary URLs stored in the database are permanent public links
- Anyone with a cached URL from the stolen device can load those images indefinitely
- No way to invalidate them

**New system:**
- Barber logs out remotely from another device
- API writes a revocation timestamp to Cloudflare Workers KV
- Worker checks this entry on every media request
- Any token issued before the logout timestamp is rejected — `401 Unauthorized`
- Cached URLs on the stolen device stop working immediately

---

### Scenario 4 — 800 Customers Browse the Same Shop's Profile

**Old system:**
- Every page load fetches the cover image from Cloudinary
- 800 requests × 200 KB = 160 MB of Cloudinary egress, billed daily

**New system:**
- First request fetches from R2 and caches at the nearest Cloudflare edge location
- Requests 2–800 are served from the edge cache — R2 is not queried
- Delivery is faster (served from a data centre near the user)
- Cost for 799 out of 800 deliveries: zero

---

## Migration Plan

### What Changes in the Codebase

**Removed:**
- Cloudinary SDK, Multer, `multer-storage-cloudinary`
- `Photo` model, service, repository, controller, and routes
- `cloudinaryId` and legacy URL fields across `Shop`, `Employee`, `Customer` models

**Added:**
- AWS S3-compatible SDK (Cloudflare R2 implements the S3 API — no custom client needed)
- Unified `Media` module with its own model, service, controller, and routes
- `r2Key` fields across entity models
- Cloudflare Worker for edge delivery and token verification

---

### Final Cutover Behavior

Serializers construct URLs only from R2 keys after the migration is finalized:

```
If r2Key exists   ->  construct signed CDN URL from R2 key
Else              ->  return null
```

The finalizer removes retired URL fields only after every old media reference has a migrated R2 key or gallery `Media` record.

---

### Data Migration Steps

1. Migration script downloads each existing legacy image URL
2. Re-uploads it to Cloudflare R2
3. Updates the MongoDB document with the new `r2Key`
4. Finalizer verifies no URL-backed records are unmigrated
5. Retired database fields and the old gallery collection are removed

---

## Summary

| What Changes | Impact |
|---|---|
| Files no longer pass through the server | No heap memory pressure, no GC pauses, no doubled bandwidth |
| Direct upload from app to R2 | Faster uploads, real-time progress bars |
| Token-gated delivery via Cloudflare Worker | All media is private and access is revocable |
| Edge caching on Cloudflare's network | Faster image loads, lower delivery cost |
| R2 keys in DB instead of vendor URLs | No vendor lock-in, clean and portable data |
| Multipart upload + HLS | Full video support with resumable uploads and adaptive playback |

> The server's role changes from **carrying files** to **authorising access**. Everything else — the upload, the delivery, the caching — happens on infrastructure built to handle it at scale.

---

*Document prepared for stakeholder review — May 2026*