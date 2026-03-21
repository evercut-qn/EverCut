import assert from 'node:assert/strict';
import test from 'node:test';

import { bookingMilestoneProgressQuerySchema } from '../booking.validator.js';

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
