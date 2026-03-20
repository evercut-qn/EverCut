import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import bookingRepository from '../../repositories/booking.repository.js';
import customerRepository from '../../repositories/customer.repository.js';
import ratingRepository from '../../repositories/rating.repository.js';
import shopRepository from '../../repositories/shop.repository.js';
import {
    addRating,
    addReplyToRating,
    getRatingSummary,
    getRatingsByShop,
    removeRating,
} from '../rating.service.js';
import {
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
} from '../../utils/api-error.js';
import { addRatingSchema, addReplySchema } from '../../validators/rating.validator.js';

const objectId = () => new mongoose.Types.ObjectId();

const stubMethod = (target, methodName, implementation) => {
    const original = target[methodName];
    target[methodName] = implementation;
    return () => {
        target[methodName] = original;
    };
};

test('addRating rejects customers who have no completed booking at the target shop', async () => {
    const shopId = objectId();
    const customerId = objectId();

    const restore = [
        stubMethod(customerRepository, 'findByUserId', async () => ({ _id: customerId })),
        stubMethod(shopRepository, 'findById', async () => ({ _id: shopId })),
        stubMethod(ratingRepository, 'findByCustomerAndShop', async () => null),
        stubMethod(bookingRepository, 'hasCompletedBooking', async () => false),
    ];

    try {
        await assert.rejects(
            () => addRating(objectId(), shopId.toString(), 5, 'Great service'),
            (error) => {
                assert.ok(error instanceof BadRequestError);
                assert.equal(error.message, 'You can only rate a shop after completing a booking there');
                return true;
            },
        );
    } finally {
        restore.reverse().forEach((undo) => undo());
    }
});

test('addRating converts duplicate key writes into a conflict error', async () => {
    const shopId = objectId();
    const customerId = objectId();

    const restore = [
        stubMethod(customerRepository, 'findByUserId', async () => ({ _id: customerId })),
        stubMethod(shopRepository, 'findById', async () => ({ _id: shopId })),
        stubMethod(ratingRepository, 'findByCustomerAndShop', async () => null),
        stubMethod(bookingRepository, 'hasCompletedBooking', async () => true),
        stubMethod(ratingRepository, 'create', async () => {
            const error = new Error('duplicate key');
            error.code = 11000;
            throw error;
        }),
    ];

    try {
        await assert.rejects(
            () => addRating(objectId(), shopId.toString(), 5, 'Great service'),
            (error) => {
                assert.ok(error instanceof ConflictError);
                assert.equal(error.message, 'You have already rated this shop');
                return true;
            },
        );
    } finally {
        restore.reverse().forEach((undo) => undo());
    }
});

test('getRatingsByShop requires the shop to exist and omits reviewer email from the payload', async () => {
    const shopId = objectId();
    const createdAt = new Date('2026-03-20T10:00:00.000Z');

    let restore = [
        stubMethod(shopRepository, 'findById', async () => null),
    ];

    try {
        await assert.rejects(
            () => getRatingsByShop(shopId.toString(), { page: 1, limit: 10 }),
            (error) => {
                assert.ok(error instanceof NotFoundError);
                assert.equal(error.message, 'Shop not found');
                return true;
            },
        );
    } finally {
        restore.reverse().forEach((undo) => undo());
    }

    restore = [
        stubMethod(shopRepository, 'findById', async () => ({ _id: shopId })),
        stubMethod(ratingRepository, 'countByShop', async () => 1),
        stubMethod(ratingRepository, 'findByShop', async () => [
            {
                _id: objectId(),
                rating: 5,
                review: 'Great service',
                customerId: {
                    firstName: 'Ava',
                    lastName: 'Customer',
                    photoUrl: 'https://example.com/customer.jpg',
                    userId: { email: 'private@example.com' },
                },
                reply: {
                    text: 'Thanks for visiting',
                    repliedAt: createdAt,
                },
                createdAt,
            },
        ]),
    ];

    try {
        const result = await getRatingsByShop(shopId.toString(), { page: 1, limit: 10 });

        assert.equal(result.items.length, 1);
        assert.deepEqual(result.items[0], {
            ratingId: result.items[0].ratingId,
            rating: 5,
            review: 'Great service',
            user: {
                firstName: 'Ava',
                lastName: 'Customer',
                photoUrl: 'https://example.com/customer.jpg',
            },
            reply: {
                text: 'Thanks for visiting',
                repliedAt: createdAt,
            },
            createdAt,
        });
        assert.equal('email' in result.items[0].user, false);
    } finally {
        restore.reverse().forEach((undo) => undo());
    }
});

test('getRatingSummary rejects unknown shops', async () => {
    const restore = [
        stubMethod(shopRepository, 'findById', async () => null),
    ];

    try {
        await assert.rejects(
            () => getRatingSummary(objectId().toString()),
            (error) => {
                assert.ok(error instanceof NotFoundError);
                assert.equal(error.message, 'Shop not found');
                return true;
            },
        );
    } finally {
        restore.reverse().forEach((undo) => undo());
    }
});

test('addReplyToRating rejects duplicate replies and trims successful replies', async () => {
    const shopId = objectId();
    const ownerId = objectId();
    const ratingId = objectId();

    let restore = [
        stubMethod(ratingRepository, 'findById', async () => ({
            _id: ratingId,
            shopId,
            reply: { text: 'Existing reply' },
        })),
        stubMethod(shopRepository, 'findByOwnerId', async () => ({ _id: shopId })),
    ];

    try {
        await assert.rejects(
            () => addReplyToRating(ratingId.toString(), 'New reply', ownerId.toString()),
            (error) => {
                assert.ok(error instanceof ConflictError);
                assert.equal(error.message, 'Reply already exists for this rating');
                return true;
            },
        );
    } finally {
        restore.reverse().forEach((undo) => undo());
    }

    let capturedReplyText = null;
    restore = [
        stubMethod(ratingRepository, 'findById', async () => ({
            _id: ratingId,
            shopId,
            reply: null,
        })),
        stubMethod(shopRepository, 'findByOwnerId', async () => ({ _id: shopId })),
        stubMethod(ratingRepository, 'addReply', async (_ratingId, replyText) => {
            capturedReplyText = replyText;
            return {
                _id: ratingId,
                shopId,
                rating: 5,
                review: 'Great service',
                customerId: {
                    firstName: 'Ava',
                    lastName: 'Customer',
                    photoUrl: null,
                },
                reply: {
                    text: replyText,
                    repliedAt: new Date('2026-03-20T11:00:00.000Z'),
                },
                createdAt: new Date('2026-03-20T10:00:00.000Z'),
            };
        }),
    ];

    try {
        const result = await addReplyToRating(ratingId.toString(), '  Thanks for coming in.  ', ownerId.toString());

        assert.equal(capturedReplyText, 'Thanks for coming in.');
        assert.equal(result.reply.text, 'Thanks for coming in.');
    } finally {
        restore.reverse().forEach((undo) => undo());
    }
});

test('removeRating uses forbidden semantics when a barber targets another shop', async () => {
    const ratingId = objectId();
    const ratingShopId = objectId();
    const ownedShopId = objectId();

    const restore = [
        stubMethod(ratingRepository, 'findById', async () => ({ _id: ratingId, shopId: ratingShopId })),
        stubMethod(shopRepository, 'findByOwnerId', async () => ({ _id: ownedShopId })),
    ];

    try {
        await assert.rejects(
            () => removeRating(ratingId.toString(), objectId().toString()),
            (error) => {
                assert.ok(error instanceof ForbiddenError);
                assert.equal(error.message, 'You can only remove ratings on your own shop');
                return true;
            },
        );
    } finally {
        restore.reverse().forEach((undo) => undo());
    }
});

test('rating validators trim review text and reject whitespace-only replies', () => {
    const validatedRating = addRatingSchema.validate({
        shopId: objectId().toString(),
        rating: 5,
        review: '  Excellent fade.  ',
    });
    const validatedReply = addReplySchema.validate({
        replyText: '   ',
    });

    assert.equal(validatedRating.error, undefined);
    assert.equal(validatedRating.value.review, 'Excellent fade.');

    assert.ok(validatedReply.error);
    assert.equal(validatedReply.error.details[0].message, 'Reply text is required');
});
