import customerRepository from '../repositories/customer.repository.js';
import userRepository from '../repositories/user.repository.js';
import { NotFoundError, BadRequestError } from '../utils/api-error.js';
import notificationEvents from './notification-events.service.js';
import { serializeCustomerDirectoryItem, serializeCustomerProfile } from '../serializers/customer.serializer.js';
import * as mediaService from './media/media.service.js';
import { MEDIA_ENTITY_TYPE, MEDIA_PURPOSE, ROLES } from '../utils/constants.js';
import { buildPagination } from '../utils/pagination.utils.js';

/**
 * Customer-facing profile service.
 */

export const getProfile = async (userId) => {
    const profile = await customerRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Customer');
    return serializeCustomerProfile(profile);
};

export const updateProfile = async (userId, data) => {
    const profile = await customerRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Customer');

    if (data.location && typeof data.location === 'string') {
        try {
            data.location = JSON.parse(data.location);
        } catch {
            throw new BadRequestError('Invalid location format');
        }
    }

    // Remove email from update data - email updates must go through /account/email
    if (data.email !== undefined) {
        delete data.email;
    }

    const photoMediaId = data.photoMediaId;
    delete data.photoMediaId;

    let nextPhotoR2Key = null;
    if (photoMediaId) {
        const media = await mediaService.resolveMediaForEntity(userId, photoMediaId);
        nextPhotoR2Key = media.r2Key;
        data.photoR2Key = nextPhotoR2Key;
    }

    const updated = await customerRepository.updateByUserId(userId, data);

    if (photoMediaId) {
        await mediaService.linkMediaToEntity(photoMediaId, profile._id, MEDIA_ENTITY_TYPE.CUSTOMER, MEDIA_PURPOSE.AVATAR);
        if (profile.photoR2Key && profile.photoR2Key !== nextPhotoR2Key) {
            mediaService.deleteObjectByKey(profile.photoR2Key).catch(() => {});
        }
    }

    await notificationEvents.notifyAccountUpdated({
        userId,
        updateType: 'customer_profile',
    });

    return serializeCustomerProfile(updated);
};

const startOfUtcDay = (date) => new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
));

const toCountMap = (rows, keyName = '_id') => rows.reduce((result, row) => {
    result[row[keyName]] = row.count || 0;
    return result;
}, {});

export const getUserSummary = async () => {
    const now = new Date();
    const weekStart = startOfUtcDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const trendStartDate = startOfUtcDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

    const [{ roleRows, customerActiveRows, registrationRows }, thisWeekRegistrations, thisMonthRegistrations] = await Promise.all([
        userRepository.aggregateSummary({ trendStartDate }),
        userRepository.countAll({ roleType: ROLES.CUSTOMER, createdAt: { $gte: weekStart } }),
        userRepository.countAll({ roleType: ROLES.CUSTOMER, createdAt: { $gte: monthStart } }),
    ]);

    const byRole = {
        [ROLES.CUSTOMER]: 0,
        [ROLES.BARBER]: 0,
        [ROLES.ADMIN]: 0,
        ...toCountMap(roleRows),
    };
    const activeCustomersByState = toCountMap(customerActiveRows);

    return {
        totalCustomers: byRole[ROLES.CUSTOMER] || 0,
        activeCustomers: activeCustomersByState.true || 0,
        inactiveCustomers: activeCustomersByState.false || 0,
        byRole,
        newCustomerRegistrations: {
            thisWeek: thisWeekRegistrations,
            thisMonth: thisMonthRegistrations,
            trend: registrationRows,
        },
    };
};

export const listCustomersForAdmin = async (query = {}) => {
    const total = await customerRepository.countAdminDirectory(query);
    const { skip, limit, pagination } = buildPagination(query, total);
    const customers = await customerRepository.findAdminDirectory(query, { skip, limit });

    return {
        items: customers.map(serializeCustomerDirectoryItem).filter(Boolean),
        pagination,
    };
};
