/**
 * Slot Calculator Utility
 * 
 * Calculates available time slots for bookings considering:
 * - Shop hours
 * - Employee working hours
 * - Service duration
 * - Booked slots
 * - Blocked dates
 * - Past times (if today)
 */

import { parseTimeToMinutes } from './time.utils.js';

const SLOT_INTERVAL_MINUTES = 30;

/**
 * Convert minutes since midnight to HH:MM format
 */
const minutesToTimeString = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * Generate all possible time slots between start and end time
 * 
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @param {number} serviceDuration - Service duration in minutes
 * @param {number} intervalMinutes - Slot interval in minutes (default: 30)
 * @returns {string[]} Array of time slots in HH:MM format
 */
export const generateTimeSlots = (startTime, endTime, serviceDuration, intervalMinutes = SLOT_INTERVAL_MINUTES) => {
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        return [];
    }

    const slots = [];
    let currentMinutes = startMinutes;

    // Generate slots where service can be completed before end time
    while (currentMinutes + serviceDuration <= endMinutes) {
        slots.push(minutesToTimeString(currentMinutes));
        currentMinutes += intervalMinutes;
    }

    return slots;
};

/**
 * Check if a slot overlaps with any booked slots considering service duration
 * 
 * @param {string} slotTime - Time slot to check
 * @param {Array} bookedSlots - Array of booked slots {date, time}
 * @param {number} serviceDuration - Service duration in minutes
 * @returns {boolean} True if slot is blocked
 */
const isSlotBlocked = (slotTime, bookedSlots, serviceDuration) => {
    const slotMinutes = parseTimeToMinutes(slotTime);
    if (slotMinutes === null) return true;

    const slotEndMinutes = slotMinutes + serviceDuration;

    for (const booked of bookedSlots) {
        const bookedMinutes = parseTimeToMinutes(booked.time);
        if (bookedMinutes === null) continue;

        const bookedDuration = Number(booked.durationMinutes) > 0
            ? Number(booked.durationMinutes)
            : serviceDuration;
        const bookedEndMinutes = bookedMinutes + bookedDuration;

        // Check if slots overlap
        // Slot overlaps if: slotStart < bookedEnd AND slotEnd > bookedStart
        if (slotMinutes < bookedEndMinutes && slotEndMinutes > bookedMinutes) {
            return true;
        }
    }

    return false;
};

/**
 * Check if a time slot is in the past (for today's date)
 * 
 * @param {string} slotTime - Time slot in HH:MM format
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Date} now - Current date/time
 * @returns {boolean} True if slot is in the past
 */
const isSlotInPast = (slotTime, date, now = new Date()) => {
    const todayStr = now.toISOString().slice(0, 10);
    
    // If date is not today, slot is not in past
    if (date !== todayStr) return false;

    const slotMinutes = parseTimeToMinutes(slotTime);
    if (slotMinutes === null) return true;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return slotMinutes <= currentMinutes;
};

/**
 * Calculate available slots for an employee on a specific date
 * 
 * @param {Object} params - Parameters
 * @param {string} params.date - Date in YYYY-MM-DD format
 * @param {Object} params.shopHours - Shop hours {openTime, closeTime}
 * @param {Object} params.employeeHours - Employee hours {start, end}
 * @param {number} params.serviceDuration - Service duration in minutes
 * @param {Array} params.bookedSlots - Booked slots [{date, time}]
 * @param {Array} params.blockedDates - Blocked dates [Date objects]
 * @param {Date} params.now - Current date/time (for testing)
 * @returns {Object} Slot availability information
 */
export const calculateAvailableSlots = ({
    date,
    shopHours,
    employeeHours,
    serviceDuration,
    bookedSlots = [],
    blockedDates = [],
    now = new Date(),
}) => {
    // Check if date is blocked
    const dateObj = new Date(date);
    const isDateBlocked = blockedDates.some((blockedDate) => {
        const blocked = new Date(blockedDate);
        return blocked.toISOString().slice(0, 10) === date;
    });

    if (isDateBlocked) {
        return {
            slots: [],
            totalSlots: 0,
            totalAvailable: 0,
            reason: 'date_blocked',
        };
    }

    // Calculate effective working hours (intersection of shop and employee hours)
    const shopStartMinutes = parseTimeToMinutes(shopHours.openTime);
    const shopEndMinutes = parseTimeToMinutes(shopHours.closeTime);
    const employeeStartMinutes = parseTimeToMinutes(employeeHours.start);
    const employeeEndMinutes = parseTimeToMinutes(employeeHours.end);

    if (
        shopStartMinutes === null ||
        shopEndMinutes === null ||
        employeeStartMinutes === null ||
        employeeEndMinutes === null
    ) {
        return {
            slots: [],
            totalSlots: 0,
            totalAvailable: 0,
            reason: 'invalid_hours',
        };
    }

    const effectiveStartMinutes = Math.max(shopStartMinutes, employeeStartMinutes);
    const effectiveEndMinutes = Math.min(shopEndMinutes, employeeEndMinutes);

    if (effectiveStartMinutes >= effectiveEndMinutes) {
        return {
            slots: [],
            totalSlots: 0,
            totalAvailable: 0,
            reason: 'no_overlap',
        };
    }

    const effectiveStart = minutesToTimeString(effectiveStartMinutes);
    const effectiveEnd = minutesToTimeString(effectiveEndMinutes);

    // Generate all possible slots
    const allSlots = generateTimeSlots(effectiveStart, effectiveEnd, serviceDuration);

    // Mark each slot as available or not
    const slots = allSlots.map((time) => {
        let available = true;
        let reason = null;

        // Check if slot is in the past
        if (isSlotInPast(time, date, now)) {
            available = false;
            reason = 'past';
        }
        // Check if slot is blocked by existing bookings
        else if (isSlotBlocked(time, bookedSlots, serviceDuration)) {
            available = false;
            reason = 'booked';
        }

        return {
            time,
            available,
            ...(reason && { reason }),
        };
    });

    const totalAvailable = slots.filter((slot) => slot.available).length;

    return {
        slots,
        totalSlots: slots.length,
        totalAvailable,
        slotInterval: SLOT_INTERVAL_MINUTES,
    };
};

/**
 * Get only available slot times (convenience function)
 * 
 * @param {Object} params - Same as calculateAvailableSlots
 * @returns {string[]} Array of available time slots
 */
export const getAvailableSlotTimes = (params) => {
    const result = calculateAvailableSlots(params);
    return result.slots
        .filter((slot) => slot.available)
        .map((slot) => slot.time);
};

/**
 * Find the first available slot
 * 
 * @param {Object} params - Same as calculateAvailableSlots
 * @returns {string|null} First available time slot or null
 */
export const findFirstAvailableSlot = (params) => {
    const result = calculateAvailableSlots(params);
    const firstAvailable = result.slots.find((slot) => slot.available);
    return firstAvailable ? firstAvailable.time : null;
};
