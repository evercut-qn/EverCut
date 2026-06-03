import User from '../models/user.model.js';
import { ROLES } from '../utils/constants.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';
import { escapeRegex } from '../utils/regex.utils.js';

class UserRepository {
    async create(data) {
        return User.create(data);
    }

    async findById(id) {
        return User.findById(id);
    }

    async findByIdWithRefreshHash(id) {
        return User.findById(id).select('+refreshTokenHash');
    }

    async findByEmail(email) {
        return User.findOne({ email });
    }

    async findByPhone(phoneNumber) {
        return User.findOne({ phoneNumber });
    }

    async updateById(id, data) {
        return User.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true });
    }

    async updateLastLogin(id) {
        return User.findByIdAndUpdate(id, { lastLoginAt: new Date() });
    }

    async softDelete(id) {
        return User.findByIdAndUpdate(id, { deletedAt: new Date(), isActive: false });
    }

    async countAll(filter = {}) {
        return User.countDocuments(trustQueryOperators(filter));
    }

    async aggregateSummary({ trendStartDate } = {}) {
        const customerMatch = { deletedAt: null, roleType: ROLES.CUSTOMER };
        const [roleRows, customerActiveRows, registrationRows] = await Promise.all([
            User.aggregate([
                { $match: { deletedAt: null } },
                {
                    $group: {
                        _id: '$roleType',
                        count: { $sum: 1 },
                    },
                },
            ]),
            User.aggregate([
                { $match: customerMatch },
                {
                    $group: {
                        _id: '$isActive',
                        count: { $sum: 1 },
                    },
                },
            ]),
            User.aggregate([
                {
                    $match: {
                        ...customerMatch,
                        createdAt: { $gte: trendStartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: { date: '$createdAt', timezone: 'UTC' } },
                            month: { $month: { date: '$createdAt', timezone: 'UTC' } },
                            day: { $dayOfMonth: { date: '$createdAt', timezone: 'UTC' } },
                        },
                        count: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        date: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: {
                                    $dateFromParts: {
                                        year: '$_id.year',
                                        month: '$_id.month',
                                        day: '$_id.day',
                                    },
                                },
                            },
                        },
                        count: 1,
                    },
                },
                { $sort: { date: 1 } },
            ]),
        ]);

        return { roleRows, customerActiveRows, registrationRows };
    }

    async searchCustomerUsers(query = {}, options = {}) {
        const filter = { roleType: ROLES.CUSTOMER };
        if (query.isActive !== undefined) filter.isActive = query.isActive;

        if (query.search) {
            const regex = new RegExp(escapeRegex(query.search), 'i');
            filter.$or = [
                { phoneNumber: regex },
                { email: regex },
            ];
        }

        const cursor = User.find(trustQueryOperators(filter))
            .sort({ createdAt: -1 })
            .select('email phoneNumber isActive createdAt lastLoginAt roleType');

        if (options.skip !== undefined) cursor.skip(options.skip);
        if (options.limit !== undefined) cursor.limit(options.limit);
        return cursor.lean();
    }
}

export default new UserRepository();
