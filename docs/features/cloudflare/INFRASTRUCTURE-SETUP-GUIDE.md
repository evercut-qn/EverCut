# EverCut — Infrastructure Setup Guide
## Cloudflare R2 + CDN + Worker Provisioning

**Document Version:** 1.0  
**Date:** May 2026  
**Classification:** DevOps / Infrastructure Blueprint

---

## Table of Contents

1. [Cloudflare Account Setup](#1-cloudflare-account-setup)
2. [R2 Bucket Provisioning](#2-r2-bucket-provisioning)
3. [R2 API Token Configuration](#3-r2-api-token-configuration)
4. [Custom Domain & DNS](#4-custom-domain--dns)
5. [Cloudflare Worker Deployment](#5-cloudflare-worker-deployment)
6. [Workers KV Setup](#6-workers-kv-setup)
7. [Lifecycle Rules](#7-lifecycle-rules)
8. [CORS Configuration](#8-cors-configuration)
9. [Security Checklist](#9-security-checklist)
10. [Monitoring & Alerts](#10-monitoring--alerts)
11. [Cost Optimization](#11-cost-optimization)

---

## 1. Cloudflare Account Setup

### 1.1 Prerequisites

- Cloudflare account (free tier is sufficient to start)
- `evercut.in` added to Cloudflare DNS and active if using custom media domains
- GoDaddy/Hostinger nameservers updated to Cloudflare nameservers if `evercut.in` is registered there
- `wrangler` CLI installed: `npm install -g wrangler`

### 1.2 Initial Setup

```bash
# Authenticate wrangler
wrangler login

# Verify account
wrangler whoami
```

---

## 2. R2 Bucket Provisioning

### 2.1 Create Buckets

```bash
# Development bucket
wrangler r2 bucket create evercut-media-dev

# Production bucket
wrangler r2 bucket create evercut-media-prod
```

### 2.2 Verify Buckets

```bash
wrangler r2 bucket list
```

### 2.3 Bucket Access Policy

**Critical:** All buckets must remain **private**. Do NOT enable the `r2.dev` public subdomain.

```
Bucket Settings:
  ✗ r2.dev subdomain: DISABLED
  ✗ Public access: DISABLED
  ✓ All access: Via API tokens + presigned URLs only
```

---

## 3. R2 API Token Configuration

### 3.1 Principle of Least Privilege

Create **separate API tokens** for each service:

| Token Name | Used By | Permissions |
|------------|---------|-------------|
| `evercut-backend-token` | Node.js API server | `Object Read & Write` on bucket |
| `evercut-worker-token` | Cloudflare Worker (if using Service Binding, not needed) | `Object Read` on bucket |
| `evercut-migration-token` | Data migration script | `Object Read & Write` on bucket (temporary) |

### 3.2 Create Backend Token

1. Go to Cloudflare Dashboard → R2 → Manage R2 API Tokens
2. Create token:
   - **Token name:** `evercut-backend-dev`
   - **Permissions:** Object Read & Write
   - **Specify bucket(s):** `evercut-media-dev`
   - **TTL:** No expiry (rotate manually every 90 days)
3. Copy `Access Key ID` and `Secret Access Key`

### 3.3 Store Credentials

```bash
# .env (backend server)
CF_ACCOUNT_ID=<your-account-id>
R2_ACCESS_KEY_ID=<from-step-above>
R2_SECRET_ACCESS_KEY=<from-step-above>
R2_BUCKET=evercut-media-dev
```

> **Security:** Never commit these values. Use environment-specific `.env` files. In production, use secrets management (AWS SSM, Vault, etc.).

---

## 4. Custom Domain & DNS

### 4.1 Recommended Media Subdomains

Use separate media subdomains per environment:

```
media-dev.evercut.in -> evercut-media-worker-dev -> evercut-media-dev
media.evercut.in     -> evercut-media-worker     -> evercut-media-prod
```

Do not use `media.evercut.in` for both dev and prod. Separate hostnames keep cache, signed URLs, CORS behavior, logs, and bucket access isolated.

### 4.2 GoDaddy/Hostinger DNS Requirement

The domain can remain registered at GoDaddy or Hostinger, but Cloudflare must be authoritative DNS before Worker custom domains can be attached.

Steps:

1. Add `evercut.in` to Cloudflare under **Websites**.
2. Let Cloudflare import existing DNS records.
3. Copy the two Cloudflare nameservers.
4. In GoDaddy/Hostinger domain settings, replace existing nameservers with the Cloudflare nameservers.
5. Wait until Cloudflare marks `evercut.in` as active.
6. Add Worker custom domains:
   - `media-dev.evercut.in` on `evercut-media-worker-dev`
   - `media.evercut.in` on `evercut-media-worker`

### 4.3 Worker Custom Domains

In Cloudflare Dashboard:

1. Open **Workers & Pages**.
2. Open the Worker.
3. Go to **Settings** -> **Domains & Routes**.
4. Select **Add** -> **Custom Domain**.
5. Add the environment hostname.

Cloudflare creates the DNS record and certificate for the Worker custom domain. Do not manually point these names at R2.

### 4.4 SSL/TLS

- Mode: **Full (Strict)**
- Always Use HTTPS: **Enabled**
- Minimum TLS Version: **1.2**

---

## 5. Cloudflare Worker Deployment

### 5.1 Worker Project Setup

```bash
mkdir evercut-media-worker
cd evercut-media-worker
npm init -y
```

### 5.2 wrangler.toml

```toml
name = "evercut-media-worker"
main = "src/worker.js"
compatibility_date = "2025-01-01"

# R2 bucket binding
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "evercut-media-prod"

# KV namespace for token blacklist
[[kv_namespaces]]
binding = "TOKEN_BLACKLIST"
id = "<your-kv-namespace-id>"

# Custom domain route. Enable only after evercut.in is active in Cloudflare.
[[routes]]
pattern = "media.evercut.in"
custom_domain = true

[env.dev]
[[env.dev.r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "evercut-media-dev"

[[env.dev.routes]]
pattern = "media-dev.evercut.in"
custom_domain = true
```

### 5.3 Worker Implementation (Edge Auth)

```javascript
// src/worker.js
const CACHE_CONTROL = {
    image:     'public, max-age=2592000, immutable',  // 30 days
    video_seg: 'public, max-age=86400, immutable',    // 1 day
    playlist:  'public, max-age=300',                 // 5 min
    thumbnail: 'public, max-age=2592000, immutable',  // 30 days
};

function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    const aBytes = new TextEncoder().encode(a);
    const bBytes = new TextEncoder().encode(b);
    let diff = 0;
    for (let i = 0; i < aBytes.length; i++) {
        diff |= aBytes[i] ^ bBytes[i];
    }
    return diff === 0;
}

async function verifyToken(token, secret, prevSecret) {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );

    const expected = btoa(String.fromCharCode(
        ...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded))),
    )).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    if (!timingSafeEqual(expected, sig)) {
        // Try previous secret for rotation
        if (prevSecret) {
            const prevKey = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(prevSecret),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign'],
            );
            const prevExpected = btoa(String.fromCharCode(
                ...new Uint8Array(await crypto.subtle.sign('HMAC', prevKey, new TextEncoder().encode(encoded))),
            )).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

            if (!timingSafeEqual(prevExpected, sig)) return null;
        } else {
            return null;
        }
    }

    try {
        const payload = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                    'Access-Control-Allow-Headers': 'Range',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            return new Response('Method Not Allowed', { status: 405 });
        }

        // Extract token from query parameter
        const token = url.searchParams.get('token');
        if (!token) {
            return new Response('Unauthorized — missing token', { status: 401 });
        }

        // Verify HMAC token
        const payload = await verifyToken(
            token,
            env.MEDIA_TOKEN_SECRET,
            env.MEDIA_TOKEN_SECRET_PREV || null,
        );

        if (!payload) {
            return new Response('Unauthorized — invalid token', { status: 401 });
        }

        // Check token blacklist (logout/revocation)
        const blacklisted = await env.TOKEN_BLACKLIST.get(`revoked:${payload.sub}`);
        if (blacklisted && parseInt(blacklisted) > payload.iat) {
            return new Response('Unauthorized — token revoked', { status: 401 });
        }

        // Strip token from cache key (so CDN caches the resource, not the token)
        const r2Key = url.pathname.slice(1); // Remove leading /
        const cacheKey = new Request(`${url.origin}/${r2Key}`, request);

        // Check Cloudflare cache
        const cache = caches.default;
        let response = await cache.match(cacheKey);
        if (response) return response;

        // Fetch from R2
        const object = await env.MEDIA_BUCKET.get(r2Key, {
            range: request.headers.get('Range')
                ? { offset: 0 } // Simplified — full range support needs parsing
                : undefined,
        });

        if (!object) {
            return new Response('Not Found', { status: 404 });
        }

        // Determine cache control based on content type
        const contentType = object.httpMetadata?.contentType || 'application/octet-stream';
        let cacheControl = CACHE_CONTROL.image;
        if (r2Key.endsWith('.m3u8')) cacheControl = CACHE_CONTROL.playlist;
        else if (r2Key.endsWith('.ts')) cacheControl = CACHE_CONTROL.video_seg;
        else if (r2Key.includes('thumbnails/')) cacheControl = CACHE_CONTROL.thumbnail;

        response = new Response(object.body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': object.size,
                'Cache-Control': cacheControl,
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'ETag': object.etag,
            },
        });

        // Cache the response (without token in URL)
        await cache.put(cacheKey, response.clone());
        return response;
    },
};
```

### 5.4 Deploy Worker

```bash
# Set secrets (never in wrangler.toml)
wrangler secret put MEDIA_TOKEN_SECRET
wrangler secret put MEDIA_TOKEN_SECRET_PREV

# Deploy to production
wrangler deploy

# Deploy to development
wrangler deploy --env dev
```

---

## 6. Workers KV Setup

```bash
# Create KV namespace for token blacklist
wrangler kv namespace create TOKEN_BLACKLIST

# Copy the namespace ID into wrangler.toml
```

---

## 7. Lifecycle Rules

### 7.1 Multipart Upload Cleanup

Configure via Cloudflare dashboard or API:

```bash
# Abort incomplete multipart uploads after 7 days
# (This is an R2 bucket-level setting)
```

### 7.2 Infrequent Access Transition

For production, configure R2 lifecycle rules:
- Objects in `images/` older than 90 days with no access → Transition to IA tier
- Objects in `videos/raw/` → Delete after 30 days (transcoded HLS replaces them)

---

## 8. CORS Configuration

R2 bucket CORS (set via API):

```json
{
    "CORSRules": [
        {
            "AllowedOrigins": ["https://evercut.in", "https://*.evercut.in"],
            "AllowedMethods": ["PUT", "GET", "HEAD"],
            "AllowedHeaders": ["Content-Type"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3600
        }
    ]
}
```

> **Important:** For development, add `http://localhost:*` to AllowedOrigins. Remove in production.

---

## 9. Security Checklist

- [ ] All R2 buckets private — `r2.dev` subdomain disabled
- [ ] Separate API tokens per environment (dev/prod)
- [ ] Separate API tokens per service (backend/worker/migration)
- [ ] `MEDIA_TOKEN_SECRET` is 256-bit random (32 bytes hex)
- [ ] `MEDIA_TOKEN_SECRET` matches between backend and Worker
- [ ] Worker secrets set via `wrangler secret put` — never in wrangler.toml
- [ ] CORS restricted to app domain in production
- [ ] Presigned URLs enforce Content-Type; backend confirm validates final object size
- [ ] R2 API keys rotated every 90 days
- [ ] Workers Paid plan activated before production launch
- [ ] Token blacklist checked on every Worker request

---

## 10. Monitoring & Alerts

### 10.1 Cloudflare Dashboard

- Workers → Analytics: Request count, error rate, CPU time
- R2 → Usage: Storage, operations, egress

### 10.2 Alert Thresholds

| Metric | Alert When |
|--------|-----------|
| Worker error rate | > 0.5% over 5 minutes |
| Worker CPU p99 | > 40ms |
| R2 Class B operations | > 8M/month (80% free tier) |
| Upload failure rate | > 5% |
| Token validation failures | > 1% (possible attack) |

---

## 11. Cost Optimization

### 11.1 Free Tier Maximization

| Service | Free Tier | Action |
|---------|-----------|--------|
| R2 Storage | 10 GB/month | Sufficient for MVP |
| R2 Class A ops | 1M/month | Monitor upload volume |
| R2 Class B ops | 10M/month | Monitor read volume |
| R2 Egress | Always free | No action needed |
| Workers | 100K req/day (free), 10M/month (paid) | Upgrade to paid ($5/mo) before launch |

### 11.2 Upgrade Timeline

- **MVP (< 500 users):** Free R2 + Workers Paid ($5/month)
- **Growth (< 5K users):** Free R2 + Workers Paid ($5/month) + CF Images for transforms
- **Scale (> 25K users):** R2 paid storage + Workers Paid + IA lifecycle rules

---

*End of Infrastructure Setup Guide*