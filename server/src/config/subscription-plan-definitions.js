import { SUBSCRIPTION_PLANS } from '../utils/constants.js';

export const PLAN_DEFINITIONS = Object.freeze({
    [SUBSCRIPTION_PLANS.BASIC]: Object.freeze({
        id: SUBSCRIPTION_PLANS.BASIC,
        name: 'Basic',
        label: 'Starter Plan',
        description: 'Get started with essential features.',
        isFree: true,
        pricing: Object.freeze({
            amount: 0,
            currency: 'INR',
            period: 'monthly',
            displayPrice: 'Free',
        }),
        capabilities: Object.freeze({
            maxPhotos: 10,
            maxVideos: 2,
            maxStatementsPerCycle: 1,
            badge: 'NONE',
            visibilityTier: 'NONE',
            supportTier: 'STANDARD',
            priorityListingBoost: 0,
            analyticsAccess: false,
            promotionalTools: false,
        }),
        sortOrder: 0,
        razorpay: null,
    }),
    [SUBSCRIPTION_PLANS.POPULAR]: Object.freeze({
        id: SUBSCRIPTION_PLANS.POPULAR,
        name: 'Popular',
        label: 'Most Recommended',
        description: 'Enhanced reach and local visibility for growing salons.',
        isFree: false,
        envVar: 'RAZORPAY_PLAN_ID_POPULAR',
        pricing: Object.freeze({
            amount: 29900,
            currency: 'INR',
            period: 'monthly',
            displayPrice: 'INR 299/month',
        }),
        capabilities: Object.freeze({
            maxPhotos: 30,
            maxVideos: 10,
            maxStatementsPerCycle: 5,
            badge: 'BLUE',
            visibilityTier: 'LOCAL',
            supportTier: 'PREMIUM_BASIC',
            priorityListingBoost: 1,
            analyticsAccess: false,
            promotionalTools: false,
        }),
        sortOrder: 1,
        razorpay: Object.freeze({
            period: 'monthly',
            interval: 1,
            item: Object.freeze({
                name: 'EverCut - Popular',
                amount: 29900,
                currency: 'INR',
                description: 'Enhanced reach and local visibility for growing salons. 30 photos, 10 videos, blue badge.',
            }),
        }),
    }),
    [SUBSCRIPTION_PLANS.ADVANCED]: Object.freeze({
        id: SUBSCRIPTION_PLANS.ADVANCED,
        name: 'Advanced',
        label: 'Premium Growth',
        description: 'Maximum exposure and priority reach for top salons.',
        isFree: false,
        envVar: 'RAZORPAY_PLAN_ID_ADVANCED',
        pricing: Object.freeze({
            amount: 49900,
            currency: 'INR',
            period: 'monthly',
            displayPrice: 'INR 499/month',
        }),
        capabilities: Object.freeze({
            maxPhotos: 50,
            maxVideos: 15,
            maxStatementsPerCycle: 10,
            badge: 'YELLOW',
            visibilityTier: 'PRIORITY',
            supportTier: 'PREMIUM_PRIORITY',
            priorityListingBoost: 2,
            analyticsAccess: true,
            promotionalTools: true,
        }),
        sortOrder: 2,
        razorpay: Object.freeze({
            period: 'monthly',
            interval: 1,
            item: Object.freeze({
                name: 'EverCut - Advanced',
                amount: 49900,
                currency: 'INR',
                description: 'Maximum exposure and priority reach for top salons. 50 photos, 15 videos, yellow badge.',
            }),
        }),
    }),
});

export const getOrderedPlanDefinitions = () => (
    Object.values(PLAN_DEFINITIONS).sort((a, b) => a.sortOrder - b.sortOrder)
);

export const getRazorpayProvisioningPlans = () => (
    getOrderedPlanDefinitions()
        .filter((plan) => !plan.isFree)
        .map((plan) => ({
            planId: plan.id,
            envVar: plan.envVar,
            razorpay: plan.razorpay,
        }))
);
