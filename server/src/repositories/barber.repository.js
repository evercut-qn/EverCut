import Barber from '../models/barber.model.js';
import { ROLES } from '../utils/constants.js';
import { escapeRegex } from '../utils/regex.utils.js';

class BarberRepository {
    async create(data) {
        return Barber.create(data);
    }

    async findById(id) {
        return Barber.findById(id).populate({ path: 'photoMediaId', select: 'r2Key' });
    }

    async findByUserId(userId) {
        return Barber.findOne({ userId }).populate({ path: 'photoMediaId', select: 'r2Key' });
    }

    async findByUserIdWithDeleted(userId) {
        return Barber.findOne({ userId }).setOptions({ includeDeleted: true }).populate({ path: 'photoMediaId', select: 'r2Key' });
    }

    async updateById(id, data) {
        return Barber.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true });
    }

    async updateByUserId(userId, data) {
        return Barber.findOneAndUpdate(
            { userId },
            { $set: data },
            { returnDocument: 'after', runValidators: true },
        );
    }

    async softDelete(id) {
        return Barber.findByIdAndUpdate(id, { deletedAt: new Date() });
    }

    buildAdminDirectoryPipeline(query = {}) {
        const pipeline = [
            { $match: { deletedAt: null } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $match: {
                    'user.deletedAt': null,
                    'user.roleType': ROLES.BARBER,
                },
            },
            {
                $lookup: {
                    from: 'shops',
                    localField: '_id',
                    foreignField: 'barberId',
                    as: 'shop',
                },
            },
            { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
            { $match: { $or: [{ 'shop.deletedAt': null }, { shop: null }] } },
            {
                $lookup: {
                    from: 'ratings',
                    localField: 'shop._id',
                    foreignField: 'shopId',
                    as: 'ratings',
                },
            },
            {
                $addFields: {
                    ratingCount: { $size: '$ratings' },
                    averageRating: { $avg: '$ratings.rating' },
                },
            },
        ];

        if (query.isActive !== undefined) {
            pipeline.push({ $match: { 'user.isActive': query.isActive } });
        }

        if (query.isOpen !== undefined) {
            pipeline.push({ $match: { 'shop.isOpen': query.isOpen } });
        }

        if (query.search) {
            const regex = new RegExp(escapeRegex(query.search), 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { firstName: regex },
                        { lastName: regex },
                        { upiId: regex },
                        { 'payoutConfig.beneficiaryId': regex },
                        { 'shop.shopName': regex },
                    ],
                },
            });
        }

        pipeline.push(
            {
                $lookup: {
                    from: 'media',
                    localField: 'photoMediaId',
                    foreignField: '_id',
                    as: 'photoMediaId',
                },
            },
            { $unwind: { path: '$photoMediaId', preserveNullAndEmptyArrays: true } },
        );
        pipeline.push({ $project: { ratings: 0, pinHash: 0 } });
        return pipeline;
    }

    async countAdminDirectory(query = {}) {
        const [result] = await Barber.aggregate([
            ...this.buildAdminDirectoryPipeline(query),
            { $count: 'total' },
        ]);
        return result?.total || 0;
    }

    async findAdminDirectory(query = {}, options = {}) {
        const pipeline = [
            ...this.buildAdminDirectoryPipeline(query),
            { $sort: { 'user.createdAt': -1, createdAt: -1 } },
        ];

        if (options.skip !== undefined) pipeline.push({ $skip: options.skip });
        if (options.limit !== undefined) pipeline.push({ $limit: options.limit });
        return Barber.aggregate(pipeline);
    }
}

export default new BarberRepository();
