import assert from 'node:assert/strict';
import test from 'node:test';

import Notification, {
    NotificationAuditLog,
    InboxNotification,
    NotificationRecipient,
} from '../../models/notification.model.js';
import FcmToken from '../../models/fcm-token.model.js';
import notificationRepository from '../notification.repository.js';
import fcmTokenRepository from '../fcm-token.repository.js';
import { trustQueryOperators } from '../../utils/mongoose-query.utils.js';

test('notificationRepository creates notifications', async (t) => {
    let createArg = null;
    t.mock.method(Notification, 'create', async (payload) => {
        createArg = payload;
        return { _id: 'notification-1', ...payload };
    });

    const result = await notificationRepository.createNotification({
        title: 'Weekend offer',
        createdByUserId: 'admin-1',
    });

    assert.equal(createArg.title, 'Weekend offer');
    assert.equal(createArg.createdByUserId, 'admin-1');
    assert.equal(result._id, 'notification-1');
});

test('notificationRepository lists notifications sorted newest first with pagination', async (t) => {
    const calls = [];
    const query = {
        sort(arg) {
            calls.push(['sort', arg]);
            return this;
        },
        skip(arg) {
            calls.push(['skip', arg]);
            return this;
        },
        limit(arg) {
            calls.push(['limit', arg]);
            return this;
        },
        lean() {
            calls.push(['lean']);
            return ['notification'];
        },
    };
    t.mock.method(Notification, 'find', (filter) => {
        calls.push(['find', filter]);
        return query;
    });

    const result = await notificationRepository.listNotifications({ status: 'sending' }, { skip: 10, limit: 5 });

    assert.deepEqual(result, ['notification']);
    assert.deepEqual(calls, [
        ['find', { status: 'sending' }],
        ['sort', { createdAt: -1 }],
        ['skip', 10],
        ['limit', 5],
        ['lean'],
    ]);
});

test('notificationRepository updates notifications with validators and returnDocument after', async (t) => {
    let updateArgs = null;
    t.mock.method(Notification, 'findByIdAndUpdate', async (...args) => {
        updateArgs = args;
        return { _id: args[0], ...args[1].$set };
    });

    const result = await notificationRepository.updateNotificationById('notification-1', { status: 'sent' });

    assert.equal(result.status, 'sent');
    assert.deepEqual(updateArgs, [
        'notification-1',
        { $set: { status: 'sent' } },
        { returnDocument: 'after', runValidators: true },
    ]);
});

test('notificationRepository atomically claims sending notifications for sending', async (t) => {
    let claimArgs = null;
    t.mock.method(Notification, 'findOneAndUpdate', async (...args) => {
        claimArgs = args;
        return { _id: args[0]._id, status: 'sending', ...args[1].$set };
    });

    const result = await notificationRepository.claimNotificationForSending('notification-1', 'admin-1');

    assert.equal(result.status, 'sending');
    assert.deepEqual(claimArgs[0], trustQueryOperators({
        _id: 'notification-1',
        status: 'sending',
    }));
    assert.equal(claimArgs[1].$set.sentByUserId, 'admin-1');
    assert.deepEqual(claimArgs[2], { returnDocument: 'after', runValidators: true });
});

test('notificationRepository bulk inserts recipients ordered false', async (t) => {
    let insertArgs = null;
    t.mock.method(NotificationRecipient, 'insertMany', async (...args) => {
        insertArgs = args;
        return args[0];
    });

    await notificationRepository.bulkCreateRecipients([{ userId: 'user-1' }]);

    assert.deepEqual(insertArgs, [[{ userId: 'user-1' }], { ordered: false }]);
});

test('notificationRepository creates and lists audit logs by resource', async (t) => {
    let createArg = null;
    t.mock.method(NotificationAuditLog, 'create', async (payload) => {
        createArg = payload;
        return { _id: 'audit-1', ...payload };
    });

    const calls = [];
    const query = {
        sort(arg) {
            calls.push(['sort', arg]);
            return this;
        },
        limit(arg) {
            calls.push(['limit', arg]);
            return this;
        },
        lean() {
            calls.push(['lean']);
            return ['audit'];
        },
    };
    t.mock.method(NotificationAuditLog, 'find', (filter) => {
        calls.push(['find', filter]);
        return query;
    });

    const created = await notificationRepository.createAuditLog({ action: 'notification.created' });
    const list = await notificationRepository.listAuditLogsByResource('Notification', 'notification-1', { limit: 20 });

    assert.equal(created._id, 'audit-1');
    assert.deepEqual(createArg, { action: 'notification.created' });
    assert.deepEqual(list, ['audit']);
    assert.deepEqual(calls, [
        ['find', { resourceType: 'Notification', resourceId: 'notification-1' }],
        ['sort', { createdAt: -1 }],
        ['limit', 20],
        ['lean'],
    ]);
});

test('notificationRepository bulk creates notification-linked inbox notifications ordered false', async (t) => {
    let insertArgs = null;
    t.mock.method(InboxNotification, 'insertMany', async (...args) => {
        insertArgs = args;
        return args[0];
    });

    await notificationRepository.bulkCreateInboxNotifications([{ notificationId: 'notification-1' }]);

    assert.deepEqual(insertArgs, [[{ notificationId: 'notification-1' }], { ordered: false }]);
});

test('notificationRepository counts inbox notifications by broadcast notification ID', async (t) => {
    let countFilter = null;
    t.mock.method(InboxNotification, 'countDocuments', async (filter) => {
        countFilter = filter;
        return 3;
    });

    const result = await notificationRepository.countInboxNotificationsByBroadcastId('notification-1');

    assert.equal(result, 3);
    assert.deepEqual(countFilter, { notificationId: 'notification-1' });
});

test('fcmTokenRepository finds active tokens for users', async (t) => {
    const calls = [];
    const query = {
        sort(arg) {
            calls.push(['sort', arg]);
            return ['token'];
        },
    };
    t.mock.method(FcmToken, 'find', (filter) => {
        calls.push(['find', filter]);
        return query;
    });

    const result = await fcmTokenRepository.findActiveTokensByUserIds(['user-1', 'user-2']);

    assert.deepEqual(result, ['token']);
    assert.equal(calls[0][0], 'find');
    assert.deepEqual(calls[0][1].userId.$in, ['user-1', 'user-2']);
    assert.equal(calls[0][1].revokedAt, null);
    assert.equal(calls[0][1].status, 'active');
    assert.deepEqual(calls[1], ['sort', { lastSeenAt: -1 }]);
});
