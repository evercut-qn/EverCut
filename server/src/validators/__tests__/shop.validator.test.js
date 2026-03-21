import assert from 'node:assert/strict';
import test from 'node:test';

import { updateBusinessSchema } from '../shop.validator.js';

test('updateBusinessSchema normalizes shop hour updates from AM/PM to 24-hour values', () => {
    const result = updateBusinessSchema.validate({
        openTime: '09:00 AM',
        closeTime: '08:00 PM',
        breakTimes: '[{"start":"01:00 PM","end":"02:00 PM"}]',
    }, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
    });

    assert.equal(result.error, undefined);
    assert.equal(result.value.openTime, '09:00');
    assert.equal(result.value.closeTime, '20:00');
    assert.deepEqual(result.value.breakTimes, [{ start: '13:00', end: '14:00' }]);
});

test('updateBusinessSchema rejects invalid shop-hour strings', () => {
    const result = updateBusinessSchema.validate({
        openTime: 'morning',
    }, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
    });

    assert.match(result.error?.message || '', /openTime must use HH:MM or hh:mm AM\/PM format/);
});
