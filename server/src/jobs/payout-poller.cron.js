import logger from '../utils/logger.js';
import config from '../config/index.js';
import { pollPendingPayouts } from '../services/payout.service.js';

let intervalId = null;

export const startPayoutPoller = ({ payoutMode = config.payout.mode } = {}) => {
    if (intervalId) return { started: false, skipped: false };

    if (payoutMode === 'manual') {
        logger.info('[PayoutPoller] Not starting Cashfree payout poller - payout mode is manual');
        return { started: false, skipped: true };
    }

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

    return { started: true, skipped: false };
};

export const stopPayoutPoller = () => {
    if (!intervalId) return;

    clearInterval(intervalId);
    intervalId = null;
    logger.info('[PayoutPoller] Stopped');
};
