import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureRequiredEnv } from '../../../__tests__/helpers/env.js';

ensureRequiredEnv();

const barberRepository = (await import('../../../repositories/barber.repository.js')).default;
const subscriptionRepository = (await import('../../../repositories/subscription.repository.js')).default;
const transactionRepository = (await import('../../../repositories/subscription-transaction.repository.js')).default;
const gateway = (await import('../../../adapters/razorpay/razorpay-subscription.adapter.js')).default;
const lifecycleService = (await import('../subscription-lifecycle.service.js')).default;
const subscriptionService = (await import('../subscription.service.js')).default;
const { PLAN_IDS } = await import('../../../config/subscription.config.js');

test('subscribeUser creates a Razorpay customer and local pending subscription from Basic', async (t) => {
    t.mock.method(barberRepository, 'findByUserId', async () => ({
        _id: 'barber-1',
        firstName: 'Asha',
        lastName: 'Rao',
    }));
    t.mock.method(subscriptionRepository, 'findByBarberId', async () => ({
        _id: 'local-sub-1',
        barberId: 'barber-1',
        planId: PLAN_IDS.BASIC,
        status: 'ACTIVE',
        razorpayCustomerId: null,
        isPaid: () => false,
        isEntitled: () => true,
    }));

    t.mock.method(gateway, 'createCustomer', async (payload) => {
        assert.equal(payload.name, 'Asha Rao');
        assert.equal(payload.contact, '9876543211');
        return { id: 'cust_test_1' };
    });
    t.mock.method(gateway, 'createSubscription', async (payload) => {
        assert.equal(payload.planId, 'plan_test_popular');
        assert.equal(payload.customerId, 'cust_test_1');
        assert.equal(payload.notes.barber_id, 'barber-1');
        return { id: 'sub_test_1', short_url: 'https://rzp.io/i/test' };
    });
    t.mock.method(gateway, 'getKeyId', () => 'rzp_test_key');

    let update = null;
    t.mock.method(subscriptionRepository, 'updateById', async (id, updates) => {
        update = { id, updates };
        return { _id: id, barberId: 'barber-1', ...updates };
    });

    let transaction = null;
    t.mock.method(transactionRepository, 'create', async (payload) => {
        transaction = payload;
        return { _id: 'txn-1', ...payload };
    });

    const result = await subscriptionService.subscribeUser(
        { _id: 'user-1', phoneNumber: '9876543211', email: 'asha@example.com' },
        PLAN_IDS.POPULAR,
    );

    assert.equal(result.checkoutUrl, 'https://rzp.io/i/test');
    assert.equal(update.updates.status, 'PENDING_PAYMENT');
    assert.equal(update.updates.razorpaySubscriptionId, 'sub_test_1');
    assert.equal(transaction.type, 'CREATION');
    assert.equal(transaction.status, 'PENDING');
});

test('downgradeSubscription schedules paid downgrade without changing current plan immediately', async (t) => {
    t.mock.method(subscriptionRepository, 'findByBarberId', async () => ({
        _id: 'local-sub-1',
        barberId: 'barber-1',
        planId: PLAN_IDS.ADVANCED,
        status: 'ACTIVE',
        currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
    }));

    let update = null;
    t.mock.method(subscriptionRepository, 'updateById', async (id, updates) => {
        update = { id, updates };
        return { _id: id, barberId: 'barber-1', planId: PLAN_IDS.ADVANCED, ...updates };
    });
    t.mock.method(transactionRepository, 'create', async (payload) => ({ _id: 'txn-1', ...payload }));

    const result = await subscriptionService.downgradeSubscription('barber-1', PLAN_IDS.POPULAR);

    assert.deepEqual(update, {
        id: 'local-sub-1',
        updates: { pendingPlanId: PLAN_IDS.POPULAR },
    });
    assert.equal(result.planId, PLAN_IDS.ADVANCED);
    assert.equal(result.pendingPlanId, PLAN_IDS.POPULAR);
});

test('upgradeSubscription updates Razorpay, clears pending downgrade, and reactivates media', async (t) => {
    t.mock.method(subscriptionRepository, 'findByBarberId', async () => ({
        _id: 'local-sub-1',
        barberId: 'barber-1',
        planId: PLAN_IDS.POPULAR,
        status: 'ACTIVE',
        razorpaySubscriptionId: 'sub_test_1',
    }));

    let gatewayUpdate = null;
    t.mock.method(gateway, 'updateSubscription', async (subscriptionId, payload) => {
        gatewayUpdate = { subscriptionId, payload };
        return { id: subscriptionId };
    });
    t.mock.method(subscriptionRepository, 'updateById', async (id, updates) => ({
        _id: id,
        barberId: 'barber-1',
        ...updates,
    }));
    t.mock.method(transactionRepository, 'create', async (payload) => ({ _id: 'txn-1', ...payload }));

    let lifecycle = null;
    t.mock.method(lifecycleService, 'onPlanUpgraded', async (barberId, oldPlanId, newPlanId) => {
        lifecycle = { barberId, oldPlanId, newPlanId };
    });

    await subscriptionService.upgradeSubscription('barber-1', PLAN_IDS.ADVANCED);

    assert.deepEqual(gatewayUpdate, {
        subscriptionId: 'sub_test_1',
        payload: { planId: 'plan_test_advanced' },
    });
    assert.deepEqual(lifecycle, {
        barberId: 'barber-1',
        oldPlanId: PLAN_IDS.POPULAR,
        newPlanId: PLAN_IDS.ADVANCED,
    });
});
