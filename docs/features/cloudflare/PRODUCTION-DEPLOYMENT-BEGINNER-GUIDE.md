# Beginner Production Deployment Guide For EverCut Media

Date: 2026-05-12  
Recommended production media URL: `https://media.evercut.in`  
Recommended development media URL: `https://media-dev.evercut.in`

This guide explains exactly what you need to configure for Cloudflare R2, Workers, backend environment variables, and production deployment.

## 1. What You Are Deploying

EverCut media has three parts:

1. **Backend API**
   - Generates presigned upload URLs.
   - Confirms uploads.
   - Creates signed media URLs.

2. **Cloudflare R2**
   - Stores files.
   - Buckets must stay private.

3. **Cloudflare Worker**
   - Receives signed media URLs.
   - Checks `exp` and `token`.
   - Reads private files from R2.
   - Returns image/video bytes to Flutter.

Flutter never talks to R2 directly except when uploading to the temporary presigned `uploadUrl` returned by the backend.

## 2. Domains To Use

Use separate domains:

| Environment | Domain | Why |
|---|---|---|
| development | `media-dev.evercut.in` | Safe testing against dev bucket |
| production | `media.evercut.in` | Real user media from prod bucket |

Do not use `media.evercut.in` for both dev and prod.

## 3. Current Safe Fallback URLs

Until custom domains are ready, these Worker URLs work:

| Environment | Worker URL |
|---|---|
| development | `https://evercut-media-worker-dev.quantneural-evercut.workers.dev` |
| production | `https://evercut-media-worker.quantneural-evercut.workers.dev` |

If you open them directly, they return:

```text
401 Unauthorized - missing media token
```

That is correct. Media URLs must be signed by the backend.

## 4. Cloudflare Dashboard Setup

### Step 1: Add `evercut.in` To Cloudflare

Your domain can stay registered on GoDaddy or Hostinger. You do not need to transfer the domain.

You do need Cloudflare to manage DNS.

1. Open Cloudflare Dashboard.
2. Go to **Websites**.
3. Click **Add a domain**.
4. Enter:

```text
evercut.in
```

5. Choose a plan.
6. Let Cloudflare import existing DNS records.
7. Review the DNS records carefully.
8. Continue until Cloudflare gives you two nameservers.

### Step 2: Update Nameservers In GoDaddy/Hostinger

1. Open GoDaddy or Hostinger.
2. Go to domain settings for `evercut.in`.
3. Find **Nameservers**.
4. Choose custom nameservers.
5. Paste the two Cloudflare nameservers.
6. Save.
7. Wait until Cloudflare shows the domain as active.

This can take minutes or several hours.

### Step 3: Add Worker Custom Domains

After Cloudflare says `evercut.in` is active:

Development:

1. Go to **Workers & Pages**.
2. Open `evercut-media-worker-dev`.
3. Go to **Settings** -> **Domains & Routes**.
4. Add custom domain:

```text
media-dev.evercut.in
```

Production:

1. Go to **Workers & Pages**.
2. Open `evercut-media-worker`.
3. Go to **Settings** -> **Domains & Routes**.
4. Add custom domain:

```text
media.evercut.in
```

Wait until Cloudflare finishes certificate setup.

## 5. R2 Buckets

You should have only:

```text
evercut-media-dev
evercut-media-prod
```

Verify:

```powershell
wrangler r2 bucket list
```

Public `r2.dev` access must be disabled:

```powershell
wrangler r2 bucket dev-url get evercut-media-dev
wrangler r2 bucket dev-url get evercut-media-prod
```

Expected:

```text
Public access via the r2.dev URL is disabled.
```

That is correct and secure.

## 6. R2 API Keys

The backend needs R2 API keys so it can generate presigned upload URLs and confirm uploads.

Where to get them:

1. Cloudflare Dashboard.
2. Go to **R2 Object Storage**.
3. Open **Manage R2 API Tokens**.
4. Create a token for development:
   - bucket: `evercut-media-dev`
   - permission: Object Read & Write
5. Create a separate token for production:
   - bucket: `evercut-media-prod`
   - permission: Object Read & Write
6. Copy:
   - Access Key ID
   - Secret Access Key

Where to add them:

- local development: `server/.env`
- production: your production hosting platform environment variables

Do not commit real secrets to git.

## 7. Worker Secrets

The Worker and backend must share the same `MEDIA_TOKEN_SECRET` per environment.

Generate a strong secret:

```powershell
cd server
node scripts\generate-token-secrets.mjs
```

Set development Worker secret:

```powershell
cd cloudflare\media-worker
wrangler secret put MEDIA_TOKEN_SECRET --env dev
```

Set production Worker secret:

```powershell
cd cloudflare\media-worker
wrangler secret put MEDIA_TOKEN_SECRET
```

Use the same value in the backend environment variable:

```text
MEDIA_TOKEN_SECRET=<same value>
```

## 8. Worker Bindings

The Worker needs two bindings:

| Binding | Purpose |
|---|---|
| `MEDIA_BUCKET` | Lets Worker read from R2 |
| `TOKEN_BLACKLIST` | Reserved for token revocation/blacklist support |

Configured in:

```text
cloudflare/media-worker/wrangler.toml
```

Dev Worker must bind:

```text
MEDIA_BUCKET -> evercut-media-dev
```

Prod Worker must bind:

```text
MEDIA_BUCKET -> evercut-media-prod
```

Verify:

```powershell
cd cloudflare\media-worker
wrangler deploy --dry-run --env dev
wrangler deploy --dry-run --env=""
```

The output should show `MEDIA_BUCKET` and `TOKEN_BLACKLIST`.

## 9. Backend Environment Variables

### Development

Use this locally after custom domain setup:

```text
NODE_ENV=development
CF_ACCOUNT_ID=7f84fa9e5a8cb50ba3a00c487be137ec
R2_BUCKET=evercut-media-dev
CDN_BASE_URL=https://media-dev.evercut.in
R2_ACCESS_KEY_ID=<dev-r2-access-key-id>
R2_SECRET_ACCESS_KEY=<dev-r2-secret-access-key>
MEDIA_TOKEN_SECRET=<same-as-dev-worker-secret>
```

Before custom domain setup, use:

```text
CDN_BASE_URL=https://evercut-media-worker-dev.quantneural-evercut.workers.dev
```

### Production

Use this in your production hosting platform:

```text
NODE_ENV=production
CF_ACCOUNT_ID=7f84fa9e5a8cb50ba3a00c487be137ec
R2_BUCKET=evercut-media-prod
CDN_BASE_URL=https://media.evercut.in
R2_ACCESS_KEY_ID=<prod-r2-access-key-id>
R2_SECRET_ACCESS_KEY=<prod-r2-secret-access-key>
MEDIA_TOKEN_SECRET=<same-as-prod-worker-secret>
```

Before custom domain setup, use:

```text
CDN_BASE_URL=https://evercut-media-worker.quantneural-evercut.workers.dev
```

## 10. Deploy Workers

Development:

```powershell
cd cloudflare\media-worker
wrangler deploy --env dev
```

Production:

```powershell
cd cloudflare\media-worker
wrangler deploy --env=""
```

Verify deployments:

```powershell
wrangler deployments list --env dev
wrangler deployments list
```

## 11. Apply R2 CORS

R2 CORS must allow the exact client-set headers used by browser-based direct uploads:

- `Content-Type`

Apply the checked-in CORS files:

```powershell
wrangler r2 bucket cors set evercut-media-dev --file cloudflare\r2-cors.dev.json
wrangler r2 bucket cors set evercut-media-prod --file cloudflare\r2-cors.prod.json
```

Verify:

```powershell
wrangler r2 bucket cors list evercut-media-dev
wrangler r2 bucket cors list evercut-media-prod
```

Both outputs must include `Content-Type` in `allowed_headers`.

## 12. Deploy Backend

Before backend production deployment:

1. Production environment variables are set.
2. `R2_BUCKET=evercut-media-prod`.
3. `CDN_BASE_URL=https://media.evercut.in`.
4. `MEDIA_TOKEN_SECRET` matches the production Worker secret.
5. R2 API key has access to `evercut-media-prod`.

Then run:

```powershell
cd server
npm ci
npm test
npm start
```

Your hosting provider may run these commands differently, but the checks are the same.

## 13. Verify Media Routes

With backend running:

```powershell
cd server
npm run test:media-routes
```

Expected:

```text
Validation summary
{
  "total": 45,
  "passed": 45,
  "failed": 0
}
```

This verifies:

- OTP login for barber and customer
- onboarding media upload route
- normal media upload route
- direct R2 upload
- upload confirmation
- signed Worker delivery
- unsigned Worker denial
- gallery attach/list/stats
- shop picture update
- shop cover update
- employee create/update/delete with media
- customer profile update with media
- media delete

## 14. Production Smoke Test

After production backend and Worker deployment:

1. Login as a real test barber.
2. Request upload URL:

```http
POST /api/v1/media/upload-url
```

3. Upload the image to returned `uploadUrl` using `No Auth` and a `Content-Type` header matching the contentType from the upload-url request.
4. Confirm:

```http
POST /api/v1/media/confirm
```

5. Open returned `cdnUrl`.

Expected:

- upload URL request returns `201`
- direct R2 upload returns `200`
- confirm returns `200`
- signed media URL returns `200`
- same URL without `token` returns `401`
- object appears inside `evercut-media-prod`

## 15. Common Problems

### `Public access via the r2.dev URL is disabled`

This is expected. It means the bucket is private.

### Worker returns `401 Unauthorized - missing media token`

Expected when you open the Worker root or remove query params. Use a backend-generated media URL.

### Confirm upload says object not found

Possible causes:

- direct R2 `PUT` failed
- upload URL expired
- wrong R2 credentials
- backend points to the wrong bucket

### Direct R2 upload returns `No date provided in x-amz-date nor date header`

The direct PUT is probably not using the presigned URL exactly as generated, or Postman is sending an authorization mode to R2.

Fix:

1. Re-run `POST /media/upload-url`.
2. Copy the returned `uploadUrl`.
3. Confirm the copied URL still contains `X-Amz-Date`, `X-Amz-Signature`, and the other query parameters.
4. In Postman, set the direct R2 request Authorization tab to `No Auth`.
5. Send a `Content-Type` header matching the contentType from the upload-url request. Do not add `x-amz-date`, `x-amz-content-sha256`, or the EverCut bearer token manually.

### Direct R2 upload returns `Missing x-amz-content-sha256`

The direct PUT is sending an unexpected `Authorization` header to R2. Set the request to `No Auth` and retry with a fresh `uploadUrl`.

### Signed URL returns `401`

Possible causes:

- `MEDIA_TOKEN_SECRET` differs between backend and Worker
- URL expired
- query params were removed by the client

### Signed URL returns `404`

Possible causes:

- object deleted from R2
- backend generated URL for wrong bucket/environment
- `CDN_BASE_URL` points to dev Worker while object is in prod bucket, or the reverse

## 16. Final Production Checklist

- [ ] `evercut.in` active in Cloudflare.
- [ ] GoDaddy/Hostinger nameservers point to Cloudflare.
- [ ] `media-dev.evercut.in` attached to dev Worker.
- [ ] `media.evercut.in` attached to prod Worker.
- [ ] `evercut-media-dev` and `evercut-media-prod` exist.
- [ ] R2 public `r2.dev` URLs disabled.
- [ ] Dev/prod R2 API keys created separately.
- [ ] Dev/prod Worker secrets set.
- [ ] Dev/prod R2 CORS allows `Content-Type`.
- [ ] Production backend env uses `evercut-media-prod`.
- [ ] Production backend env uses `https://media.evercut.in`.
- [ ] `npm test` passes.
- [ ] `npm run test:media-routes` passes.
- [ ] Production smoke upload passes.