import bookingRepository from '../repositories/booking.repository.js';
import shopRepository from '../repositories/shop.repository.js';
import { NotFoundError } from '../utils/api-error.js';

/**
 * Earnings service — calculates barber earnings.
 */

export const getEarnings = async (ownerId) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [result] = await bookingRepository.getEarningsAggregationForShop(
        shop._id,
        startOfToday,
        endOfToday,
        startOfLastMonth,
        endOfLastMonth,
    );

    return result || { totalEarning: 0, lastMonthEarning: 0, todayEarning: 0 };
};

// ── Dashboard Analytics (moved from dashboard.service.js) ────────────────

/**
 * Get comprehensive dashboard data (all sections combined)
 * Aggregates pulse, staff, and queue data
 */
export const getDashboardOverview = async (ownerId) => {
    // Import the services dynamically to avoid circular dependencies
    const bookingService = await import('./booking.service.js');
    const employeeService = await import('./employee.service.js');

    const [pulse, staff, queue] = await Promise.all([
        bookingService.getTodaysPulse(ownerId),
        employeeService.getStaffAvailability(ownerId),
        bookingService.getTodaysQueue(ownerId, 'active'),
    ]);

    return {
        pulse,
        staff,
        queue,
    };
};
