import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureRequiredEnv } from '../../../__tests__/helpers/env.js';

ensureRequiredEnv();

const {
    getAllPlans,
    getPlan,
    getPlanCapabilities,
    resolveRazorpayPlanId,
    validatePlanTransition,
    isRazorpayPlanExplicitlyConfigured,
    PLAN_IDS,
} = await import('../../../config/subscription.config.js');

test('subscription config exposes Basic, Popular, and Advanced in display order', () => {
    const plans = getAllPlans();

    assert.deepEqual(plans.map((plan) => plan.id), [
        PLAN_IDS.BASIC,
        PLAN_IDS.POPULAR,
        PLAN_IDS.ADVANCED,
    ]);
    assert.equal(getPlan(PLAN_IDS.BASIC).isFree, true);
    assert.equal(getPlan(PLAN_IDS.POPULAR).pricing.amount, 29900);
    assert.equal(getPlan(PLAN_IDS.ADVANCED).pricing.amount, 49900);
});

test('plan capabilities match the subscription contract', () => {
    assert.deepEqual(getPlanCapabilities(PLAN_IDS.BASIC), {
        maxPhotos: 10,
        maxVideos: 2,
        maxStatementsPerCycle: 1,
        badge: 'NONE',
        visibilityTier: 'NONE',
        supportTier: 'STANDARD',
        priorityListingBoost: 0,
        analyticsAccess: false,
        promotionalTools: false,
    });

    assert.equal(getPlanCapabilities(PLAN_IDS.POPULAR).badge, 'BLUE');
    assert.equal(getPlanCapabilities(PLAN_IDS.ADVANCED).visibilityTier, 'PRIORITY');
});

test('Razorpay plan ids resolve back to internal plan ids', () => {
    assert.equal(resolveRazorpayPlanId('plan_test_popular'), PLAN_IDS.POPULAR);
    assert.equal(resolveRazorpayPlanId('plan_test_advanced'), PLAN_IDS.ADVANCED);
    assert.equal(resolveRazorpayPlanId('plan_unknown'), null);
    assert.equal(isRazorpayPlanExplicitlyConfigured(PLAN_IDS.POPULAR), true);
    assert.equal(isRazorpayPlanExplicitlyConfigured(PLAN_IDS.ADVANCED), true);
});

test('plan transitions classify upgrades, downgrades, and same-plan attempts', () => {
    assert.deepEqual(validatePlanTransition(PLAN_IDS.BASIC, PLAN_IDS.POPULAR), {
        valid: true,
        type: 'UPGRADE',
    });
    assert.deepEqual(validatePlanTransition(PLAN_IDS.ADVANCED, PLAN_IDS.POPULAR), {
        valid: true,
        type: 'DOWNGRADE',
    });
    assert.equal(validatePlanTransition(PLAN_IDS.POPULAR, PLAN_IDS.POPULAR).valid, false);
});
