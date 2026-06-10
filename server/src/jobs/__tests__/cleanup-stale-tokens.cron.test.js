import assert from 'node:assert/strict';
import test from 'node:test';

const ensureRequiredEnv = () => {
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
        PHONEPE_CLIENT_ID: 'phonepe-client',
        PHONEPE_CLIENT_SECRET: 'phonepe-secret',
        PHONEPE_CLIENT_VERSION: '1',
        PHONEPE_MERCHANT_ID: 'merchant-id',
        PHONEPE_WEBHOOK_USERNAME: 'webhook-user',
        PHONEPE_WEBHOOK_PASSWORD: 'webhook-pass',
        CASHFREE_PAYOUT_CLIENT_ID: 'cashfree-client',
        CASHFREE_PAYOUT_CLIENT_SECRET: 'cashfree-secret',
    };

    for (const [key, value] of Object.entries(defaults)) {
        process.env[key] ??= value;
    }
};

ensureRequiredEnv();

const fcmTokenRepository = (await import('../../repositories/fcm-token.repository.js')).default;
const { runCleanupStaleTokensNow } = await import('../cleanup-stale-tokens.cron.js');

test('runCleanupStaleTokensNow returns cleanedCount 0 when no stale tokens exist', async (t) => {
    t.mock.method(fcmTokenRepository, 'findStaleTokens', async (thresholdDate) => {
        assert(thresholdDate instanceof Date);
        return [];
    });

    const result = await runCleanupStaleTokensNow();
    assert.deepEqual(result, { cleanedCount: 0 });
});

test('runCleanupStaleTokensNow invalidates stale tokens when they exist', async (t) => {
    const mockStaleTokens = [
        { token: 'token-1', lastSeenAt: new Date() },
        { token: 'token-2', lastSeenAt: new Date() }
    ];

    t.mock.method(fcmTokenRepository, 'findStaleTokens', async () => {
        return mockStaleTokens;
    });

    let passedTokens = null;
    t.mock.method(fcmTokenRepository, 'markInvalidTokens', async (tokens, reason) => {
        passedTokens = tokens;
        assert.equal(reason, 'Stale token cleanup');
        return { modifiedCount: tokens.length };
    });

    const result = await runCleanupStaleTokensNow();

    assert.deepEqual(result, {
        cleanedCount: 2,
        modifiedCount: 2
    });
    assert.deepEqual(passedTokens, ['token-1', 'token-2']);
});
