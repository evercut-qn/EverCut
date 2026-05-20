import assert from 'node:assert/strict';
import test from 'node:test';

import { serializeBarberProfile } from '../barber-profile.utils.js';

test('serializeBarberProfile exposes a generic payout beneficiary identifier', () => {
    const shop = {
        _id: 'shop-1',
        barberId: 'barber-1',
        shopName: 'Trim Studio',
        category: 'Hair Salon',
        targetCustomers: 'men',
        address: 'Main Street',
        location: {
            type: 'Point',
            coordinates: [72.0, 23.0],
        },
        numberOfEmployees: 1,
        facilities: [],
        availableDays: ['monday'],
        openTime: '09:00',
        closeTime: '18:00',
        breakTimes: [],
    };
    const barber = {
        _id: 'barber-1',
        firstName: 'Barber',
        lastName: 'One',
        gender: 'male',
        dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
        yearsOfExperience: 5,
        upiId: 'barber@upi',
        accountHolderName: 'Barber One',
        bankName: 'Example Bank',
        bankAccount: '123456789012',
        ifsc: 'ABCD0123456',
        payoutConfig: {
            beneficiaryId: 'beneficiary-1',
            verificationStatus: 'verified',
        },
        pinHash: 'secret',
    };

    const serialized = serializeBarberProfile({ barber, shop });

    assert.equal(serialized.payout.beneficiaryId, 'beneficiary-1');
    assert.equal(Object.hasOwn(serialized.payout, 'cashfreeBeneficiaryId'), false);
    assert.equal(Object.hasOwn(serialized, 'payoutConfig'), false);
});
