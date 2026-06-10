import Customer from '../models/customer.model.js';
import config from '../config/index.js';
import { ROLES } from '../utils/constants.js';
import { escapeRegex } from '../utils/regex.utils.js';

class CustomerRepository {
    async create(data) {
        return Customer.create(data);
    }

    async findByUserId(userId) {
        return Customer.findOne({ userId });
    }

    async findById(id) {
        return Customer.findById(id);
    }

    async consumeFeeWaiverSlot(customerId) {
        const quota = config.payment.feeWaiverQuota;
        if (quota <= 0) return null;

        const customer = await Customer.findOneAndUpdate(
            {
                _id: customerId,
                $or: [
                    { feeWaiverBookingsUsed: { $exists: false } },
                    { feeWaiverBookingsUsed: { $lt: quota } },
                ],
            },
            {
                $inc: { feeWaiverBookingsUsed: 1 },
            },
            { returnDocument: 'after', runValidators: true },
        );

        return customer || null;
    }

    async updateByUserId(userId, data) {
        return Customer.findOneAndUpdate(
            { userId },
            { $set: data },
            { returnDocument: 'after', runValidators: true },
        );
    }

    async addFavoriteBooking(userId, bookingId) {
        return Customer.findOneAndUpdate(
            { userId },
            { $addToSet: { favoriteBookings: bookingId } },
            { returnDocument: 'after' },
        );
    }

    async removeFavoriteBooking(userId, bookingId) {
        return Customer.findOneAndUpdate(
            { userId },
            { $pull: { favoriteBookings: bookingId } },
            { returnDocument: 'after' },
        );
    }

    async addFavoriteShop(userId, shopId) {
        return Customer.findOneAndUpdate(
            { userId },
            { $addToSet: { favoriteShops: shopId } },
            { returnDocument: 'after' },
        );
    }

    async removeFavoriteShop(userId, shopId) {
        return Customer.findOneAndUpdate(
            { userId },
            { $pull: { favoriteShops: shopId } },
            { returnDocument: 'after' },
        );
    }

    async findByUserIdPopulated(userId) {
        return Customer.findOne({ userId }).populate({
            path: 'favoriteBookings',
            populate: [
                { path: 'serviceIds' },
                {
                    path: 'employeeId',
                    select: 'firstName lastName photoR2Key',
                    options: { includeDeleted: true },
                },
                { path: 'customerId', select: 'firstName lastName photoR2Key' },
                { path: 'shopId', select: 'shopName address coverR2Key' },
            ],
        }).lean();
    }

    async findFavoriteBookingsByUserId(userId) {
        return Customer.findOne({ userId }).populate({
            path: 'favoriteBookings',
            populate: [
                { path: 'serviceIds' },
                {
                    path: 'employeeId',
                    select: 'firstName lastName photoR2Key',
                    options: { includeDeleted: true },
                },
                { path: 'customerId', select: 'firstName lastName photoR2Key' },
                { path: 'shopId', select: 'shopName address coverR2Key' },
            ],
        }).lean();
    }

    async findFavoriteShopsByUserId(userId) {
        return Customer.findOne({ userId }).populate({
            path: 'favoriteShops',
            select: 'shopName address coverR2Key category targetCustomers facilities isOpen location',
        }).lean();
    }

    buildAdminDirectoryPipeline(query = {}) {
        const pipeline = [
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
                    'user.roleType': ROLES.CUSTOMER,
                },
            },
        ];

        if (query.isActive !== undefined) {
            pipeline.push({ $match: { 'user.isActive': query.isActive } });
        }

        if (query.search) {
            const escaped = escapeRegex(query.search.trim());
            const searchPattern = escaped.replace(/\s+/g, '\\s+');
            const regex = new RegExp(searchPattern, 'i');
            pipeline.push(
                {
                    $addFields: {
                        fullName: {
                            $concat: ['$firstName', ' ', '$lastName'],
                        },
                    },
                },
                {
                    $match: {
                        $or: [
                            { firstName: regex },
                            { lastName: regex },
                            { fullName: regex },
                            { 'user.phoneNumber': regex },
                            { 'user.email': regex },
                        ],
                    },
                },
            );
        }

        pipeline.push(
            {
                $lookup: {
                    from: 'bookings',
                    localField: '_id',
                    foreignField: 'customerId',
                    as: 'bookings',
                },
            },
            {
                $addFields: {
                    totalBookings: { $size: '$bookings' },
                },
            },
            { $project: { bookings: 0 } },
        );

        return pipeline;
    }

    async countAdminDirectory(query = {}) {
        const [result] = await Customer.aggregate([
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

        return Customer.aggregate(pipeline);
    }
}

export default new CustomerRepository();
