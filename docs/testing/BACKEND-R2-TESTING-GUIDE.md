# Backend R2 Testing Guide

> Status: current backend validation guide  
> Last updated: May 12, 2026

## Local Setup

Use a dedicated development R2 bucket or an S3-compatible local emulator such as MinIO. R2-compatible tests need these environment variables:

```env
CF_ACCOUNT_ID=replace_with_account_id
R2_ACCESS_KEY_ID=replace_with_test_access_key
R2_SECRET_ACCESS_KEY=replace_with_test_secret_key
R2_BUCKET=evercut-media-dev
CDN_BASE_URL=https://media-dev.evercut.in
MEDIA_TOKEN_SECRET=replace_with_64_character_random_secret
```

For MinIO, point `CF_ACCOUNT_ID` at the local S3 endpoint only if `r2.config.js` is adapted for that emulator. The production code path expects the Cloudflare R2 endpoint.

## Test Bucket

Create one isolated bucket per active media environment:

| Environment | Bucket |
|---|---|
| Local/dev | `evercut-media-dev` |
| Production | `evercut-media-prod` |

Enable CORS for direct app uploads:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://app.evercut.in"],
    "AllowedMethods": ["PUT", "HEAD", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

## Required Fixtures

Keep small deterministic files outside the repo secrets path:

| Fixture | Expected result |
|---|---|
| `sample.jpg` under 10 MB | Accepted image upload |
| `sample.png` under 10 MB | Accepted image upload |
| `sample.webp` under 10 MB | Accepted image upload |
| `sample.gif` | Rejected unsupported MIME type |
| `oversized.jpg` over configured image limit | Rejected with 413/400 validation error |
| Corrupt JPEG header | Rejected during confirm |

## Automated Tests

Run the local backend suite:

```powershell
cd server
npm test
```

Focused media tests:

```powershell
cd server
node --test src/services/media/__tests__/media-url.service.test.js src/services/media/__tests__/media-validation.service.test.js src/services/media/__tests__/media.service.test.js
```

Expected result: all tests pass, including upload URL generation, signed CDN URLs, media validation, confirm flows, gallery attach, and delete behavior.

## API Scenarios

Use `server/postman-collections/11-barber-media.json` for the full manual contract flow:

| Step | Endpoint | Expected status |
|---|---|---:|
| Request upload URL | `POST /api/v1/media/upload-url` | 201 |
| Upload bytes | `PUT {media_upload_url}` | 200 |
| Confirm object | `POST /api/v1/media/confirm` | 200 |
| Attach gallery media | `POST /api/v1/media/gallery` | 201 |
| List gallery media | `GET /api/v1/media/gallery` | 200 |
| Read media record | `GET /api/v1/media/{id}` | 200 |
| Delete media | `DELETE /api/v1/media/{id}` | 200 |

Onboarding uses `POST /api/v1/media/onboarding/upload-url` and `POST /api/v1/media/onboarding/confirm` with the onboarding token.

## Security Tests

Verify:

- Upload URLs expire after `MEDIA_PRESIGNED_URL_TTL_SECONDS`.
- CDN URLs include `exp` and `token`, and fail after expiry at the Worker/CDN layer.
- A customer cannot attach barber-owned media.
- A barber cannot read or delete media owned by another shop.
- PUT requests with mismatched `Content-Type` or byte length fail confirm-time validation.
- The bucket remains private; direct unauthenticated object reads are blocked.

## Performance Benchmarks

Baseline targets for pre-production validation:

| Scenario | Target |
|---|---:|
| Presigned URL API latency | p95 under 250 ms |
| Confirm API latency after upload | p95 under 500 ms |
| 10 concurrent image uploads | 0 failed confirms |
| 100 gallery reads | p95 under 300 ms excluding CDN image fetch |
| CDN cache hit ratio after warmup | over 90% for popular transformed URLs |

## Verification Methods

R2 dashboard:

- Confirm object keys follow `images/{purpose}/{ownerId}/{uuid}.{ext}` or `videos/{purpose}/{ownerId}/{uuid}.{ext}`.
- Confirm object count matches `Media` ready records after migration.
- Confirm deleted media is removed or marked deleted according to the API result.

MongoDB:

- `Media.status` moves from `pending` to `ready` after confirm.
- `Shop.coverMediaId`, `Barber.photoMediaId`, `Employee.photoMediaId`, and `Customer.photoMediaId` are populated after attachment/replacement.
- Retired URL fields and legacy direct keys are absent after cutover finalization.

CDN/cache:

- Fetch generated `cdnUrl` and transformed variants.
- Repeat the same URL and verify cache hit headers through the Cloudflare dashboard/logs.
- Change width/quality parameters and verify each variant is independently cached.

## Rollback

1. Restore the most recent database backup taken before cutover finalization.
2. Revert the application deployment to the previous build.
3. Pause migration; it is idempotent and can resume later.
4. Do not purge old remote originals until rollback is no longer required.

## Post-Release Checks

- No backend logs contain calls to removed media SDKs.
- R2 error rate stays below 1% during peak upload windows.
- Confirm orphan cleanup removes expired pending objects.
- Mobile and web clients render profile, cover, employee, service, and gallery media.
- Broken-link scan reports no missing media URLs.
- R2 storage and Class A/B operation costs match the forecast.
