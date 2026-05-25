# EverCut — Subscription External Setup Documentation

**Document Type:** Operational Setup Guide
**Audience:** Backend Engineers, DevOps, Platform Administrators
**Scope:** External payment gateway setup for barber subscription billing via Razorpay Subscriptions + UPI AutoPay
**Status:** Production-Ready Reference
**Last Updated:** 2026-05-21

---

## 1. Executive Summary

This document provides a **complete operational guide** for setting up and managing the external payment infrastructure required by EverCut's barber subscription system. It covers everything required **outside the codebase** — payment gateway configuration, webhook setup, security, environment management, monitoring, and operational procedures.

### Scope Boundary

| This Document Covers | This Document Does NOT Cover |
|---|---|
| Razorpay Subscriptions setup | Internal codebase implementation |
| UPI AutoPay mandate configuration | Subscription business logic |
| Webhook endpoint configuration | Data model design |
| API key management | Entitlement system architecture |
| Sandbox and production setup | Upload enforcement logic |
| Operational monitoring | API endpoint implementation |
| Reconciliation procedures | Testing code |

### Architecture Context

EverCut's payment infrastructure uses **two separate gateways** for distinct payment domains:

| Domain | Gateway | Purpose |
|---|---|---|
| **Booking Payments** | PhonePe | One-time customer payments for salon bookings |
| **Subscription Billing** | Razorpay Subscriptions | Recurring barber subscription billing (UPI AutoPay) |
| **Barber Payouts** | Cashfree | Barber earnings disbursement |

The subscription billing system operates **completely independently** from the booking payment system. They share no API keys, webhook endpoints, or transaction records.

---

## 2. Payment Gateway Selection Analysis

### Why Razorpay Subscriptions

| Criteria | Razorpay | PhonePe Recurring | Cashfree Subscriptions | Paytm Subscriptions |
|---|---|---|---|---|
| **Subscription API maturity** | ★★★★★ | ★★★☆☆ | ★★★★☆ | ★★★☆☆ |
| **UPI AutoPay support** | Native, first-class | Supported | Supported | Supported |
| **Plan management API** | Full CRUD | Limited | Full CRUD | Limited |
| **Webhook reliability** | Excellent (auto-retry) | Good | Good | Fair |
| **Proration support** | Built-in | Manual | Built-in | Manual |
| **Invoice generation** | Automatic | Manual | Automatic | Manual |
| **Documentation quality** | Excellent | Good | Good | Fair |
| **Sandbox environment** | Full-featured | Good | Good | Limited |
| **SDK availability (Node.js)** | Official SDK | REST only | REST only | REST only |
| **India market share** | ~40% (largest) | Growing | ~15% | Declining |
| **Mandate management** | Full lifecycle | Basic | Basic | Basic |
| **Dunning/retry config** | Configurable | Fixed | Configurable | Fixed |

### Decisive Factors

1. **Best-in-class Subscriptions API** — Razorpay's subscription engine handles plan creation, customer management, invoice generation, proration, and dunning automatically.
2. **Native UPI AutoPay** — First-class support for NPCI e-mandate creation, pre-debit notifications, and mandate lifecycle management.
3. **Webhook reliability** — Automatic retries with exponential backoff for failed webhook deliveries. Up to 24 hours of retry attempts.
4. **Co-existence** — Razorpay operates independently from the existing PhonePe (bookings) and Cashfree (payouts) integrations. No conflicts.
5. **Official Node.js SDK** — `razorpay` npm package with TypeScript support.

---

## 3. Razorpay Account & Dashboard Setup

### 3.1 Account Creation

1. Navigate to [https://dashboard.razorpay.com/signup](https://dashboard.razorpay.com/signup)
2. Register with:
   - **Business Name:** Quantneural Technologies (or EverCut's registered entity)
   - **Business Type:** Private Limited / LLP / Proprietorship
   - **Business Category:** Software / SaaS / Marketplace
   - **Business Sub-Category:** Marketplace / Platform
3. Complete email and phone verification

### 3.2 KYC & Activation

| Document | Required |
|---|---|
| PAN Card (Business) | ✅ |
| GST Registration | ✅ (if applicable) |
| Business Address Proof | ✅ |
| Bank Account Details | ✅ |
| Authorized Signatory ID | ✅ |
| Website/App URL | ✅ |
| Terms of Service URL | ✅ |
| Privacy Policy URL | ✅ |

> **Important:** UPI AutoPay/e-Mandate requires **additional activation**. After basic KYC, request UPI AutoPay activation from the Razorpay dashboard under Settings → Payment Methods → UPI AutoPay.

### 3.3 Dashboard Configuration

**Navigate to:** Settings → Configuration

| Setting | Value |
|---|---|
| **Auto-capture payments** | Enabled |
| **Subscription settings** | Enable Subscriptions module |
| **Invoice auto-generation** | Enabled |
| **Payment retry** | Enabled (configure per Section 12) |
| **Webhook** | Configure per Section 7 |

### 3.4 API Key Generation

**Navigate to:** Settings → API Keys → Generate Key

| Key Type | Environment | Usage |
|---|---|---|
| **Key ID** (`rzp_test_*`) | Test Mode | Sandbox/development |
| **Key Secret** | Test Mode | Sandbox/development |
| **Key ID** (`rzp_live_*`) | Live Mode | Production |
| **Key Secret** | Live Mode | Production |

> **CRITICAL:** The Key Secret is shown **only once** at generation. Store it immediately in your secrets management system. If lost, you must regenerate.

### 3.5 UPI AutoPay Activation Checklist

- [ ] Basic KYC approved
- [ ] Business website/app URL verified
- [ ] Request UPI AutoPay activation from dashboard
- [ ] Razorpay team review (1-3 business days)
- [ ] UPI AutoPay enabled confirmation received
- [ ] Test mandate creation in sandbox mode
- [ ] Verify pre-debit notification flow

---

## 4. Razorpay Plans Setup

### 4.1 Plan Configuration

EverCut requires **two** Razorpay plans. The Basic plan is free and has **no Razorpay plan** — it's handled entirely by the application.

| EverCut Plan | Razorpay Plan Required | Amount | Period | Interval |
|---|---|---|---|---|
| Basic (Free) | ❌ None | ₹0 | N/A | N/A |
| Popular | ✅ Yes | ₹29,900 (paise) | monthly | 1 |
| Advanced | ✅ Yes | ₹49,900 (paise) | monthly | 1 |

> **Amount in paise:** Razorpay uses the smallest currency unit. ₹299 = 29,900 paise. ₹499 = 49,900 paise.

### 4.2 Creating Plans via Provisioning Script (Canonical Method)

EverCut uses a dedicated provisioning script to create Razorpay plans programmatically. This is the **canonical approach** — do NOT create plans manually via curl, the Razorpay API, or the Razorpay dashboard.

**Script location:** `server/scripts/create-razorpay-plans.mjs`

#### Prerequisites

1. `RAZORPAY_ENV` must be set explicitly to `SANDBOX` or `PRODUCTION` in `server/.env`
2. `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` must be set in `server/.env`
3. Install server dependencies so the committed Razorpay SDK dependency is present: `npm install`

#### Step 1: Dry Run (Default, Safe)

Always start with a dry run to see what the script will do:

```bash
# From server/ directory
node scripts/create-razorpay-plans.mjs
```

This shows:
- Which plans need to be created
- Which plans already exist on Razorpay (skipped)
- The environment being used (`SANDBOX` or `PRODUCTION`)
- No plans are actually created

#### Step 2: Execute

```bash
# Actually create plans on Razorpay
node scripts/create-razorpay-plans.mjs --execute
```

#### Step 3: Verify

```bash
# List all plans on Razorpay and verify mapping
node scripts/create-razorpay-plans.mjs --list
```

#### Step 4: Copy Plan IDs to .env

The script outputs the plan IDs — copy them into `server/.env`:

```env
RAZORPAY_PLAN_ID_POPULAR=plan_xxxxxxxxxxxxxxxx
RAZORPAY_PLAN_ID_ADVANCED=plan_xxxxxxxxxxxxxxxx
```

> **Note:** The script intentionally does NOT auto-edit your `.env` file. Outputting plan IDs for manual copy is safer and prevents accidental corruption of other environment variables.

#### Idempotency & Duplicate Prevention

The script is **fully idempotent**. It detects existing plans on Razorpay by matching:
- Plan name (`EverCut - Popular` / `EverCut - Advanced`)
- Amount (29900 / 49900 paise)
- Currency (INR)
- Period (monthly)
- Interval (1)

If a matching plan already exists, it is **skipped** and its existing Razorpay plan ID is output. Running the script multiple times will never create duplicate plans.

> **Why this matters:** Razorpay plans **cannot be deleted** via their API. Duplicate plans would remain permanently in your Razorpay account. The idempotency check prevents this.

#### Production Safety

For **PRODUCTION** keys (`rzp_live_*`), the script requires an explicit confirmation:

```bash
RAZORPAY_CONFIRM_PRODUCTION=true node scripts/create-razorpay-plans.mjs --execute
```

Without `RAZORPAY_CONFIRM_PRODUCTION=true`, the script refuses to create plans in `PRODUCTION`. This prevents accidental creation of real billing plans.

#### Dev / Staging / Production Usage

| Environment | Keys | Command | Notes |
|---|---|---|---|
| Development | `rzp_test_*` | `node scripts/create-razorpay-plans.mjs --execute` | Creates test plans; safe to experiment |
| Staging | `rzp_test_*` | Same as development | Uses `SANDBOX`; separate plan IDs in staging .env |
| Production | `rzp_live_*` | `RAZORPAY_CONFIRM_PRODUCTION=true node scripts/create-razorpay-plans.mjs --execute` | Creates real billing plans; requires explicit confirmation |

> **Each environment gets its own plan IDs.** Razorpay test-key plans and production-key plans are completely separate. You must set `RAZORPAY_ENV` explicitly to `SANDBOX` or `PRODUCTION` before running the script; it is never inferred from the key prefix.

#### Retry Safety

If the script fails mid-execution (e.g., network error after creating the Popular plan but before creating the Advanced plan):
1. Re-run with `--execute`
2. The successfully created Popular plan is **detected and skipped**
3. Only the Advanced plan is created
4. Both plan IDs are output

### 4.3 Plan ID Storage & Management

Razorpay plan IDs are stored as environment variables and mapped to internal plan IDs in `subscription.config.js`:

```
server/.env                          subscription.config.js
─────────────────────────            ──────────────────────────────────
RAZORPAY_PLAN_ID_POPULAR=plan_xxx → PLANS[PLAN_POPULAR].razorpayPlanId
RAZORPAY_PLAN_ID_ADVANCED=plan_xxx → PLANS[PLAN_ADVANCED].razorpayPlanId
```

The mapping flow:
1. The provisioning script creates plans on Razorpay → outputs plan IDs
2. Plan IDs are set in `.env` → loaded by `config/index.js`
3. `subscription.config.js` references `config.razorpay.planIdPopular` / `config.razorpay.planIdAdvanced`
4. At runtime, `resolveRazorpayPlanId()` maps a Razorpay plan ID back to an internal plan ID (used in webhook processing)

### 4.4 Handling Future Pricing Changes

Razorpay plans are **immutable** — you cannot change the amount, period, or name of an existing plan. If pricing needs to change:

| Step | Action |
|---|---|
| 1 | Update `PLAN_DEFINITIONS` in `server/src/config/subscription-plan-definitions.js` with new amounts/names |
| 2 | Update `PLANS` in `subscription.config.js` with new pricing |
| 3 | Run `node scripts/create-razorpay-plans.mjs --execute` — creates NEW plans (old plans are not matched due to different amounts) |
| 4 | Update `RAZORPAY_PLAN_ID_POPULAR` and `RAZORPAY_PLAN_ID_ADVANCED` in `.env` with the new plan IDs |
| 5 | Deploy — new subscriptions use the new plans |
| 6 | Existing subscribers remain on their current Razorpay plan until they cancel or the subscription is migrated via Razorpay's Update Subscription API |

> **Rollback:** If a pricing change needs to be reverted, simply revert the `.env` plan IDs to the previous values. The old Razorpay plans still exist and are unchanged.

### 4.5 Why Not Dashboard / Manual API Creation?

The script-driven approach is preferred over manual creation because:

| Concern | Dashboard/curl | Provisioning Script |
|---|---|---|
| **Repeatability** | Error-prone (typos in amounts, wrong periods) | Deterministic from code |
| **Idempotency** | No protection against duplicates | Detects and skips existing plans |
| **Auditability** | No record of what was created or when | Script is version-controlled |
| **Multi-environment** | Must remember to do it in each environment | Same script, different `.env` |
| **Production safety** | One wrong click can create a production plan | Requires `RAZORPAY_CONFIRM_PRODUCTION=true` |
| **Onboarding** | New developer must know exact plan specs | New developer runs one command |

---

## 5. Razorpay Subscriptions API Reference

### 5.1 Authentication

All API calls use **HTTP Basic Authentication**:
```
Authorization: Basic base64(KEY_ID:KEY_SECRET)
```

### 5.2 Key Endpoints

| Operation | Method | Endpoint |
|---|---|---|
| Create Subscription | POST | `/v1/subscriptions` |
| Fetch Subscription | GET | `/v1/subscriptions/{sub_id}` |
| Cancel Subscription | POST | `/v1/subscriptions/{sub_id}/cancel` |
| Pause Subscription | POST | `/v1/subscriptions/{sub_id}/pause` |
| Resume Subscription | POST | `/v1/subscriptions/{sub_id}/resume` |
| Update Subscription | PATCH | `/v1/subscriptions/{sub_id}` |
| Fetch All Subscriptions | GET | `/v1/subscriptions` |
| Create Customer | POST | `/v1/customers` |
| Create Plan | POST | `/v1/plans` |
| Fetch Invoices | GET | `/v1/invoices` |

**Base URLs:**
- Sandbox: `https://api.razorpay.com` (same base, uses test keys)
- Production: `https://api.razorpay.com`

### 5.3 Create Subscription

```json
POST /v1/subscriptions
{
  "plan_id": "plan_ABC123",
  "total_count": 120,
  "quantity": 1,
  "customer_notify": 1,
  "notes": {
    "barber_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "plan_type": "PLAN_POPULAR"
  }
}
```

**Response:**
```json
{
  "id": "sub_XYZ789",
  "entity": "subscription",
  "plan_id": "plan_ABC123",
  "status": "created",
  "current_start": null,
  "current_end": null,
  "short_url": "https://rzp.io/i/abc123",
  "payment_method": "upi"
}
```

### 5.4 Subscription States

```
created → authenticated → active → [halted|completed|cancelled|expired|paused]
                                         ↓
                                      active (on payment retry success)
```

| State | Description | EverCut Action |
|---|---|---|
| `created` | Subscription created, awaiting first payment | Show checkout link to barber |
| `authenticated` | Mandate created, awaiting first charge | Wait for activation |
| `active` | Subscription is active and charging | Grant plan features |
| `halted` | All payment retries exhausted | Expire subscription → revert to Basic |
| `completed` | Total billing cycles reached | Expire subscription → revert to Basic |
| `cancelled` | Cancelled by barber or admin | End-of-cycle access, then revert to Basic |
| `expired` | Authentication not completed in time | Treat as never started |
| `paused` | Paused (by barber via UPI app) | Retain current cycle access until period end |

### 5.5 Error Codes

| Code | Meaning | Action |
|---|---|---|
| `BAD_REQUEST_ERROR` | Invalid parameters | Fix request parameters |
| `GATEWAY_ERROR` | Payment gateway issue | Retry with backoff |
| `SERVER_ERROR` | Razorpay internal error | Retry with backoff |

### 5.6 Rate Limits

| Environment | Limit |
|---|---|
| Test Mode | 20 requests/second |
| Live Mode | 25 requests/second |

---

## 6. UPI AutoPay Mandate Flow

### 6.1 How UPI AutoPay Works in India

UPI AutoPay (NPCI e-Mandate) enables recurring payments by creating a standing authorization on the barber's UPI ID. The flow:

```
┌──────────┐     ┌───────────┐     ┌──────────┐     ┌──────────┐
│  EverCut  │     │  Razorpay │     │   NPCI   │     │ Barber's │
│  Backend  │────→│  API      │────→│ e-Mandate│────→│ UPI App  │
│           │     │           │     │  System  │     │(GPay etc)│
└──────────┘     └───────────┘     └──────────┘     └──────────┘
     │                │                  │                │
     │  1. Create     │                  │                │
     │  Subscription  │                  │                │
     │───────────────→│                  │                │
     │                │  2. Create       │                │
     │                │  Mandate         │                │
     │                │─────────────────→│                │
     │                │                  │  3. Mandate    │
     │                │                  │  Approval      │
     │                │                  │  Request       │
     │                │                  │───────────────→│
     │                │                  │                │
     │                │                  │  4. Barber     │
     │                │                  │  Approves      │
     │                │                  │←───────────────│
     │                │  5. Mandate      │                │
     │                │  Confirmed       │                │
     │                │←─────────────────│                │
     │  6. Webhook:   │                  │                │
     │  authenticated │                  │                │
     │←───────────────│                  │                │
     │                │                  │                │
     │  (Every 30     │  7. Execute      │                │
     │   days)        │  Mandate         │                │
     │                │─────────────────→│                │
     │                │                  │  8. Auto-debit │
     │                │                  │───────────────→│
     │  9. Webhook:   │                  │                │
     │  charged       │                  │                │
     │←───────────────│                  │                │
```

### 6.2 Mandate Creation

When a barber subscribes to Popular or Advanced:
1. EverCut creates a Razorpay subscription
2. Razorpay generates a payment link / checkout session
3. Barber completes first payment and approves UPI AutoPay mandate
4. Razorpay webhook: `subscription.authenticated` → `subscription.activated`

### 6.3 Mandate Execution (Recurring Charges)

Every 30 days:
1. Razorpay sends a **pre-debit notification** to the barber (24 hours before charge) — this is an NPCI regulatory requirement
2. Razorpay executes the mandate charge against the barber's UPI ID
3. If successful: webhook `subscription.charged`
4. If failed: Razorpay retries per configured retry schedule

### 6.4 Mandate Pause (External to EverCut)

Barbers can pause their UPI AutoPay mandate from **their UPI app** (Google Pay, PhonePe, Paytm, etc.):
- This is **outside EverCut's control**
- Razorpay detects the paused mandate
- Webhook: `subscription.paused`
- **EverCut action:** Do nothing. Barber retains access until `current_end`. If renewal fails at cycle end, expire normally.

### 6.5 Mandate Cancellation

Barbers can also **revoke** the mandate entirely from their UPI app:
- Webhook: `subscription.cancelled`
- **EverCut action:** Mark subscription as cancelled with end-of-cycle access

### 6.6 NPCI Regulatory Requirements

| Requirement | Details |
|---|---|
| **Pre-debit notification** | Mandatory 24h before each recurring charge. Razorpay handles this automatically. |
| **Maximum amount per mandate** | ₹15,000/transaction (UPI AutoPay limit). EverCut plans are well within this (₹299/₹499). |
| **Mandate validity** | Up to 10 years. Set `total_count` in subscription to a high value (e.g., 120 = 10 years). |
| **Customer consent** | Barber must explicitly approve mandate in their UPI app. Cannot be auto-created. |

---

## 7. Webhook Configuration

### 7.1 Webhook URL Setup

**Navigate to:** Dashboard → Settings → Webhooks → Add New Webhook

| Setting | Value |
|---|---|
| **Webhook URL** | `https://api.evercut.com/api/v1/subscriptions/webhook` |
| **Secret** | Auto-generated or custom (store as `RAZORPAY_WEBHOOK_SECRET`) |
| **Alert Email** | `dev@quantneural.com` |
| **Active Events** | Select individually (see below) |

### 7.2 Events to Subscribe

Subscribe to **all** of the following events:

#### Subscription Events
| Event | Description | EverCut Action |
|---|---|---|
| `subscription.authenticated` | Mandate created, first payment pending | Log; await activation |
| `subscription.activated` | First payment successful, subscription live | Activate plan features |
| `subscription.charged` | Renewal payment successful | Renew subscription, reset counters |
| `subscription.completed` | All billing cycles completed | Expire → revert to Basic |
| `subscription.updated` | Plan changed (upgrade/downgrade) | Apply new plan effects |
| `subscription.pending` | Renewal charge pending | Log; no action |
| `subscription.halted` | All payment retries exhausted | Expire → revert to Basic |
| `subscription.cancelled` | Subscription cancelled | End-of-cycle cancellation |
| `subscription.paused` | UPI mandate paused externally | Log; retain current access |
| `subscription.resumed` | UPI mandate resumed | Log; no immediate action |

#### Payment Events (Subscription Context)
| Event | Description | EverCut Action |
|---|---|---|
| `payment.authorized` | Payment authorized | Log |
| `payment.captured` | Payment captured | Log (subscription.charged is primary) |
| `payment.failed` | Individual payment attempt failed | Log; Razorpay will retry automatically |

#### Invoice Events
| Event | Description | EverCut Action |
|---|---|---|
| `invoice.paid` | Invoice paid successfully | Log (subscription.charged is primary) |
| `invoice.expired` | Invoice expired without payment | Log; subscription.halted is primary |

### 7.3 Event-to-Action Mapping (Summary)

```
subscription.activated  → createOrActivateSubscription()
subscription.charged    → renewSubscription()
subscription.halted     → expireSubscription()
subscription.cancelled  → cancelSubscription(endOfCycle=true)
subscription.paused     → logMandatePaused()
subscription.resumed    → logMandateResumed()
subscription.updated    → handlePlanChange()
payment.failed          → logPaymentFailure()
*                       → logUnhandledEvent()
```

### 7.4 Webhook Payload Structure

```json
{
  "entity": "event",
  "account_id": "acc_ABC123",
  "event": "subscription.charged",
  "contains": ["subscription", "payment"],
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_XYZ789",
        "plan_id": "plan_ABC123",
        "status": "active",
        "current_start": 1716000000,
        "current_end": 1718592000,
        "charge_at": 1718592000,
        "offer_id": null,
        "notes": {
          "barber_id": "60f7b3b3b3b3b3b3b3b3b3b3",
          "plan_type": "PLAN_POPULAR"
        }
      }
    },
    "payment": {
      "entity": {
        "id": "pay_DEF456",
        "amount": 29900,
        "currency": "INR",
        "status": "captured",
        "method": "upi"
      }
    }
  },
  "created_at": 1716000000
}
```

---

## 8. Webhook Security

### 8.1 Signature Verification

Razorpay signs every webhook payload with **HMAC-SHA256** using the webhook secret.

**Verification algorithm:**
```
signature = HMAC-SHA256(webhook_secret, raw_request_body)
compare(signature, X-Razorpay-Signature header)
```

**Implementation requirements:**
1. Parse the raw request body **before** JSON parsing (preserve exact bytes)
2. Compute HMAC-SHA256 of the raw body using `RAZORPAY_WEBHOOK_SECRET`
3. Compare with the `X-Razorpay-Signature` header value
4. Use **timing-safe comparison** to prevent timing attacks
5. Reject requests with missing or invalid signatures immediately (HTTP 400)

### 8.2 Raw Body Preservation

The webhook endpoint in Express must receive the **raw body** for signature verification. This requires special middleware configuration:

```
app.use('/api/v1/subscriptions/webhook', express.raw({ type: 'application/json' }), parseRawBody)
```

This must be registered **before** the global `express.json()` middleware (same pattern as the existing payout webhook in `app.js`).

### 8.3 Replay Attack Protection

| Protection | Implementation |
|---|---|
| **Event ID deduplication** | Store `event.id` from webhook payload. Reject if already processed. |
| **Timestamp validation** | Reject events older than 5 minutes (configurable). `event.created_at` is Unix timestamp. |
| **Idempotent processing** | All webhook handlers must be idempotent — processing the same event twice produces no additional side effects. |

### 8.4 Webhook Secret Rotation

1. Generate new webhook secret in Razorpay dashboard
2. Update `RAZORPAY_WEBHOOK_SECRET` environment variable
3. Deploy new secret
4. During rotation window (old secret → new secret), accept signatures from **either** secret
5. Remove old secret after confirming all in-flight webhooks are processed

---

## 9. Environment Variables

### 9.1 Complete Variable List

```bash
# ─── Razorpay Subscription Billing ────────────────────────────────
# API credentials
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXX          # Test: rzp_test_*, Live: rzp_live_*
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX        # Key secret from Razorpay dashboard

# Webhook security
RAZORPAY_WEBHOOK_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX    # Webhook signing secret

# Plan IDs (created via: node scripts/create-razorpay-plans.mjs --execute)
RAZORPAY_PLAN_ID_POPULAR=plan_XXXXXXXXXXXXXX        # Popular plan (₹299/month)
RAZORPAY_PLAN_ID_ADVANCED=plan_XXXXXXXXXXXXXX       # Advanced plan (₹499/month)

# Environment
RAZORPAY_ENV=SANDBOX                                 # SANDBOX or PRODUCTION
```

### 9.2 Sandbox vs Production Values

| Variable | Sandbox | Production |
|---|---|---|
| `RAZORPAY_KEY_ID` | `rzp_test_*` | `rzp_live_*` |
| `RAZORPAY_KEY_SECRET` | Test secret | Live secret |
| `RAZORPAY_WEBHOOK_SECRET` | Test webhook secret | Live webhook secret |
| `RAZORPAY_PLAN_ID_POPULAR` | Test plan ID | Live plan ID |
| `RAZORPAY_PLAN_ID_ADVANCED` | Test plan ID | Live plan ID |
| `RAZORPAY_ENV` | `SANDBOX` | `PRODUCTION` |

### 9.3 Secret Management Best Practices

| Practice | Details |
|---|---|
| **Never commit secrets** | All Razorpay credentials must be in `.env` (gitignored) or secrets manager |
| **Separate test/live keys** | Use different `.env` files or environment-specific secret injection |
| **Rotate regularly** | Rotate API keys and webhook secrets every 90 days |
| **Audit access** | Monitor who has access to Razorpay dashboard and API keys |
| **Use environment variables** | Never hardcode credentials in source code |

---

## 10. Sandbox (Test Mode) Setup

### 10.1 Test Mode Configuration

Razorpay sandbox uses the **same API base URL** (`https://api.razorpay.com`) but with test-mode API keys (`rzp_test_*`). All transactions are simulated.

### 10.2 Test UPI Details

| Field | Test Value |
|---|---|
| **UPI ID** | `success@razorpay` (for successful payments) |
| **UPI ID** | `failure@razorpay` (for failed payments) |

### 10.3 Simulating Subscription Events

1. **Create subscription** via API with test plan
2. **Complete first payment** using test checkout page
3. **Trigger renewal** — Use Razorpay dashboard → Subscriptions → select subscription → "Charge Now" to simulate renewal
4. **Simulate failure** — Use `failure@razorpay` UPI ID
5. **Simulate halted** — Configure retries to 0 and trigger a failed payment

### 10.4 Webhook Testing

1. Use a public URL for your dev environment (Hookdeck, ngrok, Cloudflare Tunnel)
2. Set webhook URL in Razorpay dashboard to your public dev URL
3. Monitor webhook delivery in dashboard: Settings → Webhooks → Recent Deliveries
4. Verify signature validation in your handler
5. Test each event type listed in Section 7.2

For the documented Hookdeck development flow:

```bash
hookdeck listen 5000 razorpay-webhooks --path /api/v1/subscriptions/webhook
```

Use the Hookdeck forwarding URL as the Razorpay webhook URL while testing locally.

### 10.4.1 Local Migration and Collection Tooling

After deploying the subscription code to a local or staging environment, initialize existing barbers with default Basic subscriptions:

```bash
cd server
node scripts/migrate-subscription-defaults.mjs
node scripts/migrate-subscription-defaults.mjs --execute
```

The first command is a dry run. The `--execute` run is idempotent and skips barbers that already have a subscription record.

Regenerate Postman collections whenever subscription routes or examples change:

```bash
cd server
node scripts/regenerate-postman-collections.mjs
```

The generator emits `postman-collections/17-subscriptions.json` with plan, lifecycle, transaction, and signed Razorpay webhook requests.

### 10.5 Test Scenarios Checklist

- [ ] Create Popular subscription → verify `subscription.activated` webhook
- [ ] Create Advanced subscription → verify `subscription.activated` webhook
- [ ] Simulate renewal charge → verify `subscription.charged` webhook
- [ ] Simulate failed payment → verify `payment.failed` webhook
- [ ] Simulate halted (all retries exhausted) → verify `subscription.halted` webhook
- [ ] Cancel subscription → verify `subscription.cancelled` webhook
- [ ] Verify signature validation rejects tampered payloads
- [ ] Verify duplicate webhook handling (idempotency)

---

## 11. Production Setup

### 11.1 Go-Live Checklist

- [ ] Razorpay KYC fully approved
- [ ] UPI AutoPay activation confirmed
- [ ] Live API keys generated and stored in production secrets manager
- [ ] Live webhook secret generated and stored
- [ ] Plans provisioned in `PRODUCTION` mode via `RAZORPAY_CONFIRM_PRODUCTION=true node scripts/create-razorpay-plans.mjs --execute`
- [ ] Plan IDs verified via `node scripts/create-razorpay-plans.mjs --list` and updated in production environment variables
- [ ] Subscription defaults migration dry-run reviewed via `node scripts/migrate-subscription-defaults.mjs`
- [ ] Subscription defaults migration executed after deploy via `node scripts/migrate-subscription-defaults.mjs --execute`
- [ ] Webhook URL set to production API endpoint (`https://api.evercut.com/api/v1/subscriptions/webhook`)
- [ ] SSL certificate valid on webhook endpoint
- [ ] Webhook signature verification tested with live keys
- [ ] Production monitoring configured (Section 13)
- [ ] Reconciliation job scheduled (Section 14)
- [ ] Alerting configured for payment failures and webhook issues
- [ ] `RAZORPAY_ENV=PRODUCTION` set in production environment
- [ ] First production subscription created and verified in Razorpay `PRODUCTION` mode (using a team member's UPI ID)

### 11.2 DNS & SSL Requirements

| Requirement | Details |
|---|---|
| **HTTPS** | Webhook endpoint must be HTTPS (Razorpay will not deliver to HTTP) |
| **Valid SSL** | Certificate must be valid and trusted (no self-signed) |
| **DNS resolution** | Webhook URL must resolve to a publicly accessible IP |
| **Port** | Standard HTTPS port (443) recommended |

### 11.3 Rate Limit Considerations

| Scenario | Strategy |
|---|---|
| Bulk subscription creation | Queue requests; max 25/second |
| Webhook burst | Process asynchronously if needed; Razorpay sends in bursts after events |
| Status polling | Cache results; poll no more than 1/second per subscription |

---

## 12. Renewal & Retry Configuration

### 12.1 Razorpay Automatic Retry

Razorpay automatically retries failed subscription payments. Configure via dashboard:

**Navigate to:** Dashboard → Settings → Configuration → Subscriptions

| Setting | Recommended Value | Rationale |
|---|---|---|
| **Retry count** | 3 | Balances recovery with barber experience |
| **Retry interval** | 3 days | Allows time for barber to fund their UPI account |
| **Total retry window** | 9 days | 3 retries × 3 days apart |

### 12.2 Retry Timeline Example

```
Day 0  — Renewal due. First charge attempt.
         If failed → payment.failed webhook
Day 3  — Retry #1
         If failed → payment.failed webhook
Day 6  — Retry #2
         If failed → payment.failed webhook
Day 9  — Retry #3 (final)
         If failed → subscription.halted webhook
         → EverCut expires subscription → revert to Basic
```

### 12.3 Grace Period Policy

**EverCut has NO grace period.** When `currentPeriodEnd` is reached without a successful renewal:
- The subscription expiry cron job detects the lapsed subscription
- All features immediately revert to Basic
- Excess media is hidden
- Badge and visibility are removed

The Razorpay retry mechanism provides an **implicit window** (up to 9 days with the recommended config), but EverCut's expiry is based on `currentPeriodEnd`, not on Razorpay's retry schedule.

### 12.4 Dunning Communication

| Event | Notification |
|---|---|
| Payment failed (retry pending) | Push notification: "Your subscription renewal payment failed. We'll retry in 3 days. Please ensure sufficient balance." |
| All retries exhausted (halted) | Push notification: "Your subscription has expired. Your plan has been reverted to Basic. Upgrade anytime to restore premium features." |

---

## 13. Operational Monitoring & Alerting

### 13.1 Key Metrics to Monitor

| Metric | Source | Alert Threshold |
|---|---|---|
| **Active subscriptions by plan** | EverCut DB | N/A (dashboard metric) |
| **Monthly recurring revenue (MRR)** | EverCut DB | N/A (dashboard metric) |
| **Failed payment rate** | Webhook logs | > 10% of renewals in 24h |
| **Webhook delivery failures** | Razorpay dashboard | Any delivery failure > 1h old |
| **Subscription state drift** | Reconciliation job | Any mismatch detected |
| **Webhook processing errors** | Application logs | Any unprocessed webhook |
| **Subscription churn rate** | EverCut DB | > 15% monthly |
| **Average time to mandate approval** | Webhook timestamps | > 24h for pending mandates |

### 13.2 Razorpay Dashboard Monitoring

Check daily:
1. **Subscriptions** → Active / Halted / Cancelled counts
2. **Webhooks** → Recent Deliveries → check for failed deliveries
3. **Payments** → Failed payments list
4. **Disputes** → Any subscription-related disputes

### 13.3 Application Log Monitoring

All subscription events are logged with the `[SubscriptionService]` prefix. Monitor for:
```
[SubscriptionService] ERROR — any error-level log
[SubscriptionService] Webhook signature verification failed
[SubscriptionService] Unknown webhook event
[SubscriptionService] State transition rejected
[SubscriptionService] Reconciliation mismatch
```

---

## 14. Reconciliation Strategy

### 14.1 Daily Automated Reconciliation

A scheduled job (`subscription-reconciliation.cron.js`) runs daily at 2:00 AM IST:

1. **Fetch all ACTIVE subscriptions** from EverCut DB
2. **For each, fetch subscription status** from Razorpay API
3. **Compare states:**
   - If EverCut says ACTIVE but Razorpay says `halted` or `cancelled` → trigger expiry/cancellation
   - If EverCut says EXPIRED but Razorpay says `active` → re-activate subscription
   - If `currentPeriodEnd` differs → update to Razorpay's value
4. **Log all discrepancies** with `[Reconciliation]` prefix
5. **Auto-fix safe mismatches** (e.g., date drift)
6. **Alert on dangerous mismatches** (e.g., active in Razorpay but expired in DB)

### 14.2 Missing Webhook Recovery

If a webhook was not received (network issue, server downtime):
1. Reconciliation job detects state mismatch
2. Fetches latest subscription state from Razorpay API
3. Applies the appropriate lifecycle action
4. Creates a `SubscriptionTransaction` record with `source: "reconciliation"`

### 14.3 Revenue Reconciliation

Monthly (manual process):
1. Export Razorpay payment reports for the subscription plan
2. Compare total collected with EverCut's `SubscriptionTransaction` records
3. Identify any orphaned payments (Razorpay payment without EverCut transaction)
4. Investigate and resolve discrepancies

---

## 15. Payment Testing Matrix

| # | Scenario | Test Steps | Expected Outcome |
|---|---|---|---|
| 1 | New Popular subscription | Create sub → complete payment with `success@razorpay` | `subscription.activated` webhook → plan set to PLAN_POPULAR |
| 2 | New Advanced subscription | Create sub → complete payment | `subscription.activated` webhook → plan set to PLAN_ADVANCED |
| 3 | Successful renewal | Trigger charge on active subscription | `subscription.charged` webhook → period extended, counters reset |
| 4 | Failed renewal (insufficient funds) | Use `failure@razorpay` UPI | `payment.failed` webhook → retry scheduled by Razorpay |
| 5 | All retries exhausted | Fail all retry attempts | `subscription.halted` webhook → revert to Basic |
| 6 | UPI mandate pause | Simulate pause via dashboard | `subscription.paused` webhook → log only, retain access |
| 7 | UPI mandate resume | Resume paused subscription | `subscription.resumed` webhook → log only |
| 8 | Barber cancels subscription | Call cancel endpoint | `subscription.cancelled` webhook → end-of-cycle access |
| 9 | Upgrade Popular → Advanced | Call upgrade endpoint | Immediate plan change → new features active |
| 10 | Downgrade Advanced → Popular | Call downgrade endpoint | Takes effect at next renewal |
| 11 | Downgrade to Basic | Cancel paid subscription | End-of-cycle → revert to Basic |
| 12 | Duplicate webhook | Send same webhook twice | Second delivery is no-op (idempotent) |
| 13 | Invalid webhook signature | Tamper with payload | HTTP 400 rejection |
| 14 | Webhook during server downtime | Stop server, send webhook | Razorpay retries → processed on recovery |
| 15 | Concurrent subscription creation | Two simultaneous create requests | Only one succeeds; other returns conflict error |

---

## 16. Troubleshooting Guide

### 16.1 Common Issues

| Issue | Possible Cause | Resolution |
|---|---|---|
| **Webhook not received** | Incorrect URL; server not reachable; firewall blocking | Verify URL in dashboard; check server logs; test with curl |
| **Signature verification fails** | Wrong webhook secret; body parsing before verification | Ensure raw body is used for HMAC; verify secret matches dashboard |
| **Subscription stuck in `created`** | Barber didn't complete payment | Subscription expires after authentication window (configurable) |
| **Payment captured but subscription not updated** | Webhook processing error | Check application error logs; run reconciliation job |
| **Mandate creation fails** | UPI AutoPay not activated; barber's UPI app doesn't support mandates | Verify UPI AutoPay is enabled; fallback to card if needed |
| **Renewal fails repeatedly** | Insufficient balance; UPI limits; bank issues | Barber notification; suggest alternative payment method |
| **Rate limit errors (429)** | Too many API calls | Implement request queuing; reduce polling frequency |
| **Duplicate subscription created** | Race condition; missing uniqueness check | Enforce unique constraint on barberId in Subscription model |

### 16.2 Debug Logging

Enable detailed logging for subscription flows:
```javascript
logger.info('[SubscriptionService] Webhook received', { event, subscriptionId, paymentId });
logger.info('[SubscriptionService] State transition', { from, to, barberId });
logger.error('[SubscriptionService] Processing failed', { error, webhookEventId });
```

### 16.3 Razorpay Support Escalation

| Priority | Channel | SLA |
|---|---|---|
| P1 (production outage) | support@razorpay.com + dashboard chat | 2 hours |
| P2 (payment issues) | Dashboard support | 4 hours |
| P3 (configuration) | Documentation / dashboard | 24 hours |

---

## 17. Compliance & Security Recommendations

### 17.1 PCI-DSS

Razorpay is **PCI-DSS Level 1 compliant**. EverCut never handles raw card data or UPI PINs — all payment processing happens on Razorpay's infrastructure. EverCut's responsibility:
- Store only Razorpay identifiers (subscription_id, payment_id, customer_id)
- Never store payment credentials
- Use HTTPS for all API communication

### 17.2 RBI Recurring Payment Guidelines

Effective October 2021, RBI mandates for recurring payments:
- **Customer consent** for every recurring mandate (Razorpay handles)
- **Pre-debit notification** 24h before each charge (Razorpay handles)
- **Amount limit** ₹15,000 per transaction for UPI AutoPay (EverCut plans are within limit)
- **Easy cancellation** — barbers must be able to cancel anytime (EverCut's cancel endpoint + UPI app)

### 17.3 Data Retention

| Data | Retention Period | Justification |
|---|---|---|
| Subscription records | Indefinite | Business audit trail |
| Subscription transactions | 7 years | Financial compliance |
| Webhook event logs | 90 days | Debugging and reconciliation |
| Razorpay API responses | 30 days | Debugging |

### 17.4 Audit Trail

Every subscription lifecycle event creates a `SubscriptionTransaction` record with:
- Event type, source (webhook / API / reconciliation)
- Before and after states
- Payment details
- Timestamp
- Webhook event ID (for traceability)

---

## 18. Gateway Fallback Considerations

### 18.1 Single Gateway Risk

Using Razorpay as the sole subscription gateway introduces a single point of failure:
- **Razorpay uptime SLA:** 99.95% (approximately 4.4 hours downtime/year)
- **Mitigation:** Subscription expiry job provides buffer — brief Razorpay outages don't affect active subscriptions

### 18.2 Contingency During Outages

| Scenario | Action |
|---|---|
| Razorpay API unavailable for < 1 hour | Retry subscription operations; webhooks will be replayed by Razorpay |
| Razorpay API unavailable for 1-4 hours | Queue subscription creation requests; existing subscriptions unaffected |
| Razorpay API unavailable for > 4 hours | Enable maintenance mode for subscription creation; existing subscriptions continue based on DB state |
| Razorpay webhook delivery delayed | Reconciliation job catches up; subscription expiry based on DB timestamps (not webhook arrival) |

### 18.3 Future Multi-Gateway Strategy

If a second subscription gateway is needed:
1. The `SubscriptionGatewayAdapter` base class supports this — create a new adapter implementation
2. Add gateway selection logic to the subscription service
3. Migrate existing subscriptions gradually
4. Run both gateways in parallel during migration

---

## 19. Appendix

### 19.1 Razorpay API Reference Links

| Resource | URL |
|---|---|
| Subscriptions API | https://razorpay.com/docs/api/subscriptions |
| Plans API | https://razorpay.com/docs/api/subscriptions/plans |
| Customers API | https://razorpay.com/docs/api/customers |
| Webhooks | https://razorpay.com/docs/webhooks |
| UPI AutoPay | https://razorpay.com/docs/payments/payment-methods/upi/upi-autopay |
| Node.js SDK | https://github.com/razorpay/razorpay-node |
| Test Mode | https://razorpay.com/docs/payments/payments/test-mode |

### 19.2 Useful Dashboard URLs

| Page | URL |
|---|---|
| Dashboard | https://dashboard.razorpay.com |
| API Keys | https://dashboard.razorpay.com/app/keys |
| Webhooks | https://dashboard.razorpay.com/app/webhooks |
| Subscriptions | https://dashboard.razorpay.com/app/subscriptions |
| Plans | https://dashboard.razorpay.com/app/plans |

### 19.3 Glossary

| Term | Definition |
|---|---|
| **Mandate** | A standing authorization to debit a barber's UPI account on a recurring basis |
| **Pre-debit notification** | 24h advance notice to barber before a recurring charge (NPCI requirement) |
| **Dunning** | The process of retrying failed payments and communicating with the barber |
| **Halted** | Razorpay subscription state when all payment retries are exhausted |
| **Proration** | Adjusting charges when a barber upgrades/downgrades mid-cycle |
| **NPCI** | National Payments Corporation of India — governs UPI and e-mandate rules |
| **e-Mandate** | Electronic mandate for recurring payments via UPI, cards, or net banking |

---

*This document is the authoritative external setup reference for EverCut's subscription billing infrastructure. It must be updated whenever payment gateway configuration, webhook mappings, or operational procedures change.*
