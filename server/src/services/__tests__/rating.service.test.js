import assert from 'node:assert/strict';
import test from 'node:test';

import bookingRepository from '../../repositories/booking.repository.js';
import customerRepository from '../../repositories/customer.repository.js';
import ratingRepository from '../../repositories/rating.repository.js';
import shopRepository from '../../repositories/shop.repository.js';
import * as ratingService from '../rating.service.js';

test('addRating translates duplicate-key writes and normalizes blank reviews', async (t) => {
    t.mock.method(customerRepository, 'findByUserId', async () => ({ _id: 'customer-1' }));
    t.mock.method(shopRepository, 'findById', async () => ({ _id: 'shop-1' }));
    t.mock.method(bookingRepository, 'hasCompletedBookingForCustomer', async () => true);
    t.mock.method(ratingRepository, 'findByCustomerAndShop', async () => null);

    let createPayload = null;
    t.mock.method(ratingRepository, 'create', async (payload) => {
        createPayload = payload;
        const error = new Error('duplicate key');
        error.code = 11000;
        throw error;
    });

    await assert.rejects(
        () => ratingService.addRating('user-1', 'shop-1', 5, '   '),
        {
            name: 'ConflictError',
            message: 'You have already rated this shop',
        },
    );

    assert.deepEqual(createPayload, {
        customerId: 'customer-1',
        shopId: 'shop-1',
        rating: 5,
        review: undefined,
    });
});

test('addRating rejects customers who have no completed booking for the target shop', async (t) => {
    t.mock.method(customerRepository, 'findByUserId', async () => ({ _id: 'customer-1' }));
    t.mock.method(shopRepository, 'findById', async () => ({ _id: 'shop-1' }));
    t.mock.method(bookingRepository, 'hasCompletedBookingForCustomer', async () => false);

    await assert.rejects(
        () => ratingService.addRating('user-1', 'shop-1', 5, 'Great visit'),
        {
            name: 'ForbiddenError',
            message: 'You can only rate shops where you have a completed booking',
        },
    );
});

test('getRatingsByShop returns 404 when the shop does not exist', async (t) => {
    t.mock.method(shopRepository, 'findById', async () => null);

    await assert.rejects(
        () => ratingService.getRatingsByShop('missing-shop', { page: 1, limit: 10 }),
        {
            name: 'NotFoundError',
            message: 'Shop not found',
        },
    );
});

test('addReplyToRating rejects duplicate replies instead of silently overwriting them', async (t) => {
    t.mock.method(ratingRepository, 'findById', async () => ({
        _id: 'rating-1',
        shopId: 'shop-1',
        reply: { text: 'Existing reply' },
    }));
    t.mock.method(shopRepository, 'findByOwnerId', async () => ({ _id: 'shop-1' }));

    await assert.rejects(
        () => ratingService.addReplyToRating('rating-1', 'Thanks for visiting', 'owner-1'),
        {
            name: 'ConflictError',
            message: 'Reply already exists for this rating',
        },
    );
});

test('updateReplyToRating trims reply text and omits customer email from the response payload', async (t) => {
    const repliedAt = new Date('2026-03-20T08:30:00.000Z');
    const createdAt = new Date('2026-03-19T08:30:00.000Z');
    const updatedAt = new Date('2026-03-20T08:30:00.000Z');

    t.mock.method(ratingRepository, 'findById', async () => ({
        _id: 'rating-1',
        shopId: 'shop-1',
        reply: { text: 'Old reply' },
    }));
    t.mock.method(shopRepository, 'findByOwnerId', async () => ({ _id: 'shop-1' }));

    let updateArgs = null;
    t.mock.method(ratingRepository, 'updateReply', async (ratingId, replyText, repliedBy) => {
        updateArgs = { ratingId, replyText, repliedBy };
        return {
            _id: 'rating-1',
            rating: 5,
            review: 'Great service',
            customerId: {
                firstName: 'Ava',
                lastName: 'Customer',
                photoUrl: 'https://example.com/customer.jpg',
                userId: { email: 'should-not-leak@example.com' },
            },
            reply: {
                text: replyText,
                repliedAt,
            },
            createdAt,
            updatedAt,
        };
    });

    const result = await ratingService.updateReplyToRating('rating-1', '  Updated reply  ', 'owner-1');

    assert.deepEqual(updateArgs, {
        ratingId: 'rating-1',
        replyText: 'Updated reply',
        repliedBy: 'owner-1',
    });
    assert.deepEqual(result.user, {
        firstName: 'Ava',
        lastName: 'Customer',
        photoUrl: 'https://example.com/customer.jpg',
    });
    assert.equal('email' in result.user, false);
    assert.deepEqual(result.reply, {
        text: 'Updated reply',
        repliedAt,
    });
});

test('removeRating uses ForbiddenError when the rating belongs to a different shop', async (t) => {
    t.mock.method(ratingRepository, 'findById', async () => ({
        _id: 'rating-1',
        shopId: 'shop-2',
    }));
    t.mock.method(shopRepository, 'findByOwnerId', async () => ({ _id: 'shop-1' }));

    await assert.rejects(
        () => ratingService.removeRating('rating-1', 'owner-1'),
        {
            name: 'ForbiddenError',
            message: 'You can only remove ratings on your own shop',
        },
    );
});
