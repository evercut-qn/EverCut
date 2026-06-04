import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';

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

const userRepository = (await import('../../repositories/user.repository.js')).default;
const authService = await import('../auth.service.js');

const generateMockRefreshToken = (userId = 'user-1') => {
    return jwt.sign(
        {
            sub: userId,
            type: 'refresh',
            jti: 'mock-jti',
            iss: 'evercut-api',
            aud: 'evercut-mobile',
        },
        'refresh-secret',
        { expiresIn: '180d' }
    );
};

test('refreshAccessToken does standard rotation for matching current token', async (t) => {
    const refreshToken = generateMockRefreshToken('user-1');
    const mockUser = {
        _id: 'user-1',
        roleType: 'CUSTOMER',
        isActive: true,
        refreshTokenHash: authService.hashToken(refreshToken),
        previousRefreshTokenHash: null,
        rotatedAt: null,
    };

    t.mock.method(userRepository, 'findByIdWithRefreshHash', async () => mockUser);
    
    let rotatedData = null;
    t.mock.method(userRepository, 'rotateRefreshToken', async (id, expectedHash, newHash) => {
        rotatedData = {
            previousRefreshTokenHash: expectedHash,
            refreshTokenHash: newHash,
            rotatedAt: new Date(),
        };
        return { _id: id, ...rotatedData };
    });

    const result = await authService.refreshAccessToken(refreshToken);

    assert.ok(result.accessToken);
    assert.ok(result.refreshToken);
    assert.equal(result.tokenType, 'Bearer');
    assert.ok(result.expiresIn);
    assert.ok(result.refreshExpiresIn);

    assert.equal(rotatedData.previousRefreshTokenHash, mockUser.refreshTokenHash);
    assert.ok(rotatedData.refreshTokenHash);
    assert.ok(rotatedData.rotatedAt);
});

test('refreshAccessToken triggers grace period bypass when previous token is sent within window', async (t) => {
    const previousToken = generateMockRefreshToken('user-1');
    const previousHash = authService.hashToken(previousToken);

    const mockUser = {
        _id: 'user-1',
        roleType: 'CUSTOMER',
        isActive: true,
        refreshTokenHash: 'new-refresh-token-hash',
        previousRefreshTokenHash: previousHash,
        rotatedAt: new Date(), // rotated just now (within grace period)
    };

    t.mock.method(userRepository, 'findByIdWithRefreshHash', async () => mockUser);
    
    let updateCalled = false;
    t.mock.method(userRepository, 'updateById', async (id, data) => {
        updateCalled = true;
        return { _id: id, ...data };
    });

    const result = await authService.refreshAccessToken(previousToken);

    assert.ok(result.accessToken);
    assert.equal(result.refreshToken, undefined);
    assert.equal(result.refreshExpiresIn, undefined);
    assert.equal(updateCalled, false); // No db updates during grace period bypass
});

test('refreshAccessToken invalidates session when previous token is sent outside grace window', async (t) => {
    const previousToken = generateMockRefreshToken('user-1');
    const previousHash = authService.hashToken(previousToken);

    const mockUser = {
        _id: 'user-1',
        roleType: 'CUSTOMER',
        isActive: true,
        refreshTokenHash: 'new-refresh-token-hash',
        previousRefreshTokenHash: previousHash,
        rotatedAt: new Date(Date.now() - 35000), // 35 seconds ago (outside 30s grace)
    };

    t.mock.method(userRepository, 'findByIdWithRefreshHash', async () => mockUser);
    
    let updatedData = null;
    t.mock.method(userRepository, 'updateById', async (id, data) => {
        updatedData = data;
        return { _id: id, ...data };
    });

    await assert.rejects(
        authService.refreshAccessToken(previousToken),
        /Session invalidated/i
    );

    assert.equal(updatedData.refreshTokenHash, null);
    assert.equal(updatedData.previousRefreshTokenHash, null);
    assert.equal(updatedData.rotatedAt, null);
});

test('refreshAccessToken invalidates session on complete token mismatch', async (t) => {
    const mockUser = {
        _id: 'user-1',
        roleType: 'CUSTOMER',
        isActive: true,
        refreshTokenHash: authService.hashToken('active-token'),
        previousRefreshTokenHash: 'some-other-hash',
        rotatedAt: new Date(),
    };

    t.mock.method(userRepository, 'findByIdWithRefreshHash', async () => mockUser);
    
    let updatedData = null;
    t.mock.method(userRepository, 'updateById', async (id, data) => {
        updatedData = data;
        return { _id: id, ...data };
    });

    const unrelatedToken = generateMockRefreshToken('user-1');
    await assert.rejects(
        authService.refreshAccessToken(unrelatedToken),
        /Session invalidated/i
    );

    assert.equal(updatedData.refreshTokenHash, null);
    assert.equal(updatedData.previousRefreshTokenHash, null);
    assert.equal(updatedData.rotatedAt, null);
});
