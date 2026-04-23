import crypto from 'crypto';

import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import { PaymentError } from '../../utils/api-error.js';
import { PaymentGatewayAdapter } from '../payment-gateway.adapter.js';
import { PHONEPE_ENDPOINTS } from './phonepe.constants.js';
import tokenManager from './phonepe-token.manager.js';

const safeReadJson = async (response) => {
    try {
        return await response.json();
    } catch {
        return null;
    }
};

class PhonePeAdapter extends PaymentGatewayAdapter {
    constructor() {
        super();
        this._baseUrl = config.phonepe.baseUrl;
    }

    getGatewayName() {
        return 'phonepe';
    }

    async createOrder({ merchantOrderId, amount, redirectUrl, message, metadata }) {
        const requestBody = {
            merchantOrderId,
            amount,
            expireAfter: config.payment.sessionExpirySeconds,
            paymentFlow: {
                type: 'PG_CHECKOUT',
                message: message || 'Payment for EverCut salon booking',
                merchantUrls: {
                    redirectUrl,
                },
            },
        };

        if (metadata) {
            const metaEntries = Object.entries(metadata).slice(0, 15);
            if (metaEntries.length > 0) {
                requestBody.metaInfo = Object.fromEntries(
                    metaEntries.map(([key, value], index) => [`udf${index + 1}`, String(value ?? key)]),
                );
            }
        }

        const data = await this._makeRequest('POST', PHONEPE_ENDPOINTS.CREATE_PAYMENT, requestBody);

        logger.info('[PhonePeAdapter] Order created', {
            merchantOrderId,
            gatewayOrderId: data.orderId,
            state: data.state,
        });

        return {
            orderId: data.orderId,
            redirectUrl: data.redirectUrl,
            state: data.state,
            expiresAt: data.expireAt || data.expire_at || null,
        };
    }

    async getOrderStatus(merchantOrderId) {
        const endpoint = `${PHONEPE_ENDPOINTS.ORDER_STATUS(merchantOrderId)}?details=true`;
        const data = await this._makeRequest('GET', endpoint);

        return {
            orderId: data.orderId,
            state: data.state,
            amount: data.amount,
            expiresAt: data.expireAt || data.expire_at || null,
            paymentDetails: data.paymentDetails || [],
            errorCode: data.errorCode || data.errorContext?.errorCode || null,
            detailedErrorCode: data.detailedErrorCode || data.errorContext?.detailedErrorCode || null,
            errorContext: data.errorContext || null,
            metaInfo: data.metaInfo || null,
        };
    }

    async initiateRefund({ merchantRefundId, originalMerchantOrderId, amount }) {
        const data = await this._makeRequest(
            'POST',
            PHONEPE_ENDPOINTS.INITIATE_REFUND,
            {
                merchantRefundId,
                originalMerchantOrderId,
                amount,
            },
        );

        logger.info('[PhonePeAdapter] Refund initiated', {
            merchantRefundId,
            refundId: data.refundId,
            state: data.state,
        });

        return {
            refundId: data.refundId,
            state: data.state,
            amount: data.amount,
        };
    }

    async getRefundStatus(merchantRefundId) {
        const data = await this._makeRequest(
            'GET',
            PHONEPE_ENDPOINTS.REFUND_STATUS(merchantRefundId),
        );

        return {
            originalMerchantOrderId: data.originalMerchantOrderId,
            refundId: data.refundId,
            state: data.state,
            amount: data.amount,
            timestamp: data.timestamp,
            errorCode: data.errorCode || null,
            detailedErrorCode: data.detailedErrorCode || null,
        };
    }

    verifyWebhook(headers) {
        const receivedAuth = headers.authorization || headers.Authorization;
        if (!receivedAuth) {
            logger.warn('[PhonePeAdapter] Missing Authorization header on webhook');
            return false;
        }

        const expectedAuth = crypto
            .createHash('sha256')
            .update(`${config.phonepe.webhookUsername}:${config.phonepe.webhookPassword}`)
            .digest('hex');

        try {
            return crypto.timingSafeEqual(
                Buffer.from(String(receivedAuth)),
                Buffer.from(expectedAuth),
            );
        } catch {
            return false;
        }
    }

    parseWebhookPayload(body = {}) {
        const event = body.event || null;
        const payload = body.payload || {};
        const firstPayment = payload.paymentDetails?.[0] || null;

        return {
            event,
            merchantOrderId: payload.merchantOrderId || payload.originalMerchantOrderId || null,
            originalMerchantOrderId: payload.originalMerchantOrderId || payload.merchantOrderId || null,
            merchantRefundId: payload.merchantRefundId || null,
            refundId: payload.refundId || null,
            state: payload.state || firstPayment?.state || null,
            amount: payload.amount || firstPayment?.amount || null,
            orderId: payload.orderId || null,
            paymentDetails: payload.paymentDetails || [],
            paymentMode: firstPayment?.paymentMode || null,
            transactionId: firstPayment?.transactionId || null,
            errorCode: firstPayment?.errorCode || payload.errorCode || payload.errorContext?.errorCode || null,
            detailedErrorCode: firstPayment?.detailedErrorCode || payload.detailedErrorCode || payload.errorContext?.detailedErrorCode || null,
            errorContext: payload.errorContext || null,
        };
    }

    async _makeRequest(method, endpoint, body = null, retried = false) {
        const token = await tokenManager.getToken();
        const url = `${this._baseUrl}${endpoint}`;

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `O-Bearer ${token}`,
            },
            body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
        });

        if (response.status === 401 && !retried) {
            logger.warn('[PhonePeAdapter] Access token expired, forcing refresh');
            await tokenManager.forceRefresh();
            return this._makeRequest(method, endpoint, body, true);
        }

        const data = await safeReadJson(response);

        if (!response.ok) {
            logger.error('[PhonePeAdapter] API request failed', {
                method,
                endpoint,
                status: response.status,
                code: data?.code || null,
                message: data?.message || response.statusText,
            });

            throw new PaymentError(
                data?.message || `PhonePe API error: ${response.status}`,
                data?.code || null,
                data?.message || response.statusText,
            );
        }

        return data || {};
    }
}

const phonePeAdapter = new PhonePeAdapter();
export default phonePeAdapter;
