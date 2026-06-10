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

const notificationTokenService = (await import('../notifications/notification-token.service.js')).default;
const notificationBroadcastService = (await import('../notifications/notification-broadcast.service.js')).default;
const notificationAudienceService = (await import('../notifications/notification-audience.service.js')).default;
const notificationDispatchService = (await import('../notifications/notification-dispatch.service.js')).default;
const notificationRepository = (await import('../../repositories/notification.repository.js')).default;
const fcmTokenRepository = (await import('../../repositories/fcm-token.repository.js')).default;
const userRepository = (await import('../../repositories/user.repository.js')).default;
const fcmService = (await import('../notifications/fcm.service.js')).default;

test('notification token service registers expanded device metadata without exposing raw token', async (t) => {
    let upsertArgs = null;
    t.mock.method(fcmTokenRepository, 'upsertForUserAndToken', async (userId, payload) => {
        upsertArgs = { userId, payload };
        return {
            _id: 'token-doc-1',
            userId,
            platform: payload.platform,
            deviceId: payload.deviceId,
            status: 'active',
            lastSeenAt: new Date('2026-06-09T00:00:00.000Z'),
        };
    });

    const result = await notificationTokenService.registerToken('user-1', {
        token: 'raw-token',
        platform: 'ios',
        deviceId: 'iphone',
    });

    assert.equal(upsertArgs.payload.token, 'raw-token');
    assert.equal(result.id, 'token-doc-1');
    assert.equal('token' in result, false);
});

test('broadcast service creates notifications and writes audit log', async (t) => {
    t.mock.method(notificationAudienceService, 'resolveAudience', async () => ({
        recipients: [{ userId: 'customer-1', roleType: 'CUSTOMER' }],
        recipientCount: 1,
    }));
    t.mock.method(notificationRepository, 'createNotification', async (payload) => ({
        _id: 'notification-1',
        ...payload,
        status: 'sending',
    }));
    let auditPayload = null;
    t.mock.method(notificationRepository, 'createAuditLog', async (payload) => {
        auditPayload = payload;
        return { _id: 'audit-1', ...payload };
    });

    const result = await notificationBroadcastService.createNotification({
        actorUserId: 'admin-1',
        body: {
            title: 'Weekend offer',
            body: 'Book today.',
            type: 'hybrid',
            category: 'admin_broadcast',
            audience: { mode: 'customers', customerIds: ['customer-1'] },
            data: { route: '/offers' },
        },
    });

    assert.equal(result.id, 'notification-1');
    assert.equal(auditPayload.action, 'notification.created');
    assert.equal(auditPayload.actorUserId, 'admin-1');
});

test('broadcast service returns notification detail and delivery history', async (t) => {
    t.mock.method(notificationRepository, 'findNotificationById', async (id) => ({
        _id: id,
        title: 'Weekend offer',
        body: 'Book today.',
        type: 'hybrid',
        category: 'admin_broadcast',
        status: 'sent',
        audience: { mode: 'all_users' },
        metrics: { recipientCount: 2 },
    }));
    t.mock.method(notificationRepository, 'countRecipientsByNotification', async () => 1);
    t.mock.method(notificationRepository, 'listRecipientsByNotification', async () => [{
        _id: 'recipient-1',
        notificationId: 'notification-1',
        userId: 'user-1',
        roleType: 'CUSTOMER',
        status: 'sent',
        tokenAttempts: [],
    }]);
    t.mock.method(notificationRepository, 'listAuditLogsByResource', async () => [{
        _id: 'audit-1',
        resourceType: 'Notification',
        resourceId: 'notification-1',
        action: 'notification.sent',
    }]);
    t.mock.method(notificationRepository, 'countInboxNotificationsByBroadcastId', async () => 1);
    t.mock.method(notificationRepository, 'listInboxNotificationsByBroadcastId', async () => [{
        _id: 'inbox-notification-1',
        notificationId: 'notification-1',
        recipientUserId: 'user-1',
        title: 'Weekend offer',
        body: 'Book today.',
        type: 'hybrid',
        eventType: 'system.alert',
        status: 'sent',
    }]);

    const detail = await notificationBroadcastService.getNotification('notification-1');
    const recipients = await notificationBroadcastService.listNotificationRecipients('notification-1', { page: 1, limit: 10 });
    const audits = await notificationBroadcastService.listNotificationAuditLogs('notification-1', { limit: 10 });
    const inboxNotifications = await notificationBroadcastService.listInboxNotifications('notification-1', { page: 1, limit: 10 });

    assert.equal(detail.id, 'notification-1');
    assert.equal(detail.displayStatus, 'Completed');
    assert.deepEqual(detail.reporting, { deliveredUsers: 0, failedUsers: 0, offlineUsers: 0 });
    assert.equal(recipients.items[0].id, 'recipient-1');
    assert.equal(audits.items[0].id, 'audit-1');
    assert.equal(inboxNotifications.items[0].id, 'inbox-notification-1');
});

test('audience service resolves role-wide and combined recipients from active users', async (t) => {
    const requestedRoles = [];
    t.mock.method(userRepository, 'findActiveByRoles', async (roles) => {
        requestedRoles.push(roles);
        return [
            { _id: 'customer-user-1', roleType: 'CUSTOMER' },
            { _id: 'barber-user-1', roleType: 'BARBER' },
        ].filter((user) => roles.includes(user.roleType));
    });

    const customers = await notificationAudienceService.resolveAudience({ mode: 'customers' });
    const combined = await notificationAudienceService.resolveAudience({ mode: 'customers_and_barbers' });

    assert.deepEqual(customers.recipients.map((recipient) => recipient.userId), ['customer-user-1']);
    assert.deepEqual(combined.recipients.map((recipient) => recipient.userId), ['customer-user-1', 'barber-user-1']);
    assert.deepEqual(requestedRoles, [['CUSTOMER'], ['CUSTOMER', 'BARBER']]);
});

test('dispatch service records no-token recipients as skipped', async (t) => {
    t.mock.method(notificationRepository, 'claimNotificationForSending', async (notificationId, actorUserId) => ({
        _id: notificationId,
        title: 'Weekend offer',
        body: 'Book today.',
        type: 'hybrid',
        category: 'admin_broadcast',
        status: 'sending',
        payload: {},
        audience: { mode: 'customers' },
    }));
    t.mock.method(notificationAudienceService, 'resolveAudience', async () => ({
        recipients: [{ userId: 'user-1', roleType: 'CUSTOMER' }],
        recipientCount: 1,
    }));
    t.mock.method(notificationRepository, 'bulkCreateRecipients', async (items) => items.map((item, index) => ({
        _id: `recipient-${index + 1}`,
        ...item,
    })));
    t.mock.method(notificationRepository, 'bulkCreateInboxNotifications', async (items) => items.map((item, index) => ({
        _id: `notification-${index + 1}`,
        ...item,
    })));
    t.mock.method(fcmTokenRepository, 'findActiveTokensByUserIds', async () => []);
    const updateCalls = [];
    t.mock.method(notificationRepository, 'updateRecipientById', async (id, updates) => {
        updateCalls.push({ id, updates });
        return { _id: id, ...updates };
    });
    t.mock.method(notificationRepository, 'updateNotificationById', async (id, updates) => ({ _id: id, ...updates }));
    t.mock.method(notificationRepository, 'createAuditLog', async (payload) => ({ _id: 'audit-1', ...payload }));

    const result = await notificationDispatchService.sendNotification('507f1f77bcf86cd799439011', { actorUserId: 'admin-1' });

    assert.equal(result.status, 'sent');
    assert.equal(result.metrics.skippedCount, 1);
    assert.equal(updateCalls[0].updates.status, 'sent');
    assert.equal(updateCalls[0].updates.skippedReason, 'No active FCM tokens');
});

test('dispatch service marks empty resolved audiences as failed', async (t) => {
    t.mock.method(notificationRepository, 'claimNotificationForSending', async (notificationId, actorUserId) => ({
        _id: notificationId,
        title: 'Weekend offer',
        body: 'Book today.',
        type: 'hybrid',
        category: 'admin_broadcast',
        status: 'sending',
        payload: {},
        audience: { mode: 'customers' },
    }));
    t.mock.method(notificationAudienceService, 'resolveAudience', async () => ({
        recipients: [],
        recipientCount: 0,
    }));
    t.mock.method(notificationRepository, 'bulkCreateRecipients', async () => []);
    t.mock.method(notificationRepository, 'bulkCreateInboxNotifications', async () => []);
    t.mock.method(fcmTokenRepository, 'findActiveTokensByUserIds', async () => []);
    t.mock.method(notificationRepository, 'updateNotificationById', async (id, updates) => ({ _id: id, ...updates }));
    t.mock.method(notificationRepository, 'createAuditLog', async (payload) => ({ _id: 'audit-1', ...payload }));

    const result = await notificationDispatchService.sendNotification('507f1f77bcf86cd799439011', { actorUserId: 'admin-1' });

    assert.equal(result.status, 'failed');
    assert.equal(result.metrics.recipientCount, 0);
});

test('dispatch service sends tokens, records attempts, and invalidates stale tokens', async (t) => {
    t.mock.method(notificationRepository, 'claimNotificationForSending', async (notificationId, actorUserId) => ({
        _id: notificationId,
        title: 'Weekend offer',
        body: 'Book today.',
        type: 'hybrid',
        category: 'admin_broadcast',
        status: 'sending',
        payload: {},
        audience: { mode: 'customers' },
    }));
    t.mock.method(notificationAudienceService, 'resolveAudience', async () => ({
        recipients: [{ userId: 'user-1', roleType: 'CUSTOMER' }],
        recipientCount: 1,
    }));
    t.mock.method(notificationRepository, 'bulkCreateRecipients', async (items) => items.map((item) => ({
        _id: 'recipient-1',
        ...item,
    })));
    t.mock.method(notificationRepository, 'bulkCreateInboxNotifications', async (items) => items.map((item) => ({
        _id: 'notification-1',
        ...item,
    })));
    t.mock.method(fcmTokenRepository, 'findActiveTokensByUserIds', async () => [
        { _id: 'token-1', userId: 'user-1', token: 'valid-token', platform: 'android' },
        { _id: 'token-2', userId: 'user-1', token: 'stale-token', platform: 'android' },
    ]);
    t.mock.method(fcmService, 'sendMulticast', async () => ({
        successCount: 1,
        failureCount: 1,
        invalidTokens: ['stale-token'],
        successes: [{ token: 'valid-token', messageId: 'message-1' }],
        failures: [{ token: 'stale-token', code: 'messaging/registration-token-not-registered', message: 'gone', invalidToken: true }],
    }));
    let recipientUpdate = null;
    let invalidated = null;
    t.mock.method(notificationRepository, 'updateRecipientById', async (id, updates) => {
        recipientUpdate = updates;
        return { _id: id, ...updates };
    });
    t.mock.method(fcmTokenRepository, 'markInvalidTokens', async (tokens, reason) => {
        invalidated = { tokens, reason };
        return { modifiedCount: tokens.length };
    });
    t.mock.method(fcmTokenRepository, 'updateLastSuccessfulDelivery', async (tokens) => {
        return { modifiedCount: tokens.length };
    });
    t.mock.method(notificationRepository, 'updateNotificationById', async (id, updates) => ({ _id: id, ...updates }));
    t.mock.method(notificationRepository, 'createAuditLog', async (payload) => ({ _id: 'audit-1', ...payload }));

    const result = await notificationDispatchService.sendNotification('507f1f77bcf86cd799439011', { actorUserId: 'admin-1' });

    assert.equal(result.status, 'sent');
    assert.equal(result.metrics.successCount, 1);
    assert.equal(result.metrics.failureCount, 1);
    assert.equal(result.metrics.invalidTokenCount, 1);
    assert.equal(recipientUpdate.tokenAttempts.length, 2);
    assert.equal(recipientUpdate.tokenAttempts[0].success, true);
    assert.equal(recipientUpdate.tokenAttempts[1].success, false);
    assert.equal(recipientUpdate.tokenAttempts[1].invalidToken, true);
    assert.deepEqual(invalidated.tokens, ['stale-token']);
});
