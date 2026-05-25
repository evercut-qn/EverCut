import subscriptionGateway from '../../adapters/razorpay/razorpay-subscription.adapter.js';
import subscriptionRepository from '../../repositories/subscription.repository.js';
import subscriptionTransactionRepository from '../../repositories/subscription-transaction.repository.js';
import lifecycleOrchestrator from './subscription-lifecycle.service.js';
import config from '../../config/index.js';
import { resolveRazorpayPlanId, PLAN_IDS } from '../../config/subscription.config.js';
import {
    SUBSCRIPTION_STATUSES,
    SUBSCRIPTION_STATUS_TRANSITIONS,
    SUBSCRIPTION_TRANSACTION_STATUSES,
    SUBSCRIPTION_TRANSACTION_TYPES,
} from '../../utils/constants.js';
import { BadRequestError } from '../../utils/api-error.js';
import logger from '../../utils/logger.js';

const LOG = '[SubscriptionWebhook]';

const toDateFromSeconds = (value) => (
    Number.isFinite(Number(value)) ? new Date(Number(value) * 1000) : null
);

const isDuplicateWebhookEventError = (error) => (
    error?.code === 11000
    && Object.prototype.hasOwnProperty.call(error?.keyPattern || {}, 'webhookEventId')
);

class SubscriptionWebhookService {
    async handleWebhook(headers, rawBody) {
        const bodyBuffer = Buffer.isBuffer(rawBody)
            ? rawBody
            : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {}));

        this.#verifySignature(headers, bodyBuffer);

        const payload = JSON.parse(bodyBuffer.toString('utf8'));
        const eventType = payload.event;
        const eventId = this.#getEventId(payload);

        logger.info(`${LOG} Webhook received`, { eventType, eventId });

        const alreadyProcessed = await subscriptionTransactionRepository.existsByWebhookEventId(eventId);
        if (alreadyProcessed) {
            logger.info(`${LOG} Duplicate webhook, skipping`, { eventId });
            return { acknowledged: true, duplicate: true, eventId };
        }

        this.#validateTimestamp(payload.created_at);

        try {
            switch (eventType) {
                case 'subscription.activated':
                    await this.#handleSubscriptionActivated(payload, eventId);
                    break;
                case 'subscription.charged':
                    await this.#handleSubscriptionCharged(payload, eventId);
                    break;
                case 'subscription.halted':
                    await this.#handleSubscriptionHalted(payload, eventId);
                    break;
                case 'subscription.cancelled':
                    await this.#handleSubscriptionCancelled(payload, eventId);
                    break;
                case 'subscription.paused':
                    await this.#handleSubscriptionPaused(payload, eventId);
                    break;
                case 'subscription.resumed':
                    await this.#handleSubscriptionResumed(payload, eventId);
                    break;
                case 'subscription.updated':
                    await this.#handleSubscriptionUpdated(payload, eventId);
                    break;
                case 'payment.failed':
                    await this.#handlePaymentFailed(payload, eventId);
                    break;
                default:
                    logger.warn(`${LOG} Unhandled event type`, { eventType, eventId });
            }
        } catch (error) {
            if (isDuplicateWebhookEventError(error)) {
                logger.info(`${LOG} Duplicate webhook insert race, skipping`, { eventId });
                return { acknowledged: true, duplicate: true, eventId };
            }
            throw error;
        }

        return { acknowledged: true, eventId };
    }

    async #handleSubscriptionActivated(payload, eventId) {
        const subEntity = this.#getSubscriptionEntity(payload);
        const paymentEntity = payload.payload?.payment?.entity || {};
        const subscription = await this.#findSubscriptionByRzpId(subEntity.id);

        this.#guardTransition(subscription.status, SUBSCRIPTION_STATUSES.ACTIVE);

        await subscriptionRepository.updateById(subscription._id, {
            status: SUBSCRIPTION_STATUSES.ACTIVE,
            currentPeriodStart: toDateFromSeconds(subEntity.current_start),
            currentPeriodEnd: toDateFromSeconds(subEntity.current_end),
            lastRenewalAt: new Date(),
            cancelAtPeriodEnd: false,
            cancelledAt: null,
        });

        await subscriptionTransactionRepository.create({
            subscriptionId: subscription._id,
            barberId: subscription.barberId,
            type: SUBSCRIPTION_TRANSACTION_TYPES.ACTIVATION,
            source: 'WEBHOOK',
            fromPlan: null,
            toPlan: subscription.planId,
            amount: paymentEntity.amount || 0,
            currency: paymentEntity.currency || 'INR',
            razorpayPaymentId: paymentEntity.id || null,
            razorpayInvoiceId: paymentEntity.invoice_id || null,
            webhookEventId: eventId,
        });

        await lifecycleOrchestrator.onSubscriptionActivated(subscription.barberId, subscription.planId);
    }

    async #handleSubscriptionCharged(payload, eventId) {
        const subEntity = this.#getSubscriptionEntity(payload);
        const paymentEntity = payload.payload?.payment?.entity || {};
        const subscription = await this.#findSubscriptionByRzpId(subEntity.id);

        await subscriptionRepository.updateById(subscription._id, {
            status: SUBSCRIPTION_STATUSES.ACTIVE,
            currentPeriodStart: toDateFromSeconds(subEntity.current_start),
            currentPeriodEnd: toDateFromSeconds(subEntity.current_end),
            lastRenewalAt: new Date(),
        });

        await subscriptionTransactionRepository.create({
            subscriptionId: subscription._id,
            barberId: subscription.barberId,
            type: SUBSCRIPTION_TRANSACTION_TYPES.RENEWAL,
            source: 'WEBHOOK',
            fromPlan: subscription.planId,
            toPlan: subscription.pendingPlanId || subscription.planId,
            amount: paymentEntity.amount || 0,
            currency: paymentEntity.currency || 'INR',
            razorpayPaymentId: paymentEntity.id || null,
            razorpayInvoiceId: paymentEntity.invoice_id || null,
            webhookEventId: eventId,
        });

        const updated = await subscriptionRepository.findById(subscription._id);
        await lifecycleOrchestrator.onSubscriptionRenewed(subscription.barberId, updated || subscription);
    }

    async #handleSubscriptionHalted(payload, eventId) {
        const subEntity = this.#getSubscriptionEntity(payload);
        const subscription = await this.#findSubscriptionByRzpId(subEntity.id);

        await subscriptionTransactionRepository.create({
            subscriptionId: subscription._id,
            barberId: subscription.barberId,
            type: SUBSCRIPTION_TRANSACTION_TYPES.EXPIRY,
            source: 'WEBHOOK',
            fromPlan: subscription.planId,
            toPlan: PLAN_IDS.BASIC,
            webhookEventId: eventId,
            metadata: { reason: 'All Razorpay payment retries exhausted' },
        });

        await lifecycleOrchestrator.onSubscriptionExpired(subscription.barberId);
    }

    async #handleSubscriptionCancelled(payload, eventId) {
        const subEntity = this.#getSubscriptionEntity(payload);
        const subscription = await this.#findSubscriptionByRzpId(subEntity.id);

        if (subscription.status !== SUBSCRIPTION_STATUSES.CANCELLED) {
            await subscriptionRepository.updateById(subscription._id, {
                status: SUBSCRIPTION_STATUSES.CANCELLED,
                cancelAtPeriodEnd: true,
                cancelledAt: new Date(),
                currentPeriodEnd: toDateFromSeconds(subEntity.current_end) || subscription.currentPeriodEnd,
            });
        }

        await subscriptionTransactionRepository.create({
            subscriptionId: subscription._id,
            barberId: subscription.barberId,
            type: SUBSCRIPTION_TRANSACTION_TYPES.CANCELLATION,
            source: 'WEBHOOK',
            fromPlan: subscription.planId,
            toPlan: subscription.status === SUBSCRIPTION_STATUSES.CANCELLED ? subscription.planId : PLAN_IDS.BASIC,
            webhookEventId: eventId,
            metadata: {
                reason: subscription.status === SUBSCRIPTION_STATUSES.CANCELLED
                    ? 'Confirmation of API-initiated cancellation'
                    : 'External cancellation',
            },
        });
    }

    async #handleSubscriptionPaused(payload, eventId) {
        const subEntity = this.#getSubscriptionEntity(payload);
        const subscription = await this.#findSubscriptionByRzpId(subEntity.id);

        this.#guardTransition(subscription.status, SUBSCRIPTION_STATUSES.PAUSED);
        await subscriptionRepository.updateById(subscription._id, {
            status: SUBSCRIPTION_STATUSES.PAUSED,
        });
        await subscriptionTransactionRepository.create({
            subscriptionId: subscription._id,
            barberId: subscription.barberId,
            type: SUBSCRIPTION_TRANSACTION_TYPES.PAUSE,
            source: 'WEBHOOK',
            fromPlan: subscription.planId,
            toPlan: subscription.planId,
            webhookEventId: eventId,
        });
    }

    async #handleSubscriptionResumed(payload, eventId) {
        const subEntity = this.#getSubscriptionEntity(payload);
        const subscription = await this.#findSubscriptionByRzpId(subEntity.id);

        this.#guardTransition(subscription.status, SUBSCRIPTION_STATUSES.ACTIVE);
        await subscriptionRepository.updateById(subscription._id, {
            status: SUBSCRIPTION_STATUSES.ACTIVE,
        });
        await subscriptionTransactionRepository.create({
            subscriptionId: subscription._id,
            barberId: subscription.barberId,
            type: SUBSCRIPTION_TRANSACTION_TYPES.RESUME,
            source: 'WEBHOOK',
            fromPlan: subscription.planId,
            toPlan: subscription.planId,
            webhookEventId: eventId,
        });
    }

    async #handleSubscriptionUpdated(payload, eventId) {
        const subEntity = this.#getSubscriptionEntity(payload);
        const subscription = await this.#findSubscriptionByRzpId(subEntity.id);
        const newPlanId = resolveRazorpayPlanId(subEntity.plan_id);
        if (!newPlanId || newPlanId === subscription.planId) {
            logger.info(`${LOG} Subscription update does not change plan`, {
                razorpaySubscriptionId: subEntity.id,
                gatewayPlanId: subEntity.plan_id,
            });
            return;
        }

        const oldPlanId = subscription.planId;
        await subscriptionRepository.updateById(subscription._id, {
            planId: newPlanId,
            pendingPlanId: null,
        });

        const type = newPlanId === PLAN_IDS.BASIC
            ? SUBSCRIPTION_TRANSACTION_TYPES.DOWNGRADE
            : SUBSCRIPTION_TRANSACTION_TYPES.UPGRADE;
        await subscriptionTransactionRepository.create({
            subscriptionId: subscription._id,
            barberId: subscription.barberId,
            type,
            source: 'WEBHOOK',
            fromPlan: oldPlanId,
            toPlan: newPlanId,
            webhookEventId: eventId,
        });

        await lifecycleOrchestrator.reconcileMediaForSubscription({
            ...subscription,
            planId: newPlanId,
        });
    }

    async #handlePaymentFailed(payload, eventId) {
        const paymentEntity = payload.payload?.payment?.entity || {};
        logger.warn(`${LOG} Payment failed`, {
            paymentId: paymentEntity.id || null,
            subscriptionId: paymentEntity.subscription_id || null,
            errorCode: paymentEntity.error_code || null,
            errorDescription: paymentEntity.error_description || null,
        });

        if (!paymentEntity.subscription_id) return;

        const subscription = await subscriptionRepository.findByRazorpaySubscriptionId(paymentEntity.subscription_id);
        if (!subscription) {
            logger.warn(`${LOG} Payment failure has no local subscription`, {
                razorpaySubscriptionId: paymentEntity.subscription_id,
                eventId,
            });
            return;
        }

        await subscriptionTransactionRepository.create({
            subscriptionId: subscription._id,
            barberId: subscription.barberId,
            type: SUBSCRIPTION_TRANSACTION_TYPES.PAYMENT_FAILED,
            source: 'WEBHOOK',
            fromPlan: subscription.planId,
            toPlan: subscription.planId,
            amount: paymentEntity.amount || 0,
            currency: paymentEntity.currency || 'INR',
            razorpayPaymentId: paymentEntity.id || null,
            razorpayInvoiceId: paymentEntity.invoice_id || null,
            webhookEventId: eventId,
            status: SUBSCRIPTION_TRANSACTION_STATUSES.FAILED,
            metadata: {
                gatewayStatus: paymentEntity.status || null,
                errorCode: paymentEntity.error_code || null,
                errorDescription: paymentEntity.error_description || null,
            },
        });
    }

    #verifySignature(headers, rawBody) {
        if (!subscriptionGateway.verifyWebhook(headers, rawBody)) {
            logger.error(`${LOG} Webhook signature verification failed`);
            throw new BadRequestError('Invalid webhook signature');
        }
    }

    #validateTimestamp(createdAt) {
        if (!createdAt) return;
        const eventTime = Number(createdAt) * 1000;
        const toleranceMs = config.subscription.webhookTimestampToleranceSec * 1000;
        if (Date.now() - eventTime > toleranceMs) {
            logger.warn(`${LOG} Webhook timestamp outside tolerance`, {
                eventTime: new Date(eventTime).toISOString(),
                toleranceMs,
            });
        }
    }

    #guardTransition(currentStatus, targetStatus) {
        const allowed = SUBSCRIPTION_STATUS_TRANSITIONS[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            logger.warn(`${LOG} Invalid status transition`, {
                from: currentStatus,
                to: targetStatus,
            });
        }
    }

    async #findSubscriptionByRzpId(razorpaySubscriptionId) {
        const subscription = await subscriptionRepository.findByRazorpaySubscriptionId(razorpaySubscriptionId);
        if (!subscription) {
            logger.error(`${LOG} No subscription found for Razorpay ID`, { razorpaySubscriptionId });
            throw new BadRequestError('Subscription not found for webhook');
        }
        return subscription;
    }

    #getSubscriptionEntity(payload) {
        const entity = payload.payload?.subscription?.entity;
        if (!entity?.id) throw new BadRequestError('Webhook payload missing subscription entity');
        return entity;
    }

    #getEventId(payload) {
        if (payload.id) return payload.id;
        const entity = payload.payload?.subscription?.entity || payload.payload?.payment?.entity || {};
        const entityId = entity.id || entity.subscription_id || 'unknown';
        return `${payload.event || 'unknown'}_${entityId}_${payload.created_at || Date.now()}`;
    }
}

export default new SubscriptionWebhookService();
