# Cloudflare R2 Migration Progress Report

Date: 2026-05-12  
Project: EverCut media backend, Cloudflare R2, Cloudflare Worker, Postman contracts, Flutter integration documentation

## 1. Purpose Of This Document

This document explains the work completed today for the EverCut Cloudinary-to-Cloudflare R2 migration and infrastructure setup.

It is written as a chronological progress report, not a code changelog. The goal is to make it easy for backend, Flutter, QA, and deployment teams to understand what changed, why it changed, what issues appeared, how those issues were investigated, and what still remains before production rollout.

## 2. Starting Point

The backend had already moved away from Cloudinary and was using Cloudflare R2 for media storage. The system had the following major pieces in place:

1. The backend generated upload URLs for media.
2. Flutter/Postman uploaded files directly to Cloudflare R2.
3. The backend confirmed uploaded objects.
4. A Cloudflare Worker served private R2 media through signed media URLs.
5. R2 buckets were intended to stay private.
6. Development and production buckets were standardized to:
   - `evercut-media-dev`
   - `evercut-media-prod`

During testing, several important issues were found:

1. Direct upload from Postman to the presigned R2 URL failed.
2. Generic media responses contained both `url` and `photoUrl` with the same value.
3. R2 had inconsistent cover folders: `images/cover/` and `images/covers/`.
4. Some setup documentation was still too hard to follow for production deployment.
5. The correct Cloudflare R2 presigned URL contract needed to be verified against official Cloudflare documentation.

## 3. Work Completed Chronologically

## 3.1 Read And Follow The Existing Migration Strategy

The migration work continued under the strategy defined in:

- `docs/features/cloudflare/BACKEND-MIGRATION-GUIDE.md`
- `docs/features/cloudflare/INFRASTRUCTURE-SETUP-GUIDE.md`

These documents remained the main source of truth for the intended architecture:

1. Remove Cloudinary from the backend media flow.
2. Use R2 as private object storage.
3. Use presigned R2 upload URLs for direct client uploads.
4. Use a Cloudflare Worker for signed media delivery.
5. Keep dev and prod environments isolated.
6. Preserve clean API contracts for Flutter and QA.

## 3.2 Infrastructure Setup And Environment Standardization

The infrastructure was standardized around two environments only:

| Environment | R2 bucket | Worker | Intended custom domain |
|---|---|---|---|
| Development | `evercut-media-dev` | `evercut-media-worker-dev` | `media-dev.evercut.in` |
| Production | `evercut-media-prod` | `evercut-media-worker` | `media.evercut.in` |

The staging bucket name `evercut-media-staging` was removed from the codebase and documentation. Only dev and prod should remain.

The recommended domain decision was:

1. Use `media-dev.evercut.in` for development.
2. Use `media.evercut.in` for production.
3. Do not use `media.evercut.in` for both dev and prod.

Reason:

- It prevents accidental dev/prod media mixing.
- It makes logs and debugging clearer.
- It protects production media from test uploads.
- It gives Flutter a clear environment mapping.

Because `evercut.in` is registered outside Cloudflare, the documentation now explains that the domain does not need to be transferred, but Cloudflare must manage DNS if Cloudflare Worker custom domains are used.

## 3.3 R2 Public Access Decision

The following Wrangler checks showed:

```text
Public access via the r2.dev URL is disabled.
```

This was confirmed for both:

- `evercut-media-dev`
- `evercut-media-prod`

This is expected and correct.

Decision:

- R2 buckets should stay private.
- Public `r2.dev` bucket access should remain disabled.
- Media should be served only through the Worker using backend-generated signed media URLs.

This means custom Worker domains are needed for clean production URLs, not public R2 bucket URLs.

## 3.4 Cloudflare Worker Deployment Status

The Worker setup supports:

1. Dev Worker for `evercut-media-dev`.
2. Prod Worker for `evercut-media-prod`.
3. `MEDIA_BUCKET` binding for R2 object reads.
4. `MEDIA_TOKEN_SECRET` for signed media URL validation.
5. Origin restrictions for dev and prod.

The fallback Worker URLs are:

| Environment | Worker URL |
|---|---|
| Development | `https://evercut-media-worker-dev.quantneural-evercut.workers.dev` |
| Production | `https://evercut-media-worker.quantneural-evercut.workers.dev` |

Opening those directly returns `401 Unauthorized - missing media token`, which is correct. The Worker is not a public file browser. It only serves backend-signed media URLs.

## 3.5 R2 CORS Setup

R2 CORS was reviewed and updated.

Final CORS decision:

- Browser-based uploads need CORS.
- Native mobile clients and Postman generally do not enforce browser CORS.
- CORS should allow only the headers the client actually sends.

Final allowed upload header:

```text
Content-Type
```

The SigV4 signature data, date, expiry, and payload hash remain in the presigned URL query string. They are not sent as manual client headers.

Live CORS was applied to both buckets:

- `evercut-media-dev`
- `evercut-media-prod`

Verified current CORS:

| Bucket | Allowed methods | Allowed headers |
|---|---|---|
| `evercut-media-dev` | `PUT`, `GET`, `HEAD` | `Content-Type` |
| `evercut-media-prod` | `PUT`, `GET`, `HEAD` | `Content-Type` |

## 3.6 Postman Direct Upload Issue: First Failure

The first Postman direct upload error was:

```xml
<Code>InvalidRequest</Code>
<Message>Missing x-amz-content-sha256</Message>
```

Initial investigation showed that R2 was rejecting the direct PUT request. A temporary attempt was made to include `x-amz-content-sha256`, but this was later re-evaluated because it was not the best production-ready model for browsers and Postman.

This prompted a deeper review of Cloudflare's official R2 documentation.

## 3.7 Official Cloudflare R2 Presigned URL Research

Cloudflare's R2 presigned URL documentation confirms:

1. Presigned URLs are an S3 concept.
2. The signature is embedded in the URL query string.
3. Presigned URLs can authorize `PUT` uploads.
4. No additional authentication headers are required when using the presigned URL.
5. `Content-Type` may be specified to restrict uploads to a specific file type.
6. Browser CORS must allow the headers the browser sends.

Official references used:

- `https://developers.cloudflare.com/r2/api/s3/presigned-urls/`
- `https://developers.cloudflare.com/r2/objects/upload-objects/`
- `https://developers.cloudflare.com/r2/buckets/cors/`

Important conclusion:

The best production-ready implementation is not to manually send `x-amz-date` or `x-amz-content-sha256` as upload headers. Those values belong in the presigned URL query string.

## 3.8 Postman Direct Upload Issue: Final Root Cause And Fix

After deeper testing, the correct presigned upload contract was defined:

1. Backend generates a presigned R2 `PUT` URL.
2. The URL includes query parameters such as:
   - `X-Amz-Date`
   - `X-Amz-Expires`
   - `X-Amz-Signature`
   - `X-Amz-SignedHeaders`
   - `X-Amz-Content-Sha256=UNSIGNED-PAYLOAD`
3. The client sends the file to that URL with `PUT`.
4. The client sends only the returned upload headers, currently:
   - `Content-Type`
5. The client must not send:
   - EverCut bearer token
   - Postman inherited Authorization
   - `x-amz-date`
   - `x-amz-content-sha256`
   - manually signed `Content-Length`

The second Postman error was:

```xml
<Code>InvalidArgument</Code>
<Message>No date provided in x-amz-date nor date header</Message>
```

This error indicates the direct upload request was not using the presigned URL contract cleanly. Common causes are:

1. The URL query string was lost or not preserved.
2. Postman sent an inherited Authorization header to R2.
3. The R2 request was treated as a normal signed AWS request instead of a query-signed presigned URL request.

Final fix:

- The backend signs `Content-Type` only.
- The backend no longer signs `Content-Length`.
- The backend returns `requiredHeaders` containing only `Content-Type`.
- Postman direct upload is explicitly set to `No Auth`.
- Documentation now warns not to send any API bearer token to R2.

## 3.9 Why `Content-Length` Was Removed From Signed Headers

`Content-Length` was removed from the signed headers because browser JavaScript cannot safely set it manually. Browsers control that header.

If a backend signs `Content-Length`, browser clients may fail even if Postman works.

Final decision:

- Validate declared file size before issuing the upload URL.
- Upload directly to R2 without signing `Content-Length`.
- Confirm the object after upload using R2 metadata.
- Reject or fail the media if uploaded object metadata does not match expectations.

This is safer for Flutter web, browser tools, and mobile clients.

## 3.10 Postman Collection Updates

The Barber Media Postman collection was updated.

Important changes:

1. `Request Upload URL` uses the real sample image size variable.
2. The response captures:
   - `mediaId`
   - `uploadUrl`
   - `requiredHeaders.Content-Type`
3. `Direct PUT To R2` now:
   - uses method `PUT`
   - targets `{{media_upload_url}}`
   - uses `No Auth`
   - sends `Content-Type`
   - does not run the normal EverCut JSON response envelope assertions, because R2 returns an empty body on success

The generated collection file is:

- `server/postman-collections/11-barber-media.json`

The generator was also updated:

- `server/scripts/regenerate-postman-collections.mjs`

## 3.11 Flutter Integration Documentation Updates

Flutter documentation was updated to explain:

1. Use the authenticated API client only for EverCut backend routes.
2. Use a separate plain upload client for R2 direct PUT.
3. Do not attach API auth interceptors to the R2 upload client.
4. Send only `requiredHeaders` returned by the backend.
5. Preserve the full `uploadUrl`, including all query parameters.
6. Confirm upload only after R2 returns success.

Affected docs include:

- `docs/features/cloudflare/FLUTTER-BACKEND-R2-MEDIA-FLOW.md`
- `docs/features/cloudflare/FLUTTER-INTEGRATION-GUIDE.md`
- `docs/features/auth/ONBOARDING-DATA-GUIDE.md`

## 3.12 Duplicate `url` And `photoUrl` Cleanup

An API response issue was found:

- Some generic media responses returned both `url` and `photoUrl`.
- Both fields contained the same value.

Decision:

- Generic media resources should expose one canonical field: `url`.
- Entity-specific resources may still expose semantic fields:
  - customer `photoUrl`
  - employee `photoUrl`
  - shop `coverUrl`
  - barber-owner `ownerPhotoUrl`

Reason:

- A generic media object should not duplicate the same URL under two names.
- Existing profile and employee response contracts remain meaningful and clear.

Updated behavior:

- `GET /media/:id` returns `url`, not duplicate `photoUrl`.
- `GET /media/gallery` returns gallery media items with `url`, not duplicate `photoUrl`.

Validation was added to ensure generic media responses do not reintroduce duplicate `photoUrl`.

## 3.13 R2 Folder Structure Standardization

The R2 dashboard showed both:

- `images/cover/`
- `images/covers/`

Investigation found:

1. Current live upload code already used `images/covers/`.
2. The legacy migration script generated paths from the raw media purpose name.
3. Because the purpose was `cover`, historical migrated objects went into `images/cover/`.

Decision:

- Standard cover folder is `images/covers/`.
- Singular `images/cover/` should not be used.

Actions completed:

1. Fixed the legacy migration script so future cover migrations use `images/covers/`.
2. Added a normalization script for existing historical keys.
3. Ran the normalization script in dry-run mode.
4. Reviewed planned changes.
5. Ran the normalization script in write mode.

Result:

| Item | Result |
|---|---|
| Live old cover objects copied | `3` |
| Shop references updated | `3` |
| Media references updated | `3` |
| Old singular objects deleted | `3` |
| Orphan missing-object media record removed | `1` |
| Remaining DB refs under `images/cover/` | `0` |
| Remaining R2 objects under `images/cover/` | `0` |
| Cover objects under `images/covers/` | present |

## 3.14 Repository Query Bug Found During Validation

During route validation, `GET /media/:id` exposed a backend bug.

The repository passed an internal MongoDB operator:

```text
status not equal deleted
```

Mongoose `sanitizeFilter` treated this as unsafe because the internal operator was not explicitly trusted. That caused an error similar to:

```text
Invalid status: [object Object]
```

Fix:

- Internal media repository queries now trust the intended MongoDB operators.

Result:

- `GET /media/:id` passed after retesting.

## 3.15 Documentation Created Or Updated

The following documentation was created or updated as part of the work:

| Document | Purpose |
|---|---|
| `PRODUCTION-DEPLOYMENT-BEGINNER-GUIDE.md` | Simple deployment guide for Cloudflare/R2/Worker/backend setup |
| `MEDIA-ROUTE-VALIDATION-REPORT.md` | Validation results and media route test details |
| `FLUTTER-BACKEND-R2-MEDIA-FLOW.md` | Flutter-facing request/response media flow |
| `FLUTTER-INTEGRATION-GUIDE.md` | Flutter implementation guidance |
| `CLOUDFLARE-R2-DEPLOYMENT-COMPLETION-GUIDE.md` | Cloudflare setup and deployment completion steps |
| `INFRASTRUCTURE-SETUP-GUIDE.md` | Infrastructure setup instructions |
| `BACKEND-MIGRATION-GUIDE.md` | Migration source-of-truth updates |
| `ONBOARDING-DATA-GUIDE.md` | Onboarding upload flow updates |
| `BACKEND-R2-TESTING-GUIDE.md` | R2 testing setup and CORS updates |

This report was added as the chronological summary of the full day of work.

## 4. Current Architecture

## 4.1 Upload Flow

Current media upload flow:

1. Flutter/Postman calls backend upload URL route.
2. Backend validates:
   - authenticated user
   - content type
   - file size
   - purpose
3. Backend creates a pending media record.
4. Backend generates a Cloudflare R2 presigned `PUT` URL.
5. Backend returns:
   - `mediaId`
   - `uploadUrl`
   - `requiredHeaders`
   - `r2Key`
   - `expiresAt`
6. Client uploads file bytes directly to R2 using:
   - method `PUT`
   - full `uploadUrl`
   - `No Auth`
   - `Content-Type`
7. Client calls backend confirm route.
8. Backend checks R2 object metadata.
9. Backend validates content and marks media ready.
10. Backend returns a signed Worker media URL for delivery.

## 4.2 Delivery Flow

Current media delivery flow:

1. Backend stores only R2 keys.
2. Backend builds signed Worker URLs when serializing responses.
3. Client uses the full returned media URL as-is.
4. Worker validates:
   - token
   - expiry
   - requested object path
5. Worker reads private object from R2.
6. Worker returns file bytes.
7. Unsigned media requests return `401`.

## 4.3 Folder Structure

Current standardized media key structure:

| Purpose | Prefix |
|---|---|
| avatars | `images/avatars/` |
| profiles | `images/profiles/` |
| covers | `images/covers/` |
| gallery | `images/gallery/` |
| employees | `images/employees/` |
| onboarding | `images/onboarding/` |
| services | `images/services/` |
| raw videos | `videos/raw/` |
| video thumbnails | `thumbnails/videos/` |

The singular `images/cover/` prefix is now treated as historical and should not be created again.

## 5. Current Infrastructure Status

## 5.1 Completed

| Area | Status |
|---|---|
| Dev R2 bucket | complete |
| Prod R2 bucket | complete |
| Staging bucket removal | complete |
| R2 public access disabled | complete |
| Dev Worker config | complete |
| Prod Worker config | complete |
| R2 CORS dev | complete |
| R2 CORS prod | complete |
| Presigned upload implementation | complete |
| Worker signed delivery | complete |
| Postman media workflow | complete |
| Flutter media flow docs | complete |
| R2 folder normalization | complete for dev data checked today |
| Route validation script | complete |
| Media route validation | passed |
| Unit tests | passed |

## 5.2 Pending Or User-Action Items

| Item | Owner | Notes |
|---|---|---|
| Add `evercut.in` to Cloudflare DNS | User | Required for custom Worker domains |
| Update nameservers in GoDaddy/Hostinger | User | Required if Cloudflare will manage DNS |
| Add `media-dev.evercut.in` Worker custom domain | User/Cloudflare dashboard | After domain is active in Cloudflare |
| Add `media.evercut.in` Worker custom domain | User/Cloudflare dashboard | Production media domain |
| Set production hosting environment variables | User/Deployment owner | Must use prod bucket and prod secrets |
| Deploy production backend | User/Deployment owner | After env is configured |
| Run production smoke upload | Backend/QA | Use prod test account and prod bucket |
| Confirm production Worker custom domain certificate | User/Cloudflare dashboard | Must show active/valid |

## 6. Testing And Validation Status

## 6.1 Unit Tests

Command run:

```text
npm test
```

Result:

```text
161 passed
0 failed
```

## 6.2 Full Media Route Validation

Command run:

```text
npm run test:media-routes
```

Result:

```text
45 passed
0 failed
```

Validated API base:

```text
http://localhost:5000/api/v1
```

Validated sample image:

```text
server/postman-collections/assets/sample-upload.png
```

## 6.3 Live R2 CORS Validation

Verified with Wrangler:

```text
wrangler r2 bucket cors list evercut-media-dev
wrangler r2 bucket cors list evercut-media-prod
```

Both buckets show:

```text
allowed_headers: Content-Type
```

## 6.4 R2 Folder Validation

Final checks showed:

```text
shopsWithSingularCoverPrefix: 0
mediaWithSingularCoverPrefix: 0
singularCoverObjects: []
pluralCoverObjectCount: 4
```

## 7. Important Decisions Made Today

## 7.1 Use PUT For Direct R2 Uploads

Decision:

- Continue using `PUT` for direct upload to R2.

Reason:

- Cloudflare R2 supports S3-style presigned `PUT`.
- It is the correct method for direct single-object uploads.
- It keeps file bytes out of the backend API.

## 7.2 Do Not Send Authorization To R2

Decision:

- R2 direct upload requests must use `No Auth`.

Reason:

- The presigned URL already contains temporary authorization in the query string.
- Sending an EverCut bearer token or inherited Postman auth can make R2 interpret the request incorrectly.

## 7.3 Do Not Manually Send `x-amz-date`

Decision:

- Clients should not manually send `x-amz-date`.

Reason:

- `X-Amz-Date` belongs in the presigned URL query string.
- If R2 says no date was provided, the client likely lost the query string or sent the wrong auth style.

## 7.4 Do Not Manually Send `x-amz-content-sha256`

Decision:

- Clients should not manually send `x-amz-content-sha256`.

Reason:

- The presigned URL query string already includes `X-Amz-Content-Sha256=UNSIGNED-PAYLOAD`.
- Manual header signing caused unnecessary client complexity.
- It is not needed for the official presigned URL flow.

## 7.5 Do Not Sign `Content-Length`

Decision:

- Do not sign `Content-Length`.

Reason:

- Browsers cannot manually set `Content-Length`.
- Signing it risks breaking Flutter web and browser-based uploads.
- Backend confirm still validates final uploaded object metadata.

## 7.6 Use `url` For Generic Media

Decision:

- Generic media resources use `url`.
- Entity-specific resources can use `photoUrl`, `coverUrl`, or `ownerPhotoUrl`.

Reason:

- Avoid duplicate fields with identical values.
- Keep semantic response fields where they make sense.

## 7.7 Use `images/covers/`

Decision:

- Standard cover prefix is `images/covers/`.

Reason:

- Current upload implementation already used plural folders.
- Plural naming matches other media folders.
- Historical singular keys were normalized.

## 8. Known Issues And How To Avoid Them

## 8.1 Postman: `No date provided in x-amz-date nor date header`

Cause:

- The direct R2 request is not using the presigned URL correctly.

Fix:

1. Re-run `POST /media/upload-url`.
2. Use the returned `uploadUrl` without editing or trimming query parameters.
3. Confirm the URL contains `X-Amz-Date`.
4. Set the Postman Authorization tab to `No Auth`.
5. Send only `Content-Type`.

## 8.2 Postman: `Missing x-amz-content-sha256`

Cause:

- The request is likely sending an unexpected `Authorization` header to R2.

Fix:

1. Set the direct R2 request to `No Auth`.
2. Do not inherit collection bearer auth.
3. Request a fresh upload URL.
4. Retry the direct PUT.

## 8.3 Confirm Upload Says Object Not Found

Possible causes:

1. Direct PUT failed.
2. Upload URL expired.
3. The wrong bucket is configured.
4. The backend is pointing to dev while R2 upload went to prod, or the reverse.
5. The full query string was not preserved.

## 8.4 Signed Media URL Returns 401

Possible causes:

1. The signed media URL expired.
2. Query parameters were stripped.
3. Worker and backend `MEDIA_TOKEN_SECRET` do not match.

## 8.5 Signed Media URL Returns 404

Possible causes:

1. Object was deleted from R2.
2. Backend generated a URL for the wrong object key.
3. Worker is bound to the wrong bucket.
4. `CDN_BASE_URL` points to the wrong environment.

## 9. Final Current Status

The development media flow is working end-to-end.

Completed and verified:

1. Backend upload URL generation.
2. Cloudflare R2 presigned `PUT` upload.
3. Postman direct upload contract.
4. Flutter-facing upload flow documentation.
5. Onboarding media upload.
6. Logged-in barber media upload.
7. Customer media upload.
8. Employee media upload.
9. Shop cover media upload.
10. Shop owner profile picture media upload.
11. Gallery attach/list/stats/delete.
12. Worker signed delivery.
13. Unsigned Worker access denial.
14. R2 CORS for dev and prod.
15. R2 folder normalization.
16. Generic media response contract cleanup.

Still pending before production is fully finished:

1. Cloudflare DNS setup for `evercut.in`.
2. Worker custom domains:
   - `media-dev.evercut.in`
   - `media.evercut.in`
3. Production hosting environment variable setup.
4. Production backend deployment.
5. Production smoke upload test.
6. Final production monitoring after release.

## 10. Recommended Next Steps

1. Add `evercut.in` to Cloudflare.
2. Update GoDaddy/Hostinger nameservers to Cloudflare nameservers.
3. Wait until Cloudflare marks the domain active.
4. Attach `media-dev.evercut.in` to the dev Worker.
5. Attach `media.evercut.in` to the prod Worker.
6. Update development backend `CDN_BASE_URL` to `https://media-dev.evercut.in`.
7. Update production backend `CDN_BASE_URL` to `https://media.evercut.in`.
8. Confirm production backend uses:
   - `R2_BUCKET=evercut-media-prod`
   - production R2 API keys
   - production `MEDIA_TOKEN_SECRET`
9. Deploy the production Worker.
10. Deploy the production backend.
11. Run the media route smoke test against production.
12. Verify media renders in the Flutter app.
13. Monitor Worker logs, backend logs, and R2 object creation after release.

## 11. Summary

Today’s work moved the EverCut media system from a partially working R2 migration into a cleaner, documented, validated implementation.

The most important correction was the presigned URL upload contract. The system now follows Cloudflare R2's documented S3 presigned URL pattern: the signature and date live in the URL query string, the direct upload uses `PUT`, the client sends only `Content-Type`, and Postman/Flutter must not send EverCut auth headers to R2.

The media response contract was cleaned up, the R2 folder structure was standardized, CORS was simplified, Postman and Flutter guidance were updated, and the full route validation suite passed end-to-end.
