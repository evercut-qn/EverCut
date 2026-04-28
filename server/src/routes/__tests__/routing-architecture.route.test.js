import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..', '..');
const serverDir = path.resolve(srcDir, '..');

const readSource = (relativePath) => readFile(path.join(srcDir, relativePath), 'utf8');

const exists = async (relativePath) => {
    try {
        await access(path.join(srcDir, relativePath), fsConstants.F_OK);
        return true;
    } catch {
        return false;
    }
};

test('route index mounts feature-oriented resources instead of legacy role prefixes', async () => {
    const source = await readSource('routes/index.js');

    for (const routePrefix of [
        '/auth',
        '/onboarding',
        '/customers',
        '/shops',
        '/employees',
        '/services',
        '/bookings',
        '/photos',
        '/ratings',
        '/earnings',
        '/payments',
        '/payouts',
    ]) {
        assert.match(source, new RegExp(`router\\.use\\('${routePrefix.replace('/', '\\/')}`));
    }

    assert.doesNotMatch(source, /router\.use\('\/customer'/);
    assert.doesNotMatch(source, /router\.use\('\/barber'/);
});

test('legacy role-prefixed route and controller files are removed after the migration', async () => {
    const removedPaths = [
        'routes/customer.routes.js',
        'routes/barber.routes.js',
        'controllers/customer/customer-profile.controller.js',
        'controllers/customer/customer-shop.controller.js',
        'controllers/customer/customer-rating.controller.js',
        'controllers/customer/customer-booking.controller.js',
        'controllers/barber/barber-profile.controller.js',
        'controllers/barber/barber-shop.controller.js',
        'controllers/barber/barber-employee.controller.js',
        'controllers/barber/barber-service.controller.js',
        'controllers/barber/barber-booking.controller.js',
        'controllers/barber/barber-photo.controller.js',
        'controllers/barber/barber-earnings.controller.js',
        'controllers/barber/barber-rating.controller.js',
    ];

    for (const relativePath of removedPaths) {
        assert.equal(
            await exists(relativePath),
            false,
            `expected ${relativePath} to be removed`,
        );
    }
});

test('postman collection generator no longer emits legacy /customer or /barber URLs', async () => {
    const source = await readFile(
        path.join(serverDir, 'scripts', 'regenerate-postman-collections.mjs'),
        'utf8',
    );

    assert.doesNotMatch(source, /\/customer\//);
    assert.doesNotMatch(source, /\/barber\//);
});

test('payment and payout controllers follow the same flat feature-controller structure', async () => {
    const paymentRoutes = await readSource('routes/payment.routes.js');
    const payoutRoutes = await readSource('routes/payout.routes.js');

    for (const relativePath of [
        'controllers/payment.controller.js',
        'controllers/payout.controller.js',
    ]) {
        assert.equal(
            await exists(relativePath),
            true,
            `expected ${relativePath} to exist`,
        );
    }

    for (const removedPath of [
        'controllers/payment/payment.controller.js',
        'controllers/payment/webhook.controller.js',
        'controllers/payout/payout.controller.js',
        'controllers/payout/payout-webhook.controller.js',
    ]) {
        assert.equal(
            await exists(removedPath),
            false,
            `expected ${removedPath} to be removed`,
        );
    }

    assert.match(paymentRoutes, /\.\.\/controllers\/payment\.controller\.js/);
    assert.doesNotMatch(paymentRoutes, /\.\.\/controllers\/payment\//);

    assert.match(payoutRoutes, /\.\.\/controllers\/payout\.controller\.js/);
    assert.doesNotMatch(payoutRoutes, /\.\.\/controllers\/payout\//);
});

test('booking discovery and payment routes use final resource-oriented URLs', async () => {
    const bookingRoutes = await readSource('routes/bookings.routes.js');
    const shopRoutes = await readSource('routes/shops.routes.js');
    const paymentRoutes = await readSource('routes/payment.routes.js');
    const postmanSource = await readFile(
        path.join(serverDir, 'scripts', 'regenerate-postman-collections.mjs'),
        'utf8',
    );

    assert.match(shopRoutes, /router\.get\('\/:id\/employees'/);
    assert.match(shopRoutes, /router\.get\('\/:id\/availability'/);
    assert.doesNotMatch(bookingRoutes, /\/shops\/:id\/availability/);
    assert.doesNotMatch(bookingRoutes, /\/shops\/:id\/employees/);

    assert.match(paymentRoutes, /router\.post\(\s*'\/'/);
    assert.match(paymentRoutes, /router\.get\(\s*'\/:id'/);
    assert.doesNotMatch(paymentRoutes, /\/initiate/);
    assert.doesNotMatch(paymentRoutes, /\/booking\/:bookingId/);

    assert.match(bookingRoutes, /\/:id\/payment/);
    assert.match(bookingRoutes, /\/:id\/refund/);
    assert.match(bookingRoutes, /\/:id\/cancel/);
    assert.doesNotMatch(bookingRoutes, /router\.delete\('\/:id'/);

    assert.doesNotMatch(postmanSource, /\/bookings\/shops/);
    assert.doesNotMatch(postmanSource, /\/payments\/initiate/);
    assert.doesNotMatch(postmanSource, /\/payments\/booking/);
});
