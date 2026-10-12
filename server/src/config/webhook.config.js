// export const WEBHOOK_ROUTE_SUFFIXES = Object.freeze({
//     PAYMENTS: '/payments/webhook',
//     PAYOUTS: '/payouts/webhook',
//     SUBSCRIPTIONS: '/subscriptions/webhook',
// });

// export const RAW_JSON_WEBHOOK_ROUTES = Object.freeze([
//     {
//         suffix: WEBHOOK_ROUTE_SUFFIXES.PAYOUTS,
//         rawBodyFormat: 'string',
//     },
//     {
//         suffix: WEBHOOK_ROUTE_SUFFIXES.SUBSCRIPTIONS,
//         rawBodyFormat: 'buffer',
//     },
// ]);


export const WEBHOOK_ROUTE_SUFFIXES = Object.freeze({
    PAYMENTS: '/payments/webhook',
    PAYOUTS: '/payouts/webhook',
    SUBSCRIPTIONS: '/subscriptions/webhook',
});

export const RAW_JSON_WEBHOOK_ROUTES = Object.freeze([
    {
        // Zoho signs the exact raw request body (see zoho.adapter.js
        // verifyWebhook()), so the payments webhook needs the untouched
        // bytes just like payouts/subscriptions already do. PhonePe (the
        // previous gateway) verified via a Basic-Auth header instead and
        // never needed this - now that Zoho is the gateway, it does.
        suffix: WEBHOOK_ROUTE_SUFFIXES.PAYMENTS,
        rawBodyFormat: 'string',
    },
    {
        suffix: WEBHOOK_ROUTE_SUFFIXES.PAYOUTS,
        rawBodyFormat: 'string',
    },
    {
        suffix: WEBHOOK_ROUTE_SUFFIXES.SUBSCRIPTIONS,
        rawBodyFormat: 'buffer',
    },
]);
