import mongoose from 'mongoose';

import Booking from '../models/booking.model.js';
import { BOOKING_STATUS, PAYMENT_STATUS, PAYOUT_STATUS } from '../utils/constants.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';
import { escapeRegex } from '../utils/regex.utils.js';

const ACTIVE_BOOKING_STATUSES = [
    BOOKING_STATUS.PENDING,
    BOOKING_STATUS.AWAITING_CONFIRMATION,
    BOOKING_STATUS.CONFIRMED,
];

const EMPLOYEE_POPULATE = {
    path: 'employeeId',
    select: 'firstName lastName photoR2Key blockedDates',
    options: { includeDeleted: true },
};

const EMPLOYEE_NAME_POPULATE = {
    path: 'employeeId',
    select: 'firstName lastName photoR2Key blockedDates',
    options: { includeDeleted: true },
};

const BOOKING_SERVICE_CARD_FIELDS = [
    'serviceName',
    'serviceFor',
    'serviceType',
    'imageR2Key',
    'duration',
    'actualPrice',
    'offerPrice',
    'finalPrice',
    'totalDuration',
    'totalPrice',
    'bundledServices',
].join(' ');

const CUSTOMER_SUMMARY_FIELDS = 'firstName lastName photoR2Key userId feeWaiverBookingsUsed';
const CUSTOMER_NAME_FIELDS = 'firstName lastName photoR2Key';
const PAYMENT_SUMMARY_POPULATE = {
    path: 'paymentTransactionId',
    select: 'amount amountInRupees waiverApplied settlement',
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

    async findByIdempotencyKey(customerId, idempotencyKey) {
        if (!idempotencyKey) return null;
        return Booking.findOne(trustQueryOperators({
            customerId,
            idempotencyKey,
            status: { $ne: BOOKING_STATUS.CANCELLED },
        }));
    }

    async findByIds(ids, options = {}) {
        return Booking.find(trustQueryOperators({ _id: { $in: ids } }))
            .session(options.session || null)
            .populate('shopId', 'barberId shopName');
    }

    async findByIdPopulated(id) {
        return Booking.findById(id)
            .populate({
                path: 'shopId',
                select: 'shopName coverR2Key address openTime closeTime barberId',
                populate: { path: 'barberId', select: 'firstName lastName upiId accountHolderName' },
            })
            .populate(EMPLOYEE_POPULATE)
            .populate(PAYMENT_SUMMARY_POPULATE)
            .populate({
                path: 'customerId',
                select: CUSTOMER_SUMMARY_FIELDS,
                populate: { path: 'userId', select: 'email phoneNumber' },
            })
            .lean();
    }

    async updateById(id, data) {
        return Booking.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after' });
    }

    async updateManyByIds(ids, data) {
        return Booking.updateMany(
            trustQueryOperators({ _id: { $in: ids } }),
            { $set: data },
        );
    }

    async claimManualPayoutBookings({ bookingIds, payoutId }) {
        return Booking.updateMany(
            trustQueryOperators({
                _id: { $in: bookingIds },
                status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW] },
                paymentStatus: PAYMENT_STATUS.SUCCESS,
                payoutStatus: {
                    $in: [
                        PAYOUT_STATUS.NOT_INITIATED,
                        PAYOUT_STATUS.FAILED,
                        PAYOUT_STATUS.REVERSED,
                    ],
                },
            }),
            {
                $set: {
                    payoutTransactionId: payoutId,
                    payoutStatus: PAYOUT_STATUS.INITIATED,
                    payoutCompletedAt: null,
                    barberUtr: null,
                },
            },
        );
    }

    async completeManualPayoutBookings(bookingIds, payoutId, { processedAt, utr }) {
        return Booking.updateMany(
            trustQueryOperators({
                _id: { $in: bookingIds },
                payoutTransactionId: payoutId,
                payoutStatus: PAYOUT_STATUS.INITIATED,
            }),
            {
                $set: {
                    payoutStatus: PAYOUT_STATUS.COMPLETED,
                    payoutCompletedAt: processedAt,
                    barberUtr: utr,
                },
            },
        );
    }

    async releaseManualPayoutClaim(payoutId) {
        return Booking.updateMany(
            trustQueryOperators({
                payoutTransactionId: payoutId,
                payoutStatus: PAYOUT_STATUS.INITIATED,
            }),
            {
                $set: {
                    payoutTransactionId: null,
                    payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
                    payoutCompletedAt: null,
                    barberUtr: null,
                },
            },
        );
    }

    async updateStatus(id, status) {
        const update = { status };
        if (status === BOOKING_STATUS.CANCELLED) update.cancelledAt = new Date();
        if (status === BOOKING_STATUS.COMPLETED) update.completedAt = new Date();
        return Booking.findByIdAndUpdate(id, update, { returnDocument: 'after' });
    }

    async deleteById(id) {
        return Booking.findByIdAndDelete(id);
    }

    async findByCustomer(customerId, filters = {}, options = {}) {
        const query = Booking.find(trustQueryOperators({ customerId, ...filters }))
            .populate('serviceIds')
            .populate(EMPLOYEE_POPULATE)
            .populate('shopId', 'shopName address coverR2Key')
            .populate(PAYMENT_SUMMARY_POPULATE)
            .sort({ date: -1 });

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async findUpcomingByCustomer(customerId, today, options = {}) {
        const query = Booking.find(trustQueryOperators({
            customerId,
            date: { $gte: today },
        }))
            .populate('serviceIds')
            .populate(EMPLOYEE_POPULATE)
            .populate('shopId', 'shopName address coverR2Key')
            .populate(PAYMENT_SUMMARY_POPULATE)
            .sort({ date: 1 });

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
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
            .populate('shopId', 'shopName address coverR2Key')
            .populate(PAYMENT_SUMMARY_POPULATE)
            .sort({ date: -1 });

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async countPastByCustomer(customerId, today) {
        return Booking.countDocuments(trustQueryOperators({ customerId, date: { $lt: today } }));
    }

    async findByEmployeeIds(employeeIds, filters = {}, options = {}) {
        const query = Booking.find(trustQueryOperators({ employeeId: { $in: employeeIds }, ...filters }))
            .populate({
                path: 'customerId',
                select: CUSTOMER_SUMMARY_FIELDS,
                populate: { path: 'userId', select: 'phoneNumber' },
            })
            .populate(EMPLOYEE_NAME_POPULATE)
            .populate('serviceIds', BOOKING_SERVICE_CARD_FIELDS)
            .populate(PAYMENT_SUMMARY_POPULATE);

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async findByShopId(shopId, filters = {}, options = {}) {
        const query = Booking.find(trustQueryOperators({ shopId, ...filters }))
            .populate({
                path: 'customerId',
                select: CUSTOMER_SUMMARY_FIELDS,
                populate: { path: 'userId', select: 'phoneNumber' },
            })
            .populate(EMPLOYEE_NAME_POPULATE)
            .populate('serviceIds', BOOKING_SERVICE_CARD_FIELDS)
            .populate(PAYMENT_SUMMARY_POPULATE)
            .sort({ date: -1, createdAt: -1 });

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async countAll(filter = {}) {
        return Booking.countDocuments(trustQueryOperators(filter));
    }

    async aggregateAdminSummary({ fromDate, weekStartDate, monthStartDate, trendStartDate } = {}) {
        const [
            [totals = {}],
            statusRows,
            dailyTrend,
            monthlyTrend,
            topShops,
        ] = await Promise.all([
            Booking.aggregate([
                { $match: {} },
                {
                    $group: {
                        _id: null,
                        allTime: { $sum: 1 },
                        thisWeek: {
                            $sum: {
                                $cond: [{ $gte: ['$createdAt', weekStartDate || fromDate] }, 1, 0],
                            },
                        },
                        thisMonth: {
                            $sum: {
                                $cond: [{ $gte: ['$createdAt', monthStartDate || fromDate] }, 1, 0],
                            },
                        },
                    },
                },
            ]),
            Booking.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $project: { _id: 0, status: '$_id', count: 1 } },
                { $sort: { status: 1 } },
            ]),
            Booking.aggregate([
                { $match: { createdAt: { $gte: trendStartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
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
                                date: { $dateFromParts: { year: '$_id.year', month: '$_id.month', day: '$_id.day' } },
                            },
                        },
                        count: 1,
                    },
                },
                { $sort: { date: 1 } },
            ]),
            Booking.aggregate([
                { $match: { createdAt: { $gte: trendStartDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
                {
                    $group: {
                        _id: {
                            year: { $year: { date: '$createdAt', timezone: 'UTC' } },
                            month: { $month: { date: '$createdAt', timezone: 'UTC' } },
                        },
                        count: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        year: '$_id.year',
                        month: '$_id.month',
                        count: 1,
                    },
                },
                { $sort: { year: 1, month: 1 } },
            ]),
            Booking.aggregate([
                {
                    $match: {
                        status: {
                            $in: [
                                BOOKING_STATUS.COMPLETED,
                                BOOKING_STATUS.CONFIRMED,
                                BOOKING_STATUS.NO_SHOW,
                                BOOKING_STATUS.AWAITING_CONFIRMATION,
                            ],
                        },
                        paymentStatus: PAYMENT_STATUS.SUCCESS,
                    },
                },
                {
                    $group: {
                        _id: '$shopId',
                        bookingCount: { $sum: 1 },
                        paidServiceValueInRupees: { $sum: '$totalAmount' },
                    },
                },
                {
                    $lookup: {
                        from: 'shops',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'shop',
                    },
                },
                { $unwind: '$shop' },
                { $match: { 'shop.deletedAt': null } },
                {
                    $project: {
                        _id: 0,
                        shopId: '$_id',
                        shopName: '$shop.shopName',
                        bookingCount: 1,
                        paidServiceValueInRupees: 1,
                    },
                },
                { $sort: { bookingCount: -1, paidServiceValueInRupees: -1 } },
                { $limit: 5 },
            ]),
        ]);

        return { totals, statusRows, dailyTrend, monthlyTrend, topShops };
    }

    buildAdminListPipeline(query = {}) {
        const match = {};
        if (query.status) match.status = Array.isArray(query.status) ? { $in: query.status } : query.status;
        if (query.paymentStatus) {
            match.paymentStatus = Array.isArray(query.paymentStatus) ? { $in: query.paymentStatus } : query.paymentStatus;
        }
        if (query.payoutStatus) {
            match.payoutStatus = Array.isArray(query.payoutStatus) ? { $in: query.payoutStatus } : query.payoutStatus;
        }
        if (query.shopId) match.shopId = new mongoose.Types.ObjectId(query.shopId);
        if (query.customerId) match.customerId = new mongoose.Types.ObjectId(query.customerId);
        if (query.dateFrom || query.dateTo) {
            match.date = {};
            if (query.dateFrom) match.date.$gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
            if (query.dateTo) match.date.$lte = new Date(`${query.dateTo}T23:59:59.999Z`);
        }

        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customerId',
                    foreignField: '_id',
                    as: 'customer',
                },
            },
            { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'customer.userId',
                    foreignField: '_id',
                    as: 'customerUser',
                },
            },
            { $unwind: { path: '$customerUser', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'shops',
                    localField: 'shopId',
                    foreignField: '_id',
                    as: 'shop',
                },
            },
            { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'employeeId',
                    foreignField: '_id',
                    as: 'employee',
                },
            },
            { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'barbers',
                    localField: 'shop.barberId',
                    foreignField: '_id',
                    as: 'barber',
                },
            },
            { $unwind: { path: '$barber', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'services',
                    localField: 'serviceIds',
                    foreignField: '_id',
                    as: 'services',
                },
            },
        ];

        if (query.search) {
            const regex = new RegExp(escapeRegex(query.search), 'i');
            const searchConditions = [
                { 'customerUser.phoneNumber': regex },
                { 'customerUser.email': regex },
                { 'customer.firstName': regex },
                { 'customer.lastName': regex },
                { 'shop.shopName': regex },
            ];
            if (mongoose.Types.ObjectId.isValid(query.search)) {
                searchConditions.push({ _id: new mongoose.Types.ObjectId(query.search) });
            }
            pipeline.push({ $match: { $or: searchConditions } });
        }

        return pipeline;
    }

    async countAdminList(query = {}) {
        const [result] = await Booking.aggregate([
            ...this.buildAdminListPipeline(query),
            { $count: 'total' },
        ]);
        return result?.total || 0;
    }

    async findAdminList(query = {}, options = {}) {
        const pipeline = [
            ...this.buildAdminListPipeline(query),
            { $sort: { date: -1, createdAt: -1 } },
        ];

        if (options.skip !== undefined) pipeline.push({ $skip: options.skip });
        if (options.limit !== undefined) pipeline.push({ $limit: options.limit });
        return Booking.aggregate(pipeline);
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

    async countCompletedForShopInDateRange(shopId, startDate, endDate) {
        return Booking.countDocuments(trustQueryOperators({
            shopId,
            status: BOOKING_STATUS.COMPLETED,
            date: {
                $gte: startDate,
                $lt: endDate,
            },
        }));
    }

    async aggregateAppointmentAnalyticsByMonth(shopId, startDate, endDate) {
        return Booking.aggregate([
            {
                $match: {
                    shopId,
                    status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW] },
                    date: {
                        $gte: startDate,
                        $lt: endDate,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: { date: '$date', timezone: 'UTC' } },
                        month: { $month: { date: '$date', timezone: 'UTC' } },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    count: 1,
                },
            },
            { $sort: { year: 1, month: 1 } },
        ]);
    }

    async findByStatusPopulated(status, employeeIds, options = {}) {
        const query = Booking.find(trustQueryOperators({ status, employeeId: { $in: employeeIds } }))
            .populate('customerId', CUSTOMER_NAME_FIELDS)
            .populate(EMPLOYEE_NAME_POPULATE)
            .lean();

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query;
    }

    async findByStatusForShop(shopId, status, options = {}) {
        const query = Booking.find(trustQueryOperators({ shopId, status }))
            .populate('customerId', CUSTOMER_NAME_FIELDS)
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
        return Booking.find(trustQueryOperators({
            employeeId,
            date,
            status: { $nin: [BOOKING_STATUS.CANCELLED] },
        })).lean();
    }

    async findActiveByEmployeeAndDates(employeeId, dates) {
        return Booking.find(trustQueryOperators({
            employeeId,
            date: { $in: dates.map((date) => new Date(`${date}T00:00:00.000Z`)) },
            status: { $in: ACTIVE_BOOKING_STATUSES },
        }))
            .populate({
                path: 'customerId',
                select: CUSTOMER_SUMMARY_FIELDS,
                populate: { path: 'userId', select: 'phoneNumber email' },
            })
            .populate('shopId', 'shopName barberId')
            .lean();
    }

    async findBlockingByEmployeeAndDate(employeeId, date) {
        return Booking.find(trustQueryOperators({
            employeeId,
            date,
            status: { $in: ACTIVE_BOOKING_STATUSES },
        })).lean();
    }

    async findBlockingByEmployeeIdsAndDate(employeeIds, date) {
        return Booking.find(trustQueryOperators({
            employeeId: { $in: employeeIds },
            date,
            status: { $in: ACTIVE_BOOKING_STATUSES },
        })).lean();
    }

    async findConflict(shopId, employeeId, date, time, excludeBookingId) {
        const filter = {
            shopId,
            employeeId,
            date,
            time,
            status: { $nin: [BOOKING_STATUS.CANCELLED] },
        };

        if (excludeBookingId) filter._id = { $ne: excludeBookingId };
        return Booking.findOne(trustQueryOperators(filter));
    }

    async findCompletedWithPendingPayout() {
        return Booking.find(trustQueryOperators({
            status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW] },
            payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
            paymentStatus: PAYMENT_STATUS.SUCCESS,
        })).populate('shopId', 'barberId shopName');
    }

    async aggregatePendingPayoutsByBarber({ search } = {}) {
        const eligiblePayoutStatuses = [
            PAYOUT_STATUS.NOT_INITIATED,
            PAYOUT_STATUS.FAILED,
            PAYOUT_STATUS.REVERSED,
        ];

        const pipeline = [
            {
                $match: {
                    status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW] },
                    payoutStatus: { $in: eligiblePayoutStatuses },
                    paymentStatus: PAYMENT_STATUS.SUCCESS,
                },
            },
            {
                $lookup: {
                    from: 'shops',
                    localField: 'shopId',
                    foreignField: '_id',
                    as: 'shop',
                },
            },
            { $unwind: '$shop' },
            { $match: { 'shop.deletedAt': null } },
            {
                $lookup: {
                    from: 'barbers',
                    localField: 'shop.barberId',
                    foreignField: '_id',
                    as: 'barber',
                },
            },
            { $unwind: '$barber' },
            { $match: { 'barber.deletedAt': null } },
            {
                $lookup: {
                    from: 'payment_transactions',
                    localField: '_id',
                    foreignField: 'bookingId',
                    as: 'payments',
                },
            },
            {
                $addFields: {
                    completedPayment: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$payments',
                                    as: 'payment',
                                    cond: { $eq: ['$$payment.status', 'completed'] },
                                },
                            },
                            0,
                        ],
                    },
                },
            },
            { $match: { completedPayment: { $ne: null } } },
            {
                $group: {
                    _id: '$shop.barberId',
                    barberId: { $first: '$shop.barberId' },
                    barberFirstName: { $first: '$barber.firstName' },
                    barberLastName: { $first: '$barber.lastName' },
                    shopName: { $first: '$shop.shopName' },
                    shopId: { $first: '$shop._id' },
                    upiId: { $first: '$barber.upiId' },
                    accountHolderName: { $first: '$barber.accountHolderName' },
                    totalAmountInPaisa: {
                        $sum: {
                            $ifNull: [
                                '$completedPayment.settlement.barberPayout',
                                '$completedPayment.settlement.serviceAmount',
                            ],
                        },
                    },
                    bookingCount: { $sum: 1 },
                    bookingIds: { $push: '$_id' },
                    payoutStatuses: { $addToSet: '$payoutStatus' },
                    oldestBookingDate: { $min: '$date' },
                },
            },
        ];

        if (search) {
            const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchRegex = new RegExp(escapedSearch, 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { barberFirstName: searchRegex },
                        { barberLastName: searchRegex },
                        { shopName: searchRegex },
                    ],
                },
            });
        }

        pipeline.push({ $sort: { totalAmountInPaisa: -1, oldestBookingDate: 1 } });

        return Booking.aggregate(pipeline);
    }

    async findByCustomerWithDateRange(customerId, startDate, endDate) {
        return Booking.find(trustQueryOperators({
            customerId,
            date: { $gte: startDate, $lte: endDate },
        }))
            .populate('serviceIds', BOOKING_SERVICE_CARD_FIELDS)
            .populate(EMPLOYEE_NAME_POPULATE)
            .populate('shopId', 'shopName address coverR2Key')
            .populate(PAYMENT_SUMMARY_POPULATE)
            .lean();
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
            status: {
                $in: [
                    BOOKING_STATUS.PENDING,
                    BOOKING_STATUS.AWAITING_CONFIRMATION,
                    BOOKING_STATUS.CONFIRMED,
                ],
            },
            date: { $gte: startOfToday },
        }));
    }

    async getEarningsAggregation(employeeId, startOfToday, endOfToday, startOfLastMonth, endOfLastMonth) {
        return Booking.aggregate([
            { $match: { status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW] }, employeeId } },
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
            { $match: { status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW] }, shopId } },
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

    async findAwaitingConfirmationExpired(cutoffTime, limit = 100) {
        return Booking.find(trustQueryOperators({
            status: BOOKING_STATUS.AWAITING_CONFIRMATION,
            paymentStatus: PAYMENT_STATUS.SUCCESS,
            paidAt: { $lte: cutoffTime },
        }))
            .limit(limit)
            .lean();
    }
}

export default new BookingRepository();
