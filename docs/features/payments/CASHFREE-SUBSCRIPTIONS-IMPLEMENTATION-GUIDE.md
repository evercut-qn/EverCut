# Cashfree Subscriptions – Complete Engineering Guide
**API Version:** v5 / `2025-01-01`
**Stack Target:** Node.js + Express + MongoDB
**Scope:** Production-grade, implementation-ready reference

---

## Table of Contents
1. [Core Concepts](#1-core-concepts)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [API Flows (Detailed)](#3-api-flows-detailed)
4. [Webhook System](#4-webhook-system)
5. [End-to-End Flows](#5-end-to-end-flows)
6. [Database Design (MongoDB)](#6-database-design-mongodb)
7. [Failure & Edge Cases](#7-failure--edge-cases)
8. [Optimization Strategies](#8-optimization-strategies)
9. [Implementation Blueprint](#9-implementation-blueprint)
10. [Assumptions](#10-assumptions)
11. [Validation Checklist](#11-validation-checklist)

---

## 1. Core Concepts

### 1.1 What Is a Mandate

A mandate is a **pre-authorized debit agreement** between merchant and customer, stored at the bank/NPCI level. It gives the merchant the right to debit funds from the customer's account — either at a fixed frequency or on demand — up to a defined maximum amount, without requiring per-transaction customer authentication.

Mandates are **not Cashfree-internal constructs**. They are registered with:
- **NPCI** (for UPI AutoPay)
- **Destination bank via NACH rails** (for eNACH, Physical NACH)
- **Card network / issuing bank** (for Standing Instructions)

Cashfree acts as the **Payment Aggregator** that facilitates mandate creation and executes debits on your behalf.

---

### 1.2 Mandate Types — Limits, Constraints, Auth

| Method | Auth Type | Max Amount | Auth Fee | Retry Support | Processing Days |
|---|---|---|---|---|---|
| **UPI AutoPay** | UPI PIN (for >₹15K) | ₹15,000 (no AFA) / ₹1,00,000 (with AFA) | Small auth amount (refundable) | ✅ 1+3 hourly | Same day (non-peak hours only) |
| **eNACH** | Net Banking / Debit Card / Aadhaar | ₹1,00,00,000 | ₹0 (zero auth charge) | ❌ No auto-retry | T+1 |
| **Card SI (Indian)** | OTP / 2FA at setup | ₹15,000 (no AFA) / ₹1,00,00,000 (with AFA) | Small auth amount | ❌ No auto-retry | T+1 |
| **Card SI (International)** | Card network auth | ₹1,00,00,000 | Small auth amount | ❌ No auto-retry | T or T+1 |
| **Physical NACH** | Signature only | ₹1,00,00,000 | ₹0 | ❌ No auto-retry | 5–10 working days |

**AFA (Additional Factor Authentication):** For UPI debits > ₹15,000, the customer must enter their UPI PIN within 30 minutes of receiving the debit notification. For card SI, customer must complete OTP before 7:00 AM on the scheduled charge date.

**UPI Processing Window (NPCI Circular, effective August 1, 2025):**
UPI AutoPay transactions are processed **only during non-peak hours**:
- Before 10:00 AM
- Between 1:00 PM – 5:00 PM
- After 9:30 PM

Charges raised outside these windows for `T+1` scheduling are queued; charges for `null` (same-day) outside the window are rejected.

**eNACH Eligibility Constraint:**
Per NACH guidelines, eNACH is permitted **only for individual accounts** (savings or current with single registered signatory). Corporate current accounts with multiple signatories must use **physical NACH**.

---

### 1.3 Subscription Types

#### Periodic Subscription
- Fixed amount, fixed frequency.
- Frequencies: `DAY`, `WEEK`, `MONTH`, `YEAR`.
- Cashfree **automatically initiates** charges at each billing interval for periodic subscriptions.
- Use case: Monthly flat-rate plans (e.g., EverCut ₹499/month).

#### On-Demand Subscription
- Variable amount, any time.
- Mandate sets a **maximum amount ceiling** — you charge up to that on any schedule.
- You must **manually call the Raise Payment API** for each charge.
- Use case: Usage-based billing (e.g., per-service haircut credits consumed).

---

### 1.4 Plans vs. Subscriptions

| Concept | Purpose |
|---|---|
| **Plan** | Reusable template — defines billing frequency, amount, max cycles, name. Optional. |
| **Subscription (Mandate)** | A customer-to-plan relationship. Always required. Can be created without a plan (inline details). |

---

### 1.5 Subscription Lifecycle States

```
INITIALIZED (created, awaiting customer auth)
    │
    ├──► BANK_APPROVAL_PENDING (eNACH: sent to bank, waiting registration)
    │         └──► ACTIVE (bank approved)
    │
    ├──► ACTIVE (UPI/Card: customer authorized immediately)
    │         ├──► CUSTOMER_PAUSED
    │         │         └──► ACTIVE (resumed)
    │         ├──► ON_HOLD (merchant-initiated hold)
    │         ├──► COMPLETED (max debits or expiry reached)
    │         ├──► CUSTOMER_CANCELLED
    │         ├──► CANCELLED (merchant-initiated)
    │         └──► CARD_EXPIRED
    │
    ├──► LINK_EXPIRED (customer did not authorize within expiry window)
    └──► EXPIRED (subscription reached end date)
```

**Terminal states:** `COMPLETED`, `CANCELLED`, `CUSTOMER_CANCELLED`, `EXPIRED`, `LINK_EXPIRED`
**Recoverable states:** `CUSTOMER_PAUSED`, `ON_HOLD`

---

### 1.6 Payment (Charge) Lifecycle States

```
INITIALIZED → PENDING → SUCCESS
                      └──► FAILED
                      └──► CANCELLED (on-demand only)
```

---

## 2. System Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                     EverCut Backend                           │
│                                                               │
│  ┌──────────────┐   ┌──────────────────┐   ┌───────────────┐  │
│  │  HTTP Layer  │   │  Service Layer   │   │ Payment Layer │  │
│  │  (Express    │──►│  (Business       │──►│ (Cashfree     │  │
│  │   Routes)    │   │   Logic)         │   │  API Client)  │  │
│  └──────────────┘   └──────────────────┘   └───────┬───────┘  │
│                                                    │          │
│  ┌──────────────────────────────────────────────┐  │          │
│  │              Webhook Handler                 │◄─┤          │
│  │  (Signature verify → Event router →          │  │          │
│  │   Idempotency check → DB write → Queue)      │  │          │
│  └──────────────────────────────────────────────┘  │          │
│                                                    │          │
│  ┌──────────────────────────────────────────────┐  │          │
│  │              Job Queue (Bull + Redis)        │  │          │
│  │  - Retry scheduler                           │  │          │
│  │  - Pre-debit notification sender             │  │          │
│  │  - Subscription status poller (fallback)     │  │          │
│  └──────────────────────────────────────────────┘  │          │
│                                                    │          │
│  ┌──────────────────────────────────────────────┐  │          │
│  │              MongoDB                         │  │          │
│  │  plans | subscriptions | payments |          │  │          │
│  │  webhook_logs | idempotency_keys             │  │          │
│  └──────────────────────────────────────────────┘  │          │
└───────────────────────────────────────────────────────────────┘
              │                         │
              ▼                         ▼
    Cashfree Production API     Notification Service
    api.cashfree.com/pg         (SMS / Email / Push)
```

### API Client Singleton

```javascript
// lib/cashfree.js
const axios = require('axios');

const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const cashfreeClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-client-id': process.env.CASHFREE_APP_ID,
    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
    'x-api-version': '2025-01-01',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Retry on 5xx with exponential backoff
cashfreeClient.interceptors.response.use(null, async (error) => {
  const { config, response } = error;
  if (response?.status >= 500 && !config.__retried) {
    config.__retried = true;
    await new Promise(r => setTimeout(r, 2000));
    return cashfreeClient(config);
  }
  throw error;
});

module.exports = cashfreeClient;
```

---

## 3. API Flows (Detailed)

### 3.1 Base URLs

| Environment | Base URL |
|---|---|
| Sandbox | `https://sandbox.cashfree.com/pg` |
| Production | `https://api.cashfree.com/pg` |
| API Version Header | `x-api-version: 2025-01-01` |

### 3.2 Authentication Headers (All Requests)

```
x-client-id:     <CASHFREE_APP_ID>
x-client-secret: <CASHFREE_SECRET_KEY>
x-api-version:   2025-01-01
Content-Type:    application/json
```

---

### 3.3 Plan Management APIs

#### Create Plan
```
POST /subscriptions/plans
```

```javascript
// Request Body
{
  "plan_id": "EVERCUT_MONTHLY_V1",           // Your unique plan ID (immutable once created)
  "plan_name": "EverCut Monthly Pass",        // Visible to customer during mandate auth
  "plan_type": "PERIODIC",                    // PERIODIC | ON_DEMAND
  "plan_currency": "INR",
  "plan_recurring_amount": 499.00,            // Fixed debit amount per cycle (PERIODIC only)
  "plan_max_amount": 499.00,                  // Maximum mandate ceiling
  "plan_interval_type": "month",              // day | week | month | year
  "plan_intervals": 1,                        // Every 1 month
  "plan_max_cycles": 12,                      // null = unlimited (until expiry)
  "plan_note": "Monthly haircut subscription"
}
```

```javascript
// Response
{
  "plan_id": "EVERCUT_MONTHLY_V1",
  "plan_status": "ACTIVE",
  "cf_plan_id": "123456"                      // Cashfree internal ID — save this
}
```

**Important:** `plan_id` is immutable. You cannot update a plan once created. Create a new plan and migrate new subscribers to it.

#### Fetch Plan
```
GET /subscriptions/plans/{plan_id}
```

---

### 3.4 Subscription (Mandate) Creation API

```
POST /subscriptions
```

**This is the most critical API call.** It creates the mandate and returns the auth URL.

```javascript
// Request Body — Periodic subscription with existing plan
{
  "subscription_id": "SUB_usr123_1746000000000",   // Your unique ID. IDEMPOTENT KEY.
  "plan_id": "EVERCUT_MONTHLY_V1",                  // Omit if defining inline
  "customer_details": {
    "customer_name": "Rohan Sharma",
    "customer_email": "rohan@example.com",          // Required for notifications
    "customer_phone": "9876543210"                  // Required for notifications
  },
  "subscription_meta": {
    "return_url": "https://app.evercut.com/subscription/callback?sub_id=SUB_usr123_1746000000000",
    "notify_url": "https://api.evercut.com/webhooks/cashfree"  // Webhook override (optional)
  },
  "subscription_expiry_time": "2027-12-31T23:59:59+05:30",  // ISO 8601
  "subscription_first_charge_time": "2026-06-01T10:00:00+05:30",
  "authorization_amount": 1.00,                     // Auth charge (refundable for UPI/card)
  "authorization_amount_refund": true               // Auto-refund auth amount on activation
}
```

```javascript
// Request Body — On-demand subscription WITHOUT a plan (inline)
{
  "subscription_id": "SUB_usr456_1746000000001",
  "plan_type": "ON_DEMAND",
  "plan_name": "EverCut Flex Pack",
  "plan_currency": "INR",
  "plan_max_amount": 5000.00,                       // Customer can be charged up to this
  "customer_details": { ... },
  "subscription_meta": { "return_url": "..." },
  "subscription_expiry_time": "2027-12-31T23:59:59+05:30"
}
```

```javascript
// Response
{
  "cf_subscription_id": "23639356",
  "subscription_id": "SUB_usr123_1746000000000",
  "subscription_status": "INITIALIZED",
  "subscription_expiry_time": "2027-12-31T23:59:59+05:30",
  "authorization_link": "https://payments.cashfree.com/subscription?sub_token=xyz...",
  "authorization_link_expiry": "2026-05-10T10:00:00+05:30"
  // Redirect customer to authorization_link
}
```

**Idempotency:** `subscription_id` is your idempotency key. If you call Create Subscription with the same `subscription_id` again (e.g., on network timeout), Cashfree returns the existing subscription instead of creating a duplicate.

---

### 3.5 Authorization Flow

After `POST /subscriptions`, redirect the customer to `authorization_link`.

**UPI Flow:**
1. Customer lands on Cashfree-hosted checkout page.
2. Enters UPI ID (VPA) or scans QR.
3. UPI app receives collect request — customer enters UPI PIN (if debit > ₹15K).
4. NPCI registers the mandate.
5. Cashfree triggers `SUBSCRIPTION_STATUS_CHANGED` webhook → status: `ACTIVE`.
6. Customer is redirected to your `return_url`.

**eNACH Flow:**
1. Customer selects bank, authorizes via Net Banking / Debit Card / Aadhaar.
2. Mandate submitted to destination bank via NACH rails.
3. Status → `BANK_APPROVAL_PENDING` (can take hours to days).
4. Bank approves → `SUBSCRIPTION_STATUS_CHANGED` → `ACTIVE`.

**Card SI Flow:**
1. Customer enters card details.
2. Standing Instruction registered with card network.
3. Small auth amount charged (refunded if `authorization_amount_refund: true`).
4. On success → `SUBSCRIPTION_STATUS_CHANGED` → `ACTIVE`.

**Redirection Payload (POST to return_url):**
After authorization, Cashfree POSTs to your `return_url`:
```json
{
  "subscription_id": "SUB_usr123_1746000000000",
  "cf_subscription_id": "23639356",
  "subscription_status": "ACTIVE",
  "authorization_status": "SUCCESS",
  "authorization_reference": "6595231908096894505959"
}
```
**Do not trust this redirect payload for business logic.** Verify status via webhook or the Fetch Subscription API.

---

### 3.6 Charging a Subscription

#### Raise Payment (Manual / On-Demand)
```
POST /subscriptions/{subscription_id}/payments
```

```javascript
// Request
{
  "payment_id": "PAY_SUB_usr123_20260601",      // Your unique payment ID (idempotency key)
  "payment_amount": 499.00,
  "payment_remarks": "June 2026 - EverCut Monthly",
  "payment_schedule_date": "2026-06-01"         // ISO date (YYYY-MM-DD). null = immediate.
                                                // Max 14 days in future.
                                                // Cannot exceed T+14.
}
```

```javascript
// Response
{
  "payment_id": "PAY_SUB_usr123_20260601",
  "cf_payment_id": "98765",
  "payment_status": "INITIALIZED",
  "payment_schedule_date": "2026-06-01"
}
```

**Cut-off Timeline Rules** (Official Cashfree Docs):

| Raised at | Scheduled for | eNACH | UPI AutoPay | Card (Indian SI) | Card (Intl SI) |
|---|---|---|---|---|---|
| T 00:00–06:59 | null (immediate) | Raised on T | ❌ Not Allowed | ❌ Not Allowed | Raised on T |
| T 07:00–11:59 | null (immediate) | Raised on T+1 | ❌ Not Allowed | ❌ Not Allowed | Raised on T+1 |
| T 00:00–06:59 | T | Raised on T | ❌ Not Allowed | ❌ Not Allowed | Raised on T |
| T 07:00–11:59 | T | ❌ Not Allowed | ❌ Not Allowed | ❌ Not Allowed | ❌ Not Allowed |
| T 00:00–20:59 | T+1 | Raised on T+1 | Raised on T+1 | Raised on T+1 | Raised on T+1 |
| T 21:00–23:59 | T+1 | Raised on T+1 | ❌ Not Allowed | ❌ Not Allowed | Raised on T+1 |
| Any | T+2 to T+14 | ✅ | ✅ | ✅ | ✅ |
| Any | T+15+ | ❌ | ❌ | ❌ | ❌ |

**Practical Rule for EverCut:** Always schedule charges for `T+1` and raise them **before 9 PM on day T**. This covers all payment methods.

#### Periodic Subscription — Auto-charge
For `PERIODIC` subscriptions, Cashfree **automatically** raises payments at each billing interval. You do **not** need to call Raise Payment. You receive `SUBSCRIPTION_PAYMENT_NOTIFICATION_INITIATED` before the debit, then `SUBSCRIPTION_PAYMENT_SUCCESS` or `SUBSCRIPTION_PAYMENT_FAILED`.

---

### 3.7 UPI Retry Policy

**UPI AutoPay only — 1+3 retries at hourly intervals:**

```
Attempt 1 (scheduled time) → FAILED
    └── Retry 1 (+1 hour) → FAILED
         └── Retry 2 (+1 hour) → FAILED
              └── Retry 3 (+1 hour) → FAILED → SUBSCRIPTION_PAYMENT_FAILED webhook
```

**eNACH / Card SI:** **No automatic retries.** On failure, you must manually re-raise or implement your own retry via Raise Payment API.

---

### 3.8 Subscription Management APIs

#### Fetch Subscription
```
GET /subscriptions/{subscription_id}
```

Returns full subscription details including status, next schedule date, authorization details, plan details.

#### Manage Subscription (Pause / Resume / Cancel)
```
PATCH /subscriptions/{subscription_id}
```

```javascript
// Pause (merchant-initiated)
{ "subscription_status": "CANCELLED" }   // Permanent

// Customer pause
{ "subscription_status": "CUSTOMER_PAUSED" }

// Resume from pause
{ "subscription_status": "ACTIVE" }

// Cancel
{ "subscription_status": "CANCELLED" }
```

**Note:** `CANCELLED` is terminal — cannot be re-activated. Create a new subscription.

#### Manage Payment (Retry Failed Payment)
```
PATCH /subscriptions/{subscription_id}/payments/{payment_id}
```

```javascript
{ "payment_status": "RETRY" }  // Trigger a manual retry for eNACH/card failures
```

#### Fetch Payments for a Subscription
```
GET /subscriptions/{subscription_id}/payments
```

#### Create Refund
```
POST /subscriptions/{subscription_id}/payments/{payment_id}/refunds
```

```javascript
{
  "refund_id": "REF_PAY_SUB_usr123_20260601",  // Your idempotency key
  "refund_amount": 499.00,                      // Partial or full
  "refund_note": "Cancelled subscription - prorated refund",
  "refund_speed": "INSTANT"                     // INSTANT | STANDARD
}
```

---

## 4. Webhook System

### 4.1 Complete Webhook Event Catalogue

| Event Type | Trigger | Action Required |
|---|---|---|
| `SUBSCRIPTION_STATUS_CHANGED` | Subscription status transitions (ACTIVE, PAUSED, CANCELLED, etc.) | Update DB subscription status |
| `SUBSCRIPTION_AUTH_STATUS` | Auth checkout completed (success or failure) | Update mandate auth details |
| `SUBSCRIPTION_PAYMENT_NOTIFICATION_INITIATED` | Pre-debit notification sent to customer (24h before) | Log; optionally send your own notification |
| `SUBSCRIPTION_PAYMENT_SUCCESS` | Charge successfully collected | Extend subscription period, log payment |
| `SUBSCRIPTION_PAYMENT_FAILED` | Charge failed (after all UPI retries exhausted, or first attempt for eNACH/card) | Trigger retry logic, notify customer |
| `SUBSCRIPTION_PAYMENT_CANCELLED` | On-demand charge cancelled | Update payment status |
| `SUBSCRIPTION_REFUND_STATUS` | Refund processed | Update refund record |
| `SUBSCRIPTION_CARD_EXPIRY_REMINDER` | Customer's card expiring (for card SI) | Prompt card update |

---

### 4.2 Signature Verification (Production-Critical)

Cashfree sends these headers with every webhook:
- `x-webhook-signature` — HMAC SHA256 signature
- `x-webhook-timestamp` — Unix timestamp of webhook generation

**Algorithm:**
```
signatureData = x-webhook-timestamp + rawRequestBody
signature     = base64(HMAC-SHA256(CASHFREE_WEBHOOK_SECRET, signatureData))
```

**Node.js / Express Implementation:**

```javascript
// middleware/verifyWebhook.js
const crypto = require('crypto');

const verifyWebhookSignature = (req, res, next) => {
  const signature  = req.headers['x-webhook-signature'];
  const timestamp  = req.headers['x-webhook-timestamp'];
  const rawBody    = req.rawBody; // Must capture before JSON parsing

  if (!signature || !timestamp || !rawBody) {
    return res.status(400).json({ error: 'Missing webhook headers' });
  }

  // Reject stale webhooks (older than 5 minutes)
  const webhookAge = Date.now() / 1000 - parseInt(timestamp, 10);
  if (webhookAge > 300) {
    return res.status(400).json({ error: 'Stale webhook rejected' });
  }

  const computed = crypto
    .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
    .update(timestamp + rawBody)
    .digest('base64');

  if (computed !== signature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};

module.exports = verifyWebhookSignature;
```

**CRITICAL:** Register a raw body parser BEFORE JSON parser on the webhook route:

```javascript
// app.js
app.use('/webhooks/cashfree',
  express.raw({ type: 'application/json', verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }}),
  verifyWebhookSignature,
  require('./routes/webhookRouter')
);

// All other routes use normal JSON parser
app.use(express.json());
```

---

### 4.3 Webhook Handler with Idempotency

```javascript
// services/webhookService.js
const WebhookLog = require('../models/WebhookLog');
const subscriptionService = require('./subscriptionService');
const paymentService = require('./paymentService');

const handleWebhook = async (req, res) => {
  // Respond 200 immediately — Cashfree retries if it doesn't get 200 within timeout
  res.status(200).json({ status: 'received' });

  const event = JSON.parse(req.rawBody);
  const { type, data, event_time } = event;

  // Idempotency: Cashfree may deliver the same event multiple times
  const eventId = `${type}_${data.subscription_details?.cf_subscription_id}_${event_time}`;
  const existing = await WebhookLog.findOne({ event_id: eventId });
  if (existing) return; // Duplicate — skip

  // Save before processing (crash-safe)
  await WebhookLog.create({
    event_id: eventId,
    event_type: type,
    payload: data,
    received_at: new Date(),
    status: 'PROCESSING'
  });

  try {
    switch (type) {
      case 'SUBSCRIPTION_STATUS_CHANGED':
        await subscriptionService.handleStatusChange(data);
        break;
      case 'SUBSCRIPTION_AUTH_STATUS':
        await subscriptionService.handleAuthStatus(data);
        break;
      case 'SUBSCRIPTION_PAYMENT_NOTIFICATION_INITIATED':
        await subscriptionService.handlePreDebitNotification(data);
        break;
      case 'SUBSCRIPTION_PAYMENT_SUCCESS':
        await paymentService.handleSuccess(data);
        break;
      case 'SUBSCRIPTION_PAYMENT_FAILED':
        await paymentService.handleFailure(data);
        break;
      case 'SUBSCRIPTION_PAYMENT_CANCELLED':
        await paymentService.handleCancelled(data);
        break;
      case 'SUBSCRIPTION_REFUND_STATUS':
        await paymentService.handleRefundStatus(data);
        break;
      case 'SUBSCRIPTION_CARD_EXPIRY_REMINDER':
        await subscriptionService.handleCardExpiry(data);
        break;
      default:
        console.warn('Unhandled webhook event:', type);
    }

    await WebhookLog.updateOne({ event_id: eventId }, { status: 'PROCESSED' });
  } catch (err) {
    await WebhookLog.updateOne({ event_id: eventId }, {
      status: 'FAILED',
      error: err.message
    });
    // Do NOT rethrow — 200 already sent. Failed events are reprocessed by a cron.
  }
};

module.exports = { handleWebhook };
```

---

### 4.4 Webhook Reliability Strategy

| Concern | Solution |
|---|---|
| Duplicate delivery | Idempotency check via `event_id` before processing |
| Missed webhook | Periodic status polling fallback (cron every 6h for PENDING subscriptions) |
| Processing crash | Save log before processing; reprocess `FAILED` logs via cron |
| Stale webhook | Reject if `x-webhook-timestamp` is older than 5 minutes |
| Webhook before DB write | Webhooks are async — always fetch current state from DB before acting |
| Cashfree retry policy | Cashfree retries failed webhook deliveries — your idempotency check handles this |

---

## 5. End-to-End Flows

### Flow 1: Subscription Creation → Activation

```
Client App                Backend (Node.js)              Cashfree API            Customer UPI App
    │                           │                              │                        │
    │── POST /subscription ────►│                              │                        │
    │   { plan: MONTHLY,        │                              │                        │
    │     customerId: usr123 }  │                              │                        │
    │                           │── Validate customer ────────►│                        │
    │                           │── POST /subscriptions ───────►│                        │
    │                           │                              │── mandate setup ───────►│
    │                           │◄─ { auth_link, sub_id } ────│                        │
    │                           │── Save subscription ─────────►DB                      │
    │                           │   { status: INITIALIZED }   │                        │
    │◄── { auth_link } ────────│                              │                        │
    │                           │                              │                        │
    │── Redirect to auth_link                                  │                        │
    │                                                          │                        │
    │    (customer authorizes in UPI app)                      │◄── mandate approved ──│
    │                           │◄── SUBSCRIPTION_STATUS_CHANGED webhook               │
    │                           │    { status: ACTIVE }        │                        │
    │                           │── Update DB { status: ACTIVE }                        │
    │                           │── Extend access rights for customer                   │
    │◄── Redirect to return_url                                │                        │
```

**Backend steps (Create Subscription):**
```javascript
// controllers/subscriptionController.js
const createSubscription = async (req, res) => {
  const { customerId, planId } = req.body;

  const customer = await User.findById(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  // Check for existing active subscription
  const existing = await Subscription.findOne({
    customerId, status: { $in: ['INITIALIZED', 'ACTIVE', 'CUSTOMER_PAUSED'] }
  });
  if (existing) return res.status(409).json({ error: 'Active subscription exists', subscriptionId: existing.subscriptionId });

  const subscriptionId = `SUB_${customerId}_${Date.now()}`;

  const payload = {
    subscription_id: subscriptionId,
    plan_id: planId,
    customer_details: {
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
    },
    subscription_meta: {
      return_url: `${process.env.APP_URL}/subscription/callback?sub_id=${subscriptionId}`,
    },
    subscription_expiry_time: '2028-12-31T23:59:59+05:30',
    authorization_amount: 1.00,
    authorization_amount_refund: true,
  };

  const cfResponse = await cashfreeClient.post('/subscriptions', payload);
  const { cf_subscription_id, authorization_link } = cfResponse.data;

  await Subscription.create({
    subscriptionId,
    cfSubscriptionId: cf_subscription_id,
    customerId,
    planId,
    status: 'INITIALIZED',
    authorizationLink: authorization_link,
  });

  res.json({ authorizationLink: authorization_link, subscriptionId });
};
```

---

### Flow 2: Recurring Charge Execution (Periodic — Auto)

For **PERIODIC** subscriptions, Cashfree auto-initiates. Your backend is purely reactive:

```
Cashfree Scheduler                  Your Backend
       │                                  │
       │── SUBSCRIPTION_PAYMENT_          │
       │   NOTIFICATION_INITIATED ───────►│── Log notification
       │   (24h before charge)            │── Optionally: send your own push/SMS
       │                                  │
       │── (debit executed)               │
       │                                  │
       │── SUBSCRIPTION_PAYMENT_SUCCESS ──►│── Update payment status = SUCCESS
       │                                  │── Extend subscription period
       │                                  │── Send receipt to customer
```

For **ON_DEMAND** subscriptions, your backend must schedule charges:

```javascript
// jobs/billingJob.js — runs daily at 8 PM
const billOnDemandSubscriptions = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const scheduleDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

  const dueSubscriptions = await Subscription.find({
    type: 'ON_DEMAND',
    status: 'ACTIVE',
    nextBillingDate: { $lte: tomorrow }
  });

  for (const sub of dueSubscriptions) {
    const paymentId = `PAY_${sub.subscriptionId}_${Date.now()}`;
    try {
      await cashfreeClient.post(`/subscriptions/${sub.subscriptionId}/payments`, {
        payment_id: paymentId,
        payment_amount: sub.currentCycleAmount,
        payment_remarks: `EverCut billing - ${scheduleDate}`,
        payment_schedule_date: scheduleDate,
      });
      await Payment.create({ paymentId, subscriptionId: sub.subscriptionId, status: 'INITIALIZED', amount: sub.currentCycleAmount });
    } catch (err) {
      console.error(`Failed to raise payment for ${sub.subscriptionId}:`, err.message);
    }
  }
};
```

---

### Flow 3: Failure + Retry Handling

```
Cashfree Debit Engine               Your Backend                  Customer
       │                                  │                           │
       │── SUBSCRIPTION_PAYMENT_FAILED ──►│                           │
       │   (UPI: after 1+3 retries)       │── Update payment FAILED   │
       │   (eNACH/Card: immediately)       │── Check retryCount        │
       │                                  │                           │
       │                                  │── retryCount < 3?         │
       │                                  │   YES: schedule retry job │
       │                                  │   NO:  suspend subscription
       │                                  │        notify customer ───►│
       │                                  │                           │
       │── (manual retry via API) ────────►│                           │
       │   POST .../payments/{id} RETRY   │                           │
       │                                  │                           │
       │── SUBSCRIPTION_PAYMENT_SUCCESS ──►│── Reset retryCount = 0    │
                                          │── Reactivate subscription │
```

```javascript
// services/paymentService.js
const retryQueue = require('../queues/retryQueue');
const RETRY_DELAYS_HOURS = [24, 48, 72];
const MAX_RETRIES = 3;

const handleFailure = async (data) => {
  const { subscription_id, payment_id, failure_details } = data;

  const sub = await Subscription.findOne({ subscriptionId: subscription_id });
  const payment = await Payment.findOneAndUpdate(
    { paymentId: payment_id },
    { status: 'FAILED', failureReason: failure_details?.error_description },
    { new: true }
  );

  if (sub.retryCount >= MAX_RETRIES) {
    await Subscription.updateOne({ subscriptionId: subscription_id }, {
      status: 'ON_HOLD',
      lastFailureAt: new Date()
    });
    await notifyCustomerReauth(sub.customerId);
    return;
  }

  const delayHours = RETRY_DELAYS_HOURS[sub.retryCount];
  await retryQueue.add(
    { subscriptionId: subscription_id, paymentId: payment_id },
    { delay: delayHours * 3600 * 1000, attempts: 1 }
  );

  await Subscription.updateOne({ subscriptionId: subscription_id }, {
    $inc: { retryCount: 1 },
    lastFailureAt: new Date()
  });

  await notifyCustomerPaymentFailed(sub.customerId, delayHours);
};
```

```javascript
// queues/retryQueue.js (Bull processor)
retryQueue.process(async (job) => {
  const { subscriptionId, paymentId } = job.data;
  const newPaymentId = `${paymentId}_retry_${Date.now()}`;

  const sub = await Subscription.findOne({ subscriptionId });
  if (!sub || sub.status === 'CANCELLED') return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const scheduleDate = tomorrow.toISOString().split('T')[0];

  await cashfreeClient.post(`/subscriptions/${subscriptionId}/payments`, {
    payment_id: newPaymentId,
    payment_amount: sub.planAmount,
    payment_remarks: 'EverCut retry charge',
    payment_schedule_date: scheduleDate,
  });

  await Payment.create({
    paymentId: newPaymentId,
    subscriptionId,
    status: 'INITIALIZED',
    amount: sub.planAmount,
    isRetry: true,
  });
});
```

---

### Flow 4: Subscription Cancellation / Pause

```javascript
// Pause subscription (customer-initiated)
const pauseSubscription = async (subscriptionId, reason) => {
  await cashfreeClient.patch(`/subscriptions/${subscriptionId}`, {
    subscription_status: 'CUSTOMER_PAUSED'
  });
  await Subscription.updateOne({ subscriptionId }, {
    status: 'CUSTOMER_PAUSED',
    pausedAt: new Date(),
    pauseReason: reason
  });
  // Cashfree will send SUBSCRIPTION_STATUS_CHANGED webhook as confirmation
};

// Resume subscription
const resumeSubscription = async (subscriptionId) => {
  await cashfreeClient.patch(`/subscriptions/${subscriptionId}`, {
    subscription_status: 'ACTIVE'
  });
  await Subscription.updateOne({ subscriptionId }, {
    status: 'ACTIVE',
    resumedAt: new Date()
  });
};

// Cancel subscription (terminal)
const cancelSubscription = async (subscriptionId) => {
  await cashfreeClient.patch(`/subscriptions/${subscriptionId}`, {
    subscription_status: 'CANCELLED'
  });
  await Subscription.updateOne({ subscriptionId }, {
    status: 'CANCELLED',
    cancelledAt: new Date()
  });
  // Issue prorated refund if applicable
};
```

---

## 6. Database Design (MongoDB)

### 6.1 Collection: `plans`

```javascript
const PlanSchema = new mongoose.Schema({
  // Internal
  _id: mongoose.Schema.Types.ObjectId,
  planId: { type: String, unique: true, required: true, index: true },
  cfPlanId: { type: String },                     // Cashfree internal ID

  // Plan config
  name: { type: String, required: true },
  type: { type: String, enum: ['PERIODIC', 'ON_DEMAND'], required: true },
  currency: { type: String, default: 'INR' },
  recurringAmount: { type: Number },              // null for ON_DEMAND
  maxAmount: { type: Number, required: true },    // Mandate ceiling
  intervalType: { type: String, enum: ['day', 'week', 'month', 'year'] },
  intervals: { type: Number },                    // e.g., 1 = every 1 month
  maxCycles: { type: Number },                    // null = unlimited

  // Meta
  description: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });
```

**Indexes:** `{ planId: 1 }` unique, `{ isActive: 1 }`

---

### 6.2 Collection: `subscriptions`

```javascript
const SubscriptionSchema = new mongoose.Schema({
  // Identifiers
  subscriptionId: { type: String, unique: true, required: true },   // YOUR ID (idempotency key)
  cfSubscriptionId: { type: String, index: true },                   // Cashfree's ID
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planId: { type: String, ref: 'Plan', index: true },

  // Subscription state
  status: {
    type: String,
    enum: [
      'INITIALIZED', 'BANK_APPROVAL_PENDING', 'ACTIVE',
      'CUSTOMER_PAUSED', 'ON_HOLD', 'COMPLETED',
      'CUSTOMER_CANCELLED', 'CANCELLED', 'EXPIRED',
      'LINK_EXPIRED', 'CARD_EXPIRED'
    ],
    default: 'INITIALIZED',
    index: true,
  },

  // Plan details (snapshot at subscription time)
  planType: { type: String, enum: ['PERIODIC', 'ON_DEMAND'] },
  planAmount: { type: Number },
  planMaxAmount: { type: Number },
  currency: { type: String, default: 'INR' },

  // Mandate details
  mandateType: { type: String, enum: ['UPI', 'ENACH', 'CARD', 'PHYSICAL_NACH'] },
  authorizationLink: { type: String },
  authorizationLinkExpiry: { type: Date },
  cfAuthorizationReference: { type: String },

  // Billing
  firstChargeDate: { type: Date },
  nextBillingDate: { type: Date, index: true },   // Used by billing job
  currentCycleAmount: { type: Number },
  expiresAt: { type: Date },
  currentCycle: { type: Number, default: 0 },
  maxCycles: { type: Number },

  // Failure tracking
  retryCount: { type: Number, default: 0 },
  lastFailureAt: { type: Date },
  lastFailureReason: { type: String },

  // Lifecycle timestamps
  activatedAt: { type: Date },
  pausedAt: { type: Date },
  pauseReason: { type: String },
  resumedAt: { type: Date },
  cancelledAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });
```

**Indexes:**
```javascript
SubscriptionSchema.index({ subscriptionId: 1 }, { unique: true });
SubscriptionSchema.index({ cfSubscriptionId: 1 });
SubscriptionSchema.index({ customerId: 1, status: 1 });
SubscriptionSchema.index({ status: 1, nextBillingDate: 1 });  // Billing job query
SubscriptionSchema.index({ status: 1, mandateType: 1 });      // Retry job query
```

---

### 6.3 Collection: `payments`

```javascript
const PaymentSchema = new mongoose.Schema({
  // Identifiers
  paymentId: { type: String, unique: true, required: true },     // YOUR ID (idempotency key)
  cfPaymentId: { type: String, index: true },                    // Cashfree's ID
  subscriptionId: { type: String, ref: 'Subscription', index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

  // Payment details
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  scheduledDate: { type: Date },
  initiatedAt: { type: Date },
  settledAt: { type: Date },

  // Status
  status: {
    type: String,
    enum: ['INITIALIZED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
    index: true,
  },
  paymentMethod: { type: String },        // UPI | ENACH | DEBIT_CARD | CREDIT_CARD
  failureReason: { type: String },
  gatewayName: { type: String },

  // Retry tracking
  isRetry: { type: Boolean, default: false },
  parentPaymentId: { type: String },      // Original payment if this is a retry
  retryAttemptNumber: { type: Number, default: 0 },

  // Refund tracking
  refundId: { type: String },
  refundAmount: { type: Number },
  refundStatus: { type: String },

  remarks: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });
```

**Indexes:**
```javascript
PaymentSchema.index({ paymentId: 1 }, { unique: true });
PaymentSchema.index({ subscriptionId: 1, status: 1 });
PaymentSchema.index({ customerId: 1, status: 1 });
PaymentSchema.index({ status: 1, scheduledDate: 1 });
PaymentSchema.index({ cfPaymentId: 1 });
```

---

### 6.4 Collection: `webhook_logs`

```javascript
const WebhookLogSchema = new mongoose.Schema({
  eventId: { type: String, unique: true, required: true, index: true },  // Idempotency key
  eventType: { type: String, required: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  receivedAt: { type: Date, default: Date.now, index: true },
  processedAt: { type: Date },
  status: {
    type: String,
    enum: ['PROCESSING', 'PROCESSED', 'FAILED', 'SKIPPED'],
    default: 'PROCESSING',
    index: true,
  },
  error: { type: String },
  retryCount: { type: Number, default: 0 },
}, { timestamps: true });

// TTL: Auto-delete logs after 90 days
WebhookLogSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 7776000 });
```

---

### 6.5 Collection: `idempotency_keys`

```javascript
const IdempotencySchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  resourceType: { type: String },     // 'subscription' | 'payment' | 'refund'
  resourceId: { type: String },
  responseSnapshot: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// TTL: 24 hours
IdempotencySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
```

---

## 7. Failure & Edge Cases

### 7.1 Mandate Creation Failure

| Scenario | Detection | Handling |
|---|---|---|
| `POST /subscriptions` returns 4xx | HTTP error in axios | Return error to client; do not save to DB |
| `POST /subscriptions` returns 5xx | Interceptor retry once | After retry failure: log, return 500 to client, do not create duplicate on re-call (same `subscription_id` is idempotent) |
| Network timeout | axios timeout | Catch timeout; query `GET /subscriptions/{id}` to check if created |
| Duplicate `subscription_id` | Cashfree returns existing subscription | Compare returned status — if INITIALIZED, return auth link; if ACTIVE, return conflict |

```javascript
const createWithIdempotency = async (payload) => {
  try {
    const response = await cashfreeClient.post('/subscriptions', payload);
    return response.data;
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      // Check if it was created despite timeout
      const check = await cashfreeClient.get(`/subscriptions/${payload.subscription_id}`).catch(() => null);
      if (check?.data) return check.data;
    }
    throw err;
  }
};
```

---

### 7.2 Customer Does Not Complete Authorization

| Scenario | State | Handling |
|---|---|---|
| Customer abandons the auth page | `INITIALIZED` stays | Run a cron after 30 min — if still INITIALIZED, set `LINK_EXPIRED` locally; Cashfree will also expire it |
| `authorization_link_expiry` passed | Cashfree sends `SUBSCRIPTION_STATUS_CHANGED` → `LINK_EXPIRED` | Set status to `LINK_EXPIRED`; create a new subscription for re-auth |
| eNACH bank approval pending | `BANK_APPROVAL_PENDING` | Poll `GET /subscriptions/{id}` every 4h; max wait 3 business days |

---

### 7.3 Payment Failure Scenarios

| Failure Type | Method | Auto-Retry | Your Action |
|---|---|---|---|
| Insufficient balance | UPI | ✅ 1+3 hourly | After all retries: notify customer, schedule D+1/D+2/D+3 manual retry |
| Insufficient balance | eNACH / Card | ❌ | Immediately schedule manual retry on D+1 via Raise Payment API |
| Bank downtime | Any | UPI only | Queue retry; poll status after 2h |
| Daily UPI limit exceeded | UPI | ✅ (may still fail) | Notify customer; retry next day |
| Card expired | Card SI | ❌ | `SUBSCRIPTION_CARD_EXPIRY_REMINDER` is sent beforehand; prompt card re-auth |
| Mandate revoked by customer | Any | ❌ | Subscription moves to `CUSTOMER_CANCELLED`; create new mandate |
| UPI debit outside non-peak hours | UPI | ❌ | Schedule for next valid window |

---

### 7.4 Bank Downtime (eNACH / UPI)

```javascript
const handleFailure = async (data) => {
  const isInfraFailure = [
    'BANK_DOWNTIME', 'GATEWAY_TIMEOUT', 'NETWORK_ERROR'
  ].includes(data.failure_details?.error_code);

  if (isInfraFailure) {
    // Shorter retry window — infra usually recovers within hours
    await retryQueue.add(job, { delay: 2 * 3600 * 1000 });
  } else {
    // Standard business failure — use 24h retry window
    await retryQueue.add(job, { delay: 24 * 3600 * 1000 });
  }
};
```

---

### 7.5 Webhook Delivery Delays / Failures

**Problem:** Webhook arrives 10 minutes after payment succeeds. Interim polling is needed.

```javascript
// jobs/statusPoller.js — runs every 6 hours
const pollPendingPayments = async () => {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000); // Older than 30 min
  const pending = await Payment.find({
    status: { $in: ['INITIALIZED', 'PENDING'] },
    createdAt: { $lt: cutoff }
  }).limit(100);

  for (const payment of pending) {
    const sub = await Subscription.findOne({ subscriptionId: payment.subscriptionId });
    const response = await cashfreeClient
      .get(`/subscriptions/${payment.subscriptionId}/payments/${payment.paymentId}`)
      .catch(() => null);

    if (response?.data?.payment_status === 'SUCCESS') {
      await paymentService.handleSuccess({ payment_id: payment.paymentId, ...response.data });
    } else if (response?.data?.payment_status === 'FAILED') {
      await paymentService.handleFailure({ payment_id: payment.paymentId, ...response.data });
    }
  }
};
```

---

### 7.6 Duplicate Webhook Events

Cashfree retries webhooks if it does not receive an HTTP 200 within its timeout window. Your idempotency check in `webhook_logs` (by `eventId`) prevents double-processing. Always respond 200 first, then process asynchronously.

---

### 7.7 Expired Mandates

| Condition | Status | Action |
|---|---|---|
| `subscription_expiry_time` reached | `EXPIRED` | Create new subscription; migrate customer |
| `max_cycles` reached | `COMPLETED` | Offer renewal — create new subscription |
| Card expired (`CARD_EXPIRED`) | `CARD_EXPIRED` | `SUBSCRIPTION_CARD_EXPIRY_REMINDER` sent 30 days before; prompt card update |
| Mandate revoked on UPI app | `CUSTOMER_CANCELLED` | Notify merchant via webhook; prompt re-authorization |

---

### 7.8 Concurrent Webhook + API Race Condition

**Scenario:** Billing job calls Raise Payment at the same time a webhook arrives for a payment from a previous cycle.

**Solution:** Use MongoDB's atomic `findOneAndUpdate` with conditional state transitions:

```javascript
// Only update status if current state is compatible
const updated = await Payment.findOneAndUpdate(
  { paymentId, status: { $in: ['INITIALIZED', 'PENDING'] } }, // Guard
  { status: 'SUCCESS', settledAt: new Date() },
  { new: true }
);
if (!updated) {
  // Payment already in terminal state — skip
  return;
}
```

---

## 8. Optimization Strategies

### 8.1 Payment Method Strategy for Higher Success Rates

| Strategy | Details |
|---|---|
| **UPI-first** | Highest user penetration in India; 91% mandate success rate. Default for plans ≤ ₹15K/cycle. |
| **eNACH for high-value plans** | Plans > ₹15K/cycle must use eNACH (up to ₹1Cr). Accept 1–2 day registration delay at onboarding. |
| **Card SI for international users** | For NRI or international card users (₹1Cr limit). |
| **Hybrid fallback** | If UPI mandate fails authorization, offer eNACH or card as fallback on the same checkout page. |
| **Physical NACH** | Only for non-tech-savvy customers (e.g., senior barber franchise owners) — requires offline handling. |

```javascript
// Payment method selection logic at subscription creation
const getPaymentMethodHint = (planAmount, customerProfile) => {
  if (customerProfile.preferredMethod) return customerProfile.preferredMethod;
  if (planAmount > 100000) return 'ENACH';            // Only eNACH supports up to ₹1Cr
  if (planAmount > 15000) return ['ENACH', 'CARD'];   // Above UPI no-AFA limit
  return ['UPI', 'ENACH', 'CARD'];                    // Default: all methods
};
```

---

### 8.2 Retry Strategy by Payment Method

| Method | Retry Type | Retry Timing | Max Attempts |
|---|---|---|---|
| UPI | Cashfree auto + merchant manual | Auto: +1h, +2h, +3h. Manual: D+1, D+2, D+3 | 3 auto + 3 manual |
| eNACH | Merchant manual only | D+1, D+3, D+7 (give more time for balance replenishment) | 3 manual |
| Card SI | Merchant manual only | D+1, D+3, D+7 | 3 manual |

**Exponential backoff for manual retries:**
```javascript
const RETRY_SCHEDULE = {
  UPI:   [24, 48, 72],    // hours after failure
  ENACH: [24, 72, 168],   // hours: 1d, 3d, 7d
  CARD:  [24, 72, 168],
};
```

---

### 8.3 Charge Scheduling for Maximum Success

```javascript
// Optimal charge time: raise at 8 PM for T+1 execution
// This satisfies the cut-off for all payment methods (before 9 PM)
// and avoids UPI peak-hour restrictions

const scheduleNextCharge = (subscription) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const scheduleDate = tomorrow.toISOString().split('T')[0];

  // Raise the charge at 8 PM today for T+1 execution
  const raiseAt = new Date();
  raiseAt.setHours(20, 0, 0, 0);

  return { scheduleDate, raiseAt };
};
```

---

### 8.4 Proactive Customer Communication

| Event | When to Notify | Channel |
|---|---|---|
| Mandate expiry | 30 days before | Email + Push |
| Charge upcoming | 3 days before (beyond NPCI's 24h) | Push + SMS |
| Card expiry | `SUBSCRIPTION_CARD_EXPIRY_REMINDER` webhook | Email |
| Payment failure | Immediately on `SUBSCRIPTION_PAYMENT_FAILED` | Push + SMS + Email |
| Retry scheduled | Immediately after retry queued | Push |
| Payment success | On `SUBSCRIPTION_PAYMENT_SUCCESS` | Push + Email receipt |

---

### 8.5 Subscription Conversion Optimization

- **Keep auth amount minimal (₹1)** and set `authorization_amount_refund: true` — reduces drop-off at mandate setup.
- **Pre-fill customer details** in subscription payload — reduces checkout time.
- **Use Intent flow for UPI** (deep-link to UPI app) rather than Collect flow — higher completion rates.
- **Set a realistic `subscription_expiry_time`** — 2–3 years ahead; avoid artificially short mandates.

---

## 9. Implementation Blueprint

### 9.1 Step-by-Step Integration Plan

| Step | Task | Owner | Notes |
|---|---|---|---|
| 1 | Create Cashfree merchant account + enable Subscriptions | DevOps | Requires business verification |
| 2 | Get Sandbox credentials (APP_ID + SECRET_KEY) | DevOps | From dashboard → Developers → API Keys |
| 3 | Configure environment variables | Backend | See `.env` below |
| 4 | Install dependencies | Backend | `axios`, `bull`, `redis`, `mongoose`, `crypto` |
| 5 | Implement Cashfree API client singleton | Backend | With retry interceptor |
| 6 | Create `plans`, `subscriptions`, `payments`, `webhook_logs` MongoDB schemas | Backend | With indexes |
| 7 | Create Plan via API or Dashboard | Product | `POST /subscriptions/plans` |
| 8 | Implement `POST /subscription` endpoint (create subscription) | Backend | Returns auth link |
| 9 | Implement `return_url` handler (post-authorization redirect) | Backend | Verify via Fetch Subscription API |
| 10 | Implement webhook endpoint with signature verification | Backend | `POST /webhooks/cashfree` |
| 11 | Implement all webhook event handlers | Backend | All 8 event types |
| 12 | Implement idempotency layer | Backend | `webhook_logs` + `payment.paymentId` guard |
| 13 | Implement Bull queue + Redis | Backend | Retry scheduler + billing job |
| 14 | Implement billing cron job (for ON_DEMAND) | Backend | Runs at 8 PM daily |
| 15 | Implement status polling fallback cron | Backend | Every 6h for PENDING payments |
| 16 | Sandbox end-to-end test (all payment methods) | QA | UPI + eNACH + Card |
| 17 | Sandbox webhook test | QA | Use Cashfree dashboard webhook tester |
| 18 | Switch to production credentials | DevOps | Update `.env` |
| 19 | Monitor first 100 production subscriptions | Backend + Ops | Watch webhook_logs for failures |

---

### 9.2 Environment Configuration

```bash
# .env
NODE_ENV=production

# Cashfree
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_WEBHOOK_SECRET=your_webhook_secret
CASHFREE_API_VERSION=2025-01-01

# URLs
APP_URL=https://api.evercut.com
SUBSCRIPTION_RETURN_URL=https://app.evercut.com/subscription/callback

# Redis (for Bull queues)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# MongoDB
MONGODB_URI=mongodb+srv://...

# Limits (match Cashfree plan config)
UPI_MAX_AMOUNT=15000
ENACH_MAX_AMOUNT=10000000
```

---

### 9.3 API Sequence (Complete)

```
1. Create Plan (once)
   POST /subscriptions/plans

2. Create Subscription (per customer)
   POST /subscriptions
   → Save INITIALIZED to DB
   → Return auth_link to client

3. Customer Authorizes (redirect)
   → Cashfree hosted checkout

4. Webhook: SUBSCRIPTION_STATUS_CHANGED → ACTIVE
   → Update DB status = ACTIVE
   → Grant access

5a. PERIODIC: Cashfree auto-charges
    → Receive SUBSCRIPTION_PAYMENT_NOTIFICATION_INITIATED
    → Receive SUBSCRIPTION_PAYMENT_SUCCESS / FAILED

5b. ON_DEMAND: Merchant raises charge
    POST /subscriptions/{id}/payments
    → Receive SUBSCRIPTION_PAYMENT_SUCCESS / FAILED

6. On FAILED: Retry queue → PATCH /subscriptions/{id}/payments/{id} RETRY
   OR Raise new payment: POST /subscriptions/{id}/payments

7. Pause / Resume / Cancel
   PATCH /subscriptions/{id}
   { subscription_status: CUSTOMER_PAUSED | ACTIVE | CANCELLED }

8. Refund
   POST /subscriptions/{id}/payments/{payment_id}/refunds

9. Fetch status (polling fallback)
   GET /subscriptions/{id}
   GET /subscriptions/{id}/payments/{payment_id}
```

---

### 9.4 Integration Checklist

- [ ] Sandbox credentials configured in `.env`
- [ ] `cashfreeClient` singleton with version header `2025-01-01`
- [ ] MongoDB schemas created with all indexes
- [ ] `POST /subscriptions/plans` tested → plan created
- [ ] `POST /subscriptions` tested → auth link returned
- [ ] Customer authorization flow tested (UPI sandbox)
- [ ] `SUBSCRIPTION_STATUS_CHANGED` webhook received and handled
- [ ] Webhook signature verification active on `/webhooks/cashfree`
- [ ] `express.raw()` middleware on webhook route (before `express.json()`)
- [ ] Idempotency check via `webhook_logs.eventId` in place
- [ ] `SUBSCRIPTION_PAYMENT_SUCCESS` handler extends subscription period
- [ ] `SUBSCRIPTION_PAYMENT_FAILED` handler triggers retry queue
- [ ] Manual retry via Raise Payment API tested for eNACH/card
- [ ] Billing cron job tested for ON_DEMAND subscriptions
- [ ] Status polling fallback cron active
- [ ] Card expiry reminder handled (`SUBSCRIPTION_CARD_EXPIRY_REMINDER`)
- [ ] Refund API tested
- [ ] All webhook events logged to `webhook_logs` with TTL index
- [ ] `CANCELLED` subscriptions cannot be re-activated (create new)
- [ ] Charge cut-off timings handled in billing job (raise before 9 PM for T+1)
- [ ] Production credentials deployed
- [ ] Webhook URL registered in Cashfree dashboard (production)
- [ ] Rate limits understood (`rate-limits` page in Cashfree docs)

---

## 10. Assumptions

| # | Assumption | Risk if Wrong |
|---|---|---|
| A1 | Cashfree API v5 (`2025-01-01`) endpoints are stable through 2026 | Breaking changes would require endpoint updates |
| A2 | Webhook secret is stored securely in environment variables (not in code) | Signature bypass if leaked |
| A3 | Redis is available for Bull queue (retry scheduler) | Without Redis: use DB-based polling fallback only |
| A4 | UPI AutoPay non-peak hours constraint (NPCI Aug 1, 2025 circular) applies | Charges scheduled outside windows will fail |
| A5 | Physical NACH is not in EverCut's MVP scope | Physical NACH requires offline form handling |
| A6 | Cashfree's 1+3 UPI retry behavior is at hourly intervals (stated in docs) | If intervals change, merchant retry logic may overlap |
| A7 | eNACH bank approval takes 1–5 business days (stated as 5–10 for physical) | Slow banks can take longer; BANK_APPROVAL_PENDING status must be tolerated |
| A8 | `subscription_id` uniqueness is enforced by the backend before calling Cashfree | Duplicate subscriptions possible if not enforced |

---

## 11. Validation Checklist

### Completeness

- [x] All mandate types documented with exact limits
- [x] UPI AFA thresholds clarified (₹15K / ₹1L)
- [x] eNACH limit documented (₹1Cr)
- [x] NPCI August 2025 UPI processing window constraint included
- [x] Charge cut-off timeline table reproduced from official docs
- [x] Retry policy: UPI 1+3, eNACH/Card NO auto-retry
- [x] All 8 webhook events documented
- [x] Webhook signature algorithm: HMAC SHA256, `timestamp + rawBody`, base64
- [x] `express.raw()` caveat for webhook body preservation
- [x] All subscription lifecycle states documented
- [x] All payment lifecycle states documented
- [x] MongoDB schemas with indexes for all 4 collections
- [x] Idempotency at subscription creation (`subscription_id`) and webhook processing
- [x] Polling fallback for delayed webhooks
- [x] Edge cases: timeout, duplicate event, bank downtime, expired mandate, race condition
- [x] Implementation checklist with 24 items
- [x] API sequence in correct order
- [x] All assumptions stated explicitly

### Production Readiness Gaps to Resolve Before Go-Live
- Verify Cashfree's current rate limits for Subscription APIs (`/subscriptions/rate-limits`)
- Confirm webhook retry count and timeout from Cashfree support (not publicly documented)
- Test `BANK_APPROVAL_PENDING` → `ACTIVE` transition in sandbox (eNACH mock)
- Validate idempotency behavior for Raise Payment API with same `payment_id`

---

*Document Version: 1.0 | API: Cashfree v5 / 2025-01-01 | Stack: Node.js + Express + MongoDB*
*Source: Official Cashfree Developer Documentation (cashfree.com/docs), verified May 2026*
