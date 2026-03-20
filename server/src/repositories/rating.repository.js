import mongoose from 'mongoose';
import Rating from '../models/rating.model.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';

const RATING_CUSTOMER_POPULATE = {
    path: 'customerId',
    select: 'firstName lastName photoUrl',
};

const buildReplyStateFilter = (ratingId, hasReply) => trustQueryOperators({
    _id: ratingId,
    'reply.text': { $exists: hasReply },
});

class RatingRepository {
    async create(data) {
        return Rating.create(data);
    }

    async findByCustomerAndShop(customerId, shopId) {
        return Rating.findOne({ customerId, shopId });
    }

    async countByShop(shopId) {
        return Rating.countDocuments({ shopId });
    }

    async findByShop(shopId, options = {}) {
        const query = Rating.find({ shopId })
            .populate(RATING_CUSTOMER_POPULATE)
            .sort({ createdAt: -1 });

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query;
    }

    async findById(id) {
        return Rating.findById(id);
    }

    async deleteById(id) {
        return Rating.findByIdAndDelete(id);
    }

    async getShopSummary(shopId) {
        const normalizedShopId = typeof shopId === 'string'
            ? new mongoose.Types.ObjectId(shopId)
            : shopId;

        const [summary] = await Rating.aggregate([
            { $match: { shopId: normalizedShopId } },
            {
                $group: {
                    _id: '$shopId',
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: '$rating' },
                    fiveStar: {
                        $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] },
                    },
                    fourStar: {
                        $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] },
                    },
                    threeStar: {
                        $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] },
                    },
                    twoStar: {
                        $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] },
                    },
                    oneStar: {
                        $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] },
                    },
                },
            },
        ]);

        if (!summary) {
            return {
                averageRating: 0,
                totalReviews: 0,
                stars: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            };
        }

        return {
            averageRating: Number(summary.averageRating.toFixed(1)),
            totalReviews: summary.totalReviews,
            stars: {
                5: summary.fiveStar,
                4: summary.fourStar,
                3: summary.threeStar,
                2: summary.twoStar,
                1: summary.oneStar,
            },
        };
    }

    async addReply(ratingId, replyText, repliedBy) {
        return Rating.findOneAndUpdate(
            buildReplyStateFilter(ratingId, false),
            {
                $set: {
                    'reply.text': replyText,
                    'reply.repliedAt': new Date(),
                    'reply.repliedBy': repliedBy,
                },
            },
            { new: true, runValidators: true },
        ).populate(RATING_CUSTOMER_POPULATE);
    }

    async updateReply(ratingId, replyText) {
        return Rating.findOneAndUpdate(
            buildReplyStateFilter(ratingId, true),
            {
                $set: {
                    'reply.text': replyText,
                    'reply.repliedAt': new Date(),
                },
            },
            { new: true, runValidators: true },
        ).populate(RATING_CUSTOMER_POPULATE);
    }

    async deleteReply(ratingId) {
        return Rating.findOneAndUpdate(
            buildReplyStateFilter(ratingId, true),
            { $unset: { reply: '' } },
            { new: true },
        ).populate(RATING_CUSTOMER_POPULATE);
    }
}

export default new RatingRepository();
