import assert from 'node:assert/strict';
import test from 'node:test';

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

const { validateMagicBytes } = await import('../media-validation.service.js');

test('validateMagicBytes accepts image content that matches declared MIME type', () => {
    assert.equal(validateMagicBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'), true);
    assert.equal(validateMagicBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'), true);
    assert.equal(validateMagicBytes(Buffer.from('RIFFxxxxWEBP', 'ascii'), 'image/webp'), true);
});

test('validateMagicBytes rejects mismatched content and unknown image types', () => {
    assert.equal(validateMagicBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'image/jpeg'), false);
    assert.equal(validateMagicBytes(Buffer.from([0x47, 0x49, 0x46, 0x38]), 'image/gif'), false);
    assert.equal(validateMagicBytes(Buffer.from('plain text'), 'image/png'), false);
});
