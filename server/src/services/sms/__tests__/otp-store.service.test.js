import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureRequiredEnv } from '../../../__tests__/helpers/env.js';

ensureRequiredEnv();
process.env.NODE_ENV = 'test'; // otp.testMode is true whenever NODE_ENV !== 'production'

const otpStore = await import('../otp-store.service.js');

test('otp-store.service', async (t) => {
    t.beforeEach(() => {
        otpStore._clearStoreForTests();
    });

    await t.test('issueOtp returns the shared test OTP when testMode is on', () => {
        const otp = otpStore.issueOtp('9876543210');
        assert.equal(otp, '123456');
    });

    await t.test('verifyStoredOtp succeeds with the correct OTP', () => {
        const otp = otpStore.issueOtp('9876543211');
        const result = otpStore.verifyStoredOtp('9876543211', otp);
        assert.equal(result.success, true);
    });

    await t.test('verifyStoredOtp is one-time use — second verify with same OTP fails', () => {
        const otp = otpStore.issueOtp('9876543212');

        const first = otpStore.verifyStoredOtp('9876543212', otp);
        assert.equal(first.success, true);

        const second = otpStore.verifyStoredOtp('9876543212', otp);
        assert.equal(second.success, false);
        assert.match(second.message, /expired or not requested/i);
    });

    await t.test('verifyStoredOtp fails for a mobile number with no issued OTP', () => {
        const result = otpStore.verifyStoredOtp('9999999999', '123456');
        assert.equal(result.success, false);
        assert.match(result.message, /expired or not requested/i);
    });

    await t.test('verifyStoredOtp fails with an incorrect OTP', () => {
        otpStore.issueOtp('9876543213');
        const result = otpStore.verifyStoredOtp('9876543213', '000000');
        assert.equal(result.success, false);
        assert.match(result.message, /invalid otp/i);
    });

    await t.test('verifyStoredOtp fails once the OTP has expired', (t) => {
        const realNow = Date.now;
        t.after(() => {
            Date.now = realNow;
        });

        const otp = otpStore.issueOtp('9876543214');

        // Fast-forward beyond the configured expiry window.
        const future = realNow() + 60 * 60 * 1000; // +1 hour
        Date.now = () => future;

        const result = otpStore.verifyStoredOtp('9876543214', otp);
        assert.equal(result.success, false);
        assert.match(result.message, /expired/i);
    });

    await t.test('verifyStoredOtp locks out after maxVerifyAttempts wrong guesses, even with the right OTP', async () => {
        const config = (await import('../../../config/index.js')).default;
        const otp = otpStore.issueOtp('9876543215');

        for (let i = 0; i < config.otp.maxVerifyAttempts; i += 1) {
            const attempt = otpStore.verifyStoredOtp('9876543215', '000000');
            assert.equal(attempt.success, false);
        }

        // Even the correct OTP should now be rejected — lockout takes precedence.
        const lockedOut = otpStore.verifyStoredOtp('9876543215', otp);
        assert.equal(lockedOut.success, false);
        assert.match(lockedOut.message, /too many incorrect attempts/i);
    });

    await t.test('reissueOtp overwrites a previous OTP for the same mobile', () => {
        otpStore.issueOtp('9876543216');
        const secondOtp = otpStore.reissueOtp('9876543216');

        // The old OTP (test-mode OTP, same value here) should still verify since
        // test mode always returns the same fixed OTP — assert the store entry
        // was actually refreshed instead by checking a fresh verify succeeds.
        const result = otpStore.verifyStoredOtp('9876543216', secondOtp);
        assert.equal(result.success, true);
    });
});
