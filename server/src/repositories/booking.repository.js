import Booking from '../models/booking.model.js';

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
            .populate('employeeId', 'firstName lastName photoUrl')
            .populate('customerId', 'firstName lastName email')
            .lean();
    }

    async updateById(id, data) {
        return Booking.findByIdAndUpdate(id, { $set: data }, { new: true });
    }

    async updateStatus(id, status) {
        const update = { status };
        if (status === 'cancelled') update.cancelledAt = new Date();
        return Booking.findByIdAndUpdate(id, update, { new: true });
    }

    async deleteById(id) {
        return Booking.findByIdAndDelete(id);
    }

    // ── Customer-side queries ──────────────────────────────────────────

    async findByCustomer(customerId, filters = {}) {
        return Booking.find({ customerId, ...filters })
            .populate('serviceIds')
            .populate('employeeId', 'firstName lastName photoUrl')
            .populate('shopId', 'shopName address coverUrl')
            .sort({ date: -1 });
    }

    async findUpcomingByCustomer(customerId, today, options = {}) {
        const query = Booking.find({
            customerId,
            date: { $gte: today },
        })
            .populate('serviceIds')
            .populate('employeeId', 'firstName lastName photoUrl')
            .populate('shopId', 'shopName address coverUrl')
            .sort({ date: 1 });
            
        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query;
    }

    async countUpcomingByCustomer(customerId, today) {
        return Booking.countDocuments({ customerId, date: { $gte: today } });
    }

    async findPastByCustomer(customerId, today, options = {}) {
        const query = Booking.find({
            customerId,
            date: { $lt: today },
        })
            .populate('serviceIds')
            .populate('employeeId', 'firstName lastName photoUrl')
            .populate('shopId', 'shopName address coverUrl')
            .sort({ date: -1 });

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query;
    }

    async countPastByCustomer(customerId, today) {
        return Booking.countDocuments({ customerId, date: { $lt: today } });
    }

    // ── Shop/Barber-side queries ───────────────────────────────────────

    async findByEmployeeIds(employeeIds, filters = {}, options = {}) {
        const query = Booking.find({ employeeId: { $in: employeeIds }, ...filters })
            .populate('customerId', 'phoneNumber')
            .populate('employeeId', 'firstName lastName')
            .populate('serviceIds', 'serviceName offerPrice');
            
        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query;
    }

    async countAll(filter = {}) {
        return Booking.countDocuments(filter);
    }

    async countByStatus(status, employeeIds) {
        return Booking.countDocuments({
            status,
            employeeId: { $in: employeeIds },
        });
    }

    async findByStatusPopulated(status, employeeIds, options = {}) {
        const query = Booking.find({ status, employeeId: { $in: employeeIds } })
            .populate('customerId', 'firstName lastName')
            .populate('employeeId', 'firstName lastName')
            .lean();
            
        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query;
    }

    async getUniqueCustomerCount(employeeIds) {
        const ids = await Booking.distinct('customerId', {
            employeeId: { $in: employeeIds },
        });
        return ids.length;
    }

    async findByEmployeeAndDate(employeeId, date) {
        return Booking.find({ employeeId, date }).lean();
    }

    async findConflict(shopId, employeeId, date, time, excludeBookingId) {
        const filter = { shopId, employeeId, date, time };
        if (excludeBookingId) filter._id = { $ne: excludeBookingId };
        return Booking.findOne(filter);
    }

    // ── User booking detail queries ─────────────────────────────────────

    async findByCustomerWithDateRange(customerId, startDate, endDate) {
        return Booking.find({
            customerId,
            date: { $gte: startDate, $lte: endDate },
        })
            .populate('serviceIds', 'serviceName offerPrice duration')
            .populate('employeeId', 'firstName lastName')
            .populate('shopId', 'shopName address');
    }

    // ── Aggregations ───────────────────────────────────────────────────

    async getEarningsAggregation(employeeId, startOfToday, endOfToday, startOfLastMonth, endOfLastMonth) {
        return Booking.aggregate([
            { $match: { status: 'completed', employeeId } },
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
}

export default new BookingRepository();
