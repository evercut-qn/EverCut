// Zoho Payments API endpoints, status enums, and webhook event names.
// Reference: https://www.zoho.com/in/payments/api/v1/introduction/
//            https://www.zoho.com/in/payments/developerdocs/web-integration/hosted-checkout/

export const ZOHO_ENDPOINTS = {
    // account_id is appended as a query param by the adapter on every call.
    CREATE_PAYMENT_SESSION: '/paymentsessions',
    GET_PAYMENT_SESSION: (paymentsSessionId) => `/paymentsessions/${paymentsSessionId}`,
    GET_PAYMENT: (paymentId) => `/payments/${paymentId}`,
    CREATE_REFUND: (paymentId) => `/payments/${paymentId}/refunds`,
    GET_REFUND: (refundId) => `/refunds/${refundId}`,
};

// Status values returned by the Payment Session / Payment resources.
export const ZOHO_SESSION_STATES = {
    CREATED: 'created',
    IN_PROGRESS: 'in_progress',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
};

export const ZOHO_PAYMENT_STATES = {
    INITIATED: 'initiated',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
    CANCELED: 'canceled',
    INCOMPLETE: 'incomplete',
    REFUNDED: 'refunded',
    PARTIALLY_REFUNDED: 'partially_refunded',
    BLOCKED: 'blocked',
    DISPUTED: 'disputed',
};

export const ZOHO_REFUND_STATES = {
    INITIATED: 'initiated',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
    CANCELED: 'canceled',
    PENDING: 'pending',
};

// Webhook event_type values. Configure these in
// Zoho Payments > Settings > Developer Space > Webhooks.
export const ZOHO_WEBHOOK_EVENTS = Object.freeze({
    PAYMENT_SUCCEEDED: 'payment.succeeded',
    PAYMENT_FAILED: 'payment.failed',
    PAYMENT_PENDING: 'payment.pending',
    REFUND_SUCCEEDED: 'refund.succeeded',
    REFUND_FAILED: 'refund.failed',
});

// Internal normalized states used throughout payment.service.js.
// These map 1:1 with the values the old PhonePe adapter used to return,
// so the rest of the codebase (which checks for 'COMPLETED' / 'FAILED')
// does not need to change.
export const ZOHO_TO_INTERNAL_STATE = {
    [ZOHO_SESSION_STATES.SUCCEEDED]: 'COMPLETED',
    [ZOHO_PAYMENT_STATES.SUCCEEDED]: 'COMPLETED',
    [ZOHO_SESSION_STATES.FAILED]: 'FAILED',
    [ZOHO_PAYMENT_STATES.FAILED]: 'FAILED',
    [ZOHO_PAYMENT_STATES.CANCELED]: 'FAILED',
    [ZOHO_PAYMENT_STATES.BLOCKED]: 'FAILED',
    [ZOHO_SESSION_STATES.CREATED]: 'PENDING',
    [ZOHO_SESSION_STATES.IN_PROGRESS]: 'PENDING',
    [ZOHO_PAYMENT_STATES.INITIATED]: 'PENDING',
    [ZOHO_PAYMENT_STATES.INCOMPLETE]: 'PENDING',
};

export const toInternalState = (zohoState) => ZOHO_TO_INTERNAL_STATE[zohoState] || 'PENDING';
