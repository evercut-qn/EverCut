import crypto from 'crypto';

import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import { PaymentError } from '../../utils/api-error.js';
import { PaymentGatewayAdapter } from '../payment-gateway.adapter.js';
import { ZOHO_ENDPOINTS, toInternalState } from './zoho.constants.js';
import tokenManager from './zoho-token.manager.js';

const safeReadJson = async (response) => {
    try {
        return await response.json();
    } catch {
        return null;
    }
};

// Zoho wraps every resource in an envelope, e.g. { code, message, payments_session: {...} }.
// This pulls the actual resource out regardless of the wrapper key used.
const unwrap = (data) => {
    if (!data || typeof data !== 'object') return {};
    const { code, message, ...rest } = data;
    const keys = Object.keys(rest);
    if (keys.length === 1) return rest[keys[0]] || {};
    return data;
};

const paisaToRupeesString = (paisa) => (Math.round(Number(paisa) || 0) / 100).toFixed(2);
const rupeesToPaisa = (rupees) => Math.round(Number(rupees || 0) * 100);

// Zoho payment sessions accept a 5-15 minute lifetime only.
const clampExpiresIn = (seconds) => Math.min(900, Math.max(300, Number(seconds) || 900));

class ZohoAdapter extends PaymentGatewayAdapter {
    constructor() {
        super();
        this._baseUrl = config.zoho.baseUrl;
    }

    getGatewayName() {
        return 'zoho';
    }

    /**
     * Creates a Zoho Payments hosted-checkout session.
     * Mirrors the old PhonePe adapter's createOrder() return contract
     * ({ orderId, token, state, expiresAt }) so payment.service.js only
     * needs to swap the import, not its logic. `token` here is Zoho's
     * `access_key`, used by the serializer to build the redirect URL:
     *   https://payments.zoho.in/hostedcheckout/<access_key>  (production)
     *   https://paymentssandbox.zoho.in/hostedcheckout/<access_key>  (sandbox)
     */
    async createOrder({ merchantOrderId, amount, metadata, paymentModeConfig = null }) {
        if (merchantOrderId.length > 50) {
            throw new PaymentError(`merchantOrderId exceeds Zoho's 50 character limit: ${merchantOrderId}`);
        }

        const requestBody = {
            amount: Number(paisaToRupeesString(amount)),
            currency: 'INR',
            expires_in: clampExpiresIn(config.payment.sessionExpirySeconds),
            description: 'Evercut booking payment',
            reference_number: merchantOrderId,
            invoice_number: merchantOrderId,
            configurations: {
                hosted_page_parameters: {
                    description: 'Evercut booking payment',
                    success_url: config.zoho.successUrl,
                    failure_url: config.zoho.failureUrl,
                },
            },
        };

        if (paymentModeConfig && paymentModeConfig.length > 0) {
            requestBody.configurations.allowed_payment_methods = paymentModeConfig;
        }

        if (metadata) {
            const metaEntries = Object.entries(metadata).slice(0, 5);
            if (metaEntries.length > 0) {
                requestBody.meta_data = metaEntries.map(([key, value]) => ({
                    key: String(key).slice(0, 20),
                    value: String(value ?? '').slice(0, 500),
                }));
            }
        }

        const data = await this._makeRequest('POST', ZOHO_ENDPOINTS.CREATE_PAYMENT_SESSION, requestBody);
        const session = unwrap(data);

        if (!session.access_key || !session.payments_session_id) {
            throw new PaymentError('Zoho payment session did not return an access_key/payments_session_id');
        }

        logger.info('[ZohoAdapter] Payment session created', {
            merchantOrderId,
            gatewayOrderId: session.payments_session_id,
        });

        return {
            orderId: session.payments_session_id,
            token: session.access_key,
            state: 'PENDING',
            expiresAt: session.expiry_time ? Number(session.expiry_time) * 1000 : null,
        };
    }

    /**
     * gatewayOrderId here MUST be the Zoho payments_session_id (stored as
     * payment.gatewayOrderId in our DB), not the merchantOrderId. Unlike
     * PhonePe, Zoho does not let the merchant choose the session ID, so
     * status lookups can only be done by Zoho's own session ID.
     */
    async getOrderStatus(gatewayOrderId) {
        const data = await this._makeRequest('GET', ZOHO_ENDPOINTS.GET_PAYMENT_SESSION(gatewayOrderId));
        const session = unwrap(data);

        const payments = Array.isArray(session.payments) ? session.payments : [];
        const primaryPayment = payments.find((payment) => payment.status === 'succeeded')
            || payments[payments.length - 1]
            || null;

        let paymentDetails = [];
        let errorCode = null;
        let detailedErrorCode = null;

        // Fetch full payment details (payment method, failure reason) only
        // once we know which attempt matters - avoids an extra API call for
        // sessions that are still pending with no attempts yet.
        if (primaryPayment?.payment_id) {
            try {
                const fullPayment = await this._getPaymentDetails(primaryPayment.payment_id);
                paymentDetails = [{
                    transactionId: fullPayment.payment_id || primaryPayment.payment_id,
                    paymentMode: fullPayment.payment_method?.type || null,
                    state: toInternalState(fullPayment.status || primaryPayment.status),
                    instrument: fullPayment.payment_method || null,
                    rail: null,
                }];
                errorCode = fullPayment.failure_code || null;
                detailedErrorCode = fullPayment.failure_category || null;
            } catch (error) {
                logger.warn('[ZohoAdapter] Could not fetch full payment details, using session summary', {
                    paymentId: primaryPayment.payment_id,
                    error: error.message,
                });
                paymentDetails = [{
                    transactionId: primaryPayment.payment_id,
                    paymentMode: null,
                    state: toInternalState(primaryPayment.status),
                    instrument: null,
                    rail: null,
                }];
            }
        }

        const sessionState = session.status
            ? toInternalState(session.status)
            : (primaryPayment ? toInternalState(primaryPayment.status) : 'PENDING');

        return {
            orderId: session.payments_session_id || gatewayOrderId,
            state: sessionState,
            amount: session.amount ? rupeesToPaisa(session.amount) : null,
            expiresAt: session.expiry_time ? Number(session.expiry_time) * 1000 : null,
            paymentDetails,
            errorCode,
            detailedErrorCode,
            errorContext: null,
            metaInfo: session.meta_data || null,
        };
    }

    async _getPaymentDetails(paymentId) {
        const data = await this._makeRequest('GET', ZOHO_ENDPOINTS.GET_PAYMENT(paymentId));
        return unwrap(data);
    }

    /**
     * paymentId MUST be Zoho's actual payment_id (stored as
     * payment.gatewayTransactionId in our DB once the payment completes),
     * not merchantOrderId/merchantRefundId. Zoho generates its own
     * refund_id server-side - merchantRefundId is only kept in meta_data
     * for our own reconciliation, it is not a lookup key on Zoho's side.
     */
    async initiateRefund({ merchantRefundId, paymentId, amount, reason }) {
        if (!paymentId) {
            throw new PaymentError('Cannot initiate a Zoho refund without a payment_id');
        }

        const data = await this._makeRequest(
            'POST',
            ZOHO_ENDPOINTS.CREATE_REFUND(paymentId),
            {
                amount: Number(paisaToRupeesString(amount)),
                reason: 'requested_by_customer',
                type: 'initiated_by_merchant',
                description: reason ? String(reason).slice(0, 500) : 'Booking cancellation refund',
                meta_data: [{ key: 'merchant_refund_id', value: String(merchantRefundId).slice(0, 500) }],
            },
        );
        const refund = unwrap(data);

        logger.info('[ZohoAdapter] Refund initiated', {
            merchantRefundId,
            paymentId,
            refundId: refund.refund_id,
            state: refund.status,
        });

        return {
            refundId: refund.refund_id,
            state: toInternalState(refund.status),
            amount: refund.amount ? rupeesToPaisa(refund.amount) : amount,
        };
    }

    async getRefundStatus(refundId) {
        const data = await this._makeRequest('GET', ZOHO_ENDPOINTS.GET_REFUND(refundId));
        const refund = unwrap(data);

        return {
            paymentId: refund.payment_id || null,
            refundId: refund.refund_id || refundId,
            state: toInternalState(refund.status),
            amount: refund.amount ? rupeesToPaisa(refund.amount) : null,
            timestamp: refund.date || null,
            errorCode: refund.failure_reason || null,
            detailedErrorCode: null,
        };
    }

    /**
     * Verifies the X-Zoho-Webhook-Signature header:
     *   t=<epoch_ms>,v=<hex hmac-sha256 of `${t}.${rawBody}`>
     * rawBody MUST be the exact bytes Zoho sent (see
     * server/src/config/webhook.config.js - the /payments/webhook route
     * needs to be added to RAW_JSON_WEBHOOK_ROUTES for this to work).
     */
    verifyWebhook(headers, rawBody) {
        const headerValue = headers['x-zoho-webhook-signature'] || headers['X-Zoho-Webhook-Signature'];
        if (!headerValue || !rawBody) {
            logger.warn('[ZohoAdapter] Missing signature header or raw body on webhook');
            return false;
        }

        const parts = Object.fromEntries(
            String(headerValue).split(',').map((part) => part.split('=').map((s) => s.trim())),
        );
        const timestamp = parts.t;
        const receivedSignature = parts.v;

        if (!timestamp || !receivedSignature) {
            logger.warn('[ZohoAdapter] Malformed webhook signature header');
            return false;
        }

        const ageSeconds = (Date.now() - Number(timestamp)) / 1000;
        if (!Number.isFinite(ageSeconds) || ageSeconds > config.zoho.webhookTimestampToleranceSec || ageSeconds < -60) {
            logger.warn('[ZohoAdapter] Webhook timestamp outside tolerance window', { ageSeconds });
            return false;
        }

        const message = `${timestamp}.${rawBody}`;
        const expectedSignature = crypto
            .createHmac('sha256', config.zoho.webhookSigningKey)
            .update(message)
            .digest('hex');

        try {
            return crypto.timingSafeEqual(
                Buffer.from(receivedSignature),
                Buffer.from(expectedSignature),
            );
        } catch {
            return false;
        }
    }

    parseWebhookPayload(body = {}) {
        const event = body.event_type || null;
        const eventObject = body.event_object || {};

        if (eventObject.refund) {
            const refund = eventObject.refund;
            const metaRefundId = Array.isArray(refund.meta_data)
                ? refund.meta_data.find((entry) => entry.key === 'merchant_refund_id')?.value
                : null;

            return {
                event,
                merchantOrderId: null,
                originalMerchantOrderId: null,
                gatewayOrderId: null,
                gatewayPaymentId: refund.payment_id || null,
                merchantRefundId: metaRefundId || null,
                refundId: refund.refund_id || null,
                state: toInternalState(refund.status),
                amount: refund.amount ? rupeesToPaisa(refund.amount) : null,
                orderId: null,
                paymentDetails: [],
                paymentMode: null,
                transactionId: refund.payment_id || null,
                errorCode: refund.failure_reason || null,
                detailedErrorCode: null,
                errorContext: null,
            };
        }

        const payment = eventObject.payment || {};

        return {
            event,
            merchantOrderId: payment.reference_number || payment.invoice_number || null,
            originalMerchantOrderId: payment.reference_number || payment.invoice_number || null,
            gatewayOrderId: null, // Zoho does not include payments_session_id on payment webhooks.
            gatewayPaymentId: payment.payment_id || null,
            merchantRefundId: null,
            refundId: null,
            state: toInternalState(payment.status),
            amount: payment.amount ? rupeesToPaisa(payment.amount) : null,
            orderId: null,
            paymentDetails: [{
                transactionId: payment.payment_id || null,
                paymentMode: payment.payment_method?.type || null,
                state: toInternalState(payment.status),
                instrument: payment.payment_method || null,
                rail: null,
            }],
            paymentMode: payment.payment_method?.type || null,
            transactionId: payment.payment_id || null,
            errorCode: payment.failure_code || null,
            detailedErrorCode: payment.failure_category || null,
            errorContext: null,
        };
    }

    async _makeRequest(method, endpoint, body = null, retried = false) {
        const token = await tokenManager.getToken();
        const url = new URL(`${this._baseUrl}${endpoint}`);
        url.searchParams.set('account_id', config.zoho.accountId);

        const response = await fetch(url.toString(), {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Zoho-oauthtoken ${token}`,
            },
            body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
        });

        if (response.status === 401 && !retried) {
            logger.warn('[ZohoAdapter] Access token expired, forcing refresh');
            await tokenManager.forceRefresh();
            return this._makeRequest(method, endpoint, body, true);
        }

        const data = await safeReadJson(response);

        if (!response.ok || (data && typeof data.code === 'number' && data.code !== 0)) {
            logger.error('[ZohoAdapter] API request failed', {
                method,
                endpoint,
                status: response.status,
                code: data?.code ?? null,
                message: data?.message || response.statusText,
            });

            throw new PaymentError(
                data?.message || `Zoho API error: ${response.status}`,
                data?.code ?? null,
                data?.message || response.statusText,
            );
        }

        return data || {};
    }
}

const zohoAdapter = new ZohoAdapter();
export default zohoAdapter;
