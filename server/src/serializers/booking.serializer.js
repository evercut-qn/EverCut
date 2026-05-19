import { BOOKING_STATUS, PAYMENT_STATUS, PAYOUT_STATUS } from '../utils/constants.js';
import { getEffectiveServicePrice } from '../utils/service-pricing.utils.js';
import { sanitizeForResponse, toIdString, toPlainObject } from './core.serializer.js';
import { serializeCustomerSummary } from './customer.serializer.js';
import { serializeEmployee } from './employee.serializer.js';
import { serializeService, serializeServices } from './service.serializer.js';
import { serializeShopSummary } from './shop.serializer.js';

const compact = (value) => Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
);

const resolveId = (value) => (value && typeof value === 'object' ? value.id : toIdString(value));

const isObjectIdLike = (value) => (
    value
    && typeof value === 'object'
    && (
        typeof value.toHexString === 'function'
        || value._bsontype === 'ObjectId'
    )
);

const isPopulatedRef = (value) => (
    value
    && typeof value === 'object'
    && !isObjectIdLike(value)
);

const serializeBookingRef = (value, serializer) => (
    isPopulatedRef(value) ? serializer(value) : undefined
);

const toDateOnlyString = (value) => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    return String(value).slice(0, 10);
};

const withEmployeeBookingAvailability = (employee, bookingDate) => {
    if (!employee || typeof employee !== 'object' || !bookingDate) return employee;
    const plainEmployee = toPlainObject(employee);
    if (plainEmployee.isAvailableOnBookingDate !== undefined) return plainEmployee;

    const bookingDateText = toDateOnlyString(bookingDate);
    const blockedDates = Array.isArray(plainEmployee.blockedDates) ? plainEmployee.blockedDates : [];
    const isBlocked = blockedDates.some((blockedDate) => toDateOnlyString(blockedDate) === bookingDateText);

    return {
        ...plainEmployee,
        isAvailableOnBookingDate: !isBlocked,
    };
};

export const serializeBooking = (booking, options = {}) => {
    const raw = toPlainObject(booking);
    const plain = sanitizeForResponse(raw);
    if (!plain) return null;

    const rawServices = options.services
        || raw.services
        || (
            Array.isArray(raw.serviceIds) && raw.serviceIds.some((service) => service && typeof service === 'object')
                ? raw.serviceIds
                : []
        );
    const services = serializeServices(rawServices);

    const customer = serializeBookingRef(raw.customerId || raw.customer, serializeCustomerSummary);
    const employee = serializeBookingRef(
        withEmployeeBookingAvailability(raw.employeeId || raw.employee, raw.date ?? plain.date),
        (value) => serializeEmployee(value, { publicView: true }),
    );
    const shop = serializeBookingRef(raw.shopId || raw.shop, serializeShopSummary);

    return compact({
        id: plain.id,
        customerId: customer ? undefined : resolveId(plain.customerId || plain.customer),
        customer,
        shopId: shop ? undefined : resolveId(plain.shopId || plain.shop),
        shop,
        employeeId: employee ? undefined : resolveId(plain.employeeId || plain.employee),
        employee,
        serviceIds: services.length > 0 ? undefined : (Array.isArray(plain.serviceIds)
            ? plain.serviceIds.map(resolveId).filter(Boolean)
            : undefined),
        services,
        date: plain.date ?? null,
        time: plain.time ?? null,
        endTime: plain.endTime ?? null,
        startMinute: plain.startMinute,
        endMinute: plain.endMinute,
        totalAmount: plain.totalAmount ?? 0,
        durationMinutes: plain.durationMinutes ?? 0,
        slotLockTimes: plain.slotLockTimes ?? [],
        status: plain.status ?? BOOKING_STATUS.PENDING,
        paymentStatus: plain.paymentStatus ?? PAYMENT_STATUS.PENDING,
        paymentTransactionId: resolveId(plain.paymentTransactionId),
        merchantOrderId: plain.merchantOrderId ?? null,
        paymentGateway: plain.paymentGateway,
        paidAt: plain.paidAt ?? null,
        paymentMode: plain.paymentMode ?? null,
        payoutTransactionId: resolveId(plain.payoutTransactionId),
        payoutStatus: plain.payoutStatus ?? PAYOUT_STATUS.NOT_INITIATED,
        payoutCompletedAt: plain.payoutCompletedAt ?? null,
        barberUtr: plain.barberUtr ?? null,
        completedAt: plain.completedAt ?? null,
        cancellationNote: plain.cancellationNote ?? null,
        rescheduleCount: plain.rescheduleCount ?? 0,
        cancelledAt: plain.cancelledAt ?? null,
        barberCancelledAt: plain.barberCancelledAt ?? null,
        barberConfirmedAt: plain.barberConfirmedAt ?? null,
        autoCancelledAt: plain.autoCancelledAt ?? null,
        noShowAt: plain.noShowAt ?? null,
        paymentRequired: plain.paymentRequired,
        idempotentReplay: plain.idempotentReplay,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    });
};

export const serializeBookingCreation = (booking) => {
    const raw = toPlainObject(booking);
    const plain = sanitizeForResponse(raw);
    if (!plain) return null;

    const rawServices = raw.services
        || (
            Array.isArray(raw.serviceIds) && raw.serviceIds.some((service) => service && typeof service === 'object')
                ? raw.serviceIds
                : []
        );
    const services = serializeServices(rawServices);
    const serviceAmount = services.reduce(
        (sum, service) => sum + (getEffectiveServicePrice(service) || 0),
        0,
    );

    return compact({
        id: plain.id || toIdString(plain.bookingId),
        shopId: plain.shopId?.id || toIdString(plain.shopId),
        customerId: plain.customerId?.id || toIdString(plain.customerId),
        employeeId: raw.employee ? undefined : (plain.employeeId?.id || toIdString(plain.employeeId)),
        employee: raw.employee ? serializeEmployee(raw.employee, { publicView: true }) : undefined,
        serviceIds: services.length > 0
            ? undefined
            : (Array.isArray(plain.serviceIds) ? plain.serviceIds.map(toIdString).filter(Boolean) : undefined),
        services,
        date: plain.date,
        time: plain.time,
        endTime: plain.endTime,
        totalAmount: plain.totalAmount ?? serviceAmount,
        durationMinutes: plain.durationMinutes,
        slotLockTimes: plain.slotLockTimes ?? [],
        startMinute: plain.startMinute,
        endMinute: plain.endMinute,
        status: plain.status ?? BOOKING_STATUS.PENDING,
        paymentStatus: plain.paymentStatus ?? PAYMENT_STATUS.PENDING,
        payoutStatus: plain.payoutStatus ?? PAYOUT_STATUS.NOT_INITIATED,
        paymentRequired: plain.paymentRequired,
        idempotentReplay: plain.idempotentReplay,
    });
};

export const serializeBookingDetails = (details) => {
    const raw = toPlainObject(details);
    const plain = sanitizeForResponse(raw);
    if (!plain) return null;

    return compact({
        id: plain.id || toIdString(plain.bookingId),
        customer: raw.customer ? serializeCustomerSummary(raw.customer) : null,
        employee: raw.employee
            ? serializeEmployee(withEmployeeBookingAvailability(raw.employee, raw.date ?? plain.date), { publicView: true })
            : null,
        shop: raw.shop ? serializeShopSummary(raw.shop) : null,
        date: plain.date,
        time: plain.time,
        endTime: plain.endTime,
        services: serializeServices(raw.services || []),
        subTotal: plain.subTotal,
        platformFee: plain.platformFee,
        totalAmount: plain.totalAmount,
        totalServices: plain.totalServices,
        status: plain.status,
        paymentStatus: plain.paymentStatus,
        payoutStatus: plain.payoutStatus,
        durationMinutes: plain.durationMinutes,
        startMinute: plain.startMinute,
        endMinute: plain.endMinute,
        slotLockTimes: plain.slotLockTimes ?? [],
        paymentTransactionId: toIdString(plain.paymentTransactionId),
        merchantOrderId: plain.merchantOrderId ?? null,
    });
};
