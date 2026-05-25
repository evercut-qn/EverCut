import config from '../config/index.js';
import logger from '../utils/logger.js';
import { autoCancelAwaitingBookings } from '../services/booking.service.js';

let intervalId = null;

export const startAutoCancelJob = () => {
    if (intervalId) return;

    const pollIntervalMs = config.booking.autoCancelPollIntervalMs;

    logger.info('[AutoCancelJob] Starting auto-cancel job', {
        intervalMs: pollIntervalMs,
        intervalMinutes: pollIntervalMs / 60000,
    });

    // Run immediately on start
    autoCancelAwaitingBookings().catch((error) => {
        logger.error('[AutoCancelJob] Initial run failed', { error: error.message });
    });

    // Then run on configured interval
    intervalId = setInterval(async () => {
        try {
            await autoCancelAwaitingBookings();
        } catch (error) {
            logger.error('[AutoCancelJob] Job cycle failed', { error: error.message });
        }
    }, pollIntervalMs);
};

export const stopAutoCancelJob = () => {
    if (!intervalId) return;

    clearInterval(intervalId);
    intervalId = null;
    logger.info('[AutoCancelJob] Stopped');
};
