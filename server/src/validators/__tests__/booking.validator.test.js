import assert from 'node:assert/strict';
import test from 'node:test';

import {
    bookingMilestoneProgressQuerySchema,
    bookSalonSchema,
    rescheduleSchema,
    updateBookingSchema,
} from '../booking.validator.js';

test('booking schemas accept availability HH:MM times and normalize AM/PM input', () => {
    const createResult = bookSalonSchema.validate({
        shopId: '507f1f77bcf86cd799439011',
        employeeId: '507f1f77bcf86cd799439012',
        serviceId: '507f1f77bcf86cd799439013',
        date: '2099-01-01',
        time: '10:00',
    });
    assert.equal(createResult.error, undefined);
    assert.equal(createResult.value.time, '10:00');

    const updateResult = updateBookingSchema.validate({
        employeeId: '507f1f77bcf86cd799439012',
        date: '2099-01-01',
        time: '10:00 AM',
    });
    assert.equal(updateResult.error, undefined);
    assert.equal(updateResult.value.time, '10:00');

    const rescheduleResult = rescheduleSchema.validate({
        newDate: '2099-01-02',
        newTime: '1:30 PM',
    });
    assert.equal(rescheduleResult.error, undefined);
    assert.equal(rescheduleResult.value.newTime, '13:30');
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
