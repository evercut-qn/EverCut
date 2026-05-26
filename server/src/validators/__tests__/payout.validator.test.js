import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createManualPayoutSchema,
    listPayoutsQuerySchema,
    payoutIdParamSchema,
    pendingPayoutsQuerySchema,
    updatePayoutStatusSchema,
} from '../payout.validator.js';

test('payoutIdParamSchema accepts a valid payout id', () => {
    const { error, value } = payoutIdParamSchema.validate({
        payoutId: '507f1f77bcf86cd799439013',
    });

    assert.equal(error, undefined);
    assert.deepEqual(value, {
        payoutId: '507f1f77bcf86cd799439013',
    });
});

test('payoutIdParamSchema rejects invalid payout ids', () => {
    const { error } = payoutIdParamSchema.validate({
        payoutId: 'bad-id',
    });

    assert.match(error?.message || '', /invalid value|must be/);
});

test('createManualPayoutSchema normalizes UTR and rejects duplicate booking IDs', () => {
    const valid = createManualPayoutSchema.validate({
        barberId: '507f1f77bcf86cd799439011',
        bookingIds: ['507f1f77bcf86cd799439012'],
        utr: ' abc123 ',
        transferMode: 'upi',
        notes: ' Paid from bank portal ',
    });

    assert.equal(valid.error, undefined);
    assert.deepEqual(valid.value, {
        barberId: '507f1f77bcf86cd799439011',
        bookingIds: ['507f1f77bcf86cd799439012'],
        utr: 'ABC123',
        transferMode: 'upi',
        notes: 'Paid from bank portal',
    });

    const duplicateBookings = createManualPayoutSchema.validate({
        barberId: '507f1f77bcf86cd799439011',
        bookingIds: [
            '507f1f77bcf86cd799439012',
            '507f1f77bcf86cd799439012',
        ],
        utr: 'ABC124',
    });

    assert.match(duplicateBookings.error?.message || '', /duplicate/i);
});

test('updatePayoutStatusSchema only accepts failed manual correction payloads', () => {
    const valid = updatePayoutStatusSchema.validate({
        status: 'FAILED',
        reason: 'UPI transfer rejected',
        notes: '',
    });

    assert.equal(valid.error, undefined);
    assert.deepEqual(valid.value, {
        status: 'FAILED',
        reason: 'UPI transfer rejected',
        notes: '',
    });

    const invalid = updatePayoutStatusSchema.validate({
        status: 'SUCCESS',
        reason: 'Looks good',
    });

    assert.match(invalid.error?.message || '', /FAILED/);
});

test('listPayoutsQuerySchema validates filters and defaults pagination and sort', () => {
    const { error, value } = listPayoutsQuerySchema.validate({
        status: 'SUCCESS',
        gateway: 'manual',
        barberId: '507f1f77bcf86cd799439011',
    });

    assert.equal(error, undefined);
    assert.equal(value.page, 1);
    assert.equal(value.limit, 20);
    assert.equal(value.sort, 'createdAt:desc');
    assert.equal(value.gateway, 'manual');
});

test('pendingPayoutsQuerySchema keeps search small and paginated', () => {
    const { error, value } = pendingPayoutsQuerySchema.validate({
        page: '2',
        limit: '10',
        search: ' Trim ',
    });

    assert.equal(error, undefined);
    assert.deepEqual(value, {
        page: 2,
        limit: 10,
        search: 'Trim',
    });
});
