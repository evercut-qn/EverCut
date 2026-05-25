import barberRepository from '../../repositories/barber.repository.js';
import subscriptionRepository from '../../repositories/subscription.repository.js';
import subscriptionTransactionRepository from '../../repositories/subscription-transaction.repository.js';
import entitlementService from './entitlement.service.js';
import lifecycleOrchestrator from './subscription-lifecycle.service.js';
import subscriptionGateway from '../../adapters/razorpay/razorpay-subscription.adapter.js';
import {
    getAllPlans,
    getPlan,
    validatePlanTransition,
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

const LOG = '[SubscriptionService]';

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

        const existing = await this.ensureDefaultSubscription(barberId);
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

        const subscription = await this.ensureDefaultSubscription(barberId);
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

        const subscription = await this.ensureDefaultSubscription(barberId);
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

        const subscription = await this.ensureDefaultSubscription(barberId);
        if (!isPaid(subscription)) {
            throw new BadRequestError('No active paid subscription to cancel');
        }
        if (subscription.cancelAtPeriodEnd) {
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
}

export default new SubscriptionService();
