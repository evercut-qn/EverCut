import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import { ensureRequiredEnv } from '../../../__tests__/helpers/env.js';

ensureRequiredEnv();

const subscriptionRepository = (await import('../../../repositories/subscription.repository.js')).default;
const transactionRepository = (await import('../../../repositories/subscription-transaction.repository.js')).default;
const lifecycleService = (await import('../subscription-lifecycle.service.js')).default;
const webhookService = (await import('../subscription-webhook.service.js')).default;
const { PLAN_IDS } = await import('../../../config/subscription.config.js');

const sign = (rawBody) => crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

const activatedPayload = () => ({
    id: 'evt_activated_1',
    entity: 'event',
    event: 'subscription.activated',
    created_at: Math.floor(Date.now() / 1000),
    payload: {
        subscription: {
            entity: {
                id: 'sub_test_1',
                plan_id: 'plan_test_popular',
                current_start: 1770000000,
                current_end: 1772592000,
                notes: {
                    barber_id: 'barber-1',
                    plan_type: PLAN_IDS.POPULAR,
                },
            },
        },
        payment: {
            entity: {
                id: 'pay_test_1',
                amount: 29900,
                currency: 'INR',
            },
        },
    },
});

test('handleWebhook rejects invalid Razorpay signatures before any write', async (t) => {
    const existsMock = t.mock.method(transactionRepository, 'existsByWebhookEventId', async () => {
        throw new Error('idempotency should not run for invalid signatures');
    });

    const rawBody = Buffer.from(JSON.stringify(activatedPayload()));

    await assert.rejects(
        webhookService.handleWebhook({ 'x-razorpay-signature': 'bad' }, rawBody),
        {
            name: 'BadRequestError',
            message: 'Invalid webhook signature',
        },
    );

    assert.equal(existsMock.mock.calls.length, 0);
});

test('handleWebhook skips duplicate event ids idempotently', async (t) => {
    t.mock.method(transactionRepository, 'existsByWebhookEventId', async () => true);

    const rawBody = Buffer.from(JSON.stringify(activatedPayload()));
    const result = await webhookService.handleWebhook(
        { 'x-razorpay-signature': sign(rawBody) },
        rawBody,
    );

    assert.deepEqual(result, {
        acknowledged: true,
        duplicate: true,
        eventId: 'evt_activated_1',
    });
});

test('subscription.activated transitions a local subscription and records activation', async (t) => {
    t.mock.method(transactionRepository, 'existsByWebhookEventId', async () => false);
    t.mock.method(subscriptionRepository, 'findByRazorpaySubscriptionId', async () => ({
        _id: 'local-sub-1',
        barberId: 'barber-1',
        planId: PLAN_IDS.POPULAR,
        status: 'PENDING_PAYMENT',
    }));

    let subscriptionUpdate = null;
    t.mock.method(subscriptionRepository, 'updateById', async (id, updates) => {
        subscriptionUpdate = { id, updates };
        return { _id: id, ...updates };
    });

    let transaction = null;
    t.mock.method(transactionRepository, 'create', async (payload) => {
        transaction = payload;
        return { _id: 'txn-1', ...payload };
    });

    let lifecycle = null;
    t.mock.method(lifecycleService, 'onSubscriptionActivated', async (barberId, planId) => {
        lifecycle = { barberId, planId };
    });

    const rawBody = Buffer.from(JSON.stringify(activatedPayload()));
    const result = await webhookService.handleWebhook(
        { 'x-razorpay-signature': sign(rawBody) },
        rawBody,
    );

    assert.deepEqual(result, { acknowledged: true, eventId: 'evt_activated_1' });
    assert.equal(subscriptionUpdate.id, 'local-sub-1');
    assert.equal(subscriptionUpdate.updates.status, 'ACTIVE');
    assert.equal(transaction.type, 'ACTIVATION');
    assert.equal(transaction.webhookEventId, 'evt_activated_1');
    assert.deepEqual(lifecycle, { barberId: 'barber-1', planId: PLAN_IDS.POPULAR });
});

test('handleWebhook treats concurrent duplicate webhook insert races as acknowledged duplicates', async (t) => {
    t.mock.method(transactionRepository, 'existsByWebhookEventId', async () => false);
    t.mock.method(subscriptionRepository, 'findByRazorpaySubscriptionId', async () => ({
        _id: 'local-sub-1',
        barberId: 'barber-1',
        planId: PLAN_IDS.POPULAR,
        status: 'PENDING_PAYMENT',
    }));
    t.mock.method(subscriptionRepository, 'updateById', async (id, updates) => ({ _id: id, ...updates }));
    t.mock.method(lifecycleService, 'onSubscriptionActivated', async () => {});
    t.mock.method(transactionRepository, 'create', async () => {
        const error = new Error('duplicate webhook event');
        error.code = 11000;
        error.keyPattern = { webhookEventId: 1 };
        throw error;
    });

    const rawBody = Buffer.from(JSON.stringify(activatedPayload()));
    const result = await webhookService.handleWebhook(
        { 'x-razorpay-signature': sign(rawBody) },
        rawBody,
    );

    assert.deepEqual(result, {
        acknowledged: true,
        duplicate: true,
        eventId: 'evt_activated_1',
    });
});

test('payment.failed records a failed transaction for webhook idempotency', async (t) => {
    t.mock.method(transactionRepository, 'existsByWebhookEventId', async () => false);
    t.mock.method(subscriptionRepository, 'findByRazorpaySubscriptionId', async () => ({
        _id: 'local-sub-1',
        barberId: 'barber-1',
        planId: PLAN_IDS.POPULAR,
        status: 'ACTIVE',
    }));

    let transaction = null;
    t.mock.method(transactionRepository, 'create', async (payload) => {
        transaction = payload;
        return { _id: 'txn-1', ...payload };
    });

    const payload = {
        id: 'evt_payment_failed_1',
        entity: 'event',
        event: 'payment.failed',
        created_at: Math.floor(Date.now() / 1000),
        payload: {
            payment: {
                entity: {
                    id: 'pay_failed_1',
                    subscription_id: 'sub_test_1',
                    amount: 29900,
                    currency: 'INR',
                    status: 'failed',
                    error_code: 'BAD_REQUEST_ERROR',
                    error_description: 'Payment failed',
                },
            },
        },
    };

    const rawBody = Buffer.from(JSON.stringify(payload));
    const result = await webhookService.handleWebhook(
        { 'x-razorpay-signature': sign(rawBody) },
        rawBody,
    );

    assert.deepEqual(result, { acknowledged: true, eventId: 'evt_payment_failed_1' });
    assert.equal(transaction.type, 'PAYMENT_FAILED');
    assert.equal(transaction.status, 'FAILED');
    assert.equal(transaction.webhookEventId, 'evt_payment_failed_1');
    assert.equal(transaction.razorpayPaymentId, 'pay_failed_1');
});
