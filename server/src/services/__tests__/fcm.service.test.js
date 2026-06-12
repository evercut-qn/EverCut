import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildMulticastMessage,
    chunkTokens,
    classifyFirebaseMessagingError,
    normalizeFcmData,
    normalizeMulticastResponse,
} from '../notifications/fcm.service.js';

test('normalizeFcmData converts primitive values to strings and removes nullish values', () => {
    assert.deepEqual(normalizeFcmData({
        a: 'x',
        b: 3,
        c: true,
        d: null,
        e: undefined,
        f: { nested: true },
    }), {
        a: 'x',
        b: '3',
        c: 'true',
        f: '{"nested":true}',
    });
});

test('normalizeFcmData rejects reserved Firebase data keys', () => {
    assert.throws(
        () => normalizeFcmData({ 'google.notification': 'bad' }),
        /reserved/i,
    );
});

test('chunkTokens returns unique non-empty token chunks capped at 500', () => {
    const tokens = ['a', '', null, 'b', 'a', ...Array.from({ length: 501 }, (_, index) => `t-${index}`)];
    const chunks = chunkTokens(tokens);

    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].length, 500);
    assert.equal(chunks[1].length, 3);
    assert.deepEqual(chunks[0].slice(0, 2), ['a', 'b']);
});

test('buildMulticastMessage builds visible hybrid payloads with platform options', () => {
    const message = buildMulticastMessage({
        tokens: ['token-1'],
        payload: {
            id: 'notification-1',
            type: 'hybrid',
            eventType: 'system.alert',
            title: 'Title',
            body: 'Body',
            data: { requiresFetch: true },
        },
    });

    assert.deepEqual(message.tokens, ['token-1']);
    assert.deepEqual(message.notification, { title: 'Title', body: 'Body' });
    assert.equal(message.data.requiresFetch, 'true');
    assert.equal(message.android.notification.channelId, 'evercut_default');
    assert.equal(message.apns.headers['apns-priority'], '10');
});

test('buildMulticastMessage builds silent data-only payloads without notification body', () => {
    const message = buildMulticastMessage({
        tokens: ['token-1'],
        payload: {
            id: 'notification-1',
            type: 'silent',
            eventType: 'account.updated',
            data: { requiresFetch: true },
        },
    });

    assert.equal(message.notification, undefined);
    assert.equal(message.android.notification, undefined);
    assert.equal(message.apns.headers['apns-priority'], '5');
    assert.equal(message.data.requiresFetch, 'true');
});

test('classifyFirebaseMessagingError identifies invalid token errors', () => {
    const result = classifyFirebaseMessagingError({
        code: 'messaging/registration-token-not-registered',
        message: 'gone',
    });

    assert.deepEqual(result, {
        code: 'messaging/registration-token-not-registered',
        message: 'gone',
        invalidToken: true,
        retryable: false,
    });
});

test('classifyFirebaseMessagingError identifies retryable transient errors', () => {
    const result = classifyFirebaseMessagingError({
        code: 'messaging/server-unavailable',
        message: 'try later',
    });

    assert.equal(result.invalidToken, false);
    assert.equal(result.retryable, true);
});

test('normalizeMulticastResponse maps Firebase responses back to input tokens', () => {
    const result = normalizeMulticastResponse({
        successCount: 1,
        failureCount: 1,
        responses: [
            { success: true, messageId: 'message-1' },
            {
                success: false,
                error: {
                    code: 'messaging/registration-token-not-registered',
                    message: 'gone',
                },
            },
        ],
    }, ['token-a', 'token-b']);

    assert.equal(result.successCount, 1);
    assert.equal(result.failureCount, 1);
    assert.deepEqual(result.invalidTokens, ['token-b']);
    assert.deepEqual(result.successes, [{ token: 'token-a', messageId: 'message-1' }]);
    assert.equal(result.failures[0].token, 'token-b');
    assert.equal(result.failures[0].invalidToken, true);
});

test('sendMulticast retries on retryable errors and aggregates final outcomes', async (t) => {
    const firebaseAdmin = (await import('../../config/firebase.config.js')).default;
    const { sendMulticast } = await import('../notifications/fcm.service.js');

    let calls = 0;
    Object.defineProperty(firebaseAdmin, 'messaging', {
        value: () => ({
            sendEachForMulticast: async () => {
                calls += 1;
                if (calls === 1) {
                    return {
                        successCount: 0,
                        failureCount: 1,
                        responses: [{
                            success: false,
                            error: { code: 'messaging/server-unavailable', message: 'unavailable' }
                        }]
                    };
                }
                return {
                    successCount: 1,
                    failureCount: 0,
                    responses: [{ success: true, messageId: 'retry-success-id' }]
                };
            }
        }),
        configurable: true
    });

    t.after(() => {
        delete firebaseAdmin.messaging;
    });

    const result = await sendMulticast({
        tokens: ['test-token'],
        payload: { type: 'silent' },
        maxAttempts: 2
    });

    assert.equal(calls, 2);
    assert.equal(result.successCount, 1);
    assert.equal(result.failureCount, 0);
    assert.deepEqual(result.successes, [{ token: 'test-token', messageId: 'retry-success-id' }]);
});

test('sendMulticast stops retrying after maxAttempts is reached', async (t) => {
    const firebaseAdmin = (await import('../../config/firebase.config.js')).default;
    const { sendMulticast } = await import('../notifications/fcm.service.js');

    let calls = 0;
    Object.defineProperty(firebaseAdmin, 'messaging', {
        value: () => ({
            sendEachForMulticast: async () => {
                calls += 1;
                return {
                    successCount: 0,
                    failureCount: 1,
                    responses: [{
                        success: false,
                        error: { code: 'messaging/server-unavailable', message: 'unavailable' }
                    }]
                };
            }
        }),
        configurable: true
    });

    t.after(() => {
        delete firebaseAdmin.messaging;
    });

    const result = await sendMulticast({
        tokens: ['test-token'],
        payload: { type: 'silent' },
        maxAttempts: 2
    });

    assert.equal(calls, 2);
    assert.equal(result.successCount, 0);
    assert.equal(result.failureCount, 1);
    assert.equal(result.failures[0].token, 'test-token');
});

test('sendMulticast does not retry on permanent errors', async (t) => {
    const firebaseAdmin = (await import('../../config/firebase.config.js')).default;
    const { sendMulticast } = await import('../notifications/fcm.service.js');

    let calls = 0;
    Object.defineProperty(firebaseAdmin, 'messaging', {
        value: () => ({
            sendEachForMulticast: async () => {
                calls += 1;
                return {
                    successCount: 0,
                    failureCount: 1,
                    responses: [{
                        success: false,
                        error: { code: 'messaging/invalid-registration-token', message: 'invalid' }
                    }]
                };
            }
        }),
        configurable: true
    });

    t.after(() => {
        delete firebaseAdmin.messaging;
    });

    const result = await sendMulticast({
        tokens: ['test-token'],
        payload: { type: 'silent' },
        maxAttempts: 3
    });

    assert.equal(calls, 1);
    assert.equal(result.successCount, 0);
    assert.equal(result.failureCount, 1);
    assert.equal(result.failures[0].token, 'test-token');
});
