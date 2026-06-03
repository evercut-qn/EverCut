import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureRequiredEnv } from '../../__tests__/helpers/env.js';

ensureRequiredEnv();

const customerRepository = (await import('../customer.repository.js')).default;
const barberRepository = (await import('../barber.repository.js')).default;
const bookingRepository = (await import('../booking.repository.js')).default;

test('customer admin directory pipeline joins users and filters active customers', () => {
    const pipeline = customerRepository.buildAdminDirectoryPipeline({
        search: 'mina',
        isActive: true,
    });

    assert.deepEqual(pipeline[0].$lookup.from, 'users');
    assert.ok(pipeline.some((stage) => stage.$match?.['user.roleType'] === 'CUSTOMER'));
    assert.ok(pipeline.some((stage) => stage.$match?.['user.isActive'] === true));
    assert.ok(pipeline.some((stage) => stage.$lookup?.from === 'bookings'));
});

test('barber admin directory pipeline joins users, shops, ratings, and excludes internal security fields', () => {
    const pipeline = barberRepository.buildAdminDirectoryPipeline({
        search: 'trim',
        isOpen: false,
    });

    assert.ok(pipeline.some((stage) => stage.$lookup?.from === 'users'));
    assert.ok(pipeline.some((stage) => stage.$lookup?.from === 'shops'));
    assert.ok(pipeline.some((stage) => stage.$lookup?.from === 'ratings'));
    assert.ok(pipeline.some((stage) => stage.$match?.['shop.isOpen'] === false));
    assert.ok(pipeline.some((stage) => stage.$project?.pinHash === 0));
});

test('booking admin list pipeline supports resource search without dashboard-specific filters', () => {
    const pipeline = bookingRepository.buildAdminListPipeline({
        search: '507f1f77bcf86cd799439011',
        payoutStatus: ['failed', 'reversed'],
    });
    const firstMatch = pipeline[0].$match;
    const searchMatch = pipeline.find((stage) => stage.$match?.$or);

    assert.deepEqual(firstMatch.payoutStatus, { $in: ['failed', 'reversed'] });
    assert.ok(pipeline.some((stage) => stage.$lookup?.from === 'customers'));
    assert.ok(pipeline.some((stage) => stage.$lookup?.from === 'shops'));
    assert.ok(pipeline.some((stage) => stage.$lookup?.from === 'barbers'));
    assert.ok(pipeline.some((stage) => stage.$lookup?.from === 'services'));
    assert.ok(searchMatch.$match.$or.some((condition) => condition._id));
});
