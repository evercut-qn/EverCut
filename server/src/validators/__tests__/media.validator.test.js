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

const { uploadUrlSchema } = await import('../media.validator.js');

test('uploadUrlSchema accepts notification image uploads', () => {
    const { error, value } = uploadUrlSchema.validate({
        contentType: 'image/png',
        sizeBytes: 1024,
        purpose: 'notification',
    });

    assert.equal(error, undefined);
    assert.equal(value.purpose, 'notification');
});
