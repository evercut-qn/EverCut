import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import createApp from '../../app.js';
import connectDB, { disconnectDB } from '../../config/database.config.js';
import userRepository from '../../repositories/user.repository.js';
import config from '../../config/index.js';

const generateMockRefreshToken = (userId) => {
    return jwt.sign(
        {
            sub: userId.toString(),
            type: 'refresh',
            jti: 'mock-jti-integration',
            iss: 'evercut-api',
            aud: 'evercut-mobile',
        },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiry }
    );
};

test('POST /auth/token/refresh - integration and serialization contract', async (t) => {
    console.log('Connecting to database...');
    await connectDB();

    const app = createApp();
    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/v1`;

    try {
        // Setup test user
        const testPhone = '+919999999998';
        let user = await userRepository.findByPhone(testPhone);
        if (!user) {
            user = await userRepository.create({
                phoneNumber: testPhone,
                email: 'integration_test@evercut.com',
                roleType: 'CUSTOMER',
            });
        }
        
        await userRepository.updateById(user._id, {
            refreshTokenHash: null,
            previousRefreshTokenHash: null,
            rotatedAt: null,
        });

        // ---------------------------------------------------------------------
        // Test A: Standard Rotation Response
        // ---------------------------------------------------------------------
        const token1 = generateMockRefreshToken(user._id);
        const hash1 = crypto.createHash('sha256').update(token1).digest('hex');
        
        // Setup active session
        await userRepository.updateById(user._id, { refreshTokenHash: hash1 });

        const res1 = await fetch(`${baseUrl}/auth/token/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: token1 }),
        });

        const text1 = await res1.text();
        const payload1 = JSON.parse(text1);

        console.log('\n--- Actual Standard Rotation Response Payload ---');
        console.log(text1);
        console.log('-------------------------------------------------\n');

        assert.equal(res1.status, 200);
        assert.equal(payload1.success, true);
        assert.ok(payload1.data.accessToken);
        assert.ok(payload1.data.refreshToken);
        assert.ok(payload1.data.refreshExpiresIn);
        assert.notEqual(payload1.data.refreshToken, null);
        assert.notEqual(payload1.data.refreshExpiresIn, null);

        // ---------------------------------------------------------------------
        // Test B: Grace-Period Response (Reusing token1, but wait - token1 was rotated to token2)
        // ---------------------------------------------------------------------
        // In the database:
        // - user.refreshTokenHash = hash(token2)
        // - user.previousRefreshTokenHash = hash(token1)
        // - user.rotatedAt = now
        // If we call refresh again with token1, it should match previous and bypass.
        const res2 = await fetch(`${baseUrl}/auth/token/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: token1 }),
        });

        const text2 = await res2.text();
        const payload2 = JSON.parse(text2);

        console.log('\n--- Actual Grace-Period Response Payload ---');
        console.log(text2);
        console.log('--------------------------------------------\n');

        assert.equal(res2.status, 200);
        assert.equal(payload2.success, true);
        assert.ok(payload2.data.accessToken);
        
        // Assert keys are completely omitted
        assert.equal(payload2.data.refreshToken, undefined);
        assert.equal(payload2.data.refreshExpiresIn, undefined);
        
        // Verify key omission in raw response text
        assert.equal(text2.includes('"refreshToken"'), false);
        assert.equal(text2.includes('"refreshExpiresIn"'), false);

    } finally {
        server.close();
        await disconnectDB();
    }
});
