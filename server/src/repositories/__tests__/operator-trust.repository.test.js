import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

import Booking from '../../models/booking.model.js';
import Employee from '../../models/employee.model.js';
import Media from '../../models/media.model.js';
import PaymentTransaction from '../../models/payment-transaction.model.js';
import PayoutTransaction from '../../models/payout-transaction.model.js';
import bookingRepository from '../booking.repository.js';
import employeeRepository from '../employee.repository.js';
import mediaRepository from '../media.repository.js';
import paymentRepository from '../payment.repository.js';
import payoutRepository from '../payout.repository.js';

const sanitize = (filter) => {
    mongoose.sanitizeFilter(filter);
    return filter;
};

test('bookingRepository.findByIds preserves the internal $in operator under sanitizeFilter', async (t) => {
    let capturedFilter = null;
    const query = {
        session() {
            return this;
        },
        populate() {
            return this;
        },
    };

    t.mock.method(Booking, 'find', (filter) => {
        capturedFilter = filter;
        return query;
    });

    await bookingRepository.findByIds(['booking-1', 'booking-2']);
    sanitize(capturedFilter);

    assert.deepEqual(capturedFilter._id.$in, ['booking-1', 'booking-2']);
});

test('bookingRepository.updateManyByIds preserves the internal $in operator under sanitizeFilter', async (t) => {
    let capturedFilter = null;

    t.mock.method(Booking, 'updateMany', async (filter) => {
        capturedFilter = filter;
        return { acknowledged: true };
    });

    await bookingRepository.updateManyByIds(['booking-1', 'booking-2'], { payoutStatus: 'pending' });
    sanitize(capturedFilter);

    assert.deepEqual(capturedFilter._id.$in, ['booking-1', 'booking-2']);
});

test('employeeRepository.claimSlots atomically rejects any occupied slot marker', async (t) => {
    let capturedFilter = null;
    let capturedUpdate = null;
    let capturedOptions = null;
    let capturedSelect = null;
    let capturedPopulate = null;
    const query = {
        select(fields) {
            capturedSelect = fields;
            return this;
        },
        populate(arg) {
            capturedPopulate = arg;
            return this;
        },
    };

    t.mock.method(Employee, 'findOneAndUpdate', (filter, update, options) => {
        capturedFilter = filter;
        capturedUpdate = update;
        capturedOptions = options;
        return query;
    });

    await employeeRepository.claimSlots(
        'employee-1',
        '2099-01-01',
        ['10:00', '10:30'],
        { shopId: 'shop-1' },
    );
    sanitize(capturedFilter);

    assert.equal(capturedFilter.bookedSlots.$not.$elemMatch.date, '2099-01-01');
    assert.deepEqual(capturedFilter.bookedSlots.$not.$elemMatch.time.$in, ['10:00', '10:30']);
    assert.deepEqual(capturedUpdate.$push.bookedSlots.$each, [
        { date: '2099-01-01', time: '10:00' },
        { date: '2099-01-01', time: '10:30' },
    ]);
    assert.equal(capturedFilter.shopId, 'shop-1');
    assert.deepEqual(capturedOptions, { returnDocument: 'after' });
    assert.equal(capturedSelect, 'firstName lastName photoMediaId');
    assert.deepEqual(capturedPopulate, { path: 'photoMediaId', select: 'r2Key' });
});

test('employeeRepository.claimTimeRange atomically rejects overlapping exact ranges', async (t) => {
    let capturedFilter = null;
    let capturedUpdate = null;
    let capturedOptions = null;
    let capturedSelect = null;
    let capturedPopulate = null;
    const query = {
        select(fields) {
            capturedSelect = fields;
            return this;
        },
        populate(arg) {
            capturedPopulate = arg;
            return this;
        },
    };

    t.mock.method(Employee, 'findOneAndUpdate', (filter, update, options) => {
        capturedFilter = filter;
        capturedUpdate = update;
        capturedOptions = options;
        return query;
    });

    await employeeRepository.claimTimeRange(
        'employee-1',
        {
            bookingId: 'booking-1',
            date: '2099-01-01',
            startTime: '10:15',
            endTime: '11:20',
            startMinute: 615,
            endMinute: 680,
            slotLockTimes: ['10:15', '10:45', '11:15'],
        },
        { shopId: 'shop-1' },
    );
    sanitize(capturedFilter);

    const noOverlapFilter = capturedFilter.$and[0].bookedRanges.$not.$elemMatch;
    assert.equal(noOverlapFilter.date, '2099-01-01');
    assert.equal(noOverlapFilter.startMinute.$lt, 680);
    assert.equal(noOverlapFilter.endMinute.$gt, 615);
    assert.deepEqual(capturedUpdate.$push.bookedRanges, {
        bookingId: 'booking-1',
        date: '2099-01-01',
        startTime: '10:15',
        endTime: '11:20',
        startMinute: 615,
        endMinute: 680,
    });
    assert.deepEqual(capturedUpdate.$push.bookedSlots.$each, [
        { date: '2099-01-01', time: '10:15' },
        { date: '2099-01-01', time: '10:45' },
        { date: '2099-01-01', time: '11:15' },
    ]);
    assert.equal(capturedFilter.shopId, 'shop-1');
    assert.deepEqual(capturedOptions, { returnDocument: 'after', runValidators: true });
    assert.equal(capturedSelect, 'firstName lastName photoMediaId workingHours');
    assert.deepEqual(capturedPopulate, { path: 'photoMediaId', select: 'r2Key' });
});

test('paymentRepository.findPendingByBookingId preserves its internal $in operator under sanitizeFilter', async (t) => {
    let capturedFilter = null;
    let capturedSort = null;
    const query = {
        sort(sortArg) {
            capturedSort = sortArg;
            return this;
        },
    };

    t.mock.method(PaymentTransaction, 'findOne', (filter) => {
        capturedFilter = filter;
        return query;
    });

    await paymentRepository.findPendingByBookingId('booking-1');
    sanitize(capturedFilter);

    assert.deepEqual(capturedFilter.status.$in, ['initiated', 'pending']);
    assert.deepEqual(capturedSort, { createdAt: -1 });
});

test('mediaRepository.findByIdAndUser preserves status operators under sanitizeFilter', async (t) => {
    let capturedFilter = null;

    t.mock.method(Media, 'findOne', (filter) => {
        capturedFilter = filter;
        return null;
    });

    await mediaRepository.findByIdAndUser('media-1', 'user-1', { status: { $ne: 'deleted' } });
    sanitize(capturedFilter);

    assert.equal(capturedFilter.status.$ne, 'deleted');
});

test('mediaRepository.softDeleteByIdAndUser preserves its status operator under sanitizeFilter', async (t) => {
    let capturedFilter = null;

    t.mock.method(Media, 'findOneAndUpdate', (filter) => {
        capturedFilter = filter;
        return null;
    });

    await mediaRepository.softDeleteByIdAndUser('media-1', 'user-1');
    sanitize(capturedFilter);

    assert.equal(capturedFilter.status.$ne, 'deleted');
});

test('mediaRepository.findExpiredPending preserves its createdAt operator under sanitizeFilter', async (t) => {
    let capturedFilter = null;
    let capturedLimit = null;
    const cutoff = new Date('2026-05-12T13:00:00.000Z');
    const query = {
        limit(limitArg) {
            capturedLimit = limitArg;
            return this;
        },
    };

    t.mock.method(Media, 'find', (filter) => {
        capturedFilter = filter;
        return query;
    });

    await mediaRepository.findExpiredPending(cutoff, 25);
    sanitize(capturedFilter);

    assert.equal(capturedFilter.createdAt.$lt, cutoff);
    assert.equal(capturedLimit, 25);
});

test('paymentRepository.findCompletedByBookingIds preserves its internal $in operator under sanitizeFilter', async (t) => {
    let capturedFilter = null;

    t.mock.method(PaymentTransaction, 'find', (filter) => {
        capturedFilter = filter;
        return [];
    });

    await paymentRepository.findCompletedByBookingIds(['booking-1', 'booking-2']);
    sanitize(capturedFilter);

    assert.deepEqual(capturedFilter.bookingId.$in, ['booking-1', 'booking-2']);
});

test('bookingRepository.aggregateAppointmentAnalyticsByMonth groups completed and no-show bookings by UTC month', async (t) => {
    let capturedPipeline = null;
    const startDate = new Date('2025-11-01T00:00:00.000Z');
    const endDate = new Date('2026-05-01T00:00:00.000Z');

    t.mock.method(Booking, 'aggregate', async (pipeline) => {
        capturedPipeline = pipeline;
        return [{ year: 2026, month: 4, count: 2 }];
    });

    const result = await bookingRepository.aggregateAppointmentAnalyticsByMonth('shop-1', startDate, endDate);

    assert.deepEqual(result, [{ year: 2026, month: 4, count: 2 }]);
    assert.equal(capturedPipeline[0].$match.shopId, 'shop-1');
    assert.deepEqual(capturedPipeline[0].$match.status.$in, ['completed', 'no-show']);
    assert.equal(capturedPipeline[0].$match.date.$gte, startDate);
    assert.equal(capturedPipeline[0].$match.date.$lt, endDate);
    assert.deepEqual(capturedPipeline[1].$group._id.year, {
        $year: { date: '$date', timezone: 'UTC' },
    });
    assert.deepEqual(capturedPipeline[1].$group._id.month, {
        $month: { date: '$date', timezone: 'UTC' },
    });
    assert.deepEqual(capturedPipeline.at(-1), { $sort: { year: 1, month: 1 } });
});

test('paymentRepository.aggregateIncomeByMonth groups completed barber payout by UTC payment month', async (t) => {
    let capturedPipeline = null;
    const startDate = new Date('2025-11-01T00:00:00.000Z');
    const endDate = new Date('2026-05-01T00:00:00.000Z');

    t.mock.method(PaymentTransaction, 'aggregate', async (pipeline) => {
        capturedPipeline = pipeline;
        return [{ year: 2026, month: 4, amount: 17200 }];
    });

    const result = await paymentRepository.aggregateIncomeByMonth('shop-1', startDate, endDate);

    assert.deepEqual(result, [{ year: 2026, month: 4, amount: 17200 }]);
    assert.equal(capturedPipeline[0].$match.shopId, 'shop-1');
    assert.equal(capturedPipeline[0].$match.status, 'completed');
    assert.equal(capturedPipeline[0].$match.createdAt.$gte, startDate);
    assert.equal(capturedPipeline[0].$match.createdAt.$lt, endDate);
    assert.deepEqual(capturedPipeline[1].$group._id.year, {
        $year: { date: '$createdAt', timezone: 'UTC' },
    });
    assert.deepEqual(capturedPipeline[1].$group.amountInPaisa.$sum, {
        $ifNull: [
            '$settlement.barberPayout',
            { $ifNull: ['$settlement.serviceAmount', '$amount'] },
        ],
    });
    assert.deepEqual(capturedPipeline.at(-1), { $sort: { year: 1, month: 1 } });
});

test('paymentRepository.markSettledByIds preserves its internal $in operator under sanitizeFilter', async (t) => {
    let capturedFilter = null;

    t.mock.method(PaymentTransaction, 'updateMany', async (filter) => {
        capturedFilter = filter;
        return { acknowledged: true };
    });

    await paymentRepository.markSettledByIds(['payment-1', 'payment-2']);
    sanitize(capturedFilter);

    assert.deepEqual(capturedFilter._id.$in, ['payment-1', 'payment-2']);
});

test('paymentRepository.findStalePayments preserves date and attempt operators under sanitizeFilter', async (t) => {
    let capturedFilter = null;
    let capturedLimit = null;
    const olderThan = new Date('2026-04-23T09:10:00.000Z');
    const notOlderThan = new Date('2026-04-22T09:40:00.000Z');
    const query = {
        limit(limitArg) {
            capturedLimit = limitArg;
            return this;
        },
    };

    t.mock.method(PaymentTransaction, 'find', (filter) => {
        capturedFilter = filter;
        return query;
    });

    await paymentRepository.findStalePayments(olderThan, notOlderThan, 10);
    sanitize(capturedFilter);

    assert.equal(capturedFilter.createdAt.$lt, olderThan);
    assert.equal(capturedFilter.createdAt.$gt, notOlderThan);
    assert.equal(capturedFilter.pollAttempts.$lt, 10);
    assert.equal(capturedLimit, 50);
});

test('paymentRepository.findExpirablePendingPayments preserves expiry and fallback filters under sanitizeFilter', async (t) => {
    let capturedFilter = null;
    const expiresBefore = new Date('2026-04-23T10:00:00.000Z');
    const fallbackCreatedBefore = new Date('2026-04-23T09:40:00.000Z');
    const query = {
        limit() {
            return this;
        },
    };

    t.mock.method(PaymentTransaction, 'find', (filter) => {
        capturedFilter = filter;
        return query;
    });

    await paymentRepository.findExpirablePendingPayments(expiresBefore, fallbackCreatedBefore);
    sanitize(capturedFilter);

    assert.deepEqual(capturedFilter.status.$in, ['initiated', 'pending']);
    assert.equal(capturedFilter.$or[0].expiresAt.$lte, expiresBefore);
    assert.equal(capturedFilter.$or[1].expiresAt, null);
    assert.equal(capturedFilter.$or[1].createdAt.$lt, fallbackCreatedBefore);
});

test('payoutRepository.findStuckPayouts preserves its createdAt operator under sanitizeFilter', async (t) => {
    let capturedFilter = null;
    const olderThan = new Date('2026-04-23T09:30:30.744Z');
    const query = {
        limit() {
            return this;
        },
    };

    t.mock.method(PayoutTransaction, 'find', (filter) => {
        capturedFilter = filter;
        return query;
    });

    await payoutRepository.findStuckPayouts(olderThan);
    sanitize(capturedFilter);

    assert.equal(capturedFilter.createdAt.$lt, olderThan);
});
