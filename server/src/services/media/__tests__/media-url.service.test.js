import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

const ensureRequiredEnv = () => {
    const defaults = {
        MONGODB_URI: 'mongodb://localhost:27017/evercut-test',
        FIREBASE_PROJECT_ID: 'evercut-test',
        FIREBASE_CLIENT_EMAIL: 'firebase@example.com',
        FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
        MSG91_AUTH_KEY: 'msg91-auth',
        MSG91_OTP_TEMPLATE_ID: 'msg91-template',
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ONBOARDING_SECRET: 'onboarding-secret',
        CF_ACCOUNT_ID: 'test-account',
        R2_ACCESS_KEY_ID: 'test-access-key',
        R2_SECRET_ACCESS_KEY: 'test-secret-key',
        R2_BUCKET: 'evercut-media-test',
        CDN_BASE_URL: 'https://media.evercut.test',
        MEDIA_TOKEN_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    };

    for (const [key, value] of Object.entries(defaults)) {
        process.env[key] ??= value;
    }
};

ensureRequiredEnv();

const mediaUrlModule = await import('../media-url.service.js');
const { buildMediaUrl } = mediaUrlModule;

test('buildMediaUrl returns CDN URL with signed token and transform params', () => {
    const url = new URL(buildMediaUrl('images/gallery/shop-1/photo.jpg', {
        width: 320,
        height: 240,
        quality: 75,
        format: 'webp',
        expiresInSeconds: 600,
        now: new Date('2026-05-12T09:00:00.000Z'),
    }));

    assert.equal(url.origin, 'https://media.evercut.test');
    assert.equal(url.pathname, '/images/gallery/shop-1/photo.jpg');
    assert.equal(url.searchParams.get('w'), '320');
    assert.equal(url.searchParams.get('h'), '240');
    assert.equal(url.searchParams.get('q'), '75');
    assert.equal(url.searchParams.get('f'), 'webp');
    assert.equal(url.searchParams.get('exp'), String(Date.parse('2026-05-12T09:10:00.000Z') / 1000));

    const unsignedPath = '/images/gallery/shop-1/photo.jpg';
    const expectedToken = crypto
        .createHmac('sha256', process.env.MEDIA_TOKEN_SECRET)
        .update(`${unsignedPath}:${url.searchParams.get('exp')}`)
        .digest('hex');
    assert.equal(url.searchParams.get('token'), expectedToken);
});

test('media URL module exposes only R2 URL builders after migration finalization', () => {
    assert.equal('buildLegacyCompatibleUrl' in mediaUrlModule, false);
    assert.equal(buildMediaUrl(null), null);
});
