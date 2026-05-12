# EverCut Media Worker

Cloudflare Worker for signed media delivery from private R2 buckets.

## Environments

| Wrangler env | Bucket |
|---|---|
| default / prod | `evercut-media-prod` |
| `dev` | `evercut-media-dev` |

The backend generates media URLs as:

```text
{CDN_BASE_URL}/{r2Key}?exp={unixSeconds}&token={hexHmac}
```

The token is `HMAC_SHA256("{pathname}:{exp}", MEDIA_TOKEN_SECRET)`.

## Deploy

```powershell
wrangler secret put MEDIA_TOKEN_SECRET
wrangler secret put MEDIA_TOKEN_SECRET_PREV
wrangler deploy

wrangler secret put MEDIA_TOKEN_SECRET --env dev
wrangler secret put MEDIA_TOKEN_SECRET_PREV --env dev
wrangler deploy --env dev
```

`MEDIA_TOKEN_SECRET_PREV` is optional and only needed during secret rotation.
