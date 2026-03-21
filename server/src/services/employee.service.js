import employeeRepository from '../repositories/employee.repository.js';
import bookingRepository from '../repositories/booking.repository.js';
import shopRepository from '../repositories/shop.repository.js';
import logger from '../utils/logger.js';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/api-error.js';
import cloudinary from '../config/cloudinary.config.js';
import { buildPagination } from '../utils/pagination.utils.js';
import { parseTimeToMinutes } from '../utils/time.utils.js';
import { normalizeShopSchedule } from '../utils/shop-schedule.utils.js';

/**
 * Employee service â€” CRUD operations for shop employees.
 */

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const parseJsonIfString = (value, fieldName) => {
    if (typeof value !== 'string') return value;

    try {
        return JSON.parse(value);
    } catch {
        throw new BadRequestError(`${fieldName} must be valid JSON`);
    }
};

const normalizeDateOfBirth = (value) => {
    if (value === undefined) return undefined;

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new BadRequestError('dateOfBirth must be a valid date');
    }

    if (date > new Date()) {
        throw new BadRequestError('dateOfBirth cannot be in the future');
    }

    return date;
};

const normalizeWorkingHours = (value) => {
    if (value === undefined) return undefined;

    const parsed = parseJsonIfString(value, 'workingHours');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new BadRequestError('workingHours must be an object');
    }

    const start = String(parsed.start ?? '').trim();
    const end = String(parsed.end ?? '').trim();

    if (!start || !end) {
        throw new BadRequestError('workingHours must include start and end');
    }

    if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
        throw new BadRequestError('workingHours must use HH:MM 24-hour format');
    }

    if (start >= end) {
        throw new BadRequestError('workingHours.start must be earlier than workingHours.end');
    }

    return { start, end };
};

const normalizeBlockedDates = (value) => {
    if (value === undefined) return undefined;

    let parsed = value;
    if (typeof parsed === 'string') {
        const trimmed = parsed.trim();
        if (!trimmed) return [];

        try {
            parsed = JSON.parse(trimmed);
        } catch {
            throw new BadRequestError('blockedDates must be a valid JSON array');
        }
    }

    const values = Array.isArray(parsed) ? parsed : [parsed];
    const seen = new Set();

    return values.reduce((dates, entry) => {
        const raw = entry instanceof Date
            ? entry.toISOString().slice(0, 10)
            : String(entry ?? '').trim();

        if (!DATE_ONLY_PATTERN.test(raw)) {
            throw new BadRequestError('blockedDates must use YYYY-MM-DD format');
        }

        if (seen.has(raw)) return dates;
        seen.add(raw);
        dates.push(new Date(`${raw}T00:00:00.000Z`));
        return dates;
    }, []);
};

const getNormalizedShopWorkingHours = (shop) => {
    const scheduleResult = normalizeShopSchedule({
        openTime: shop?.openTime,
        closeTime: shop?.closeTime,
        breakTimes: [],
    });

    if (scheduleResult.error) {
        throw new BadRequestError(`Shop hours are invalid. ${scheduleResult.error}`);
    }

    return {
        start: scheduleResult.value.openTime,
        end: scheduleResult.value.closeTime,
    };
};

const assertWorkingHoursWithinShopHours = (workingHours, shop) => {
    if (!workingHours) return;

    const employeeStartMinutes = parseTimeToMinutes(workingHours.start);
    const employeeEndMinutes = parseTimeToMinutes(workingHours.end);
    const shopWorkingHours = getNormalizedShopWorkingHours(shop);
    const shopStartMinutes = parseTimeToMinutes(shopWorkingHours.start);
    const shopEndMinutes = parseTimeToMinutes(shopWorkingHours.end);

    if (
        employeeStartMinutes === null
        || employeeEndMinutes === null
        || employeeStartMinutes < shopStartMinutes
        || employeeEndMinutes > shopEndMinutes
    ) {
        throw new BadRequestError('Employee working hours must stay within shop hours');
    }
};

const normalizeEmployeePayload = (data = {}, shop = null) => {
    const normalized = { ...data };

    if (typeof normalized.phoneNumber === 'string') {
        normalized.phoneNumber = normalized.phoneNumber.trim();
    }

    if (normalized.dateOfBirth !== undefined) {
        normalized.dateOfBirth = normalizeDateOfBirth(normalized.dateOfBirth);
    }

    if (normalized.workingHours !== undefined) {
        normalized.workingHours = normalizeWorkingHours(normalized.workingHours);
    }

    if (normalized.blockedDates !== undefined) {
        normalized.blockedDates = normalizeBlockedDates(normalized.blockedDates);
    }

    if (shop) {
        assertWorkingHoursWithinShopHours(normalized.workingHours, shop);
    }

    return normalized;
};

const destroyCloudinaryAsset = async (publicId, context) => {
    if (!publicId) return;

    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        logger.warn('Employee image cleanup failed', {
            publicId,
            context,
            error: err.message,
        });
    }
};

const rethrowDuplicateEmployeeWrite = async (error, uploadedCloudinaryId) => {
    if (uploadedCloudinaryId) {
        await destroyCloudinaryAsset(uploadedCloudinaryId, 'duplicate-write');
    }

    if (error?.code === 11000) {
        throw new ConflictError('Employee with this phone number already exists');
    }

    throw error;
};

const buildDeletedPhoneNumber = (employeeId) => `deleted-${employeeId}-${Date.now()}`;

export const addEmployee = async (ownerId, data, file) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const normalizedData = normalizeEmployeePayload(data, shop);

    const existing = await employeeRepository.findByShopIdAndPhone(shop._id, normalizedData.phoneNumber);
    if (existing) throw new ConflictError('Employee with this phone number already exists');

    const employeeData = {
        shopId: shop._id,
        firstName: normalizedData.firstName,
        lastName: normalizedData.lastName,
        phoneNumber: normalizedData.phoneNumber,
        gender: normalizedData.gender,
        dateOfBirth: normalizedData.dateOfBirth,
        workingHours: normalizedData.workingHours || getNormalizedShopWorkingHours(shop),
        blockedDates: normalizedData.blockedDates || [],
    };

    if (file) {
        employeeData.photoUrl = file.path;
        employeeData.cloudinaryId = file.public_id || file.filename;
    }

    try {
        return await employeeRepository.create(employeeData);
    } catch (error) {
        await rethrowDuplicateEmployeeWrite(error, employeeData.cloudinaryId);
    }
};

export const getEmployees = async (ownerId, query = {}) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const total = await employeeRepository.countByShopId(shop._id);
    const { skip, limit, pagination } = buildPagination(query, total);

    const items = await employeeRepository.findByShopId(shop._id, { skip, limit });
    return { items, pagination };
};

export const updateEmployee = async (ownerId, employeeId, data, file) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const employee = await employeeRepository.findById(employeeId);
    if (!employee || String(employee.shopId) !== String(shop._id)) {
        throw new NotFoundError('Employee');
    }

    const normalizedData = normalizeEmployeePayload(data, shop);
    const updateData = {};

    for (const field of ['firstName', 'lastName', 'phoneNumber', 'gender', 'dateOfBirth', 'workingHours', 'blockedDates']) {
        if (normalizedData[field] !== undefined) {
            updateData[field] = normalizedData[field];
        }
    }

    if (file) {
        updateData.photoUrl = file.path;
        updateData.cloudinaryId = file.public_id || file.filename;
    }

    if (Object.keys(updateData).length === 0) {
        throw new BadRequestError('No valid fields provided for update');
    }

    if (updateData.phoneNumber && updateData.phoneNumber !== employee.phoneNumber) {
        const existing = await employeeRepository.findByShopIdAndPhone(shop._id, updateData.phoneNumber);
        if (existing && String(existing._id) !== String(employeeId)) {
            if (updateData.cloudinaryId) {
                await destroyCloudinaryAsset(updateData.cloudinaryId, 'duplicate-phone');
            }
            throw new ConflictError('Employee with this phone number already exists');
        }
    }

    let updated;
    try {
        updated = await employeeRepository.updateById(employeeId, shop._id, updateData);
    } catch (err) {
        await rethrowDuplicateEmployeeWrite(err, updateData.cloudinaryId);
    }

    if (!updated) throw new NotFoundError('Employee');

    if (updateData.cloudinaryId && employee.cloudinaryId && employee.cloudinaryId !== updateData.cloudinaryId) {
        await destroyCloudinaryAsset(employee.cloudinaryId, 'replace-photo');
    }

    return updated;
};

export const deleteEmployee = async (ownerId, employeeId) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const employee = await employeeRepository.findById(employeeId);
    if (!employee || String(employee.shopId) !== String(shop._id)) {
        throw new NotFoundError('Employee');
    }

    const hasActiveBookings = await bookingRepository.hasActiveBookingsForEmployee(shop._id, employeeId);
    if (hasActiveBookings) {
        throw new BadRequestError('Cannot delete employee with upcoming or pending bookings');
    }

    const deleted = await employeeRepository.softDelete(
        employeeId,
        shop._id,
        buildDeletedPhoneNumber(employee._id),
    );
    if (!deleted) throw new NotFoundError('Employee');

    if (employee.cloudinaryId) {
        await destroyCloudinaryAsset(employee.cloudinaryId, 'delete-employee');
    }

    return { message: 'Employee deleted successfully' };
};
