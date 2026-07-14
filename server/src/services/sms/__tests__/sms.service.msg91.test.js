import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureRequiredEnv } from '../../../__tests__/helpers/env.js';

ensureRequiredEnv();
process.env.SMS_PROVIDER = 'msg91';
process.env.NODE_ENV = 'test'; // keeps MSG91 in its dev test-mode bypass — no live HTTP calls

const smsService = await import('../sms.service.js');
const otpStore = await import('../otp-store.service.js');

test('sms.service — SMS_PROVIDER=msg91', async (t) => {
    t.beforeEach(() => {
        otpStore._clearStoreForTests();
    });

    await t.test('verifyOtp routes to MSG91 (remote-style verify), not the local otp-store', async () => {
        // MSG91's own test-mode bypass accepts msg91.testOtp ('123456') and returns
        // a distinctive "(test mode)" message — the local otp-store never
        // produces this message shape, so this proves routing.
        const success = await smsService.verifyOtp('9876543220', '123456');
        assert.equal(success.success, true);
        assert.match(success.message, /\(test mode\)/);

        const failure = await smsService.verifyOtp('9876543220', '000000');
        assert.equal(failure.success, false);
        assert.match(failure.message, /\(test mode\)/);
    });

    await t.test('sendOtp does not populate the local otp-store (MSG91 owns OTP state remotely)', async () => {
        const result = await smsService.sendOtp('9876543221');
        assert.equal(result.success, true);

        // If sms.service had (incorrectly) routed through the local otp-store,
        // a verify against it with the shared test OTP would succeed. It must not.
        const localVerify = otpStore.verifyStoredOtp('9876543221', '123456');
        assert.equal(localVerify.success, false);
    });

    await t.test('resendOtp with retryType "voice" succeeds (MSG91 supports voice retries)', async () => {
        const result = await smsService.resendOtp('9876543222', 'voice');
        assert.equal(result.success, true);
    });
});
