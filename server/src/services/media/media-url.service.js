import crypto from 'crypto';
import config from '../../config/index.js';

const normalizeBaseUrl = (value) => value.replace(/\/+$/, '');
const normalizeKey = (value) => String(value || '').replace(/^\/+/, '');

const appendTransformParams = (url, options = {}) => {
    const params = {
        w: options.width,
        h: options.height,
        q: options.quality,
        f: options.format,
    };

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    }
};

export const signMediaPath = (pathname, expiresAtEpochSeconds) => (
    crypto
        .createHmac('sha256', config.r2.mediaTokenSecret)
        .update(`${pathname}:${expiresAtEpochSeconds}`)
        .digest('hex')
);

export const buildMediaUrl = (r2Key, options = {}) => {
    if (!r2Key) return null;

    const key = normalizeKey(r2Key);
    const url = new URL(`${normalizeBaseUrl(config.r2.cdnBaseUrl)}/${key}`);
    appendTransformParams(url, options);

    const ttlSeconds = options.expiresInSeconds ?? config.media.signedUrlTtl;
    const now = options.now instanceof Date ? options.now : new Date();
    const expiresAt = Math.floor((now.getTime() + ttlSeconds * 1000) / 1000);
    url.searchParams.set('exp', String(expiresAt));
    url.searchParams.set('token', signMediaPath(url.pathname, expiresAt));

    return url.toString();
};

export const r2KeyToUrl = (r2Key, options = {}) => buildMediaUrl(r2Key, options);
