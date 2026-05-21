import SubscriptionTransaction from '../models/subscription-transaction.model.js';

class SubscriptionTransactionRepository {
    async create(data) {
        return SubscriptionTransaction.create(data);
    }

    async existsByWebhookEventId(webhookEventId) {
        if (!webhookEventId) return false;
        return SubscriptionTransaction.exists({ webhookEventId });
    }

    async findBySubscriptionId(subscriptionId, { limit = 50, skip = 0 } = {}) {
        return SubscriptionTransaction.find({ subscriptionId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    }

    async findByBarberId(barberId, { limit = 20, skip = 0 } = {}) {
        return SubscriptionTransaction.find({ barberId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    }

    async countByBarberId(barberId) {
        return SubscriptionTransaction.countDocuments({ barberId });
    }
}

export default new SubscriptionTransactionRepository();
