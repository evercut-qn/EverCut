import subscriptionService from '../services/subscription/subscription.service.js';
import webhookService from '../services/subscription/subscription-webhook.service.js';
import {
    serializeCheckout,
    serializePlan,
    serializeSubscription,
    serializeSubscriptionBasic,
    serializeTransaction,
} from '../serializers/subscription.serializer.js';
import { ApiResponse } from '../utils/api-response.js';
import { getValidatedRequestData } from '../utils/request-validation.utils.js';
import logger from '../utils/logger.js';

export const getPlans = async (_req, res, next) => {
    try {
        const plans = await subscriptionService.getPlans();
        return res.status(200).json(ApiResponse.success(plans.map(serializePlan), 'Subscription plans fetched'));
    } catch (error) {
        return next(error);
    }
};

export const getMySubscription = async (req, res, next) => {
    try {
        const result = await subscriptionService.getSubscriptionForUser(req.user._id);
        return res.status(200).json(ApiResponse.success(serializeSubscription(result), 'Subscription fetched'));
    } catch (error) {
        return next(error);
    }
};

export const subscribe = async (req, res, next) => {
    try {
        const { planId } = getValidatedRequestData(req, 'body');
        const result = await subscriptionService.subscribeUser(req.user, planId);
        return res.status(201).json(ApiResponse.success(serializeCheckout(result), 'Subscription checkout created'));
    } catch (error) {
        return next(error);
    }
};

export const upgrade = async (req, res, next) => {
    try {
        const { planId } = getValidatedRequestData(req, 'body');
        const subscription = await subscriptionService.upgradeSubscriptionForUser(req.user._id, planId);
        return res.status(200).json(ApiResponse.success(
            serializeSubscriptionBasic(subscription),
            'Subscription upgraded successfully',
        ));
    } catch (error) {
        return next(error);
    }
};

export const downgrade = async (req, res, next) => {
    try {
        const { planId } = getValidatedRequestData(req, 'body');
        const subscription = await subscriptionService.downgradeSubscriptionForUser(req.user._id, planId);
        return res.status(200).json(ApiResponse.success(
            serializeSubscriptionBasic(subscription),
            'Downgrade scheduled for next billing cycle',
        ));
    } catch (error) {
        return next(error);
    }
};

export const cancel = async (req, res, next) => {
    try {
        const subscription = await subscriptionService.cancelSubscriptionForUser(req.user._id);
        return res.status(200).json(ApiResponse.success(
            serializeSubscriptionBasic(subscription),
            'Subscription will be cancelled at the end of the current billing cycle',
        ));
    } catch (error) {
        return next(error);
    }
};

export const getTransactions = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const result = await subscriptionService.getTransactionHistoryForUser(req.user._id, query);
        return res.status(200).json(ApiResponse.paginated(
            result.transactions.map(serializeTransaction).filter(Boolean),
            result.pagination,
            'Subscription transactions fetched',
        ));
    } catch (error) {
        return next(error);
    }
};

export const getSubscriptionSummary = async (_req, res, next) => {
    try {
        const result = await subscriptionService.getSubscriptionSummary();
        return res.status(200).json(ApiResponse.success(result, 'Subscription summary fetched'));
    } catch (error) {
        return next(error);
    }
};

export const listSubscriptions = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const result = await subscriptionService.listSubscriptionsForAdmin(query);
        return res.status(200).json(ApiResponse.paginated(
            result.items,
            result.pagination,
            'Subscriptions fetched',
        ));
    } catch (error) {
        return next(error);
    }
};

export const handleWebhook = async (req, res) => {
    try {
        const result = await webhookService.handleWebhook(req.headers, req.rawBody || req.body);
        return res.status(200).json(ApiResponse.success(
            { received: true, ...result },
            'Subscription webhook processed',
        ));
    } catch (error) {
        logger.error('[SubscriptionController] Webhook processing error', {
            error: error.message,
        });
        return res.status(error.statusCode || 400).json(ApiResponse.error(
            error.message || 'Subscription webhook failed',
            { received: false },
        ));
    }
};
