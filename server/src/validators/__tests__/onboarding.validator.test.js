import assert from 'node:assert/strict';
import test from 'node:test';

import { barberOnboardingSchema } from '../onboarding.validator.js';

const buildValidPayload = () => ({
    email: 'barber@example.com',
    firstName: 'Test',
    lastName: 'Barber',
    gender: 'male',
    dateOfBirth: '1991-01-12',
    shopName: 'Postman Test Barber Studio',
    category: 'Barber Shop',
    targetCustomers: 'men',
    upiId: 'test.barber@upi',
    accountHolderName: 'Test Barber',
    bankName: 'HDFC Bank',
    bankAccount: '12345678901234',
    ifsc: 'HDFC0001234',
    address: 'MG Road, Bengaluru',
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    workingDays: ['Monday', 'Tuesday', 'Wednesday'],
    workingHours: '{"openTime":"09:00 AM","closeTime":"08:00 PM"}',
    breakTimes: '[{"start":"01:00 PM","end":"02:00 PM"}]',
    photoMediaId: 'media-1',
    pin: '1234',
    confirmPin: '1234',
});

test('barberOnboardingSchema normalizes shop schedule to 24-hour strings', () => {
    const result = barberOnboardingSchema.validate(buildValidPayload(), {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
    });

    assert.equal(result.error, undefined);
    assert.equal(result.value.openTime, '09:00');
    assert.equal(result.value.closeTime, '20:00');
    assert.deepEqual(result.value.breakTimes, [{ start: '13:00', end: '14:00' }]);
});

test('barberOnboardingSchema rejects break times outside shop hours', () => {
    const result = barberOnboardingSchema.validate({
        ...buildValidPayload(),
        breakTimes: '[{"start":"08:00 AM","end":"09:30 AM"}]',
    }, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
    });

    assert.match(result.error?.message || '', /breakTimes\[0\] must stay within shop hours/);
});

test('barberOnboardingSchema allows missing breakTimes', () => {
    const result = barberOnboardingSchema.validate({
        ...buildValidPayload(),
        breakTimes: undefined,
    }, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
    });

    assert.equal(result.error, undefined);
    assert.deepEqual(result.value.breakTimes, []);
});

test('barberOnboardingSchema requires a valid upiId', () => {
    for (const upiId of [undefined, null, '', 'not-a-upi']) {
        const result = barberOnboardingSchema.validate({
            ...buildValidPayload(),
            upiId,
        }, {
            abortEarly: false,
            allowUnknown: false,
            stripUnknown: true,
        });

        assert.match(result.error?.message || '', /upiId/);
    }
});

test('barberOnboardingSchema allows omitted optional bank fields', () => {
    const result = barberOnboardingSchema.validate({
        ...buildValidPayload(),
        accountHolderName: undefined,
        bankName: undefined,
        bankAccount: undefined,
        ifsc: undefined,
    }, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
    });

    assert.equal(result.error, undefined);
    assert.equal(result.value.accountHolderName, undefined);
    assert.equal(result.value.bankName, undefined);
    assert.equal(result.value.bankAccount, undefined);
    assert.equal(result.value.ifsc, undefined);
});

test('barberOnboardingSchema rejects deprecated barber onboarding aliases', () => {
    const result = barberOnboardingSchema.validate({
        ...buildValidPayload(),
        category: undefined,
        businessCategory: 'Barber Shop',
        upiAddress: 'test.barber@upi',
    }, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
    });

    assert.match(result.error?.message || '', /businessCategory|upiAddress|category/);
});
