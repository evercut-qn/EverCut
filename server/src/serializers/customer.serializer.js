import { sanitizeForResponse, toIdString, toPlainObject } from './core.serializer.js';
import { serializeUser } from './user.serializer.js';
import { buildMediaUrl } from '../services/media/media-url.service.js';
import config from '../config/index.js';

const compact = (value) => Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
);

const serializeIdList = (values = []) => (
    Array.isArray(values)
        ? values.map((value) => toIdString(value)).filter(Boolean)
        : []
);

export const serializeCustomerSummary = (customer, options = {}) => {
    const raw = toPlainObject(customer);
    const plain = sanitizeForResponse(raw);
    if (!plain) return null;
    const user = sanitizeForResponse(toPlainObject(raw.userId || raw.user)) || {};

    return compact({
        id: plain.id,
        firstName: plain.firstName ?? null,
        lastName: plain.lastName ?? null,
        fullName: `${plain.firstName || ''} ${plain.lastName || ''}`.trim() || null,
        photoUrl: buildMediaUrl(raw.photoMediaId?.r2Key),
        contact: options.includeContact ? {
            phoneNumber: user.phoneNumber ?? null,
            email: user.email ?? null,
        } : undefined,
    });
};

export const serializeCustomerProfile = (customer) => {
    const raw = toPlainObject(customer);
    const plain = sanitizeForResponse(raw);
    if (!plain) return null;
    const feeWaiverBookingsUsed = plain.feeWaiverBookingsUsed ?? 0;
    const feeWaiverQuota = config.payment.feeWaiverQuota;

    return compact({
        id: plain.id,
        userId: plain.userId?.id || toIdString(plain.userId),
        user: plain.userId && typeof plain.userId === 'object' ? serializeUser(plain.userId) : undefined,
        firstName: plain.firstName ?? null,
        lastName: plain.lastName ?? null,
        gender: plain.gender ?? null,
        dateOfBirth: plain.dateOfBirth ?? null,
        address: plain.address ?? null,
        photoUrl: buildMediaUrl(raw.photoMediaId?.r2Key),
        location: plain.location ?? null,
        favoriteBookingIds: serializeIdList(plain.favoriteBookings),
        favoriteShopIds: serializeIdList(plain.favoriteShops),
        feeWaiverBookingsUsed,
        feeWaiverQuota,
        feeWaiverExhausted: feeWaiverBookingsUsed >= feeWaiverQuota,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    });
};

export const serializeCustomerDirectoryItem = (customer) => {
    const raw = toPlainObject(customer);
    const plain = sanitizeForResponse(raw);
    if (!plain) return null;
    const user = sanitizeForResponse(toPlainObject(raw.user || plain.user)) || {};

    return compact({
        id: plain.id,
        userId: user.id || toIdString(plain.userId),
        fullName: `${plain.firstName || ''} ${plain.lastName || ''}`.trim() || null,
        firstName: plain.firstName ?? null,
        lastName: plain.lastName ?? null,
        address: plain.address ?? null,
        photoUrl: buildMediaUrl(raw.photoMediaId?.r2Key),
        contact: {
            phoneNumber: user.phoneNumber ?? null,
            email: user.email ?? null,
        },
        totalBookings: plain.totalBookings || 0,
        isActive: user.isActive ?? false,
        registeredAt: user.createdAt ?? plain.createdAt,
        lastLoginAt: user.lastLoginAt ?? null,
    });
};
