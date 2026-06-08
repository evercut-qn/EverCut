import config from '../config/index.js';
import { sanitizeForResponse, toIdString, toPlainObject } from './core.serializer.js';
import { serializePayment } from './payment.serializer.js';

const compact = (value) => Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
);

const serializeIds = (values = []) => (
    Array.isArray(values) ? values.map((value) => toIdString(value)).filter(Boolean) : []
);

const isPopulatedObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const serializePayoutBooking = (booking) => {
    const plain = sanitizeForResponse(toPlainObject(booking));
    if (!plain || typeof plain !== 'object') return null;

    return compact({
        id: plain.id,
        date: plain.date ?? null,
        time: plain.time ?? null,
        status: plain.status ?? null,
        paymentStatus: plain.paymentStatus ?? null,
        payoutStatus: plain.payoutStatus ?? null,
        totalAmount: plain.totalAmount ?? null,
        barberUtr: plain.barberUtr ?? null,
        payoutCompletedAt: plain.payoutCompletedAt ?? null,
    });
};

const serializePayoutBarber = (barber) => {
    const plain = sanitizeForResponse(toPlainObject(barber));
    if (!plain || typeof plain !== 'object') return null;

    return compact({
        id: plain.id,
        firstName: plain.firstName ?? null,
        lastName: plain.lastName ?? null,
        accountHolderName: plain.accountHolderName ?? null,
        upiId: plain.upiId ?? null,
        bankAccountNumber: plain.bankAccount ?? null,
        ifscCode: plain.ifsc ?? null,
    });
};

const serializePayoutShop = (shop) => {
    const plain = sanitizeForResponse(toPlainObject(shop));
    if (!plain || typeof plain !== 'object') return null;

    return compact({
        id: plain.id,
        shopName: plain.shopName ?? null,
    });
};

const serializeAdminSummary = (admin) => {
    const plain = sanitizeForResponse(toPlainObject(admin));
    if (!plain || typeof plain !== 'object') return null;

    return compact({
        id: plain.id,
        email: plain.email ?? null,
        phoneNumber: plain.phoneNumber ?? null,
        roleType: plain.roleType ?? null,
    });
};

export const serializePayout = (payout) => {
    const plain = sanitizeForResponse(toPlainObject(payout));
    if (!plain) return null;

    return compact({
        id: plain.id,
        bookingIds: serializeIds(plain.bookingIds),
        barberId: toIdString(plain.barberId),
        shopId: toIdString(plain.shopId),
        paymentTransactionIds: serializeIds(plain.paymentTransactionIds),
        transferId: plain.transferId ?? null,
        gatewayTransferId: plain.gatewayTransferId ?? null,
        beneficiaryId: plain.beneficiaryId ?? null,
        amount: plain.amount ?? null,
        amountInRupees: plain.amountInRupees ?? null,
        transferMode: plain.transferMode ?? null,
        status: plain.status ?? null,
        utr: plain.utr ?? null,
        processedAt: plain.processedAt ?? null,
        failureReason: plain.failureReason ?? null,
        errorCode: plain.errorCode ?? null,
        retryCount: plain.retryCount ?? 0,
        maxRetries: plain.maxRetries ?? config.payout.maxRetries,
        lastRetryAt: plain.lastRetryAt ?? null,
        remarks: plain.remarks ?? null,
        gateway: plain.gateway ?? 'cashfree',
        completedByAdminId: toIdString(plain.completedByAdminId) ?? null,
        adminNotes: plain.adminNotes ?? null,
        barber: isPopulatedObject(plain.barberId) ? serializePayoutBarber(plain.barberId) : undefined,
        shop: isPopulatedObject(plain.shopId) ? serializePayoutShop(plain.shopId) : undefined,
        bookings: Array.isArray(plain.bookingIds) && plain.bookingIds.some(isPopulatedObject)
            ? plain.bookingIds.map(serializePayoutBooking).filter(Boolean)
            : undefined,
        payments: Array.isArray(plain.paymentTransactionIds) && plain.paymentTransactionIds.some(isPopulatedObject)
            ? plain.paymentTransactionIds.map(serializePayment).filter(Boolean)
            : undefined,
        completedByAdmin: isPopulatedObject(plain.completedByAdminId)
            ? serializeAdminSummary(plain.completedByAdminId)
            : undefined,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    });
};
