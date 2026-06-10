import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ALL_NOTIFICATION_AUDIENCE_MODES,
    FCM_TOKEN_STATUS,
    NOTIFICATION_AUDIENCE_MODE,
    NOTIFICATION_STATUS,
    NOTIFICATION_CATEGORY,
} from '../../utils/constants.js';
import {
    adminNotificationCreateSchema,
    adminNotificationListQuerySchema,
    notificationIdParamSchema,
    notificationListQuerySchema,
    registerFcmTokenSchema,
    unregisterFcmTokenSchema,
} from '../notification.validator.js';

test('registerFcmTokenSchema accepts a production mobile token registration payload', () => {
    const { error, value } = registerFcmTokenSchema.validate({
        token: 'fcm-token-a',
        platform: 'android',
        deviceId: 'pixel-8',
        appVersion: '2.4.1',
    });

    assert.equal(error, undefined);
    assert.deepEqual(value, {
        token: 'fcm-token-a',
        platform: 'android',
        deviceId: 'pixel-8',
        appVersion: '2.4.1',
    });
});

test('registerFcmTokenSchema rejects unsupported platforms', () => {
    const { error } = registerFcmTokenSchema.validate({
        token: 'fcm-token-a',
        platform: 'desktop',
        deviceId: 'pixel-8',
    });

    assert.match(error?.message || '', /must be one of/);
});

test('unregisterFcmTokenSchema requires the token owned by the caller', () => {
    const { error, value } = unregisterFcmTokenSchema.validate({
        token: 'fcm-token-a',
    });

    assert.equal(error, undefined);
    assert.deepEqual(value, { token: 'fcm-token-a' });
});

test('notificationListQuerySchema normalizes filters and pagination defaults', () => {
    const { error, value } = notificationListQuerySchema.validate({
        read: 'false',
        type: 'hybrid',
        eventType: 'booking.confirmed',
    });

    assert.equal(error, undefined);
    assert.deepEqual(value, {
        page: 1,
        limit: 20,
        read: false,
        type: 'hybrid',
        eventType: 'booking.confirmed',
    });
});

test('notificationIdParamSchema validates MongoDB ids', () => {
    const { error } = notificationIdParamSchema.validate({
        id: '507f1f77bcf86cd799439011',
    });

    assert.equal(error, undefined);
});

test('notification platform constants expose notification, token, and audience enums', () => {
    assert.equal(NOTIFICATION_STATUS.SENDING, 'sending');
    assert.equal(NOTIFICATION_STATUS.SENT, 'sent');
    assert.equal(NOTIFICATION_STATUS.FAILED, 'failed');
    assert.equal(FCM_TOKEN_STATUS.ACTIVE, 'active');
    assert.deepEqual(ALL_NOTIFICATION_AUDIENCE_MODES, [
        'customers',
        'barbers',
        'customers_and_barbers',
    ]);
});

test('adminNotificationCreateSchema accepts a customer broadcast notification', () => {
    const { error, value } = adminNotificationCreateSchema.validate({
        title: 'Weekend offer',
        body: 'Book your next appointment today.',
        type: 'hybrid',
        category: NOTIFICATION_CATEGORY.ADMIN_BROADCAST,
        audience: {
            mode: NOTIFICATION_AUDIENCE_MODE.CUSTOMERS,
        },
        data: {
            route: '/offers/weekend',
            requiresFetch: true,
        },
    });

    assert.equal(error, undefined);
    assert.equal(value.status, NOTIFICATION_STATUS.SENDING);
    assert.equal(value.audience.mode, 'customers');
    assert.equal(value.data.requiresFetch, true);
});

test('adminNotificationCreateSchema accepts promotional notifications', () => {
    const { error, value } = adminNotificationCreateSchema.validate({
        title: 'Weekend offer',
        body: 'Book your next appointment today.',
        type: 'hybrid',
        category: NOTIFICATION_CATEGORY.PROMOTIONAL,
        audience: {
            mode: NOTIFICATION_AUDIENCE_MODE.CUSTOMERS,
        },
        data: {
            route: '/offers/weekend',
        },
    });

    assert.equal(error, undefined);
    assert.equal(value.category, 'promotional');
});

test('adminNotificationCreateSchema validates audience constraints and rejects reserved FCM data keys', () => {
    const invalidMode = adminNotificationCreateSchema.validate({
        title: 'Weekend offer',
        body: 'Book today.',
        type: 'hybrid',
        category: NOTIFICATION_CATEGORY.ADMIN_BROADCAST,
        audience: { mode: 'explicit' },
    });
    assert.ok(invalidMode.error);

    const invalidCombo = adminNotificationCreateSchema.validate({
        title: 'Weekend offer',
        body: 'Book today.',
        type: 'hybrid',
        category: NOTIFICATION_CATEGORY.ADMIN_BROADCAST,
        audience: {
            mode: NOTIFICATION_AUDIENCE_MODE.CUSTOMERS,
            barberIds: ['507f1f77bcf86cd799439011'],
        },
    });
    assert.match(invalidCombo.error?.message || '', /"audience\.barberIds" is not allowed/);

    const reservedKey = adminNotificationCreateSchema.validate({
        title: 'Weekend offer',
        body: 'Book today.',
        type: 'hybrid',
        category: NOTIFICATION_CATEGORY.ADMIN_BROADCAST,
        audience: {
            mode: NOTIFICATION_AUDIENCE_MODE.CUSTOMERS,
        },
        data: { 'google.notification': 'bad' },
    });

    assert.match(reservedKey.error?.message || '', /reserved/i);
});

test('adminNotificationListQuerySchema normalizes status, category, search, and pagination', () => {
    const { error, value } = adminNotificationListQuerySchema.validate({
        status: 'sending',
        category: 'admin_broadcast',
        search: ' offer ',
        page: '2',
        limit: '10',
    });

    assert.equal(error, undefined);
    assert.deepEqual(value, {
        page: 2,
        limit: 10,
        status: 'sending',
        category: 'admin_broadcast',
        search: 'offer',
    });
});

test('registerFcmTokenSchema rejects extra fields like deviceName', () => {
    const { error } = registerFcmTokenSchema.validate({
        token: 'fcm-token-a',
        platform: 'ios',
        deviceId: 'iphone-15-pro',
        deviceName: 'Mina iPhone',
    });

    assert.match(error?.message || '', /"deviceName" is not allowed/);
});
