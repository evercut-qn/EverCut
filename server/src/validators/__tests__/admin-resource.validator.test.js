import assert from 'node:assert/strict';
import test from 'node:test';

import { bookingListQuerySchema } from '../booking.validator.js';
import { refundListQuerySchema } from '../payment.validator.js';
import { adminSubscriptionListQuerySchema } from '../subscription.validator.js';
import { barberDirectoryQuerySchema } from '../barber.validator.js';
import { customerDirectoryQuerySchema } from '../user.validator.js';

test('admin booking list query accepts reusable resource filters', () => {
    const { error, value } = bookingListQuerySchema.validate({
        search: 'Trim Studio',
        payoutStatus: 'not_initiated,failed',
        shopId: '507f1f77bcf86cd799439011',
        customerId: '507f1f77bcf86cd799439012',
        page: '2',
        limit: '10',
    });

    assert.equal(error, undefined);
    assert.deepEqual(value.payoutStatus, ['not_initiated', 'failed']);
    assert.equal(value.page, 2);
    assert.equal(value.limit, 10);
});

test('directory validators normalize booleans and pagination', () => {
    const customer = customerDirectoryQuerySchema.validate({ isActive: 'true', search: ' Mina ' });
    const barber = barberDirectoryQuerySchema.validate({ isOpen: 'false', isActive: 'true' });

    assert.equal(customer.error, undefined);
    assert.equal(customer.value.isActive, true);
    assert.equal(customer.value.search, 'Mina');
    assert.equal(barber.error, undefined);
    assert.equal(barber.value.isOpen, false);
    assert.equal(barber.value.isActive, true);
});

test('refund and subscription admin validators constrain status filters', () => {
    assert.equal(refundListQuerySchema.validate({ refundStatus: 'completed' }).error, undefined);
    assert.match(
        refundListQuerySchema.validate({ refundStatus: 'paid' }).error?.message || '',
        /must be one of/,
    );

    assert.equal(adminSubscriptionListQuerySchema.validate({
        planId: 'PLAN_POPULAR',
        status: 'ACTIVE',
    }).error, undefined);
    assert.match(
        adminSubscriptionListQuerySchema.validate({ status: 'UNKNOWN' }).error?.message || '',
        /must be one of/,
    );
});
