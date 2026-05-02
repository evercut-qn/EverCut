# Old Payment Method Archive (Web Redirect Flow)

> **⚠️ HISTORICAL REFERENCE ONLY**  
> **Status:** Deprecated  
> **Replaced By:** Native PhonePe Flutter SDK Flow  
> **Date Archived:** April 29, 2026

---

## Overview

This directory contains historical documentation for the **web redirect/payment-link payment flow** that was used before migrating to the native PhonePe Flutter SDK integration.

**This flow is NO LONGER ACTIVE in production.**

---

## What Changed

### Old Flow (Archived Here)
1. Backend called PhonePe `/checkout/v2/pay` endpoint
2. Backend received `redirectUrl` from PhonePe
3. Flutter opened `redirectUrl` in WebView or external browser
4. Customer completed payment on PhonePe web page
5. PhonePe redirected back to app via deep link
6. Backend verified payment via webhook + polling

### New Flow (Current Production)
1. Backend calls PhonePe `/checkout/v2/sdk/order` endpoint
2. Backend receives `orderId`, `token`, `merchantId` (NO `redirectUrl`)
3. Flutter launches native PhonePe SDK with these credentials
4. Customer completes payment in native PhonePe app (UPI/Card/etc.)
5. SDK returns callback to Flutter (informational only)
6. Flutter calls backend `POST /api/v1/payments/:paymentId/verify`
7. Backend verifies payment via PhonePe Order Status API
8. Webhook provides production reliability backup

---

## Why the Migration?

| Aspect | Old (Web Redirect) | New (Native SDK) |
|--------|-------------------|------------------|
| **User Experience** | Leaves app, web page load | Stays in app, native UPI |
| **Payment Success Rate** | Lower (web friction) | Higher (seamless UPI) |
| **Security** | Browser-based | Native app-to-app |
| **Speed** | Slower (page load) | Faster (direct UPI) |
| **Mobile Optimization** | Generic web page | Mobile-first native |

---

## Archived Documentation

The following documents describe the old web redirect flow:

1. **PAYMENT-GATEWAY-IMPLEMENTATION-GUIDE.md** (archived version)
   - Describes `/checkout/v2/pay` endpoint
   - Shows `redirectUrl` handling
   - WebView integration patterns

2. **PAYMENT-GATEWAY-RESEARCH-GUIDE.md** (archived version)
   - PhonePe Standard Checkout research
   - Web redirect architecture
   - Browser-based payment flow

---

## Current Documentation

For the **active native SDK flow**, see:

- **[../../../flows/BACKEND-TESTING-COMPLETE-FLOW.md](../../../flows/BACKEND-TESTING-COMPLETE-FLOW.md)** - Testing native SDK payments (complete flow)
- **[../../bookings/BOOKING-SYSTEM-GUIDE.md](../../bookings/BOOKING-SYSTEM-GUIDE.md)** - Complete booking + payment flow
- **[../../../flows/FLUTTER-BOOKING-PAYMENT-FLOW.md](../../../flows/FLUTTER-BOOKING-PAYMENT-FLOW.md)** - Flutter SDK implementation
- **[../../../research/PHONEPE-PG-FLUTTER-NODEJS.md](../../../research/PHONEPE-PG-FLUTTER-NODEJS.md)** - Native SDK source of truth

---

## Key Differences in API Contracts

### Old Endpoint (Archived)
```http
POST /checkout/v2/pay
Authorization: O-Bearer <token>

{
  "merchantOrderId": "...",
  "amount": 1000,
  "paymentFlow": {
    "type": "PG_CHECKOUT",
    "merchantUrls": {
      "redirectUrl": "https://api.evercut.in/api/v1/payments/redirect"
    }
  }
}

Response:
{
  "orderId": "OMO...",
  "redirectUrl": "https://mercury.phonepe.com/...",
  "state": "PENDING"
}
```

### New Endpoint (Current)
```http
POST /checkout/v2/sdk/order
Authorization: O-Bearer <token>

{
  "merchantOrderId": "...",
  "amount": 1000,
  "paymentFlow": {
    "type": "PG_CHECKOUT"
  }
}

Response:
{
  "orderId": "OMO...",
  "token": "eyJhbGci...",
  "state": "PENDING",
  "expireAt": 1234567890
}
```

**Critical:** The new flow does NOT return `redirectUrl`. Instead, it returns a `token` that Flutter passes to the PhonePe SDK.

---

## Environment Variables (Old vs New)

### Removed (Old Flow)
```env
PAYMENT_REDIRECT_BASE_URL=https://api.evercut.in/api/v1/payments/redirect
```

This variable is **no longer used** because there is no web redirect in the native SDK flow.

### Still Required (Both Flows)
```env
PHONEPE_CLIENT_ID=...
PHONEPE_CLIENT_SECRET=...
PHONEPE_CLIENT_VERSION=1
PHONEPE_MERCHANT_ID=...
PHONEPE_WEBHOOK_USERNAME=...
PHONEPE_WEBHOOK_PASSWORD=...
```

---

## Migration Notes

If you need to reference the old flow for:
- **Historical context** - Understanding why certain decisions were made
- **Rollback planning** - Emergency fallback (not recommended)
- **Comparison** - Analyzing improvements from migration

Then consult the archived documents in this directory.

**For all new development, use the current native SDK documentation.**

---

## Questions?

If you have questions about:
- **Old flow** - Consult archived docs in this directory
- **New flow** - See current documentation links above
- **Migration** - See `docs/research/PHONEPE-PG-FLUTTER-NODEJS.md`

---

**Last Updated:** April 29, 2026  
**Archived By:** Documentation cleanup after native SDK migration
