# Evercut — Customer Platform Fee System: Developer Documentation

**Document Type:** Internal Technical Reference  
**Audience:** Backend & Frontend Developers  
**Platform:** Evercut (by Quantneural)  
**Source:** Evercut Professional Report — Storage, Subscription & Platform Cost Analysis; Gap Solutions Document  
**Scope:** Customer platform fee system only — fee structure, introductory waiver, booking validation, booking flow, cancellation and refund logic  
**Status:** Implemented in the Node.js backend. All core business rules confirmed. See Section 7 for the remaining anti-abuse open item.

---

## Implementation Alignment Note (Backend)

This document is implemented in `server/` with the repository's existing pending-booking reservation architecture. The original no-pre-payment-persistence wording is superseded by this compatibility rule:

- A booking is first persisted as an unpaid `pending` slot reservation so the employee time range can be held and idempotent creation can work.
- Payment initiation calculates platform-fee values from `config.payment` and stores the charged settlement on the payment transaction.
- Payment failure, amount mismatch, or checkout expiry cancels the unpaid booking and releases the slot.
- The customer waiver counter is incremented only after PhonePe confirms payment success.

Backend field names use the established camelCase API and Mongo schema style:

- Customer persists only `feeWaiverBookingsUsed` for this feature. API responses derive `feeWaiverQuota` and `feeWaiverExhausted` from `config.payment`.
- Booking does not persist platform-fee snapshots or refund audit fields. Existing booking storage keeps the service amount for booking/payout logic; booking API responses derive `serviceAmount`, `platformFee`, and payable `totalAmount` from config or the linked payment transaction.
- Payment transaction persists top-level `waiverApplied`. Payment settlement persists `serviceAmount`, `platformFee`, `barberPayout`, and `isBundle`.

Fee and refund amounts that need financial audit are stored on the payment transaction in paisa. Booking records stay intentionally lean and do not duplicate payment financial snapshots.

Active platform-fee business values live in one place: the existing `payment` object in `server/src/config/index.js`. Services, repositories, serializers, models, Postman generation, and tests must read from those existing keys rather than duplicating rule values. `server/src/utils/platform-fee.utils.js` owns reusable fee logic, not separate configuration.

---

## ⚠ Scope Boundary — Read Before Anything Else

This document covers the **Customer Platform Fee System** exclusively.

| Applies To | Does NOT Apply To |
|---|---|
| **Customers** | Barbers |

Platform fees are charged to customers at the time of each booking. They have no connection to barber subscription plans, plan tiers, or any barber-side feature logic. A customer's booking history, fee payments, or waiver usage never affect any barber's subscription in any way.

---

## Table of Contents

1. [Platform Fee Structure](#1-platform-fee-structure)
   - 1.1 Overview
   - 1.2 Fee Table
   - 1.3 Booking Type Definitions
   - 1.4 Fee Cap Rule
   - 1.5 Minimum Booking Amount Constraint
   - 1.6 Cancellation & Refund Fee Structure
2. [Introductory Fee Waiver Logic](#2-introductory-fee-waiver-logic)
3. [Booking Rules & Validation Flow](#3-booking-rules--validation-flow)
4. [End-to-End Booking Walkthrough](#4-end-to-end-booking-walkthrough)
5. [Data Model Reference](#5-data-model-reference)
6. [Implementation Checklist](#6-implementation-checklist)
7. [Open Questions & Gaps](#7-open-questions--gaps)

---

## 1. Platform Fee Structure

### 1.1 Overview

When a customer makes a booking, the platform charges a **platform fee** on top of the booking amount. This is Evercut's transaction-level revenue collected from the customer side. The fee amount depends on the type of booking made.

### 1.2 Fee Table

| Booking Type | Platform Fee |
|---|---|
| Single Service Booking | ₹4 |
| Bundle Booking | ₹10 |
| Single + Bundle Combined | ₹10 |

### 1.3 Booking Type Definitions

- **Single Service Booking:** A booking for one individual service from a barber.
- **Bundle Booking:** A booking for a pre-packaged bundle of services from a barber.
- **Single + Bundle Combined:** A booking that includes at least one bundle alongside any number of individual services.

### 1.4 Fee Cap Rule

When a booking includes any bundle — regardless of whether individual services are also included — the platform fee is **capped at ₹10**. Fees do not stack. A combined booking is never charged ₹4 + ₹10 = ₹14; it is always ₹10.

```
function calculatePlatformFee(booking_type):
  IF booking_type == SINGLE:
    return ₹4
  IF booking_type == BUNDLE or booking_type == COMBINED:
    return ₹10
```

The ₹10 cap for combined bookings must be **explicitly enforced in code** rather than derived by summing individual fees. This is a critical implementation detail.

### 1.5 Minimum Booking Amount Constraint

- Minimum booking amount thresholds apply to the **service amount only** — the total cost of selected services or bundles, before the platform fee is added. The platform fee is never included in this threshold calculation.
- Single-service bookings require a minimum service amount of **₹69**. A service amount of ₹69 with a ₹4 platform fee (total ₹73 charged) is valid.
- Bundle and combined bookings require a minimum service amount of **₹299**. A bundle service amount of ₹299 with a ₹10 platform fee (total ₹309 charged) is valid.
- If the service amount falls below the threshold for its booking type, the booking must be **rejected at creation time**.
- This validation applies to **all customers**, including those within the introductory fee waiver period.
- This validation must occur after deriving the booking fee type and **before** any platform fee calculation or waiver check.

### 1.6 Cancellation & Refund Fee Structure

When a booking is cancelled, the refund amount returned to the customer depends entirely on **who initiated the cancellation**. The platform implements two completely distinct refund paths, controlled by the `isBarberCancellation` flag in `payment.service.js`.

#### Refund Path Summary

| Cancellation Type | `isBarberCancellation` | Platform Fee | Refund Fee | Amount Returned to Customer |
|---|---|---|---|---|
| **Customer cancels** | `false` | **Withheld** — kept by platform | ₹7 (single) / ₹15 (bundle or combined) | `serviceAmount − refundFee` |
| **Barber cancels or auto-cancel** | `true` | **Fully refunded** | ₹0 | `serviceAmount + platformFee` (full payment) |

#### Customer Cancellation — Detailed Logic

When a customer cancels a booking, the refund is calculated against the **service amount only** — the platform fee is already excluded from this base figure, as it is derived from `payment.settlement.serviceAmount`. The refund fee is then deducted from this base:

```
// Customer cancellation (isBarberCancellation = false)
refundFee        = getRefundFeeInPaisa(payment)       // ₹7 (single) or ₹15 (bundle/combined)
refundAmount     = serviceAmount - refundFee           // What the customer receives back
platformFee      → withheld; recorded as platform deduction (not returned)
```

What the customer receives: `serviceAmount − refundFee`

What the platform retains: the full platform fee (₹4 or ₹10) **plus** the refund fee (₹7 or ₹15)

**Refund fee by booking type:**

| Booking Type | Platform Fee | Refund Fee (Customer Cancellation) |
|---|---|---|
| Single | ₹4 | ₹7 |
| Bundle | ₹10 | ₹15 |
| Single + Bundle Combined | ₹10 | ₹15 |

> **Important — Waiver Interaction:** If the cancelled booking had a platform fee waiver applied (i.e., it was one of the customer's first two bookings and `platform_fee = ₹0`), then the platform fee component withheld is ₹0 — there is nothing to withhold. However, the refund fee (₹7 or ₹15) is still deducted from the service amount. The waiver slot consumed by this booking is **not** reinstated regardless of cancellation (see Section 2.4).

#### Barber Cancellation / Auto-Cancel — Detailed Logic

When a barber cancels or the system triggers an auto-cancellation, the customer receives a **full refund** of everything they paid — service amount plus platform fee — with no deductions:

```
// Barber or auto-cancellation (isBarberCancellation = true)
refundAmount = payment.amount    // Full gross payment: serviceAmount + platformFee
refundFee    = ₹0
platformFee  → fully refunded
```

What the customer receives: `serviceAmount + platformFee` (complete restoration)

What the platform retains: ₹0

#### Refund Calculation Summary

```
function calculateRefundAmount(payment, isBarberCancellation):
  serviceAmount = payment.settlement.serviceAmount
  platformFee   = payment.platformFee   // ₹4 or ₹10 (or ₹0 if waiver was applied)

  IF isBarberCancellation == true:
    refundFee    = 0
    refundAmount = payment.amount        // serviceAmount + platformFee
    platformFeeDeduction = 0

  ELSE:  // Customer cancellation
    refundFee    = getRefundFee(payment.booking_type)  // ₹7 or ₹15
    refundAmount = serviceAmount - refundFee
    platformFeeDeduction = platformFee                 // Withheld; not returned

  return { refundAmount, refundFee, platformFeeDeduction }
```

#### Canonical Fee Config Values

| Config Key | Value | Notes |
|---|---|---|
| `platformFeeSingle` | ₹4 | Platform fee for single bookings |
| `platformFeeBundle` | ₹10 | Platform fee for bundle and combined bookings |
| `refundFeeSingle` | ₹7 | Refund processing fee on customer cancellation of a single booking |
| `refundFeeBundle` | ₹15 | Refund processing fee on customer cancellation of a bundle or combined booking |
| `minSingleServiceAmount` | ₹69 | Minimum service amount for single-service bookings |
| `minBundleServiceAmount` | ₹299 | Minimum service amount for bundle and combined bookings |

> **Implementation note on config:** The existing `server/src/config/index.js` `payment` object is the single active source for platform-fee values: `platformFeeSingle`, `platformFeeBundle`, `refundFeeSingle`, `refundFeeBundle`, `feeWaiverQuota`, `minSingleServiceAmount`, and `minBundleServiceAmount`. There is no separate platform-fee config module and no unified minimum-service-amount config key; code must validate against the booking-type-specific threshold.

---

## 2. Introductory Fee Waiver Logic

### 2.1 The Introductory Offer — Precise Definition

As an introductory incentive, Evercut **waives the platform fee** on a customer's **first two bookings**.

| Aspect | Detail |
|---|---|
| **What IS waived** | The platform fee (₹4 or ₹10) |
| **What is NOT waived** | The booking amount (the cost of the service/bundle paid to the barber) |
| **Who receives this offer** | Customers — per account, one time |
| **Who does NOT receive this offer** | Barbers. This offer has no barber-side equivalent. |
| **How many qualifying bookings** | First 2 bookings ever made by the customer account |
| **When the offer resets** | It does not reset. It is a one-time, lifetime offer per customer account. |

This offer must never be implemented or described as "free bookings." The customer still pays the full service amount on every booking. Only the platform fee component is waived.

### 2.2 Fee Waiver Counter

The system must maintain a dedicated counter per **Customer document** to track fee waiver usage.

| Field | Type | Description |
|---|---|---|
| `fee_waiver_bookings_used` | Integer | Persisted number of fee-waived bookings consumed |
| `fee_waiver_quota` | Integer | Derived response value from `config.payment.feeWaiverQuota`; not persisted on Customer |
| `fee_waiver_exhausted` | Boolean | Derived response value: `true` when `fee_waiver_bookings_used >= config.payment.feeWaiverQuota`; not persisted on Customer |

### 2.3 Fee Waiver Application Logic

```
function resolveCustomerPlatformFee(customer, booking_type):
  platform_fee = calculatePlatformFee(booking_type)   // Returns ₹4 or ₹10

  IF customer.fee_waiver_bookings_used < config.payment.feeWaiverQuota:
    // Do not increment here — only increment AFTER successful payment
    // Store waiver_applied = true on the payment transaction
    return ₹0

  ELSE:
    return platform_fee
```

> **Important:** The waiver counter (`fee_waiver_bookings_used`) must only be incremented **after payment is successfully confirmed**. If payment fails, the counter must not be incremented (or must be rolled back if it was prematurely incremented).

### 2.4 Waiver Rules & Edge Cases

| Scenario | Behaviour |
|---|---|
| Customer's 1st booking (single service amount ≥ ₹69, or bundle/combined service amount ≥ ₹299) | Platform fee = ₹0. Counter increments to 1 after payment success. Service amount charged in full. |
| Customer's 2nd booking (single service amount ≥ ₹69, or bundle/combined service amount ≥ ₹299) | Platform fee = ₹0. Counter increments to 2 after payment success. `fee_waiver_exhausted` becomes `true`. |
| Customer's 3rd booking onwards | Standard platform fee applies (₹4 or ₹10). |
| Service amount below the booking-type threshold during waiver period | Booking rejected. Counter must NOT increment. |
| Payment fails on a waiver-eligible booking | Counter must NOT increment. Waiver slot is preserved for the customer's next successful booking. |
| Customer cancels a waiver-covered booking after payment | The waiver counter does **not** decrement — the fee waiver slot is permanently used regardless of cancellation. Additionally: since the platform fee on this booking was ₹0 (waived), there is no platform fee component to withhold. However, the refund fee (₹7 for single / ₹15 for bundle or combined) **is still deducted** from the service amount on customer cancellation. The waiver covered only the platform fee — it never applied to the refund processing fee. See Section 1.6. |
| Customer re-registers with a new account to reset waiver | The waiver must be tied to a persistent identifier beyond just the account (e.g., verified phone number) to prevent gaming. Anti-abuse mechanism must be confirmed — see Section 7, Open Question 1. |
| Same customer books two different barbers | The waiver applies per customer account across all barbers — not per barber. The first 2 bookings ever (regardless of which barber) are waiver-eligible. |

---

## 3. Booking Rules & Validation Flow

### 3.1 Pre-Creation Validation Sequence

All validations must pass in this order before a booking is persisted. Validation occurs before fee calculation and before any waiver counter changes.

| Step | Validation | Failure Action |
|---|---|---|
| 1 | Customer account is active and authenticated | Reject; prompt login or account resolution |
| 2 | Target barber exists and is active on the platform | Reject; return "Barber unavailable" error |
| 3 | Booking type is a valid value (`SINGLE`, `BUNDLE`, or `COMBINED`) | Reject; return invalid type error |
| 4 | Service amount meets the booking-type threshold (`SINGLE` ≥ ₹69; `BUNDLE`/`COMBINED` ≥ ₹299) | Reject; return "Minimum single service booking amount is ₹69" or "Minimum bundle booking amount is ₹299" |

### 3.2 Complete Booking Creation Flow

```
Customer initiates booking:

  Step 1:  Validate customer session
  Step 2:  Validate barber exists and is active
  Step 3:  Validate booking type
  Step 4:  Calculate booking_amount (sum of selected services/bundles)
  Step 5:  IF booking_amount is below the booking-type threshold
             (SINGLE < ₹69, BUNDLE/COMBINED < ₹299) → reject; STOP.
             Do not proceed to fee logic.
  Step 6:  Persist the pending unpaid booking reservation using existing booking fields.
  Step 7:  During payment initiation, determine platform_fee:
             platform_fee = resolveCustomerPlatformFee(customer, booking_type)
             Note whether waiver_applied = true or false
  Step 8:  Calculate total_charged = booking_amount + platform_fee
  Step 9:  Create the PhonePe payment transaction for total_charged.
             Store serviceAmount, platformFee, barberPayout, isBundle, and waiverApplied on the payment transaction.
  Step 10: On payment success:
             - IF waiver_applied: increment customer.fee_waiver_bookings_used by 1
             - Mark booking payment state as paid/awaiting confirmation
  Step 11: On payment failure, amount mismatch, or checkout expiry:
             - Cancel the unpaid pending booking and release the slot
             - Do NOT increment waiver counter
             - Return payment failure error to customer
```

> **Atomicity Requirement:** The waiver counter must only increment after confirmed payment success from the payment gateway's webhook or verification flow. A payment failure must not consume a waiver. Pending unpaid bookings may exist only as slot reservations and must be cancelled/released on failed, mismatched, or expired checkout sessions.

### 3.3 Booking Record Fields

| Field | Type | Description |
|---|---|---|
| `booking_id` | UUID | Unique booking identifier |
| `customer_id` | Ref → Customer | Customer who made the booking |
| `barber_id` | Ref → Barber | Barber receiving the booking |
| `total_amount` | Decimal | Existing service cost before platform fee (single ≥ ₹69; bundle/combined ≥ ₹299) |
| `payment_transaction_id` | Ref → PaymentTransaction / Null | Payment transaction created during payment initiation |
| `merchant_order_id` | String / Null | PhonePe merchant order id when payment is initiated |
| `payment_status` | Enum | Existing booking payment lifecycle state |
| `status` | Enum | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED` |
| `created_at` | Timestamp | Booking creation datetime |

Booking intentionally does not persist `booking_amount`, `booking_fee_type`, `platform_fee`, `standard_platform_fee`, `total_charged`, `waiver_applied`, `cancellation_type`, `refund_fee`, or `refund_amount`. Those values are either derivable from selected services and config or stored on the payment transaction where financial audit belongs.

### 3.4 Amount Response Semantics

All booking and payment responses use these amount meanings:

| Field | Meaning |
|---|---|
| `serviceAmount` | Service/bundle price before platform fee |
| `platformFee` | Platform fee currently payable or actually charged; `0` when waived |
| `totalAmount` | Final customer payable/charged amount: `serviceAmount + platformFee` |
| `amountInRupees` / `amountInPaisa` | Payment transaction charged amount; same concept as payable `totalAmount`, expressed in payment units |

When a payment transaction exists, booking responses use the payment transaction amount as the authoritative charged total. Before payment exists, booking responses show the current payable preview from `config.payment` and the customer's current waiver usage.

---

## 4. End-to-End Booking Walkthrough

These scenarios illustrate correct system behaviour across different booking and cancellation situations.

### Scenario A — Customer's 1st Booking (Single Service, ₹200)

```
booking_amount           = ₹200   ✓ passes ₹69 single minimum (service amount)
fee_waiver_bookings_used = 0/2    → waiver applies
platform_fee             = ₹0     (waived)
total_charged            = ₹200   (booking amount only)
[on payment success]
fee_waiver_bookings_used → incremented to 1/2
```

### Scenario B — Customer's 2nd Booking (Bundle, ₹500)

```
booking_amount           = ₹500   ✓ passes ₹299 bundle minimum (service amount)
fee_waiver_bookings_used = 1/2    → waiver still applies
platform_fee             = ₹0     (waived)
total_charged            = ₹500
[on payment success]
fee_waiver_bookings_used → incremented to 2/2
fee_waiver_exhausted     → derived as true in API responses
```

### Scenario C — Customer's 3rd Booking (Single Service, ₹150)

```
booking_amount           = ₹150   ✓ passes ₹69 single minimum (service amount)
fee_waiver_exhausted     = true   → no waiver applies
booking_type             = SINGLE
platform_fee             = ₹4
total_charged            = ₹154
```

### Scenario D — Customer's 4th Booking (Bundle + Single Combined, ₹350)

```
booking_amount           = ₹350   ✓ passes ₹299 combined minimum (service amount)
fee_waiver_exhausted     = true   → no waiver applies
booking_type             = COMBINED
platform_fee             = ₹10    (cap applies; not ₹4 + ₹10 = ₹14)
total_charged            = ₹360
```

### Scenario E — Single Booking Below ₹69 (During Waiver Period)

```
booking_amount           = ₹68    ✗ fails ₹69 single minimum (service amount)
Result                   → Booking rejected
                         → "Minimum single service booking amount is ₹69"
fee_waiver_bookings_used → NOT incremented (booking was never created)
```

### Scenario F — Payment Fails on Waiver-Eligible Booking

```
booking_amount           = ₹300   ✓ passes ₹299 bundle/combined minimum when applicable (service amount)
fee_waiver_bookings_used = 1/2    → waiver eligible
platform_fee             = ₹0
[payment fails]
Result                   → Pending unpaid booking is cancelled/released
fee_waiver_bookings_used → NOT incremented; stays at 1/2
                         → Customer's second waiver slot is preserved
```

### Scenario G — Customer Cancels a Confirmed Single Booking (₹250, No Waiver)

```
booking_amount           = ₹250   (service amount; already paid)
platform_fee             = ₹4     (single; waiver already exhausted)
total_charged_at_booking = ₹254

[customer cancels → isBarberCancellation = false]

grossAmount (base for refund) = serviceAmount = ₹250
                                (platform fee is excluded from this base)
refund_fee               = ₹7    (single booking)
refund_amount            = ₹250 − ₹7 = ₹243

Platform retains:          ₹4  (platform fee, withheld)
                         + ₹7  (refund processing fee)
                         = ₹11 total

Customer receives back:    ₹243
```

### Scenario H — Customer Cancels a Confirmed Bundle Booking (₹500, Waiver Was Applied)

```
booking_amount           = ₹500   (service amount; already paid)
platform_fee             = ₹0     (waiver was applied — this was customer's 1st booking)
total_charged_at_booking = ₹500
fee_waiver_bookings_used = 1/2    (slot consumed at booking time; not reinstated on cancel)

[customer cancels → isBarberCancellation = false]

grossAmount (base for refund) = serviceAmount = ₹500
refund_fee               = ₹15   (bundle booking)
refund_amount            = ₹500 − ₹15 = ₹485

Platform retains:          ₹0  (platform fee was ₹0 — nothing to withhold)
                         + ₹15 (refund processing fee)
                         = ₹15 total

Customer receives back:    ₹485
fee_waiver_bookings_used → stays at 1/2 (slot NOT reinstated)
```

### Scenario I — Barber Cancels a Bundle Booking (₹400, No Waiver)

```
booking_amount           = ₹400   (service amount; already paid)
platform_fee             = ₹10    (bundle; waiver exhausted)
total_charged_at_booking = ₹410

[barber cancels → isBarberCancellation = true]

refund_fee               = ₹0    (zero deductions on barber cancellation)
refund_amount            = ₹410  (full payment.amount returned)

Platform retains:          ₹0
Customer receives back:    ₹410  (complete restoration)
```

---

## 5. Data Model Reference

### 5.1 Customer Document (MongoDB)

| Field | Type | Description |
|---|---|---|
| `customer_id` | UUID | Unique identifier |
| `fee_waiver_bookings_used` | Integer | Persisted fee-waived bookings consumed |
| `fee_waiver_quota` | Integer | Derived API response value from `config.payment.feeWaiverQuota`; not persisted |
| `fee_waiver_exhausted` | Boolean | Derived API response value; not persisted |

### 5.2 Booking Document (MongoDB)

| Field | Type | Description |
|---|---|---|
| `booking_id` | UUID | Unique identifier |
| `customer_id` | Ref → Customer | Booking initiator |
| `barber_id` | Ref → Barber | Booking recipient |
| `total_amount` | Decimal | Existing service cost before platform fee (single ≥ ₹69; bundle/combined ≥ ₹299) |
| `payment_transaction_id` | Ref → PaymentTransaction / Null | Payment transaction created during payment initiation |
| `merchant_order_id` | String / Null | PhonePe merchant order id when payment is initiated |
| `payment_status` | Enum | Existing booking payment lifecycle state |
| `status` | Enum | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED` |
| `created_at` | Timestamp | Booking creation datetime |

### 5.3 Payment Transaction Document (MongoDB)

| Field | Type | Description |
|---|---|---|
| `waiver_applied` | Boolean | Persisted flag showing whether the introductory platform-fee waiver was applied to this payment |
| `settlement.service_amount` | Integer (paisa) | Service amount before platform fee |
| `settlement.platform_fee` | Integer (paisa) | Actual platform fee charged; `0` when waived |
| `settlement.barber_payout` | Integer (paisa) | Amount payable to the barber |
| `settlement.is_bundle` | Boolean | Whether the payment used the bundle/combined fee path |
| `refund.amount` | Integer (paisa) / Null | Actual refund amount when refund is initiated |
| `refund.refund_fee` | Integer (paisa) / Null | Refund processing fee deducted on customer cancellation |
| `refund.platform_fee` | Integer (paisa) / Null | Platform fee retained or returned according to cancellation path |

---

## 6. Implementation Checklist

> **Backend status:** The checklist below reflects the simplified production implementation. Platform-fee rules, waiver tracking, minimum amount validation, payment transaction settlement, refund paths, and centralized config are implemented in `server/`. The only non-code open item remains the anti-abuse identity policy in Section 7.

### Platform Fees & Waiver

- [x] Add `fee_waiver_bookings_used` to the Customer document
- [x] Derive `fee_waiver_quota` and `fee_waiver_exhausted` from `config.payment` at response time instead of persisting them
- [x] Implement `resolveCustomerPlatformFee()` with waiver check
- [x] Implement platform fee calculation by booking type (Single: ₹4, Bundle/Combined: ₹10)
- [x] Enforce ₹10 cap for combined bookings explicitly in code (not via fee summation)
- [x] Enforce booking-type-specific minimum service amounts (single: ₹69; bundle/combined: ₹299) before any fee or waiver logic runs
- [x] Keep platform-fee amounts, refund fees, waiver quota, and minimum service amount rules centralized under existing `config.payment` keys
- [x] Increment waiver counter **only** after confirmed payment success
- [x] Ensure waiver counter is never incremented on payment failure or booking rejection

### Booking Flow

- [x] Implement full booking validation sequence (Steps 1–4 in Section 3.1)
- [x] Preserve the existing pending unpaid booking reservation flow for slot locking and idempotency
- [x] Store platform-fee financial audit on `PaymentTransaction`, not duplicated on `Booking`
- [x] Persist `waiverApplied` on `PaymentTransaction`

### Cancellation & Refund

- [x] Implement `initiateRefund` with two distinct paths, controlled by the `isBarberCancellation` flag
- [x] **Customer cancellation path** (`isBarberCancellation = false`):
  - [x] Base refund amount on `payment.settlement.serviceAmount` (service amount only — platform fee excluded from base)
  - [x] Determine refund fee by booking type: ₹7 for `SINGLE`; ₹15 for `BUNDLE` or `COMBINED`
  - [x] Calculate `refund_amount = serviceAmount − refundFee`
  - [x] Withhold platform fee — record it as a platform deduction; do not include in refund
  - [x] Persist refund financial audit on `PaymentTransaction.refund`
- [x] **Barber / auto-cancel path** (`isBarberCancellation = true`):
  - [x] Refund the full `payment.amount` (service amount + platform fee combined) with zero deductions
  - [x] Persist refund financial audit on `PaymentTransaction.refund`
- [x] Ensure waiver slot is **never reinstated** on customer cancellation of a waiver-covered booking
- [x] **Fix config:** `platformFeeSingle` is `4` in `config/index.js`; canonical value is ₹4 (see Section 1.6)

---

## 7. Open Questions & Gaps

The following item is not yet resolved and must be confirmed before or during the development phase.

| # | Open Question | Area |
|---|---|---|
| 1 | How is the fee waiver tied to the customer's identity to prevent gaming via account re-registration? (e.g., verified phone number as a persistent identifier that carries across accounts) | Bookings |

---

*This document covers the Evercut customer platform fee system exclusively. It is based on the Evercut Professional Report (Storage, Subscription & Platform Cost Analysis) and the Gap Solutions document. Intended for internal development use by Quantneural. All confirmed rules reflect finalised business decisions as of the current revision.*
