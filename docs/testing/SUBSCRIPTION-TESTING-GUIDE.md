# EverCut — Subscription System Testing Guide
### Production-Grade Postman Testing Documentation

> **Version:** 1.0.0 | **Gateway:** Razorpay Subscriptions | **API Base:** `/api/v1`
>
> This document is self-contained. A developer or QA engineer with no prior project knowledge
> can execute the entire subscription testing workflow using only this guide.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Understanding](#2-architecture-understanding)
3. [Subscription Lifecycle Summary](#3-subscription-lifecycle-summary)
4. [Testing Preconditions](#4-testing-preconditions)
5. [Environment Setup](#5-environment-setup)
6. [Authentication Setup](#6-authentication-setup)
7. [Required Test Data](#7-required-test-data)
8. [Route Testing Sequence](#8-route-testing-sequence)
9. [Detailed Route-by-Route Testing](#9-detailed-route-by-route-testing)
10. [Subscription-Affected Routes (Indirect Dependencies)](#10-subscription-affected-routes-indirect-dependencies)
11. [Webhook Testing](#11-webhook-testing)
12. [Edge Cases & Failure Scenarios](#12-edge-cases--failure-scenarios)
13. [Subscription State Transition Testing](#13-subscription-state-transition-testing)
14. [Role-Based Access Testing](#14-role-based-access-testing)
15. [Regression Checklist](#15-regression-checklist)
16. [Common Mistakes](#16-common-mistakes)
17. [Debugging Guidance](#17-debugging-guidance)
18. [Background Jobs & Cron Testing](#18-background-jobs--cron-testing)
19. [Database Consistency Checkpoints](#19-database-consistency-checkpoints)
20. [Final Validation Checklist](#20-final-validation-checklist)

---

## 1. Overview

### What Is Being Tested

The EverCut subscription system controls **feature entitlements** for barber accounts. Subscriptions are managed through **Razorpay** (billing gateway) and affect:

- Gallery upload quotas (photos and videos)
- Financial statement download quotas
- Badge display and shop visibility tier
- Analytics and promotional tool access

### Why This System Requires Careful Testing

1. **Payment gateway integration**: Every subscribe/upgrade call creates a real Razorpay subscription object — test mode must be verified.
2. **Webhook-driven state transitions**: The core lifecycle (activation, renewal, cancellation, expiry) is driven by Razorpay webhook events, NOT API calls. Signature verification must be satisfied.
3. **Entitlement propagation**: Subscription state changes immediately propagate to media upload routes and earnings statement routes through middleware.
4. **Media side effects**: Plan downgrades and expiry hide excess gallery media. Plan upgrades and activations reactivate hidden media. These side effects are critical to verify.
5. **Idempotency on webhooks**: A MongoDB unique index on `webhookEventId` prevents duplicate processing — this must be tested.
6. **Cron job safety net**: A background expiry job runs every 5 minutes to enforce period-end expiry. Reconciliation runs daily at 02:00 IST.

### Third-Party Integrations

| Gateway | Purpose | Environment Variable |
|---------|---------|---------------------|
| Razorpay | Subscription billing, customer creation, webhook delivery | `RAZORPAY_ENV`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |

---

## 2. Architecture Understanding

### 2.1 System Layers

```
HTTP Request
    │
    ▼
authenticate.middleware.js         → Validates Bearer JWT, loads active user
    │
    ▼
authorize.middleware.js            → Enforces ROLES.BARBER restriction
    │
    ▼
validate.middleware.js             → Joi schema validation (planId enum)
    │
    ▼
subscription.controller.js         → Thin handler, delegates to service
    │
    ▼
subscription.service.js            → Core business logic
    │
    ├── razorpay-subscription.adapter.js  → Razorpay API calls
    ├── subscription.repository.js         → MongoDB operations
    ├── subscription-transaction.repository.js → Audit trail
    ├── entitlement.service.js             → Capability resolution
    └── subscription-lifecycle.service.js  → Media side-effects
```

### 2.2 Three Subscription Plans

| Plan ID | Name | Price | Photos | Videos | Statements/Cycle | Badge | Visibility |
|---------|------|-------|--------|--------|-----------------|-------|------------|
| `PLAN_BASIC` | Basic | Free (₹0) | 10 | 2 | 1 | NONE | NONE |
| `PLAN_POPULAR` | Popular | ₹299/month | 30 | 10 | 5 | BLUE | LOCAL |
| `PLAN_ADVANCED` | Advanced | ₹499/month | 50 | 15 | 10 | YELLOW | PRIORITY |

Plan IDs are configured via env vars `RAZORPAY_PLAN_ID_POPULAR` and `RAZORPAY_PLAN_ID_ADVANCED`.

### 2.3 Subscription Status State Machine

```
                ┌─────────────────────────────────┐
                │          PENDING_PAYMENT         │
                │  (after POST /subscribe called)  │
                └────────────────┬────────────────┘
                                 │ webhook: subscription.activated
                                 ▼
                ┌─────────────────────────────────┐
           ┌───▶│             ACTIVE              │◀──────────┐
           │    │  (entitlements fully active)    │           │
           │    └───┬─────────────┬──────────────┘           │
           │        │             │ webhook: subscription.paused
           │        │POST /cancel │        ▼                  │
           │        │             │    PAUSED ────── webhook: subscription.resumed
           │        ▼             │ webhook: subscription.halted
           │    CANCELLED         │        ▼
           │  (access retained    │    EXPIRED ─────────────────────────┐
           │   until period end)  │  (reverted to PLAN_BASIC)           │
           │        │             │                                      │
           │        │ period end  │ period end                           │
           └────────▼─────────────▼                                      │
                   Expiry safety net (CRON - every 5 min)                │
                           ↕                                             │
                     POST /subscribe ──────────────────────────────────-─┘
                     (re-subscribe from expired state)
```

**Valid Transitions:**
| From | To (allowed) |
|------|-------------|
| `PENDING_PAYMENT` | `ACTIVE`, `EXPIRED`, `CANCELLED` |
| `ACTIVE` | `CANCELLED`, `EXPIRED`, `PAST_DUE`, `PAUSED` |
| `PAST_DUE` | `ACTIVE`, `EXPIRED` |
| `PAUSED` | `ACTIVE`, `EXPIRED`, `CANCELLED` |
| `CANCELLED` | `EXPIRED`, `ACTIVE` |
| `EXPIRED` | `ACTIVE`, `PENDING_PAYMENT` |

### 2.4 Entitlement Resolution Logic

```
isEntitled(subscription):
  - ACTIVE    → always entitled
  - CANCELLED → entitled if Date.now() < currentPeriodEnd
  - PAST_DUE  → entitled (grace period)
  - PAUSED    → entitled
  - PENDING_PAYMENT → NOT entitled
  - EXPIRED   → NOT entitled

getActivePlanId(subscription):
  - if !isEntitled → PLAN_BASIC (regardless of stored planId)
  - if isEntitled  → subscription.planId
```

**Critical insight**: A cancelled subscription retains its entitlements until `currentPeriodEnd`. A `PENDING_PAYMENT` subscription does NOT get paid plan entitlements even though `planId` is set.

### 2.5 Webhook Signature Verification

The subscription webhook endpoint (`POST /api/v1/subscriptions/webhook`) requires:
- Raw body preserved as `Buffer` (configured via `webhook-raw-body.middleware.js`)
- Header: `x-razorpay-signature: <HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET) as hex>`
- A 300-second timestamp tolerance window

Missing or invalid signature → `400 Bad Request` with `"Invalid webhook signature"`.

### 2.6 Idempotency via `webhookEventId`

Each webhook transaction record has a unique index on `webhookEventId`. If Razorpay retries a webhook with the same `id`, the service returns `{ acknowledged: true, duplicate: true }` (HTTP 200) without reprocessing.

---

## 3. Subscription Lifecycle Summary

### 3.1 New Subscription Flow (Basic → Paid)

```
1. Barber calls POST /subscriptions/subscribe { planId: "PLAN_POPULAR" }
2. Server creates a Razorpay Customer (if no razorpayCustomerId stored)
3. Server creates a Razorpay Subscription on the gateway
4. DB: subscription.status → PENDING_PAYMENT, subscription.planId → PLAN_POPULAR
5. DB: SubscriptionTransaction created (type: CREATION, status: PENDING)
6. Response: { subscriptionId, razorpaySubscriptionId, checkoutUrl, razorpayKeyId }
7. Barber completes payment on Razorpay Checkout (external)
8. Razorpay sends webhook: subscription.activated
9. Server: subscription.status → ACTIVE, currentPeriodStart/End set
10. DB: SubscriptionTransaction created (type: ACTIVATION, source: WEBHOOK)
11. Lifecycle: reactivateHiddenMedia() called
```

### 3.2 Renewal Flow (Monthly)

```
1. Razorpay sends webhook: subscription.charged
2. Server: subscription.status → ACTIVE, currentPeriodStart/End updated, lastRenewalAt updated
3. DB: SubscriptionTransaction (type: RENEWAL, source: WEBHOOK)
4. Lifecycle: statementsDownloadedThisPeriod reset to 0
5. If pendingPlanId set: plan change applied immediately (scheduled downgrade executes)
```

### 3.3 Upgrade Flow (Immediate)

```
1. Barber calls POST /subscriptions/upgrade { planId: "PLAN_ADVANCED" }
2. Validates: transition must be UPGRADE type (sortOrder must increase)
3. Requires existing razorpaySubscriptionId (must already be on a paid plan)
4. Calls Razorpay: updateSubscription(subscriptionId, { planId: newPlan.razorpayPlanId })
5. DB: subscription.planId → PLAN_ADVANCED, status → ACTIVE
6. DB: SubscriptionTransaction (type: UPGRADE, source: API)
7. Lifecycle: reactivateHiddenMedia() called for new quota
```

### 3.4 Downgrade Flow (Deferred)

```
Downgrade to another paid plan (e.g., ADVANCED → POPULAR):
1. Barber calls POST /subscriptions/downgrade { planId: "PLAN_POPULAR" }
2. DB: subscription.pendingPlanId → PLAN_POPULAR (current plan unchanged)
3. DB: SubscriptionTransaction (type: DOWNGRADE, source: API, metadata.appliesAtNextRenewal: true)
4. At next renewal webhook: pendingPlanId applied, applyHiddenMediaPolicy() called

Downgrade to PLAN_BASIC:
1. Barber calls POST /subscriptions/downgrade { planId: "PLAN_BASIC" }
2. This REDIRECTS to cancelSubscription() internally
3. Results in CANCELLED status, cancelAtPeriodEnd: true
```

### 3.5 Cancellation Flow

```
1. Barber calls POST /subscriptions/cancel
2. Calls Razorpay: cancelSubscription(subscriptionId, { cancelAtCycleEnd: true })
3. DB: status → CANCELLED, cancelAtPeriodEnd: true, cancelledAt: now
4. DB: SubscriptionTransaction (type: CANCELLATION, source: API)
5. Access retained until currentPeriodEnd (isEntitled returns true)
6. Razorpay sends webhook: subscription.cancelled (confirmation)
7. At period end: CRON job expires the subscription, planId → PLAN_BASIC
```

### 3.6 Expiry Flow (Two Paths)

**Path A: Halted (payment retries exhausted)**
```
1. Razorpay sends webhook: subscription.halted
2. DB: SubscriptionTransaction (type: EXPIRY, source: WEBHOOK)
3. Lifecycle: onSubscriptionExpired() → planId → PLAN_BASIC, status → EXPIRED
4. Lifecycle: applyHiddenMediaPolicy() called → excess media hidden
```

**Path B: CRON safety net (period ended)**
```
1. runSubscriptionExpiryNow() runs every 5 minutes
2. Finds subscriptions where currentPeriodEnd < now AND status in [ACTIVE, CANCELLED, PAST_DUE, PAUSED]
3. For each: creates EXPIRY transaction (source: CRON), calls onSubscriptionExpired()
```

---

## 4. Testing Preconditions

### 4.1 Mandatory Prerequisites (must be satisfied before subscription testing)

| Prerequisite | Why Required | How to Satisfy |
|---|---|---|
| Server running with `RAZORPAY_ENV=SANDBOX` | Gateway calls use test keys | `npm run dev` from `server/` |
| `RAZORPAY_PLAN_ID_POPULAR` set in `.env` | `subscribe` endpoint reads this | Create plans with `node scripts/create-razorpay-plans.mjs --execute` |
| `RAZORPAY_PLAN_ID_ADVANCED` set in `.env` | Same as above | Same script |
| `RAZORPAY_WEBHOOK_SECRET` set in `.env` | Webhook signature verification | From Razorpay Dashboard → Webhooks |
| Barber user registered and fully onboarded | All subscription routes are BARBER-only | Run `01-authentication.json` + `02-onboarding.json` |
| Barber has a `Barber` document in DB | `resolveBarberForUser()` requires it | Completed by onboarding |
| MongoDB connected | All DB operations require it | Verify `MONGODB_URI` in `.env` |

### 4.2 Optional but Recommended

| Optional | Why Useful |
|---|---|
| Barber has gallery media (photos/videos) | Test media hide/reactivate on plan changes |
| `msg91.testMode: true` in config | Skips real SMS; test OTP is `123456` |

### 4.3 What NOT to do

- Do NOT run subscription tests in `RAZORPAY_ENV=PRODUCTION` unless intentional
- Do NOT use a live `rzp_live_*` key in sandbox mode (server startup will throw)
- Do NOT test webhooks without setting `RAZORPAY_WEBHOOK_SECRET` in both `.env` and the Postman collection variable

---

## 5. Environment Setup

### 5.1 Required Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://...

# Auth
JWT_ACCESS_SECRET=<64+ random chars>
JWT_REFRESH_SECRET=<64+ random chars>
JWT_ONBOARDING_SECRET=<64+ random chars>

# Firebase (for OTP, required by auth service)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# OTP
MSG91_AUTH_KEY=...
MSG91_OTP_TEMPLATE_ID=...

# Storage (required, even if not testing media)
CF_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=evercut-media-dev
CDN_BASE_URL=https://media-dev.evercut.in
MEDIA_TOKEN_SECRET=<64 hex chars>

# Razorpay Subscriptions (THE KEY VARS FOR SUBSCRIPTION TESTING)
RAZORPAY_ENV=SANDBOX
RAZORPAY_KEY_ID=rzp_test_<your_test_key>
RAZORPAY_KEY_SECRET=<your_test_secret>
RAZORPAY_WEBHOOK_SECRET=<webhook_secret_from_razorpay_dashboard>
RAZORPAY_PLAN_ID_POPULAR=plan_<id_from_create_plans_script>
RAZORPAY_PLAN_ID_ADVANCED=plan_<id_from_create_plans_script>

# PhonePe (required by config loader even if not testing payments)
PHONEPE_ENV=SANDBOX

# Cashfree (required by config loader even if not testing payouts)
CASHFREE_PAYOUT_ENV=SANDBOX
```

### 5.2 Creating Razorpay Plans (One-Time Setup)

```bash
cd server

# Dry run (preview what would be created):
node scripts/create-razorpay-plans.mjs

# Execute (actually creates plans in Razorpay Sandbox):
node scripts/create-razorpay-plans.mjs --execute
```

The script outputs plan IDs. Copy them to `.env` as `RAZORPAY_PLAN_ID_POPULAR` and `RAZORPAY_PLAN_ID_ADVANCED`.

### 5.3 Postman Environment Setup

Import `server/postman-collections/EverCut.postman_environment.json` into Postman.

Set or verify these environment variables in Postman:

| Variable | Value | Source |
|---|---|---|
| `base_url` | `http://localhost:5000` | Static |
| `api_prefix` | `api/v1` | Static |
| `test_barber_mobile` | `9876543211` | Your test barber number |
| `test_otp` | `123456` | Fixed in config (test mode) |
| `razorpay_webhook_secret` | (value of `RAZORPAY_WEBHOOK_SECRET` from `.env`) | Copy from server `.env` |

Variables auto-set by collection scripts:
- `barber_access_token` — captured after OTP verify
- `barber_refresh_token` — captured after OTP verify
- `razorpay_subscription_id` — captured after POST /subscribe

### 5.4 Postman Collection Variables (in `17-subscriptions.json`)

| Variable | Default | Notes |
|---|---|---|
| `subscription_plan_id` | `PLAN_POPULAR` | Change to `PLAN_ADVANCED` to test Advanced checkout |
| `subscription_upgrade_plan_id` | `PLAN_ADVANCED` | Plan to upgrade to |
| `subscription_downgrade_plan_id` | `PLAN_POPULAR` | Plan to downgrade to |
| `razorpay_plan_id_popular` | `plan_test_popular` | Must match `RAZORPAY_PLAN_ID_POPULAR` in `.env` |
| `razorpay_plan_id_advanced` | `plan_test_advanced` | Must match `RAZORPAY_PLAN_ID_ADVANCED` in `.env` |
| `barber_profile_id` | `` | Set from DB barber `_id` or auto-synced from global |

---

## 6. Authentication Setup

### 6.1 Token Lifecycle

The system uses three token types:

| Token Type | Secret | Expiry | Purpose |
|---|---|---|---|
| **Onboarding** | `JWT_ONBOARDING_SECRET` | 24 hours | First-time registration only |
| **Access** | `JWT_ACCESS_SECRET` | **15 minutes** | API access (subscription routes use this) |
| **Refresh** | `JWT_REFRESH_SECRET` | 180 days | Exchange for new access token |

> ⚠️ **Critical**: Access tokens expire in **15 minutes**. During long testing sessions, refresh the token using `POST /api/v1/auth/token/refresh` before it expires, or re-authenticate.

### 6.2 Authentication Flow for Testing

**Step 1: Send OTP to barber test number**
```
POST /api/v1/auth/otp/send
Body: { "mobile": "9876543211", "role": "BARBER" }
```

**Step 2: Verify OTP (captures token automatically in Postman)**
```
POST /api/v1/auth/otp/verify
Body: { "mobile": "9876543211", "otp": "123456" }
```
- Returning user → Response includes `tokens.accessToken` and `tokens.refreshToken`
- New user → Response includes `onboardingToken` (must complete onboarding first)

**Step 3: Refresh token when expired**
```
POST /api/v1/auth/token/refresh
Body: { "refreshToken": "{{barber_refresh_token}}" }
```

### 6.3 Required Headers for All Protected Routes

```
Authorization: Bearer {{barber_access_token}}
Content-Type: application/json
```

### 6.4 Roles Reference

| Role | Value | Who Uses It |
|---|---|---|
| Customer | `CUSTOMER` | Booking creation, payment initiation |
| Barber | `BARBER` | All subscription routes |
| Admin | `ADMIN` | Payout retry only |

**All subscription routes require `ROLES.BARBER`**.

---

## 7. Required Test Data

### 7.1 Test Users

| Role | Phone | Email | Status |
|---|---|---|---|
| Barber (primary) | `9876543211` | `test.barber@example.com` | Must be fully onboarded |
| Customer (optional) | `9876543210` | `test.customer@example.com` | For indirect subscription testing |

### 7.2 DB State Expectations Before Testing

After barber onboarding, MongoDB must contain:
- `users` collection: one document with `roleType: "BARBER"`, `phoneNumber: "+919876543211"`
- `barbers` collection: one document with `userId` pointing to the barber user
- `shops` collection: one document with `barberId` pointing to the barber
- `subscriptions` collection: one document auto-created with `planId: "PLAN_BASIC"`, `status: "ACTIVE"` (upserted on first `GET /subscriptions/me` call or during onboarding)

### 7.3 Prepare Test Data Checklist

```
[ ] Barber registered and onboarded
[ ] barber_access_token captured in Postman
[ ] barber_profile_id (Barber._id) known and set in collection variables
[ ] RAZORPAY_PLAN_ID_POPULAR set in .env and in Postman collection variable
[ ] RAZORPAY_PLAN_ID_ADVANCED set in .env and in Postman collection variable
[ ] razorpay_webhook_secret matches .env RAZORPAY_WEBHOOK_SECRET in Postman
[ ] Server running on localhost:5000
```

---

## 8. Route Testing Sequence

### 8.1 Complete Execution Order

The following sequence is the ONLY order that guarantees reproducibility without manual DB cleanup between sections.

```
PHASE 0: Infrastructure Verification
  → GET  /api/v1/health                               (verify server is running)

PHASE 1: Authentication (prerequisite for everything)
  → POST /api/v1/auth/otp/send                        (send OTP to barber)
  → POST /api/v1/auth/otp/verify                      (capture barber_access_token)
  → POST /api/v1/onboarding/barbers                   (first-run only)

PHASE 2: Plan Discovery (public, no auth)
  → GET  /api/v1/subscriptions/plans                  (Test A-1)

PHASE 3: Baseline State Verification
  → GET  /api/v1/subscriptions/me                     (Test B-1, verify PLAN_BASIC)

PHASE 4: New Subscription Creation
  → POST /api/v1/subscriptions/subscribe              (Test C-1, POPULAR)
  → GET  /api/v1/subscriptions/me                     (Test C-2, verify PENDING_PAYMENT)
  → GET  /api/v1/subscriptions/transactions           (Test C-3, verify CREATION transaction)

PHASE 5: Webhook Activation (simulate Razorpay)
  → POST /api/v1/subscriptions/webhook                (Test D-1, subscription.activated)
  → GET  /api/v1/subscriptions/me                     (Test D-2, verify ACTIVE + entitlements)
  → POST /api/v1/subscriptions/webhook                (Test D-3, duplicate webhook)

PHASE 6: Media Entitlement Verification (indirect subscription test)
  → POST /api/v1/media/upload-url                     (Test E-1, POPULAR quota = 30 photos)
  → GET  /api/v1/media/gallery/stats                  (Test E-2, verify limits)

PHASE 7: Plan Upgrade
  → POST /api/v1/subscriptions/upgrade                (Test F-1, POPULAR → ADVANCED)
  → GET  /api/v1/subscriptions/me                     (Test F-2, verify ADVANCED entitlements)
  → GET  /api/v1/subscriptions/transactions           (Test F-3, verify UPGRADE transaction)

PHASE 8: Plan Downgrade (deferred)
  → POST /api/v1/subscriptions/downgrade              (Test G-1, ADVANCED → POPULAR)
  → GET  /api/v1/subscriptions/me                     (Test G-2, verify pendingPlanId set)
  → GET  /api/v1/subscriptions/transactions           (Test G-3, verify DOWNGRADE transaction)

PHASE 9: Webhook Renewal (simulates monthly billing)
  → POST /api/v1/subscriptions/webhook                (Test H-1, subscription.charged)
  → GET  /api/v1/subscriptions/me                     (Test H-2, verify downgrade applied + statements reset)

PHASE 10: Cancellation
  → POST /api/v1/subscriptions/cancel                 (Test I-1)
  → GET  /api/v1/subscriptions/me                     (Test I-2, verify CANCELLED but still entitled)
  → POST /api/v1/subscriptions/webhook                (Test I-3, subscription.cancelled confirmation)
  → POST /api/v1/subscriptions/cancel                 (Test I-4, 409 — already cancelled)

PHASE 11: Statement Quota Test (subscription-gated)
  → GET  /api/v1/earnings/transactions/statement      (Test J-1, within quota)
  → GET  /api/v1/earnings/transactions/statement      (Test J-2, quota exhaustion for PLAN_BASIC = 1/cycle)

PHASE 12: Expiry Simulation
  → POST /api/v1/subscriptions/webhook                (Test K-1, subscription.halted)
  → GET  /api/v1/subscriptions/me                     (Test K-2, verify PLAN_BASIC entitlements)
  → POST /api/v1/media/upload-url                     (Test K-3, verify restricted to 10 photos)

PHASE 13: Re-subscribe from Expired State
  → POST /api/v1/subscriptions/subscribe              (Test L-1, subscribe again)

PHASE 14: Failure & Edge Case Scenarios (see Section 12)
```

---

## 9. Detailed Route-by-Route Testing

### TEST A-1: List Subscription Plans

**Route:** `GET /api/v1/subscriptions/plans`
**Auth Required:** No
**Role Required:** None

**Why Test:** This is the public plan catalog. It must return all three plans in ascending `sortOrder` with correct pricing and capabilities. No auth needed — used by marketing pages and app onboarding screens.

**Request:**
```
Method: GET
URL: {{base_url}}/{{api_prefix}}/subscriptions/plans
Headers: (none required)
```

**Expected Response (HTTP 200):**
```json
{
  "success": true,
  "message": "Subscription plans fetched",
  "data": [
    {
      "id": "PLAN_BASIC",
      "name": "Basic",
      "label": "Starter Plan",
      "isFree": true,
      "pricing": { "amount": 0, "currency": "INR", "period": "monthly", "displayPrice": "Free" },
      "capabilities": {
        "maxPhotos": 10,
        "maxVideos": 2,
        "maxStatementsPerCycle": 1,
        "badge": "NONE",
        "visibilityTier": "NONE",
        "supportTier": "STANDARD",
        "analyticsAccess": false,
        "promotionalTools": false
      }
    },
    {
      "id": "PLAN_POPULAR",
      "name": "Popular",
      "label": "Most Recommended",
      "isFree": false,
      "pricing": { "amount": 29900, "currency": "INR", "period": "monthly", "displayPrice": "INR 299/month" },
      "capabilities": {
        "maxPhotos": 30,
        "maxVideos": 10,
        "maxStatementsPerCycle": 5,
        "badge": "BLUE",
        "visibilityTier": "LOCAL",
        "supportTier": "PREMIUM_BASIC",
        "analyticsAccess": false,
        "promotionalTools": false
      }
    },
    {
      "id": "PLAN_ADVANCED",
      "name": "Advanced",
      "label": "Premium Growth",
      "isFree": false,
      "pricing": { "amount": 49900, "currency": "INR", "period": "monthly", "displayPrice": "INR 499/month" },
      "capabilities": {
        "maxPhotos": 50,
        "maxVideos": 15,
        "maxStatementsPerCycle": 10,
        "badge": "YELLOW",
        "visibilityTier": "PRIORITY",
        "supportTier": "PREMIUM_PRIORITY",
        "analyticsAccess": true,
        "promotionalTools": true
      }
    }
  ]
}
```

**Assertions:**
- `data` is an array of exactly 3 items
- `data[0].id === "PLAN_BASIC"` (sortOrder 0, first)
- `data[1].id === "PLAN_POPULAR"` (sortOrder 1, second)
- `data[2].id === "PLAN_ADVANCED"` (sortOrder 2, third)
- No internal Mongoose fields (`__v`, `_id`, `$__`) present in response

**Failure Scenarios:**
| Scenario | Expected |
|---|---|
| `RAZORPAY_PLAN_ID_POPULAR` missing | Plans still returned (razorpayPlanId field absent/null in internal representation) |
| Invalid request method (POST) | 404 or 405 |

---

### TEST B-1: Get My Subscription (Baseline State)

**Route:** `GET /api/v1/subscriptions/me`
**Auth Required:** Yes (`ROLES.BARBER`)
**Role Required:** BARBER

**Why Test:** Returns current subscription state, usage counters, and resolved entitlements. Used by the mobile app to gate UI features. After fresh onboarding, should show `PLAN_BASIC` with no paid features.

**Request:**
```
Method: GET
URL: {{base_url}}/{{api_prefix}}/subscriptions/me
Headers:
  Authorization: Bearer {{barber_access_token}}
```

**Expected Response (HTTP 200) — fresh barber:**
```json
{
  "success": true,
  "message": "Subscription fetched",
  "data": {
    "id": "<MongoDB ObjectId>",
    "planId": "PLAN_BASIC",
    "status": "ACTIVE",
    "currentPeriodStart": null,
    "currentPeriodEnd": null,
    "cancelAtPeriodEnd": false,
    "cancelledAt": null,
    "pendingPlanId": null,
    "planName": "Basic",
    "planLabel": "Starter Plan",
    "isFree": true,
    "usage": {
      "photos": { "used": 0, "limit": 10, "remaining": 10 },
      "videos": { "used": 0, "limit": 2, "remaining": 2 },
      "statements": { "used": 0, "limit": 1, "remaining": 1 }
    },
    "badge": "NONE",
    "visibilityTier": "NONE",
    "supportTier": "STANDARD",
    "analyticsAccess": false,
    "promotionalTools": false
  }
}
```

**DB Auto-Creation Side Effect:** If the barber has no subscription record, `ensureDefaultSubscription()` will `upsert` one with `PLAN_BASIC`. This is transparent to the caller.

**Failure Scenarios:**
| Scenario | Expected HTTP | Expected Body |
|---|---|---|
| No auth header | 401 | `"No token provided"` |
| Wrong role (CUSTOMER token) | 403 | `"Access denied. Required role(s): BARBER"` |
| Expired access token | 401 | `"Access token has expired..."` |
| Barber profile not found | 404 | `"Barber profile"` |

---

### TEST C-1: Subscribe to Paid Plan

**Route:** `POST /api/v1/subscriptions/subscribe`
**Auth Required:** Yes (`ROLES.BARBER`)
**Role Required:** BARBER

**Why Test:** Creates the Razorpay subscription. This is the entry point into the paid subscription lifecycle. It creates a Razorpay Customer if one doesn't exist, then creates a Razorpay Subscription.

**Prerequisites:**
- Barber must be on `PLAN_BASIC` or in `PENDING_PAYMENT` state (not already active paid)
- `RAZORPAY_PLAN_ID_POPULAR` must be set in `.env`

**Request:**
```
Method: POST
URL: {{base_url}}/{{api_prefix}}/subscriptions/subscribe
Headers:
  Authorization: Bearer {{barber_access_token}}
  Content-Type: application/json
Body:
{
  "planId": "PLAN_POPULAR"
}
```

**Expected Response (HTTP 201):**
```json
{
  "success": true,
  "message": "Subscription checkout created",
  "data": {
    "subscriptionId": "<internal MongoDB _id of subscription record>",
    "razorpaySubscriptionId": "sub_<razorpay_id>",
    "checkoutUrl": "https://rzp.io/l/<short_url>",
    "razorpayKeyId": "rzp_test_<key>"
  }
}
```

**Post-Request Automation (Postman script):**
```javascript
const response = pm.response.json();
if (response.data?.razorpaySubscriptionId) {
  pm.collectionVariables.set('razorpay_subscription_id', response.data.razorpaySubscriptionId);
  pm.globals.set('razorpay_subscription_id', response.data.razorpaySubscriptionId);
}
```

**DB State After This Call:**
- `subscriptions.status = "PENDING_PAYMENT"`
- `subscriptions.planId = "PLAN_POPULAR"`
- `subscriptions.razorpaySubscriptionId = "sub_<id>"`
- `subscriptions.razorpayCustomerId = "cust_<id>"`
- `subscription_transactions`: one new record `{ type: "CREATION", source: "API", status: "PENDING" }`

**Failure Scenarios:**
| Scenario | Expected HTTP | Expected Body |
|---|---|---|
| `planId: "PLAN_BASIC"` | 400 | `"Cannot create a billing subscription for the free plan"` |
| `planId: "PLAN_UNKNOWN"` | 400 | `"Invalid plan ID"` (Joi validation) |
| Already active paid subscription | 409 | `"You already have an active subscription. Cancel or downgrade first."` |
| `RAZORPAY_PLAN_ID_POPULAR` not configured | 500 | `"Razorpay plan ID is not configured for PLAN_POPULAR"` |
| Razorpay API down | 500 | Payment gateway error |
| Missing `planId` in body | 400 | Validation error, `"Plan ID is required"` |
| No auth | 401 | Unauthorized |
| Customer role | 403 | Forbidden |

---

### TEST C-2: Verify Pending Payment State

**Route:** `GET /api/v1/subscriptions/me`

**Request:** Same as B-1.

**Expected State (after C-1 success):**
```json
{
  "data": {
    "planId": "PLAN_POPULAR",
    "status": "PENDING_PAYMENT",
    "usage": {
      "photos": { "used": 0, "limit": 10, "remaining": 10 },
      "videos": { "used": 0, "limit": 2, "remaining": 2 }
    },
    "badge": "NONE",
    "isFree": true
  }
}
```

> **Critical Insight:** Even though `planId` is `PLAN_POPULAR`, the entitlements show BASIC limits. This is because `PENDING_PAYMENT` is not in the `ACTIVE_ENTITLEMENT_STATUSES` set. The barber does not get paid features until the `subscription.activated` webhook arrives.

---

### TEST C-3: Verify Creation Transaction

**Route:** `GET /api/v1/subscriptions/transactions`
**Auth Required:** Yes (`ROLES.BARBER`)

**Request:**
```
Method: GET
URL: {{base_url}}/{{api_prefix}}/subscriptions/transactions?page=1&limit=20
Headers:
  Authorization: Bearer {{barber_access_token}}
```

**Expected Response (HTTP 200):**
```json
{
  "success": true,
  "message": "Subscription transactions fetched",
  "data": [
    {
      "id": "<objectId>",
      "type": "CREATION",
      "source": "API",
      "fromPlan": "PLAN_BASIC",
      "toPlan": "PLAN_POPULAR",
      "amount": 29900,
      "currency": "INR",
      "status": "PENDING",
      "razorpayPaymentId": null,
      "razorpayInvoiceId": null,
      "createdAt": "<ISO timestamp>"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### TEST D-1: Simulate `subscription.activated` Webhook

**Route:** `POST /api/v1/subscriptions/webhook`
**Auth Required:** No (but signature verification required)
**Note:** The subscription webhook endpoint receives raw JSON as Buffer. The `x-razorpay-signature` header is required.

**Why Test:** This is the event that actually activates the subscription and grants entitlements. Without this webhook, the barber remains on BASIC limits.

**Pre-request Script (signs the body):**
```javascript
const secret = pm.environment.get('razorpay_webhook_secret') 
  || pm.collectionVariables.get('razorpay_webhook_secret');
const body = pm.request.body && pm.request.body.raw ? pm.request.body.raw : '';
if (secret && typeof CryptoJS !== 'undefined') {
  const signature = CryptoJS.HmacSHA256(body, secret).toString(CryptoJS.enc.Hex);
  pm.request.headers.upsert({ key: 'x-razorpay-signature', value: signature });
}
```

**Request:**
```
Method: POST
URL: {{base_url}}/{{api_prefix}}/subscriptions/webhook
Headers:
  Content-Type: application/json
  x-razorpay-signature: <computed by pre-request script>
Body (raw JSON):
{
  "id": "evt_subscription_activated_001",
  "entity": "event",
  "event": "subscription.activated",
  "created_at": 1770000000,
  "payload": {
    "subscription": {
      "entity": {
        "id": "{{razorpay_subscription_id}}",
        "plan_id": "{{razorpay_plan_id_popular}}",
        "customer_id": "cust_postman_123",
        "status": "active",
        "current_start": 1770000000,
        "current_end": 1772592000,
        "notes": {
          "barber_id": "{{barber_profile_id}}",
          "plan_type": "PLAN_POPULAR"
        }
      }
    },
    "payment": {
      "entity": {
        "id": "pay_postman_activation_001",
        "amount": 29900,
        "currency": "INR",
        "status": "captured",
        "method": "upi"
      }
    }
  }
}
```

**Important Notes on Timestamps:**
- `created_at` is a Unix timestamp in seconds
- The server validates that `Date.now() - (created_at * 1000)` ≤ 300,000ms (300 seconds tolerance)
- For testing, use a recent Unix timestamp: `Math.floor(Date.now() / 1000)`
- Stale timestamps generate a warning log but do NOT fail the webhook (the code only logs, doesn't throw)

**Expected Response (HTTP 200):**
```json
{
  "success": true,
  "message": "Subscription webhook processed",
  "data": {
    "received": true,
    "acknowledged": true,
    "eventId": "evt_subscription_activated_001"
  }
}
```

**DB State After This Webhook:**
- `subscriptions.status = "ACTIVE"`
- `subscriptions.currentPeriodStart = Date(1770000000 * 1000)`
- `subscriptions.currentPeriodEnd = Date(1772592000 * 1000)`
- `subscriptions.lastRenewalAt = <now>`
- `subscriptions.cancelAtPeriodEnd = false`
- `subscription_transactions`: new record `{ type: "ACTIVATION", source: "WEBHOOK", amount: 29900 }`
- Gallery media: any previously hidden media reactivated up to PLAN_POPULAR limits (30 photos, 10 videos)

**Failure Scenarios:**
| Scenario | Expected HTTP | Expected Body |
|---|---|---|
| Missing `x-razorpay-signature` header | 400 | `"Invalid webhook signature"` |
| Wrong signature (body tampered) | 400 | `"Invalid webhook signature"` |
| Unknown `razorpaySubscriptionId` | 400 | `"Subscription not found for webhook"` |
| Missing subscription entity in payload | 400 | `"Webhook payload missing subscription entity"` |
| Content-Type not set | 400 | Parse error |

---

### TEST D-2: Verify Active Entitlements After Activation

**Route:** `GET /api/v1/subscriptions/me`

**Expected State (after D-1):**
```json
{
  "data": {
    "planId": "PLAN_POPULAR",
    "status": "ACTIVE",
    "currentPeriodStart": "<ISO date>",
    "currentPeriodEnd": "<ISO date>",
    "cancelAtPeriodEnd": false,
    "pendingPlanId": null,
    "planName": "Popular",
    "isFree": false,
    "usage": {
      "photos": { "used": 0, "limit": 30, "remaining": 30 },
      "videos": { "used": 0, "limit": 10, "remaining": 10 },
      "statements": { "used": 0, "limit": 5, "remaining": 5 }
    },
    "badge": "BLUE",
    "visibilityTier": "LOCAL",
    "supportTier": "PREMIUM_BASIC",
    "analyticsAccess": false,
    "promotionalTools": false
  }
}
```

---

### TEST D-3: Duplicate Webhook Idempotency

**Route:** `POST /api/v1/subscriptions/webhook`

Send the exact same payload as D-1 (same `id: "evt_subscription_activated_001"`).

**Expected Response (HTTP 200):**
```json
{
  "success": true,
  "message": "Subscription webhook processed",
  "data": {
    "received": true,
    "acknowledged": true,
    "duplicate": true,
    "eventId": "evt_subscription_activated_001"
  }
}
```

**Verification:** Check `subscription_transactions` in DB — no new record should be created for the duplicate event.

---

### TEST F-1: Upgrade Subscription (POPULAR → ADVANCED)

**Route:** `POST /api/v1/subscriptions/upgrade`
**Auth Required:** Yes (`ROLES.BARBER`)
**Prerequisites:** Subscription must be ACTIVE on a paid plan (not PLAN_BASIC)

**Request:**
```
Method: POST
URL: {{base_url}}/{{api_prefix}}/subscriptions/upgrade
Headers:
  Authorization: Bearer {{barber_access_token}}
  Content-Type: application/json
Body:
{
  "planId": "PLAN_ADVANCED"
}
```

**Expected Response (HTTP 200):**
```json
{
  "success": true,
  "message": "Subscription upgraded successfully",
  "data": {
    "id": "<objectId>",
    "planId": "PLAN_ADVANCED",
    "status": "ACTIVE",
    "cancelAtPeriodEnd": false,
    "pendingPlanId": null
  }
}
```

**DB State After:**
- `subscriptions.planId = "PLAN_ADVANCED"`
- `subscriptions.status = "ACTIVE"`
- `subscriptions.pendingPlanId = null`
- `subscription_transactions`: new record `{ type: "UPGRADE", source: "API", fromPlan: "PLAN_POPULAR", toPlan: "PLAN_ADVANCED" }`
- Gallery media: reactivateHiddenMedia() called (reactivates up to 50 photos, 15 videos)

**Failure Scenarios:**
| Scenario | Expected HTTP | Expected Body |
|---|---|---|
| `planId: "PLAN_POPULAR"` (same plan) | 400 | `"Already on this plan"` |
| `planId: "PLAN_BASIC"` (downgrade attempt via upgrade endpoint) | 400 | `"This is not an upgrade. Use the downgrade endpoint."` |
| Currently on PLAN_BASIC (no `razorpaySubscriptionId`) | 400 | `"To upgrade from Basic, use the subscribe endpoint..."` |
| `PLAN_ADVANCED` Razorpay plan not configured | 500 | Config error |

---

### TEST G-1: Downgrade Subscription (ADVANCED → POPULAR, Deferred)

**Route:** `POST /api/v1/subscriptions/downgrade`
**Auth Required:** Yes (`ROLES.BARBER`)
**Prerequisites:** Subscription must be ACTIVE on PLAN_ADVANCED

**Request:**
```
Method: POST
URL: {{base_url}}/{{api_prefix}}/subscriptions/downgrade
Headers:
  Authorization: Bearer {{barber_access_token}}
  Content-Type: application/json
Body:
{
  "planId": "PLAN_POPULAR"
}
```

**Expected Response (HTTP 200):**
```json
{
  "success": true,
  "message": "Downgrade scheduled for next billing cycle",
  "data": {
    "id": "<objectId>",
    "planId": "PLAN_ADVANCED",
    "status": "ACTIVE",
    "pendingPlanId": "PLAN_POPULAR"
  }
}
```

**Note:** The plan does NOT change immediately. `planId` remains `PLAN_ADVANCED`. Only `pendingPlanId` is set to `PLAN_POPULAR`. The actual change happens when the next `subscription.charged` webhook arrives.

**DB State After:**
- `subscriptions.planId = "PLAN_ADVANCED"` (unchanged)
- `subscriptions.pendingPlanId = "PLAN_POPULAR"`
- `subscription_transactions`: `{ type: "DOWNGRADE", source: "API", fromPlan: "PLAN_ADVANCED", toPlan: "PLAN_POPULAR", metadata.appliesAtNextRenewal: true }`

**Failure Scenarios:**
| Scenario | Expected HTTP | Expected Body |
|---|---|---|
| `planId: "PLAN_ADVANCED"` (same plan) | 400 | `"Already on this plan"` |
| `planId: "PLAN_POPULAR"` when on PLAN_POPULAR | 400 | `"Already on this plan"` |
| Downgrade via upgrade endpoint | 400 | `"This is not an upgrade. Use the downgrade endpoint."` |

**Special Case — Downgrade to PLAN_BASIC:**
```json
{ "planId": "PLAN_BASIC" }
```
This internally calls `cancelSubscription()`. Response is the cancellation response, not a downgrade response. Status becomes `CANCELLED`.

---

### TEST H-1: Simulate Renewal Webhook (`subscription.charged`)

**Route:** `POST /api/v1/subscriptions/webhook`

**Why Test:** This event triggers the pending plan change (if any) AND resets the `statementsDownloadedThisPeriod` counter.

**Request Body:**
```json
{
  "id": "evt_subscription_charged_001",
  "entity": "event",
  "event": "subscription.charged",
  "created_at": 1772592000,
  "payload": {
    "subscription": {
      "entity": {
        "id": "{{razorpay_subscription_id}}",
        "plan_id": "{{razorpay_plan_id_popular}}",
        "status": "active",
        "current_start": 1772592000,
        "current_end": 1775184000
      }
    },
    "payment": {
      "entity": {
        "id": "pay_postman_renewal_001",
        "amount": 29900,
        "currency": "INR",
        "status": "captured",
        "invoice_id": "inv_postman_renewal_001"
      }
    }
  }
}
```

**DB State After:**
- `subscriptions.currentPeriodStart/End` updated to renewal window
- `subscriptions.lastRenewalAt = <now>`
- `subscriptions.statementsDownloadedThisPeriod = 0` (RESET)
- If `pendingPlanId` was set: `planId → PLAN_POPULAR`, `pendingPlanId → null`, `applyHiddenMediaPolicy()` called

**Verify:** After this webhook, call `GET /subscriptions/me` and confirm `pendingPlanId` is `null` and `planId` is `PLAN_POPULAR`.

---

### TEST I-1: Cancel Subscription

**Route:** `POST /api/v1/subscriptions/cancel`
**Auth Required:** Yes (`ROLES.BARBER`)
**Prerequisites:** Active paid subscription

**Request:**
```
Method: POST
URL: {{base_url}}/{{api_prefix}}/subscriptions/cancel
Headers:
  Authorization: Bearer {{barber_access_token}}
```
*(No request body required)*

**Expected Response (HTTP 200):**
```json
{
  "success": true,
  "message": "Subscription will be cancelled at the end of the current billing cycle",
  "data": {
    "planId": "PLAN_POPULAR",
    "status": "CANCELLED",
    "cancelAtPeriodEnd": true,
    "cancelledAt": "<ISO timestamp>"
  }
}
```

**Key Point:** The barber retains full POPULAR entitlements until `currentPeriodEnd` because `isEntitled()` returns `true` for `CANCELLED` status when `Date.now() < currentPeriodEnd`.

**Failure Scenarios:**
| Scenario | Expected HTTP | Expected Body |
|---|---|---|
| No active paid subscription (on PLAN_BASIC) | 400 | `"No active paid subscription to cancel"` |
| Already cancelled | 409 | `"Subscription is already set to cancel"` |
| No auth | 401 | Unauthorized |

---

### TEST J-1 & J-2: Statement Quota Testing

**Route:** `GET /api/v1/earnings/transactions/statement`
**Auth Required:** Yes (`ROLES.BARBER`)
**Middleware:** `checkStatementQuota()` from `entitlement.middleware.js`

**Why Test:** This route enforces `maxStatementsPerCycle` from the active plan. PLAN_BASIC allows only 1 download per billing cycle.

**Request:**
```
Method: GET
URL: {{base_url}}/{{api_prefix}}/earnings/transactions/statement?dateFrom=2024-01-01&dateTo=2024-12-31
Headers:
  Authorization: Bearer {{barber_access_token}}
```

**Test J-1 (First download — should succeed):**
- Expected: HTTP 200, statement CSV/data returned
- Side effect: `subscription.statementsDownloadedThisPeriod` incremented by 1

**Test J-2 (Second download — should fail for PLAN_BASIC):**
- Expected: HTTP 403
- Body: `"You have reached your statement download limit (1). Upgrade your plan for more downloads."`

**Assertions:**
- After J-1: `GET /subscriptions/me` shows `statements.used = 1, remaining = 0` for PLAN_BASIC
- After renewal webhook: `statementsDownloadedThisPeriod` resets to 0

---

### TEST K-1: Simulate Subscription Halted (Payment Failure Exhausted)

**Route:** `POST /api/v1/subscriptions/webhook`

**Request Body:**
```json
{
  "id": "evt_subscription_halted_001",
  "entity": "event",
  "event": "subscription.halted",
  "created_at": 1772592000,
  "payload": {
    "subscription": {
      "entity": {
        "id": "{{razorpay_subscription_id}}",
        "plan_id": "{{razorpay_plan_id_popular}}",
        "status": "halted"
      }
    }
  }
}
```

**DB State After:**
- `subscriptions.planId = "PLAN_BASIC"`
- `subscriptions.status = "EXPIRED"`
- `subscriptions.razorpaySubscriptionId = null`
- `subscriptions.currentPeriodStart/End = null`
- `subscriptions.statementsDownloadedThisPeriod = 0`
- `subscription_transactions`: `{ type: "EXPIRY", source: "WEBHOOK", metadata.reason: "All Razorpay payment retries exhausted" }`
- Gallery media: `applyHiddenMediaPolicy()` called → photos > 10 hidden, videos > 2 hidden

**After Halted: Verify PLAN_BASIC Entitlements:**
```json
{
  "data": {
    "planId": "PLAN_BASIC",
    "status": "EXPIRED",
    "usage": {
      "photos": { "limit": 10 },
      "videos": { "limit": 2 },
      "statements": { "limit": 1 }
    },
    "badge": "NONE",
    "visibilityTier": "NONE",
    "analyticsAccess": false
  }
}
```

---

## 10. Subscription-Affected Routes (Indirect Dependencies)

These routes do NOT appear in `/subscriptions/*` but have hidden subscription dependencies.

### 10.1 Media Upload Route (Quota-Gated)

**Route:** `POST /api/v1/media/upload-url`
**Middleware:** `checkUploadQuota()` from `entitlement.middleware.js`

**How it works:**
1. Determines if uploaded content is `image` or `video`
2. Calls `entitlementService.canUploadPhoto()` or `canUploadVideo()`
3. Checks `totalPhotosUploaded` or `totalVideosUploaded` against plan limit
4. Rejects with 403 if quota exceeded

**Test Scenarios:**

| State | Upload Type | Expected |
|---|---|---|
| PLAN_BASIC, 0 uploads | Image | 200 (allowed, limit 10) |
| PLAN_BASIC, 10 images | Image | 403 `"upload limit (10). Upgrade your plan"` |
| PLAN_POPULAR active, 29 images | Image | 200 (allowed, limit 30) |
| PLAN_POPULAR active, 30 images | Image | 403 |
| PLAN_BASIC, 0 uploads | Video | 200 (allowed, limit 2) |
| PLAN_ADVANCED expired, 10 images | Image | 403 (reverts to PLAN_BASIC limit 10) |

**Request:**
```json
{
  "contentType": "image/jpeg",
  "purpose": "gallery"
}
```

### 10.2 Media Gallery Attachment (After Upload)

**Route:** `POST /api/v1/media/gallery`
**Note:** This route does NOT check quota directly (quota is checked at upload-url stage). However, `totalPhotosUploaded` counter is incremented in the subscription record after successful media confirmation.

### 10.3 Gallery Stats

**Route:** `GET /api/v1/media/gallery/stats`

Returns stats with subscription-aware limits. After plan change, limits reflect new plan.

### 10.4 Earnings Statement Download (Quota-Gated)

**Route:** `GET /api/v1/earnings/transactions/statement`
**Middleware:** `checkStatementQuota()`

Already covered in TEST J-1/J-2. Key points:
- Counter increments per successful download
- Counter resets on `subscription.charged` webhook (renewal)
- PLAN_BASIC: 1/cycle, PLAN_POPULAR: 5/cycle, PLAN_ADVANCED: 10/cycle

### 10.5 Shop Visibility

**Route:** `GET /api/v1/shops` (shop discovery/listing)

**Indirect Effect:** `visibilityTier` from subscription affects how shops are ranked in discovery results. PLAN_ADVANCED (`PRIORITY`) appears before PLAN_POPULAR (`LOCAL`) which appears before PLAN_BASIC (`NONE`). This affects ordering, not filtering. No route protection — the effect is in query ordering logic in `shop.service.js`.

### 10.6 Shop Profile (Badge Display)

**Route:** `GET /api/v1/shops/:id`

Returns `badge` field from entitlements. PLAN_BASIC → `"NONE"`, PLAN_POPULAR → `"BLUE"`, PLAN_ADVANCED → `"YELLOW"`. Test that after plan activation, `badge` field updates.

---

## 11. Webhook Testing

### 11.1 All Supported Webhook Event Types

| Event | Handler | Description |
|---|---|---|
| `subscription.activated` | `#handleSubscriptionActivated` | First payment received, subscription goes ACTIVE |
| `subscription.charged` | `#handleSubscriptionCharged` | Monthly renewal payment |
| `subscription.halted` | `#handleSubscriptionHalted` | All payment retries exhausted → EXPIRED |
| `subscription.cancelled` | `#handleSubscriptionCancelled` | Razorpay confirms cancellation |
| `subscription.paused` | `#handleSubscriptionPaused` | Subscription paused by Razorpay |
| `subscription.resumed` | `#handleSubscriptionResumed` | Subscription resumed after pause |
| `subscription.updated` | `#handleSubscriptionUpdated` | Plan change confirmed by Razorpay |
| `payment.failed` | `#handlePaymentFailed` | Individual payment attempt failed (retry will follow) |

### 11.2 Webhook Payload Structure

```json
{
  "id": "evt_<unique_event_id>",         // Used as webhookEventId for idempotency
  "entity": "event",
  "event": "<event_type>",
  "created_at": <unix_timestamp_seconds>,
  "payload": {
    "subscription": {
      "entity": {
        "id": "<razorpay_subscription_id>",  // Must match DB record
        "plan_id": "<razorpay_plan_id>",
        "status": "<razorpay_status>",
        "current_start": <unix_timestamp>,
        "current_end": <unix_timestamp>
      }
    },
    "payment": {                          // Present for activated, charged, payment.failed
      "entity": {
        "id": "pay_<payment_id>",
        "amount": <amount_in_paise>,
        "currency": "INR",
        "status": "captured",
        "invoice_id": "inv_<invoice_id>"
      }
    }
  }
}
```

### 11.3 Generating Valid Webhook Signatures

**Node.js (for local testing scripts):**
```javascript
const crypto = require('crypto');
const body = JSON.stringify(payload);
const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
// Set header: x-razorpay-signature: <signature>
```

**Postman Pre-request Script (using CryptoJS):**
```javascript
const secret = pm.environment.get('razorpay_webhook_secret');
const body = pm.request.body.raw;
if (secret && typeof CryptoJS !== 'undefined') {
  const signature = CryptoJS.HmacSHA256(body, secret).toString(CryptoJS.enc.Hex);
  pm.request.headers.upsert({ key: 'x-razorpay-signature', value: signature });
}
```

> ⚠️ **CryptoJS Requirement**: The Postman pre-request script uses `CryptoJS`. Install it in Postman via `pm.require('crypto-js')` or ensure it's available in your Postman sandbox.

### 11.4 Webhook Testing Scenarios Table

| Test | Event | Body Key | Expected DB Change | Expected HTTP |
|---|---|---|---|---|
| Normal activation | `subscription.activated` | Valid `razorpaySubscriptionId` | status=ACTIVE | 200 |
| Normal renewal | `subscription.charged` | Valid `razorpaySubscriptionId` | periods updated | 200 |
| Duplicate event | `subscription.activated` | Same `id` as previous | No new TX record | 200 + `duplicate: true` |
| Invalid signature | Any | Tampered body | No DB change | 400 |
| Unknown subscription ID | `subscription.activated` | Unknown sub ID | No DB change | 400 |
| Unhandled event type | `subscription.something_new` | N/A | No DB change, logs warning | 200 |
| Payment failed with sub ID | `payment.failed` | Valid `subscription_id` | PAYMENT_FAILED TX created | 200 |
| Payment failed without sub ID | `payment.failed` | No `subscription_id` | No change | 200 (early return) |
| Subscription paused | `subscription.paused` | Valid sub ID | status=PAUSED | 200 |
| Subscription resumed | `subscription.resumed` | Valid sub ID | status=ACTIVE | 200 |
| Plan updated (upgrade) | `subscription.updated` | New plan_id | planId updated | 200 |
| Plan updated (no change) | `subscription.updated` | Same plan_id | No change | 200 |

### 11.5 Webhook for `subscription.cancelled` (Confirmation)

```json
{
  "id": "evt_subscription_cancelled_001",
  "event": "subscription.cancelled",
  "created_at": 1772592000,
  "payload": {
    "subscription": {
      "entity": {
        "id": "{{razorpay_subscription_id}}",
        "status": "cancelled",
        "current_end": 1775184000
      }
    }
  }
}
```

**If already CANCELLED in DB (from API call):** Creates a confirmation transaction. Status stays CANCELLED. Log says "Confirmation of API-initiated cancellation".

**If NOT yet CANCELLED in DB (external cancellation):** Status updated to CANCELLED, creates transaction. Log says "External cancellation".

### 11.6 Webhook for `subscription.paused`

```json
{
  "id": "evt_subscription_paused_001",
  "event": "subscription.paused",
  "created_at": 1772592000,
  "payload": {
    "subscription": {
      "entity": {
        "id": "{{razorpay_subscription_id}}",
        "status": "paused"
      }
    }
  }
}
```

**After pause:** Barber retains entitlements (PAUSED is in `ACTIVE_ENTITLEMENT_STATUSES`). Useful when a barber manually pauses on Razorpay dashboard.

### 11.7 Webhook for `payment.failed`

```json
{
  "id": "evt_payment_failed_001",
  "event": "payment.failed",
  "created_at": 1772592000,
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_postman_failed_001",
        "subscription_id": "{{razorpay_subscription_id}}",
        "amount": 29900,
        "currency": "INR",
        "status": "failed",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Payment failed due to insufficient funds"
      }
    }
  }
}
```

**DB Effect:** Creates `PAYMENT_FAILED` transaction. Does NOT change subscription status (Razorpay will retry). Status only changes if/when `subscription.halted` is received.

---

## 12. Edge Cases & Failure Scenarios

### 12.1 Invalid Plan IDs

```json
{ "planId": "PLAN_NONEXISTENT" }
```
→ HTTP 400, Joi validation error: `"Invalid plan ID"`

```json
{ "planId": "PLAN_BASIC" }
```
→ For `/subscribe`: HTTP 400, `"Cannot create a billing subscription for the free plan"`
→ For `/upgrade` or `/downgrade`: Depends on transition type validation

### 12.2 Transition Violations

| Current Plan | Endpoint | Requested Plan | Expected |
|---|---|---|---|
| PLAN_POPULAR | `/upgrade` | PLAN_POPULAR | 400 `"Already on this plan"` |
| PLAN_POPULAR | `/upgrade` | PLAN_BASIC | 400 `"This is not an upgrade"` |
| PLAN_POPULAR | `/downgrade` | PLAN_ADVANCED | 400 `"This is not a downgrade"` |
| PLAN_BASIC | `/upgrade` | PLAN_POPULAR | 400 `"To upgrade from Basic, use subscribe endpoint"` |
| PLAN_BASIC | `/cancel` | — | 400 `"No active paid subscription to cancel"` |
| PLAN_POPULAR `cancelAtPeriodEnd: true` | `/cancel` | — | 409 `"Subscription is already set to cancel"` |

### 12.3 Concurrent Subscription Creation

If two requests to `/subscribe` are sent simultaneously for the same barber:
- MongoDB optimistic concurrency (`{ optimisticConcurrency: true }` on schema) prevents double-write
- One will succeed with 201, the other will fail with a version conflict error
- Or the second will get 409 if the first completes quickly enough

### 12.4 Webhook Race Conditions

Two simultaneous webhooks with different `id` but same subscription:
- Both proceed to process
- If both try to create transactions: both succeed (different `id`s = different `webhookEventId` values)
- MongoDB unique index only prevents duplicate on same `webhookEventId`

Two simultaneous webhooks with SAME `id` (duplicate delivery):
- First one proceeds: creates transaction, updates subscription
- Second one: `existsByWebhookEventId()` check returns true → skipped (duplicate: true)
- Or: race condition where both pass the check, but second fails on unique index insert → caught by `isDuplicateWebhookEventError()` → returns `{duplicate: true}` without throwing

### 12.5 Re-subscription After Expiry

After `EXPIRED` state:
1. `POST /subscribe` should work — creates new Razorpay subscription
2. `razorpayCustomerId` is preserved (reused if already exists)
3. `razorpaySubscriptionId` is updated to new one
4. Status → `PENDING_PAYMENT` again

**Test:** Subscribe → activate → halted-webhook (expire) → subscribe again → verify PENDING_PAYMENT.

### 12.6 Downgrade to PLAN_BASIC via Downgrade Endpoint

```json
POST /subscriptions/downgrade
{ "planId": "PLAN_BASIC" }
```

This internally calls `cancelSubscription()`. The response will be the **cancellation** response format, NOT the downgrade message. Status becomes `CANCELLED` with `cancelAtPeriodEnd: true`. The message in the response will be `"Subscription will be cancelled at the end of the current billing cycle"`.

### 12.7 Invalid Authentication Scenarios

| Scenario | Route | Expected HTTP |
|---|---|---|
| No `Authorization` header | `GET /subscriptions/me` | 401 `"No token provided"` |
| Malformed `Bearer` (missing token) | Any protected route | 401 |
| Expired access token | Any protected route | 401 `"Access token has expired..."` |
| Valid access token but user soft-deleted | Any protected route | 401 `"Account is inactive or deleted"` |
| Customer token on barber-only route | `POST /subscribe` | 403 `"Access denied. Required role(s): BARBER"` |
| Valid token but no barber profile | `GET /subscriptions/me` | 404 `"Barber profile"` |

### 12.8 Missing Request Body Fields

| Missing Field | Route | Expected |
|---|---|---|
| `planId` missing | `POST /subscribe` | 400 `"Plan ID is required"` |
| Body entirely missing | `POST /subscribe` | 400 validation error |
| Extra unknown fields | `POST /subscribe` | Ignored by Joi (default) or 400 if `stripUnknown: false` |

### 12.9 Webhook Timestamp Tolerance

```javascript
// Server checks:
if (Date.now() - (created_at * 1000) > 300000) {
  logger.warn('Webhook timestamp outside tolerance')
  // WARNING ONLY — does NOT reject the webhook
}
```

This is a logging warning, NOT a hard rejection. Very old timestamps will produce log warnings but the webhook will still be processed. This is intentional to avoid losing real events.

### 12.10 Media Side Effects During Plan Changes

**Scenario: Downgrade from ADVANCED (50 photos) to POPULAR (30 photos) with 45 photos**
1. `subscription.charged` webhook arrives (renewal with pending downgrade)
2. `onSubscriptionRenewed()` applies `pendingPlanId → PLAN_POPULAR`
3. `onPlanDowngraded()` calls `applyHiddenMediaPolicy(barberId, PLAN_POPULAR)`
4. `hideExcessMedia()`: counts active photos (45), hides newest 15 (45-30=15)
5. Hidden photos still exist in DB with `status: "hidden"` — NOT deleted

**Verify after downgrade:**
- `GET /media/gallery` should return ≤ 30 active images
- Hidden images are invisible to public gallery but still stored
- On re-upgrade, `reactivateHiddenMedia()` restores them in oldest-first order

---

## 13. Subscription State Transition Testing

### 13.1 Complete State Machine Test Paths

**Path 1: Full Happy Path**
```
(no subscription) → subscribe(POPULAR) → activated-webhook → upgrade(ADVANCED)
                 → downgrade(POPULAR) → renewal-webhook → cancel
                 → period-end-cron → (PLAN_BASIC/EXPIRED)
```

**Path 2: Payment Failure Path**
```
subscribe(POPULAR) → payment.failed-webhook → (still PENDING_PAYMENT)
                  → payment.failed again → halted-webhook → (EXPIRED/PLAN_BASIC)
                  → subscribe again → (new subscription)
```

**Path 3: Pause/Resume Path**
```
subscribe(POPULAR) → activated → paused-webhook → (PAUSED, still entitled)
                  → resumed-webhook → (ACTIVE, back to normal)
```

**Path 4: External Cancellation**
```
subscribe(POPULAR) → activated → cancelled-webhook (no API cancel call)
                  → (CANCELLED, still entitled until period end)
                  → cron-expiry → (PLAN_BASIC/EXPIRED)
```

### 13.2 State Assertions at Each Transition

| Transition | Trigger | `status` | `planId` | `cancelAtPeriodEnd` | Entitled |
|---|---|---|---|---|---|
| Fresh barber | — | `ACTIVE` | `PLAN_BASIC` | false | true (BASIC) |
| POST /subscribe | API | `PENDING_PAYMENT` | `PLAN_POPULAR` | false | false (BASIC) |
| `subscription.activated` | Webhook | `ACTIVE` | `PLAN_POPULAR` | false | true (POPULAR) |
| POST /upgrade to ADV | API | `ACTIVE` | `PLAN_ADVANCED` | false | true (ADVANCED) |
| POST /downgrade to POP | API | `ACTIVE` | `PLAN_ADVANCED` | false | true (ADVANCED, pending change) |
| `subscription.charged` | Webhook | `ACTIVE` | `PLAN_POPULAR` | false | true (POPULAR, pending applied) |
| POST /cancel | API | `CANCELLED` | `PLAN_POPULAR` | true | true (POPULAR, until period end) |
| `subscription.cancelled` | Webhook | `CANCELLED` | `PLAN_POPULAR` | true | true (POPULAR, until period end) |
| CRON expiry / `subscription.halted` | CRON/Webhook | `EXPIRED` | `PLAN_BASIC` | false | false (BASIC) |
| `subscription.paused` | Webhook | `PAUSED` | `PLAN_POPULAR` | false | true (POPULAR) |
| `subscription.resumed` | Webhook | `ACTIVE` | `PLAN_POPULAR` | false | true (POPULAR) |

---

## 14. Role-Based Access Testing

### 14.1 Subscription Route Access Matrix

| Route | CUSTOMER | BARBER | ADMIN | Public |
|---|---|---|---|---|
| `GET /subscriptions/plans` | ✅ | ✅ | ✅ | ✅ |
| `GET /subscriptions/me` | ❌ (403) | ✅ | ❌ (403) | ❌ (401) |
| `POST /subscriptions/subscribe` | ❌ (403) | ✅ | ❌ (403) | ❌ (401) |
| `POST /subscriptions/upgrade` | ❌ (403) | ✅ | ❌ (403) | ❌ (401) |
| `POST /subscriptions/downgrade` | ❌ (403) | ✅ | ❌ (403) | ❌ (401) |
| `POST /subscriptions/cancel` | ❌ (403) | ✅ | ❌ (403) | ❌ (401) |
| `GET /subscriptions/transactions` | ❌ (403) | ✅ | ❌ (403) | ❌ (401) |
| `POST /subscriptions/webhook` | N/A | N/A | N/A | ✅ (sig-verified) |

### 14.2 Subscription-Affected Route Access

| Route | Who Affected | Subscription Gating |
|---|---|---|
| `POST /media/upload-url` | BARBER | `checkUploadQuota()` — rejects if quota exceeded |
| `GET /earnings/transactions/statement` | BARBER | `checkStatementQuota()` — rejects if quota exceeded |
| `GET /shops` | CUSTOMER/PUBLIC | `visibilityTier` affects ordering |
| `GET /shops/:id` | CUSTOMER/PUBLIC | `badge` field shown |

### 14.3 Role Enforcement Tests

**Test: Customer token on BARBER-only route**
```
POST /subscriptions/subscribe
Authorization: Bearer {{customer_access_token}}
Body: { "planId": "PLAN_POPULAR" }
```
→ Expected: HTTP 403, `"Access denied. Required role(s): BARBER"`

**Test: No auth on protected route**
```
GET /subscriptions/me
(no Authorization header)
```
→ Expected: HTTP 401, `"No token provided"`

**Test: Barber token on public route**
```
GET /subscriptions/plans
Authorization: Bearer {{barber_access_token}}
```
→ Expected: HTTP 200 (public route, auth ignored)

---

## 15. Regression Checklist

Run this checklist after any change to subscription-related files.

### 15.1 Subscription Core

```
[ ] GET /plans returns all 3 plans with correct capabilities
[ ] GET /me returns PLAN_BASIC for fresh barber
[ ] POST /subscribe creates Razorpay subscription and CREATION transaction
[ ] POST /subscribe with PLAN_BASIC → 400
[ ] POST /subscribe with active subscription → 409
[ ] subscription.activated webhook → status ACTIVE, entitlements updated
[ ] Duplicate webhook (same id) → 200 + duplicate:true, no new DB record
[ ] Invalid webhook signature → 400
[ ] POST /upgrade POPULAR→ADVANCED → immediate plan change
[ ] POST /upgrade with Basic plan → 400 (use subscribe instead)
[ ] POST /upgrade to lower plan → 400 (use downgrade)
[ ] POST /downgrade ADVANCED→POPULAR → pendingPlanId set, plan unchanged
[ ] POST /downgrade to BASIC → cancellation executed
[ ] subscription.charged webhook → periods updated, pendingPlanId applied, statements reset
[ ] POST /cancel → CANCELLED status, cancelAtPeriodEnd true
[ ] POST /cancel twice → 409
[ ] POST /cancel on BASIC → 400
[ ] subscription.halted webhook → EXPIRED, planId BASIC, media policy applied
[ ] subscription.cancelled webhook → confirmation record created
[ ] subscription.paused webhook → PAUSED, still entitled
[ ] subscription.resumed webhook → ACTIVE
[ ] subscription.updated webhook → planId updated
[ ] payment.failed webhook → PAYMENT_FAILED transaction, no status change
[ ] GET /transactions → paginated list of all transaction types
```

### 15.2 Entitlement Gating

```
[ ] Photo upload allowed within PLAN_BASIC quota (≤10)
[ ] Photo upload rejected at PLAN_BASIC quota (>10) → 403
[ ] Photo upload allowed for PLAN_POPULAR (up to 30)
[ ] Video upload allowed within quota
[ ] Video upload rejected at quota → 403
[ ] Statement download allowed within quota
[ ] Statement download rejected at quota → 403
[ ] Statement counter resets on renewal webhook
[ ] Media hidden on plan downgrade (excess over new limit)
[ ] Media reactivated on plan upgrade
[ ] CANCELLED but within period → still entitled (paid limits apply)
[ ] EXPIRED → PLAN_BASIC limits enforced
[ ] PENDING_PAYMENT → PLAN_BASIC limits enforced (not paid plan)
```

### 15.3 Authentication & Authorization

```
[ ] No token → 401
[ ] Expired token → 401
[ ] Customer token on barber route → 403
[ ] Valid barber token → 200
[ ] Token refresh works after expiry
[ ] Soft-deleted user cannot authenticate
```

---

## 16. Common Mistakes

### 16.1 Webhook Signature Failures

**Problem:** `400 Invalid webhook signature`

**Causes:**
1. `RAZORPAY_WEBHOOK_SECRET` in `.env` doesn't match `razorpay_webhook_secret` in Postman
2. Body was modified after signature was computed (whitespace changes, field reordering)
3. Missing `x-razorpay-signature` header
4. CryptoJS not available in Postman sandbox (use `require('crypto-js')`)
5. Signature computed from stringified body, but body received as Buffer had different encoding

**Fix:** Ensure the **exact bytes** of the request body are used for HMAC. The server receives raw bytes as Buffer (from `express.raw({ type: 'application/json' })`). The Postman body must be exactly as-is.

### 16.2 Postman Missing Barber Profile ID

**Problem:** Webhook test uses `{{barber_profile_id}}` but it's empty.

**Fix:** Set `barber_profile_id` in Postman collection variables. Get it from:
- MongoDB directly: `db.barbers.findOne({ userId: <your user id> })._id`
- Or from `GET /api/v1/shops/me` response: the barber's ID is in the profile data

### 16.3 Testing Upgrade Without Active Subscription

**Problem:** `POST /upgrade` returns `400 "To upgrade from Basic, use the subscribe endpoint..."`

**Root Cause:** The barber is on PLAN_BASIC and has no `razorpaySubscriptionId`. You cannot upgrade from Basic — you must `/subscribe` first, complete payment (or simulate activation webhook), then upgrade.

### 16.4 Plan IDs Not Matching

**Problem:** Webhook with `plan_id: "plan_test_popular"` doesn't match DB record.

**Root Cause:** `resolveRazorpayPlanId()` maps Razorpay plan IDs (from `RAZORPAY_PLAN_ID_POPULAR` env var) to internal IDs (`PLAN_POPULAR`). If the Postman collection variable `razorpay_plan_id_popular` doesn't match what's in `.env`, the webhook won't find a matching plan.

**Fix:** Ensure `razorpay_plan_id_popular` in Postman equals the value of `RAZORPAY_PLAN_ID_POPULAR` in `.env`.

### 16.5 Token Expiry During Long Sessions

**Problem:** After 15 minutes, all subscription API calls return 401.

**Fix:** Refresh the token:
```
POST /api/v1/auth/token/refresh
Body: { "refreshToken": "{{barber_refresh_token}}" }
```
The new `accessToken` is auto-captured if the Postman test script is set up.

### 16.6 Subscription Not Found in Webhook

**Problem:** `400 "Subscription not found for webhook"`

**Root Cause:** The `razorpaySubscriptionId` in the webhook body doesn't match any record in the `subscriptions` collection. This happens when:
- The test subscription was created in a different environment
- The DB was reset but `razorpay_subscription_id` Postman variable is stale
- Using a placeholder like `sub_postman_123` instead of the real ID

**Fix:** After `POST /subscribe`, the `razorpaySubscriptionId` is auto-captured in Postman. Ensure `{{razorpay_subscription_id}}` is set correctly.

---

## 17. Debugging Guidance

### 17.1 Check Server Logs

The server logs all subscription events at different levels:

```
[SubscriptionService] Creating subscription { barberId, planId }
[SubscriptionWebhook] Webhook received { eventType, eventId }
[SubscriptionWebhook] Duplicate webhook, skipping { eventId }
[SubscriptionWebhook] Webhook signature verification failed
[RazorpaySubscriptionAdapter] Customer created { customerId }
[RazorpaySubscriptionAdapter] Subscription created { razorpaySubscriptionId, planId }
[LifecycleOrchestrator] Subscription activated { barberId, planId }
[LifecycleOrchestrator] Hidden excess gallery media { shopId, mediaType, limit, hiddenCount }
[EntitlementResolver] Missing subscription, defaulting to Basic { barberId }
```

Set `LOG_LEVEL=debug` in `.env` for maximum verbosity.

### 17.2 MongoDB Verification Queries

After key operations, verify DB state directly:

```javascript
// Check subscription state
db.subscriptions.findOne({ barberId: ObjectId("...") })

// Check transaction history
db.subscription_transactions.find({ barberId: ObjectId("...") }).sort({ createdAt: -1 })

// Check for duplicate webhook events
db.subscription_transactions.find({ webhookEventId: "evt_subscription_activated_001" })

// Check media status after plan change
db.media.find({ shopId: ObjectId("..."), purpose: "gallery" }, { status: 1, mediaType: 1, createdAt: 1 })

// Count hidden media
db.media.countDocuments({ shopId: ObjectId("..."), status: "hidden" })

// Count active gallery media
db.media.countDocuments({ shopId: ObjectId("..."), status: "ready", purpose: "gallery" })
```

### 17.3 Common HTTP Status Codes Reference

| Code | Meaning in This System |
|---|---|
| 200 | Success |
| 201 | Resource created (subscribe creates checkout) |
| 400 | Bad request (validation, business rule violation) |
| 401 | Unauthorized (missing/expired/invalid token) |
| 403 | Forbidden (wrong role, quota exceeded) |
| 404 | Not found (barber profile, subscription) |
| 409 | Conflict (duplicate subscription, already cancelled) |
| 500 | Server error (Razorpay API failure, config issue) |

### 17.4 Razorpay Sandbox Testing

In `RAZORPAY_ENV=SANDBOX`:
- All Razorpay API calls hit `https://api.razorpay.com` with test keys
- Subscriptions created in sandbox don't charge real money
- To trigger payment on sandbox: use Razorpay test cards/UPI at the `checkoutUrl`
- Razorpay will send webhooks to your configured URL (use ngrok for local testing)

For purely local testing without real Razorpay payment flow:
1. Create subscription via API (`POST /subscribe`) — gets real Razorpay sub ID
2. Skip the payment step
3. Manually fire `subscription.activated` webhook with the sub ID
4. Continue testing from activated state

---

## 18. Background Jobs & Cron Testing

### 18.1 Jobs Overview

| Job | Schedule | Function |
|---|---|---|
| Expiry check | Every 5 minutes | Expires subscriptions past `currentPeriodEnd` |
| Reconciliation | Daily at 02:00 IST | Syncs status from Razorpay API |
| Media reconciliation | Daily at 03:00 IST | Applies media policy to all subscriptions |

### 18.2 Manually Triggering Jobs (for testing)

The cron functions are exported and can be called directly:

```javascript
// In server code or a test script:
import { 
  runSubscriptionExpiryNow,
  runSubscriptionReconciliationNow,
  runSubscriptionMediaReconciliationNow
} from './src/jobs/subscription.cron.js';

// Trigger expiry check
const result = await runSubscriptionExpiryNow();
console.log(result); // { checked: N, processed: M }

// Trigger reconciliation
const reconcileResult = await runSubscriptionReconciliationNow();
console.log(reconcileResult); // { checked: N, processed: M, driftCount: K }
```

### 18.3 Testing Expiry via CRON

To test the expiry safety net without waiting for period end:

1. Directly update a subscription in MongoDB:
   ```javascript
   db.subscriptions.updateOne(
     { barberId: ObjectId("...") },
     { $set: { currentPeriodEnd: new Date(Date.now() - 1000) } }  // 1 second in the past
   )
   ```
2. Wait up to 5 minutes for the cron to fire, OR manually call `runSubscriptionExpiryNow()`
3. Check DB: `status → "EXPIRED"`, `planId → "PLAN_BASIC"`

### 18.4 Testing Reconciliation (Drift Detection)

Reconciliation fetches each active paid subscription from Razorpay and compares:
- DB status vs Razorpay status
- DB planId vs Razorpay plan_id
- DB currentPeriodEnd vs Razorpay current_end

If drift is detected, the DB is updated. This catches missed webhooks.

**To test drift:**
1. Manually update DB to wrong status (e.g., `ACTIVE` when Razorpay has it as `cancelled`)
2. Trigger `runSubscriptionReconciliationNow()`
3. Check `driftCount > 0` in result

---

## 19. Database Consistency Checkpoints

### 19.1 Subscription Record Invariants

These invariants should ALWAYS be true:

```
1. One subscription per barber (unique index on barberId)
2. If status=PENDING_PAYMENT, razorpaySubscriptionId must be set
3. If planId=PLAN_BASIC, razorpaySubscriptionId should be null (unless PENDING_PAYMENT)
4. If cancelAtPeriodEnd=true, status must be CANCELLED
5. If status=EXPIRED, planId should be PLAN_BASIC
6. pendingPlanId can only be set when status=ACTIVE (pending downgrade)
7. totalPhotosUploaded >= 0 (min: 0 enforced by schema)
8. totalVideosUploaded >= 0
9. statementsDownloadedThisPeriod >= 0
```

### 19.2 Transaction Record Invariants

```
1. webhookEventId is unique (partial index on non-null values)
2. source must be one of: WEBHOOK, API, CRON, RECONCILIATION, MIGRATION
3. Every subscription event creates exactly one transaction record
4. CREATION transactions are always source=API
5. ACTIVATION, RENEWAL, CANCELLATION (webhook) are source=WEBHOOK
6. UPGRADE, DOWNGRADE (API-initiated) are source=API
7. EXPIRY via cron is source=CRON
8. EXPIRY via reconciliation is source=RECONCILIATION
```

### 19.3 Media Consistency After Plan Changes

```
Active photos per shop ≤ plan's maxPhotos
Active videos per shop ≤ plan's maxVideos
Hidden photos: (totalPhotosUploaded - active photos) >= 0
No media should be permanently deleted by subscription changes (only hidden)
```

---

## 20. Final Validation Checklist

### 20.1 Pre-Test Environment Validation

```
[ ] Server starts without errors
[ ] All required env vars present (check startup logs for missing var errors)
[ ] RAZORPAY_ENV=SANDBOX confirmed (not PRODUCTION)
[ ] RAZORPAY_PLAN_ID_POPULAR is a valid Razorpay plan ID (not placeholder)
[ ] RAZORPAY_PLAN_ID_ADVANCED is a valid Razorpay plan ID (not placeholder)
[ ] RAZORPAY_WEBHOOK_SECRET matches what's configured in Razorpay Dashboard
[ ] GET /api/v1/health returns 200
[ ] MongoDB connected (check server logs)
[ ] Barber test account registered and onboarded
[ ] barber_access_token valid and not expired
```

### 20.2 Post-Test Database Validation

```
[ ] subscriptions collection: exactly 1 record per barber tested
[ ] subscription_transactions collection: has records for all lifecycle events
[ ] No orphaned transactions (all have valid subscriptionId references)
[ ] Webhook events with same ID do not have duplicate transaction records
[ ] Media counts match plan limits
[ ] statementsDownloadedThisPeriod reflects actual downloads in current cycle
```

### 20.3 Feature Completeness Verification

```
[ ] Plan listing works without auth
[ ] Subscription GET returns full entitlement object
[ ] Subscribe creates valid Razorpay checkout data
[ ] Upgrade works immediately for paid→paid transitions
[ ] Downgrade is deferred to next renewal
[ ] Cancel retains access until period end
[ ] All 8 webhook event types handled
[ ] Duplicate webhooks are idempotent
[ ] Invalid signatures are rejected
[ ] Media quota is enforced at upload-url stage
[ ] Statement quota is enforced at download stage
[ ] Background expiry runs correctly
[ ] Reconciliation syncs status from gateway
```

---

## Appendix A: Quick Reference — All Subscription Routes

| Method | Route | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/subscriptions/plans` | No | None | Public plan catalog |
| `GET` | `/api/v1/subscriptions/me` | Yes | BARBER | My subscription + entitlements |
| `POST` | `/api/v1/subscriptions/subscribe` | Yes | BARBER | Create new paid subscription |
| `POST` | `/api/v1/subscriptions/upgrade` | Yes | BARBER | Immediate paid plan upgrade |
| `POST` | `/api/v1/subscriptions/downgrade` | Yes | BARBER | Scheduled plan downgrade |
| `POST` | `/api/v1/subscriptions/cancel` | Yes | BARBER | Cancel at period end |
| `GET` | `/api/v1/subscriptions/transactions` | Yes | BARBER | Transaction history (paginated) |
| `POST` | `/api/v1/subscriptions/webhook` | No (sig) | None | Razorpay webhook receiver |

## Appendix B: Quick Reference — Subscription-Affected Routes

| Method | Route | Middleware | Subscription Effect |
|---|---|---|---|
| `POST` | `/api/v1/media/upload-url` | `checkUploadQuota()` | Blocked if photo/video quota exceeded |
| `POST` | `/api/v1/media/gallery` | None (indirect) | `totalPhotosUploaded` incremented |
| `GET` | `/api/v1/media/gallery/stats` | None (indirect) | Shows plan-based limits |
| `GET` | `/api/v1/earnings/transactions/statement` | `checkStatementQuota()` | Blocked if statement quota exceeded |
| `GET` | `/api/v1/shops` | None | `visibilityTier` affects ordering |
| `GET` | `/api/v1/shops/:id` | None | `badge` field reflects plan |

## Appendix C: Plan Capability Summary

| Capability | PLAN_BASIC | PLAN_POPULAR | PLAN_ADVANCED |
|---|---|---|---|
| Monthly Price | Free | ₹299 | ₹499 |
| Photo Uploads | 10 | 30 | 50 |
| Video Uploads | 2 | 10 | 15 |
| Statements/Cycle | 1 | 5 | 10 |
| Badge | NONE | BLUE | YELLOW |
| Visibility Tier | NONE | LOCAL | PRIORITY |
| Priority Boost | 0 | 1 | 2 |
| Analytics | ❌ | ❌ | ✅ |
| Promo Tools | ❌ | ❌ | ✅ |
| Support Tier | STANDARD | PREMIUM_BASIC | PREMIUM_PRIORITY |

## Appendix D: Response Envelope Format

All API responses use this envelope:

```json
{
  "success": true | false,
  "message": "Human-readable status message",
  "data": { ... } | [...],
  "meta": { "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }
}
```

- `meta` is only present for paginated responses
- `data` contains the primary response payload
- Internal Mongoose fields (`__v`, `_id`, `$__`, `_doc`) are NEVER present in responses
- Error responses use `{ "success": false, "message": "...", "data": { "errors": [...] } }`

## Appendix E: File Reference

| File | Purpose |
|---|---|
| `src/routes/subscription.routes.js` | Route definitions and middleware chain |
| `src/controllers/subscription.controller.js` | HTTP handler delegation |
| `src/services/subscription/subscription.service.js` | Core business logic |
| `src/services/subscription/subscription-webhook.service.js` | Webhook event handlers |
| `src/services/subscription/entitlement.service.js` | Plan capability resolution |
| `src/services/subscription/subscription-lifecycle.service.js` | Media side-effects orchestrator |
| `src/middleware/entitlement.middleware.js` | Route-level quota enforcement |
| `src/middleware/authenticate.middleware.js` | JWT validation |
| `src/middleware/authorize.middleware.js` | Role-based access control |
| `src/middleware/webhook-raw-body.middleware.js` | Raw body preservation for signature |
| `src/models/subscription.model.js` | Subscription MongoDB schema |
| `src/models/subscription-transaction.model.js` | Audit trail schema |
| `src/config/subscription.config.js` | Plan config and transition validation |
| `src/config/subscription-plan-definitions.js` | Plan capability definitions |
| `src/adapters/razorpay/razorpay-subscription.adapter.js` | Razorpay API adapter |
| `src/jobs/subscription.cron.js` | Background expiry and reconciliation |
| `server/postman-collections/17-subscriptions.json` | Ready-to-import Postman collection |
| `src/serializers/subscription.serializer.js` | Response serialization |
| `src/repositories/subscription.repository.js` | MongoDB query layer |
