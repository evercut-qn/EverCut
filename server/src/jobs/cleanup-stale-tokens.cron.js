import config from '../config/index.js';
import fcmTokenRepository from '../repositories/fcm-token.repository.js';
import logger from '../utils/logger.js';

let intervalId = null;
let lastRunKey = null;

const getZonedParts = (date, timeZone) => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short', // 'Sun', 'Mon', etc.
        hour12: false,
    });

    return Object.fromEntries(
        formatter
            .formatToParts(date)
            .filter((part) => part.type !== 'literal')
            .map((part) => [part.type, part.value]),
    );
};

export const runCleanupStaleTokensNow = async () => {
    try {
        const thresholdDays = config.notification?.staleTokenThresholdDays || 90;
        const thresholdDate = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

        logger.info('[CleanupStaleTokensJob] Running stale token cleanup scan', {
            thresholdDays,
            cutoffDate: thresholdDate.toISOString(),
        });

        const staleTokens = await fcmTokenRepository.findStaleTokens(thresholdDate);

        if (staleTokens.length === 0) {
            logger.info('[CleanupStaleTokensJob] No stale tokens found');
            return { cleanedCount: 0 };
        }

        const tokenStrings = staleTokens.map((t) => t.token);
        const result = await fcmTokenRepository.markInvalidTokens(tokenStrings, 'Stale token cleanup');

        logger.info('[CleanupStaleTokensJob] Stale token cleanup complete', {
            foundCount: staleTokens.length,
            modifiedCount: result.modifiedCount,
        });

        return { cleanedCount: staleTokens.length, modifiedCount: result.modifiedCount };
    } catch (error) {
        logger.error('[CleanupStaleTokensJob] Failed to execute cleanup', { error: error.message });
        throw error;
    }
};

export const startCleanupStaleTokensJob = () => {
    if (intervalId) return;

    const cronExpression = config.notification?.staleTokenCleanupCron || '0 3 * * 0';
    const timeZone = config.subscription?.cronTimezone || 'Asia/Kolkata';

    // Parse simple 'minute hour * * dayOfWeek'
    const parts = cronExpression.trim().split(/\s+/);
    const minute = parseInt(parts[0], 10) || 0;
    const hour = parseInt(parts[1], 10) || 3;
    const dayOfWeek = parts[4] !== '*' ? parseInt(parts[4], 10) : null; // Sunday is 0

    logger.info('[CleanupStaleTokensJob] Scheduling stale token cleanup job', {
        cronExpression,
        hour,
        minute,
        dayOfWeek,
        timeZone,
    });

    intervalId = setInterval(async () => {
        try {
            const date = new Date();
            const zoned = getZonedParts(date, timeZone);
            const runKey = `${zoned.year}-${zoned.month}-${zoned.day}`;

            if (parseInt(zoned.hour, 10) !== hour || parseInt(zoned.minute, 10) !== minute) {
                return;
            }

            if (dayOfWeek !== null) {
                const currentDay = date.getDay(); // 0 is Sunday, etc.
                if (currentDay !== dayOfWeek) {
                    return;
                }
            }

            if (lastRunKey === runKey) {
                return;
            }

            lastRunKey = runKey;
            await runCleanupStaleTokensNow();
        } catch (error) {
            logger.error('[CleanupStaleTokensJob] Scheduled execution failed', { error: error.message });
        }
    }, 60_000);
};

export const stopCleanupStaleTokensJob = () => {
    if (!intervalId) return;

    clearInterval(intervalId);
    intervalId = null;
    logger.info('[CleanupStaleTokensJob] Stopped');
};
