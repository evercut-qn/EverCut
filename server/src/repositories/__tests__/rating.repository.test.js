import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import Rating from '../../models/rating.model.js';
import ratingRepository from '../rating.repository.js';

const stubMethod = (target, methodName, implementation) => {
    const original = target[methodName];
    target[methodName] = implementation;
    return () => {
        target[methodName] = original;
    };
};

const captureReplyFilter = async (methodName, ...args) => {
    let capturedFilter = null;

    const restore = stubMethod(Rating, 'findOneAndUpdate', (filter) => {
        capturedFilter = filter;
        return {
            populate() {
                return this;
            },
        };
    });

    try {
        await ratingRepository[methodName](...args);
        return capturedFilter;
    } finally {
        restore();
    }
};

test('addReply trusts the internal $exists filter before passing it to Mongoose', async () => {
    const filter = await captureReplyFilter(
        'addReply',
        new mongoose.Types.ObjectId().toString(),
        'Thanks for visiting',
        new mongoose.Types.ObjectId().toString(),
    );

    mongoose.sanitizeFilter(filter);

    assert.equal(filter['reply.text'].$exists, false);
});

test('updateReply trusts the internal $exists filter before passing it to Mongoose', async () => {
    const filter = await captureReplyFilter(
        'updateReply',
        new mongoose.Types.ObjectId().toString(),
        'Updated reply',
    );

    mongoose.sanitizeFilter(filter);

    assert.equal(filter['reply.text'].$exists, true);
});

test('deleteReply trusts the internal $exists filter before passing it to Mongoose', async () => {
    const filter = await captureReplyFilter(
        'deleteReply',
        new mongoose.Types.ObjectId().toString(),
    );

    mongoose.sanitizeFilter(filter);

    assert.equal(filter['reply.text'].$exists, true);
});
