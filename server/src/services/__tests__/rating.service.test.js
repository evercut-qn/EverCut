import { ensureRequiredEnv } from '../../__tests__/helpers/env.js';
ensureRequiredEnv();

import assert from 'node:assert/strict';
import test from 'node:test';

import bookingRepository from '../../repositories/booking.repository.js';
import customerRepository from '../../repositories/customer.repository.js';
import ratingRepository from '../../repositories/rating.repository.js';
import shopRepository from '../../repositories/shop.repository.js';
import * as ratingService from '../rating.service.js';
import { BOOKING_STATUS } from '../../utils/constants.js';

test('addRating successfully creates rating for completed booking within 24 hours', async (t) => {
    const completedAt = new Date();
    const reviewExpiresAt = new Date(completedAt.getTime() + 24 * 60 * 60 * 1000);

    t.mock.method(customerRepository, 'findByUserId', async () => ({ _id: 'customer-1' }));
    t.mock.method(shopRepository, 'findById', async () => ({ _id: 'shop-1' }));
    t.mock.method(bookingRepository, 'findById', async () => ({
        _id: 'booking-1',
        customerId: 'customer-1',
        shopId: 'shop-1',
        status: BOOKING_STATUS.COMPLETED,
        completedAt,
        reviewExpiresAt,
        hasReviewed: false,
    }));
    t.mock.method(ratingRepository, 'findByBookingId', async () => null);

    let createPayload = null;
    t.mock.method(ratingRepository, 'create', async (payload) => {
        createPayload = payload;
        return {
            _id: 'rating-1',
            ...payload,
            customerId: { firstName: 'Ava', lastName: 'Customer' },
            createdAt: new Date(),
        };
    });

    let markedBookingId = null;
    let markedRatingId = null;
    t.mock.method(bookingRepository, 'markAsReviewed', async (bookingId, ratingId) => {
        markedBookingId = bookingId;
        markedRatingId = ratingId;
        return { _id: bookingId, hasReviewed: true, ratingId };
    });

    const result = await ratingService.addRating('user-1', {
        bookingId: 'booking-1',
        rating: 5,
        review: '  Excellent haircut!  ',
    });

    assert.deepEqual(createPayload, {
        bookingId: 'booking-1',
        customerId: 'customer-1',
        shopId: 'shop-1',
        rating: 5,
        review: 'Excellent haircut!',
    });
    assert.equal(markedBookingId, 'booking-1');
    assert.equal(markedRatingId, 'rating-1');
    assert.equal(result.rating, 5);
    assert.equal(result.review, 'Excellent haircut!');
});

test('addRating rejects ratings when 24-hour review window has expired', async (t) => {
    const completedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    const reviewExpiresAt = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

    t.mock.method(customerRepository, 'findByUserId', async () => ({ _id: 'customer-1' }));
    t.mock.method(shopRepository, 'findById', async () => ({ _id: 'shop-1' }));
    t.mock.method(bookingRepository, 'findById', async () => ({
        _id: 'booking-1',
        customerId: 'customer-1',
        shopId: 'shop-1',
        status: BOOKING_STATUS.COMPLETED,
        completedAt,
        reviewExpiresAt,
        hasReviewed: false,
    }));
    t.mock.method(ratingRepository, 'findByBookingId', async () => null);

    await assert.rejects(
        () => ratingService.addRating('user-1', {
            bookingId: 'booking-1',
            rating: 5,
            review: 'Great',
        }),
        {
            name: 'BadRequestError',
            message: 'Review window has expired (reviews must be submitted within 24 hours of service completion)',
        },
    );
});

test('addRating rejects duplicate reviews for the same booking', async (t) => {
    const completedAt = new Date();

    t.mock.method(customerRepository, 'findByUserId', async () => ({ _id: 'customer-1' }));
    t.mock.method(shopRepository, 'findById', async () => ({ _id: 'shop-1' }));
    t.mock.method(bookingRepository, 'findById', async () => ({
        _id: 'booking-1',
        customerId: 'customer-1',
        shopId: 'shop-1',
        status: BOOKING_STATUS.COMPLETED,
        completedAt,
        hasReviewed: true,
    }));
    t.mock.method(ratingRepository, 'findByBookingId', async () => ({ _id: 'existing-rating' }));

    await assert.rejects(
        () => ratingService.addRating('user-1', {
            bookingId: 'booking-1',
            rating: 5,
        }),
        {
            name: 'ConflictError',
            message: 'You have already submitted a review for this booking',
        },
    );
});

test('addRating rejects non-completed bookings', async (t) => {
    t.mock.method(customerRepository, 'findByUserId', async () => ({ _id: 'customer-1' }));
    t.mock.method(shopRepository, 'findById', async () => ({ _id: 'shop-1' }));
    t.mock.method(bookingRepository, 'findById', async () => ({
        _id: 'booking-1',
        customerId: 'customer-1',
        shopId: 'shop-1',
        status: BOOKING_STATUS.CONFIRMED,
    }));

    await assert.rejects(
        () => ratingService.addRating('user-1', {
            bookingId: 'booking-1',
            rating: 5,
        }),
        {
            name: 'BadRequestError',
            message: 'You can only rate completed appointments',
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

test('getBarberRatingSummary resolves the owned shop before aggregating ratings', async (t) => {
    const shopId = '64b7f4c2a9d3f1b2c8e4d001';

    t.mock.method(shopRepository, 'findByBarberUserId', async () => ({ _id: shopId }));
    t.mock.method(shopRepository, 'findById', async () => ({ _id: shopId }));
    t.mock.method(ratingRepository, 'getShopSummary', async (shopId) => ({
        shopId,
        averageRating: 4.8,
        totalReviews: 12,
        stars: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 10 },
    }));

    const result = await ratingService.getBarberRatingSummary('owner-1');

    assert.deepEqual(result, {
        shopId,
        averageRating: 4.8,
        totalReviews: 12,
        stars: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 10 },
    });
});

test('upsertReplyToRating creates a first reply and notifies the customer', async (t) => {
    const repliedAt = new Date('2026-03-20T08:30:00.000Z');

    t.mock.method(ratingRepository, 'findById', async () => ({
        _id: 'rating-1',
        shopId: 'shop-1',
    }));
    t.mock.method(shopRepository, 'findByBarberUserId', async () => ({ _id: 'shop-1' }));

    let addArgs = null;
    t.mock.method(ratingRepository, 'addReply', async (ratingId, replyText, repliedBy) => {
        addArgs = { ratingId, replyText, repliedBy };
        return {
            _id: 'rating-1',
            rating: 5,
            review: 'Great service',
            customerId: {
                firstName: 'Ava',
                lastName: 'Customer',
                photoMediaId: {
                    _id: 'media-customer-1',
                    r2Key: 'images/avatars/customer-1/profile.jpg',
                },
            },
            reply: {
                text: replyText,
                repliedAt,
            },
        };
    });

    const notificationEvents = await import('../notifications/notification-events.service.js');
    let notifyArgs = null;
    t.mock.method(notificationEvents.default, 'notifyRatingReply', async (payload) => {
        notifyArgs = payload;
    });

    const result = await ratingService.upsertReplyToRating('rating-1', '  Thanks for visiting  ', 'owner-1');

    assert.deepEqual(addArgs, {
        ratingId: 'rating-1',
        replyText: 'Thanks for visiting',
        repliedBy: 'owner-1',
    });
    assert.deepEqual(notifyArgs, {
        ratingId: 'rating-1',
        actorUserId: 'owner-1',
    });
    assert.equal(result.reply.text, 'Thanks for visiting');
});

test('upsertReplyToRating updates an existing reply without sending a duplicate notification', async (t) => {
    const repliedAt = new Date('2026-03-20T08:30:00.000Z');
    const createdAt = new Date('2026-03-19T08:30:00.000Z');
    const updatedAt = new Date('2026-03-20T08:30:00.000Z');

    t.mock.method(ratingRepository, 'findById', async () => ({
        _id: 'rating-1',
        shopId: 'shop-1',
        reply: { text: 'Old reply' },
    }));
    t.mock.method(shopRepository, 'findByBarberUserId', async () => ({ _id: 'shop-1' }));

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
                photoMediaId: {
                    _id: 'media-customer-1',
                    r2Key: 'images/avatars/customer-1/profile.jpg',
                },
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

    const notificationEvents = await import('../notifications/notification-events.service.js');
    let notified = false;
    t.mock.method(notificationEvents.default, 'notifyRatingReply', async () => {
        notified = true;
    });

    const result = await ratingService.upsertReplyToRating('rating-1', '  Updated reply  ', 'owner-1');

    assert.deepEqual(updateArgs, {
        ratingId: 'rating-1',
        replyText: 'Updated reply',
        repliedBy: 'owner-1',
    });
    assert.equal(result.user.firstName, 'Ava');
    assert.equal(result.user.lastName, 'Customer');
    assert.match(
        result.user.photoUrl,
        /\/images\/avatars\/customer-1\/profile\.jpg\?exp=\d+&token=[a-f0-9]{64}$/,
    );
    assert.equal('email' in result.user, false);
    assert.deepEqual(result.reply, {
        text: 'Updated reply',
        repliedAt,
    });
    assert.equal(notified, false);
});

test('removeRating uses ForbiddenError when the rating belongs to a different shop', async (t) => {
    t.mock.method(ratingRepository, 'findById', async () => ({
        _id: 'rating-1',
        shopId: 'shop-2',
    }));
    t.mock.method(shopRepository, 'findByBarberUserId', async () => ({ _id: 'shop-1' }));

    await assert.rejects(
        () => ratingService.removeRating('rating-1', 'owner-1'),
        {
            name: 'ForbiddenError',
            message: 'You can only remove ratings on your own shop',
        },
    );
});
