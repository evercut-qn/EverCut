import config from './index.js';
import { SUBSCRIPTION_PLANS } from '../utils/constants.js';
import { PLAN_DEFINITIONS } from './subscription-plan-definitions.js';

export const PLAN_IDS = SUBSCRIPTION_PLANS;

export const BADGE_TYPES = Object.freeze({
    NONE: 'NONE',
    BLUE: 'BLUE',
    YELLOW: 'YELLOW',
});

export const VISIBILITY_TIERS = Object.freeze({
    NONE: 'NONE',
    LOCAL: 'LOCAL',
    PRIORITY: 'PRIORITY',
});

export const SUPPORT_TIERS = Object.freeze({
    STANDARD: 'STANDARD',
    PREMIUM_BASIC: 'PREMIUM_BASIC',
    PREMIUM_PRIORITY: 'PREMIUM_PRIORITY',
});

const planIdFromEnv = (planId) => {
    if (planId === PLAN_IDS.POPULAR) return config.razorpay.planIdPopular || null;
    if (planId === PLAN_IDS.ADVANCED) return config.razorpay.planIdAdvanced || null;
    return null;
};

const planEnvKey = (planId) => {
    if (planId === PLAN_IDS.POPULAR) return 'RAZORPAY_PLAN_ID_POPULAR';
    if (planId === PLAN_IDS.ADVANCED) return 'RAZORPAY_PLAN_ID_ADVANCED';
    return null;
};

export function isRazorpayPlanExplicitlyConfigured(planId) {
    const key = planEnvKey(planId);
    if (!key) return true;
    return Boolean(process.env[key]);
}

export const PLANS = Object.freeze(Object.fromEntries(
    Object.values(PLAN_DEFINITIONS).map((plan) => [
        plan.id,
        Object.freeze({
            ...plan,
            razorpayPlanId: planIdFromEnv(plan.id),
        }),
    ]),
));

export function getPlan(planId) {
    return PLANS[planId] || PLANS[PLAN_IDS.BASIC];
}

export function getPlanCapabilities(planId) {
    return getPlan(planId).capabilities;
}

export function getAllPlans() {
    return Object.values(PLANS).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getPaidPlans() {
    return getAllPlans().filter((plan) => !plan.isFree);
}

export function resolveRazorpayPlanId(razorpayPlanId) {
    const plan = Object.values(PLANS).find((candidate) => (
        candidate.razorpayPlanId === razorpayPlanId
    ));
    return plan?.id || null;
}

export function validatePlanTransition(fromPlanId, toPlanId) {
    if (fromPlanId === toPlanId) {
        return { valid: false, type: null, reason: 'Already on this plan' };
    }

    const fromPlan = getPlan(fromPlanId);
    const toPlan = getPlan(toPlanId);

    if (toPlan.sortOrder > fromPlan.sortOrder) {
        return { valid: true, type: 'UPGRADE' };
    }

    if (toPlan.sortOrder < fromPlan.sortOrder) {
        return { valid: true, type: 'DOWNGRADE' };
    }

    return { valid: false, type: null, reason: 'Invalid plan transition' };
}

export function assertPaidPlanConfigured(planId) {
    const plan = getPlan(planId);
    if (plan.isFree) return plan;
    if (!plan.razorpayPlanId || (config.razorpay.env === 'PRODUCTION' && !isRazorpayPlanExplicitlyConfigured(planId))) {
        throw new Error(`Razorpay plan ID is not configured for ${planId}`);
    }
    return plan;
}
