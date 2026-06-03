# Manual Payout System — Architecture & Implementation Document

## Part 1: Current Architecture Analysis

---

## 1. Executive Summary

This document provides a complete architecture analysis and implementation plan for temporarily disabling automatic Cashfree payouts and introducing a manual payout workflow for admins. The existing Cashfree infrastructure is preserved intact for future reactivation.

**Key Decision**: Use a code-level config constant (`payout.mode`) to switch between `auto` and `manual` modes. The automatic payout batch job and poller skip execution when mode is `manual`. A set of RESTful admin API endpoints handle manual payout listing, creation, status management, and audit.

### Final Implementation Alignment - May 26, 2026

The implementation was tightened during code review to match the existing backend conventions and to avoid unnecessary API surface area:

- Admin payout controllers read sanitized data through `getValidatedRequestData()`, consistent with the Express 5 validation middleware.
- The manual payout queue is still exposed as `GET /api/v1/payouts/pending` because it is a derived booking aggregation, not a `PayoutTransaction` list. No duplicate `/completed` or `/failed` list endpoints were added.
- Manual payout creation uses an atomic booking claim before creating the payout record. This prevents two admins from processing the same booking set from a stale pending list.
- The UTR is normalized to uppercase and protected by both service validation and a partial unique MongoDB index on `PayoutTransaction.utr`.
- Manual status correction through `PATCH /api/v1/payouts/:payoutId` is intentionally limited to `gateway=manual` payouts. Cashfree payout correction remains owned by webhook, poller, and retry logic.
- Failed or reversed bookings are eligible for manual re-payout after correction. The pending queue includes booking payout statuses `not_initiated`, `failed`, and `reversed`.
- `PaymentTransaction.settlement.settled` is the settlement flag used by the codebase. The older `isSettled` naming in early notes should not be used.
- `completedByAdminId` records the admin who completed the manual payout. `lastStatusUpdatedByAdminId` records the latest admin correction without overwriting the original completion audit.
- The legacy automatic Cashfree path remains intact. The no-show booking validation mismatch in the automatic payout service was corrected so the existing batch query and service validation agree.

---

## 2. Current Backend Architecture Overview

### 2.1 Technology Stack

| Component | Technology | Version |
|---|---|---|
| Runtime | Node.js (ESM) | v20+ |
| Framework | Express.js | 5.2.1 |
| Database | MongoDB | via Mongoose 9.2.2 |
| Auth | JWT (stateless) | jsonwebtoken 9.0.3 |
| Validation | Joi | 18.0.2 |
| Payment Collection | PhonePe | Custom adapter |
| Payout Disbursement | Cashfree | Custom adapter |
| Subscription Billing | Razorpay | 2.9.6 |
| OTP Provider | MSG91 | HTTP API |
| Storage | Cloudflare R2 | AWS SDK v3 |
| Push Notifications | Firebase Cloud Messaging | firebase-admin 13.7.0 |
| PDF Generation | PDFKit | 0.18.0 |
| Password Hashing | bcryptjs | 3.0.3 |

### 2.2 Architectural Pattern

The codebase follows a clean **layered architecture**:

```
Routes → Controllers → Services → Repositories → Models (Mongoose)
              ↓
         Adapters (Payment Gateways)
```

**Layer Responsibilities**:

| Layer | Directory | Responsibility |
|---|---|---|
| Routes | `src/routes/` | HTTP method mapping, middleware chaining (auth, validation) |
| Controllers | `src/controllers/` | Request parsing, response formatting, error delegation |
| Services | `src/services/` | Business logic, orchestration, cross-cutting concerns |
| Repositories | `src/repositories/` | Database access, query construction, data retrieval |
| Models | `src/models/` | Mongoose schemas, indexes, virtual fields |
| Adapters | `src/adapters/` | External API integration (payment gateways) |
| Validators | `src/validators/` | Joi schema definitions |
| Serializers | `src/serializers/` | Response shaping, field selection, ID normalization |
| Middleware | `src/middleware/` | Auth, authorization, validation, error handling, logging |
| Utils | `src/utils/` | Constants, error classes, logger, pagination, helpers |
| Config | `src/config/` | Centralized env-based configuration |
| Jobs | `src/jobs/` | Cron/interval-based background tasks |

### 2.3 User Role System

Defined in `src/utils/constants.js`:

```javascript
export const ROLES = Object.freeze({
    CUSTOMER: 'CUSTOMER',
    BARBER: 'BARBER',
    ADMIN: 'ADMIN',
});
```

The `ADMIN` role is already defined and used in authorization middleware across the codebase:
- `payout.routes.js`: `authorize(ROLES.ADMIN)` for retry endpoint
- `payment.routes.js`: `authorize(ROLES.CUSTOMER, ROLES.BARBER, ROLES.ADMIN)`
- `bookings.routes.js`: `authorize(ROLES.ADMIN, ROLES.BARBER)` for refunds

### 2.4 Authentication System

Authentication uses **stateless JWT** with three token types:

| Token Type | Secret | Expiry | Purpose |
|---|---|---|---|
| Access | `JWT_ACCESS_SECRET` | 15 minutes | API authentication |
| Refresh | `JWT_REFRESH_SECRET` | 180 days | Token rotation |
| Onboarding | `JWT_ONBOARDING_SECRET` | 24 hours | Post-OTP registration |

**Auth Flow**:
1. `authenticate.middleware.js` extracts Bearer token, verifies with `authService.verifyAccessToken()`
2. Loads user from DB, checks active status
3. Sets `req.user = { _id, roleType, phoneNumber, email, emailVerified }`
4. `authorize.middleware.js` checks `req.user.roleType` against allowed roles

**User Model** (`user.model.js`):
- `phoneNumber` (unique, required)
- `email` (unique, required)
- `roleType` (enum: CUSTOMER, BARBER, ADMIN)
- `refreshTokenHash` (select: false)
- `isActive`, `lastLoginAt`, `deletedAt` (soft delete)

**Critical Finding**: The `User` model already supports `ADMIN` roleType. Admin users can be created with `roleType: 'ADMIN'` using the existing User model. No new admin model is needed.

### 2.5 Authorization Architecture

```javascript
// authorize.middleware.js
export const authorize = (...allowedRoles) => {
    return (req, _res, next) => {
        if (!req.user) return next(new UnauthorizedError('Authentication required'));
        if (!allowedRoles.includes(req.user.roleType)) {
            return next(new ForbiddenError(`Access denied. Required role(s): ${allowedRoles.join(', ')}`));
        }
        next();
    };
};
```

The middleware is role-based and already supports multi-role authorization.

### 2.6 Error Handling Architecture

Custom error hierarchy in `api-error.js`:

| Error Class | Status Code | Use Case |
|---|---|---|
| `AppError` | configurable | Base class |
| `BadRequestError` | 400 | Validation failures |
| `UnauthorizedError` | 401 | Missing/invalid auth |
| `ForbiddenError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Duplicate resources |
| `TooManyRequestsError` | 429 | Rate limiting |
| `PaymentError` | 502 | Payment gateway errors |
| `PayoutError` | 502 | Payout provider errors |
| `InsufficientWalletBalanceError` | 503 | Wallet balance issues |

Global error handler in `error-handler.middleware.js` catches:
- Mongoose `ValidationError` → 400
- Mongoose duplicate key (code 11000) → 409
- Mongoose `CastError` → 400
- Custom `AppError` hierarchy → respective status codes
- Unexpected errors → 500 (message hidden in production)

### 2.7 API Response Pattern

```javascript
// Success
{ success: true, message: 'Success', data: { ... } }

// Paginated
{ success: true, message: 'Success', data: [...], meta: { pagination: { ... } } }

// Error
{ success: false, message: 'Error message', data: { errors: [...] } }
```

### 2.8 Validation Architecture

Joi schemas in `src/validators/` → applied via `validate.middleware.js`:

```javascript
export const validate = (schema, property = 'body') => (req, _res, next) => {
    const { error, value } = schema.validate(req[property], { ... });
    if (error) return next(new BadRequestError(error.message, details));
    req[property] = value;
    next();
};
```

### 2.9 Logging Architecture

Custom structured JSON logger in `utils/logger.js` with:
- Log levels: `debug`, `info`, `warn`, `error`
- Automatic sensitive data redaction (phone numbers, UPI IDs, bank accounts, tokens, passwords)
- Configurable via `LOG_LEVEL` environment variable
- Zero external dependencies

### 2.10 Background Jobs

All jobs use `setInterval`-based scheduling (no external job queue):

| Job | File | Schedule | Purpose |
|---|---|---|---|
| Payment Poller | `payment-poller.cron.js` | Every 5 min | Poll stale payment statuses |
| Payout Batch | `payout-batch.cron.js` | Daily at 23:00 IST | Aggregate and trigger payouts |
| Payout Poller | `payout-poller.cron.js` | Every 10 min | Poll stuck payout statuses |
| Auto-Cancel | `auto-cancel-bookings.cron.js` | Every 15 min | Cancel unconfirmed bookings |
| Slot Cleanup | `slot-cleanup.cron.js` | Every 6 hours | Remove expired slot locks |
| Media Cleanup | `media-cleanup.cron.js` | Daily at 03:00 IST | Remove orphaned media |
| Subscription | `subscription.cron.js` | Every 5 min + daily | Manage subscription lifecycle |

All jobs are started in `server.js` and stopped during graceful shutdown.

---

## 3. Current Payout System — Complete Analysis

### 3.1 Payout Data Model

**PayoutTransaction** (`payout-transaction.model.js`):

```javascript
{
    bookingIds: [ObjectId],          // References to Booking model
    barberId: ObjectId,              // Reference to Barber model
    shopId: ObjectId,                // Reference to Shop model
    paymentTransactionIds: [ObjectId], // References to PaymentTransaction
    transferId: String,              // Unique, Cashfree transfer ID (max 40 chars)
    gatewayTransferId: String,       // Cashfree internal ID
    beneficiaryId: String,           // Cashfree beneficiary ID
    amount: Number,                  // Amount in paisa
    amountInRupees: Number,          // Amount in rupees
    transferMode: String,            // enum: upi, imps, neft, rtgs, banktransfer
    status: String,                  // enum: INITIATED, PENDING, SUCCESS, FAILED, REVERSED
    utr: String,                     // Unique Transaction Reference
    processedAt: Date,               // When transfer completed
    failureReason: String,           // Failure description
    errorCode: String,               // Provider error code
    retryCount: Number,              // Current retry attempt
    maxRetries: Number,              // Max allowed retries (default: 3)
    lastRetryAt: Date,               // Last retry timestamp
    webhookReceivedAt: Date,         // When webhook was received
    webhookProcessed: Boolean,       // Whether webhook was processed
    remarks: String,                 // Transfer description
    createdAt: Date,                 // Auto-generated
    updatedAt: Date,                 // Auto-generated
}
```

**Indexes**:
- `{ status: 1, createdAt: 1 }`
- `{ barberId: 1, status: 1 }`
- `transferId` (unique)
- `gatewayTransferId`
- `bookingIds` (per element)

### 3.2 Payout Status Constants

**Booking-level payout statuses** (`PAYOUT_STATUS`):

| Status | Value | Meaning |
|---|---|---|
| `NOT_INITIATED` | `not_initiated` | No payout attempted yet |
| `INITIATED` | `initiated` | Payout record created |
| `PENDING` | `pending` | Transfer sent to Cashfree |
| `COMPLETED` | `completed` | Transfer confirmed successful |
| `FAILED` | `failed` | Transfer failed |
| `REVERSED` | `reversed` | Transfer reversed after success |

**PayoutTransaction-level statuses** (`PAYOUT_TRANSACTION_STATUS`):

| Status | Value | Meaning |
|---|---|---|
| `INITIATED` | `INITIATED` | Record created locally |
| `PENDING` | `PENDING` | Sent to Cashfree |
| `SUCCESS` | `SUCCESS` | Confirmed by Cashfree |
| `FAILED` | `FAILED` | Failed at Cashfree |
| `REVERSED` | `REVERSED` | Reversed after success |

### 3.3 Barber Model — Payout-Related Fields

```javascript
// barber.model.js
{
    upiId: String,                    // Required, validated with UPI pattern
    accountHolderName: String,        // Optional
    bankName: String,                 // Optional
    bankAccount: String,              // Optional
    ifsc: String,                     // Optional, uppercase
    payoutConfig: {
        beneficiaryId: String,        // Cashfree beneficiary ID
        beneficiaryCreatedAt: Date,
        verifiedAt: Date,
        verificationStatus: String,   // pending | verified | failed
    },
}
```

### 3.4 Booking Model — Payout-Related Fields

```javascript
// booking.model.js
{
    payoutTransactionId: ObjectId,    // Reference to PayoutTransaction
    payoutStatus: String,             // enum: not_initiated, initiated, pending, completed, failed, reversed
    payoutCompletedAt: Date,
    barberUtr: String,                // UTR from payout
}
```

### 3.5 Complete Payout Lifecycle (Current Automatic Flow)

```
┌───────────────────────────────────────────────────────────────────────┐
│                    AUTOMATIC PAYOUT LIFECYCLE                         │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. BOOKING COMPLETION                                                │
│     └─ Booking status → completed                                     │
│     └─ Payment status → success                                       │
│     └─ Payout status → not_initiated                                  │
│                                                                       │
│  2. PAYOUT BATCH JOB (Daily at 23:00 IST)                             │
│     └─ bookingRepository.findCompletedWithPendingPayout()             │
│        └─ Finds: status=completed|no_show, payoutStatus=not_initiated │
│        └─              paymentStatus=success                          │
│     └─ Groups bookings by barberId                                    │
│     └─ For each barber group → triggerBarberPayout()                  │
│                                                                       │
│  3. TRIGGER BARBER PAYOUT (payoutService.triggerBarberPayout)         │
│     └─ Validate bookings (completed, paid, no active payout)          │
│     └─ Load shop + barber + owner                                     │
│     └─ Verify UPI ID exists                                           │
│     └─ Load payment transactions                                      │
│     └─ Compute total payout (sum of barberPayout amounts)             │
│     └─ Ensure Cashfree beneficiary exists                             │
│        └─ Check/create/update beneficiary if VPA changed              │
│     └─ Generate unique transferId (PO_<barberId>_<timestamp>)         │
│     └─ Create PayoutTransaction record (status=INITIATED)             │
│     └─ Update booking payout status → initiated                       │
│     └─ Call cashfreePayoutAdapter.initiateTransfer()                  │
│     └─ On success: Update status → PENDING                            │
│     └─ On failure: Update status → FAILED                             │
│                                                                       │
│  4. CASHFREE PROCESSING (External)                                    │
│     └─ Cashfree processes transfer                                    │
│     └─ Sends webhook → POST /api/v1/payouts/webhook                   │
│                                                                       │
│  5. WEBHOOK HANDLING (payoutService.handlePayoutWebhook)              │
│     └─ Verify webhook signature (HMAC SHA256)                         │
│     └─ Parse webhook payload                                          │
│     └─ Find PayoutTransaction by transferId                           │
│     └─ TRANSFER_SUCCESS:                                              │
│        └─ PayoutTransaction → SUCCESS, set UTR, processedAt           │
│        └─ Booking payoutStatus → completed                            │
│        └─ PaymentTransaction → mark settled                           │
│        └─ Send notification to barber                                 │
│     └─ TRANSFER_FAILED:                                               │
│        └─ PayoutTransaction → FAILED                                  │
│        └─ Booking payoutStatus → failed                               │
│        └─ Send notification to barber                                 │
│     └─ TRANSFER_REVERSED:                                             │
│        └─ PayoutTransaction → REVERSED                                │
│        └─ Booking payoutStatus → reversed                             │
│        └─ PaymentTransaction → mark unsettled                         │
│        └─ Send notification to barber                                 │
│                                                                       │
│  6. PAYOUT POLLER (Every 10 min)                                      │
│     └─ Find stuck payouts (PENDING > 10 min old)                      │
│     └─ Poll Cashfree for transfer status                              │
│     └─ Apply success/failure based on response                        │
│                                                                       │
│  7. RETRY (Admin-triggered)                                           │
│     └─ POST /api/v1/payouts/:payoutId/retry                           │
│     └─ authorize(ROLES.ADMIN)                                         │
│     └─ Validate: status FAILED|REVERSED, retryCount < maxRetries      │
│     └─ Generate new transferId with _R<n> suffix                      │
│     └─ Re-initiate via Cashfree adapter                               │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### 3.6 Cashfree Integration Architecture

**Adapter Pattern**:

```
PayoutGatewayAdapter (abstract base class)
    └─ CashfreePayoutAdapter (concrete implementation)
```

**PayoutGatewayAdapter** (`payout-gateway.adapter.js`) — abstract interface:
- `getProviderName()`
- `createBeneficiary(params)`
- `getBeneficiary(beneficiaryId)`
- `removeBeneficiary(beneficiaryId)`
- `initiateTransfer(params)`
- `getTransferStatus(transferId)`
- `verifyBankAccount(params)`
- `verifyWebhook(headers, rawBody)`
- `parseWebhookPayload(body)`

**CashfreePayoutAdapter** (`cashfree-payout.adapter.js`):
- Uses Cashfree Payout API v2024-01-01
- Authentication via `x-client-id` + `x-client-secret` headers
- Webhook verification via HMAC SHA256 (`x-webhook-signature` + `x-webhook-timestamp`)
- Base URL: sandbox or production based on `CASHFREE_PAYOUT_ENV`

**Cashfree Endpoints** (`cashfree.constants.js`):
- `POST /beneficiary` — Create beneficiary
- `GET /beneficiary?beneficiary_id=<id>` — Get beneficiary
- `DELETE /beneficiary?beneficiary_id=<id>` — Remove beneficiary
- `POST /transfers` — Initiate transfer
- `GET /transfers?transfer_id=<id>` — Get transfer status
- `GET /validation/bankDetails` — Verify bank account

### 3.7 Payout Repository

```javascript
class PayoutRepository {
    create(data)                          // Create new payout transaction
    findById(id)                          // Find by ID
    findLatestByBookingId(bookingId)       // Latest payout for a booking
    findByTransferId(transferId)           // Find by Cashfree transfer ID
    updateById(id, updates)               // Atomic update
    findStuckPayouts(olderThan)           // Find PENDING payouts older than threshold
}
```

### 3.8 Payout Controller

Current endpoints:
- `handlePayoutWebhook` — Webhook handler (public, signature-verified)
- `retryPayout` — Admin-only retry

### 3.9 Payout Routes

```javascript
router.post('/webhook', payoutController.handlePayoutWebhook);  // Public
router.use(authenticate);                                       // All below require auth
router.post('/:payoutId/retry', authorize(ROLES.ADMIN), ...);   // Admin only
```

### 3.10 Payout Serializer

Serializes PayoutTransaction for API response with all fields including:
`id, bookingIds, barberId, shopId, paymentTransactionIds, transferId, gatewayTransferId, beneficiaryId, amount, amountInRupees, transferMode, status, utr, processedAt, failureReason, errorCode, retryCount, maxRetries, lastRetryAt, remarks, gateway, completedByAdminId, lastStatusUpdatedByAdminId, adminNotes, createdAt, updatedAt`

### 3.11 Payout Validator

Minimal — only validates `payoutId` as ObjectId for the retry endpoint.

---

## 4. Payment Transaction Model — Settlement Fields

The `PaymentTransaction` model stores settlement breakdown:

```javascript
settlement: {
    serviceAmount: Number,     // Service amount in paisa
    platformFee: Number,       // Platform fee in paisa
    barberPayout: Number,      // = serviceAmount (amount owed to barber)
    waiverApplied: Boolean,
    bookingFeeType: String,    // SINGLE | BUNDLE | COMBINED
    settledAt: Date,
    settled: Boolean,
}
```

The `barberPayout` field is the amount that gets paid out to the barber.

---

## 5. Environment & Configuration Strategy

All config is centralized in `src/config/index.js`:
- `requireEnv()` — mandatory, throws on missing
- `optionalEnv()` — optional with default
- `providerEnv()` — required in production only

**Payout-related config**:
```javascript
cashfree: {
    payoutClientId, payoutClientSecret, payoutEnv, payoutBaseUrl, payoutApiVersion
}
payment: {
    payoutBatchCronTime: '0 23 * * *',
    payoutBatchTimezone: 'Asia/Kolkata',
}
payout: {
    maxRetries: 3,
    pollIntervalMs: 600000,       // 10 minutes
    stuckThresholdMs: 600000,     // 10 minutes
}
```

**Design note**: Business-mode switches like `payout.mode` are intentionally defined as **code-level config constants** inside `config/index.js`, not as environment variables. This keeps operational mode decisions explicit, version-controlled, and reviewable in pull requests — matching the existing pattern where business rules (fees, cron schedules, poll intervals) are code-level constants while secrets and infrastructure values come from `.env`.


---

## Part 2: Proposed Architecture & RESTful API Design

---

## 6. Pain Points & Risks in Current System

| # | Issue | Risk | Severity |
|---|---|---|---|
| 1 | Cashfree sandbox/production costs during early launch | Unnecessary gateway costs for low volume | Medium |
| 2 | Automated payout failures (invalid VPA, insufficient balance) | Failed payouts with no manual fallback | High |
| 3 | No admin dashboard for payout management | Zero visibility into payout operations | High |
| 4 | Beneficiary management complexity | VPA changes require beneficiary recreation | Medium |
| 5 | Webhook reliability dependency | Missed webhooks = stuck payouts | Medium |
| 6 | No manual override capability | Can't manually mark payouts as done | High |

---

## 7. Feature Toggle Strategy

### 7.1 Code-Level Config Constant

The payout mode is defined as a **code-level constant** inside `src/config/index.js`, not as an environment variable. This keeps operational mode decisions explicit, version-controlled, and reviewable in PRs — matching the existing pattern where business rules (fees, cron schedules, poll intervals) are code-level constants.

**File**: `src/config/index.js`

```javascript
payout: Object.freeze({
    mode: 'manual',  // 'auto' | 'manual' — Change to 'auto' to re-enable Cashfree payouts
    maxRetries: 3,
    pollIntervalMs: 10 * 60 * 1000,
    stuckThresholdMs: 10 * 60 * 1000,
}),
```

### 7.2 Bypass Points

**1. Payout Batch Job** (`payout-batch.cron.js`):
```javascript
export const runPayoutBatchNow = async ({
    triggerBarberPayout = payoutService.triggerBarberPayout,
} = {}) => {
    // ── Feature flag: skip auto payouts in manual mode ──
    if (config.payout.mode === 'manual') {
        logger.info('[PayoutBatchJob] Skipped — PAYOUT_MODE is manual');
        return { totalBookings: 0, uniqueBarbers: 0, success: 0, failed: 0, skipped: true };
    }
    // ... existing logic unchanged ...
};
```

**2. Payout Poller** (`payout-poller.cron.js`):
```javascript
export const startPayoutPoller = () => {
    if (intervalId) return;

    // ── Feature flag: skip auto poller in manual mode ──
    if (config.payout.mode === 'manual') {
        logger.info('[PayoutPoller] Skipped — PAYOUT_MODE is manual');
        return;
    }
    // ... existing logic unchanged ...
};
```

**3. server.js** — No changes needed. Jobs still start but self-skip.

### 7.3 Future Reactivation Process

To re-enable automatic payouts:
1. Change `mode: 'auto'` in `src/config/index.js`
2. Deploy and restart the server
3. Payout batch job and poller resume normal operation
4. Any bookings with `payoutStatus = not_initiated` will be picked up in the next batch cycle
5. Manual payout admin endpoints remain available (no conflict)

**Single-line code change for reactivation.**

---

## 8. Proposed Manual Payout Architecture

### 8.1 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                   MANUAL PAYOUT ARCHITECTURE                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LAYER 1: ROUTE + MIDDLEWARE                                         │
│  ├─ payout.routes.js (extended with RESTful admin endpoints)         │
│  ├─ authenticate.middleware.js (existing — unchanged)                │
│  ├─ authorize.middleware.js (existing — ROLES.ADMIN)                 │
│  └─ validate.middleware.js (existing — new Joi schemas)              │
│                                                                      │
│  LAYER 2: CONTROLLER                                                 │
│  └─ payout.controller.js (extended with admin controller methods)    │
│                                                                      │
│  LAYER 3: SERVICE                                                    │
│  └─ payout.service.js (extended with manual payout methods)          │
│                                                                      │
│  LAYER 4: REPOSITORY                                                 │
│  └─ payout.repository.js (extended with query/filter methods)        │
│  └─ booking.repository.js (new aggregation for admin payout view)    │
│                                                                      │
│  LAYER 5: MODEL (minimal changes)                                    │
│  └─ payout-transaction.model.js (add manual payout fields)           │
│                                                                      │
│  CROSS-CUTTING                                                       │
│  ├─ constants.js (new PAYOUT_GATEWAY.MANUAL)                         │
│  ├─ payout.validator.js (new validation schemas)                     │
│  ├─ payout.serializer.js (extended for admin views)                  │
│  └─ logger.js (existing — used as-is)                                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 8.2 New Files

| File | Purpose |
|---|---|
| `scripts/create-admin-user.mjs` | One-time admin user creation script |

### 8.3 Modified Files Summary

| File | Change Type | Description |
|---|---|---|
| `src/config/index.js` | MODIFY field | Add `payout.mode` constant (hardcoded) |
| `src/utils/constants.js` | ADD constant | Add `PAYOUT_GATEWAY` enum |
| `src/models/payout-transaction.model.js` | ADD fields | Add manual payout metadata fields |
| `src/repositories/payout.repository.js` | ADD methods | Add query, pagination, filter methods |
| `src/repositories/booking.repository.js` | ADD method | Add pending payout aggregation for admin |
| `src/services/payout.service.js` | ADD methods | Add manual payout business logic |
| `src/controllers/payout.controller.js` | ADD methods | Add admin controller actions |
| `src/routes/payout.routes.js` | ADD routes | Add RESTful admin payout routes |
| `src/validators/payout.validator.js` | ADD schemas | Add admin request validation schemas |
| `src/serializers/payout.serializer.js` | ADD function | Add admin payout view serializer |
| `src/jobs/payout-batch.cron.js` | MODIFY | Add manual mode bypass |
| `src/jobs/payout-poller.cron.js` | MODIFY | Add manual mode bypass |

---

## 9. Manual Payout Workflow

### 9.1 End-to-End Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                  MANUAL PAYOUT WORKFLOW                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. BOOKING COMPLETION (unchanged)                                   │
│     └─ Booking: status=completed, paymentStatus=success              │
│     └─ Booking: payoutStatus=not_initiated                           │
│                                                                      │
│  2. ADMIN VIEWS PENDING PAYOUTS                                      │
│     └─ GET /api/v1/payouts/pending                                   │
│     └─ Returns: grouped by barber, aggregated amounts                │
│     └─ Includes: barber name, UPI ID, total amount, booking count    │
│     └─ Supports: ?search=<name>&page=1&limit=20                      │
│                                                                      │
│  3. ADMIN TRANSFERS MONEY EXTERNALLY                                 │
│     └─ Opens UPI link or manually transfers via bank                 │
│     └─ Gets UTR/transaction reference from transfer                  │
│                                                                      │
│  4. ADMIN CREATES A MANUAL PAYOUT RECORD                             │
│     └─ POST /api/v1/payouts                                          │
│     └─ Body: { barberId, bookingIds, utr, transferMode, notes }      │
│     └─ Creates PayoutTransaction with status=SUCCESS, gateway=manual │
│     └─ Updates all booking payoutStatuses → completed                │
│     └─ Marks payment transactions as settled                         │
│     └─ Logs admin action for audit                                   │
│     └─ Sends payout notification to barber                           │
│                                                                      │
│  5. ADMIN MARKS A PAYOUT AS FAILED (if transfer failed)              │
│     └─ PATCH /api/v1/payouts/:payoutId                               │
│     └─ Body: { status: 'FAILED', reason, notes }                     │
│     └─ Updates PayoutTransaction status → FAILED                     │
│     └─ Updates booking payoutStatus → failed                         │
│     └─ Bookings become eligible for re-payout                        │
│                                                                      │
│  6. ADMIN VIEWS PAYOUT HISTORY                                       │
│     └─ GET /api/v1/payouts                                           │
│     └─ Supports: ?status=SUCCESS&gateway=manual&barberId=xxx         │
│     └─ Supports: ?startDate=...&endDate=...&page=1&limit=20          │
│     └─ Supports: ?sort=createdAt:desc                                │
│                                                                      │
│  7. ADMIN VIEWS SINGLE PAYOUT DETAIL                                 │
│     └─ GET /api/v1/payouts/:payoutId                                 │
│     └─ Full PayoutTransaction with populated booking details         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.2 State Transition Diagram

```
                    ┌─────────────────┐
                    │  not_initiated  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
           ┌────────┤    INITIATED    ├────────┐
           │        └────────┬────────┘        │
           │                 │                 │
           │  (auto mode)    │  (manual mode)  │
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐          │
    │   PENDING   │   │   SUCCESS   │          │
    └──────┬──────┘   └─────────────┘          │
           │                                   │
    ┌──────▼──────┐                     ┌──────▼──────┐
    │   SUCCESS   │                     │   FAILED    │
    └─────────────┘                     └──────┬──────┘
                                               │
                                         (retry/reopen)
                                               │
                                        ┌──────▼──────┐
                                        │not_initiated│
                                        └─────────────┘
```

**Manual mode shortcut**: In manual mode, payouts go directly from `INITIATED` → `SUCCESS` (no `PENDING` state since there's no async gateway processing).

---

## 10. RESTful API Design

### 10.1 Design Principles

The API follows industry-standard RESTful conventions:

| Principle | Application |
|---|---|
| **Resource-based URLs** | `/payouts` is the resource; no verb-based paths like `/admin/complete` |
| **HTTP methods as verbs** | `GET` (read), `POST` (create), `PATCH` (partial update) |
| **Query parameters for filtering** | `?status=SUCCESS&gateway=manual&barberId=xxx` |
| **Consistent pluralization** | `/payouts` (collection), `/payouts/:id` (item) |
| **Pagination via query params** | `?page=1&limit=20` |
| **Sorting via query params** | `?sort=createdAt:desc` |
| **Derived collections as sub-resources** | `/payouts/pending` (aggregated view) |
| **RPC-style actions as sub-resource verbs** | `/payouts/:id/retry` (non-CRUD action) |
| **Standard HTTP status codes** | 200 (OK), 201 (Created), 400, 401, 403, 404, 409 |
| **Uniform error envelope** | `{ success: false, message, data: { errors } }` |
| **Idempotency via UTR** | Duplicate UTR → 409 Conflict |

### 10.2 Route Summary

```
┌────────┬─────────────────────────────┬──────────────────────────────────────┐
│ Method │ Endpoint                    │ Purpose                              │
├────────┼─────────────────────────────┼──────────────────────────────────────┤
│ POST   │ /payouts/webhook            │ Cashfree webhook (public)            │
│ GET    │ /payouts/pending            │ Aggregated pending payouts by barber │
│ GET    │ /payouts                    │ List payouts (filtered, paginated)   │
│ GET    │ /payouts/:payoutId          │ Single payout detail                 │
│ POST   │ /payouts                    │ Create manual payout                 │
│ PATCH  │ /payouts/:payoutId          │ Update payout (mark as failed)       │
│ POST   │ /payouts/:payoutId/retry    │ Retry failed payout (existing)       │
└────────┴─────────────────────────────┴──────────────────────────────────────┘
```

All endpoints except `/webhook` require `authenticate` + `authorize(ROLES.ADMIN)`.

Actual route registration order is `/webhook`, `/pending`, `/`, `POST /`, `/:payoutId/retry`, `/:payoutId`, and `PATCH /:payoutId`. The retry route is registered before the generic `/:payoutId` route so Express never treats `retry` as part of the detail route.

### 10.3 GET `/api/v1/payouts/pending`

**Purpose**: Aggregated view of completed/no-show, paid bookings with eligible payout statuses (`not_initiated`, `failed`, `reversed`), grouped by barber. This is a **derived collection** — a computed, read-only view over the bookings resource, presented under the `/payouts` namespace because it serves the payout workflow.

**Auth**: `authenticate` → `authorize(ROLES.ADMIN)`

**Query Parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |
| `search` | string | — | Case-insensitive search on barber name or shop name |

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Pending payouts retrieved",
  "data": [
    {
      "barberId": "6654abc...",
      "barberName": "Manish Borikar",
      "shopName": "Urban Cuts",
      "shopId": "6655def...",
      "upiId": "manishborikar@ptyes",
      "accountHolderName": "Manish Borikar",
      "totalAmountInPaisa": 563300,
      "totalAmountInRupees": 5633,
      "bookingCount": 12,
      "bookingIds": ["66a1...", "66a2..."],
      "oldestBookingDate": "2026-05-20T00:00:00.000Z",
      "upiDeepLink": "upi://pay?pa=manishborikar%40ptyes&pn=Manish%20Borikar&am=5633&tn=EverCut%20Payout%20-%2012%20bookings"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalDocuments": 5,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

**Why `/pending` instead of `?status=not_initiated`**:
- This is not a query on `PayoutTransaction` records — these bookings have **no** PayoutTransaction yet.
- It requires a multi-collection aggregation (bookings → shops → barbers → payments), grouped by barber.
- It produces a different response shape (barber-grouped summary, not individual transactions).
- Industry pattern: derived/computed views get their own sub-resource path (like `/users/me`, `/orders/summary`).

### 10.4 GET `/api/v1/payouts`

**Purpose**: List all `PayoutTransaction` records with rich query filtering, pagination, and sorting.

**Auth**: `authenticate` → `authorize(ROLES.ADMIN)`

**Query Parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |
| `status` | string | — | Filter: `INITIATED`, `PENDING`, `SUCCESS`, `FAILED`, `REVERSED` |
| `gateway` | string | — | Filter: `cashfree`, `manual` |
| `barberId` | ObjectId | — | Filter by barber |
| `startDate` | ISO date | — | Filter: `createdAt >= startDate` |
| `endDate` | ISO date | — | Filter: `createdAt <= endDate 23:59:59` |
| `sort` | string | `createdAt:desc` | Sort field and direction (e.g., `amount:asc`, `createdAt:desc`) |

**Example Queries**:
```
GET /api/v1/payouts?status=SUCCESS&gateway=manual
GET /api/v1/payouts?barberId=6654abc&startDate=2026-05-01&endDate=2026-05-31
GET /api/v1/payouts?status=FAILED&page=2&limit=10
GET /api/v1/payouts?sort=amount:desc&limit=50
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Payouts retrieved",
  "data": [
    {
      "id": "66b3...",
      "bookingIds": ["66a1..."],
      "barberId": "6654abc...",
      "shopId": "6655def...",
      "amount": 563300,
      "amountInRupees": 5633,
      "transferMode": "upi",
      "status": "SUCCESS",
      "utr": "423190567890",
      "gateway": "manual",
      "completedByAdminId": "665fadmin...",
      "lastStatusUpdatedByAdminId": "665fadmin...",
      "processedAt": "2026-05-26T16:30:00.000Z",
      "createdAt": "2026-05-26T16:30:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalDocuments": 42,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 10.5 GET `/api/v1/payouts/:payoutId`

**Purpose**: Retrieve a single payout with full detail, populated barber and booking references.

**Auth**: `authenticate` → `authorize(ROLES.ADMIN)`

**Response** `200 OK`: Full serialized `PayoutTransaction` with populated relations.

**Error Responses**:
- `404` — Payout not found

### 10.6 POST `/api/v1/payouts`

**Purpose**: Create a new manual payout record after the admin has completed the external transfer.

**Auth**: `authenticate` → `authorize(ROLES.ADMIN)`

**Request Body**:
```json
{
  "barberId": "6654abc...",
  "bookingIds": ["66a1...", "66a2..."],
  "utr": "423190567890",
  "transferMode": "upi",
  "notes": "Transferred via Google Pay"
}
```

**Validation Rules**:

| Field | Required | Type | Constraints |
|---|---|---|---|
| `barberId` | Yes | ObjectId string | Must reference an active barber |
| `bookingIds` | Yes | ObjectId[] | Non-empty unique array, max 100 items |
| `utr` | Yes | string | 3-50 characters, alphanumeric only, normalized to uppercase |
| `transferMode` | No | string | enum: `upi`, `imps`, `neft`, `rtgs`, `banktransfer` (default: `upi`) |
| `notes` | No | string | Max 500 characters |

**Idempotency**: The UTR acts as a natural idempotency key. A second `POST` with the same UTR returns `409 Conflict`. The service also claims bookings atomically before creating the payout, so a stale pending-list submission returns `409 Conflict` instead of double-paying.

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "Payout created successfully",
  "data": {
    "id": "66b3...",
    "bookingIds": ["66a1...", "66a2..."],
    "barberId": "6654abc...",
    "shopId": "6655def...",
    "amount": 563300,
    "amountInRupees": 5633,
    "transferMode": "upi",
    "status": "SUCCESS",
    "utr": "423190567890",
    "processedAt": "2026-05-26T16:30:00.000Z",
    "gateway": "manual",
    "completedByAdminId": "665fadmin...",
    "lastStatusUpdatedByAdminId": "665fadmin...",
    "adminNotes": "Transferred via Google Pay",
    "createdAt": "2026-05-26T16:30:00.000Z",
    "updatedAt": "2026-05-26T16:30:00.000Z"
  }
}
```

**Error Responses**:
- `400` — Validation errors, booking status invalid, payment not successful, payment already settled
- `404` — Barber or bookings not found
- `409` — Duplicate UTR or stale/concurrent booking claim

### 10.7 PATCH `/api/v1/payouts/:payoutId`

**Purpose**: Partially update a manual payout - currently used to mark a `gateway=manual` payout as `FAILED` (e.g., admin discovers the external transfer was rejected after recording it). Cashfree payouts are not mutated by this endpoint.

**Auth**: `authenticate` → `authorize(ROLES.ADMIN)`

**Request Body**:
```json
{
  "status": "FAILED",
  "reason": "UPI transfer rejected by bank",
  "notes": "Will retry after verifying UPI ID with barber"
}
```

**Validation Rules**:

| Field | Required | Type | Constraints |
|---|---|---|---|
| `status` | Yes | string | Currently only `FAILED` is accepted |
| `reason` | Yes (when status=FAILED) | string | 3-500 characters |
| `notes` | No | string | Max 500 characters |

**Concurrency**: Uses optimistic locking — `findOneAndUpdate` with a status precondition. If another admin modified the payout concurrently, returns `409 Conflict`.

**Side effects**: Linked bookings are moved back to `payoutStatus=failed`, linked payment transactions are marked unsettled, and the bookings become eligible for another manual payout attempt.

**Response** `200 OK`: Updated payout object.

**Error Responses**:
- `400` — Invalid status transition, missing reason, or non-manual payout
- `404` — Payout not found
- `409` — Concurrent modification

### 10.8 Existing Endpoints (Unchanged)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/payouts/webhook` | Public (signature-verified) | Cashfree webhook handler |
| `POST` | `/api/v1/payouts/:payoutId/retry` | Admin | Retry failed/reversed auto payout |

---

## 11. Database Schema Changes

### 11.1 PayoutTransaction Model — New Fields

Add the following fields to `payout-transaction.model.js`:

```javascript
// --- Manual payout metadata ---
gateway: {
    type: String,
    enum: ['cashfree', 'manual'],
    default: 'cashfree',
    index: true,
},
completedByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
},
lastStatusUpdatedByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
},
adminNotes: {
    type: String,
    default: null,
    maxlength: 500,
},
```

### 11.2 Schema Change Analysis

| Change | Type | Reversible | Impact |
|---|---|---|---|
| Add `gateway` field | Additive | Yes | Default 'cashfree' preserves existing records |
| Add `completedByAdminId` | Additive | Yes | Null for existing records |
| Add `lastStatusUpdatedByAdminId` | Additive | Yes | Null for existing records |
| Add `adminNotes` | Additive | Yes | Null for existing records |

**All changes are purely additive** — no existing fields are modified or removed. Default values ensure backward compatibility with existing records.

### 11.3 No Migration Required

Since all new fields have defaults (`'cashfree'`, `null`, `null`), existing PayoutTransaction documents remain valid without any data migration. Mongoose handles missing fields by applying defaults on read.

### 11.4 Index Changes

Add indexes for admin queries and UTR replay prevention:
```javascript
payoutTransactionSchema.index({ gateway: 1, status: 1, createdAt: -1 });
payoutTransactionSchema.index(
    { utr: 1 },
    { unique: true, partialFilterExpression: { utr: { $type: 'string' } } },
);
```


---

## Part 3: Implementation Details, Security, Concurrency & Testing

---

## 12. Admin System Design

### 12.1 Admin User Strategy

**Decision**: Reuse the existing `User` model with `roleType: 'ADMIN'`.

**Rationale**:
- `User` model already supports `ADMIN` in the `roleType` enum
- Authentication middleware already loads users by `roleType`
- `authorize(ROLES.ADMIN)` middleware already works
- `generateTokenPair(userId, roleType)` already includes role in JWT
- No new model, no new auth flow, no new middleware needed

### 12.2 Admin Creation Script

**File**: `scripts/create-admin-user.mjs`

Purpose: One-time script to create admin users.

```javascript
// Usage: node scripts/create-admin-user.mjs
// Prompts for phone number and email, creates User with roleType=ADMIN
// Admin logs in via the same OTP flow as other users

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = (await import('../src/models/user.model.js')).default;

    const phoneNumber = await rl.question('Admin phone number (with +91): ');
    const email = await rl.question('Admin email: ');

    const existing = await User.findOne({ phoneNumber });
    if (existing) {
        console.log('User already exists. Updating roleType to ADMIN...');
        existing.roleType = 'ADMIN';
        await existing.save();
        console.log(`Updated user ${existing._id} to ADMIN`);
    } else {
        const admin = await User.create({
            phoneNumber: phoneNumber.trim(),
            email: email.trim().toLowerCase(),
            roleType: 'ADMIN',
            isActive: true,
        });
        console.log(`Created admin user: ${admin._id}`);
    }
} finally {
    rl.close();
    await mongoose.disconnect();
}
```

### 12.3 Admin Authentication Flow

Admin uses the **same OTP-based login** as other users:
1. Admin sends phone number → receives OTP via MSG91
2. Admin verifies OTP → `authService.resolveOtpSession()`
3. System finds existing User with `roleType: 'ADMIN'`
4. Issues access + refresh token pair
5. Admin uses Bearer token for all API calls
6. `authorize(ROLES.ADMIN)` middleware enforces admin-only access

**No password-based auth needed** — OTP is sufficient and matches existing architecture.

### 12.4 Admin Token Lifecycle

- Access token: 15-minute expiry (same as other users)
- Refresh token: 180-day expiry (same as other users)
- Refresh token rotation on each use
- Single-device session via `refreshTokenHash`

---

## 13. Concurrency & Consistency Strategy

### 13.1 Duplicate Payout Prevention

**Problem**: Two admins might try to complete the same payout simultaneously.

**Solution**: Atomic booking claim in MongoDB:

```javascript
// In payoutService.createManualPayout()
const payoutId = payoutRepository.createId();
const claimResult = await bookingRepository.claimManualPayoutBookings({
    bookingIds,
    payoutId,
});

if (claimResult.matchedCount !== bookingIds.length) {
    await bookingRepository.releaseManualPayoutClaim(payoutId);
    throw new ConflictError('One or more bookings were modified by another admin or already have an active payout');
}
```

The claim filter only matches completed/no-show, successfully paid bookings whose payout status is `not_initiated`, `failed`, or `reversed`. If another admin or a future auto-batch claims a booking first, the matched count drops and the API returns `409 Conflict`.

### 13.2 Optimistic Concurrency for Payout Updates

```javascript
// For PATCH operations on existing payouts:
async updatePayoutStatus(payoutId, { status, reason, notes }, adminId) {
    const payout = await payoutRepository.findById(payoutId);
    if (!payout) throw new NotFoundError('Payout');

    // Only allow failing INITIATED or SUCCESS payouts
    if (![PAYOUT_TRANSACTION_STATUS.INITIATED, PAYOUT_TRANSACTION_STATUS.SUCCESS].includes(payout.status)) {
        throw new BadRequestError(`Cannot transition payout from ${payout.status} to ${status}`);
    }

    // Atomic update with status precondition
    const updated = await PayoutTransaction.findOneAndUpdate(
        {
            _id: payoutId,
            status: payout.status,  // Optimistic lock on current status
        },
        {
            $set: {
                status: PAYOUT_TRANSACTION_STATUS.FAILED,
                failureReason: reason,
                lastStatusUpdatedByAdminId: adminId,
                adminNotes: notes || null,
            },
        },
        { returnDocument: 'after' },
    );

    if (!updated) {
        throw new ConflictError('Payout was modified by another admin. Please refresh and try again.');
    }

    // Reopen linked records for retry
    await bookingRepository.markPayoutBookingsFailed(payout.bookingIds, payout._id);
    await paymentRepository.markUnsettledByIds(payout.paymentTransactionIds);

    return serializePayout(updated);
}
```

### 13.3 Idempotency

**UTR-based idempotency**: Before creating a manual payout, check if a PayoutTransaction with the same normalized UTR already exists. The schema also has a partial unique index on `utr`.

```javascript
// In createManualPayout()
const normalizedUtr = normalizeUtr(utr);
const existingByUtr = await payoutRepository.findByUtr(normalizedUtr);
if (existingByUtr) {
    throw new ConflictError(`A payout with UTR ${normalizedUtr} already exists`);
}
```

This makes `POST /api/v1/payouts` naturally idempotent — retrying with the same UTR is safe and returns a clear `409` error.

### 13.4 Race Condition Mitigations

| Scenario | Mitigation |
|---|---|
| Two admins complete same barber's payout | Atomic booking claim by `_id`, booking status, payment status, and payout status |
| Admin completes payout while auto-batch runs after future auto re-enable | Both paths use payout status preconditions; stale manual submit returns `409` |
| Admin updates payout during another admin correction | Optimistic locking via `findOneAndUpdate` with status precondition |
| Same UTR used for two different payouts | Service pre-check plus partial unique database index |
| Stale UI showing already-processed payouts | Frontend should refresh before action; API validates current state |

### 13.5 Transaction Safety

MongoDB cross-collection transactions require replica-set deployment. To preserve local/standalone MongoDB compatibility and match the current codebase style, this implementation uses atomic state transitions and compensating release logic rather than introducing a transaction requirement.

1. Validate barber, booking ownership, booking state, payment success, unsettled payment state, and UTR uniqueness.
2. Atomically claim all requested bookings with a generated payout id.
3. Create the manual `PayoutTransaction`; release the booking claim if creation fails.
4. Complete booking payout fields and mark payments settled.
5. Send notification after persistence.

If a later persistence step fails, the `PayoutTransaction` record plus claimed booking id gives operations a deterministic reconciliation target. The API is protected against duplicate payout creation by the booking claim and UTR unique index.

---

## 14. Security Considerations

### 14.1 Authentication Security

| Concern | Mitigation |
|---|---|
| Admin impersonation | OTP verification required; phone number must be pre-registered |
| Token theft | 15-min access token expiry; refresh token rotation |
| Replay attacks | JWT `jti` (unique ID per token) |
| Brute force OTP | OTP rate limiter: 5 sends/phone/15min, 10 sends/IP/15min |

### 14.2 Authorization Boundaries

| Action | HTTP | Endpoint | Required Role |
|---|---|---|---|
| List pending payouts | `GET` | `/payouts/pending` | ADMIN |
| List payout history | `GET` | `/payouts` | ADMIN |
| View payout detail | `GET` | `/payouts/:payoutId` | ADMIN |
| Create manual payout | `POST` | `/payouts` | ADMIN |
| Update payout status | `PATCH` | `/payouts/:payoutId` | ADMIN |
| Retry auto payout | `POST` | `/payouts/:payoutId/retry` | ADMIN (existing) |
| Cashfree webhook | `POST` | `/payouts/webhook` | Public (signature-verified) |

### 14.3 Sensitive Data Handling

| Field | Storage | API Exposure | Logging |
|---|---|---|---|
| UPI ID | Stored in Barber model | Exposed to admin only | Masked (`ma**ar@ptyes`) |
| Bank Account | Stored in Barber model | NOT exposed in pending list | Masked (`******1234`) |
| IFSC | Stored in Barber model | NOT exposed in payout APIs | Plain (not sensitive) |
| UTR | Stored in PayoutTransaction | Exposed to admin only | Plain (transaction reference) |
| Phone Number | Stored in User model | NOT exposed in payout APIs | Masked (`*****6789`) |
| Admin Notes | Stored in PayoutTransaction | Exposed to admin only | Plain |

### 14.4 Payout Tampering Prevention

- All payout state transitions are validated server-side
- Status precondition checks prevent invalid transitions
- Admin ID is automatically set from `req.user._id` (cannot be spoofed)
- Amount is computed from payment records, not from admin input
- Booking IDs are validated against database records
- Booking claims are atomic and reject stale submissions
- Manual failure correction is restricted to `gateway=manual`
- UTR uniqueness is enforced by service logic and a partial unique index

### 14.5 Audit Trail

Every manual payout action is logged with:

```javascript
logger.info('[PayoutService] Manual payout created', {
    payoutId: payout._id,
    adminId: adminId,
    barberId: barberId,
    bookingCount: bookingIds.length,
    amountInRupees: amountInRupees,
    utr: utr,
    gateway: 'manual',
});
```

The `completedByAdminId` field in `PayoutTransaction` permanently records which admin completed each payout. `lastStatusUpdatedByAdminId` records the admin who last corrected status, so failure corrections do not erase the original completion actor.

### 14.6 Rate Limiting

Existing OTP rate limiter covers admin login. For payout operations:
- No additional rate limiting needed (admin-only, low volume)
- If needed in future, can add per-admin-user rate limiter

---

## 15. Validation Rules

### 15.1 Request Validation (Joi Schemas)

```javascript
// payout.validator.js — New schemas

// GET /api/v1/payouts/pending
export const pendingPayoutsQuerySchema = paginationSchema.keys({
    search: Joi.string().trim().max(100).allow('').optional(),
});

// POST /api/v1/payouts
export const createManualPayoutSchema = Joi.object({
    barberId: objectId.required().messages({
        'any.required': 'Barber ID is required',
    }),
    bookingIds: Joi.array()
        .items(objectId.required())
        .min(1)
        .max(100)
        .unique()
        .required()
        .messages({
            'array.min': 'At least one booking ID is required',
            'array.max': 'Maximum 100 bookings per payout',
            'array.unique': 'Booking IDs must not contain duplicates',
        }),
    utr: Joi.string()
        .trim()
        .uppercase()
        .min(3)
        .max(50)
        .pattern(/^[A-Z0-9]+$/)
        .required()
        .messages({
            'any.required': 'UTR/transaction reference is required',
            'string.pattern.base': 'UTR must contain only alphanumeric characters',
        }),
    transferMode: Joi.string()
        .valid(...Object.values(PAYOUT_MODES))
        .default(PAYOUT_MODES.UPI)
        .optional(),
    notes: Joi.string().trim().max(500).allow('').optional(),
});

// PATCH /api/v1/payouts/:payoutId
export const updatePayoutStatusSchema = Joi.object({
    status: Joi.string()
        .valid('FAILED')
        .required()
        .messages({
            'any.only': 'Only FAILED status transition is supported via PATCH',
        }),
    reason: Joi.string().trim().min(3).max(500).required().messages({
        'any.required': 'Failure reason is required when marking as failed',
    }),
    notes: Joi.string().trim().max(500).allow('').optional(),
});

// GET /api/v1/payouts
export const listPayoutsQuerySchema = paginationSchema.keys({
    status: Joi.string().valid(...ALL_PAYOUT_TRANSACTION_STATUSES).optional(),
    barberId: objectId.optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    gateway: Joi.string().valid('cashfree', 'manual').optional(),
    sort: Joi.string()
        .pattern(/^[a-zA-Z]+:(asc|desc)$/)
        .default('createdAt:desc')
        .optional()
        .messages({
            'string.pattern.base': 'Sort must be in format field:direction (e.g., createdAt:desc)',
        }),
});
```

### 15.2 Payout State Validation

| Current Status | Allowed Transitions | Actor |
|---|---|---|
| `not_initiated` (booking) | → `INITIATED` (via POST /payouts) | Admin / Batch Job |
| `INITIATED` | → `PENDING` (auto) / `SUCCESS` (manual) / `FAILED` | System / Admin |
| `PENDING` | → `SUCCESS` / `FAILED` / `REVERSED` | Webhook / Poller |
| `SUCCESS` | → `FAILED` (admin override, manual only) | Admin via PATCH |
| `FAILED` (booking) | Eligible for another manual payout claim | Admin |
| `REVERSED` (booking) | Eligible for another manual payout claim or Cashfree retry in auto mode | Admin |

### 15.3 Data Integrity Validation

Before creating a manual payout (`POST /api/v1/payouts`):
1. ✅ `barberId` exists and is active
2. ✅ All `bookingIds` exist and belong to the same barber's shop
3. ✅ All bookings have `status: completed` or `no-show`
4. ✅ All bookings have `paymentStatus: success`
5. ✅ All bookings have `payoutStatus: not_initiated`, `failed`, or `reversed`
6. ✅ Each booking has a completed payment transaction
7. ✅ Payment transactions are not already settled
8. ✅ Total payout amount > 0
9. ✅ UTR is unique (no existing payout with same normalized UTR)
10. ✅ Admin user is active and has ADMIN role

---

## 16. Error Handling

### 16.1 Error Response Catalog

| Scenario | HTTP | Error Class | Message |
|---|---|---|---|
| Missing auth token | 401 | `UnauthorizedError` | No token provided |
| Invalid/expired token | 401 | `UnauthorizedError` | Invalid or expired token |
| Non-admin user | 403 | `ForbiddenError` | Access denied. Required role(s): ADMIN |
| Barber not found | 404 | `NotFoundError` | Barber not found |
| Booking not found | 404 | `NotFoundError` | One or more bookings not found |
| Payout not found | 404 | `NotFoundError` | Payout not found |
| Booking not completed | 400 | `BadRequestError` | All bookings must be completed |
| Payment not successful | 400 | `BadRequestError` | All bookings must have successful payments |
| Already paid out | 400 | `BadRequestError` | One or more bookings already has an active payout |
| Payment already settled | 409 | `ConflictError` | One or more payments are already settled |
| Invalid UTR format | 400 | `BadRequestError` | UTR must contain only alphanumeric characters |
| Duplicate UTR | 409 | `ConflictError` | A payout with UTR X already exists |
| Concurrent modification | 409 | `ConflictError` | Payout was modified by another admin |
| Cashfree payout patched manually | 400 | `BadRequestError` | Manual status correction is only supported for manual payouts |
| Invalid status transition | 400 | `BadRequestError` | Cannot transition payout from X to Y |
| Invalid payout amount | 400 | `BadRequestError` | Invalid payout amount |
| Invalid sort parameter | 400 | `BadRequestError` | Sort must be in format field:direction |

### 16.2 Retryable vs Non-Retryable

| Error Type | Retryable | Action |
|---|---|---|
| Network timeout | Yes | Admin retries manually |
| Database connection error | Yes | Admin retries after delay |
| Validation errors (400) | No | Fix input and retry |
| Duplicate UTR (409) | No | Use correct UTR |
| Concurrent modification (409) | Yes | Refresh and retry |
| Auth errors (401/403) | No | Re-authenticate |

---

## 17. Backward Compatibility

### 17.1 Compatibility Matrix

| Component | Auto Mode | Manual Mode | Compatible |
|---|---|---|---|
| PayoutTransaction model | ✅ Works (gateway=cashfree) | ✅ Works (gateway=manual) | ✅ |
| Booking payoutStatus field | ✅ Same lifecycle | ✅ Same lifecycle | ✅ |
| PaymentTransaction settlement | ✅ markSettledByIds | ✅ markSettledByIds | ✅ |
| Payout webhook handler | ✅ Active | ✅ Still active (for any in-flight auto payouts) | ✅ |
| Payout retry endpoint | ✅ Active | ✅ Active (for legacy failed payouts) | ✅ |
| Payout poller | ✅ Active | ⏸️ Skipped (self-bypass) | ✅ |
| Payout batch job | ✅ Active | ⏸️ Skipped (self-bypass) | ✅ |
| Earnings service | ✅ No change | ✅ No change | ✅ |
| Notification events | ✅ No change | ✅ Same notification function | ✅ |
| Existing payout records | ✅ Valid | ✅ Valid (gateway defaults to cashfree) | ✅ |

### 17.2 Zero-Downtime Deployment

1. Deploy code changes (additive only)
2. Restart server
3. Auto-payout jobs self-skip (mode is `'manual'` in config)
4. Admin endpoints become available
5. Existing payout records remain unchanged
6. Any in-flight PENDING payouts continue to receive webhooks normally

### 17.3 Rollback Strategy

1. Change `mode: 'auto'` in `src/config/index.js`
2. Deploy and restart server
3. Auto-payout resumes on next batch cycle
4. Manual payout endpoints remain available (no harm)
5. Manual payout records remain in database with `gateway=manual`

---

## 18. Testing Strategy

### 18.1 Unit Tests

| Test File | Test Cases |
|---|---|
| `payout.service.test.js` | `createManualPayout()` — happy path, validation errors, duplicate UTR, concurrent modification |
| `payout.service.test.js` | `updatePayoutStatus()` — happy path, invalid status transition, not found, concurrent modification |
| `payout.service.test.js` | `getPendingPayoutsForAdmin()` — aggregation, search, pagination |
| `payout.service.test.js` | `listPayouts()` — filtering by all params, pagination, sorting |
| `payout.service.test.js` | `getPayoutDetail()` — found, not found |
| `payout-batch.cron.test.js` | Manual mode bypass test |
| `payout-poller.cron.test.js` | Manual mode bypass test |
| `payout.validator.test.js` | All new Joi schemas |

### 18.2 Integration Tests

| Test Scenario | Endpoints |
|---|---|
| Admin login → view pending → create payout → verify in list | Auth → GET /pending → POST / → GET / |
| Admin login → create payout → update to failed → verify booking status | Auth → POST / → PATCH /:id → verify bookings |
| Non-admin user → attempt admin endpoints → 403 | POST /payouts → expect 403 |
| Auto mode → verify batch job runs normally | Set mode='auto' → batch executes |
| Manual mode → verify batch job skips | Set mode='manual' → batch returns skipped |
| Duplicate UTR → 409 Conflict | POST /payouts twice with same UTR |

### 18.3 Manual QA Scenarios

1. ✅ Create admin user with script
2. ✅ Login as admin via OTP
3. ✅ `GET /payouts/pending` — view pending payouts list
4. ✅ `POST /payouts` — create manual payout with valid UTR
5. ✅ Verify booking payoutStatus updated
6. ✅ Verify PayoutTransaction created with gateway=manual
7. ✅ Verify barber receives payout notification
8. ✅ `POST /payouts` with same UTR → 409 error
9. ✅ `PATCH /payouts/:id` → mark as failed, verify booking reversal
10. ✅ `GET /payouts?status=SUCCESS&gateway=manual` — filter history
11. ✅ `GET /payouts?sort=amount:desc` — verify sorting
12. ✅ Verify UPI deep link format in pending response
13. ✅ Change config to auto mode → verify batch job runs
14. ✅ Change config back to manual → verify batch skips

---

## 19. Deployment Considerations

### 19.1 Deployment Sequence

1. **Pre-deploy**: Verify no PENDING auto-payouts in flight
2. **Deploy**: Push code changes (config has `mode: 'manual'`)
3. **Restart**: Restart server(s)
4. **Verify**: Check logs for `[PayoutBatchJob] Skipped — PAYOUT_MODE is manual`
5. **Create Admin**: Run `node scripts/create-admin-user.mjs` against production DB
6. **Test**: Admin logs in and verifies `GET /api/v1/payouts/pending`

### 19.2 Rollback Procedure

1. Change `mode: 'auto'` in `src/config/index.js`
2. Deploy and restart server
3. No data rollback needed (all changes are additive)

### 19.3 Monitoring

- Monitor logs for `[PayoutService] Manual payout created` events
- Monitor for `[PayoutBatchJob] Skipped` in auto mode (should NOT appear)
- Track payout completion latency (time between booking completion and payout)
- Alert on payoutStatus=not_initiated bookings older than 48 hours

---

## 20. Future Extensibility

### 20.1 Hybrid Mode

A future `mode: 'hybrid'` could allow:
- Auto-payout for verified barbers
- Manual payout for unverified barbers

### 20.2 Multiple Admins

The `completedByAdminId` field already supports multiple admins. Admin activity can be tracked per-admin.

### 20.3 Admin Dashboard

The RESTful API endpoints are designed to be frontend-agnostic. Any admin dashboard (web, mobile) can consume them. The query-param based filtering maps directly to UI filter controls.

### 20.4 Batch Manual Payout

The `POST /api/v1/payouts` endpoint already accepts multiple `bookingIds`, enabling batch completion for a single barber.

### 20.5 Additional Sort Fields

The `sort` query parameter pattern (`field:direction`) is extensible. New sortable fields can be added to the whitelist without API changes.

### 20.6 Re-enabling Cashfree

When switching back to `mode: 'auto'`:
- All existing manual payout records persist with `gateway: 'manual'`
- The `GET /api/v1/payouts?gateway=cashfree` filter naturally shows only auto payouts
- The admin CRUD endpoints remain functional for any manual payouts needed alongside auto

---

## 21. Assumptions & Constraints

| # | Assumption | Justification |
|---|---|---|
| 1 | MongoDB deployment uses replica set | Required for `findOneAndUpdate` concurrency guarantees |
| 2 | Admin users are few (1-3) | No complex RBAC needed |
| 3 | Manual payouts are temporary (2-3 months) | Code-level config toggle is sufficient |
| 4 | UTR is always available after external transfer | Required for audit trail |
| 5 | OTP-based admin auth is acceptable | Matches existing auth pattern |
| 6 | No frontend changes are required initially | API-only approach with Postman/cURL |
| 7 | Payout amounts are computed server-side | Admin cannot override computed amounts |

---

## 22. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Admin enters wrong UTR | Medium | Low | UTR is stored for reconciliation; can be corrected via PATCH |
| Admin forgets to process payouts | Medium | High | Monitoring alert for old unprocessed payouts |
| Double payment (same barber, same bookings) | Low | High | Booking payoutStatus check prevents this |
| Switching back to auto with manual records | Low | None | Auto mode ignores `gateway` field |
| Admin account compromise | Low | High | OTP auth + session invalidation |


---

## Part 4: File-by-File Implementation Plan & Sequencing

---

## 23. File-by-File Implementation Breakdown

### 23.1 `src/config/index.js`

**Change**: Add `mode` constant to `payout` config section. This is a **code-level constant**, not an environment variable.

```diff
  payout: Object.freeze({
+     mode: 'manual',  // 'auto' | 'manual' — Change to 'auto' to re-enable Cashfree payouts
      maxRetries: 3,
      pollIntervalMs: 10 * 60 * 1000,
      stuckThresholdMs: 10 * 60 * 1000,
  }),
```

**Rationale**: Keeping payout mode as a code-level constant ensures that mode switches are tracked in version control, require a PR review, and are deployed deliberately — matching the existing pattern where business rules are code constants and only secrets/infrastructure values come from `.env`.

**Impact**: Minimal. One new field in an existing frozen object.

---

### 23.2 `src/utils/constants.js`

**Change**: Add `PAYOUT_GATEWAY` constant.

```diff
+ export const PAYOUT_GATEWAY = Object.freeze({
+     CASHFREE: 'cashfree',
+     MANUAL: 'manual',
+ });
+
+ export const ALL_PAYOUT_GATEWAYS = Object.values(PAYOUT_GATEWAY);
```

**Impact**: Minimal. New constant only.

---

### 23.3 `src/models/payout-transaction.model.js`

**Change**: Add three new fields.

```diff
+ import { ALL_PAYOUT_GATEWAYS } from '../utils/constants.js';

  // Add after 'remarks' field:
+ gateway: {
+     type: String,
+     enum: ALL_PAYOUT_GATEWAYS,
+     default: 'cashfree',
+     index: true,
+ },
+ completedByAdminId: {
+     type: mongoose.Schema.Types.ObjectId,
+     ref: 'User',
+     default: null,
+ },
+ adminNotes: {
+     type: String,
+     default: null,
+     maxlength: 500,
+ },

  // Add new index:
+ payoutTransactionSchema.index({ gateway: 1, status: 1 });
```

**Impact**: Additive. Existing records default to `gateway: 'cashfree'`.

---

### 23.4 `src/repositories/payout.repository.js`

**Change**: Add new query methods for admin operations.

```diff
  // Add new methods:
+ async findByUtr(utr) {
+     return PayoutTransaction.findOne({ utr });
+ }
+
+ async findAllFiltered(filter = {}, { skip, limit, sort } = {}) {
+     const query = PayoutTransaction.find(trustQueryOperators(filter))
+         .sort(sort || { createdAt: -1 });
+     if (skip !== undefined) query.skip(skip);
+     if (limit !== undefined) query.limit(limit);
+     return query;
+ }
+
+ async countAll(filter = {}) {
+     return PayoutTransaction.countDocuments(trustQueryOperators(filter));
+ }
+
+ async findByIdPopulated(id) {
+     return PayoutTransaction.findById(id)
+         .populate('barberId', 'firstName lastName upiId accountHolderName')
+         .populate('shopId', 'shopName')
+         .populate('completedByAdminId', 'email phoneNumber');
+ }
+
+ async atomicStatusUpdate(id, expectedStatus, updates) {
+     return PayoutTransaction.findOneAndUpdate(
+         trustQueryOperators({ _id: id, status: expectedStatus }),
+         { $set: updates },
+         { returnDocument: 'after' },
+     );
+ }
```

**Impact**: Additive. No existing methods modified.

---

### 23.5 `src/repositories/booking.repository.js`

**Change**: Add admin aggregation method for pending payouts.

```diff
  // Add new method:
+ async aggregatePendingPayoutsByBarber({ search } = {}) {
+     const pipeline = [
+         {
+             $match: {
+                 status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW] },
+                 payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
+                 paymentStatus: PAYMENT_STATUS.SUCCESS,
+             },
+         },
+         { $lookup: { from: 'shops', localField: 'shopId', foreignField: '_id', as: 'shop' } },
+         { $unwind: '$shop' },
+         { $lookup: { from: 'barbers', localField: 'shop.barberId', foreignField: '_id', as: 'barber' } },
+         { $unwind: '$barber' },
+         { $lookup: { from: 'users', localField: 'barber.userId', foreignField: '_id', as: 'user' } },
+         { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
+         { $lookup: { from: 'payment_transactions', localField: '_id', foreignField: 'bookingId', as: 'payments' } },
+         {
+             $addFields: {
+                 completedPayment: {
+                     $arrayElemAt: [
+                         { $filter: { input: '$payments', as: 'p', cond: { $eq: ['$$p.status', 'completed'] } } },
+                         0,
+                     ],
+                 },
+             },
+         },
+         {
+             $group: {
+                 _id: '$shop.barberId',
+                 barberId: { $first: '$shop.barberId' },
+                 barberFirstName: { $first: '$barber.firstName' },
+                 barberLastName: { $first: '$barber.lastName' },
+                 shopName: { $first: '$shop.shopName' },
+                 shopId: { $first: '$shop._id' },
+                 upiId: { $first: '$barber.upiId' },
+                 accountHolderName: { $first: '$barber.accountHolderName' },
+                 totalAmountInPaisa: {
+                     $sum: { $ifNull: ['$completedPayment.settlement.barberPayout', '$completedPayment.settlement.serviceAmount'] },
+                 },
+                 bookingCount: { $sum: 1 },
+                 bookingIds: { $push: '$_id' },
+                 oldestBookingDate: { $min: '$date' },
+             },
+         },
+         { $sort: { totalAmountInPaisa: -1 } },
+     ];
+
+     if (search) {
+         const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
+         pipeline.push({
+             $match: {
+                 $or: [
+                     { barberFirstName: searchRegex },
+                     { barberLastName: searchRegex },
+                     { shopName: searchRegex },
+                 ],
+             },
+         });
+     }
+
+     return Booking.aggregate(pipeline);
+ }
```

**Impact**: Additive. New method only. No existing queries modified.

---

### 23.6 `src/services/payout.service.js`

**Change**: Add new exported functions for manual payout operations. All new — no existing functions are modified.

```diff
+ import { ConflictError } from '../utils/api-error.js';
+ import { PAYOUT_GATEWAY } from '../utils/constants.js';
+ import { buildPagination } from '../utils/pagination.utils.js';

  // ── Helper ──
+ const buildUpiDeepLink = ({ upiId, name, amountInRupees, bookingCount }) => {
+     const params = new URLSearchParams({
+         pa: upiId,
+         pn: name,
+         am: String(amountInRupees),
+         tn: `EverCut Payout - ${bookingCount} booking(s)`,
+     });
+     return `upi://pay?${params.toString()}`;
+ };

+ const parseSortParam = (sortParam) => {
+     if (!sortParam) return { createdAt: -1 };
+     const [field, direction] = sortParam.split(':');
+     const allowedFields = ['createdAt', 'amount', 'amountInRupees', 'processedAt'];
+     if (!allowedFields.includes(field)) return { createdAt: -1 };
+     return { [field]: direction === 'asc' ? 1 : -1 };
+ };

  // ── GET /api/v1/payouts/pending ──

+ export const getPendingPayoutsForAdmin = async (query = {}) => {
+     const results = await bookingRepository.aggregatePendingPayoutsByBarber({ search: query.search });
+     const { skip, limit, pagination } = buildPagination(query, results.length);
+     const paginated = results.slice(skip, skip + limit);
+
+     const items = paginated.map((item) => ({
+         barberId: toObjectIdString(item.barberId),
+         barberName: `${item.barberFirstName || ''} ${item.barberLastName || ''}`.trim(),
+         shopName: item.shopName,
+         shopId: toObjectIdString(item.shopId),
+         upiId: item.upiId,
+         accountHolderName: item.accountHolderName || null,
+         totalAmountInPaisa: item.totalAmountInPaisa || 0,
+         totalAmountInRupees: (item.totalAmountInPaisa || 0) / 100,
+         bookingCount: item.bookingCount,
+         bookingIds: (item.bookingIds || []).map(toObjectIdString),
+         oldestBookingDate: item.oldestBookingDate,
+         upiDeepLink: item.upiId
+             ? buildUpiDeepLink({
+                 upiId: item.upiId,
+                 name: item.accountHolderName || `${item.barberFirstName} ${item.barberLastName}`.trim(),
+                 amountInRupees: (item.totalAmountInPaisa || 0) / 100,
+                 bookingCount: item.bookingCount,
+             })
+             : null,
+     }));
+
+     return { items, pagination };
+ };

  // ── POST /api/v1/payouts ──

+ export const createManualPayout = async ({ barberId, bookingIds, utr, transferMode, notes }, adminId) => {
+     // 1. Validate UTR uniqueness (idempotency key)
+     const existingByUtr = await payoutRepository.findByUtr(utr);
+     if (existingByUtr) {
+         throw new ConflictError(`A payout with UTR ${utr} already exists`);
+     }
+
+     // 2. Validate bookings
+     const bookings = await bookingRepository.findByIds(bookingIds);
+     if (bookings.length !== bookingIds.length) {
+         throw new NotFoundError('One or more bookings');
+     }
+
+     for (const booking of bookings) {
+         if (!['completed', 'no-show'].includes(booking.status)) {
+             throw new BadRequestError('All bookings must be completed before payout');
+         }
+         if (booking.paymentStatus !== 'success') {
+             throw new BadRequestError('All bookings must have successful payments before payout');
+         }
+         if (booking.payoutStatus !== PAYOUT_STATUS.NOT_INITIATED) {
+             throw new BadRequestError('One or more bookings already has an active payout');
+         }
+     }
+
+     // 3. Validate barber ownership
+     const firstBooking = bookings[0];
+     const { shop, barber } = await getShopAndBarber(firstBooking.shopId?._id || firstBooking.shopId);
+     if (toObjectIdString(shop.barberId) !== toObjectIdString(barberId)) {
+         throw new BadRequestError('Bookings do not belong to the requested barber');
+     }
+
+     // 4. Compute amount from payments (server-side, non-overridable)
+     const paymentTransactions = await paymentRepository.findCompletedByBookingIds(bookingIds);
+     if (paymentTransactions.length !== bookingIds.length) {
+         throw new NotFoundError('Completed payment for one or more bookings');
+     }
+
+     const paymentMap = new Map(
+         paymentTransactions.map((p) => [toObjectIdString(p.bookingId), p]),
+     );
+     const totalPayoutInPaisa = bookingIds.reduce((sum, id) => {
+         const payment = paymentMap.get(toObjectIdString(id));
+         return sum + getSettledBarberPayout(payment);
+     }, 0);
+
+     if (totalPayoutInPaisa <= 0) {
+         throw new BadRequestError('Invalid payout amount');
+     }
+
+     // 5. Prepare payout totals and references
+     const transferId = generateTransferId(barber._id);
+     const amountInRupees = totalPayoutInPaisa / 100;
+     const paymentTransactionIds = paymentTransactions.map((p) => p._id);
+     const processedAt = new Date();
+
+     // 6. Atomically claim bookings before creating the payout record
+     const payoutId = payoutRepository.createId();
+     const claimResult = await bookingRepository.claimManualPayoutBookings({ bookingIds, payoutId });
+     if (claimResult.matchedCount !== bookingIds.length) {
+         await bookingRepository.releaseManualPayoutClaim(payoutId);
+         throw new ConflictError('One or more bookings were modified by another admin or already have an active payout');
+     }
+
+     const payoutTransaction = await payoutRepository.create({
+         _id: payoutId,
+         bookingIds,
+         barberId: barber._id,
+         shopId: shop._id,
+         paymentTransactionIds,
+         transferId,
+         beneficiaryId: `MANUAL_${barber._id}`,
+         amount: totalPayoutInPaisa,
+         amountInRupees,
+         transferMode: transferMode || PAYOUT_MODES.UPI,
+         status: PAYOUT_TRANSACTION_STATUS.SUCCESS,
+         utr,
+         processedAt,
+         gateway: PAYOUT_GATEWAY.MANUAL,
+         completedByAdminId: adminId,
+         lastStatusUpdatedByAdminId: adminId,
+         adminNotes: notes || null,
+         remarks: `Manual payout for ${bookingIds.length} booking(s)`,
+     });
+
+     // 7. Complete claimed bookings
+     await bookingRepository.completeManualPayoutBookings(bookingIds, payoutTransaction._id, {
+         processedAt,
+         utr,
+     });
+
+     // 8. Mark payments as settled
+     await paymentRepository.markSettledByIds(paymentTransactionIds, processedAt);
+
+     // 9. Send notification to barber (fire-and-forget)
+     const barberUserId = await getPayoutRecipientUserId(barber._id);
+     await notificationEvents.notifyPayoutStatus({
+         payoutId: payoutTransaction._id,
+         barberId: barberUserId,
+         status: PAYOUT_TRANSACTION_STATUS.SUCCESS,
+         amountInRupees,
+     });
+
+     logger.info('[PayoutService] Manual payout created', {
+         payoutId: payoutTransaction._id,
+         adminId,
+         barberId: toObjectIdString(barber._id),
+         bookingCount: bookingIds.length,
+         amountInRupees,
+         utr,
+         gateway: 'manual',
+     });
+
+     return serializePayout(payoutTransaction);
+ };

  // ── PATCH /api/v1/payouts/:payoutId ──

+ export const updatePayoutStatus = async (payoutId, { status, reason, notes }, adminId) => {
+     const payout = await payoutRepository.findById(payoutId);
+     if (!payout) throw new NotFoundError('Payout');
+
+     // Currently only FAILED transition is supported via PATCH
+     if (status !== PAYOUT_TRANSACTION_STATUS.FAILED) {
+         throw new BadRequestError(`Only FAILED status transition is supported`);
+     }
+
+     if ((payout.gateway || PAYOUT_GATEWAY.CASHFREE) !== PAYOUT_GATEWAY.MANUAL) {
+         throw new BadRequestError('Manual status correction is only supported for manual payouts');
+     }
+
+     if (![PAYOUT_TRANSACTION_STATUS.INITIATED, PAYOUT_TRANSACTION_STATUS.SUCCESS].includes(payout.status)) {
+         throw new BadRequestError(`Cannot transition payout from ${payout.status} to ${status}`);
+     }
+
+     // Optimistic locking: atomic update with status precondition
+     const updated = await payoutRepository.atomicStatusUpdate(payoutId, payout.status, {
+         status: PAYOUT_TRANSACTION_STATUS.FAILED,
+         failureReason: reason,
+         lastStatusUpdatedByAdminId: adminId,
+         adminNotes: notes || null,
+     });
+
+     if (!updated) {
+         throw new ConflictError('Payout was modified by another admin. Please refresh and try again.');
+     }
+
+     await bookingRepository.markPayoutBookingsFailed(payout.bookingIds, payout._id);
+     await paymentRepository.markUnsettledByIds(payout.paymentTransactionIds);
+
+     logger.info('[PayoutService] Payout marked as failed', {
+         payoutId,
+         adminId,
+         reason,
+         gateway: payout.gateway,
+     });
+
+     return serializePayout(updated);
+ };

  // ── GET /api/v1/payouts ──

+ export const listPayouts = async (query = {}) => {
+     const filter = {};
+     if (query.status) filter.status = query.status;
+     if (query.barberId) filter.barberId = query.barberId;
+     if (query.gateway) filter.gateway = query.gateway;
+     if (query.startDate || query.endDate) {
+         filter.createdAt = {};
+         if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
+         if (query.endDate) {
+             const endDate = new Date(query.endDate);
+             endDate.setHours(23, 59, 59, 999);
+             filter.createdAt.$lte = endDate;
+         }
+     }
+
+     const total = await payoutRepository.countAll(filter);
+     const { skip, limit, pagination } = buildPagination(query, total);
+     const sort = parseSortParam(query.sort);
+     const payouts = await payoutRepository.findAllFiltered(filter, { skip, limit, sort });
+
+     return {
+         items: payouts.map(serializePayout),
+         pagination,
+     };
+ };

  // ── GET /api/v1/payouts/:payoutId ──

+ export const getPayoutDetail = async (payoutId) => {
+     const payout = await payoutRepository.findByIdPopulated(payoutId);
+     if (!payout) throw new NotFoundError('Payout');
+     return serializePayout(payout);
+ };
```

**Impact**: All new functions. Existing functions untouched.

---

### 23.7 `src/controllers/payout.controller.js`

**Change**: Add five new controller methods mapped to RESTful endpoints.

```diff
+ // GET /api/v1/payouts/pending
+ export const getPendingPayouts = async (req, res, next) => {
+     try {
+         const query = getValidatedRequestData(req, 'query');
+         const result = await payoutService.getPendingPayoutsForAdmin(query);
+         return res.status(200).json(ApiResponse.paginated(
+             result.items, result.pagination, 'Pending payouts retrieved',
+         ));
+     } catch (error) { next(error); }
+ };

+ // GET /api/v1/payouts
+ export const listPayouts = async (req, res, next) => {
+     try {
+         const query = getValidatedRequestData(req, 'query');
+         const result = await payoutService.listPayouts(query);
+         return res.status(200).json(ApiResponse.paginated(
+             result.items, result.pagination, 'Payouts retrieved',
+         ));
+     } catch (error) { next(error); }
+ };

+ // GET /api/v1/payouts/:payoutId
+ export const getPayoutDetail = async (req, res, next) => {
+     try {
+         const { payoutId } = getValidatedRequestData(req, 'params');
+         const result = await payoutService.getPayoutDetail(payoutId);
+         return res.status(200).json(ApiResponse.success(result, 'Payout retrieved'));
+     } catch (error) { next(error); }
+ };

+ // POST /api/v1/payouts
+ export const createManualPayout = async (req, res, next) => {
+     try {
+         const body = getValidatedRequestData(req, 'body');
+         const result = await payoutService.createManualPayout(body, req.user._id);
+         return res.status(201).json(ApiResponse.success(result, 'Payout created successfully'));
+     } catch (error) { next(error); }
+ };

+ // PATCH /api/v1/payouts/:payoutId
+ export const updatePayout = async (req, res, next) => {
+     try {
+         const { payoutId } = getValidatedRequestData(req, 'params');
+         const body = getValidatedRequestData(req, 'body');
+         const result = await payoutService.updatePayoutStatus(payoutId, body, req.user._id);
+         return res.status(200).json(ApiResponse.success(result, 'Payout updated'));
+     } catch (error) { next(error); }
+ };
```

**Impact**: All new methods. Existing methods untouched.

---

### 23.8 `src/routes/payout.routes.js`

**Change**: Add RESTful admin routes. Route ordering matters — specific paths before parameterized paths.

```diff
+ import {
+     pendingPayoutsQuerySchema,
+     createManualPayoutSchema,
+     updatePayoutStatusSchema,
+     listPayoutsQuerySchema,
+ } from '../validators/payout.validator.js';

  // Existing routes:
  router.post('/webhook', payoutController.handlePayoutWebhook);  // Public

  router.use(authenticate);  // All below require auth

+ // ── RESTful payout management (Admin only) ─────────────────────────
+ // Specific paths BEFORE parameterized paths to avoid route conflicts
+
+ // Derived collection: aggregated pending payouts by barber
+ router.get(
+     '/pending',
+     authorize(ROLES.ADMIN),
+     validate(pendingPayoutsQuerySchema, 'query'),
+     payoutController.getPendingPayouts,
+ );
+
+ // Collection: list all payouts with filtering, sorting, pagination
+ router.get(
+     '/',
+     authorize(ROLES.ADMIN),
+     validate(listPayoutsQuerySchema, 'query'),
+     payoutController.listPayouts,
+ );
+
+ // Create: record a manual payout
+ router.post(
+     '/',
+     authorize(ROLES.ADMIN),
+     validate(createManualPayoutSchema, 'body'),
+     payoutController.createManualPayout,
+ );
+
+ // Existing: retry failed Cashfree payout (RPC-style action)
+ router.post('/:payoutId/retry', authorize(ROLES.ADMIN), ...);
+
+ // Item: single payout detail
+ router.get(
+     '/:payoutId',
+     authorize(ROLES.ADMIN),
+     validate(payoutIdParamSchema, 'params'),
+     payoutController.getPayoutDetail,
+ );
+
+ // Partial update: change payout status (e.g., mark as failed)
+ router.patch(
+     '/:payoutId',
+     authorize(ROLES.ADMIN),
+     validate(payoutIdParamSchema, 'params'),
+     validate(updatePayoutStatusSchema, 'body'),
+     payoutController.updatePayout,
+ );
```

**Route ordering rationale**:
- `/pending` before `/:payoutId` — prevents "pending" from being treated as a payoutId parameter
- `GET /` and `POST /` are the standard collection endpoints
- `/:payoutId/retry` is registered before `/:payoutId`
- `/:payoutId` routes after specific paths

**Impact**: New routes only. Existing webhook and retry routes unchanged.

---

### 23.9 `src/validators/payout.validator.js`

**Change**: Add new Joi schemas for all RESTful endpoints.

Add all schemas from Section 15.1 — `pendingPayoutsQuerySchema`, `createManualPayoutSchema`, `updatePayoutStatusSchema`, `listPayoutsQuerySchema`.

**Impact**: New schemas only. Existing `payoutIdParamSchema` unchanged.

---

### 23.10 `src/serializers/payout.serializer.js`

**Change**: Add manual-payout fields to serializer.

```diff
  return compact({
      // ... existing fields ...
+     gateway: plain.gateway ?? 'cashfree',
+     completedByAdminId: toIdString(plain.completedByAdminId) ?? null,
+     lastStatusUpdatedByAdminId: toIdString(plain.lastStatusUpdatedByAdminId) ?? null,
+     adminNotes: plain.adminNotes ?? null,
  });
```

**Impact**: Additive. New fields added to serialized output.

---

### 23.11 `src/jobs/payout-batch.cron.js`

**Change**: Add manual mode bypass at top of `runPayoutBatchNow`.

```diff
  export const runPayoutBatchNow = async ({ ... } = {}) => {
+     if (config.payout.mode === 'manual') {
+         logger.info('[PayoutBatchJob] Skipped — PAYOUT_MODE is manual');
+         return { totalBookings: 0, uniqueBarbers: 0, success: 0, failed: 0, skipped: true };
+     }
      // ... existing logic unchanged ...
  };
```

**Impact**: One-line guard clause. Existing logic untouched.

---

### 23.12 `src/jobs/payout-poller.cron.js`

**Change**: Add manual mode bypass at top of `startPayoutPoller`.

```diff
  export const startPayoutPoller = () => {
      if (intervalId) return;
+     if (config.payout.mode === 'manual') {
+         logger.info('[PayoutPoller] Skipped — PAYOUT_MODE is manual');
+         return;
+     }
      // ... existing logic unchanged ...
  };
```

**Impact**: One-line guard clause. Existing logic untouched.

---

### 23.13 `scripts/create-admin-user.mjs`

**Change**: New file. Admin user creation script.

See Section 12.2 for full implementation.

---

## 24. Implementation Sequencing

### Phase 1: Foundation (No behavioral changes)

| Step | File | Action |
|---|---|---|
| 1 | `src/utils/constants.js` | Add `PAYOUT_GATEWAY` constant |
| 2 | `src/config/index.js` | Add `payout.mode: 'manual'` constant |

### Phase 2: Schema & Data Layer

| Step | File | Action |
|---|---|---|
| 3 | `src/models/payout-transaction.model.js` | Add `gateway`, `completedByAdminId`, `adminNotes` fields |
| 4 | `src/repositories/payout.repository.js` | Add `findByUtr`, `findAllFiltered`, `countAll`, `findByIdPopulated`, `atomicStatusUpdate` |
| 5 | `src/repositories/booking.repository.js` | Add `aggregatePendingPayoutsByBarber` |

### Phase 3: Business Logic

| Step | File | Action |
|---|---|---|
| 6 | `src/services/payout.service.js` | Add `getPendingPayoutsForAdmin`, `createManualPayout`, `updatePayoutStatus`, `listPayouts`, `getPayoutDetail`, `parseSortParam`, `buildUpiDeepLink` |

### Phase 4: API Layer

| Step | File | Action |
|---|---|---|
| 7 | `src/validators/payout.validator.js` | Add `pendingPayoutsQuerySchema`, `createManualPayoutSchema`, `updatePayoutStatusSchema`, `listPayoutsQuerySchema` |
| 8 | `src/controllers/payout.controller.js` | Add `getPendingPayouts`, `listPayouts`, `getPayoutDetail`, `createManualPayout`, `updatePayout` |
| 9 | `src/routes/payout.routes.js` | Add RESTful routes with proper ordering |
| 10 | `src/serializers/payout.serializer.js` | Add 3 serialized fields |

### Phase 5: Bypass Logic

| Step | File | Action |
|---|---|---|
| 11 | `src/jobs/payout-batch.cron.js` | Add manual mode bypass |
| 12 | `src/jobs/payout-poller.cron.js` | Add manual mode bypass |

### Phase 6: Admin Setup

| Step | File | Action |
|---|---|---|
| 13 | `scripts/create-admin-user.mjs` | Create admin user script |

### Phase 7: Verification

| Step | Action |
|---|---|
| 14 | Run existing test suite to verify no regressions |
| 15 | Test all RESTful endpoints with Postman |
| 16 | Verify manual mode bypass logs |
| 17 | Verify auto mode still works (toggle test) |

---

## 25. Edge Case Analysis

| # | Edge Case | Handling |
|---|---|---|
| 1 | Barber has no UPI ID | Pending payout list shows null `upiId` and null `upiDeepLink` |
| 2 | Booking completed but no payment transaction | `findCompletedByBookingIds` filters these; admin sees error |
| 3 | Admin submits same bookingIds twice | Second attempt fails because the atomic booking claim no longer matches eligible payout statuses |
| 4 | Auto-payout runs after future auto re-enable while admin is viewing a stale pending list | Shared payout-status preconditions prevent double processing; stale manual submit returns `409` |
| 5 | Barber deleted after booking completed | Barber soft-delete; payout still processes with existing data |
| 6 | Zero-amount payout | `totalPayoutInPaisa <= 0` check prevents this |
| 7 | Extremely large batch (100+ bookings per barber) | `bookingIds` limited to 100 per request via validation |
| 8 | Switch from manual to auto with unprocessed bookings | Auto-batch picks up `not_initiated` bookings normally |
| 9 | Partial persistence failure after payout record creation | PayoutTransaction and claimed booking ids provide a deterministic reconciliation target |
| 10 | Admin token expires before request reaches controller | Auth middleware rejects the request before payout state changes |
| 11 | Webhook arrives for old Cashfree payout while in manual mode | Webhook handler still active; processes normally |
| 12 | Admin tries to fail a Cashfree auto-payout | Rejected; manual correction only supports `gateway=manual` payouts |
| 13 | `GET /payouts?sort=invalidField:asc` | `parseSortParam` falls back to `createdAt:desc` for unrecognized fields |
| 14 | Route conflict: `GET /payouts/pending` vs `GET /payouts/:payoutId` | `/pending` registered before `/:payoutId` in route file |

---

## 26. Resolved Business Decisions

| # | Question | Resolution |
|---|---|---|
| 1 | Should there be a maximum age for pending payouts before escalation? | No alert or escalation mechanism is required currently. Keep the implementation simple. |
| 2 | Should barbers be notified when their payout is pending in manual mode? | No additional notification is required initially. Existing payout completion/failure notifications are sufficient. |
| 3 | Is there a minimum payout threshold (e.g., ₹1)? | No minimum payout threshold is required currently. |
| 4 | Should admin be able to partially complete a barber's pending bookings? | Yes. Partial payouts should continue to be supported. The existing implementation approach is already correct. |
| 5 | How should manual payouts appear in the barber's earnings/transaction history? | No changes are required. The existing earnings and transaction history handling is already correct. |
