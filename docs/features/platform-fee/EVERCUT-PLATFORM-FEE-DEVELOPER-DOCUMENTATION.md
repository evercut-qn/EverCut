# Evercut — Customer Platform Fee System: Developer Documentation

**Document Type:** Internal Technical Reference  
**Audience:** Backend & Frontend Developers  
**Platform:** Evercut (by Quantneural)  
**Source:** Evercut Professional Report — Storage, Subscription & Platform Cost Analysis; Gap Solutions Document  
**Scope:** Customer platform fee system only — fee structure, introductory waiver, booking validation, booking flow, cancellation and refund logic  
**Status:** All core business rules confirmed. See Section 8 for remaining open items.

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

- The minimum booking amount threshold of **₹70 applies to the service amount only** — the total cost of selected services or bundles, before the platform fee is added. The platform fee is never included in this threshold calculation.
- A service amount of ₹70 with a ₹4 platform fee (total ₹74 charged) is valid. The ₹70 check is on the service amount alone.
- If the service amount falls below ₹70, the booking must be **rejected at creation time**.
- This validation applies to **all customers**, including those within the introductory fee waiver period.
- This validation must occur **before** any platform fee calculation or waiver check.

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

> **Note on config:** The value `platformFeeSingle: 3` present in `config/index.js` is **outdated and incorrect**. The correct and canonical value is **₹4**, as confirmed by the business. All implementation must use ₹4. The config must be updated to reflect this.

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
| `fee_waiver_bookings_used` | Integer | Number of fee-waived bookings consumed (range: 0–2) |
| `fee_waiver_quota` | Integer | Total fee-waived bookings allowed (constant value: 2) |
| `fee_waiver_exhausted` | Boolean | Derived: `true` when `fee_waiver_bookings_used >= fee_waiver_quota` |

### 2.3 Fee Waiver Application Logic

```
function resolveCustomerPlatformFee(customer, booking_type):
  platform_fee = calculatePlatformFee(booking_type)   // Returns ₹4 or ₹10

  IF customer.fee_waiver_exhausted == false:
    // Do not increment here — only increment AFTER successful payment
    // Pass waiver_applied = true to booking creation context
    return ₹0

  ELSE:
    return platform_fee
```

> **Important:** The waiver counter (`fee_waiver_bookings_used`) must only be incremented **after payment is successfully confirmed**. If payment fails, the counter must not be incremented (or must be rolled back if it was prematurely incremented).

### 2.4 Waiver Rules & Edge Cases

| Scenario | Behaviour |
|---|---|
| Customer's 1st booking (any type, service amount ≥ ₹70) | Platform fee = ₹0. Counter increments to 1 after payment success. Service amount charged in full. |
| Customer's 2nd booking (any type, service amount ≥ ₹70) | Platform fee = ₹0. Counter increments to 2 after payment success. `fee_waiver_exhausted` becomes `true`. |
| Customer's 3rd booking onwards | Standard platform fee applies (₹4 or ₹10). |
| Service amount below ₹70 during waiver period | Booking rejected. Counter must NOT increment. |
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
| 4 | Service amount ≥ ₹70 | Reject; return "Minimum booking amount is ₹70" |

### 3.2 Complete Booking Creation Flow

```
Customer initiates booking:

  Step 1:  Validate customer session
  Step 2:  Validate barber exists and is active
  Step 3:  Validate booking type
  Step 4:  Calculate booking_amount (sum of selected services/bundles)
  Step 5:  IF booking_amount < ₹70 → reject; STOP. Do not proceed to fee logic.
  Step 6:  Determine platform_fee:
             platform_fee = resolveCustomerPlatformFee(customer, booking_type)
             Note whether waiver_applied = true or false
  Step 7:  Calculate total_charged = booking_amount + platform_fee
  Step 8:  Initiate payment via payment gateway for total_charged
  Step 9:  On payment success:
             - IF waiver_applied: increment customer.fee_waiver_bookings_used by 1
             - Persist booking record with all fields
  Step 10: On payment failure:
             - Do NOT persist booking record
             - Do NOT increment waiver counter
             - Return payment failure error to customer
```

> **Atomicity Requirement:** The booking record must only be persisted and the waiver counter only incremented after confirmed payment success from the payment gateway's webhook or callback. A payment failure must leave no side effects on the customer's waiver counter or on any booking record.

### 3.3 Booking Record Fields

| Field | Type | Description |
|---|---|---|
| `booking_id` | UUID | Unique booking identifier |
| `customer_id` | Ref → Customer | Customer who made the booking |
| `barber_id` | Ref → Barber | Barber receiving the booking |
| `booking_type` | Enum | `SINGLE`, `BUNDLE`, `COMBINED` |
| `booking_amount` | Decimal | Total service cost before platform fee (≥ ₹70) |
| `platform_fee` | Decimal | Platform fee charged: ₹0, ₹4, or ₹10 |
| `total_charged` | Decimal | `booking_amount + platform_fee` |
| `waiver_applied` | Boolean | Whether the fee waiver was used for this booking |
| `status` | Enum | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED` |
| `cancellation_type` | Enum / Null | `CUSTOMER`, `BARBER`, `AUTO` — null if not cancelled |
| `refund_fee` | Decimal / Null | Refund processing fee deducted on customer cancellation: ₹7 (single) / ₹15 (bundle or combined); ₹0 on barber or auto-cancel; null if not cancelled |
| `refund_amount` | Decimal / Null | Actual amount returned to the customer on cancellation: `serviceAmount − refundFee` (customer cancel) or full `payment.amount` (barber/auto cancel); null if not cancelled |
| `created_at` | Timestamp | Booking creation datetime |

---

## 4. End-to-End Booking Walkthrough

These scenarios illustrate correct system behaviour across different booking and cancellation situations.

### Scenario A — Customer's 1st Booking (Single Service, ₹200)

```
booking_amount           = ₹200   ✓ passes ₹70 minimum (service amount)
fee_waiver_bookings_used = 0/2    → waiver applies
platform_fee             = ₹0     (waived)
total_charged            = ₹200   (booking amount only)
[on payment success]
fee_waiver_bookings_used → incremented to 1/2
```

### Scenario B — Customer's 2nd Booking (Bundle, ₹500)

```
booking_amount           = ₹500   ✓ passes ₹70 minimum (service amount)
fee_waiver_bookings_used = 1/2    → waiver still applies
platform_fee             = ₹0     (waived)
total_charged            = ₹500
[on payment success]
fee_waiver_bookings_used → incremented to 2/2
fee_waiver_exhausted     → now true
```

### Scenario C — Customer's 3rd Booking (Single Service, ₹150)

```
booking_amount           = ₹150   ✓ passes ₹70 minimum (service amount)
fee_waiver_exhausted     = true   → no waiver applies
booking_type             = SINGLE
platform_fee             = ₹4
total_charged            = ₹154
```

### Scenario D — Customer's 4th Booking (Bundle + Single Combined, ₹350)

```
booking_amount           = ₹350   ✓ passes ₹70 minimum (service amount)
fee_waiver_exhausted     = true   → no waiver applies
booking_type             = COMBINED
platform_fee             = ₹10    (cap applies; not ₹4 + ₹10 = ₹14)
total_charged            = ₹360
```

### Scenario E — Booking Below ₹70 (During Waiver Period)

```
booking_amount           = ₹60    ✗ fails ₹70 minimum (service amount)
Result                   → Booking rejected
                         → "Minimum booking amount is ₹70"
fee_waiver_bookings_used → NOT incremented (booking was never created)
```

### Scenario F — Payment Fails on Waiver-Eligible Booking

```
booking_amount           = ₹300   ✓ passes ₹70 minimum (service amount)
fee_waiver_bookings_used = 1/2    → waiver eligible
platform_fee             = ₹0
[payment fails]
Result                   → Booking NOT persisted
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
| `fee_waiver_bookings_used` | Integer | Fee-waived bookings consumed (0, 1, or 2) |
| `fee_waiver_quota` | Integer | Total waiver-eligible bookings (constant: 2) |
| `fee_waiver_exhausted` | Boolean | `true` when `fee_waiver_bookings_used >= fee_waiver_quota` |

### 5.2 Booking Document (MongoDB)

| Field | Type | Description |
|---|---|---|
| `booking_id` | UUID | Unique identifier |
| `customer_id` | Ref → Customer | Booking initiator |
| `barber_id` | Ref → Barber | Booking recipient |
| `booking_type` | Enum | `SINGLE`, `BUNDLE`, `COMBINED` |
| `booking_amount` | Decimal | Service cost before platform fee (must be ≥ ₹70) |
| `platform_fee` | Decimal | ₹0 (waived), ₹4, or ₹10 |
| `total_charged` | Decimal | `booking_amount + platform_fee` |
| `waiver_applied` | Boolean | Whether the introductory fee waiver was used for this booking |
| `status` | Enum | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED` |
| `cancellation_type` | Enum / Null | `CUSTOMER`, `BARBER`, `AUTO` — null if booking has not been cancelled |
| `refund_fee` | Decimal / Null | Refund processing fee deducted on customer cancellation: ₹7 (single) / ₹15 (bundle or combined); ₹0 on barber or auto-cancel; null if not cancelled |
| `refund_amount` | Decimal / Null | Actual amount returned to the customer on cancellation: `serviceAmount − refundFee` (customer cancel) or full `payment.amount` (barber/auto cancel); null if not cancelled |
| `created_at` | Timestamp | Booking creation datetime |

---

## 6. Implementation Checklist

### Platform Fees & Waiver

- [ ] Add `fee_waiver_bookings_used` and related fields to Customer document
- [ ] Implement `resolveCustomerPlatformFee()` with waiver check
- [ ] Implement platform fee calculation by booking type (Single: ₹4, Bundle/Combined: ₹10)
- [ ] Enforce ₹10 cap for combined bookings explicitly in code (not via fee summation)
- [ ] Enforce minimum service amount of ₹70 before any fee or waiver logic runs
- [ ] Increment waiver counter **only** after confirmed payment success
- [ ] Ensure waiver counter is never incremented on payment failure or booking rejection

### Booking Flow

- [ ] Implement full booking validation sequence (Steps 1–4 in Section 3.1)
- [ ] Implement atomic booking persistence — only after payment confirmation
- [ ] Persist all fee fields on booking record (`booking_amount`, `platform_fee`, `total_charged`, `waiver_applied`)

### Cancellation & Refund

- [ ] Implement `initiateRefund` with two distinct paths, controlled by the `isBarberCancellation` flag
- [ ] **Customer cancellation path** (`isBarberCancellation = false`):
  - [ ] Base refund amount on `payment.settlement.serviceAmount` (service amount only — platform fee excluded from base)
  - [ ] Determine refund fee by booking type: ₹7 for `SINGLE`; ₹15 for `BUNDLE` or `COMBINED`
  - [ ] Calculate `refund_amount = serviceAmount − refundFee`
  - [ ] Withhold platform fee — record it as a platform deduction; do not include in refund
  - [ ] Persist `cancellation_type = CUSTOMER`, `refund_fee`, and `refund_amount` on the booking record
- [ ] **Barber / auto-cancel path** (`isBarberCancellation = true`):
  - [ ] Refund the full `payment.amount` (service amount + platform fee combined) with zero deductions
  - [ ] Persist `cancellation_type = BARBER` or `AUTO`, `refund_fee = 0`, and `refund_amount = payment.amount`
- [ ] Ensure waiver slot is **never reinstated** on customer cancellation of a waiver-covered booking
- [ ] **Fix config:** Update `platformFeeSingle` from `3` to `4` in `config/index.js`. The value `3` is outdated and incorrect; canonical value is ₹4 (see Section 1.6)

---

## 7. Open Questions & Gaps

The following item is not yet resolved and must be confirmed before or during the development phase.

| # | Open Question | Area |
|---|---|---|
| 1 | How is the fee waiver tied to the customer's identity to prevent gaming via account re-registration? (e.g., verified phone number as a persistent identifier that carries across accounts) | Bookings |

---

*This document covers the Evercut customer platform fee system exclusively. It is based on the Evercut Professional Report (Storage, Subscription & Platform Cost Analysis) and the Gap Solutions document. Intended for internal development use by Quantneural. All confirmed rules reflect finalised business decisions as of the current revision.*
