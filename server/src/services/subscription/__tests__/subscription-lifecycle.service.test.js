import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureRequiredEnv } from '../../../__tests__/helpers/env.js';

ensureRequiredEnv();

const subscriptionRepository = (await import('../../../repositories/subscription.repository.js')).default;
const mediaRepository = (await import('../../../repositories/media.repository.js')).default;
const shopRepository = (await import('../../../repositories/shop.repository.js')).default;
const lifecycleService = (await import('../subscription-lifecycle.service.js')).default;
const { PLAN_IDS } = await import('../../../config/subscription.config.js');
const { MEDIA_STATUS } = await import('../../../utils/constants.js');

test('onPlanDowngraded hides newest excess photos first', async (t) => {
    t.mock.method(shopRepository, 'findByBarberId', async () => ({ _id: 'shop-1' }));
    t.mock.method(mediaRepository, 'countActiveGalleryMedia', async (_shopId, mediaType) => (
        mediaType === 'image' ? 12 : 0
    ));
    t.mock.method(mediaRepository, 'findActiveGalleryMedia', async (_shopId, mediaType, options) => {
        assert.equal(mediaType, 'image');
        assert.deepEqual(options, { sort: { createdAt: -1 }, limit: 2 });
        return [{ _id: 'new-photo-1' }, { _id: 'new-photo-2' }];
    });

    let bulkUpdate = null;
    t.mock.method(mediaRepository, 'bulkUpdateStatus', async (ids, status) => {
        bulkUpdate = { ids, status };
        return { modifiedCount: ids.length };
    });

    await lifecycleService.onPlanDowngraded('barber-1', PLAN_IDS.POPULAR, PLAN_IDS.BASIC);

    assert.deepEqual(bulkUpdate, {
        ids: ['new-photo-1', 'new-photo-2'],
        status: MEDIA_STATUS.HIDDEN,
    });
});

test('onPlanUpgraded reactivates oldest hidden videos up to the new limit', async (t) => {
    t.mock.method(shopRepository, 'findByBarberId', async () => ({ _id: 'shop-1' }));
    t.mock.method(mediaRepository, 'countActiveGalleryMedia', async (_shopId, mediaType) => (
        mediaType === 'video' ? 13 : 30
    ));
    t.mock.method(mediaRepository, 'countHiddenGalleryMedia', async (_shopId, mediaType) => (
        mediaType === 'video' ? 4 : 0
    ));
    t.mock.method(mediaRepository, 'findHiddenGalleryMedia', async (_shopId, mediaType, options) => {
        assert.equal(mediaType, 'video');
        assert.deepEqual(options, { sort: { createdAt: 1 }, limit: 2 });
        return [{ _id: 'old-video-1' }, { _id: 'old-video-2' }];
    });

    let bulkUpdate = null;
    t.mock.method(mediaRepository, 'bulkUpdateStatus', async (ids, status) => {
        bulkUpdate = { ids, status };
        return { modifiedCount: ids.length };
    });

    await lifecycleService.onPlanUpgraded('barber-1', PLAN_IDS.POPULAR, PLAN_IDS.ADVANCED);

    assert.deepEqual(bulkUpdate, {
        ids: ['old-video-1', 'old-video-2'],
        status: MEDIA_STATUS.READY,
    });
});

test('onSubscriptionExpired reverts to Basic without resetting lifetime upload counters', async (t) => {
    let update = null;
    t.mock.method(subscriptionRepository, 'updateByBarberId', async (barberId, updates) => {
        update = { barberId, updates };
        return { _id: 'sub-1', barberId, ...updates };
    });
    t.mock.method(shopRepository, 'findByBarberId', async () => null);

    await lifecycleService.onSubscriptionExpired('barber-1');

    assert.equal(update.barberId, 'barber-1');
    assert.equal(update.updates.planId, PLAN_IDS.BASIC);
    assert.equal(update.updates.status, 'EXPIRED');
    assert.equal(Object.hasOwn(update.updates, 'totalPhotosUploaded'), false);
    assert.equal(Object.hasOwn(update.updates, 'totalVideosUploaded'), false);
});
