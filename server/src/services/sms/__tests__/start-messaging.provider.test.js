import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureRequiredEnv } from '../../../__tests__/helpers/env.js';

ensureRequiredEnv();
// Force NODE_ENV='production' so config.otp.testMode is false and the provider
// actually exercises its live fetch path — otherwise send/resend would bypass
// the network entirely (which is the correct, desired dev-safety behavior,
// but not what this file is testing). All other required env vars are
// already supplied by ensureRequiredEnv(), so this is safe in isolation.
process.env.NODE_ENV = 'production';
process.env.OTP_TEST_MODE = 'false';

const otpStore = await import('../otp-store.service.js');
const provider = await import('../providers/start-messaging.provider.js');
const startMessagingConfig = (await import('../../../config/start-messaging.config.js')).default;

const withMockedFetch = async (handler, fn) => {
    const realFetch = globalThis.fetch;
    const calls = [];

    globalThis.fetch = async (url, options) => {
        calls.push({ url, options });
        return handler(url, options);
    };

    try {
        await fn(calls);
    } finally {
        globalThis.fetch = realFetch;
    }
};

const jsonResponse = (body, ok = true) => ({
    ok,
    json: async () => body,
});

test('start-messaging.provider', async (t) => {
    t.beforeEach(() => {
        otpStore._clearStoreForTests();
    });

    await t.test('sendOtp sends X-API-Key header and E.164 phone + otp variable', async () => {
        await withMockedFetch(
            () => jsonResponse({ requestId: 'req-123' }),
            async (calls) => {
                const result = await provider.sendOtp('9876543210');

                assert.equal(result.success, true);
                assert.equal(result.requestId, 'req-123');
                assert.equal(calls.length, 1);

                const { url, options } = calls[0];
                assert.equal(url, startMessagingConfig.endpoints.sendSms);
                assert.equal(options.headers['X-API-Key'], startMessagingConfig.apiKey);

                const body = JSON.parse(options.body);
                assert.equal(body.phoneNumber, '+919876543210');
                assert.equal(typeof body.variables.otp, 'string');
                assert.equal(body.variables.otp.length, 6);
            },
        );
    });

    await t.test('sendOtp returns success:false when the API responds not-ok', async () => {
        await withMockedFetch(
            () => jsonResponse({ status: 'rejected' }, false),
            async () => {
                const result = await provider.sendOtp('9876543211');
                assert.equal(result.success, false);
                assert.equal(result.requestId, null);
            },
        );
    });

    await t.test('resendOtp rejects retryType "voice" without calling fetch', async () => {
        await withMockedFetch(
            () => jsonResponse({}),
            async (calls) => {
                await assert.rejects(
                    () => provider.resendOtp('9876543212', 'voice'),
                    /voice otp is not supported/i,
                );
                assert.equal(calls.length, 0);
            },
        );
    });

    await t.test('resendOtp sends a new SMS for retryType "text"', async () => {
        await withMockedFetch(
            () => jsonResponse({ messageId: 'msg-456' }),
            async (calls) => {
                const result = await provider.resendOtp('9876543213', 'text');
                assert.equal(result.success, true);
                assert.equal(calls.length, 1);
            },
        );
    });

    await t.test('never logs the StartMessaging API key value', async () => {
        const logger = (await import('../../../utils/logger.js')).default;
        const logCalls = [];
        const methods = ['debug', 'info', 'warn', 'error'];
        const originals = methods.map((method) => [method, logger[method]]);

        methods.forEach((method) => {
            logger[method] = (...args) => logCalls.push(args);
        });

        try {
            await withMockedFetch(
                () => jsonResponse({ requestId: 'req-789' }),
                async () => {
                    await provider.sendOtp('9876543214');
                },
            );
        } finally {
            originals.forEach(([method, original]) => {
                logger[method] = original;
            });
        }

        const serializedLogs = JSON.stringify(logCalls);
        assert.equal(serializedLogs.includes(startMessagingConfig.apiKey), false);
    });
});
