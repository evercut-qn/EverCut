import Employee from '../models/employee.model.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';

class EmployeeRepository {
    async create(data) {
        return Employee.create(data);
    }

    async findById(id) {
        return Employee.findById(id);
    }

    async findByShopId(shopId, options = {}) {
        const query = Employee.find({ shopId });
        
        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.sort({ createdAt: -1 });
    }

    async countByShopId(shopId) {
        return Employee.countDocuments({ shopId });
    }

    async findByShopIdAndPhone(shopId, phoneNumber) {
        return Employee.findOne({ shopId, phoneNumber });
    }

    async updateById(id, shopId, data) {
        return Employee.findOneAndUpdate(
            { _id: id, shopId },
            { $set: data },
            { returnDocument: 'after', runValidators: true },
        );
    }

    /**
     * Atomically claim every slot marker for a booking.
     * Returns null if any marker is already taken or the date is blocked.
     */
    async claimSlots(employeeId, date, times, options = {}) {
        const slotTimes = [...new Set(times)].filter(Boolean);
        const queryOptions = { returnDocument: 'after' };
        if (options.session) queryOptions.session = options.session;

        const query = {
            _id: employeeId,
            isActive: true,
            deletedAt: null,
            bookedSlots: { $not: { $elemMatch: { date, time: { $in: slotTimes } } } },
            blockedDates: { $ne: new Date(date) },
        };
        if (options.shopId) query.shopId = options.shopId;

        return Employee.findOneAndUpdate(
            trustQueryOperators(query),
            {
                $push: {
                    bookedSlots: {
                        $each: slotTimes.map((time) => ({ date, time })),
                    },
                },
            },
            queryOptions,
        ).select('firstName lastName photoUrl');
    }

    /**
     * Backward-compatible single-marker slot claim.
     */
    async claimSlot(employeeId, date, time, options = {}) {
        return this.claimSlots(employeeId, date, [time], options);
    }

    /**
     * Release previously booked slot markers.
     */
    async releaseSlots(employeeId, date, times) {
        const slotTimes = [...new Set(times)].filter(Boolean);
        return Employee.findByIdAndUpdate(employeeId, {
            $pull: {
                bookedSlots: {
                    date,
                    time: { $in: slotTimes },
                },
            },
        });
    }

    /**
     * Backward-compatible single-marker slot release.
     */
    async releaseSlot(employeeId, date, time) {
        return this.releaseSlots(employeeId, date, [time]);
    }

    async getIdsForShop(shopId) {
        const employees = await Employee.find({ shopId }).select('_id');
        return employees.map((e) => e._id);
    }

    async softDelete(id, shopId, deletionMarker) {
        return Employee.findOneAndUpdate(
            { _id: id, shopId },
            {
                deletedAt: new Date(),
                isActive: false,
                phoneNumber: deletionMarker,
            },
            { returnDocument: 'after' },
        );
    }

    async findByIdLean(id, fields) {
        return Employee.findById(id).select(fields).lean();
    }
}

export default new EmployeeRepository();
