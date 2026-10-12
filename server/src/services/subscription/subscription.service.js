import barberRepository from '../../repositories/barber.repository.js';
import shopRepository from '../../repositories/shop.repository.js';
import subscriptionRepository from '../../repositories/subscription.repository.js';
import subscriptionTransactionRepository from '../../repositories/subscription-transaction.repository.js';
import entitlementService from './entitlement.service.js';
import lifecycleOrchestrator from './subscription-lifecycle.service.js';
import subscriptionGateway from '../../adapters/razorpay/razorpay-subscription.adapter.js';
import {
    getAllPlans,
    getPlan,
    validatePlanTransition,
    resolveRazorpayPlanId,
    PLAN_IDS,
    assertPaidPlanConfigured,
} from '../../config/subscription.config.js';
import {
    SUBSCRIPTION_PLANS,
    SUBSCRIPTION_STATUSES,
    SUBSCRIPTION_TRANSACTION_STATUSES,
    SUBSCRIPTION_TRANSACTION_TYPES,
} from '../../utils/constants.js';
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
} from '../../utils/api-error.js';
import { buildPagination } from '../../utils/pagination.utils.js';
import logger from '../../utils/logger.js';
import { serializeAdminSubscription } from '../../serializers/subscription.serializer.js';

const LOG = '[SubscriptionService]';

const toDateFromSeconds = (value) => (
    Number.isFinite(Number(value)) ? new Date(Number(value) * 1000) : null
);

const mapRazorpayStatus = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (['active', 'authenticated'].includes(normalized)) return SUBSCRIPTION_STATUSES.ACTIVE;
    if (['pending', 'created'].includes(normalized)) return SUBSCRIPTION_STATUSES.PENDING_PAYMENT;
    if (['halted', 'expired', 'completed'].includes(normalized)) return SUBSCRIPTION_STATUSES.EXPIRED;
    if (normalized === 'cancelled') return SUBSCRIPTION_STATUSES.CANCELLED;
    if (normalized === 'paused') return SUBSCRIPTION_STATUSES.PAUSED;
    return null;
};

const isPaid = (subscription) => (
    typeof subscription?.isPaid === 'function'
        ? subscription.isPaid()
        : subscription?.planId !== SUBSCRIPTION_PLANS.BASIC
);

const isEntitled = (subscription) => (
    typeof subscription?.isEntitled === 'function'
        ? subscription.isEntitled()
        : entitlementService.isSubscriptionEntitled(subscription)
);

class SubscriptionService {
    async getPlans() {
        return getAllPlans();
    }

    async resolveBarberForUser(userId) {
        const barber = await barberRepository.findByUserId(userId);
        if (!barber) throw new NotFoundError('Barber profile');
        return barber;
    }

    async ensureDefaultSubscription(barberId, source = 'API') {
        const existing = await subscriptionRepository.findByBarberId(barberId);
        if (existing) return existing;
        return subscriptionRepository.upsertDefaultForBarber(barberId, source);
    }

    async getSubscription(barberId) {
        const subscription = await this.ensureDefaultSubscription(barberId);
        const entitlements = await entitlementService.resolveEntitlements(barberId);
        return {
            subscription,
            entitlements,
            plan: getPlan(subscription.planId),
        };
    }

    async getSubscriptionForUser(userId) {
        const barber = await this.resolveBarberForUser(userId);
        return this.getSubscription(barber._id);
    }

    // Fetches this subscription's live state directly from Razorpay and
    // reconciles the local record. This is the single source of truth both
    // the on-demand sync endpoint (syncSubscription) and the cron
    // reconciliation jobs use — previously the cron had its own inline copy
    // of this logic and nothing else could trigger it, which is exactly why
    // a subscription stuck in PENDING_PAYMENT (webhook never arrived) had
    // no path back to ACTIVE short of a full day's wait for the reconciler
    // to even consider it (findAllActivePaid excluded PENDING_PAYMENT
    // entirely — see subscription.repository.js).
    //
    // Returns { subscription, changed, transitionedToActive } — the caller
    // decides what side effects (lifecycle hooks, transaction records) to
    // run for its own context (webhook-style vs cron-style vs sync-style),
    // since the audit trail (`source`) needs to reflect which one.
    async reconcileWithGateway(subscription, { source = 'RECONCILIATION' } = {}) {
        if (!subscription.razorpaySubscriptionId) {
            return { subscription, changed: false, transitionedToActive: false };
        }

        const gatewaySubscription = await subscriptionGateway.fetchSubscription(
            subscription.razorpaySubscriptionId,
        );
        const mappedStatus = mapRazorpayStatus(gatewaySubscription.status);
        const gatewayPlanId = resolveRazorpayPlanId(gatewaySubscription.plan_id);
        const wasActive = subscription.status === SUBSCRIPTION_STATUSES.ACTIVE;

        if (mappedStatus === SUBSCRIPTION_STATUSES.EXPIRED) {
            await subscriptionTransactionRepository.create({
                subscriptionId: subscription._id,
                barberId: subscription.barberId,
                type: SUBSCRIPTION_TRANSACTION_TYPES.EXPIRY,
                source,
                fromPlan: subscription.planId,
                toPlan: PLAN_IDS.BASIC,
                metadata: { gatewayStatus: gatewaySubscription.status },
            });
            await lifecycleOrchestrator.onSubscriptionExpired(subscription.barberId);
            const updated = await subscriptionRepository.findById(subscription._id);
            return { subscription: updated, changed: true, transitionedToActive: false };
        }

        const updates = {};
        if (mappedStatus && mappedStatus !== subscription.status) updates.status = mappedStatus;
        if (gatewayPlanId && gatewayPlanId !== subscription.planId) updates.planId = gatewayPlanId;
        const currentStart = toDateFromSeconds(gatewaySubscription.current_start);
        const currentEnd = toDateFromSeconds(gatewaySubscription.current_end);
        if (currentStart) updates.currentPeriodStart = currentStart;
        if (currentEnd) updates.currentPeriodEnd = currentEnd;

        if (Object.keys(updates).length === 0) {
            return { subscription, changed: false, transitionedToActive: false };
        }

        const updated = await subscriptionRepository.updateById(subscription._id, updates);
        const transitionedToActive = !wasActive && mappedStatus === SUBSCRIPTION_STATUSES.ACTIVE;

        if (transitionedToActive) {
            await subscriptionTransactionRepository.create({
                subscriptionId: subscription._id,
                barberId: subscription.barberId,
                type: SUBSCRIPTION_TRANSACTION_TYPES.ACTIVATION,
                source,
                fromPlan: subscription.planId,
                toPlan: updated.planId,
                metadata: { gatewayStatus: gatewaySubscription.status, reason: 'Missed subscription.activated webhook' },
            });
            await lifecycleOrchestrator.onSubscriptionActivated(subscription.barberId, updated.planId);
        }

        await lifecycleOrchestrator.reconcileMediaForSubscription(updated);

        return { subscription: updated, changed: true, transitionedToActive };
    }

    // Called by every billing-affecting action (subscribe/upgrade/downgrade/
    // cancel) before it evaluates any guard condition against local state.
    // Fixes the class of bug where a manual Razorpay-dashboard change (or a
    // missed webhook) leaves the local record stale until the next daily
    // cron pass — e.g. cancelling directly in Razorpay while the local
    // record still said ACTIVE, which blocked re-subscribing with a 409
    // for up to 24h. Best-effort: a sync failure here logs and falls back
    // to local state rather than blocking the user's action entirely.
    async _syncBeforeGuard(subscription, context) {
        if (!subscription?.razorpaySubscriptionId) {
            return subscription;
        }

        try {
            const { subscription: synced } = await this.reconcileWithGateway(subscription, {
                source: 'PRE_ACTION_SYNC',
            });
            return synced;
        } catch (error) {
            logger.warn(`${LOG} Pre-action sync failed, proceeding with local state`, {
                barberId: subscription.barberId,
                subscriptionId: subscription._id,
                context,
                error: error.message,
            });
            return subscription;
        }
    }

    async syncSubscriptionForUser(userId) {
        const barber = await this.resolveBarberForUser(userId);
        return this.syncSubscription(barber._id);
    }

    // On-demand version of the reconciliation cron — call right after the
    // user returns from Razorpay's hosted checkout, same principle as the
    // booking-payment flow's POST /payments/:id/verify. Never trusts
    // client-reported outcome; always re-checks Razorpay directly.
    async syncSubscription(barberId) {
        const subscription = await this.ensureDefaultSubscription(barberId);

        try {
            await this.reconcileWithGateway(subscription, { source: 'SYNC' });
        } catch (error) {
            logger.warn(`${LOG} Subscription sync failed`, {
                barberId,
                subscriptionId: subscription._id,
                error: error.message,
            });
        }

        return this.getSubscription(barberId);
    }

    async subscribeUser(user, planId) {
        const barber = await this.resolveBarberForUser(user._id);
        const barberDetails = {
            name: `${barber.firstName || ''} ${barber.lastName || ''}`.trim() || 'EverCut Barber',
            email: user.email || null,
            phone: user.phoneNumber || null,
        };
        return this.createSubscription(barber._id, planId, barberDetails);
    }

    async createSubscription(barberId, planId, barberDetails = {}) {
        logger.info(`${LOG} Creating subscription`, { barberId, planId });

        const plan = getPlan(planId);
        if (!plan || plan.isFree) {
            throw new BadRequestError('Cannot create a billing subscription for the free plan');
        }
        assertPaidPlanConfigured(planId);

        let existing = await this.ensureDefaultSubscription(barberId);
        existing = await this._syncBeforeGuard(existing, 'createSubscription');

        if (
            isPaid(existing)
            && isEntitled(existing)
            && existing.status !== SUBSCRIPTION_STATUSES.PENDING_PAYMENT
        ) {
            throw new ConflictError('You already have an active subscription. Cancel or downgrade first.');
        }

        let razorpayCustomerId = existing?.razorpayCustomerId;
        if (!razorpayCustomerId) {
            const customer = await subscriptionGateway.createCustomer({
                name: barberDetails.name,
                email: barberDetails.email,
                contact: barberDetails.phone,
                notes: { barberId: String(barberId) },
            });
            razorpayCustomerId = customer.id;
        }

        const rzpSubscription = await subscriptionGateway.createSubscription({
            planId: plan.razorpayPlanId,
            customerId: razorpayCustomerId,
            totalCount: 120,
            notes: {
                barber_id: String(barberId),
                plan_type: planId,
                internal_plan_name: plan.name,
            },
        });

        const updateData = {
            planId,
            status: SUBSCRIPTION_STATUSES.PENDING_PAYMENT,
            razorpaySubscriptionId: rzpSubscription.id,
            razorpayCustomerId,
            pendingPlanId: null,
            cancelAtPeriodEnd: false,
            cancelledAt: null,
        };

        const subscription = await subscriptionRepository.updateById(existing._id, updateData);

        await subscriptionTransactionRepository.create({
            subscriptionId: subscription._id,
            barberId,
            type: SUBSCRIPTION_TRANSACTION_TYPES.CREATION,
            source: 'API',
            fromPlan: existing?.planId || PLAN_IDS.BASIC,
            toPlan: planId,
            amount: plan.pricing.amount,
            currency: plan.pricing.currency,
            status: SUBSCRIPTION_TRANSACTION_STATUSES.PENDING,
            metadata: {
                razorpaySubscriptionId: rzpSubscription.id,
            },
        });

        return {
            subscriptionId: subscription._id,
            razorpaySubscriptionId: rzpSubscription.id,
            checkoutUrl: rzpSubscription.short_url || null,
            razorpayKeyId: subscriptionGateway.getKeyId(),
        };
    }

    async upgradeSubscriptionForUser(userId, planId) {
        const barber = await this.resolveBarberForUser(userId);
        return this.upgradeSubscription(barber._id, planId);
    }

    async upgradeSubscription(barberId, newPlanId) {
        logger.info(`${LOG} Upgrading subscription`, { barberId, newPlanId });

        let subscription = await this.ensureDefaultSubscription(barberId);
        subscription = await this._syncBeforeGuard(subscription, 'upgradeSubscription');

        const transition = validatePlanTransition(subscription.planId, newPlanId);
        if (!transition.valid) throw new BadRequestError(transition.reason);
        if (transition.type !== 'UPGRADE') {
            throw new BadRequestError('This is not an upgrade. Use the downgrade endpoint.');
        }

        const newPlan = assertPaidPlanConfigured(newPlanId);
        if (!subscription.razorpaySubscriptionId) {
            throw new BadRequestError('To upgrade from Basic, use the subscribe endpoint to create a new subscription.');
        }

        await subscriptionGateway.updateSubscription(subscription.razorpaySubscriptionId, {
            planId: newPlan.razorpayPlanId,
        });

        const updated = await subscriptionRepository.updateById(subscription._id, {
            planId: newPlanId,
            pendingPlanId: null,
            cancelAtPeriodEnd: false,
            cancelledAt: null,
            status: SUBSCRIPTION_STATUSES.ACTIVE,
        });

        await lifecycleOrchestrator.onPlanUpgraded(barberId, subscription.planId, newPlanId);
        await subscriptionTransactionRepository.create({
            subscriptionId: subscription._id,
            barberId,
            type: SUBSCRIPTION_TRANSACTION_TYPES.UPGRADE,
            source: 'API',
            fromPlan: subscription.planId,
            toPlan: newPlanId,
        });

        return updated;
    }

    async downgradeSubscriptionForUser(userId, planId) {
        const barber = await this.resolveBarberForUser(userId);
        return this.downgradeSubscription(barber._id, planId);
    }

    async downgradeSubscription(barberId, newPlanId) {
        logger.info(`${LOG} Downgrading subscription`, { barberId, newPlanId });

        let subscription = await this.ensureDefaultSubscription(barberId);
        subscription = await this._syncBeforeGuard(subscription, 'downgradeSubscription');

        const transition = validatePlanTransition(subscription.planId, newPlanId);
        if (!transition.valid) throw new BadRequestError(transition.reason);
        if (transition.type !== 'DOWNGRADE') {
            throw new BadRequestError('This is not a downgrade. Use the upgrade endpoint.');
        }

        if (newPlanId === PLAN_IDS.BASIC) {
            return this.cancelSubscription(barberId);
        }

        const updated = await subscriptionRepository.updateById(subscription._id, {
            pendingPlanId: newPlanId,
        });

        await subscriptionTransactionRepository.create({
            subscriptionId: subscription._id,
            barberId,
            type: SUBSCRIPTION_TRANSACTION_TYPES.DOWNGRADE,
            source: 'API',
            fromPlan: subscription.planId,
            toPlan: newPlanId,
            metadata: {
                appliesAtNextRenewal: true,
                appliesAt: subscription.currentPeriodEnd,
            },
        });

        return updated;
    }

    async cancelSubscriptionForUser(userId) {
        const barber = await this.resolveBarberForUser(userId);
        return this.cancelSubscription(barber._id);
    }

    async cancelSubscription(barberId) {
        logger.info(`${LOG} Cancelling subscription`, { barberId });

        let subscription = await this.ensureDefaultSubscription(barberId);
        subscription = await this._syncBeforeGuard(subscription, 'cancelSubscription');

        // The sync above may have discovered the subscription had already
        // expired on Razorpay's side (onSubscriptionExpired already reset
        // it to Basic) — nothing left to cancel.
        if (subscription.status === SUBSCRIPTION_STATUSES.EXPIRED) {
            return subscription;
        }

        if (!isPaid(subscription)) {
            throw new BadRequestError('No active paid subscription to cancel');
        }
        if (subscription.cancelAtPeriodEnd || subscription.status === SUBSCRIPTION_STATUSES.CANCELLED) {
            throw new ConflictError('Subscription is already set to cancel');
        }

        if (subscription.razorpaySubscriptionId) {
            await subscriptionGateway.cancelSubscription(subscription.razorpaySubscriptionId, {
                cancelAtCycleEnd: true,
            });
        }

        const updated = await subscriptionRepository.updateById(subscription._id, {
            status: SUBSCRIPTION_STATUSES.CANCELLED,
            cancelAtPeriodEnd: true,
            cancelledAt: new Date(),
            pendingPlanId: null,
        });

        await subscriptionTransactionRepository.create({
            subscriptionId: subscription._id,
            barberId,
            type: SUBSCRIPTION_TRANSACTION_TYPES.CANCELLATION,
            source: 'API',
            fromPlan: subscription.planId,
            toPlan: PLAN_IDS.BASIC,
            metadata: {
                accessUntil: subscription.currentPeriodEnd || null,
            },
        });

        return updated;
    }

    async getTransactionHistoryForUser(userId, query = {}) {
        const barber = await this.resolveBarberForUser(userId);
        return this.getTransactionHistory(barber._id, query);
    }

    async getTransactionHistory(barberId, query = {}) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 20);
        const total = await subscriptionTransactionRepository.countByBarberId(barberId);
        const { skip, limit: normalizedLimit, pagination } = buildPagination({ page, limit }, total);
        const transactions = await subscriptionTransactionRepository.findByBarberId(
            barberId,
            { skip, limit: normalizedLimit },
        );
        return { transactions, pagination };
    }

    async getSubscriptionSummary() {
        const rows = await subscriptionRepository.aggregateAdminSummary();
        const byPlan = {};
        const byStatus = {};
        let activeSubscriptions = 0;
        let monthlyRecurringRevenueInPaisa = 0;

        for (const row of rows) {
            byPlan[row.planId] = (byPlan[row.planId] || 0) + row.count;
            byStatus[row.status] = (byStatus[row.status] || 0) + row.count;

            if (row.status === SUBSCRIPTION_STATUSES.ACTIVE) {
                activeSubscriptions += row.count;
                const plan = getPlan(row.planId);
                monthlyRecurringRevenueInPaisa += (plan?.pricing?.amount || 0) * row.count;
            }
        }

        return {
            activeSubscriptions,
            byPlan,
            byStatus,
            monthlyRecurringRevenueInRupees: monthlyRecurringRevenueInPaisa / 100,
            distribution: rows,
        };
    }

    async listSubscriptionsForAdmin(query = {}) {
        const filter = {};
        if (query.status) filter.status = query.status;
        if (query.planId) filter.planId = query.planId;
        const total = await subscriptionRepository.countAll(filter);
        const { skip, limit, pagination } = buildPagination(query, total);
        const subscriptions = await subscriptionRepository.findAllFiltered(filter, { skip, limit });
        const shopsByBarberId = new Map();

        await Promise.all(subscriptions.map(async (subscription) => {
            const barberId = subscription.barberId?._id || subscription.barberId;
            if (!barberId) return;
            const shop = await shopRepository.findByBarberId(barberId);
            shopsByBarberId.set(String(barberId), shop);
        }));

        return {
            items: subscriptions.map((subscription) => serializeAdminSubscription({
                subscription,
                shop: shopsByBarberId.get(String(subscription.barberId?._id || subscription.barberId)),
            })).filter(Boolean),
            pagination,
        };
    }
}

export default new SubscriptionService();
