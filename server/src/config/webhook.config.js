export const WEBHOOK_ROUTE_SUFFIXES = Object.freeze({
    PAYMENTS: '/payments/webhook',
    PAYOUTS: '/payouts/webhook',
    SUBSCRIPTIONS: '/subscriptions/webhook',
});

export const RAW_JSON_WEBHOOK_ROUTES = Object.freeze([
    {
        suffix: WEBHOOK_ROUTE_SUFFIXES.PAYOUTS,
        rawBodyFormat: 'string',
    },
    {
        suffix: WEBHOOK_ROUTE_SUFFIXES.SUBSCRIPTIONS,
        rawBodyFormat: 'buffer',
    },
]);
