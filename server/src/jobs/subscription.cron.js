import config from '../config/index.js';
import subscriptionRepository from '../repositories/subscription.repository.js';
import subscriptionTransactionRepository from '../repositories/subscription-transaction.repository.js';
import subscriptionGateway from '../adapters/razorpay/razorpay-subscription.adapter.js';
import lifecycleOrchestrator from '../services/subscription/subscription-lifecycle.service.js';
import { resolveRazorpayPlanId, PLAN_IDS } from '../config/subscription.config.js';
import {
    SUBSCRIPTION_STATUSES,
    SUBSCRIPTION_TRANSACTION_TYPES,
} from '../utils/constants.js';
import logger from '../utils/logger.js';

const LOG = '[SubscriptionCron]';

let expiryIntervalId = null;
let reconciliationIntervalId = null;
let mediaReconciliationIntervalId = null;
let lastReconciliationRunKey = null;
let lastMediaRunKey = null;

const getZonedParts = (date, timeZone) => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    return Object.fromEntries(
        formatter
            .formatToParts(date)
            .filter((part) => part.type !== 'literal')
            .map((part) => [part.type, part.value]),
    );
};

const parseDailyCron = (cronExpression, fallbackHour) => {
    const [minute, hour] = String(cronExpression || '').trim().split(/\s+/);
    const parsedMinute = Number.parseInt(minute, 10);
    const parsedHour = Number.parseInt(hour, 10);

    return {
        minute: Number.isInteger(parsedMinute) ? parsedMinute : 0,
        hour: Number.isInteger(parsedHour) ? parsedHour : fallbackHour,
    };
};

const mapRazorpayStatus = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (['active', 'authenticated'].includes(normalized)) return SUBSCRIPTION_STATUSES.ACTIVE;
    if (['pending', 'created'].includes(normalized)) return SUBSCRIPTION_STATUSES.PENDING_PAYMENT;
    if (['halted', 'expired', 'completed'].includes(normalized)) return SUBSCRIPTION_STATUSES.EXPIRED;
    if (normalized === 'cancelled') return SUBSCRIPTION_STATUSES.CANCELLED;
    if (normalized === 'paused') return SUBSCRIPTION_STATUSES.PAUSED;
    return null;
};

const toDateFromSeconds = (value) => (
    Number.isFinite(Number(value)) ? new Date(Number(value) * 1000) : null
);

export const runSubscriptionExpiryNow = async () => {
    const expired = await subscriptionRepository.findExpiredSubscriptions(new Date());
    let processed = 0;

    for (const subscription of expired) {
        logger.info(`${LOG} Expiring subscription`, {
            subscriptionId: subscription._id,
            barberId: subscription.barberId,
            planId: subscription.planId,
        });

        await subscriptionTransactionRepository.create({
            subscriptionId: subscription._id,
            barberId: subscription.barberId,
            type: SUBSCRIPTION_TRANSACTION_TYPES.EXPIRY,
            source: 'CRON',
            fromPlan: subscription.planId,
            toPlan: PLAN_IDS.BASIC,
            metadata: { reason: 'Period ended by expiry safety net' },
        });
        await lifecycleOrchestrator.onSubscriptionExpired(subscription.barberId);
        processed += 1;
    }

    return { checked: expired.length, processed };
};

export const runSubscriptionReconciliationNow = async () => {
    const subscriptions = await subscriptionRepository.findAllActivePaid();
    let driftCount = 0;
    let processed = 0;

    for (const subscription of subscriptions) {
        if (!subscription.razorpaySubscriptionId) {
            logger.warn(`${LOG} Active paid subscription without Razorpay ID`, {
                subscriptionId: subscription._id,
                barberId: subscription.barberId,
            });
            driftCount += 1;
            continue;
        }

        try {
            const gatewaySubscription = await subscriptionGateway.fetchSubscription(subscription.razorpaySubscriptionId);
            const mappedStatus = mapRazorpayStatus(gatewaySubscription.status);
            const gatewayPlanId = resolveRazorpayPlanId(gatewaySubscription.plan_id);

            if (mappedStatus === SUBSCRIPTION_STATUSES.EXPIRED) {
                driftCount += 1;
                await subscriptionTransactionRepository.create({
                    subscriptionId: subscription._id,
                    barberId: subscription.barberId,
                    type: SUBSCRIPTION_TRANSACTION_TYPES.EXPIRY,
                    source: 'RECONCILIATION',
                    fromPlan: subscription.planId,
                    toPlan: PLAN_IDS.BASIC,
                    metadata: {
                        gatewayStatus: gatewaySubscription.status,
                    },
                });
                await lifecycleOrchestrator.onSubscriptionExpired(subscription.barberId);
                processed += 1;
                continue;
            }

            const updates = {};
            if (mappedStatus && mappedStatus !== subscription.status) updates.status = mappedStatus;
            if (gatewayPlanId && gatewayPlanId !== subscription.planId) updates.planId = gatewayPlanId;
            const currentStart = toDateFromSeconds(gatewaySubscription.current_start);
            const currentEnd = toDateFromSeconds(gatewaySubscription.current_end);
            if (currentStart) updates.currentPeriodStart = currentStart;
            if (currentEnd) updates.currentPeriodEnd = currentEnd;

            if (Object.keys(updates).length > 0) {
                driftCount += 1;
                await subscriptionRepository.updateById(subscription._id, updates);
                await lifecycleOrchestrator.reconcileMediaForSubscription({
                    ...subscription,
                    ...updates,
                });
            }

            processed += 1;
        } catch (error) {
            logger.error(`${LOG} Reconciliation failed for subscription`, {
                subscriptionId: subscription._id,
                razorpaySubscriptionId: subscription.razorpaySubscriptionId,
                error: error.message,
            });
        }
    }

    return { checked: subscriptions.length, processed, driftCount };
};

export const runSubscriptionMediaReconciliationNow = async () => {
    const subscriptions = await subscriptionRepository.findAllForMediaReconciliation();
    let processed = 0;

    for (const subscription of subscriptions) {
        try {
            await lifecycleOrchestrator.reconcileMediaForSubscription(subscription);
            processed += 1;
        } catch (error) {
            logger.error(`${LOG} Media reconciliation failed`, {
                subscriptionId: subscription._id,
                barberId: subscription.barberId,
                error: error.message,
            });
        }
    }

    return { checked: subscriptions.length, processed };
};

const scheduleDaily = ({ cronExpression, fallbackHour, timeZone, lastRunKeyRef, setLastRunKey, handler }) => {
    const { minute, hour } = parseDailyCron(cronExpression, fallbackHour);

    return setInterval(async () => {
        const parts = getZonedParts(new Date(), timeZone);
        const runKey = `${parts.year}-${parts.month}-${parts.day}-${hour}-${minute}`;
        if (Number(parts.hour) !== hour || Number(parts.minute) !== minute) return;
        if (lastRunKeyRef() === runKey) return;
        setLastRunKey(runKey);

        try {
            await handler();
        } catch (error) {
            logger.error(`${LOG} Scheduled job failed`, { error: error.message });
        }
    }, 60_000);
};

export const startSubscriptionJobs = () => {
    if (!expiryIntervalId) {
        expiryIntervalId = setInterval(() => {
            runSubscriptionExpiryNow().catch((error) => {
                logger.error(`${LOG} Expiry job failed`, { error: error.message });
            });
        }, config.subscription.expiryCheckIntervalMs);
    }

    if (!reconciliationIntervalId) {
        reconciliationIntervalId = scheduleDaily({
            cronExpression: config.subscription.reconciliationCronSchedule,
            fallbackHour: 2,
            timeZone: config.subscription.cronTimezone,
            lastRunKeyRef: () => lastReconciliationRunKey,
            setLastRunKey: (value) => { lastReconciliationRunKey = value; },
            handler: runSubscriptionReconciliationNow,
        });
    }

    if (!mediaReconciliationIntervalId) {
        mediaReconciliationIntervalId = scheduleDaily({
            cronExpression: config.subscription.mediaReconciliationCronSchedule,
            fallbackHour: 3,
            timeZone: config.subscription.cronTimezone,
            lastRunKeyRef: () => lastMediaRunKey,
            setLastRunKey: (value) => { lastMediaRunKey = value; },
            handler: runSubscriptionMediaReconciliationNow,
        });
    }

    logger.info(`${LOG} Subscription jobs registered`);
};

export const stopSubscriptionJobs = () => {
    for (const id of [expiryIntervalId, reconciliationIntervalId, mediaReconciliationIntervalId]) {
        if (id) clearInterval(id);
    }
    expiryIntervalId = null;
    reconciliationIntervalId = null;
    mediaReconciliationIntervalId = null;
    logger.info(`${LOG} Subscription jobs stopped`);
};
