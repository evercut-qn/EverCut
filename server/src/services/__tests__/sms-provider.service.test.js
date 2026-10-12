import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.APP_NAME = 'EverCut';
process.env.STARTMESSAGING_API_KEY = 'sm_live_test_key_123';
process.env.STARTMESSAGING_TEMPLATE_ID = 'test_template_id';
process.env.STARTMESSAGING_OTP_EXPIRY_MINUTES = '10';
process.env.SMS_PROVIDER = 'startmessaging';

import '../../__tests__/helpers/env.js';
import config from '../../config/index.js';
import startmessaging from '../../config/startmessaging.config.js';
import * as smsProvider from '../sms-provider.service.js';

test('SMS Provider - helpers', async (t) => {
    await t.test('formats 10-digit number to E.164 (+91...) and extracts 10 digits', () => {
        assert.equal(smsProvider._testing.toE164('9876543210'), '+919876543210');
        assert.equal(smsProvider._testing.toE164('+919876543210'), '+919876543210');
        assert.equal(smsProvider._testing.to10Digits('+919876543210'), '9876543210');
        assert.equal(smsProvider._testing.to10Digits('9876543210'), '9876543210');
    });
});

test('SMS Provider - StartMessaging configuration', async (t) => {
    await t.test('exposes appName and expiry in config', () => {
        assert.equal(config.appName, 'EverCut');
        assert.equal(config.startmessaging.appName, 'EverCut');
        assert.equal(config.startmessaging.otpExpiry, 10);
        assert.equal(startmessaging.endpoints.sendOtp, 'https://api.startmessaging.com/otp/send');
        assert.equal(startmessaging.endpoints.verifyOtp, 'https://api.startmessaging.com/v1/otp/verify');
    });
});

test('SMS Provider - testMode bypass', async (t) => {
    const originalEnv = process.env.STARTMESSAGING_TEST_MODE;
    process.env.STARTMESSAGING_TEST_MODE = 'true';

    try {
        await t.test('sendOtp returns success: true and requestId: test-mode in testMode', async () => {
            const result = await smsProvider.sendOtp('9876543210');
            assert.equal(result.success, true);
            assert.equal(result.requestId, 'test-mode');
        });

        await t.test('verifyOtp returns success: true for testOtp 123456', async () => {
            const result = await smsProvider.verifyOtp('9876543210', '123456');
            assert.equal(result.success, true);
        });

        await t.test('verifyOtp returns success: false for invalid OTP in testMode', async () => {
            const result = await smsProvider.verifyOtp('9876543210', '000000');
            assert.equal(result.success, false);
        });
    } finally {
        if (originalEnv === undefined) {
            delete process.env.STARTMESSAGING_TEST_MODE;
        } else {
            process.env.STARTMESSAGING_TEST_MODE = originalEnv;
        }
    }
});

test('SMS Provider - API payload structure for StartMessaging', async (t) => {
    await t.test('sendOtp sends variables.appName and variables.expiry in POST body', async () => {
        const originalFetch = globalThis.fetch;
        const originalEnvMode = process.env.STARTMESSAGING_TEST_MODE;
        process.env.STARTMESSAGING_TEST_MODE = 'false';

        let capturedUrl = null;
        let capturedOptions = null;

        globalThis.fetch = async (url, options) => {
            capturedUrl = url;
            capturedOptions = options;
            return {
                ok: true,
                status: 201,
                json: async () => ({
                    success: true,
                    statusCode: 201,
                    requestId: 'req_test_12345',
                    data: {
                        otpRequestId: 'otp_req_99999',
                        messageId: 'msg_88888',
                        status: 'queued',
                    },
                }),
            };
        };

        try {
            const sendResult = await smsProvider.sendOtp('9876543210');
            assert.equal(sendResult.success, true);
            assert.equal(sendResult.requestId, 'otp_req_99999');

            assert.equal(capturedUrl, 'https://api.startmessaging.com/otp/send');
            assert.equal(capturedOptions.method, 'POST');
            assert.equal(capturedOptions.headers['X-API-Key'], config.startmessaging.apiKey);
            assert.equal(capturedOptions.headers['Content-Type'], 'application/json');

            const body = JSON.parse(capturedOptions.body);
            assert.equal(body.phoneNumber, '+919876543210');
            assert.equal(body.templateId, config.startmessaging.templateId);
            assert.ok(body.variables, 'variables object must be present');
            assert.match(body.variables.otp, /^\d{6}$/, 'otp must be a 6-digit numeric string');
            assert.equal(body.variables.OTP, body.variables.otp, 'OTP must match otp');
            assert.equal(body.variables.appName, 'EverCut');
            assert.equal(body.variables.expiry, '10');

            // Verify that pending request was cached with generated OTP
            const cached = smsProvider._testing.pendingOtpRequests.get('9876543210');
            assert.ok(cached, 'pending request must be cached');
            assert.equal(cached.otp, body.variables.otp);

            // Test verifyOtp with correct generated code
            const verifyResult = await smsProvider.verifyOtp('9876543210', body.variables.otp);
            assert.equal(verifyResult.success, true);
            assert.equal(smsProvider._testing.pendingOtpRequests.has('9876543210'), false, 'cache deleted on success');
        } finally {
            globalThis.fetch = originalFetch;
            if (originalEnvMode === undefined) {
                delete process.env.STARTMESSAGING_TEST_MODE;
            } else {
                process.env.STARTMESSAGING_TEST_MODE = originalEnvMode;
            }
        }
    });
});
