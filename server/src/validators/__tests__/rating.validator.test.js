import { ensureRequiredEnv } from '../../__tests__/helpers/env.js';
ensureRequiredEnv();

import assert from 'node:assert/strict';
import test from 'node:test';

import { addRatingSchema, addReplySchema } from '../rating.validator.js';

test('addRatingSchema requires bookingId and trims review text', () => {
    const { error, value } = addRatingSchema.validate({
        bookingId: '507f1f77bcf86cd799439012',
        shopId: '507f1f77bcf86cd799439011',
        rating: 5,
        review: '  Great service  ',
    });

    assert.equal(error, undefined);
    assert.equal(value.bookingId, '507f1f77bcf86cd799439012');
    assert.equal(value.review, 'Great service');
});

test('addRatingSchema rejects missing bookingId', () => {
    const { error } = addRatingSchema.validate({
        shopId: '507f1f77bcf86cd799439011',
        rating: 5,
    });

    assert.match(error?.message || '', /Booking ID is required/);
});

test('addReplySchema rejects whitespace-only replies', () => {
    const { error } = addReplySchema.validate({
        replyText: '   ',
    });

    assert.match(error?.message || '', /Reply text is required/);
});
