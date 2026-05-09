import logger from '../utils/logger.js';
import config from '../config/index.js';
import { pollPendingPayouts } from '../services/payout.service.js';

let intervalId = null;

export const startPayoutPoller = () => {
    if (intervalId) return;

    logger.info('[PayoutPoller] Starting payout status poller', {
        intervalMs: config.payout.pollIntervalMs,
    });

    setTimeout(() => {
        pollPendingPayouts().catch((error) => {
            logger.error('[PayoutPoller] Initial poll failed', { error: error.message });
        });
    }, 30_000);

    intervalId = setInterval(async () => {
        try {
            await pollPendingPayouts();
        } catch (error) {
            logger.error('[PayoutPoller] Poll cycle failed', { error: error.message });
        }
    }, config.payout.pollIntervalMs);
};

export const stopPayoutPoller = () => {
    if (!intervalId) return;

    clearInterval(intervalId);
    intervalId = null;
    logger.info('[PayoutPoller] Stopped');
};
