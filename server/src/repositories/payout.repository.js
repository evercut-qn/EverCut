import PayoutTransaction from '../models/payout-transaction.model.js';
import { PAYOUT_TRANSACTION_STATUS } from '../utils/constants.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';

class PayoutRepository {
    createId() {
        return new PayoutTransaction()._id;
    }

    async create(data, options = {}) {
        if (options.session) {
            const [doc] = await PayoutTransaction.create([data], options);
            return doc;
        }
        return PayoutTransaction.create(data);
    }

    async findById(id, options = {}) {
        return PayoutTransaction.findById(id).session(options.session || null);
    }

    async findByUtr(utr) {
        return PayoutTransaction.findOne({ utr });
    }

    async findLatestByBookingId(bookingId) {
        return PayoutTransaction.findOne({
            bookingIds: bookingId,
        }).sort({ createdAt: -1 });
    }

    async findByTransferId(transferId) {
        return PayoutTransaction.findOne({ transferId });
    }

    async updateById(id, updates, options = {}) {
        const queryOptions = { returnDocument: 'after' };
        if (options.session) queryOptions.session = options.session;
        return PayoutTransaction.findByIdAndUpdate(id, { $set: updates }, queryOptions);
    }

    async findAllFiltered(filter = {}, { skip, limit, sort } = {}) {
        const query = PayoutTransaction.find(trustQueryOperators(filter))
            .populate('barberId', 'firstName lastName upiId accountHolderName')
            .populate('shopId', 'shopName')
            .sort(sort || { createdAt: -1 });
        if (skip !== undefined) query.skip(skip);
        if (limit !== undefined) query.limit(limit);
        return query;
    }

    async countAll(filter = {}) {
        return PayoutTransaction.countDocuments(trustQueryOperators(filter));
    }

    async aggregateAdminSummary() {
        return PayoutTransaction.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmountInPaisa: { $sum: '$amount' },
                },
            },
            {
                $project: {
                    _id: 0,
                    status: '$_id',
                    count: 1,
                    totalAmountInRupees: { $divide: ['$totalAmountInPaisa', 100] },
                },
            },
            { $sort: { status: 1 } },
        ]);
    }

    async findByIdPopulated(id) {
        return PayoutTransaction.findById(id)
            .populate('barberId', 'firstName lastName upiId accountHolderName')
            .populate('shopId', 'shopName')
            .populate('bookingIds', 'date time status paymentStatus payoutStatus totalAmount barberUtr payoutCompletedAt')
            .populate('paymentTransactionIds', 'bookingId customerId shopId merchantOrderId amount amountInRupees status settlement')
            .populate('completedByAdminId', 'email phoneNumber roleType');
    }

    async findStuckPayouts(olderThan) {
        return PayoutTransaction.find(trustQueryOperators({
            status: PAYOUT_TRANSACTION_STATUS.PENDING,
            createdAt: { $lt: olderThan },
        })).limit(50);
    }
}

export default new PayoutRepository();
