import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..', '..');
const serverDir = path.resolve(srcDir, '..');

const readSource = (relativePath) => readFile(path.join(srcDir, relativePath), 'utf8');

test('subscription routes are mounted and webhook raw body is captured before JSON parsing', async () => {
    const routeIndex = await readSource('routes/index.js');
    const subscriptionRoutes = await readSource('routes/subscription.routes.js');
    const appSource = await readSource('app.js');
    const rawParserSource = await readSource('middleware/webhook-raw-body.middleware.js');
    const webhookConfigSource = await readSource('config/webhook.config.js');

    assert.match(routeIndex, /router\.use\('\/subscriptions', subscriptionRoutes\)/);
    assert.match(subscriptionRoutes, /router\.get\('\/plans'/);
    assert.match(subscriptionRoutes, /router\.post\('\/subscribe'/);
    assert.match(subscriptionRoutes, /router\.post\('\/upgrade'/);
    assert.match(subscriptionRoutes, /router\.post\('\/downgrade'/);
    assert.match(subscriptionRoutes, /router\.post\('\/cancel'/);
    assert.match(subscriptionRoutes, /router\.post\('\/webhook'/);
    assert.doesNotMatch(subscriptionRoutes, /rawBodyMiddleware/);
    assert.match(appSource, /configureWebhookRawBodyParsers\(app\)/);
    assert.match(webhookConfigSource, /SUBSCRIPTIONS: '\/subscriptions\/webhook'/);
    assert.match(webhookConfigSource, /PAYOUTS: '\/payouts\/webhook'/);
    assert.match(webhookConfigSource, /PAYMENTS: '\/payments\/webhook'/);
    assert.match(rawParserSource, /RAW_JSON_WEBHOOK_ROUTES/);
    assert.ok(
        appSource.indexOf('configureWebhookRawBodyParsers') < appSource.indexOf('express.json'),
        'subscription webhook raw parser must be registered before global express.json()',
    );
});

test('postman generator emits a subscription collection and Razorpay webhook example', async () => {
    const postmanSource = await readFile(
        path.join(serverDir, 'scripts', 'regenerate-postman-collections.mjs'),
        'utf8',
    );

    assert.match(postmanSource, /EverCut - Subscriptions/);
    assert.match(postmanSource, /\/subscriptions\/plans/);
    assert.match(postmanSource, /\/subscriptions\/subscribe/);
    assert.match(postmanSource, /\/subscriptions\/webhook/);
    assert.match(postmanSource, /subscription\.activated/);
    assert.match(postmanSource, /razorpay_webhook_secret/);
});
