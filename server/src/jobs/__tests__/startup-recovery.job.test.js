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

const Notification = (await import('../../models/notification.model.js')).default;
const { NotificationRecipient, NotificationAuditLog } = await import('../../models/notification.model.js');
const { runStartupRecoveryScan } = await import('../startup-recovery.job.js');

test('runStartupRecoveryScan does nothing if no stuck broadcasts exist', async (t) => {
    t.mock.method(Notification, 'find', async () => {
        return [];
    });

    // Should not throw or crash
    await runStartupRecoveryScan();
});

test('runStartupRecoveryScan recovers stuck broadcasts with recipient context', async (t) => {
    const mockBroadcastId = '507f1f77bcf86cd799439090';
    const mockBroadcast = {
        _id: mockBroadcastId,
        status: 'sending',
        sentAt: new Date(Date.now() - 10 * 60 * 1000)
    };

    t.mock.method(Notification, 'find', async () => {
        return [mockBroadcast];
    });

    let countCallIndex = 0;
    t.mock.method(NotificationRecipient, 'countDocuments', async (query) => {
        countCallIndex++;
        assert.equal(String(query.notificationId), mockBroadcastId);
        if (countCallIndex === 1) {
            // total count
            return 100;
        } else {
            // processed count (processedAt: { $ne: null })
            return 80;
        }
    });

    let updatedSet = null;
    t.mock.method(Notification, 'findByIdAndUpdate', async (id, update) => {
        assert.equal(String(id), mockBroadcastId);
        updatedSet = update.$set;
        return {
            _id: mockBroadcastId,
            status: updatedSet.status,
            failureReason: updatedSet.failureReason
        };
    });

    let createdAudit = null;
    t.mock.method(NotificationAuditLog, 'create', async (log) => {
        createdAudit = log;
        return { _id: 'audit-id' };
    });

    await runStartupRecoveryScan();

    assert.equal(updatedSet.status, 'failed');
    assert.equal(
        updatedSet.failureReason,
        'Server restarted during dispatch. Processed 80 of 100 recipients. 20 remaining.'
    );
    assert.equal(createdAudit.action, 'delivery.completed');
    assert.equal(createdAudit.resourceId, mockBroadcastId);
    assert.equal(createdAudit.metadata.totalRecipients, 100);
    assert.equal(createdAudit.metadata.processedRecipients, 80);
    assert.equal(createdAudit.metadata.remainingRecipients, 20);
});

test('runStartupRecoveryScan recovers stuck broadcasts with no recipients created yet', async (t) => {
    const mockBroadcastId = '507f1f77bcf86cd799439091';
    const mockBroadcast = {
        _id: mockBroadcastId,
        status: 'sending',
        sentAt: new Date(Date.now() - 10 * 60 * 1000)
    };

    t.mock.method(Notification, 'find', async () => {
        return [mockBroadcast];
    });

    t.mock.method(NotificationRecipient, 'countDocuments', async () => {
        return 0; // No recipients
    });

    let updatedSet = null;
    t.mock.method(Notification, 'findByIdAndUpdate', async (id, update) => {
        assert.equal(String(id), mockBroadcastId);
        updatedSet = update.$set;
        return {
            _id: mockBroadcastId,
            status: updatedSet.status,
            failureReason: updatedSet.failureReason
        };
    });

    t.mock.method(NotificationAuditLog, 'create', async () => {
        return { _id: 'audit-id' };
    });

    await runStartupRecoveryScan();

    assert.equal(updatedSet.status, 'failed');
    assert.equal(
        updatedSet.failureReason,
        'Server restarted during dispatch before recipients were created.'
    );
});
