import crypto from 'crypto';
import Razorpay from 'razorpay';

import config from '../../config/index.js';
import { PaymentError } from '../../utils/api-error.js';
import logger from '../../utils/logger.js';
import { SubscriptionGatewayAdapter } from '../subscription-gateway.adapter.js';
import {
    DEFAULT_RAZORPAY_SUBSCRIPTION_TOTAL_COUNT,
    RAZORPAY_WEBHOOK_SIGNATURE_HEADER,
} from './razorpay.constants.js';

const LOG = '[RazorpaySubscriptionAdapter]';

class RazorpaySubscriptionAdapter extends SubscriptionGatewayAdapter {
    constructor() {
        super();
        this._instance = null;
    }

    getProviderName() {
        return 'razorpay';
    }

    getPublicKeyId() {
        return config.razorpay.keyId;
    }

    getKeyId() {
        return this.getPublicKeyId();
    }

    get client() {
        if (!this._instance) {
            this._instance = new Razorpay({
                key_id: config.razorpay.keyId,
                key_secret: config.razorpay.keySecret,
            });
        }
        return this._instance;
    }

    async createCustomer({ name, email, contact, notes = {} }) {
        try {
            const customer = await this.client.customers.create({
                name,
                email,
                contact,
                notes,
            });

            logger.info(`${LOG} Customer created`, { customerId: customer.id });
            return customer;
        } catch (error) {
            throw this.#toPaymentError(error, 'Unable to create Razorpay customer');
        }
    }

    async createSubscription({
        planId,
        customerId,
        totalCount = DEFAULT_RAZORPAY_SUBSCRIPTION_TOTAL_COUNT,
        notes = {},
    }) {
        try {
            const subscription = await this.client.subscriptions.create({
                plan_id: planId,
                customer_id: customerId,
                total_count: totalCount,
                customer_notify: 1,
                notes,
            });

            logger.info(`${LOG} Subscription created`, {
                razorpaySubscriptionId: subscription.id,
                planId,
            });
            return subscription;
        } catch (error) {
            throw this.#toPaymentError(error, 'Unable to create Razorpay subscription');
        }
    }

    async updateSubscription(subscriptionId, { planId, quantity = 1 }) {
        try {
            const subscription = await this.client.subscriptions.update(subscriptionId, {
                plan_id: planId,
                quantity,
            });

            logger.info(`${LOG} Subscription updated`, { subscriptionId, planId });
            return subscription;
        } catch (error) {
            throw this.#toPaymentError(error, 'Unable to update Razorpay subscription');
        }
    }

    async cancelSubscription(subscriptionId, { cancelAtCycleEnd = true } = {}) {
        try {
            const subscription = await this.client.subscriptions.cancel(
                subscriptionId,
                Boolean(cancelAtCycleEnd),
            );

            logger.info(`${LOG} Subscription cancellation requested`, {
                subscriptionId,
                cancelAtCycleEnd,
            });
            return subscription;
        } catch (error) {
            throw this.#toPaymentError(error, 'Unable to cancel Razorpay subscription');
        }
    }

    async fetchSubscription(subscriptionId) {
        try {
            return this.client.subscriptions.fetch(subscriptionId);
        } catch (error) {
            throw this.#toPaymentError(error, 'Unable to fetch Razorpay subscription');
        }
    }

    async fetchPlans(options = { count: 1 }) {
        try {
            return this.client.plans.all(options);
        } catch (error) {
            throw this.#toPaymentError(error, 'Unable to fetch Razorpay plans');
        }
    }

    verifyWebhook(headers, rawBody) {
        const signature = headers[RAZORPAY_WEBHOOK_SIGNATURE_HEADER]
            || headers['X-Razorpay-Signature'];
        if (!signature) {
            logger.warn(`${LOG} Missing webhook signature`);
            return false;
        }

        const bodyBuffer = Buffer.isBuffer(rawBody)
            ? rawBody
            : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {}));
        const expected = crypto
            .createHmac('sha256', config.razorpay.webhookSecret)
            .update(bodyBuffer)
            .digest('hex');

        const receivedBuffer = Buffer.from(String(signature), 'hex');
        const expectedBuffer = Buffer.from(expected, 'hex');
        return receivedBuffer.length === expectedBuffer.length
            && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
    }

    #toPaymentError(error, fallbackMessage) {
        const providerError = error?.error || {};
        logger.error(`${LOG} Gateway error`, {
            code: providerError.code || null,
            description: providerError.description || error.message,
        });

        return new PaymentError(
            providerError.description || error.message || fallbackMessage,
            providerError.code || null,
            providerError.description || null,
        );
    }
}

export default new RazorpaySubscriptionAdapter();
