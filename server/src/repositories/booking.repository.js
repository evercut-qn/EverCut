import Booking from '../models/booking.model.js';
import { BOOKING_STATUS } from '../utils/constants.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';

const EMPLOYEE_POPULATE = {
    path: 'employeeId',
    select: 'firstName lastName photoUrl',
    options: { includeDeleted: true },
};

const EMPLOYEE_NAME_POPULATE = {
    path: 'employeeId',
    select: 'firstName lastName',
    options: { includeDeleted: true },
};

class BookingRepository {
    async create(data, options = {}) {
        if (options.session) {
            const [doc] = await Booking.create([data], options);
            return doc;
        }
        return Booking.create(data);
    }

    async findById(id, options = {}) {
        return Booking.findById(id).session(options.session || null);
    }

    async findByIdPopulated(id) {
        return Booking.findById(id)
            .populate('shopId', 'shopName coverUrl address openTime closeTime')
            .populate(EMPLOYEE_POPULATE)
            .populate({
                path: 'customerId',
                select: 'firstName lastName userId',
                populate: { path: 'userId', select: 'email phoneNumber' },
            });
    }

    async updateById(id, data) {
        return Booking.findByIdAndUpdate(id, { $set: data }, { new: true });
    }

    async updateStatus(id, status) {
        const update = { status };
        if (status === BOOKING_STATUS.CANCELLED) update.cancelledAt = new Date();
        return Booking.findByIdAndUpdate(id, update, { new: true });
    }

    async deleteById(id) {
        return Booking.findByIdAndDelete(id);
    }

    async findByCustomer(customerId, filters = {}) {
        return Booking.find(trustQueryOperators({ customerId, ...filters }))
            .populate('serviceIds')
            .populate(EMPLOYEE_POPULATE)
            .populate('shopId', 'shopName address coverUrl')
            .sort({ date: -1 });
    }

    async findUpcomingByCustomer(customerId, today, options = {}) {
        const query = Booking.find(trustQueryOperators({
            customerId,
            date: { $gte: today },
        }))
            .populate('serviceIds')
            .populate(EMPLOYEE_POPULATE)
            .populate('shopId', 'shopName address coverUrl')
            .sort({ date: 1 });

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query;
    }

    async countUpcomingByCustomer(customerId, today) {
        return Booking.countDocuments(trustQueryOperators({ customerId, date: { $gte: today } }));
    }

    async findPastByCustomer(customerId, today, options = {}) {
        const query = Booking.find(trustQueryOperators({
            customerId,
            date: { $lt: today },
        }))
            .populate('serviceIds')
            .populate(EMPLOYEE_POPULATE)
            .populate('shopId', 'shopName address coverUrl')
            .sort({ date: -1 });

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query;
    }

    async countPastByCustomer(customerId, today) {
        return Booking.countDocuments(trustQueryOperators({ customerId, date: { $lt: today } }));
    }

    async findByEmployeeIds(employeeIds, filters = {}, options = {}) {
        const query = Booking.find(trustQueryOperators({ employeeId: { $in: employeeIds }, ...filters }))
            .populate({
                path: 'customerId',
                select: 'firstName lastName userId',
                populate: { path: 'userId', select: 'phoneNumber' },
            })
            .populate(EMPLOYEE_NAME_POPULATE)
            .populate('serviceIds', 'serviceName offerPrice');

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query;
    }

    async findByShopId(shopId, filters = {}, options = {}) {
        const query = Booking.find(trustQueryOperators({ shopId, ...filters }))
            .populate({
                path: 'customerId',
                select: 'firstName lastName userId',
                populate: { path: 'userId', select: 'phoneNumber' },
            })
            .populate(EMPLOYEE_NAME_POPULATE)
            .populate('serviceIds', 'serviceName offerPrice')
            .sort({ date: -1, createdAt: -1 });

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query;
    }

    async countAll(filter = {}) {
        return Booking.countDocuments(trustQueryOperators(filter));
    }

    async countByStatus(status, employeeIds) {
        return Booking.countDocuments(trustQueryOperators({
            status,
            employeeId: { $in: employeeIds },
        }));
    }

    async countByStatusForShop(shopId, status) {
        return Booking.countDocuments(trustQueryOperators({ shopId, status }));
    }

    async findByStatusPopulated(status, employeeIds, options = {}) {
        const query = Booking.find(trustQueryOperators({ status, employeeId: { $in: employeeIds } }))
            .populate('customerId', 'firstName lastName')
            .populate(EMPLOYEE_NAME_POPULATE)
            .lean();

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query;
    }

    async findByStatusForShop(shopId, status, options = {}) {
        const query = Booking.find(trustQueryOperators({ shopId, status }))
            .populate('customerId', 'firstName lastName')
            .populate(EMPLOYEE_NAME_POPULATE)
            .sort({ date: -1, createdAt: -1 })
            .lean();

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query;
    }

    async getUniqueCustomerCount(employeeIds) {
        const ids = await Booking.distinct('customerId', trustQueryOperators({
            employeeId: { $in: employeeIds },
        }));
        return ids.length;
    }

    async getUniqueCustomerCountForShop(shopId) {
        const ids = await Booking.distinct('customerId', trustQueryOperators({ shopId }));
        return ids.length;
    }

    async findByEmployeeAndDate(employeeId, date) {
        return Booking.find({
            employeeId,
            date,
            status: { $ne: BOOKING_STATUS.CANCELLED },
        }).lean();
    }

    async findConflict(shopId, employeeId, date, time, excludeBookingId) {
        const filter = {
            shopId,
            employeeId,
            date,
            time,
            status: { $ne: BOOKING_STATUS.CANCELLED },
        };

        if (excludeBookingId) filter._id = { $ne: excludeBookingId };
        return Booking.findOne(trustQueryOperators(filter));
    }

    async findByCustomerWithDateRange(customerId, startDate, endDate) {
        return Booking.find(trustQueryOperators({
            customerId,
            date: { $gte: startDate, $lte: endDate },
        }))
            .populate('serviceIds', 'serviceName offerPrice duration')
            .populate(EMPLOYEE_NAME_POPULATE)
            .populate('shopId', 'shopName address');
    }

    async hasCompletedBookingForCustomer(customerId, shopId) {
        return Booking.exists(trustQueryOperators({
            customerId,
            shopId,
            status: BOOKING_STATUS.COMPLETED,
        }));
    }

    async hasActiveBookingsForEmployee(shopId, employeeId, fromDate = new Date()) {
        const startOfToday = new Date(fromDate);
        startOfToday.setHours(0, 0, 0, 0);

        return Booking.exists(trustQueryOperators({
            shopId,
            employeeId,
            status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
            date: { $gte: startOfToday },
        }));
    }

    async getEarningsAggregation(employeeId, startOfToday, endOfToday, startOfLastMonth, endOfLastMonth) {
        return Booking.aggregate([
            { $match: { status: BOOKING_STATUS.COMPLETED, employeeId } },
            {
                $group: {
                    _id: '$employeeId',
                    totalEarning: { $sum: '$totalAmount' },
                    lastMonthEarning: {
                        $sum: {
                            $cond: [
                                { $and: [{ $gte: ['$date', startOfLastMonth] }, { $lte: ['$date', endOfLastMonth] }] },
                                '$totalAmount',
                                0,
                            ],
                        },
                    },
                    todayEarning: {
                        $sum: {
                            $cond: [
                                { $and: [{ $gte: ['$date', startOfToday] }, { $lt: ['$date', endOfToday] }] },
                                '$totalAmount',
                                0,
                            ],
                        },
                    },
                },
            },
            { $project: { _id: 0, totalEarning: 1, lastMonthEarning: 1, todayEarning: 1 } },
        ]);
    }

    async getEarningsAggregationForShop(shopId, startOfToday, endOfToday, startOfLastMonth, endOfLastMonth) {
        return Booking.aggregate([
            { $match: { status: BOOKING_STATUS.COMPLETED, shopId } },
            {
                $group: {
                    _id: null,
                    totalEarning: { $sum: '$totalAmount' },
                    lastMonthEarning: {
                        $sum: {
                            $cond: [
                                { $and: [{ $gte: ['$date', startOfLastMonth] }, { $lte: ['$date', endOfLastMonth] }] },
                                '$totalAmount',
                                0,
                            ],
                        },
                    },
                    todayEarning: {
                        $sum: {
                            $cond: [
                                { $and: [{ $gte: ['$date', startOfToday] }, { $lt: ['$date', endOfToday] }] },
                                '$totalAmount',
                                0,
                            ],
                        },
                    },
                },
            },
            { $project: { _id: 0, totalEarning: 1, lastMonthEarning: 1, todayEarning: 1 } },
        ]);
    }
}

export default new BookingRepository();
