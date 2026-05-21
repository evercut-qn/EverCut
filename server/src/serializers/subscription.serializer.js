import { sanitizeForResponse, toIdString, toPlainObject } from './core.serializer.js';

const compact = (value) => Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
);

export const serializePlan = (plan) => ({
    id: plan.id,
    name: plan.name,
    label: plan.label,
    description: plan.description,
    isFree: plan.isFree,
    pricing: {
        amount: plan.pricing.amount,
        currency: plan.pricing.currency,
        period: plan.pricing.period,
        displayPrice: plan.pricing.displayPrice,
    },
    capabilities: {
        maxPhotos: plan.capabilities.maxPhotos,
        maxVideos: plan.capabilities.maxVideos,
        maxStatementsPerCycle: plan.capabilities.maxStatementsPerCycle,
        badge: plan.capabilities.badge,
        visibilityTier: plan.capabilities.visibilityTier,
        supportTier: plan.capabilities.supportTier,
        analyticsAccess: plan.capabilities.analyticsAccess,
        promotionalTools: plan.capabilities.promotionalTools,
    },
});

export const serializeSubscriptionBasic = (subscription) => {
    const plain = sanitizeForResponse(toPlainObject(subscription));
    if (!plain) return null;
    return compact({
        id: plain.id,
        planId: plain.planId,
        status: plain.status,
        currentPeriodStart: plain.currentPeriodStart ?? null,
        currentPeriodEnd: plain.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: plain.cancelAtPeriodEnd ?? false,
        cancelledAt: plain.cancelledAt ?? null,
        pendingPlanId: plain.pendingPlanId ?? null,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    });
};

export const serializeSubscription = ({ subscription, entitlements, plan }) => {
    const basic = serializeSubscriptionBasic(subscription);
    if (!basic) return null;

    return {
        ...basic,
        planName: plan.name,
        planLabel: plan.label,
        isFree: plan.isFree,
        usage: {
            photos: {
                used: entitlements.totalPhotosUploaded,
                limit: entitlements.maxPhotos,
                remaining: entitlements.remainingPhotos,
            },
            videos: {
                used: entitlements.totalVideosUploaded,
                limit: entitlements.maxVideos,
                remaining: entitlements.remainingVideos,
            },
            statements: {
                used: entitlements.statementsDownloadedThisPeriod,
                limit: entitlements.maxStatementsPerCycle,
                remaining: entitlements.remainingStatements,
            },
        },
        badge: entitlements.badge,
        visibilityTier: entitlements.visibilityTier,
        supportTier: entitlements.supportTier,
        analyticsAccess: entitlements.analyticsAccess,
        promotionalTools: entitlements.promotionalTools,
    };
};

export const serializeCheckout = (checkout) => ({
    subscriptionId: toIdString(checkout.subscriptionId),
    razorpaySubscriptionId: checkout.razorpaySubscriptionId,
    checkoutUrl: checkout.checkoutUrl,
    razorpayKeyId: checkout.razorpayKeyId,
});

export const serializeTransaction = (transaction) => {
    const plain = sanitizeForResponse(toPlainObject(transaction));
    if (!plain) return null;
    return compact({
        id: plain.id,
        type: plain.type,
        source: plain.source,
        fromPlan: plain.fromPlan ?? null,
        toPlan: plain.toPlan,
        amount: plain.amount,
        currency: plain.currency,
        status: plain.status,
        razorpayPaymentId: plain.razorpayPaymentId ?? null,
        razorpayInvoiceId: plain.razorpayInvoiceId ?? null,
        createdAt: plain.createdAt,
    });
};

export default {
    serializePlan,
    serializeSubscription,
    serializeBasic: serializeSubscriptionBasic,
    serializeCheckout,
    serializeTransaction,
};
