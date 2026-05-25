import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configModuleUrl = pathToFileURL(
    path.resolve(__dirname, '../index.js'),
).href;

const loadFreshConfig = async () => {
    const cacheBuster = `${Date.now()}-${Math.random()}`;
    const module = await import(`${configModuleUrl}?test=${cacheBuster}`);
    return module.default;
};

const applyRequiredEnv = () => {
    const defaults = {
        MONGODB_URI: 'mongodb://localhost:27017/evercut-test',
        FIREBASE_PROJECT_ID: 'evercut-test',
        FIREBASE_CLIENT_EMAIL: 'firebase@example.com',
        FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
        CF_ACCOUNT_ID: 'test-account',
        R2_ACCESS_KEY_ID: 'test-access-key',
        R2_SECRET_ACCESS_KEY: 'test-secret-key',
        R2_BUCKET: 'evercut-media-test',
        CDN_BASE_URL: 'https://media.evercut.test',
        MEDIA_TOKEN_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        MSG91_AUTH_KEY: 'msg91-auth',
        MSG91_OTP_TEMPLATE_ID: 'msg91-template',
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ONBOARDING_SECRET: 'onboarding-secret',
    };

    for (const [key, value] of Object.entries(defaults)) {
        process.env[key] = value;
    }
};

test('payment config defaults expose native PhonePe SDK auth URLs without redirect settings', async () => {
    const originalEnv = { ...process.env };

    try {
        applyRequiredEnv();
        process.env.NODE_ENV = 'development';
        process.env.PORT = '';
        process.env.PHONEPE_ENV = 'SANDBOX';

        const config = await loadFreshConfig();

        assert.equal(config.port, 5000);
        assert.equal(typeof config.payment.platformFeeSingle, 'number');
        assert.equal(typeof config.payment.platformFeeBundle, 'number');
        assert.equal(typeof config.payment.refundFeeSingle, 'number');
        assert.equal(typeof config.payment.refundFeeBundle, 'number');
        assert.equal(typeof config.payment.minSingleServiceAmount, 'number');
        assert.equal(typeof config.payment.minBundleServiceAmount, 'number');
        assert.equal(typeof config.payment.feeWaiverQuota, 'number');
        assert.equal(Object.hasOwn(config.payment, 'platformFeeRules'), false);
        assert.equal(Object.hasOwn(config.payment, 'minimumServiceAmount'), false);
        assert.equal(
            config.phonepe.authUrl,
            'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
        );
        assert.equal(Object.hasOwn(config.payment, 'redirectBaseUrl'), false);
    } finally {
        for (const key of Object.keys(process.env)) {
            if (!(key in originalEnv)) {
                delete process.env[key];
            }
        }

        Object.assign(process.env, originalEnv);
    }
});
