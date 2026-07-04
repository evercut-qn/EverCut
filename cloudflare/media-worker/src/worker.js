const CACHE_CONTROL = {
  image: 'public, max-age=2592000, immutable',
  video: 'public, max-age=86400, immutable',
  playlist: 'public, max-age=300',
  default: 'public, max-age=3600',
};

const PUBLIC_MEDIA_PATH_PREFIXES = ['/images/notifications/'];

const textEncoder = new TextEncoder();

const parseAllowedOrigins = (value = '') => (
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

export const corsHeaders = (request, env) => {
  const origin = request.headers.get('Origin');
  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Length, Content-Range, ETag',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };

  if (!origin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigins[0] || '*';
  } else if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
};

const timingSafeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
};

const toHex = (buffer) => (
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
);

const signPath = async (secret, pathname, expiresAt) => {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    textEncoder.encode(`${pathname}:${expiresAt}`),
  );

  return toHex(signature);
};

const verifyToken = async (url, env) => {
  const expiresAt = Number.parseInt(url.searchParams.get('exp') || '', 10);
  const token = url.searchParams.get('token') || '';

  if (!Number.isFinite(expiresAt) || !token) {
    return { ok: false, status: 401, message: 'Unauthorized - missing media token' };
  }

  if (expiresAt < Math.floor(Date.now() / 1000)) {
    return { ok: false, status: 401, message: 'Unauthorized - expired media token' };
  }

  const expected = await signPath(env.MEDIA_TOKEN_SECRET, url.pathname, expiresAt);
  if (timingSafeEqual(expected, token)) {
    return { ok: true };
  }

  if (env.MEDIA_TOKEN_SECRET_PREV) {
    const previousExpected = await signPath(env.MEDIA_TOKEN_SECRET_PREV, url.pathname, expiresAt);
    if (timingSafeEqual(previousExpected, token)) {
      return { ok: true };
    }
  }

  return { ok: false, status: 401, message: 'Unauthorized - invalid media token' };
};

export const isPublicMediaPath = (pathname) => (
  PUBLIC_MEDIA_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
);

export const parseRange = (rangeHeader, objectSize) => {
  if (!rangeHeader) return undefined;

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return undefined;

  const [, startText, endText] = match;
  if (!startText && !endText) return undefined;

  if (!startText) {
    const suffixLength = Number.parseInt(endText, 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return undefined;
    const offset = Math.max(objectSize - suffixLength, 0);
    return { offset, length: objectSize - offset };
  }

  const start = Number.parseInt(startText, 10);
  const end = endText ? Number.parseInt(endText, 10) : objectSize - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return undefined;
  }

  if (start > end || start >= objectSize) {
    return { unsatisfiable: true };
  }

  return {
    offset: start,
    length: Math.min(end, objectSize - 1) - start + 1,
  };
};

const cacheControlFor = (key, contentType) => {
  if (key.endsWith('.m3u8')) return CACHE_CONTROL.playlist;
  if (key.endsWith('.ts') || contentType.startsWith('video/')) return CACHE_CONTROL.video;
  if (contentType.startsWith('image/')) return CACHE_CONTROL.image;
  return CACHE_CONTROL.default;
};

const cleanCacheUrl = (url) => {
  const copy = new URL(url.toString());
  copy.searchParams.delete('token');
  copy.searchParams.delete('exp');
  return copy.toString();
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const baseCors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: baseCors });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: baseCors,
      });
    }

    if (!isPublicMediaPath(url.pathname)) {
      const tokenResult = await verifyToken(url, env);
      if (!tokenResult.ok) {
        return new Response(tokenResult.message, {
          status: tokenResult.status,
          headers: baseCors,
        });
      }
    }

    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (!key) {
      return new Response('Not Found', { status: 404, headers: baseCors });
    }

    const rangeHeader = request.headers.get('Range');
    const canUseCache = request.method === 'GET' && !rangeHeader;
    const cache = caches.default;
    const cacheKey = new Request(cleanCacheUrl(url), request);

    if (canUseCache) {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    }

    const head = await env.MEDIA_BUCKET.head(key);
    if (!head) {
      return new Response('Not Found', { status: 404, headers: baseCors });
    }

    const range = parseRange(rangeHeader, head.size);
    if (range?.unsatisfiable) {
      return new Response(null, {
        status: 416,
        headers: {
          ...baseCors,
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes */${head.size}`,
        },
      });
    }

    const object = await env.MEDIA_BUCKET.get(key, range ? { range } : undefined);
    if (!object) {
      return new Response('Not Found', { status: 404, headers: baseCors });
    }

    const contentType = object.httpMetadata?.contentType || head.httpMetadata?.contentType || 'application/octet-stream';
    const headers = new Headers({
      ...baseCors,
      'Content-Type': contentType,
      'Cache-Control': cacheControlFor(key, contentType),
      'Accept-Ranges': 'bytes',
      ETag: object.etag || head.etag,
    });

    let status = 200;
    if (range) {
      status = 206;
      const start = range.offset;
      const end = range.offset + range.length - 1;
      headers.set('Content-Range', `bytes ${start}-${end}/${head.size}`);
      headers.set('Content-Length', String(range.length));
    } else {
      headers.set('Content-Length', String(head.size));
    }

    const response = new Response(request.method === 'HEAD' ? null : object.body, {
      status,
      headers,
    });

    if (canUseCache && status === 200) {
      await cache.put(cacheKey, response.clone());
    }

    return response;
  },
};
