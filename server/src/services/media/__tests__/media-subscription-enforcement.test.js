import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureRequiredEnv } from '../../../__tests__/helpers/env.js';

ensureRequiredEnv();

const mediaRepository = (await import('../../../repositories/media.repository.js')).default;
const barberRepository = (await import('../../../repositories/barber.repository.js')).default;
const subscriptionRepository = (await import('../../../repositories/subscription.repository.js')).default;
const storageProvider = (await import('../storage-provider.service.js')).default;
const mediaService = await import('../media.service.js');
const { PLAN_IDS } = await import('../../../config/subscription.config.js');
const { MEDIA_STATUS } = await import('../../../utils/constants.js');

test('confirmUpload increments photo counter and hides the uploaded media on quota race overflow', async (t) => {
    t.mock.method(mediaRepository, 'findByIdAndUser', async () => ({
        _id: 'media-1',
        userId: 'user-1',
        r2Key: 'images/gallery/user-1/media-1.jpg',
        contentType: 'image/jpeg',
        declaredSize: 1024,
        type: 'image',
        purpose: 'gallery',
    }));
    t.mock.method(storageProvider, 'headObject', async () => ({
        ContentType: 'image/jpeg',
        ContentLength: 1024,
    }));
    t.mock.method(storageProvider, 'getObjectRange', async () => Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    t.mock.method(barberRepository, 'findByUserId', async () => ({ _id: 'barber-1' }));
    t.mock.method(subscriptionRepository, 'findByBarberId', async () => ({
        _id: 'sub-1',
        barberId: 'barber-1',
        planId: PLAN_IDS.BASIC,
        status: 'ACTIVE',
        totalPhotosUploaded: 9,
    }));
    t.mock.method(subscriptionRepository, 'incrementPhotoCounter', async () => ({
        _id: 'sub-1',
        barberId: 'barber-1',
        planId: PLAN_IDS.BASIC,
        status: 'ACTIVE',
        totalPhotosUploaded: 11,
    }));

    const updates = [];
    t.mock.method(mediaRepository, 'updateById', async (id, update) => {
        updates.push({ id, update });
        return {
            _id: id,
            r2Key: 'images/gallery/user-1/media-1.jpg',
            contentType: 'image/jpeg',
            actualSize: 1024,
            ...update,
        };
    });

    const result = await mediaService.confirmUpload('user-1', 'media-1');

    assert.equal(result.hiddenBySubscriptionLimit, true);
    assert.equal(updates.at(-1).update.status, MEDIA_STATUS.HIDDEN);
});
