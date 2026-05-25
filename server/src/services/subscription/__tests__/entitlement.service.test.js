import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureRequiredEnv } from '../../../__tests__/helpers/env.js';

ensureRequiredEnv();

const subscriptionRepository = (await import('../../../repositories/subscription.repository.js')).default;
const entitlementService = (await import('../entitlement.service.js')).default;
const { PLAN_IDS } = await import('../../../config/subscription.config.js');

test('resolveEntitlements falls back to Basic when no subscription record exists', async (t) => {
    t.mock.method(subscriptionRepository, 'findByBarberId', async () => null);

    const entitlements = await entitlementService.resolveEntitlements('barber-1');

    assert.equal(entitlements.planId, PLAN_IDS.BASIC);
    assert.equal(entitlements.maxPhotos, 10);
    assert.equal(entitlements.remainingPhotos, 10);
    assert.equal(entitlements.badge, 'NONE');
});

test('resolveEntitlements preserves cancelled paid access until currentPeriodEnd', async (t) => {
    t.mock.method(subscriptionRepository, 'findByBarberId', async () => ({
        _id: 'sub-1',
        planId: PLAN_IDS.ADVANCED,
        status: 'CANCELLED',
        currentPeriodEnd: new Date(Date.now() + 60_000),
        totalPhotosUploaded: 12,
        totalVideosUploaded: 3,
        statementsDownloadedThisPeriod: 2,
        cancelAtPeriodEnd: true,
    }));

    const entitlements = await entitlementService.resolveEntitlements('barber-1');

    assert.equal(entitlements.planId, PLAN_IDS.ADVANCED);
    assert.equal(entitlements.maxPhotos, 50);
    assert.equal(entitlements.remainingPhotos, 38);
    assert.equal(entitlements.cancelAtPeriodEnd, true);
});

test('expired cancellation only grants Basic entitlements with existing usage preserved', async (t) => {
    t.mock.method(subscriptionRepository, 'findByBarberId', async () => ({
        _id: 'sub-1',
        planId: PLAN_IDS.ADVANCED,
        status: 'CANCELLED',
        currentPeriodEnd: new Date(Date.now() - 60_000),
        totalPhotosUploaded: 14,
        totalVideosUploaded: 1,
        statementsDownloadedThisPeriod: 1,
    }));

    const photoQuota = await entitlementService.canUploadPhoto('barber-1');
    const entitlements = await entitlementService.resolveEntitlements('barber-1');

    assert.equal(entitlements.planId, PLAN_IDS.BASIC);
    assert.equal(entitlements.totalPhotosUploaded, 14);
    assert.equal(entitlements.remainingPhotos, 0);
    assert.deepEqual(photoQuota, {
        allowed: false,
        current: 14,
        limit: 10,
        remaining: 0,
    });
});

test('canDownloadStatement enforces the per-cycle counter', async (t) => {
    t.mock.method(subscriptionRepository, 'findByBarberId', async () => ({
        _id: 'sub-1',
        planId: PLAN_IDS.POPULAR,
        status: 'ACTIVE',
        statementsDownloadedThisPeriod: 5,
    }));

    const quota = await entitlementService.canDownloadStatement('barber-1');

    assert.equal(quota.allowed, false);
    assert.equal(quota.current, 5);
    assert.equal(quota.limit, 5);
});
