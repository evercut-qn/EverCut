import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import Notification, {
    NotificationAuditLog,
    InboxNotification,
    NotificationRecipient,
} from '../notification.model.js';
import FcmToken from '../fcm-token.model.js';

const objectId = () => new mongoose.Types.ObjectId();

test('notification validates sending admin broadcast metadata', () => {
    const notification = new Notification({
        title: 'Weekend offer',
        body: 'Book today.',
        type: 'hybrid',
        category: 'admin_broadcast',
        status: 'sending',
        createdByUserId: objectId(),
        audience: {
            mode: 'customers',
        },
        payload: {
            route: '/offers/weekend',
        },
    });

    assert.equal(notification.validateSync(), undefined);
});

test('notification has dedupe and status indexes', () => {
    const indexes = Notification.schema.indexes();

    assert.ok(indexes.some(([fields]) => fields.status === 1 && fields.createdAt === -1));
    assert.ok(indexes.some(([fields, options]) => fields.dedupeKey === 1 && options.unique === true));
});

test('notification recipient requires notification and user identity', () => {
    const recipient = new NotificationRecipient({
        notificationId: objectId(),
        userId: objectId(),
        roleType: 'CUSTOMER',
        status: 'sent',
    });

    assert.equal(recipient.validateSync(), undefined);
});

test('notification recipient is unique per notification and user', () => {
    const indexes = NotificationRecipient.schema.indexes();

    assert.ok(indexes.some(([fields, options]) => (
        fields.notificationId === 1
        && fields.userId === 1
        && options.unique === true
    )));
});

test('audit log records actor, action, resource, and metadata', () => {
    const audit = new NotificationAuditLog({
        actorUserId: objectId(),
        action: 'notification.created',
        resourceType: 'Notification',
        resourceId: objectId(),
        metadata: { ip: '127.0.0.1' },
    });

    assert.equal(audit.validateSync(), undefined);
});

test('inbox notification links to notification and recipient while preserving inbox fields', () => {
    const inboxNotification = new InboxNotification({
        notificationId: objectId(),
        recipientId: objectId(),
        recipientUserId: objectId(),
        type: 'hybrid',
        category: 'admin_broadcast',
        eventType: 'system.alert',
        title: 'Weekend offer',
        body: 'Book today.',
    });

    assert.equal(inboxNotification.validateSync(), undefined);
});

test('fcm token stores lifecycle status and device metadata', () => {
    const token = new FcmToken({
        userId: objectId(),
        token: 'fcm-token-a',
        status: 'active',
        platform: 'ios',
        deviceId: 'iphone-15-pro',
        appVersion: '3.0.0',
    });

    assert.equal(token.validateSync(), undefined);
});
