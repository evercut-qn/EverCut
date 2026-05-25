# Media Route Validation Report

Date: 2026-05-12  
API tested: `http://localhost:5000/api/v1`  
Test image: `server/postman-collections/assets/sample-upload.png`

## Credentials Used

| Actor | Phone | OTP |
|---|---|---|
| Barber | `9876543211` | `123456` |
| Customer | `9876543210` | `123456` |

An additional temporary phone number was generated during the run to test onboarding media routes because the provided barber and customer accounts are already onboarded and return normal access tokens, not onboarding tokens.

## How To Re-run

Start the backend first:

```powershell
cd server
npm run dev
```

Then run:

```powershell
cd server
npm run test:media-routes
```

Optional overrides:

```powershell
$env:EVERCUT_API_BASE_URL="http://localhost:5000/api/v1"
$env:EVERCUT_TEST_BARBER_MOBILE="9876543211"
$env:EVERCUT_TEST_CUSTOMER_MOBILE="9876543210"
$env:EVERCUT_TEST_OTP="123456"
$env:EVERCUT_TEST_IMAGE_PATH="C:\Users\manis\Projects\EverCut\server\postman-collections\assets\sample-upload.png"
npm run test:media-routes
```

## Final Result

```text
Validation summary
{
  "total": 45,
  "passed": 45,
  "failed": 0,
  "apiBaseUrl": "http://localhost:5000/api/v1"
}
```

## Routes Verified

### Authentication

| Route | Actor | Result |
|---|---|---|
| `POST /auth/otp/send` | barber | `200` |
| `POST /auth/otp/verify` | barber | `200`, access token returned |
| `POST /auth/otp/send` | customer | `200` |
| `POST /auth/otp/verify` | customer | `200`, access token returned |
| `POST /auth/otp/send` | temporary onboarding user | `200` |
| `POST /auth/otp/verify` | temporary onboarding user | `200`, onboarding token returned |

### Security Guards

| Route | Scenario | Expected | Result |
|---|---|---:|---:|
| `POST /media/upload-url` | no bearer token | `401` | `401` |
| `POST /media/gallery` | customer token on barber-only route | `403` | `403` |
| signed Worker media URL without `token` | unsigned request | `401` | `401` |

### Onboarding Media

| Step | Route/Target | Result |
|---|---|---|
| request upload URL | `POST /media/onboarding/upload-url` | `201` |
| upload file bytes | direct R2 `PUT` | `200` |
| confirm upload | `POST /media/onboarding/confirm` | `200` |
| verify delivery | signed CDN `HEAD` | `200` |
| verify protection | unsigned CDN request | `401` |
| cleanup | delete temporary R2 object and media record | passed |

### Barber Media and Gallery

| Step | Route/Target | Result |
|---|---|---|
| request upload URL | `POST /media/upload-url` | `201` |
| upload file bytes | direct R2 `PUT` | `200` |
| confirm upload | `POST /media/confirm` | `200` |
| verify delivery | signed CDN `HEAD` | `200` |
| read media | `GET /media/:id` | `200` |
| attach gallery | `POST /media/gallery` | `201` |
| list gallery | `GET /media/gallery?category=all&page=1&limit=20` | `200` |
| gallery stats | `GET /media/gallery/stats` | `200` |
| delete gallery validation media | `DELETE /media/:id` | `200` |

### Shop Media

| Route | Result |
|---|---:|
| `PATCH /shops/me/media/picture` | `200` |
| `PATCH /shops/me/media/cover` | `200` |

### Employee Media

| Route | Result |
|---|---:|
| `POST /employees` with `photoMediaId` | `201` |
| `PATCH /employees/:id` with `photoMediaId` | `200` |
| `DELETE /employees/:id` cleanup | `200` |

### Customer Media

| Route | Result |
|---|---:|
| `PATCH /customers/me` with `photoMediaId` | `200` |

## Bug Found And Fixed During Validation

Validation covered the direct R2 upload issue seen in Postman. R2 can return either of these when the direct upload request is not using the presigned URL contract correctly:

```text
InvalidRequest: Missing x-amz-content-sha256
InvalidArgument: No date provided in x-amz-date nor date header
```

Fix applied:

- Presigned PUT URLs now follow the Cloudflare R2 S3 presigned URL model: SigV4 auth data stays in query parameters, including `X-Amz-Date`.
- The only client-set signed upload header is `Content-Type`.
- `/media/upload-url` and `/media/onboarding/upload-url` return `requiredHeaders`.
- Postman direct R2 upload is explicitly `No Auth` so it does not inherit the EverCut bearer token.
- R2 CORS for dev and prod allows `Content-Type`.

The route validation script verifies `X-Amz-Date`, `X-Amz-Content-Sha256=UNSIGNED-PAYLOAD`, and `X-Amz-SignedHeaders=content-type;host`; direct R2 PUT returned `200`.

The first validation run exposed a real bug in `GET /media/:id`. The route passed an internal MongoDB filter:

```js
{ status: { $ne: 'deleted' } }
```

through a repository method without marking the internal `$ne` operator as trusted. With Mongoose `sanitizeFilter` enabled, that produced:

```text
Invalid status: [object Object]
```

Fix applied:

- `server/src/repositories/media.repository.js` now uses `trustQueryOperators(...)` for internal media repository queries that contain MongoDB operators.

The route was retested after the fix and passed.

## Response Contract Checks

- `GET /media/:id` was verified to return canonical `url` and no duplicate `photoUrl`.
- `GET /media/gallery` was verified to return gallery items without duplicate `photoUrl`.
- Entity-specific profile responses still use semantic fields such as `photoUrl`, `coverUrl`, and `ownerPhotoUrl`.

## Official Presigned URL Contract Used

The implementation follows Cloudflare R2's S3 presigned URL guidance:

- use `PUT` for direct object uploads
- keep SigV4 authorization data in the presigned URL query string
- preserve `X-Amz-Date`, `X-Amz-Expires`, `X-Amz-Signature`, and `X-Amz-SignedHeaders`
- do not send API bearer tokens or other `Authorization` headers to R2
- use CORS only for browser-set request headers, currently `Content-Type`

References:

- Cloudflare R2 presigned URLs: `https://developers.cloudflare.com/r2/api/s3/presigned-urls/`
- Cloudflare R2 upload objects: `https://developers.cloudflare.com/r2/objects/upload-objects/`

## R2 Folder Normalization

Historical legacy migration objects under `images/cover/` were normalized to `images/covers/`.

Result:

- live singular cover objects copied to `images/covers/`
- shop and media DB references updated
- old singular objects deleted
- one orphan media record with a missing object removed
- final DB check: `0` shop references and `0` media references under `images/cover/`
- final R2 check: no objects under `images/cover/`; cover objects remain under `images/covers/`

## Notes

- The route test updates the configured test barber's profile picture and cover image.
- The route test updates the configured test customer's profile photo.
- The test employee created during validation is deleted before the script exits.
- The onboarding test uses a temporary phone number and deletes the temporary R2 object/media record.
- The gallery media created by the validation run is attached, listed, included in stats, and then deleted to avoid filling the test barber gallery over repeated runs.