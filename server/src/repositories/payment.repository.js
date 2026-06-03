import PaymentTransaction from '../models/payment-transaction.model.js';
import { PAYMENT_TRANSACTION_STATUS } from '../utils/constants.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';

class PaymentRepository {
    async create(data) {
        return PaymentTransaction.create(data);
    }

    async findById(id) {
        return PaymentTransaction.findById(id);
    }

    async findByIdForEarnings(id) {
        return PaymentTransaction.findById(id)
            .populate({
                path: 'bookingId',
                select: 'date time status paymentStatus totalAmount customerId employeeId serviceIds',
                populate: [
                    {
                        path: 'customerId',
                        select: 'firstName lastName userId',
                        populate: { path: 'userId', select: 'phoneNumber' },
                    },
                    {
                        path: 'employeeId',
                        select: 'firstName lastName',
                        options: { includeDeleted: true },
                    },
                    {
                        path: 'serviceIds',
                        select: 'serviceName actualPrice offerPrice finalPrice duration',
                    },
                ],
            });
    }

    async findByMerchantOrderId(merchantOrderId) {
        return PaymentTransaction.findOne({ merchantOrderId });
    }

    async findAll(filter = {}, options = {}) {
        const query = PaymentTransaction.find(trustQueryOperators(filter))
            .sort({ createdAt: -1 })
            .populate('bookingId', 'date time status paymentStatus totalAmount')
            .populate('customerId', 'firstName lastName userId')
            .populate('shopId', 'shopName barberId');

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async findAllForEarnings(filter = {}, options = {}) {
        const query = PaymentTransaction.find(trustQueryOperators(filter))
            .sort({ createdAt: -1 })
            .populate({
                path: 'bookingId',
                select: 'date time status paymentStatus totalAmount customerId employeeId serviceIds',
                populate: [
                    {
                        path: 'customerId',
                        select: 'firstName lastName userId',
                        populate: { path: 'userId', select: 'phoneNumber' },
                    },
                    {
                        path: 'employeeId',
                        select: 'firstName lastName',
                        options: { includeDeleted: true },
                    },
                    {
                        path: 'serviceIds',
                        select: 'serviceName actualPrice offerPrice finalPrice duration',
                    },
                ],
            })
            .populate('customerId', 'firstName lastName userId')
            .populate('shopId', 'shopName barberId');

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async countAll(filter = {}) {
        return PaymentTransaction.countDocuments(trustQueryOperators(filter));
    }

    async aggregateAdminSummary({ trendStartDate } = {}) {
        const [statusRows, [totals = {}], monthlyTrend] = await Promise.all([
            PaymentTransaction.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $project: { _id: 0, status: '$_id', count: 1 } },
                { $sort: { status: 1 } },
            ]),
            PaymentTransaction.aggregate([
                {
                    $group: {
                        _id: null,
                        totalPayments: { $sum: 1 },
                        successCount: {
                            $sum: { $cond: [{ $eq: ['$status', PAYMENT_TRANSACTION_STATUS.COMPLETED] }, 1, 0] },
                        },
                        failedCount: {
                            $sum: { $cond: [{ $eq: ['$status', PAYMENT_TRANSACTION_STATUS.FAILED] }, 1, 0] },
                        },
                        customerPaymentsCollectedInPaisa: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$status', PAYMENT_TRANSACTION_STATUS.COMPLETED] },
                                    '$amount',
                                    0,
                                ],
                            },
                        },
                        platformFeesCollectedInPaisa: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$status', PAYMENT_TRANSACTION_STATUS.COMPLETED] },
                                    { $ifNull: ['$settlement.platformFee', 0] },
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]),
            PaymentTransaction.aggregate([
                {
                    $match: {
                        status: PAYMENT_TRANSACTION_STATUS.COMPLETED,
                        createdAt: { $gte: trendStartDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: { date: '$createdAt', timezone: 'UTC' } },
                            month: { $month: { date: '$createdAt', timezone: 'UTC' } },
                        },
                        amountInPaisa: { $sum: '$amount' },
                        platformFeeInPaisa: { $sum: { $ifNull: ['$settlement.platformFee', 0] } },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        year: '$_id.year',
                        month: '$_id.month',
                        customerPaymentsCollectedInRupees: { $divide: ['$amountInPaisa', 100] },
                        platformFeeInRupees: { $divide: ['$platformFeeInPaisa', 100] },
                    },
                },
                { $sort: { year: 1, month: 1 } },
            ]),
        ]);

        return { statusRows, totals, monthlyTrend };
    }

    async findRefunds(filter = {}, options = {}) {
        const query = PaymentTransaction.find(trustQueryOperators({
            ...filter,
            refund: { $ne: null },
        }))
            .sort({ 'refund.initiatedAt': -1, createdAt: -1 })
            .populate('bookingId', 'date time status paymentStatus payoutStatus totalAmount')
            .populate('customerId', 'firstName lastName userId')
            .populate('shopId', 'shopName barberId');

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async countRefunds(filter = {}) {
        return PaymentTransaction.countDocuments(trustQueryOperators({
            ...filter,
            refund: { $ne: null },
        }));
    }

    async aggregateIncomeByMonth(shopId, startDate, endDate) {
        return PaymentTransaction.aggregate([
            {
                $match: {
                    shopId,
                    status: PAYMENT_TRANSACTION_STATUS.COMPLETED,
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: { date: '$createdAt', timezone: 'UTC' } },
                        month: { $month: { date: '$createdAt', timezone: 'UTC' } },
                    },
                    amountInPaisa: {
                        $sum: {
                            $ifNull: [
                                '$settlement.barberPayout',
                                { $ifNull: ['$settlement.serviceAmount', '$amount'] },
                            ],
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    amount: { $divide: ['$amountInPaisa', 100] },
                },
            },
            { $sort: { year: 1, month: 1 } },
        ]);
    }

    async countActiveWaiverReservations(customerId) {
        return PaymentTransaction.countDocuments(trustQueryOperators({
            customerId,
            waiverApplied: true,
            status: {
                $in: [
                    PAYMENT_TRANSACTION_STATUS.INITIATED,
                    PAYMENT_TRANSACTION_STATUS.PENDING,
                ],
            },
        }));
    }

    async findPendingByBookingId(bookingId) {
        return PaymentTransaction.findOne(trustQueryOperators({
            bookingId,
            status: {
                $in: [
                    PAYMENT_TRANSACTION_STATUS.INITIATED,
                    PAYMENT_TRANSACTION_STATUS.PENDING,
                ],
            },
        })).sort({ createdAt: -1 });
    }

    async findCompletedByBookingId(bookingId) {
        return PaymentTransaction.findOne(trustQueryOperators({
            bookingId,
            status: {
                $in: [
                    PAYMENT_TRANSACTION_STATUS.COMPLETED,
                    PAYMENT_TRANSACTION_STATUS.REFUND_FAILED,
                ],
            },
        })).sort({ createdAt: -1 });
    }

    async findCompletedByBookingIds(bookingIds) {
        return PaymentTransaction.find(trustQueryOperators({
            bookingId: { $in: bookingIds },
            status: PAYMENT_TRANSACTION_STATUS.COMPLETED,
        }));
    }

    async findLatestByBookingId(bookingId) {
        return PaymentTransaction.findOne({ bookingId }).sort({ createdAt: -1 });
    }

    async updateById(id, updates) {
        return PaymentTransaction.findByIdAndUpdate(id, { $set: updates }, { returnDocument: 'after' });
    }

    async updateStatus(id, status, additionalFields = {}) {
        return PaymentTransaction.findByIdAndUpdate(
            id,
            { $set: { status, ...additionalFields } },
            { returnDocument: 'after' },
        );
    }

    async markSettledByIds(ids, settledAt = new Date(), options = {}) {
        const queryOptions = {};
        if (options.session) queryOptions.session = options.session;
        return PaymentTransaction.updateMany(
            trustQueryOperators({ _id: { $in: ids } }),
            {
                $set: {
                    'settlement.settled': true,
                    'settlement.settledAt': settledAt,
                },
            },
            queryOptions,
        );
    }

    async markUnsettledByIds(ids, options = {}) {
        const queryOptions = {};
        if (options.session) queryOptions.session = options.session;
        return PaymentTransaction.updateMany(
            trustQueryOperators({ _id: { $in: ids } }),
            {
                $set: {
                    'settlement.settled': false,
                    'settlement.settledAt': null,
                },
            },
            queryOptions,
        );
    }

    async findStalePayments(olderThan, notOlderThan, maxAttempts) {
        return PaymentTransaction.find(trustQueryOperators({
            status: PAYMENT_TRANSACTION_STATUS.PENDING,
            createdAt: { $lt: olderThan, $gt: notOlderThan },
            pollAttempts: { $lt: maxAttempts },
        })).limit(50);
    }

    async findExpirablePendingPayments(expiresBefore, fallbackCreatedBefore = expiresBefore) {
        return PaymentTransaction.find(trustQueryOperators({
            status: {
                $in: [
                    PAYMENT_TRANSACTION_STATUS.INITIATED,
                    PAYMENT_TRANSACTION_STATUS.PENDING,
                ],
            },
            $or: [
                { expiresAt: { $lte: expiresBefore } },
                {
                    expiresAt: null,
                    createdAt: { $lt: fallbackCreatedBefore },
                },
            ],
        })).limit(50);
    }
}

export default new PaymentRepository();
