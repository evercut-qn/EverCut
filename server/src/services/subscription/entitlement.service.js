import { getPlan, getPlanCapabilities, PLAN_IDS } from '../../config/subscription.config.js';
import subscriptionRepository from '../../repositories/subscription.repository.js';
import { SUBSCRIPTION_STATUSES } from '../../utils/constants.js';
import logger from '../../utils/logger.js';

const LOG = '[EntitlementResolver]';

const ACTIVE_ENTITLEMENT_STATUSES = new Set([
    SUBSCRIPTION_STATUSES.ACTIVE,
    SUBSCRIPTION_STATUSES.CANCELLED,
    SUBSCRIPTION_STATUSES.PAST_DUE,
    SUBSCRIPTION_STATUSES.PAUSED,
]);

function isSubscriptionEntitled(subscription) {
    if (!subscription || !ACTIVE_ENTITLEMENT_STATUSES.has(subscription.status)) {
        return false;
    }

    if (subscription.status === SUBSCRIPTION_STATUSES.CANCELLED && subscription.currentPeriodEnd) {
        return Date.now() < new Date(subscription.currentPeriodEnd).getTime();
    }

    return true;
}

function getActivePlanId(subscription) {
    if (!isSubscriptionEntitled(subscription)) return PLAN_IDS.BASIC;
    return subscription.planId || PLAN_IDS.BASIC;
}

function buildEntitlementResponse(planId, subscription) {
    const plan = getPlan(planId);
    const capabilities = getPlanCapabilities(planId);
    const totalPhotosUploaded = subscription?.totalPhotosUploaded || 0;
    const totalVideosUploaded = subscription?.totalVideosUploaded || 0;
    const statementsDownloadedThisPeriod = subscription?.statementsDownloadedThisPeriod || 0;

    return {
        planId,
        planName: plan.name,
        planLabel: plan.label,
        isFree: plan.isFree,
        ...capabilities,
        totalPhotosUploaded,
        totalVideosUploaded,
        statementsDownloadedThisPeriod,
        remainingPhotos: Math.max(0, capabilities.maxPhotos - totalPhotosUploaded),
        remainingVideos: Math.max(0, capabilities.maxVideos - totalVideosUploaded),
        remainingStatements: Math.max(0, capabilities.maxStatementsPerCycle - statementsDownloadedThisPeriod),
        subscriptionStatus: subscription?.status || 'NONE',
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
        cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
    };
}

async function resolveEntitlements(barberId) {
    const subscription = await subscriptionRepository.findByBarberId(barberId);
    if (!subscription) {
        logger.debug(`${LOG} Missing subscription, defaulting to Basic`, { barberId });
        return buildEntitlementResponse(PLAN_IDS.BASIC, null);
    }

    const activePlanId = getActivePlanId(subscription);
    if (activePlanId === PLAN_IDS.BASIC && subscription.planId !== PLAN_IDS.BASIC) {
        logger.debug(`${LOG} Subscription not entitled, defaulting to Basic`, {
            barberId,
            subscriptionId: subscription._id,
            status: subscription.status,
        });
    }

    return buildEntitlementResponse(activePlanId, subscription);
}

async function canUploadPhoto(barberId) {
    const subscription = await subscriptionRepository.findByBarberId(barberId);
    const planId = getActivePlanId(subscription);
    const { maxPhotos } = getPlanCapabilities(planId);
    const current = subscription?.totalPhotosUploaded || 0;

    return {
        allowed: current < maxPhotos,
        current,
        limit: maxPhotos,
        remaining: Math.max(0, maxPhotos - current),
    };
}

async function canUploadVideo(barberId) {
    const subscription = await subscriptionRepository.findByBarberId(barberId);
    const planId = getActivePlanId(subscription);
    const { maxVideos } = getPlanCapabilities(planId);
    const current = subscription?.totalVideosUploaded || 0;

    return {
        allowed: current < maxVideos,
        current,
        limit: maxVideos,
        remaining: Math.max(0, maxVideos - current),
    };
}

async function canDownloadStatement(barberId) {
    const subscription = await subscriptionRepository.findByBarberId(barberId);
    const planId = getActivePlanId(subscription);
    const { maxStatementsPerCycle } = getPlanCapabilities(planId);
    const current = subscription?.statementsDownloadedThisPeriod || 0;

    return {
        allowed: current < maxStatementsPerCycle,
        current,
        limit: maxStatementsPerCycle,
        remaining: Math.max(0, maxStatementsPerCycle - current),
    };
}

async function getBadge(barberId) {
    const entitlements = await resolveEntitlements(barberId);
    return entitlements.badge;
}

async function getVisibilityTier(barberId) {
    const entitlements = await resolveEntitlements(barberId);
    return entitlements.visibilityTier;
}

export default {
    resolveEntitlements,
    canUploadPhoto,
    canUploadVideo,
    canDownloadStatement,
    getBadge,
    getVisibilityTier,
    isSubscriptionEntitled,
};
