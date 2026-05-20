import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import Barber from '../barber.model.js';
import Shop from '../shop.model.js';

const objectId = () => new mongoose.Types.ObjectId();

const buildBarber = (overrides = {}) => new Barber({
    userId: objectId(),
    firstName: 'Test',
    lastName: 'Barber',
    gender: 'male',
    dateOfBirth: new Date('1991-01-12'),
    yearsOfExperience: 8,
    accountHolderName: 'Test Barber',
    bankName: 'HDFC Bank',
    bankAccount: '12345678901234',
    ifsc: 'HDFC0001234',
    pinHash: 'hashed-pin',
    ...overrides,
});

const buildShop = (overrides = {}) => new Shop({
    barberId: objectId(),
    shopName: 'Boundary Studio',
    category: 'Barber Shop',
    targetCustomers: 'men',
    bio: '',
    address: 'MG Road, Bengaluru',
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    numberOfEmployees: 2,
    facilities: ['Air Conditioning'],
    availableDays: ['Monday', 'Tuesday'],
    openTime: '09:00',
    closeTime: '20:00',
    ...overrides,
});

test('Barber owns person, security, and payout details with optional UPI', () => {
    const barber = buildBarber({ upiId: undefined });

    assert.equal(barber.validateSync(), undefined);
});

test('Barber requires bank account and IFSC for payout readiness', () => {
    const barber = buildBarber({
        bankAccount: undefined,
        ifsc: undefined,
    });

    const error = barber.validateSync();

    assert.ok(error);
    assert.ok(error.errors.bankAccount);
    assert.ok(error.errors.ifsc);
});

test('Shop owns venue details and rejects barber-owned fields', () => {
    const shop = buildShop({
        ownerId: objectId(),
        ownerFirstName: 'Wrong',
        ownerLastName: 'Owner',
        ownerGender: 'male',
        ownerDateOfBirth: new Date('1990-01-01'),
        upiId: 'wrong@upi',
        accountHolderName: 'Wrong Owner',
        bankName: 'Wrong Bank',
        payoutConfig: { bankAccount: '12345678901234', ifsc: 'HDFC0001234' },
        pinHash: 'wrong-pin',
    });

    assert.equal(shop.validateSync(), undefined);
    assert.equal(shop.ownerId, undefined);
    assert.equal(shop.ownerFirstName, undefined);
    assert.equal(shop.upiId, undefined);
    assert.equal(shop.payoutConfig, undefined);
    assert.equal(shop.pinHash, undefined);
});

test('Shop break times are optional', () => {
    const shop = buildShop({ breakTimes: undefined });

    assert.equal(shop.validateSync(), undefined);
    assert.deepEqual(shop.breakTimes, []);
});
