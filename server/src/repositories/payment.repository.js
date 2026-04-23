import PaymentTransaction from '../models/payment-transaction.model.js';
import { PAYMENT_TRANSACTION_STATUS } from '../utils/constants.js';

class PaymentRepository {
    async create(data) {
        return PaymentTransaction.create(data);
    }

    async findById(id) {
        return PaymentTransaction.findById(id);
    }

    async findByMerchantOrderId(merchantOrderId) {
        return PaymentTransaction.findOne({ merchantOrderId });
    }

    async findPendingByBookingId(bookingId) {
        return PaymentTransaction.findOne({
            bookingId,
            status: {
                $in: [
                    PAYMENT_TRANSACTION_STATUS.INITIATED,
                    PAYMENT_TRANSACTION_STATUS.PENDING,
                ],
            },
        }).sort({ createdAt: -1 });
    }

    async findCompletedByBookingId(bookingId) {
        return PaymentTransaction.findOne({
            bookingId,
            status: PAYMENT_TRANSACTION_STATUS.COMPLETED,
        }).sort({ createdAt: -1 });
    }

    async findCompletedByBookingIds(bookingIds) {
        return PaymentTransaction.find({
            bookingId: { $in: bookingIds },
            status: PAYMENT_TRANSACTION_STATUS.COMPLETED,
        });
    }

    async findLatestByBookingId(bookingId) {
        return PaymentTransaction.findOne({ bookingId }).sort({ createdAt: -1 });
    }

    async updateById(id, updates) {
        return PaymentTransaction.findByIdAndUpdate(id, { $set: updates }, { new: true });
    }

    async updateStatus(id, status, additionalFields = {}) {
        return PaymentTransaction.findByIdAndUpdate(
            id,
            { $set: { status, ...additionalFields } },
            { new: true },
        );
    }

    async markSettledByIds(ids, settledAt = new Date()) {
        return PaymentTransaction.updateMany(
            { _id: { $in: ids } },
            {
                $set: {
                    'settlement.settled': true,
                    'settlement.settledAt': settledAt,
                },
            },
        );
    }

    async findStalePayments(olderThan, notOlderThan, maxAttempts) {
        return PaymentTransaction.find({
            status: PAYMENT_TRANSACTION_STATUS.PENDING,
            createdAt: { $lt: olderThan, $gt: notOlderThan },
            pollAttempts: { $lt: maxAttempts },
        }).limit(50);
    }

    async findExpirablePendingPayments(olderThan) {
        return PaymentTransaction.find({
            status: {
                $in: [
                    PAYMENT_TRANSACTION_STATUS.INITIATED,
                    PAYMENT_TRANSACTION_STATUS.PENDING,
                ],
            },
            createdAt: { $lt: olderThan },
        }).limit(50);
    }
}

export default new PaymentRepository();
