import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import Subscription from '../subscription.model.js';
import SubscriptionTransaction from '../subscription-transaction.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..', '..', '..');

test('subscription Razorpay ID index only enforces uniqueness for real provider IDs', () => {
    const indexes = Subscription.schema.indexes();
    const [, options] = indexes.find(([, indexOptions]) => indexOptions.name === 'idx_subscription_razorpay_id');

    assert.equal(options.unique, true);
    assert.equal(options.sparse, undefined);
    assert.deepEqual(options.partialFilterExpression, {
        razorpaySubscriptionId: { $type: 'string' },
    });
});

test('subscription webhook event index only enforces uniqueness for real event ids', () => {
    const indexes = SubscriptionTransaction.schema.indexes();
    const [, options] = indexes.find(([, indexOptions]) => indexOptions.name === 'idx_subscription_webhook_event_id');

    assert.equal(options.unique, true);
    assert.equal(options.sparse, undefined);
    assert.deepEqual(options.partialFilterExpression, {
        webhookEventId: { $type: 'string' },
    });
});

test('subscription migration removes legacy sparse provider-id indexes', async () => {
    const source = await readFile(path.join(serverDir, 'scripts', 'migrate-subscription-defaults.mjs'), 'utf8');

    assert.match(source, /razorpaySubscriptionId_1/);
    assert.match(source, /webhookEventId_1/);
    assert.match(source, /dropIndex/);
});
