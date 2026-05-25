import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ensureRequiredEnv } from '../../../__tests__/helpers/env.js';

ensureRequiredEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adapterPath = path.resolve(__dirname, '..', 'razorpay-subscription.adapter.js');
const constantsPath = path.resolve(__dirname, '..', 'razorpay.constants.js');

test('Razorpay subscription adapter follows provider adapter structure', async () => {
    const adapterSource = await readFile(adapterPath, 'utf8');
    const constantsSource = await readFile(constantsPath, 'utf8');

    assert.match(adapterSource, /extends SubscriptionGatewayAdapter/);
    assert.match(adapterSource, /getProviderName\(\)/);
    assert.match(adapterSource, /verifyWebhook\(/);
    assert.match(constantsSource, /RAZORPAY_WEBHOOK_SIGNATURE_HEADER/);
    assert.match(constantsSource, /DEFAULT_RAZORPAY_SUBSCRIPTION_TOTAL_COUNT/);
});

test('Razorpay adapter validates webhook signatures using the raw body', async () => {
    const adapter = (await import('../razorpay-subscription.adapter.js')).default;
    const rawBody = Buffer.from(JSON.stringify({ event: 'subscription.activated' }));
    const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

    assert.equal(adapter.verifyWebhook({ 'x-razorpay-signature': signature }, rawBody), true);
    assert.equal(adapter.verifyWebhook({ 'x-razorpay-signature': 'bad' }, rawBody), false);
});
