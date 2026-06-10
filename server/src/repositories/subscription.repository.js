import Subscription from '../models/subscription.model.js';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_STATUSES } from '../utils/constants.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';

class SubscriptionRepository {
    async create(data) {
        return Subscription.create(data);
    }

    async findById(id) {
        return Subscription.findById(id);
    }

    async findByBarberId(barberId) {
        return Subscription.findOne({ barberId });
    }

    async findByRazorpaySubscriptionId(razorpaySubscriptionId) {
        return Subscription.findOne({ razorpaySubscriptionId });
    }

    async updateById(id, updateData, options = {}) {
        return Subscription.findByIdAndUpdate(
            id,
            this.#normalizeUpdate(updateData),
            { returnDocument: 'after', runValidators: true, ...options },
        );
    }

    async updateByBarberId(barberId, updateData, options = {}) {
        return Subscription.findOneAndUpdate(
            { barberId },
            this.#normalizeUpdate(updateData),
            { returnDocument: 'after', runValidators: true, ...options },
        );
    }

    async upsertDefaultForBarber(barberId, source = 'MIGRATION') {
        return Subscription.findOneAndUpdate(
            { barberId },
            {
                $setOnInsert: {
                    barberId,
                    planId: SUBSCRIPTION_PLANS.BASIC,
                    status: SUBSCRIPTION_STATUSES.ACTIVE,
                    metadata: { source },
                },
            },
            {
                upsert: true,
                returnDocument: 'after',
                runValidators: true,
            },
        );
    }

    async incrementPhotoCounter(barberId) {
        return Subscription.findOneAndUpdate(
            { barberId },
            { $inc: { totalPhotosUploaded: 1 } },
            { returnDocument: 'after', runValidators: true },
        );
    }

    async incrementVideoCounter(barberId) {
        return Subscription.findOneAndUpdate(
            { barberId },
            { $inc: { totalVideosUploaded: 1 } },
            { returnDocument: 'after', runValidators: true },
        );
    }

    async incrementStatementCounter(barberId) {
        return Subscription.findOneAndUpdate(
            { barberId },
            { $inc: { statementsDownloadedThisPeriod: 1 } },
            { returnDocument: 'after', runValidators: true },
        );
    }

    async findExpiredSubscriptions(now = new Date(), limit = 100) {
        return Subscription.find(trustQueryOperators({
            status: {
                $in: [
                    SUBSCRIPTION_STATUSES.ACTIVE,
                    SUBSCRIPTION_STATUSES.CANCELLED,
                    SUBSCRIPTION_STATUSES.PAST_DUE,
                    SUBSCRIPTION_STATUSES.PAUSED,
                ],
            },
            currentPeriodEnd: { $lte: now },
            planId: { $ne: SUBSCRIPTION_PLANS.BASIC },
        })).limit(limit);
    }

    async findAllActivePaid(limit = 500) {
        return Subscription.find(trustQueryOperators({
            status: {
                $in: [
                    SUBSCRIPTION_STATUSES.ACTIVE,
                    SUBSCRIPTION_STATUSES.PAST_DUE,
                    SUBSCRIPTION_STATUSES.PAUSED,
                    SUBSCRIPTION_STATUSES.CANCELLED,
                ],
            },
            planId: { $ne: SUBSCRIPTION_PLANS.BASIC },
        })).limit(limit);
    }

    async findAllForMediaReconciliation(limit = 1000) {
        return Subscription.find({}).limit(limit);
    }

    async findAllFiltered(filter = {}, options = {}) {
        const query = Subscription.find(trustQueryOperators(filter))
            .sort({ updatedAt: -1, createdAt: -1 })
            .populate({
                path: 'barberId',
                select: 'firstName lastName userId',
                populate: { path: 'userId', select: 'email phoneNumber isActive' },
            });

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async countAll(filter = {}) {
        return Subscription.countDocuments(trustQueryOperators(filter));
    }

    async countByPlanAndStatus() {
        return Subscription.aggregate([
            {
                $group: {
                    _id: { planId: '$planId', status: '$status' },
                    count: { $sum: 1 },
                },
            },
        ]);
    }

    async aggregateAdminSummary() {
        return Subscription.aggregate([
            {
                $group: {
                    _id: { planId: '$planId', status: '$status' },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    planId: '$_id.planId',
                    status: '$_id.status',
                    count: 1,
                },
            },
            { $sort: { planId: 1, status: 1 } },
        ]);
    }

    #normalizeUpdate(updateData) {
        const hasOperator = Object.keys(updateData || {}).some((key) => key.startsWith('$'));
        return hasOperator ? updateData : { $set: updateData };
    }
}

export default new SubscriptionRepository();
