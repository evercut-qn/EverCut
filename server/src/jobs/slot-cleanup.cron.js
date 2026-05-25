import config from '../config/index.js';
import employeeRepository from '../repositories/employee.repository.js';
import logger from '../utils/logger.js';

let intervalId = null;

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

export const cleanupPastSlotLocks = async (cutoffDate = getTodayDateString()) => {
    const result = await employeeRepository.cleanupPastTimeLocks(cutoffDate);
    logger.info('[SlotCleanupJob] Past booking locks cleaned', {
        cutoffDate,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
    });
    return result;
};

export const startSlotCleanupJob = () => {
    if (intervalId) return;

    const cleanupIntervalMs = config.slotCleanup.intervalMs;

    logger.info('[SlotCleanupJob] Starting slot cleanup job', {
        intervalMs: cleanupIntervalMs,
        intervalHours: cleanupIntervalMs / 3_600_000,
    });

    cleanupPastSlotLocks().catch((error) => {
        logger.error('[SlotCleanupJob] Initial run failed', { error: error.message });
    });

    intervalId = setInterval(async () => {
        try {
            await cleanupPastSlotLocks();
        } catch (error) {
            logger.error('[SlotCleanupJob] Job cycle failed', { error: error.message });
        }
    }, cleanupIntervalMs);
};

export const stopSlotCleanupJob = () => {
    if (!intervalId) return;

    clearInterval(intervalId);
    intervalId = null;
    logger.info('[SlotCleanupJob] Stopped');
};
