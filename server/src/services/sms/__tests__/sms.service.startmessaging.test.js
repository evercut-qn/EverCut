import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureRequiredEnv } from '../../../__tests__/helpers/env.js';

ensureRequiredEnv();
process.env.SMS_PROVIDER = 'startmessaging';
process.env.NODE_ENV = 'test'; // keeps StartMessaging in its dev test-mode bypass — no live HTTP calls

const smsService = await import('../sms.service.js');
const otpStore = await import('../otp-store.service.js');

test('sms.service — SMS_PROVIDER=startmessaging', async (t) => {
    t.beforeEach(() => {
        otpStore._clearStoreForTests();
    });

    await t.test('sendOtp populates the local otp-store (StartMessaging owns no OTP state itself)', async () => {
        const result = await smsService.sendOtp('9876543230');
        assert.equal(result.success, true);

        // Because StartMessaging can't verify OTPs itself, sendOtp must have
        // written the OTP into the local store for verifyOtp to find later.
        const localVerify = otpStore.verifyStoredOtp('9876543230', '123456'); // shared test OTP
        assert.equal(localVerify.success, true);
    });

    await t.test('verifyOtp routes to the local otp-store, not MSG91', async () => {
        await smsService.sendOtp('9876543231');

        const success = await smsService.verifyOtp('9876543231', '123456');
        assert.equal(success.success, true);
        // The local otp-store's message never includes MSG91's "(test mode)" suffix.
        assert.doesNotMatch(success.message, /\(test mode\)/);

        // One-time use — verifying again with the same (now-consumed) OTP fails.
        const secondAttempt = await smsService.verifyOtp('9876543231', '123456');
        assert.equal(secondAttempt.success, false);
    });

    await t.test('resendOtp with retryType "voice" is rejected (StartMessaging is SMS-only)', async () => {
        await assert.rejects(
            () => smsService.resendOtp('9876543232', 'voice'),
            /voice otp is not supported/i,
        );
    });

    await t.test('resendOtp with retryType "text" succeeds and reissues the OTP', async () => {
        await smsService.sendOtp('9876543233');
        const result = await smsService.resendOtp('9876543233', 'text');
        assert.equal(result.success, true);

        const verify = await smsService.verifyOtp('9876543233', '123456');
        assert.equal(verify.success, true);
    });
});
