import bookingRepository from '../repositories/booking.repository.js';
import employeeRepository from '../repositories/employee.repository.js';
import serviceRepository from '../repositories/service.repository.js';
import shopRepository from '../repositories/shop.repository.js';
import customerRepository from '../repositories/customer.repository.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/api-error.js';
import { isBookingInFuture, isWithinShopHours, getDayOfWeek, isWithinCancellationWindow } from '../utils/time.utils.js';
import { buildPagination } from '../utils/pagination.utils.js';
import {
    BOOKING_MILESTONE_TARGETS,
    BOOKING_STATUS,
    BUNDLE_RULES,
    MAX_RESCHEDULE_COUNT,
    CANCELLATION_WINDOW_HOURS,
    PAYMENT_STATUS,
    PAYOUT_STATUS,
    SERVICE_TYPE,
} from '../utils/constants.js';
import { getEffectiveServicePrice, normalizeServicePricing } from '../utils/service-pricing.utils.js';
import logger from '../utils/logger.js';

/**
 * Booking service — all booking business logic.
 */

// ── Customer: book a salon ───────────────────────────────────────────────

const normalizeBookedServices = (services = []) => services.map(normalizeServicePricing);
const sumServicePrices = (services = []) => services.reduce(
    (sum, service) => sum + (getEffectiveServicePrice(service) ?? 0),
    0,
);
const isBundleSelection = (services = []) => (
    services.length > 1
    || services.some((service) => service.serviceType === SERVICE_TYPE.BUNDLED)
);
const assertBundleMinimum = (services = [], totalAmount = 0) => {
    if (!isBundleSelection(services)) return;
    if (totalAmount >= BUNDLE_RULES.MIN_SERVICE_AMOUNT) return;

    throw new BadRequestError(`Bundle service amount must be at least ₹${BUNDLE_RULES.MIN_SERVICE_AMOUNT}`);
};
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
});

const getOrdinalLabel = (index) => {
    const ordinals = ['1st', '2nd', '3rd'];
    return ordinals[index] || `${index + 1}th`;
};

const getTargetLabel = (index) => `${getOrdinalLabel(index)} target`;

const getUtcMonthRange = (month, year) => ({
    startDate: new Date(Date.UTC(year, month - 1, 1)),
    endDate: new Date(Date.UTC(year, month, 1)),
});

const getDefaultProgressPeriod = () => {
    const now = new Date();
    return {
        month: now.getUTCMonth() + 1,
        year: now.getUTCFullYear(),
    };
};

export const bookSalon = async (userId, data) => {
    const { serviceId, employeeId, shopId, date, time } = data;

    const customer = await customerRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError('Customer profile');
    const customerId = customer._id;

    // Validate date/time is in future
    if (!isBookingInFuture(date, time)) {
        throw new BadRequestError('Cannot book in the past. Please select a future date and time.');
    }

    // Validate shop
    const shop = await shopRepository.findByIdWithFields(shopId, 'shopName address isOpen openTime closeTime availableDays');
    if (!shop) throw new NotFoundError('Shop');
    if (!shop.isOpen) throw new BadRequestError('Shop is currently closed');

    // Check available day
    const dayOfWeek = getDayOfWeek(date);
    if (!shop.availableDays.includes(dayOfWeek)) {
        throw new BadRequestError(`Shop is closed on ${dayOfWeek}`);
    }

    // Check shop hours
    if (!isWithinShopHours(time, shop.openTime, shop.closeTime)) {
        throw new BadRequestError('Booking time is outside shop hours');
    }

    // Normalize serviceIds
    const serviceIds = Array.isArray(serviceId) ? serviceId : [serviceId];

    // Validate services
    const services = normalizeBookedServices(
        await serviceRepository.findByIds(
            serviceIds,
            'serviceName finalPrice totalPrice actualPrice offerPrice serviceType shopId',
        ),
    );
    if (!services.length) throw new NotFoundError('Services');
    if (
        services.length !== serviceIds.length
        || services.some((service) => service.shopId?.toString() !== shopId)
    ) {
        throw new BadRequestError('Selected services must belong to the target shop');
    }

    // Claim employee slot atomically
    const employee = await employeeRepository.claimSlot(employeeId, date, time, { shopId });
    if (!employee) throw new BadRequestError('Employee not available at this date/time');

    const totalAmount = sumServicePrices(services);
    assertBundleMinimum(services, totalAmount);

    let booking;
    try {
        booking = await bookingRepository.create({
            customerId,
            serviceIds,
            employeeId,
            shopId,
            date,
            time,
            totalAmount,
            status: BOOKING_STATUS.PENDING,
            paymentStatus: PAYMENT_STATUS.PENDING,
            payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
        });
    } catch (error) {
        await employeeRepository.releaseSlot(employeeId, date, time);
        throw error;
    }

    return {
        bookingId: booking._id,
        shopId,
        customerId,
        employee,
        services,
        date,
        time,
        totalAmount,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        payoutStatus: booking.payoutStatus,
        paymentRequired: true,
    };
};

// ── Customer: get booking details ────────────────────────────────────────

export const getBookingDetails = async (bookingId, userId) => {
    const booking = await bookingRepository.findByIdPopulated(bookingId);
    if (!booking) throw new NotFoundError('Booking');

    const customer = await customerRepository.findByUserId(userId);
    if (!customer || (booking.customerId._id || booking.customerId).toString() !== customer._id.toString()) {
        throw new ForbiddenError('You can only access your own bookings');
    }

    const services = normalizeBookedServices(
        await serviceRepository.findByIds(
            booking.serviceIds,
            'serviceName finalPrice totalPrice actualPrice offerPrice imageUrl serviceType',
        ),
    );
    const totalAmount = sumServicePrices(services);

    return {
        bookingId: booking._id,
        customer: booking.customerId,
        employee: booking.employeeId,
        shop: booking.shopId,
        date: booking.date,
        time: booking.time,
        services,
        totalAmount,
        totalServices: services.length,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        payoutStatus: booking.payoutStatus,
        paymentTransactionId: booking.paymentTransactionId,
        merchantOrderId: booking.merchantOrderId,
    };
};

// ── Customer: cancel booking ─────────────────────────────────────────────

export const cancelBooking = async (bookingId, userId) => {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking');

    const customer = await customerRepository.findByUserId(userId);
    if (!customer || (booking.customerId._id || booking.customerId).toString() !== customer._id.toString()) {
        throw new ForbiddenError('You can only cancel your own bookings');
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) throw new BadRequestError('Booking is already cancelled');
    if (booking.status === BOOKING_STATUS.COMPLETED) throw new BadRequestError('Cannot cancel a completed booking');

    // Check if past
    if (!isBookingInFuture(booking.date.toISOString().split('T')[0], booking.time)) {
        throw new BadRequestError('Appointment has already passed');
    }

    // Check cancellation window
    if (isWithinCancellationWindow(booking.date, booking.time, CANCELLATION_WINDOW_HOURS)) {
        throw new BadRequestError(`Cancellation not allowed within ${CANCELLATION_WINDOW_HOURS} hours of appointment`);
    }

    // Release employee slot
    await employeeRepository.releaseSlot(booking.employeeId, booking.date.toISOString().split('T')[0], booking.time);
    let cancellationNote = null;

    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
        if (![PAYOUT_STATUS.NOT_INITIATED, PAYOUT_STATUS.FAILED, PAYOUT_STATUS.REVERSED].includes(booking.payoutStatus)) {
            logger.warn('[BookingService] Cannot auto-refund cancelled booking after payout started', { bookingId });
            cancellationNote = 'Refund window has closed. Please request a manual refund.';
        } else {
            try {
                const { initiateRefund } = await import('./payment.service.js');
                const refundResult = await initiateRefund(bookingId, 'Booking cancelled by customer');

                logger.info('[BookingService] Auto-refund initiated for cancelled booking', {
                    bookingId,
                    refundAmount: refundResult.refundAmount,
                    deductions: refundResult.deductions,
                });
            } catch (error) {
                logger.error('[BookingService] Auto-refund failed for cancelled booking', {
                    bookingId,
                    error: error.message,
                });
                cancellationNote = 'Refund could not be initiated automatically. Please request a manual refund.';
            }
        }
    }

    return bookingRepository.updateById(bookingId, {
        status: BOOKING_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancellationNote,
    });
};

// ── Customer: reschedule booking ─────────────────────────────────────────

export const rescheduleBooking = async (bookingId, userId, newDate, newTime) => {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking');

    const customer = await customerRepository.findByUserId(userId);
    if (!customer || (booking.customerId._id || booking.customerId).toString() !== customer._id.toString()) {
        throw new ForbiddenError('You can only reschedule your own bookings');
    }

    if (!isBookingInFuture(booking.date.toISOString().split('T')[0], booking.time)) {
        throw new BadRequestError('Appointment has already passed');
    }

    if (isWithinCancellationWindow(booking.date, booking.time, CANCELLATION_WINDOW_HOURS)) {
        throw new BadRequestError(`Reschedule not allowed within ${CANCELLATION_WINDOW_HOURS} hours of appointment`);
    }

    if (booking.rescheduleCount >= MAX_RESCHEDULE_COUNT) {
        throw new BadRequestError('You can only reschedule once');
    }

    // Check for conflict
    const conflict = await bookingRepository.findConflict(booking.shopId, booking.employeeId, newDate, newTime, bookingId);
    if (conflict) throw new BadRequestError('This slot is already booked. Please choose another time.');

    // Release old slot, claim new
    const oldDate = booking.date.toISOString().split('T')[0];
    await employeeRepository.releaseSlot(booking.employeeId, oldDate, booking.time);

    const claimed = await employeeRepository.claimSlot(booking.employeeId, newDate, newTime, { shopId: booking.shopId });
    if (!claimed) {
        // Restore old slot if new claim fails
        await employeeRepository.claimSlot(booking.employeeId, oldDate, booking.time, { shopId: booking.shopId });
        throw new BadRequestError('Employee not available at the new date/time');
    }

    booking.date = newDate;
    booking.time = newTime;
    booking.rescheduleCount += 1;
    await booking.save();

    return booking;
};

// ── Customer: reorder (re-book) ──────────────────────────────────────────

export const reorderBooking = async (userId, bookingId, newDate, newTime) => {
    const customer = await customerRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError('Customer profile');
    const customerId = customer._id;

    const existing = await bookingRepository.findById(bookingId);
    if (!existing) throw new NotFoundError('Original booking');
    if ((existing.customerId._id || existing.customerId).toString() !== customerId.toString()) {
        throw new ForbiddenError('You can only reorder your own bookings');
    }

    // Prevent same date/time
    if (existing.date.toISOString().split('T')[0] === new Date(newDate).toISOString().split('T')[0] && existing.time === newTime) {
        throw new BadRequestError('Please choose a different date or time');
    }

    if (!isBookingInFuture(newDate, newTime)) {
        throw new BadRequestError('Cannot book for a past date/time');
    }

    const services = normalizeBookedServices(
        await serviceRepository.findByIds(
            existing.serviceIds,
            'serviceName finalPrice totalPrice actualPrice offerPrice serviceType',
        ),
    );
    const totalAmount = sumServicePrices(services);
    assertBundleMinimum(services, totalAmount);

    const employee = await employeeRepository.claimSlot(existing.employeeId, newDate, newTime, {
        shopId: existing.shopId,
    });
    if (!employee) throw new BadRequestError('Employee not available');

    try {
        const newBooking = await bookingRepository.create({
            customerId,
            serviceIds: existing.serviceIds,
            employeeId: existing.employeeId,
            shopId: existing.shopId,
            date: newDate,
            time: newTime,
            totalAmount,
            status: BOOKING_STATUS.PENDING,
            paymentStatus: PAYMENT_STATUS.PENDING,
            payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
        });

        return {
            bookingId: newBooking._id,
            employee,
            services,
            totalAmount,
            status: newBooking.status,
            paymentStatus: newBooking.paymentStatus,
            payoutStatus: newBooking.payoutStatus,
            paymentRequired: true,
        };
    } catch (err) {
        await employeeRepository.releaseSlot(existing.employeeId, newDate, newTime);
        throw err;
    }
};

// ── Customer: list bookings (past/upcoming/favorites) ────────────────────

export const getCustomerBookings = async (userId, type, query = {}) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const customer = await customerRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError('Customer profile');
    const customerId = customer._id;

    if (type === 'past') {
        const total = await bookingRepository.countPastByCustomer(customerId, today);
        const { skip, limit, pagination } = buildPagination(query, total);
        const items = await bookingRepository.findPastByCustomer(customerId, today, { skip, limit });
        return { items, pagination };
    }
    if (type === 'upcoming') {
        const total = await bookingRepository.countUpcomingByCustomer(customerId, today);
        const { skip, limit, pagination } = buildPagination(query, total);
        const items = await bookingRepository.findUpcomingByCustomer(customerId, today, { skip, limit });
        return { items, pagination };
    }
    if (type === 'favorites') {
        const customerPopulated = await customerRepository.findByUserIdPopulated(userId);
        const favorites = customerPopulated?.favoriteBookings || [];
        const total = favorites.length;
        const { skip, limit, pagination } = buildPagination(query, total);
        return { items: favorites.slice(skip, limit ? skip + limit : undefined), pagination };
    }

    throw new BadRequestError('Invalid filter type. Use: past, upcoming, or favorites');
};

// ── Customer: toggle favorite ────────────────────────────────────────────

export const toggleFavorite = async (userId, bookingId) => {
    const customer = await customerRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError('Customer');

    const isFavorited = customer.favoriteBookings.some((id) => id.toString() === bookingId);
    if (isFavorited) {
        return customerRepository.removeFavoriteBooking(userId, bookingId);
    }
    return customerRepository.addFavoriteBooking(userId, bookingId);
};

// ── Customer: booking confirmation ───────────────────────────────────────

export const getBookingConfirmation = async (bookingId, userId) => {
    const booking = await bookingRepository.findByIdPopulated(bookingId);
    if (!booking) throw new NotFoundError('Booking');

    const customer = await customerRepository.findByUserId(userId);
    if (!customer || (booking.customerId._id || booking.customerId).toString() !== customer._id.toString()) {
        throw new ForbiddenError('You can only access your own bookings');
    }

    const services = normalizeBookedServices(
        await serviceRepository.findByIds(
            booking.serviceIds,
            'serviceName finalPrice totalPrice actualPrice offerPrice serviceType',
        ),
    );
    const totalAmount = sumServicePrices(services);

    return {
        shopCoverUrl: booking.shopId?.coverUrl,
        date: booking.date,
        time: booking.time,
        services: services.map((s) => s.serviceName),
        totalAmount,
        totalServices: services.length,
    };
};

// ── Customer: update booking ─────────────────────────────────────────────

export const updateBooking = async (bookingId, userId, { employeeId, date, time }) => {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking');

    const customer = await customerRepository.findByUserId(userId);
    if (!customer || (booking.customerId._id || booking.customerId).toString() !== customer._id.toString()) {
        throw new ForbiddenError('You can only update your own bookings');
    }

    const oldDate = booking.date.toISOString().split('T')[0];
    const isSameSlot = booking.employeeId.toString() === employeeId
        && oldDate === new Date(date).toISOString().split('T')[0]
        && booking.time === time;

    // Nothing to update if the slot hasn't changed
    if (isSameSlot) return booking;

    // Release the old slot first (always, regardless of employee change)
    await employeeRepository.releaseSlot(booking.employeeId, oldDate, booking.time);

    // Claim the new slot
    const employee = await employeeRepository.claimSlot(employeeId, date, time, { shopId: booking.shopId });
    if (!employee) {
        // Restore the old slot if the new claim fails
        await employeeRepository.claimSlot(booking.employeeId, oldDate, booking.time, { shopId: booking.shopId });
        throw new BadRequestError('Employee not available at this date/time');
    }

    booking.employeeId = employeeId;
    booking.date = date;
    booking.time = time;
    await booking.save();

    return booking;
};

// ── Customer: employee calendar ──────────────────────────────────────────

export const getEmployeeCalendar = async (employeeId, date) => {
    if (!date) throw new BadRequestError('Date query parameter is required');

    const employee = await employeeRepository.findByIdLean(employeeId, 'firstName lastName blockedDates workingHours');
    if (!employee) throw new NotFoundError('Employee');

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (date < todayStr) throw new BadRequestError('Cannot fetch past bookings');

    let bookings = await bookingRepository.findByEmployeeAndDate(employeeId, date);

    // For today, filter to future-only slots
    if (date === todayStr) {
        const { parseTimeToMinutes } = await import('../utils/time.utils.js');
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        bookings = bookings.filter((b) => {
            const m = parseTimeToMinutes(b.time);
            return m !== null && m > currentMinutes;
        });
    }

    return {
        employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        workingHours: employee.workingHours,
        blockedDates: employee.blockedDates,
        bookedSlots: bookings.map((b) => ({ date: b.date, time: b.time, bookingId: b._id })),
    };
};

// ── Barber-side: booking management ──────────────────────────────────────

export const getBookingsByShop = async (ownerId, query = {}) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const total = await bookingRepository.countAll({ shopId: shop._id });
    const { skip, limit, pagination } = buildPagination(query, total);

    const [bookings, numCustomers, numberOfEmployees] = await Promise.all([
        bookingRepository.findByShopId(shop._id, {}, { skip, limit }),
        bookingRepository.getUniqueCustomerCountForShop(shop._id),
        employeeRepository.countByShopId(shop._id),
    ]);

    return { items: bookings, pagination, numberOfEmployees, numberOfCustomers: numCustomers };
};

export const updateBookingStatus = async (bookingId, status, ownerId) => {
    const allowed = ['cancelled', 'completed', 'confirmed'];
    if (!allowed.includes(status)) throw new BadRequestError(`Invalid status. Allowed: ${allowed.join(', ')}`);

    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const booking = await bookingRepository.findById(bookingId);
    if (!booking || booking.shopId.toString() !== shop._id.toString()) {
        throw new ForbiddenError('You can only manage bookings for your own shop');
    }

    if (status === BOOKING_STATUS.CONFIRMED && booking.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
        throw new BadRequestError('Cannot confirm a booking before payment succeeds');
    }

    if (status === BOOKING_STATUS.COMPLETED && booking.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
        throw new BadRequestError('Cannot complete a booking before payment succeeds');
    }

    if (status === BOOKING_STATUS.CANCELLED && booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
        throw new BadRequestError('Paid bookings must be refunded through the payment refund flow');
    }

    const updated = await bookingRepository.updateById(bookingId, {
        status,
        cancelledAt: status === BOOKING_STATUS.CANCELLED ? new Date() : booking.cancelledAt,
        completedAt: status === BOOKING_STATUS.COMPLETED ? new Date() : booking.completedAt,
        payoutStatus: status === BOOKING_STATUS.COMPLETED
            ? (booking.payoutStatus || PAYOUT_STATUS.NOT_INITIATED)
            : booking.payoutStatus,
    });
    if (!updated) throw new NotFoundError('Booking');
    return updated;
};

export const deleteBookingAfterPayment = async (bookingId, ownerId) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking');
    if (booking.shopId.toString() !== shop._id.toString()) {
        throw new ForbiddenError('You can only manage bookings for your own shop');
    }

    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS || booking.paymentTransactionId) {
        throw new BadRequestError('Paid bookings cannot be deleted. Cancel and refund them instead.');
    }

    await employeeRepository.releaseSlot(booking.employeeId, booking.date.toISOString().split('T')[0], booking.time);
    await bookingRepository.deleteById(bookingId);
    return { message: 'Booking deleted and time slot freed' };
};

export const getBookingStats = async (ownerId) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const [total, pending, completed, cancelled] = await Promise.all([
        bookingRepository.countAll({ shopId: shop._id }),
        bookingRepository.countByStatusForShop(shop._id, 'pending'),
        bookingRepository.countByStatusForShop(shop._id, 'completed'),
        bookingRepository.countByStatusForShop(shop._id, 'cancelled'),
    ]);
    return { total, pending, completed, cancelled };
};

export const getBookingMilestoneProgress = async (ownerId, query = {}) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const period = query.month && query.year
        ? { month: query.month, year: query.year }
        : getDefaultProgressPeriod();
    const { startDate, endDate } = getUtcMonthRange(period.month, period.year);
    const completedBookings = await bookingRepository.countCompletedForShopInDateRange(
        shop._id,
        startDate,
        endDate,
    );

    const progressMax = BOOKING_MILESTONE_TARGETS[BOOKING_MILESTONE_TARGETS.length - 1] || 0;
    const progressValue = progressMax > 0
        ? Math.min(completedBookings, progressMax)
        : completedBookings;
    const milestones = BOOKING_MILESTONE_TARGETS.map((targetBookings, index) => ({
        targetBookings,
        label: getTargetLabel(index),
        isCompleted: completedBookings >= targetBookings,
        remainingBookings: Math.max(targetBookings - completedBookings, 0),
    }));
    const currentMilestone = milestones.filter((milestone) => milestone.isCompleted).at(-1) || null;
    const nextMilestone = milestones.find((milestone) => !milestone.isCompleted) || null;

    return {
        period: {
            ...period,
            label: MONTH_LABEL_FORMATTER.format(new Date(Date.UTC(period.year, period.month - 1, 1))),
        },
        status: 'active',
        completedBookings,
        progress: {
            min: 0,
            max: progressMax,
            value: progressValue,
            percentage: progressMax > 0
                ? Number(((progressValue / progressMax) * 100).toFixed(2))
                : 0,
        },
        milestones,
        currentMilestone: currentMilestone ? {
            targetBookings: currentMilestone.targetBookings,
            label: currentMilestone.label,
            statusText: `${currentMilestone.label} completed`,
        } : null,
        nextMilestone: nextMilestone ? {
            targetBookings: nextMilestone.targetBookings,
            label: nextMilestone.label,
            remainingBookings: nextMilestone.remainingBookings,
            rewardMessage: `Just ${nextMilestone.remainingBookings} more bookings to reach your next reward!`,
        } : null,
    };
};

export const getBookingsByStatusDetailed = async (ownerId, status, query = {}) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const total = await bookingRepository.countByStatusForShop(shop._id, status);
    const { skip, limit, pagination } = buildPagination(query, total);

    const items = await bookingRepository.findByStatusForShop(shop._id, status, { skip, limit });
    return { items, pagination };
};
