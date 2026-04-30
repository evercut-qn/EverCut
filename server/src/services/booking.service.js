import bookingRepository from '../repositories/booking.repository.js';
import employeeRepository from '../repositories/employee.repository.js';
import serviceRepository from '../repositories/service.repository.js';
import shopRepository from '../repositories/shop.repository.js';
import customerRepository from '../repositories/customer.repository.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/api-error.js';
import {
    isBookingInFuture,
    isWithinShopHours,
    getDayOfWeek,
    isWithinCancellationWindow,
    toTwentyFourHourTime,
    isValidBookingDateTime,
    isWithinBookingWindow,
} from '../utils/time.utils.js';
import { buildPagination } from '../utils/pagination.utils.js';
import {
    BOOKING_MILESTONE_TARGETS,
    BOOKING_STATUS,
    BOOKING_LIMITS,
    BUNDLE_RULES,
    MAX_RESCHEDULE_COUNT,
    CANCELLATION_WINDOW_HOURS,
    PAYMENT_STATUS,
    PAYOUT_STATUS,
    SERVICE_TYPE,
} from '../utils/constants.js';
import { getEffectiveServicePrice, normalizeServicePricing } from '../utils/service-pricing.utils.js';
import { buildSlotLockTimes, toDateOnlyString } from '../utils/slot-lock.utils.js';
import logger from '../utils/logger.js';

/**
 * Booking service — all booking business logic.
 */

// ── Customer: book a salon ───────────────────────────────────────────────

const normalizeBookedServices = (services = []) => services.map(normalizeServicePricing);
const toObjectIdString = (value) => String(value?._id || value || '');
const isIdInList = (ids = [], id) => ids.some((item) => toObjectIdString(item) === toObjectIdString(id));
const paginateArray = (items, query = {}) => {
    const { skip, limit, pagination } = buildPagination(query, items.length);
    return {
        items: items.slice(skip, skip + limit),
        pagination,
    };
};
const sumServicePrices = (services = []) => services.reduce(
    (sum, service) => sum + (getEffectiveServicePrice(service) ?? 0),
    0,
);
const getServiceDuration = (service) => (
    service.serviceType === SERVICE_TYPE.BUNDLED
        ? service.totalDuration
        : service.duration
);
const sumServiceDurations = (services = []) => services.reduce(
    (sum, service) => sum + (Number(getServiceDuration(service)) || 0),
    0,
);
const assertValidServiceDuration = (durationMinutes) => {
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        throw new BadRequestError('Selected services must have a valid duration');
    }
};
const normalizeBookingTime = (time) => {
    const normalized = toTwentyFourHourTime(time);
    if (!normalized) throw new BadRequestError('Booking time must use HH:MM or hh:mm AM/PM format');
    return normalized;
};
const getBookingSlotLockTimes = (booking) => {
    if (Array.isArray(booking.slotLockTimes) && booking.slotLockTimes.length > 0) {
        return booking.slotLockTimes;
    }

    const normalizedTime = toTwentyFourHourTime(booking.time);
    return normalizedTime ? [normalizedTime] : [booking.time].filter(Boolean);
};
const releaseBookingSlotLock = async (booking) => {
    await employeeRepository.releaseSlots(
        booking.employeeId,
        toDateOnlyString(booking.date),
        getBookingSlotLockTimes(booking),
    );
};
const assertBookingCanChangeBeforePayment = (booking) => {
    if (booking.status !== BOOKING_STATUS.PENDING || booking.paymentStatus !== PAYMENT_STATUS.PENDING) {
        throw new BadRequestError('Booking cannot be changed after payment has started');
    }
};
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

const buildBookingDetailsPayload = async (booking) => {
    const services = normalizeBookedServices(
        await serviceRepository.findByIds(
            booking.serviceIds,
            'serviceName finalPrice totalPrice actualPrice offerPrice imageUrl serviceType duration totalDuration',
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
        durationMinutes: booking.durationMinutes || sumServiceDurations(services),
        paymentTransactionId: booking.paymentTransactionId,
        merchantOrderId: booking.merchantOrderId,
    };
};

export const bookSalon = async (userId, data) => {
    const { serviceId, employeeId, shopId, date, time } = data;
    const normalizedTime = normalizeBookingTime(time);

    const customer = await customerRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError('Customer profile');
    const customerId = customer._id;

    // Validate date/time is in future and within booking window
    if (!isValidBookingDateTime(date, normalizedTime, BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS)) {
        if (!isBookingInFuture(date, normalizedTime)) {
            throw new BadRequestError('Cannot book in the past. Please select a future date and time.');
        }
        throw new BadRequestError(`Bookings can only be made up to ${BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS} days in advance.`);
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
    if (!isWithinShopHours(normalizedTime, shop.openTime, shop.closeTime)) {
        throw new BadRequestError('Booking time is outside shop hours');
    }

    // Normalize serviceIds
    const serviceIds = Array.isArray(serviceId) ? serviceId : [serviceId];

    // Validate: No duplicates
    const uniqueServiceIds = new Set(serviceIds);
    if (uniqueServiceIds.size !== serviceIds.length) {
        throw new BadRequestError('Duplicate services are not allowed');
    }

    // Validate: Maximum services limit
    if (serviceIds.length > BOOKING_LIMITS.MAX_SERVICES_PER_BOOKING) {
        throw new BadRequestError(
            `Cannot select more than ${BOOKING_LIMITS.MAX_SERVICES_PER_BOOKING} services per booking`,
        );
    }

    // Validate services
    const services = normalizeBookedServices(
        await serviceRepository.findByIds(
            serviceIds,
            'serviceName finalPrice totalPrice actualPrice offerPrice serviceType shopId duration totalDuration',
        ),
    );
    if (!services.length) throw new NotFoundError('Services');
    if (
        services.length !== serviceIds.length
        || services.some((service) => service.shopId?.toString() !== shopId)
    ) {
        throw new BadRequestError('Selected services must belong to the target shop');
    }

    const totalAmount = sumServicePrices(services);
    const durationMinutes = sumServiceDurations(services);
    assertValidServiceDuration(durationMinutes);
    assertBundleMinimum(services, totalAmount);

    // Validate: Maximum duration limit
    if (durationMinutes > BOOKING_LIMITS.MAX_BOOKING_DURATION_MINUTES) {
        throw new BadRequestError(
            `Total booking duration cannot exceed ${BOOKING_LIMITS.MAX_BOOKING_DURATION_MINUTES / 60} hours`,
        );
    }

    const slotLockTimes = buildSlotLockTimes(normalizedTime, durationMinutes);

    // Claim employee slot markers atomically.
    const employee = await employeeRepository.claimSlots(employeeId, date, slotLockTimes, { shopId });
    if (!employee) throw new BadRequestError('Employee not available at this date/time');

    let booking;
    try {
        booking = await bookingRepository.create({
            customerId,
            serviceIds,
            employeeId,
            shopId,
            date,
            time: normalizedTime,
            totalAmount,
            durationMinutes,
            slotLockTimes,
            status: BOOKING_STATUS.PENDING,
            paymentStatus: PAYMENT_STATUS.PENDING,
            payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
        });
    } catch (error) {
        await employeeRepository.releaseSlots(employeeId, date, slotLockTimes);
        throw error;
    }

    return {
        bookingId: booking._id,
        shopId,
        customerId,
        employee,
        services,
        date,
        time: normalizedTime,
        totalAmount,
        durationMinutes,
        slotLockTimes,
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

    return buildBookingDetailsPayload(booking);
};

export const getBookingDetailsForShopOwner = async (bookingId, ownerId) => {
    const booking = await bookingRepository.findByIdPopulated(bookingId);
    if (!booking) throw new NotFoundError('Booking');

    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const bookingShopId = booking.shopId?._id || booking.shopId;
    if (bookingShopId.toString() !== shop._id.toString()) {
        throw new ForbiddenError('You can only access bookings for your own shop');
    }

    return buildBookingDetailsPayload(booking);
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

    await releaseBookingSlotLock(booking);
    let cancellationNote = null;

    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
        if (![PAYOUT_STATUS.NOT_INITIATED, PAYOUT_STATUS.FAILED, PAYOUT_STATUS.REVERSED].includes(booking.payoutStatus)) {
            logger.warn('[BookingService] Cannot auto-refund cancelled booking after payout started', { bookingId });
            cancellationNote = 'Refund window has closed. Please request a manual refund.';
        } else {
            try {
                const { initiateRefund } = await import('./payment.service.js');
                const refundResult = await initiateRefund(bookingId, 'Booking cancelled by customer', null, false);

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
    const normalizedNewTime = normalizeBookingTime(newTime);
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking');

    const customer = await customerRepository.findByUserId(userId);
    if (!customer || (booking.customerId._id || booking.customerId).toString() !== customer._id.toString()) {
        throw new ForbiddenError('You can only reschedule your own bookings');
    }

    assertBookingCanChangeBeforePayment(booking);

    if (!isBookingInFuture(booking.date.toISOString().split('T')[0], booking.time)) {
        throw new BadRequestError('Appointment has already passed');
    }

    if (!isValidBookingDateTime(newDate, normalizedNewTime, BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS)) {
        if (!isBookingInFuture(newDate, normalizedNewTime)) {
            throw new BadRequestError('Cannot reschedule to a past date/time');
        }
        throw new BadRequestError(`Bookings can only be made up to ${BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS} days in advance.`);
    }

    if (isWithinCancellationWindow(booking.date, booking.time, CANCELLATION_WINDOW_HOURS)) {
        throw new BadRequestError(`Reschedule not allowed within ${CANCELLATION_WINDOW_HOURS} hours of appointment`);
    }

    if (booking.rescheduleCount >= MAX_RESCHEDULE_COUNT) {
        throw new BadRequestError('You can only reschedule once');
    }

    const oldDate = booking.date.toISOString().split('T')[0];
    const durationMinutes = booking.durationMinutes || sumServiceDurations(
        normalizeBookedServices(
            await serviceRepository.findByIds(
                booking.serviceIds,
                'serviceType duration totalDuration',
            ),
        ),
    );
    assertValidServiceDuration(durationMinutes);
    const oldSlotLockTimes = getBookingSlotLockTimes(booking);
    const newSlotLockTimes = buildSlotLockTimes(normalizedNewTime, durationMinutes);

    await employeeRepository.releaseSlots(booking.employeeId, oldDate, oldSlotLockTimes);

    const claimed = await employeeRepository.claimSlots(booking.employeeId, newDate, newSlotLockTimes, { shopId: booking.shopId });
    if (!claimed) {
        await employeeRepository.claimSlots(booking.employeeId, oldDate, oldSlotLockTimes, { shopId: booking.shopId });
        throw new BadRequestError('Employee not available at the new date/time');
    }

    booking.date = newDate;
    booking.time = normalizedNewTime;
    booking.durationMinutes = durationMinutes;
    booking.slotLockTimes = newSlotLockTimes;
    booking.rescheduleCount += 1;
    await booking.save();

    return booking;
};

// ── Customer: reorder (re-book) ──────────────────────────────────────────

export const reorderBooking = async (userId, bookingId, newDate, newTime) => {
    const normalizedNewTime = normalizeBookingTime(newTime);
    const customer = await customerRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError('Customer profile');
    const customerId = customer._id;

    const existing = await bookingRepository.findById(bookingId);
    if (!existing) throw new NotFoundError('Original booking');
    if ((existing.customerId._id || existing.customerId).toString() !== customerId.toString()) {
        throw new ForbiddenError('You can only reorder your own bookings');
    }

    // Prevent same date/time
    if (existing.date.toISOString().split('T')[0] === new Date(newDate).toISOString().split('T')[0] && existing.time === normalizedNewTime) {
        throw new BadRequestError('Please choose a different date or time');
    }

    if (!isValidBookingDateTime(newDate, normalizedNewTime, BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS)) {
        if (!isBookingInFuture(newDate, normalizedNewTime)) {
            throw new BadRequestError('Cannot book for a past date/time');
        }
        throw new BadRequestError(`Bookings can only be made up to ${BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS} days in advance.`);
    }

    const services = normalizeBookedServices(
        await serviceRepository.findByIds(
            existing.serviceIds,
            'serviceName finalPrice totalPrice actualPrice offerPrice serviceType duration totalDuration',
        ),
    );
    const totalAmount = sumServicePrices(services);
    const durationMinutes = sumServiceDurations(services);
    assertValidServiceDuration(durationMinutes);
    assertBundleMinimum(services, totalAmount);
    const slotLockTimes = buildSlotLockTimes(normalizedNewTime, durationMinutes);

    const employee = await employeeRepository.claimSlots(existing.employeeId, newDate, slotLockTimes, {
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
            time: normalizedNewTime,
            totalAmount,
            durationMinutes,
            slotLockTimes,
            status: BOOKING_STATUS.PENDING,
            paymentStatus: PAYMENT_STATUS.PENDING,
            payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
        });

        return {
            bookingId: newBooking._id,
            employee,
            services,
            totalAmount,
            durationMinutes,
            slotLockTimes,
            status: newBooking.status,
            paymentStatus: newBooking.paymentStatus,
            payoutStatus: newBooking.payoutStatus,
            paymentRequired: true,
        };
    } catch (err) {
        await employeeRepository.releaseSlots(existing.employeeId, newDate, slotLockTimes);
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
        return getFavoriteBookings(userId, query);
    }

    throw new BadRequestError('Invalid filter type. Use: past, upcoming, or favorites');
};

const loadCustomer = async (userId) => {
    const customer = await customerRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError('Customer profile');
    return customer;
};

const assertBookingBelongsToCustomer = async (customer, bookingId) => {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking');

    if (toObjectIdString(booking.customerId) !== toObjectIdString(customer._id)) {
        throw new ForbiddenError('You can only favorite your own bookings');
    }

    return booking;
};

export const getFavoriteBookings = async (userId, query = {}) => {
    const customer = await customerRepository.findFavoriteBookingsByUserId(userId);
    if (!customer) throw new NotFoundError('Customer profile');
    return paginateArray(customer.favoriteBookings || [], query);
};

export const addFavoriteBooking = async (userId, bookingId) => {
    const customer = await loadCustomer(userId);
    await assertBookingBelongsToCustomer(customer, bookingId);
    await customerRepository.addFavoriteBooking(userId, bookingId);

    return {
        favorite: true,
        bookingId,
    };
};

export const removeFavoriteBooking = async (userId, bookingId) => {
    await loadCustomer(userId);
    await customerRepository.removeFavoriteBooking(userId, bookingId);

    return {
        favorite: false,
        bookingId,
    };
};

export const toggleFavoriteBooking = async (userId, bookingId) => {
    const customer = await loadCustomer(userId);
    await assertBookingBelongsToCustomer(customer, bookingId);

    if (isIdInList(customer.favoriteBookings, bookingId)) {
        await customerRepository.removeFavoriteBooking(userId, bookingId);
        return {
            favorite: false,
            bookingId,
        };
    }

    await customerRepository.addFavoriteBooking(userId, bookingId);
    return {
        favorite: true,
        bookingId,
    };
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
            'serviceName finalPrice totalPrice actualPrice offerPrice serviceType duration totalDuration',
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
    const normalizedTime = normalizeBookingTime(time);
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking');

    const customer = await customerRepository.findByUserId(userId);
    if (!customer || (booking.customerId._id || booking.customerId).toString() !== customer._id.toString()) {
        throw new ForbiddenError('You can only update your own bookings');
    }

    assertBookingCanChangeBeforePayment(booking);

    if (!isValidBookingDateTime(date, normalizedTime, BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS)) {
        if (!isBookingInFuture(date, normalizedTime)) {
            throw new BadRequestError('Cannot update to a past date/time');
        }
        throw new BadRequestError(`Bookings can only be made up to ${BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS} days in advance.`);
    }

    const oldDate = booking.date.toISOString().split('T')[0];
    const isSameSlot = booking.employeeId.toString() === employeeId
        && oldDate === new Date(date).toISOString().split('T')[0]
        && booking.time === normalizedTime;

    // Nothing to update if the slot hasn't changed
    if (isSameSlot) return booking;

    const durationMinutes = booking.durationMinutes || sumServiceDurations(
        normalizeBookedServices(
            await serviceRepository.findByIds(
                booking.serviceIds,
                'serviceType duration totalDuration',
            ),
        ),
    );
    assertValidServiceDuration(durationMinutes);
    const oldSlotLockTimes = getBookingSlotLockTimes(booking);
    const newSlotLockTimes = buildSlotLockTimes(normalizedTime, durationMinutes);

    await employeeRepository.releaseSlots(booking.employeeId, oldDate, oldSlotLockTimes);

    // Claim the new slot
    const employee = await employeeRepository.claimSlots(employeeId, date, newSlotLockTimes, { shopId: booking.shopId });
    if (!employee) {
        await employeeRepository.claimSlots(booking.employeeId, oldDate, oldSlotLockTimes, { shopId: booking.shopId });
        throw new BadRequestError('Employee not available at this date/time');
    }

    booking.employeeId = employeeId;
    booking.date = date;
    booking.time = normalizedTime;
    booking.durationMinutes = durationMinutes;
    booking.slotLockTimes = newSlotLockTimes;
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

    // Check if date is within booking window
    if (!isWithinBookingWindow(date, BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS, now)) {
        throw new BadRequestError(`Calendar can only be viewed up to ${BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS} days in advance.`);
    }

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

// ── Customer: available slots ────────────────────────────────────────────

export const getAvailableSlots = async (employeeId, date, serviceId) => {
    if (!date) throw new BadRequestError('Date query parameter is required');
    if (!serviceId) throw new BadRequestError('ServiceId query parameter is required');

    // Validate date format
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
        throw new BadRequestError('Date must be in YYYY-MM-DD format');
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (date < todayStr) {
        throw new BadRequestError('Cannot fetch availability for past dates');
    }

    // Check if date is within booking window
    if (!isWithinBookingWindow(date, BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS, now)) {
        throw new BadRequestError(`Availability can only be checked up to ${BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS} days in advance.`);
    }

    // Normalize serviceIds to array
    const serviceIds = Array.isArray(serviceId) ? serviceId : [serviceId];

    // Get employee details
    const employee = await employeeRepository.findByIdLean(
        employeeId,
        'firstName lastName shopId workingHours blockedDates isActive',
    );
    if (!employee) throw new NotFoundError('Employee');
    if (!employee.isActive) throw new BadRequestError('Employee is not active');

    // Get shop details
    const shop = await shopRepository.findByIdWithFields(
        employee.shopId,
        'shopName openTime closeTime isOpen',
    );
    if (!shop) throw new NotFoundError('Shop');
    if (!shop.isOpen) throw new BadRequestError('Shop is currently closed');

    // Get service details
    const services = normalizeBookedServices(
        await serviceRepository.findByIds(serviceIds, 'serviceName serviceType shopId duration totalDuration'),
    );
    if (!services.length) throw new NotFoundError('Services');
    if (services.length !== serviceIds.length) {
        throw new BadRequestError('One or more services not found');
    }
    if (services.some((service) => String(service.shopId) !== String(employee.shopId))) {
        throw new BadRequestError('All services must belong to this shop');
    }

    // Calculate total service duration
    const serviceDuration = sumServiceDurations(services);

    if (!serviceDuration || serviceDuration <= 0) {
        throw new BadRequestError('Services must have a valid total duration');
    }

    // Get booked slots for this date
    const bookings = await bookingRepository.findByEmployeeAndDate(employeeId, date);
    const bookedSlots = bookings.map((b) => ({
        date: b.date,
        time: b.time,
        durationMinutes: b.durationMinutes,
    }));

    // Calculate available slots
    const { calculateAvailableSlots } = await import('../utils/slot-calculator.utils.js');
    const availability = calculateAvailableSlots({
        date,
        shopHours: {
            openTime: shop.openTime,
            closeTime: shop.closeTime,
        },
        employeeHours: employee.workingHours,
        serviceDuration,
        bookedSlots,
        blockedDates: employee.blockedDates || [],
        now,
    });

    return {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        date,
        services: services.map((s) => ({
            id: s._id,
            name: s.serviceName,
            duration: getServiceDuration(s),
        })),
        totalDuration: serviceDuration,
        shopHours: {
            openTime: shop.openTime,
            closeTime: shop.closeTime,
        },
        employeeHours: employee.workingHours,
        ...availability,
    };
};

export const getShopAvailability = async (shopId, date, serviceId) => {
    if (!date) throw new BadRequestError('Date query parameter is required');
    if (!serviceId) throw new BadRequestError('ServiceId query parameter is required');

    // Validate date format
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
        throw new BadRequestError('Date must be in YYYY-MM-DD format');
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (date < todayStr) {
        throw new BadRequestError('Cannot fetch availability for past dates');
    }

    // Check if date is within booking window
    if (!isWithinBookingWindow(date, BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS, now)) {
        throw new BadRequestError(`Availability can only be checked up to ${BOOKING_LIMITS.MAX_ADVANCE_BOOKING_DAYS} days in advance.`);
    }

    // Normalize serviceIds to array
    const serviceIds = Array.isArray(serviceId) ? serviceId : [serviceId];

    // Get shop details
    const shop = await shopRepository.findById(shopId);
    if (!shop) throw new NotFoundError('Shop');
    if (!shop.isOpen) throw new BadRequestError('Shop is currently closed');

    // Get service details
    const services = normalizeBookedServices(
        await serviceRepository.findByIds(serviceIds, 'serviceName serviceType shopId duration totalDuration'),
    );
    if (!services.length) throw new NotFoundError('Services');
    if (services.length !== serviceIds.length) {
        throw new BadRequestError('One or more services not found');
    }
    if (services.some((service) => String(service.shopId) !== String(shopId))) {
        throw new BadRequestError('All services must belong to this shop');
    }

    // Calculate total service duration
    const serviceDuration = sumServiceDurations(services);

    if (!serviceDuration || serviceDuration <= 0) {
        throw new BadRequestError('Services must have a valid total duration');
    }

    // Get all active employees for this shop
    const employees = await employeeRepository.findByShopId(shopId, {});
    const activeEmployees = employees.filter((emp) => emp.isActive && !emp.deletedAt);

    if (activeEmployees.length === 0) {
        return {
            shopId,
            shopName: shop.shopName,
            date,
            services: services.map((s) => ({
                id: s._id,
                name: s.serviceName,
                duration: getServiceDuration(s),
            })),
            totalDuration: serviceDuration,
            employees: [],
            firstAvailable: null,
        };
    }

    // Calculate availability for each employee
    const { getAvailableSlotTimes } = await import('../utils/slot-calculator.utils.js');
    const employeeAvailability = [];
    let firstAvailable = null;

    for (const employee of activeEmployees) {
        // Get booked slots for this employee on this date
        const bookings = await bookingRepository.findByEmployeeAndDate(employee._id, date);
        const bookedSlots = bookings.map((b) => ({
            date: b.date,
            time: b.time,
            durationMinutes: b.durationMinutes,
        }));

        // Calculate available slots
        const availableSlots = getAvailableSlotTimes({
            date,
            shopHours: {
                openTime: shop.openTime,
                closeTime: shop.closeTime,
            },
            employeeHours: employee.workingHours,
            serviceDuration,
            bookedSlots,
            blockedDates: employee.blockedDates || [],
            now,
        });

        if (availableSlots.length > 0) {
            employeeAvailability.push({
                employeeId: employee._id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                photoUrl: employee.photoUrl,
                availableSlots,
                totalAvailable: availableSlots.length,
            });

            // Track first available slot across all employees
            if (!firstAvailable || availableSlots[0] < firstAvailable.time) {
                firstAvailable = {
                    employeeId: employee._id,
                    employeeName: `${employee.firstName} ${employee.lastName}`,
                    time: availableSlots[0],
                };
            }
        }
    }

    return {
        shopId,
        shopName: shop.shopName,
        date,
        services: services.map((s) => ({
            id: s._id,
            name: s.serviceName,
            duration: getServiceDuration(s),
        })),
        totalDuration: serviceDuration,
        employees: employeeAvailability,
        firstAvailable,
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
    const allowed = [
        BOOKING_STATUS.CANCELLED,
        BOOKING_STATUS.COMPLETED,
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.NO_SHOW,
    ];
    if (!allowed.includes(status)) throw new BadRequestError(`Invalid status. Allowed: ${allowed.join(', ')}`);

    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const booking = await bookingRepository.findById(bookingId);
    if (!booking || booking.shopId.toString() !== shop._id.toString()) {
        throw new ForbiddenError('You can only manage bookings for your own shop');
    }

    // Prevent manual status changes for bookings awaiting confirmation
    if (booking.status === BOOKING_STATUS.AWAITING_CONFIRMATION) {
        throw new BadRequestError('Use the confirm or cancel endpoints for bookings awaiting confirmation');
    }

    if (status === BOOKING_STATUS.CONFIRMED && booking.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
        throw new BadRequestError('Cannot confirm a booking before payment succeeds');
    }

    if ([BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW].includes(status) && booking.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
        throw new BadRequestError('Cannot close a booking before payment succeeds');
    }

    if (status === BOOKING_STATUS.CANCELLED && booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
        throw new BadRequestError('Paid bookings must be refunded through the payment refund flow');
    }

    const updated = await bookingRepository.updateById(bookingId, {
        status,
        cancelledAt: status === BOOKING_STATUS.CANCELLED ? new Date() : booking.cancelledAt,
        completedAt: status === BOOKING_STATUS.COMPLETED ? new Date() : booking.completedAt,
        noShowAt: status === BOOKING_STATUS.NO_SHOW ? new Date() : booking.noShowAt,
        payoutStatus: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW].includes(status)
            ? (booking.payoutStatus || PAYOUT_STATUS.NOT_INITIATED)
            : booking.payoutStatus,
    });
    if (!updated) throw new NotFoundError('Booking');
    return updated;
};

// Removed: deleteBookingAfterPayment - merged into cancelBookingByBarber

export const getBookingStats = async (ownerId) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const [total, pending, awaitingConfirmation, completed, cancelled] = await Promise.all([
        bookingRepository.countAll({ shopId: shop._id }),
        bookingRepository.countByStatusForShop(shop._id, 'pending'),
        bookingRepository.countByStatusForShop(shop._id, 'awaiting_confirmation'),
        bookingRepository.countByStatusForShop(shop._id, 'completed'),
        bookingRepository.countByStatusForShop(shop._id, 'cancelled'),
    ]);
    return { total, pending, awaitingConfirmation, completed, cancelled };
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

// ── Barber: Get Pending Confirmations ────────────────────────────────────

export const getPendingConfirmations = async (ownerId, query = {}) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const filter = {
        shopId: shop._id,
        status: BOOKING_STATUS.AWAITING_CONFIRMATION,
        paymentStatus: PAYMENT_STATUS.SUCCESS,
    };

    const total = await bookingRepository.countAll(filter);
    const { skip, limit, pagination } = buildPagination(query, total);

    const items = await bookingRepository.findByShopId(
        shop._id,
        {
            status: BOOKING_STATUS.AWAITING_CONFIRMATION,
            paymentStatus: PAYMENT_STATUS.SUCCESS,
        },
        { skip, limit, sort: { paidAt: -1 } },
    );

    return { items, pagination };
};

// ── Barber: Confirm Booking ──────────────────────────────────────────────

export const confirmBookingByBarber = async (bookingId, ownerId) => {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking');

    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    if (booking.shopId.toString() !== shop._id.toString()) {
        throw new ForbiddenError('You can only confirm bookings for your own shop');
    }

    if (booking.status !== BOOKING_STATUS.AWAITING_CONFIRMATION) {
        throw new BadRequestError('Booking is not awaiting confirmation');
    }

    if (booking.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
        throw new BadRequestError('Payment must be successful before confirming booking');
    }

    const updated = await bookingRepository.updateById(bookingId, {
        status: BOOKING_STATUS.CONFIRMED,
        barberConfirmedAt: new Date(),
    });

    logger.info('[BookingService] Booking confirmed by barber', {
        bookingId,
        shopId: shop._id,
        ownerId,
    });

    return updated;
};

// ── Barber: Cancel Booking (Paid or Unpaid) ──────────────────────────────

export const cancelBookingByBarber = async (bookingId, ownerId) => {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking');

    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    if (booking.shopId.toString() !== shop._id.toString()) {
        throw new ForbiddenError('You can only cancel bookings for your own shop');
    }

    await releaseBookingSlotLock(booking);

    // Handle PAID bookings
    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
        // Only allow cancellation if awaiting confirmation
        if (booking.status !== BOOKING_STATUS.AWAITING_CONFIRMATION) {
            throw new BadRequestError('Can only cancel paid bookings that are awaiting confirmation');
        }

        // Initiate FULL refund (no deductions)
        try {
            const { initiateRefund } = await import('./payment.service.js');
            await initiateRefund(bookingId, 'Barber cancelled booking', null, true);

            logger.info('[BookingService] Full refund initiated for barber-cancelled booking', {
                bookingId,
                shopId: shop._id,
                ownerId,
            });
        } catch (error) {
            logger.error('[BookingService] Refund failed for barber-cancelled booking', {
                bookingId,
                error: error.message,
            });
            // Continue with cancellation even if refund fails
        }

        const updated = await bookingRepository.updateById(bookingId, {
            status: BOOKING_STATUS.CANCELLED,
            barberCancelledAt: new Date(),
            cancelledAt: new Date(),
        });

        logger.info('[BookingService] Paid booking cancelled by barber', {
            bookingId,
            shopId: shop._id,
            ownerId,
        });

        return updated;
    }

    // Handle UNPAID bookings - just delete
    await bookingRepository.deleteById(bookingId);

    logger.info('[BookingService] Unpaid booking deleted by barber', {
        bookingId,
        shopId: shop._id,
        ownerId,
    });

    return { message: 'Booking deleted and time slot freed' };
};

// ── System: Auto-Cancel Awaiting Bookings ────────────────────────────────

export const autoCancelAwaitingBookings = async () => {
    const CONFIRMATION_TIMEOUT_HOURS = 24;
    const cutoffTime = new Date(Date.now() - CONFIRMATION_TIMEOUT_HOURS * 60 * 60 * 1000);

    logger.info('[BookingService] Starting auto-cancel job', {
        cutoffTime,
        timeoutHours: CONFIRMATION_TIMEOUT_HOURS,
    });

    // Find bookings awaiting confirmation for more than 24 hours
    const expiredBookings = await bookingRepository.findAwaitingConfirmationExpired(cutoffTime, 100);

    if (expiredBookings.length === 0) {
        logger.info('[BookingService] No bookings to auto-cancel');
        return { processed: 0, succeeded: 0, failed: 0 };
    }

    logger.info('[BookingService] Found bookings to auto-cancel', {
        count: expiredBookings.length,
    });

    let succeeded = 0;
    let failed = 0;

    for (const booking of expiredBookings) {
        try {
            // Double-check status (prevent race conditions)
            const currentBooking = await bookingRepository.findById(booking._id);
            if (!currentBooking || currentBooking.status !== BOOKING_STATUS.AWAITING_CONFIRMATION) {
                logger.warn('[BookingService] Booking status changed, skipping auto-cancel', {
                    bookingId: booking._id,
                    currentStatus: currentBooking?.status,
                });
                continue;
            }

            await releaseBookingSlotLock(booking);

            // Initiate FULL refund (no deductions for auto-cancel)
            try {
                const { initiateRefund } = await import('./payment.service.js');
                await initiateRefund(
                    booking._id,
                    'Booking auto-cancelled - Barber did not respond within 24 hours',
                    null,
                    true, // isBarberCancellation = true (full refund)
                );

                logger.info('[BookingService] Full refund initiated for auto-cancelled booking', {
                    bookingId: booking._id,
                    shopId: booking.shopId,
                });
            } catch (error) {
                logger.error('[BookingService] Refund failed for auto-cancelled booking', {
                    bookingId: booking._id,
                    error: error.message,
                });
                // Continue with cancellation even if refund fails
            }

            // Update booking status
            await bookingRepository.updateById(booking._id, {
                status: BOOKING_STATUS.CANCELLED,
                autoCancelledAt: new Date(),
                cancelledAt: new Date(),
            });

            // Update shop stats (increment missed confirmation count)
            await shopRepository.updateById(booking.shopId, {
                $inc: { missedConfirmationCount: 1 },
                lastMissedConfirmationAt: new Date(),
            });

            logger.info('[BookingService] Booking auto-cancelled successfully', {
                bookingId: booking._id,
                shopId: booking.shopId,
                customerId: booking.customerId,
            });

            succeeded++;
        } catch (error) {
            logger.error('[BookingService] Failed to auto-cancel booking', {
                bookingId: booking._id,
                error: error.message,
                stack: error.stack,
            });
            failed++;
        }
    }

    const summary = {
        processed: expiredBookings.length,
        succeeded,
        failed,
    };

    logger.info('[BookingService] Auto-cancel job completed', summary);

    return summary;
};
