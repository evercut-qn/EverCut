import PayoutTransaction from '../models/payout-transaction.model.js';
import { PAYOUT_TRANSACTION_STATUS } from '../utils/constants.js';

class PayoutRepository {
    async create(data) {
        return PayoutTransaction.create(data);
    }

    async findById(id) {
        return PayoutTransaction.findById(id);
    }

    async findLatestByBookingId(bookingId) {
        return PayoutTransaction.findOne({
            bookingIds: bookingId,
        }).sort({ createdAt: -1 });
    }

    async findByTransferId(transferId) {
        return PayoutTransaction.findOne({ transferId });
    }

    async updateById(id, updates) {
        return PayoutTransaction.findByIdAndUpdate(id, { $set: updates }, { new: true });
    }

    async findStuckPayouts(olderThan) {
        return PayoutTransaction.find({
            status: PAYOUT_TRANSACTION_STATUS.PENDING,
            createdAt: { $lt: olderThan },
        }).limit(50);
    }
}

export default new PayoutRepository();
