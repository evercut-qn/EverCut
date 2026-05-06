import assert from 'node:assert/strict';
import test from 'node:test';

import {
    bookingListQuerySchema,
    bookingMilestoneProgressQuerySchema,
    bookingPatchSchema,
    createBookingSchema,
    queueFilterQuerySchema,
} from '../booking.validator.js';

test('booking schemas accept availability HH:MM times and normalize AM/PM input', () => {
    const createResult = createBookingSchema.validate({
        shopId: '507f1f77bcf86cd799439011',
        employeeId: '507f1f77bcf86cd799439012',
        serviceIds: ['507f1f77bcf86cd799439013'],
        date: '2099-01-01',
        time: '10:00',
    });
    assert.equal(createResult.error, undefined);
    assert.equal(createResult.value.time, '10:00');

    const updateResult = bookingPatchSchema.validate({
        employeeId: '507f1f77bcf86cd799439012',
        date: '2099-01-01',
        time: '10:00 AM',
    });
    assert.equal(updateResult.error, undefined);
    assert.equal(updateResult.value.time, '10:00');

    const statusResult = bookingPatchSchema.validate({
        status: 'confirmed',
    });
    assert.equal(statusResult.error, undefined);
    assert.equal(statusResult.value.status, 'confirmed');
});

test('createBookingSchema accepts sourceBookingId for reordering through the bookings collection', () => {
    const { error, value } = createBookingSchema.validate({
        sourceBookingId: '507f1f77bcf86cd799439011',
        date: '2099-01-02',
        time: '1:30 PM',
    });

    assert.equal(error, undefined);
    assert.equal(value.time, '13:30');
});

test('bookingPatchSchema rejects mixed schedule and status changes', () => {
    const { error } = bookingPatchSchema.validate({
        employeeId: '507f1f77bcf86cd799439012',
        date: '2099-01-01',
        time: '10:00',
        status: 'completed',
    });

    assert.match(error?.message || '', /does not match any of the allowed types/);
});

test('bookingMilestoneProgressQuerySchema accepts a complete explicit month/year period', () => {
    const { error, value } = bookingMilestoneProgressQuerySchema.validate({
        month: '3',
        year: '2026',
    });

    assert.equal(error, undefined);
    assert.deepEqual(value, {
        month: 3,
        year: 2026,
    });
});

test('bookingMilestoneProgressQuerySchema rejects incomplete periods', () => {
    const { error } = bookingMilestoneProgressQuerySchema.validate({
        month: 3,
    });

    assert.match(error?.message || '', /contains \[month\] without its required peers \[year\]/);
});

test('booking list and queue queries use timeframe instead of overlapping period/filter names', () => {
    const bookingQuery = bookingListQuerySchema.validate({
        timeframe: 'past',
        page: '1',
        limit: '10',
    });
    assert.equal(bookingQuery.error, undefined);
    assert.equal(bookingQuery.value.timeframe, 'past');
    assert.equal('period' in bookingQuery.value, false);

    const legacyBookingQuery = bookingListQuerySchema.validate({ period: 'past' });
    assert.match(legacyBookingQuery.error?.message || '', /period/);

    const queueQuery = queueFilterQuerySchema.validate({ timeframe: 'upcoming' });
    assert.equal(queueQuery.error, undefined);
    assert.equal(queueQuery.value.timeframe, 'upcoming');

    const legacyQueueQuery = queueFilterQuerySchema.validate({ filter: 'active' });
    assert.match(legacyQueueQuery.error?.message || '', /filter/);
});
