import bookingRepository from '../repositories/booking.repository.js';
import employeeRepository from '../repositories/employee.repository.js';
import shopRepository from '../repositories/shop.repository.js';
import { NotFoundError } from '../utils/api-error.js';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../utils/constants.js';
import { toTwentyFourHourTime } from '../utils/time.utils.js';

/**
 * Dashboard service — analytics and real-time metrics for barber dashboard
 */

/**
 * Get today's pulse metrics - Executive Performance
 * Shows real-time occupancy and booking status breakdown
 */
export const getTodaysPulse = async (ownerId) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all bookings for today
    const todaysBookings = await bookingRepository.findByShopId(
        shop._id,
        {
            date: { $gte: today, $lt: tomorrow },
        },
        {},
    );

    // Calculate status counts
    const statusCounts = {
        all: todaysBookings.length,
        pending: 0,
        done: 0,
        cancelled: 0,
    };

    todaysBookings.forEach((booking) => {
        if (booking.status === BOOKING_STATUS.CANCELLED) {
            statusCounts.cancelled++;
        } else if (
            booking.status === BOOKING_STATUS.COMPLETED ||
            booking.status === BOOKING_STATUS.NO_SHOW
        ) {
            statusCounts.done++;
        } else {
            // PENDING, AWAITING_CONFIRMATION, CONFIRMED
            statusCounts.pending++;
        }
    });

    // Calculate occupancy
    // Get all active employees
    const employees = await employeeRepository.findByShopId(shop._id, {});
    const activeEmployees = employees.filter((emp) => emp.isActive && !emp.deletedAt);

    // Calculate total available slots for today
    // Assuming 30-minute slots and 8-hour workday per employee
    const slotsPerEmployee = 16; // 8 hours * 2 slots per hour
    const totalCapacity = activeEmployees.length * slotsPerEmployee;
    const bookedSlots = todaysBookings.filter(
        (b) => b.status !== BOOKING_STATUS.CANCELLED,
    ).length;

    return {
        occupancy: {
            booked: bookedSlots,
            total: totalCapacity,
            percentage: totalCapacity > 0 ? Math.round((bookedSlots / totalCapacity) * 100) : 0,
        },
        statusBreakdown: [
            {
                label: 'All',
                count: statusCounts.all,
                color: 'default',
            },
            {
                label: 'Pending',
                count: statusCounts.pending,
                color: 'warning',
            },
            {
                label: 'Done',
                count: statusCounts.done,
                color: 'success',
            },
            {
                label: 'Cancelled',
                count: statusCounts.cancelled,
                color: 'muted',
            },
        ],
    };
};

/**
 * Get staff availability and progress
 * Shows each employee's daily appointment progress
 */
export const getStaffAvailability = async (ownerId) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active employees
    const employees = await employeeRepository.findByShopId(shop._id, {});
    const activeEmployees = employees.filter((emp) => emp.isActive && !emp.deletedAt);

    // Get today's bookings for each employee
    const staffAvailability = await Promise.all(
        activeEmployees.map(async (employee) => {
            const employeeBookings = await bookingRepository.findByEmployeeIds(
                [employee._id],
                {
                    date: { $gte: today, $lt: tomorrow },
                    status: { $nin: [BOOKING_STATUS.CANCELLED] },
                },
                {},
            );

            const completedCount = employeeBookings.filter(
                (b) =>
                    b.status === BOOKING_STATUS.COMPLETED ||
                    b.status === BOOKING_STATUS.NO_SHOW,
            ).length;

            const totalCount = employeeBookings.length;
            const remainingCount = totalCount - completedCount;

            // Calculate progress percentage
            const progressPercentage =
                totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return {
                employeeId: employee._id,
                name: `${employee.firstName} ${employee.lastName}`,
                role: 'Master Barber', // Could be enhanced with actual role field
                photoUrl: employee.photoUrl,
                progress: {
                    completed: completedCount,
                    total: totalCount,
                    remaining: remainingCount,
                    percentage: progressPercentage,
                },
            };
        }),
    );

    return {
        staff: staffAvailability,
        totalStaff: activeEmployees.length,
    };
};

/**
 * Get today's queue - active and upcoming appointments
 * Shows appointments organized by status (active/upcoming)
 */
export const getTodaysQueue = async (ownerId, filter = 'active') => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's bookings
    const todaysBookings = await bookingRepository.findByShopId(
        shop._id,
        {
            date: { $gte: today, $lt: tomorrow },
            status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW] },
        },
        {},
    );

    // Parse current time in minutes for comparison
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Helper to parse time string to minutes
    const parseTimeToMinutes = (timeStr) => {
        const normalized = toTwentyFourHourTime(timeStr);
        if (!normalized) return null;
        const [hours, minutes] = normalized.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // Separate active and upcoming
    const activeBookings = [];
    const upcomingBookings = [];

    todaysBookings.forEach((booking) => {
        const bookingMinutes = parseTimeToMinutes(booking.time);
        if (bookingMinutes === null) return;

        // Active: within 30 minutes before or currently happening
        // Upcoming: more than 30 minutes in the future
        const timeDiff = bookingMinutes - currentMinutes;

        if (timeDiff >= -30 && timeDiff <= 30) {
            activeBookings.push(booking);
        } else if (timeDiff > 30) {
            upcomingBookings.push(booking);
        }
    });

    // Sort by time
    const sortByTime = (a, b) => {
        const aMinutes = parseTimeToMinutes(a.time);
        const bMinutes = parseTimeToMinutes(b.time);
        return aMinutes - bMinutes;
    };

    activeBookings.sort(sortByTime);
    upcomingBookings.sort(sortByTime);

    // Format queue items
    const formatQueueItem = (booking) => ({
        bookingId: booking._id,
        customer: {
            name: `${booking.customerId?.firstName || ''} ${booking.customerId?.lastName || ''}`.trim(),
        },
        employee: {
            name: `${booking.employeeId?.firstName || ''} ${booking.employeeId?.lastName || ''}`.trim(),
        },
        time: booking.time,
        status: booking.status,
        services: booking.serviceIds?.map((s) => s.serviceName) || [],
    });

    const selectedQueue = filter === 'active' ? activeBookings : upcomingBookings;

    return {
        filter,
        active: {
            count: activeBookings.length,
            items: filter === 'active' ? selectedQueue.map(formatQueueItem) : [],
        },
        upcoming: {
            count: upcomingBookings.length,
            items: filter === 'upcoming' ? selectedQueue.map(formatQueueItem) : [],
        },
    };
};

/**
 * Get comprehensive dashboard data (all sections combined)
 */
export const getDashboardOverview = async (ownerId) => {
    const [pulse, staff, queue] = await Promise.all([
        getTodaysPulse(ownerId),
        getStaffAvailability(ownerId),
        getTodaysQueue(ownerId, 'active'),
    ]);

    return {
        pulse,
        staff,
        queue,
    };
};
