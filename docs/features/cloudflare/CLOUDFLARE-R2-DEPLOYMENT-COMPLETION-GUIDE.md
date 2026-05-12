# Cloudflare R2 Domain and Deployment Completion Guide

Date: 2026-05-12  
Domain: `evercut.in`  
Recommended media domains:

- Development: `https://media-dev.evercut.in`
- Production: `https://media.evercut.in`

Related guides:

- `docs/features/cloudflare/PRODUCTION-DEPLOYMENT-BEGINNER-GUIDE.md`
- `docs/features/cloudflare/MEDIA-ROUTE-VALIDATION-REPORT.md`

## 1. Recommendation

Use separate subdomains:

| Environment | Subdomain | Bucket | Worker |
|---|---|---|---|
| development | `media-dev.evercut.in` | `evercut-media-dev` | `evercut-media-worker-dev` |
| production | `media.evercut.in` | `evercut-media-prod` | `evercut-media-worker` |

Do not use only `media.evercut.in` for both dev and prod.

Separate domains prevent:

- dev URLs accidentally serving prod media
- prod cache entries mixing with dev objects
- confusing signed URL debugging
- frontend developers testing against the wrong bucket
- production CORS and dev CORS being mixed together

## 2. Why The Current `r2.dev` Logs Are Expected

You ran:

```powershell
wrangler r2 bucket dev-url get evercut-media-dev
wrangler r2 bucket dev-url get evercut-media-prod
```

Output:

```text
Public access via the r2.dev URL is disabled.
```

This is expected and correct.

R2 has an optional public bucket URL under Cloudflare's `r2.dev` domain. EverCut should not use that public bucket URL because all media access must go through the authenticated Cloudflare Worker.

Correct access path:

```text
Flutter/backend receives signed URL
        ↓
Cloudflare Worker validates exp + token
        ↓
Worker reads private object from R2
        ↓
Worker returns media bytes
```

Incorrect access path:

```text
Public r2.dev bucket URL
        ↓
Anyone can access objects without Worker authorization
```

So the disabled `r2.dev` status is a security requirement, not a problem.

## 3. Are Custom Domains Required?

Technically, no. The current Workers URLs work:

```text
https://evercut-media-worker-dev.quantneural-evercut.workers.dev
https://evercut-media-worker.quantneural-evercut.workers.dev
```

But for a clean production setup, custom domains are recommended:

```text
https://media-dev.evercut.in
https://media.evercut.in
```

Use the Workers URLs only as a temporary fallback. Use `media.evercut.in` for production launch.

## 4. Why The Workers URLs Exist

Cloudflare automatically gives each Worker a `workers.dev` URL.

The format is:

```text
https://<worker-name>.<account-workers-dev-subdomain>.workers.dev
```

Current values:

| Part | Value |
|---|---|
| Account workers.dev subdomain | `quantneural-evercut` |
| Dev Worker name | `evercut-media-worker-dev` |
| Prod Worker name | `evercut-media-worker` |

That creates:

```text
https://evercut-media-worker-dev.quantneural-evercut.workers.dev
https://evercut-media-worker.quantneural-evercut.workers.dev
```

Those URLs are valid. A direct request returns `401 Unauthorized - missing media token`, which is correct because media URLs must be signed by the backend.

## 5. Important DNS Model For GoDaddy/Hostinger Domains

Your domain can remain registered at GoDaddy or Hostinger.

But for Cloudflare Worker custom domains, `evercut.in` must exist as an active Cloudflare DNS zone. That usually means:

1. Add `evercut.in` to Cloudflare.
2. Cloudflare gives you two nameservers.
3. Go to GoDaddy/Hostinger.
4. Replace the current nameservers with the Cloudflare nameservers.
5. Wait until Cloudflare marks the zone as active.

After that, Cloudflare can create:

- `media-dev.evercut.in`
- `media.evercut.in`

You do not need to transfer the domain registration to Cloudflare. You only need to use Cloudflare as authoritative DNS.

## 6. What Is Completed

- R2 buckets exist:
  - `evercut-media-dev`
  - `evercut-media-prod`
- Public `r2.dev` access is disabled.
- Dev and prod Workers are deployed on `workers.dev`.
- Dev and prod Worker secrets are configured.
- Dev and prod KV namespaces exist.
- Dev upload and signed media delivery were validated.
- Prod Worker signed delivery was validated with a temporary remote R2 object.
- Backend tests passed: `158` passed, `0` failed.

## 7. What Is Still Missing

| Missing item | Required for launch? | Owner |
|---|---|---|
| Add `evercut.in` to Cloudflare as a DNS zone | Yes, if using custom domains | You |
| Update nameservers at GoDaddy/Hostinger to Cloudflare nameservers | Yes, if using custom domains | You |
| Add Worker custom domains | Yes, for `media-dev.evercut.in` and `media.evercut.in` | You or backend/DevOps |
| Uncomment/add Worker custom domain routes in `wrangler.toml` | Only after zone is active | Backend/DevOps |
| Update backend `CDN_BASE_URL` values | Yes after custom domains are live | Backend/DevOps |
| Apply prod CORS with `evercut.in` origins | Yes | Backend/DevOps |
| Rotate `MEDIA_TOKEN_SECRET` to a 64-character production secret | Recommended before launch | Backend/DevOps |

## 8. Cloudflare Dashboard Steps

### 8.1 Add `evercut.in` To Cloudflare

1. Open Cloudflare Dashboard.
2. Go to **Websites**.
3. Click **Add a domain**.
4. Enter:

```text
evercut.in
```

5. Choose a plan.
6. Let Cloudflare scan existing DNS records.
7. Carefully review imported DNS records.
8. Continue until Cloudflare shows two assigned nameservers.

Do not delete existing website/API/mail records unless you know they are obsolete.

### 8.2 Update Nameservers At GoDaddy/Hostinger

At GoDaddy or Hostinger:

1. Open domain management for `evercut.in`.
2. Find **Nameservers**.
3. Choose custom nameservers.
4. Paste the two Cloudflare nameservers.
5. Save.
6. Wait for propagation.

Cloudflare must show `evercut.in` as active before custom domains can be attached to Workers.

### 8.3 Add Worker Custom Domains

After `evercut.in` is active in Cloudflare:

Development:

1. Go to **Workers & Pages**.
2. Open `evercut-media-worker-dev`.
3. Go to **Settings** → **Domains & Routes**.
4. Click **Add** → **Custom Domain**.
5. Enter:

```text
media-dev.evercut.in
```

6. Save and wait for certificate issuance.

Production:

1. Go to **Workers & Pages**.
2. Open `evercut-media-worker`.
3. Go to **Settings** → **Domains & Routes**.
4. Click **Add** → **Custom Domain**.
5. Enter:

```text
media.evercut.in
```

6. Save and wait for certificate issuance.

## 9. Codebase Configuration

### 9.1 Worker Config

File:

```text
cloudflare/media-worker/wrangler.toml
```

The custom domain route blocks are intentionally commented until `evercut.in` is active in Cloudflare. This avoids breaking `wrangler deploy` before DNS is ready.

After the Cloudflare zone is active, enable:

```toml
[[routes]]
pattern = "media.evercut.in"
custom_domain = true
```

And for dev:

```toml
[[env.dev.routes]]
pattern = "media-dev.evercut.in"
custom_domain = true
```

### 9.2 Development Backend Env

Before custom domain is active, local dev can keep using:

```text
CDN_BASE_URL=https://evercut-media-worker-dev.quantneural-evercut.workers.dev
R2_BUCKET=evercut-media-dev
```

After custom domain is active, use:

```text
CDN_BASE_URL=https://media-dev.evercut.in
R2_BUCKET=evercut-media-dev
```

### 9.3 Production Backend Env

Before custom domain is active:

```text
CDN_BASE_URL=https://evercut-media-worker.quantneural-evercut.workers.dev
R2_BUCKET=evercut-media-prod
```

After custom domain is active:

```text
CDN_BASE_URL=https://media.evercut.in
R2_BUCKET=evercut-media-prod
```

Production backend must also have:

```text
CF_ACCOUNT_ID=7f84fa9e5a8cb50ba3a00c487be137ec
R2_ACCESS_KEY_ID=<prod-r2-access-key>
R2_SECRET_ACCESS_KEY=<prod-r2-secret-key>
MEDIA_TOKEN_SECRET=<same-secret-as-prod-worker>
```

## 10. Terminal Steps

### 10.1 Verify R2 Public Access Is Disabled

```powershell
wrangler r2 bucket dev-url get evercut-media-dev
wrangler r2 bucket dev-url get evercut-media-prod
```

Expected:

```text
Public access via the r2.dev URL is disabled.
```

### 10.2 Apply CORS

Development:

```powershell
wrangler r2 bucket cors set evercut-media-dev --file cloudflare\r2-cors.dev.json
```

Production:

```powershell
wrangler r2 bucket cors set evercut-media-prod --file cloudflare\r2-cors.prod.json
```

Verify:

```powershell
wrangler r2 bucket cors list evercut-media-dev
wrangler r2 bucket cors list evercut-media-prod
```

Both environments must allow `Content-Type` for direct browser uploads. The presigned URL query string carries the SigV4 date, payload hash, expiry, and signature.

### 10.3 Deploy Workers

Development:

```powershell
cd cloudflare\media-worker
wrangler deploy --env dev
```

Production:

```powershell
cd cloudflare\media-worker
wrangler deploy
```

### 10.4 Verify Worker Endpoints

Before custom domains:

```powershell
node -e "Promise.all(['https://evercut-media-worker-dev.quantneural-evercut.workers.dev','https://evercut-media-worker.quantneural-evercut.workers.dev'].map(async u=>{const r=await fetch(u); console.log(u, r.status, await r.text());}))"
```

After custom domains:

```powershell
node -e "Promise.all(['https://media-dev.evercut.in','https://media.evercut.in'].map(async u=>{const r=await fetch(u); console.log(u, r.status, await r.text());}))"
```

Expected:

```text
401 Unauthorized - missing media token
```

### 10.5 Verify Backend Tests

```powershell
cd server
npm test
```

Expected:

```text
tests 158
pass 158
fail 0
```

## 11. Full Development Setup

1. Keep local backend using dev bucket:

```text
R2_BUCKET=evercut-media-dev
```

2. Use one of these:

```text
# Current working fallback
CDN_BASE_URL=https://evercut-media-worker-dev.quantneural-evercut.workers.dev

# After custom domain setup
CDN_BASE_URL=https://media-dev.evercut.in
```

3. Deploy dev Worker:

```powershell
cd cloudflare\media-worker
wrangler deploy --env dev
```

4. Start backend:

```powershell
cd server
npm run dev
```

5. Flutter should use backend API responses as-is. It should not hard-code media domains.

## 12. Full Production Deployment

1. Add `evercut.in` to Cloudflare.
2. Update GoDaddy/Hostinger nameservers to Cloudflare nameservers.
3. Wait until Cloudflare shows the zone as active.
4. Add Worker custom domain:

```text
media.evercut.in → evercut-media-worker
```

5. Enable the prod custom domain route in `wrangler.toml`.
6. Set prod Worker secret:

```powershell
cd cloudflare\media-worker
wrangler secret put MEDIA_TOKEN_SECRET
```

7. Deploy prod Worker:

```powershell
wrangler deploy
```

8. Set production backend environment:

```text
NODE_ENV=production
R2_BUCKET=evercut-media-prod
CDN_BASE_URL=https://media.evercut.in
CF_ACCOUNT_ID=7f84fa9e5a8cb50ba3a00c487be137ec
R2_ACCESS_KEY_ID=<prod-r2-access-key>
R2_SECRET_ACCESS_KEY=<prod-r2-secret-key>
MEDIA_TOKEN_SECRET=<same-secret-as-prod-worker>
```

9. Deploy backend through the production hosting process.
10. Run a production smoke upload:

```text
POST /api/v1/media/upload-url
PUT returned uploadUrl with `No Auth` and the returned `Content-Type` header
POST /api/v1/media/confirm
GET returned cdnUrl
```

Expected:

- upload URL request returns `201`
- direct R2 upload returns `200`
- confirm returns `200`
- signed CDN URL returns `200`
- unsigned CDN URL returns `401`
- object appears in `evercut-media-prod`

## 13. Final Checklist

| Check | Dev | Prod |
|---|---|---|
| R2 bucket exists | `evercut-media-dev` | `evercut-media-prod` |
| Public `r2.dev` disabled | required | required |
| Worker deployed | `evercut-media-worker-dev` | `evercut-media-worker` |
| Custom media domain | `media-dev.evercut.in` | `media.evercut.in` |
| Backend bucket env | `evercut-media-dev` | `evercut-media-prod` |
| Backend CDN env | `https://media-dev.evercut.in` | `https://media.evercut.in` |
| Worker secret matches backend | required | required |
| CORS configured | localhost/dev origins | `https://evercut.in`, `https://app.evercut.in` |

## 14. References

- Cloudflare Workers Custom Domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Cloudflare Wrangler Configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- Cloudflare DNS Nameserver Updates: https://developers.cloudflare.com/dns/nameservers/update-nameservers/
- Cloudflare Full DNS Setup: https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/
- Cloudflare R2 CORS: https://developers.cloudflare.com/r2/buckets/cors/