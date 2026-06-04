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
        return User.findById(id).select('+refreshTokenHash +previousRefreshTokenHash +rotatedAt');
    }

    async rotateRefreshToken(id, expectedIncomingHash, newRefreshHash) {
        return User.findOneAndUpdate(
            { _id: id, refreshTokenHash: expectedIncomingHash },
            {
                $set: {
                    refreshTokenHash: newRefreshHash,
                    previousRefreshTokenHash: expectedIncomingHash,
                    rotatedAt: new Date(),
                }
            },
            { returnDocument: 'after' }
        );
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
