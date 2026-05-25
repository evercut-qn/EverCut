import { sanitizeForResponse, toIdString, toPlainObject } from './core.serializer.js';
import { buildMediaUrl } from '../services/media/media-url.service.js';

const compact = (value) => Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
);

export const serializeEmployee = (employee, options = {}) => {
    const raw = toPlainObject(employee);
    const plain = sanitizeForResponse(raw);
    if (!plain) return null;

    const base = {
        id: plain.id,
        shopId: plain.shopId?.id || toIdString(plain.shopId),
        firstName: plain.firstName ?? null,
        lastName: plain.lastName ?? null,
        photoUrl: buildMediaUrl(raw.photoR2Key),
        gender: plain.gender ?? null,
        workingHours: plain.workingHours ?? null,
        isActive: plain.isActive ?? true,
        isAvailableOnBookingDate: plain.isAvailableOnBookingDate,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    };

    if (options.publicView) {
        return compact(base);
    }

    return compact({
        ...base,
        phoneNumber: plain.phoneNumber ?? null,
        dateOfBirth: plain.dateOfBirth ?? null,
        blockedDates: Array.isArray(plain.blockedDates) ? plain.blockedDates : [],
        bookedSlots: options.includeAvailability ? (plain.bookedSlots || []) : undefined,
        bookedRanges: options.includeAvailability ? (plain.bookedRanges || []) : undefined,
    });
};

export const serializeEmployees = (employees = [], options = {}) => (
    Array.isArray(employees) ? employees.map((employee) => serializeEmployee(employee, options)).filter(Boolean) : []
);
