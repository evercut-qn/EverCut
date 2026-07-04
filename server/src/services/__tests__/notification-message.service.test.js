import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildFcmPayload,
    buildNotificationMessage,
    buildNotificationData,
    normalizeNotificationData,
    resolveNotificationImageUrl,
} from '../notifications/notification-message.service.js';
import mediaRepository from '../../repositories/media.repository.js';

test('buildNotificationMessage returns only canonical client fields', () => {
    const message = buildNotificationMessage({
        id: 'notification-1',
        title: 'Booking confirmed',
        body: 'Your booking is confirmed.',
        imageUrl: 'https://media.evercut.test/images/notifications/logo.png',
        data: {
            eventType: 'booking.confirmed',
            requiresFetch: true,
        },
        status: 'sent',
        category: 'transactional',
    });

    assert.deepEqual(message, {
        id: 'notification-1',
        title: 'Booking confirmed',
        body: 'Your booking is confirmed.',
        imageUrl: 'https://media.evercut.test/images/notifications/logo.png',
        data: {
            eventType: 'booking.confirmed',
            requiresFetch: true,
        },
    });
});

test('normalizeNotificationData rejects reserved FCM data keys once', () => {
    assert.throws(
        () => normalizeNotificationData({ 'google.notification': 'bad' }),
        /reserved/i,
    );
});

test('normalizeNotificationData rejects exact reserved FCM data keys', () => {
    assert.throws(
        () => normalizeNotificationData({ from: 'firebase-reserved' }),
        /reserved/i,
    );
    assert.throws(
        () => normalizeNotificationData({ message_type: 'firebase-reserved' }),
        /reserved/i,
    );
});

test('buildFcmPayload keeps typed message data but stringifies FCM data values', () => {
    const payload = buildFcmPayload({
        id: 'notification-1',
        title: 'Title',
        body: 'Body',
        imageUrl: 'https://media.evercut.test/images/notifications/logo.png',
        datetime: '2026-07-01T10:06:34.000Z',
        data: {
            requiresFetch: true,
            count: 2,
        },
    });

    assert.equal(payload.message.id, 'notification-1');
    assert.equal(payload.message.imageUrl, 'https://media.evercut.test/images/notifications/logo.png');
    assert.deepEqual(payload.message.data, {
        requiresFetch: true,
        count: 2,
    });
    assert.equal('datetime' in payload.message, false);
    assert.deepEqual(payload.fcmData, {
        id: 'notification-1',
        imageUrl: 'https://media.evercut.test/images/notifications/logo.png',
        requiresFetch: 'true',
        count: '2',
    });
    assert.equal('datetime' in payload.fcmData, false);
});

test('buildNotificationData folds routing fields into the canonical data map', () => {
    assert.deepEqual(buildNotificationData({
        data: {
            route: '/bookings/booking-1',
            eventType: 'caller.value',
        },
        eventType: 'booking.confirmed',
        entityType: 'booking',
        entityId: 'booking-1',
    }), {
        route: '/bookings/booking-1',
        eventType: 'booking.confirmed',
        entityType: 'booking',
        entityId: 'booking-1',
    });
});

test('resolveNotificationImageUrl returns explicit URLs without signing them', async (t) => {
    const mediaLookup = t.mock.method(mediaRepository, 'findById', async () => {
        throw new Error('media lookup should not be needed for explicit URLs');
    });

    const url = await resolveNotificationImageUrl({
        imageUrl: 'https://media.evercut.test/images/notifications/custom.png',
    });

    assert.equal(url, 'https://media.evercut.test/images/notifications/custom.png');
    assert.equal(mediaLookup.mock.callCount(), 0);
});

test('resolveNotificationImageUrl rejects expiring signed URLs', async () => {
    await assert.rejects(
        () => resolveNotificationImageUrl({
            imageUrl: 'https://media.evercut.test/images/notifications/custom.png?exp=123&token=signed',
        }),
        /stable long-lived URL/i,
    );
});

test('resolveNotificationImageUrl resolves notification media to stable Cloudflare URLs', async (t) => {
    t.mock.method(mediaRepository, 'findById', async (id) => ({
        _id: id,
        type: 'image',
        purpose: 'notification',
        status: 'ready',
        r2Key: 'images/notifications/admin-1/logo.png',
    }));

    const url = await resolveNotificationImageUrl({ imageMediaId: 'media-1' });

    assert.match(url, /^https:\/\/.+\/images\/notifications\/admin-1\/logo\.png$/);
    assert.equal(url.includes('exp='), false);
    assert.equal(url.includes('token='), false);
});

test('resolveNotificationImageUrl defaults to the stable system notification image', async () => {
    const url = await resolveNotificationImageUrl();

    assert.match(url, /^https:\/\/.+\/images\/notifications\/system\/evercut\.png$/);
    assert.equal(url.includes('exp='), false);
    assert.equal(url.includes('token='), false);
});

test('resolveNotificationImageUrl rejects media that is not a ready notification image', async (t) => {
    t.mock.method(mediaRepository, 'findById', async (id) => ({
        _id: id,
        type: 'image',
        purpose: 'gallery',
        status: 'pending',
        r2Key: 'images/gallery/admin-1/promo.png',
    }));

    await assert.rejects(
        () => resolveNotificationImageUrl({ imageMediaId: 'media-1' }),
        /ready notification image/i,
    );
});
