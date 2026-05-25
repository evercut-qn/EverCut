import config from '../config/index.js';
import logger from '../utils/logger.js';
import { pollPendingPayments } from '../services/payment.service.js';

let intervalId = null;

export const startPaymentPoller = () => {
    if (intervalId) return;

    const pollIntervalMs = config.payment.pollIntervalMs;

    logger.info('[PaymentPoller] Starting payment status poller', {
        intervalMs: pollIntervalMs,
    });

    pollPendingPayments().catch((error) => {
        logger.error('[PaymentPoller] Initial poll failed', { error: error.message });
    });

    intervalId = setInterval(async () => {
        try {
            await pollPendingPayments();
        } catch (error) {
            logger.error('[PaymentPoller] Poll cycle failed', { error: error.message });
        }
    }, pollIntervalMs);
};

export const stopPaymentPoller = () => {
    if (!intervalId) return;

    clearInterval(intervalId);
    intervalId = null;
    logger.info('[PaymentPoller] Stopped');
};
