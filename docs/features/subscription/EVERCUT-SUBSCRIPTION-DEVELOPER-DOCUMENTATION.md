# Evercut — Subscription & Platform Fee System: Developer Documentation

**Document Type:** Internal Technical Reference  
**Audience:** Backend & Frontend Developers  
**Platform:** Evercut (by Quantneural)  
**Source:** Evercut Professional Report — Storage, Subscription & Platform Cost Analysis  
**Revision Note:** Updated to reflect confirmed user-type separation: Barbers and Customers; updated with confirmed business clarifications; scoped exclusively to subscription and platform fee content  
**Status:** Based on current internal research and estimations; updated with confirmed clarifications

---

## ⚠ Critical Architectural Note — Read Before Anything Else

Evercut has **two distinct user types**, and the two primary monetisation systems each belong exclusively to one of them:

| System | Applies To | Does NOT Apply To |
|---|---|---|
| **Subscription Plans** (Section 2 of PDF) | **Barbers** only | Customers |
| **Platform Fee Structure** (Section 3 of PDF) | **Customers** only | Barbers |

These systems are **completely separate**. They share no logic, no counters, and no lifecycle dependencies. A barber's subscription tier has no effect on platform fees, and a customer's booking behaviour has no effect on any barber's subscription. Every section of this document is labelled with the applicable user type. Developers must never mix logic across these two user contexts.

---

## Table of Contents

1. [Platform Architecture & User Types](#1-platform-architecture--user-types)
2. [Barber Subscription Plans — Feature Matrix](#2-barber-subscription-plans--feature-matrix)
3. [Barber Feature Definitions & Business Logic](#3-barber-feature-definitions--business-logic)
   - 3.1 Photo Uploads
   - 3.2 Video Uploads
   - 3.3 Upload Enforcement — Edge Cases
   - 3.4 Verification Badge System
   - 3.5 Promotional Visibility
   - 3.6 Statement Downloads
   - 3.7 Customer Support Tier Routing
4. [Barber Subscription Lifecycle](#4-barber-subscription-lifecycle)
5. [Barber Storage & Upload Constraints per Plan](#5-barber-storage--upload-constraints-per-plan)
6. [Customer Platform Fee Structure](#6-customer-platform-fee-structure)
7. [Customer Introductory Fee Waiver Logic](#7-customer-introductory-fee-waiver-logic)
8. [Booking Rules & Validation Flow](#8-booking-rules--validation-flow)
9. [End-to-End Booking Walkthrough — Customer Perspective](#9-end-to-end-booking-walkthrough--customer-perspective)
10. [Data Model Reference](#10-data-model-reference)
11. [Implementation Checklist](#11-implementation-checklist)
12. [Open Questions & Gaps](#12-open-questions--gaps)

---

## 1. Platform Architecture & User Types

### 1.1 User Types

The Evercut platform supports exactly two user types:

**Barbers** — Service providers who register on the platform to list their services, receive bookings, and manage their profiles. Barbers subscribe to a plan to unlock platform features.

**Customers** — End-users who discover barbers on the platform and make bookings. Customers do not subscribe to any plan.

### 1.2 Monetisation Model

Evercut monetises through two separate and independent mechanisms:

| Mechanism | Payer | Trigger | Governed By |
|---|---|---|---|
| **Subscription Fee** | Barber | Monthly plan renewal (paid plans only) | Barber's chosen plan tier |
| **Platform Fee** | Customer | Each booking transaction (after waiver period) | Booking type |

These mechanisms operate in entirely separate domains:

- A barber's subscription tier has **no bearing** on the platform fee a customer pays.
- A customer's booking history has **no bearing** on a barber's subscription access or features.
- The two fee systems must be implemented, stored, and managed completely independently.

### 1.3 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      EVERCUT PLATFORM                       │
├──────────────────────────┬──────────────────────────────────┤
│       BARBER SIDE        │         CUSTOMER SIDE            │
│                          │                                  │
│  ┌────────────────────┐  │  ┌──────────────────────────┐    │
│  │  Subscription Plan │  │  │  Platform Fee on Booking │    │
│  │  Basic (Free) /    │  │  │  ₹4 (Single)             │    │
│  │  Popular / Advanced│  │  │  ₹10 (Bundle/Combined)   │    │
│  └────────────────────┘  │  └──────────────────────────┘    │
│                          │                                  │
│  Controls:               │  Waived for:                     │
│  - Upload limits         │  - First 2 bookings per customer │
│  - Badge                 │  (platform fee only is waived;   │
│  - Visibility            │   booking amount always charged) │
│  - Statements            │                                  │
│  - Support tier          │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

---

## 2. Barber Subscription Plans — Feature Matrix

> **Applies To: Barbers only. Customers have no subscription plan.**

Evercut offers three subscription tiers for barbers. The table below is the canonical feature matrix as defined in the source document.

| Feature | Basic | Popular ⭐ | Advanced |
|---|---|---|---|
| **Internal Label** | Get Started | Most Recommended | Premium Growth |
| **Verification Badge** | Not Verified | Blue Badge | Yellow Badge |
| **Photo Uploads** | 10 Photos | 30 Photos | 50 Photos |
| **Video Uploads** | 2 Videos | 10 Videos | 15 Videos |
| **Promotional Visibility** | None | Enhanced Reach & Local Visibility | Maximum Exposure & Priority Reach |
| **Statement Downloads** | 1 Statement | 5 Statements | 10 Statements |
| **Customer Support** | Standard Support | Premium Support – Basic | Premium Support – Priority |

> **⭐ Popular Plan:** Designated by the business as the most recommended tier. It must be visually highlighted in the plan selection UI (e.g., a "Most Recommended" or "Best Value" badge) on all barber-facing subscription screens.

### Plan Pricing Model

| Plan | Pricing |
|---|---|
| Basic | **Free** — no subscription charge |
| Popular | **Paid** — monthly subscription; exact price to be confirmed (see Section 12) |
| Advanced | **Paid** — monthly subscription; exact price to be confirmed (see Section 12) |

> **Basic is a completely free tier**, equivalent to the free-tier model used by most major platforms. Barbers on Basic access the platform at no cost but with limited features. Only the **Popular** and **Advanced** plans are paid subscription plans. There is no charge or billing involved for the Basic plan.

### Plan Identifiers (Suggested)

Each plan must be assigned a stable internal identifier used consistently across the database, APIs, and frontend:

| Plan Name | Suggested Enum / Key |
|---|---|
| Basic | `PLAN_BASIC` |
| Popular | `PLAN_POPULAR` |
| Advanced | `PLAN_ADVANCED` |

---

## 3. Barber Feature Definitions & Business Logic

> **Applies To: Barbers only.**

### 3.1 Photo Uploads

The photo upload limit defines the **maximum cumulative number of photos** a barber may upload to their barber shop gallery over the lifetime of their account under a given plan.

| Plan | Photo Upload Limit |
|---|---|
| Basic | 10 |
| Popular | 30 |
| Advanced | 50 |

> **Scope:** This cumulative upload limit applies exclusively to the **barber shop gallery**. Other upload contexts (e.g., profile avatar, cover image), if applicable, are governed by separate rules outside the scope of this document.

**Business Logic:**

- The limit is treated as a **cumulative total upload cap**, not a concurrent active storage cap. A barber who deletes a gallery photo does **not** free up an upload slot — the slot is permanently consumed.
- The system must prevent a new upload if the barber's `total_photos_uploaded` equals or exceeds the plan limit.
- **Average assumed file size: 8 MB per image** (used for internal cost modelling only; not exposed to barbers).

**Enforcement Flow:**

```
On barber gallery photo upload request:
  1. Fetch barber's active_plan
  2. Fetch barber's total_photos_uploaded
  3. photo_limit = getPlanPhotoLimit(active_plan)
  4. IF total_photos_uploaded >= photo_limit:
       → Reject upload
       → Return error: "Photo upload limit reached for your plan. Upgrade to upload more."
  5. ELSE:
       → Proceed with upload to storage
       → On success: increment total_photos_uploaded by 1
       → Store file reference in barber profile
```

### 3.2 Video Uploads

The video upload limit defines the **maximum cumulative number of videos** a barber may upload to their barber shop gallery over the lifetime of their account under a given plan.

| Plan | Video Upload Limit |
|---|---|
| Basic | 2 |
| Popular | 10 |
| Advanced | 15 |

> **Scope:** This cumulative upload limit applies exclusively to the **barber shop gallery**, consistent with the photo upload model defined in Section 3.1.

**Business Logic:**

- Same cumulative total upload cap model as photos. Deleting a gallery video does **not** free up an upload slot — the slot is permanently consumed.
- Videos carry a higher infrastructure cost due to file size, even though the per-MB rate is identical to images.
- **Average assumed file size: 50 MB per video** (used for internal cost modelling only).

**Enforcement Flow:**

```
On barber gallery video upload request:
  1. Fetch barber's active_plan
  2. Fetch barber's total_videos_uploaded
  3. video_limit = getPlanVideoLimit(active_plan)
  4. IF total_videos_uploaded >= video_limit:
       → Reject upload
       → Return error: "Video upload limit reached for your plan. Upgrade to upload more."
  5. ELSE:
       → Proceed with upload to storage
       → On success: increment total_videos_uploaded by 1
       → Store file reference in barber profile
```

### 3.3 Upload Enforcement — Edge Cases

| Scenario | Required Behaviour |
|---|---|
| Barber deletes a gallery photo or video | The cumulative counter does **not** decrement. The upload slot is permanently consumed and is not recovered by deletion. The file is removed from the profile but the count stands. |
| Barber downgrades plan; cumulative count already exceeds new plan limit | Soft-lock: block new uploads; do not auto-delete existing gallery media. Existing files remain visible on the profile. Flag account or prompt barber to acknowledge the limit. **Exact excess-media policy must be confirmed (see Section 12).** |
| Barber upgrades plan | New higher cumulative limit applies immediately. No action required on existing media. |
| Plan lapses or expires | Revert to Basic limits immediately (no grace period). If cumulative counts exceed Basic limits, soft-lock applies — no new gallery uploads permitted. |
| Upload fails mid-transfer | Do not increment the cumulative counter. Roll back any partial storage writes. |

### 3.4 Verification Badge System

A verification badge is a trust signal displayed on the barber's public profile. It is **directly and exclusively derived from the barber's active subscription tier** and is never manually assignable or overridable.

| Plan | Badge Status | Badge Colour |
|---|---|---|
| Basic | Not Verified | None |
| Popular | Verified | Blue |
| Advanced | Verified | Yellow |

**Business Logic:**

- The badge must always reflect the barber's current active plan in real time. It must not lag behind subscription state changes.
- The badge is best treated as a **derived property** computed from the subscription tier at read time, eliminating sync issues entirely.
- If stored separately for performance, it must be updated synchronously within the same transaction as any subscription state change.

**State Transitions:**

| Event | Badge Change |
|---|---|
| Barber registers (defaults to Basic) | None |
| Barber subscribes: Basic → Popular | No Badge → Blue |
| Barber upgrades: Popular → Advanced | Blue → Yellow |
| Barber downgrades: Advanced → Popular | Yellow → Blue |
| Barber downgrades: Popular → Basic | Blue → None |
| Subscription lapses or is cancelled | Revert to None (Basic state) |

**Derivation Mapping:**

```
function getBadge(active_plan):
  PLAN_BASIC    → { verified: false, colour: null }
  PLAN_POPULAR  → { verified: true,  colour: "BLUE" }
  PLAN_ADVANCED → { verified: true,  colour: "YELLOW" }
```

### 3.5 Promotional Visibility

Promotional visibility controls how prominently a barber appears across the platform's search results, discovery feeds, and local/geographic recommendation surfaces.

| Plan | Visibility Level | Behaviour |
|---|---|---|
| Basic | None | Organic listing only. No ranking boost applied. |
| Popular | Enhanced Reach & Local Visibility | Boosted within local/geographic area of the barber. |
| Advanced | Maximum Exposure & Priority Reach | Highest priority boost across all discovery surfaces. |

**Business Logic:**

- Barbers on Basic appear solely through organic relevance ranking — no artificial boost is applied.
- Barbers on Popular receive a geo-localised boost specific to their service area or city.
- Barbers on Advanced receive the highest ranking priority across all customer-facing discovery surfaces (search, featured, local, etc.).
- Specific numerical boost weights or scoring values are a product/algorithm decision not defined in the source document. This document defines only the existence and ordering of tiers.
- The visibility tier must be updated in the search/recommendation engine whenever a barber's subscription changes.

**Derivation Mapping:**

```
function getVisibilityTier(active_plan):
  PLAN_BASIC    → VISIBILITY_NONE
  PLAN_POPULAR  → VISIBILITY_LOCAL
  PLAN_ADVANCED → VISIBILITY_PRIORITY
```

### 3.6 Statement Downloads

Statements are financial/transaction records that barbers can download from their dashboard.

| Plan | Statement Downloads Allowed (per billing cycle) |
|---|---|
| Basic | 1 |
| Popular | 5 |
| Advanced | 10 |

**Business Logic:**

- The download limit is a **per-billing-cycle cap** — the counter resets at the start of each new monthly billing cycle upon subscription renewal.
- The system maintains a `statements_downloaded_this_period` counter per barber.

**Enforcement Flow:**

```
On barber statement download request:
  1. Fetch barber's active_plan and statement_limit
  2. Fetch barber's statements_downloaded_this_period
  3. IF statements_downloaded_this_period >= statement_limit:
       → Reject request
       → Return error: "Statement download limit reached for this period. Upgrade your plan or wait for renewal."
  4. ELSE:
       → Serve the statement download
       → Increment statements_downloaded_this_period by 1
```

**Counter Reset:** The counter resets to `0` at the start of each new monthly billing cycle (upon subscription renewal).

**Edge Cases:**

| Scenario | Behaviour |
|---|---|
| Barber upgrades mid-cycle | New higher limit applies immediately; existing count is retained. Barber gains headroom from the higher limit immediately. |
| Barber downgrades mid-cycle | If `statements_downloaded_this_period` already exceeds the new plan limit, no further downloads are permitted until the counter resets at the next renewal. |
| Subscription lapses | Basic limits apply immediately. Barber is capped at 1 download for any partial or lapsed period. |

### 3.7 Customer Support Tier Routing

A barber's subscription plan determines the support queue and priority level they receive when contacting Evercut support.

| Plan | Support Tier | Queue Behaviour |
|---|---|---|
| Basic | Standard Support | Standard queue; no prioritisation |
| Popular | Premium Support – Basic | Premium queue; baseline SLA applied |
| Advanced | Premium Support – Priority | Highest-priority queue; fastest SLA |

**Business Logic:**

- When a barber submits a support ticket, the system reads their active subscription plan and tags the ticket with the corresponding support tier.
- This tag must be passed to the support tooling (CRM, helpdesk) to enable automatic queue routing.
- Specific SLA times are not defined in the source document and must be confirmed by the business/operations team.
- Open tickets retain the support tier assigned at time of submission. Upgrades after submission do not automatically re-prioritise existing open tickets unless a business rule specifies otherwise.

**Derivation Mapping:**

```
function getSupportTier(active_plan):
  PLAN_BASIC    → SUPPORT_STANDARD
  PLAN_POPULAR  → SUPPORT_PREMIUM_BASIC
  PLAN_ADVANCED → SUPPORT_PREMIUM_PRIORITY
```

---

## 4. Barber Subscription Lifecycle

> **Applies To: Barbers only.**

### 4.1 Plan Assignment at Registration

- When a barber registers, they must be assigned a subscription plan. The default is `PLAN_BASIC` (free). Upgrade to a paid plan is available at any time.
- The subscription record must be created simultaneously with the barber account.
- Barbers on `PLAN_BASIC` have no billing — the free plan carries no charge and no renewal cycle.

### 4.2 Effects of Plan Changes

All plan changes (upgrade or downgrade) must trigger the following effects synchronously or via a reliable event/hook:

| Feature | On Upgrade | On Downgrade |
|---|---|---|
| Upload Limits | New higher cumulative limit applies immediately | New lower cumulative limit applies immediately; if cumulative count already exceeds new limit, new uploads are blocked |
| Verification Badge | Updated to new tier badge immediately | Reverted to lower tier badge immediately |
| Promotional Visibility | Boost tier upgraded immediately | Boost tier reduced immediately |
| Statement Limit | Higher limit applies for current period | Lower limit applies; if already exceeded, further downloads blocked until reset |
| Support Tier | Higher priority applied to new tickets | Lower priority applied to new tickets |

### 4.3 Subscription Expiry & Lapse

When a paid subscription (Popular or Advanced) expires without renewal, features are restricted **immediately** — there is no grace period.

- All features revert to `PLAN_BASIC` behaviour immediately.
- Badge reverts to "Not Verified."
- Visibility boost is removed.
- Gallery upload limits revert to Basic cumulative caps. If existing cumulative counts already exceed Basic limits, soft-lock applies — no new uploads permitted.
- Statement download counter is not reset; it resumes at its current value under Basic limits.

### 4.4 Billing Cycle, Renewal & Cancellation

**Confirmed:**

| Detail | Value |
|---|---|
| Billing cycle | **Monthly** |
| Renewal | **Automatic** — paid subscriptions (Popular and Advanced) renew automatically at the end of each monthly cycle |
| Basic plan billing | **None** — the Basic plan is free; no billing or renewal applies |

**Still to be confirmed:**

- Exact subscription price per paid tier (Popular and Advanced)
- Cancellation policy: immediate termination vs. end-of-period access

---

## 5. Barber Storage & Upload Constraints per Plan

> **Applies To: Barbers (internal planning reference). Must not be displayed in any barber-facing UI.**

### 5.1 Maximum Storage Footprint per Barber (Estimated)

The figures below represent **maximum cumulative storage** per barber — the total storage consumed if a barber uploads the full number of files permitted under their plan. Since upload limits are cumulative (not concurrent), deleted files reduce active content on the profile but do not reduce total storage consumed.

| Plan | Max Photos | Photo Storage | Max Videos | Video Storage | Total Max Storage |
|---|---|---|---|---|---|
| Basic | 10 | ~80 MB | 2 | ~100 MB | ~180 MB |
| Popular | 30 | ~240 MB | 10 | ~500 MB | ~740 MB |
| Advanced | 50 | ~400 MB | 15 | ~750 MB | ~1,150 MB |

---

## 6. Customer Platform Fee Structure

> **Applies To: Customers only. Barbers do not pay platform fees. This fee is charged to the customer at booking time and is completely independent of any barber's subscription plan.**

### 6.1 Overview

When a customer makes a booking, the platform charges a **platform fee** on top of the booking amount. This is Evercut's transaction-level revenue collected from the customer side.

### 6.2 Fee Table

| Booking Type | Platform Fee |
|---|---|
| Single Service Booking | ₹4 |
| Bundle Booking | ₹10 |
| Single + Bundle Combined | ₹10 |

### 6.3 Booking Type Definitions

- **Single Service Booking:** A booking for one individual service from a barber.
- **Bundle Booking:** A booking for a pre-packaged bundle of services from a barber.
- **Single + Bundle Combined:** A booking that includes at least one bundle alongside any number of individual services.

### 6.4 Fee Cap Rule

When a booking includes any bundle — regardless of whether individual services are also included — the platform fee is **capped at ₹10**. Fees do not stack. A combined booking is never charged ₹4 + ₹10 = ₹14; it is always ₹10.

```
function calculatePlatformFee(booking_type):
  IF booking_type == SINGLE:
    return ₹4
  IF booking_type == BUNDLE or booking_type == COMBINED:
    return ₹10
```

The ₹10 cap for combined bookings must be **explicitly enforced in code** rather than derived by summing individual fees. This is a critical implementation detail.

### 6.5 Minimum Booking Amount Constraint

- The minimum booking amount threshold of **₹70 applies to the service amount only** — that is, the total cost of selected services or bundles, before the platform fee is added. The platform fee is never included in this threshold calculation.
- A service amount of ₹70 with a ₹4 platform fee (total ₹74 charged) is valid. The ₹70 check is on the service amount alone.
- If the service amount falls below ₹70, the booking must be **rejected at creation time**.
- This validation applies to **all customers**, including those within the introductory fee waiver period.
- This validation must occur **before** any platform fee calculation or waiver check.

---

## 7. Customer Introductory Fee Waiver Logic

> **Applies To: Customers only.**

### 7.1 The Introductory Offer — Precise Definition

As an introductory incentive, Evercut **waives the platform fee** on a customer's **first two bookings**.

The following distinctions are critical and must be clearly understood by all developers:

| Aspect | Detail |
|---|---|
| **What IS waived** | The platform fee (₹4 or ₹10) |
| **What is NOT waived** | The booking amount (the cost of the service/bundle paid to the barber) |
| **Who receives this offer** | Customers — per account, one time |
| **Who does NOT receive this offer** | Barbers. This offer has no barber-side equivalent whatsoever. |
| **How many qualifying bookings** | First 2 bookings ever made by the customer account |
| **When the offer resets** | It does not reset. It is a one-time, lifetime offer per customer account. |

This offer must never be implemented or described as "free bookings." The customer still pays the full service amount to the barber on every booking. Only the platform fee component is waived.

### 7.2 Fee Waiver Counter

The system must maintain a dedicated counter per **Customer document** to track fee waiver usage. This counter must never appear on a barber record.

| Field | Type | Description |
|---|---|---|
| `fee_waiver_bookings_used` | Integer | Number of fee-waived bookings consumed (range: 0–2) |
| `fee_waiver_quota` | Integer | Total fee-waived bookings allowed (constant value: 2) |
| `fee_waiver_exhausted` | Boolean | Derived: `true` when `fee_waiver_bookings_used >= fee_waiver_quota` |

### 7.3 Fee Waiver Application Logic

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

### 7.4 Waiver Rules & Edge Cases

| Scenario | Behaviour |
|---|---|
| Customer's 1st booking (any type, service amount ≥ ₹70) | Platform fee = ₹0. Counter increments to 1 after payment success. Service amount charged in full. |
| Customer's 2nd booking (any type, service amount ≥ ₹70) | Platform fee = ₹0. Counter increments to 2 after payment success. `fee_waiver_exhausted` becomes `true`. |
| Customer's 3rd booking onwards | Standard platform fee applies (₹4 or ₹10). |
| Service amount below ₹70 during waiver period | Booking rejected. Minimum service amount validation applies regardless of waiver status. Counter must NOT increment. |
| Payment fails on a waiver-eligible booking | Counter must NOT increment. Waiver slot is preserved for the customer's next successful booking. |
| Customer cancels a waiver-covered booking after payment | The counter does **not** decrement. The fee waiver slot consumed by that booking is permanently used, regardless of the cancellation. |
| Customer re-registers with a new account to reset waiver | The waiver must be tied to a persistent identifier beyond just the account (e.g., verified phone number) to prevent gaming. Anti-abuse mechanism must be confirmed (see Section 12). |
| Same customer books two different barbers | The waiver applies per customer account across all barbers — not per barber. The first 2 bookings ever (regardless of which barber) are waiver-eligible. |

---

## 8. Booking Rules & Validation Flow

> **Applies To: Customers (who create bookings). Barbers receive bookings.**

### 8.1 Pre-Creation Validation Sequence

All validations must pass in this order before a booking is persisted. Validation occurs before fee calculation and before any waiver counter changes.

| Step | Validation | Failure Action |
|---|---|---|
| 1 | Customer account is active and authenticated | Reject; prompt login or account resolution |
| 2 | Target barber exists and is active on the platform | Reject; return "Barber unavailable" error |
| 3 | Booking type is a valid value (`SINGLE`, `BUNDLE`, or `COMBINED`) | Reject; return invalid type error |
| 4 | Service amount ≥ ₹70 | Reject; return "Minimum booking amount is ₹70" |

### 8.2 Complete Booking Creation Flow

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

### 8.3 Booking Record Fields (Suggested)

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
| `created_at` | Timestamp | Booking creation datetime |

---

## 9. End-to-End Booking Walkthrough — Customer Perspective

> **Applies To: Customers.** These scenarios illustrate correct system behaviour across different booking situations.

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

---

## 10. Data Model Reference

This section provides a consolidated view of the key fields required per entity, based on all business logic documented above.

### 10.1 Barber Document (MongoDB)

| Field | Type | Description |
|---|---|---|
| `barber_id` | UUID | Unique identifier |
| `active_plan` | Enum | `PLAN_BASIC`, `PLAN_POPULAR`, `PLAN_ADVANCED` |
| `subscription_status` | Enum | `ACTIVE`, `EXPIRED`, `CANCELLED`. Basic plan always remains `ACTIVE` (free; cannot expire). |
| `subscription_start_date` | Date | Start of current monthly billing cycle. Applies to paid plans (Popular, Advanced) only. |
| `subscription_end_date` | Date | End of current monthly billing cycle; auto-renewal date. Applies to paid plans only. |
| `verification_badge` | Derived / Enum | `NONE`, `BLUE`, `YELLOW` — derived from `active_plan` |
| `visibility_tier` | Derived / Enum | `NONE`, `LOCAL`, `PRIORITY` — derived from `active_plan` |
| `support_tier` | Derived / Enum | Derived from `active_plan` |
| `total_photos_uploaded` | Integer | Cumulative total gallery photos ever uploaded. Never decremented. Used to enforce the plan photo upload limit. |
| `total_videos_uploaded` | Integer | Cumulative total gallery videos ever uploaded. Never decremented. Used to enforce the plan video upload limit. |
| `statements_downloaded_this_period` | Integer | Resets to 0 at the start of each new monthly billing cycle upon renewal |

### 10.2 Customer Document (MongoDB)

| Field | Type | Description |
|---|---|---|
| `customer_id` | UUID | Unique identifier |
| `fee_waiver_bookings_used` | Integer | Fee-waived bookings consumed (0, 1, or 2) |
| `fee_waiver_quota` | Integer | Total waiver-eligible bookings (constant: 2) |
| `fee_waiver_exhausted` | Boolean | `true` when `fee_waiver_bookings_used >= fee_waiver_quota` |

### 10.3 Booking Document (MongoDB)

| Field | Type | Description |
|---|---|---|
| `booking_id` | UUID | Unique identifier |
| `customer_id` | Ref → Customer | Booking initiator |
| `barber_id` | Ref → Barber | Booking recipient |
| `booking_type` | Enum | `SINGLE`, `BUNDLE`, `COMBINED` |
| `booking_amount` | Decimal | Service cost before platform fee (must be ≥ ₹70) |
| `platform_fee` | Decimal | ₹0 (waived), ₹4, or ₹10 |
| `total_charged` | Decimal | `booking_amount + platform_fee` |
| `waiver_applied` | Boolean | Whether the introductory fee waiver was used |
| `status` | Enum | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED` |
| `created_at` | Timestamp | Booking creation datetime |

---

## 11. Implementation Checklist

### Barber — Subscription System

- [ ] Define barber data model with all subscription-related fields
- [ ] Implement plan assignment at barber registration (default: `PLAN_BASIC`, free)
- [ ] Implement plan upgrade flow with immediate feature effect
- [ ] Implement plan downgrade flow with immediate feature reversion and soft-lock logic
- [ ] Implement subscription expiry/lapse handling: revert to Basic immediately, no grace period
- [ ] Implement monthly billing cycle for paid plans (Popular and Advanced)
- [ ] Implement automatic subscription renewal at end of each monthly cycle
- [ ] Implement cancellation logic (immediate vs. end-of-period) — **pending business confirmation**

### Barber — Upload Enforcement

- [ ] Track `total_photos_uploaded` per barber (cumulative; increment on successful gallery upload; never decrement)
- [ ] Track `total_videos_uploaded` per barber (cumulative; increment on successful gallery upload; never decrement)
- [ ] Enforce photo upload limit against cumulative counter before accepting upload (pre-upload validation)
- [ ] Enforce video upload limit against cumulative counter before accepting upload (pre-upload validation)
- [ ] Implement soft-lock on downgrade or expiry: block new uploads, do not auto-delete existing gallery media
- [ ] Return clear error message with upgrade prompt when cumulative limit is reached

### Barber — Badge & Visibility

- [ ] Derive verification badge from `active_plan` at read time (or sync on plan change event)
- [ ] Update badge on all subscription lifecycle events (upgrade, downgrade, expiry, cancellation)
- [ ] Integrate visibility tier signal into search/recommendation engine
- [ ] Update visibility tier on all subscription lifecycle events

### Barber — Statements

- [ ] Track `statements_downloaded_this_period` per barber
- [ ] Enforce plan-level statement download limit on each download request
- [ ] Reset counter to 0 at the start of each new monthly billing cycle upon renewal
- [ ] Handle mid-cycle upgrades (new limit applies immediately) and downgrades (block if exceeded)

### Barber — Support Routing

- [ ] Tag support tickets with barber's support tier at time of submission
- [ ] Route tickets to appropriate support queue based on tier tag

### Customer — Platform Fees & Waiver

- [ ] Add `fee_waiver_bookings_used` and related fields to Customer document
- [ ] Implement `resolveCustomerPlatformFee()` with waiver check
- [ ] Implement platform fee calculation by booking type (Single: ₹4, Bundle/Combined: ₹10)
- [ ] Enforce ₹10 cap for combined bookings explicitly in code (not via fee summation)
- [ ] Enforce minimum service amount of ₹70 before any fee or waiver logic runs
- [ ] Increment waiver counter **only** after confirmed payment success
- [ ] Ensure waiver counter is never incremented on payment failure or booking rejection

### Customer — Booking Flow

- [ ] Implement full booking validation sequence (Steps 1–4 in Section 8)
- [ ] Implement atomic booking persistence — only after payment confirmation
- [ ] Persist all fee fields on booking record (`booking_amount`, `platform_fee`, `total_charged`, `waiver_applied`)

---

## 12. Open Questions & Gaps

The following items are not yet resolved and must be confirmed by the business team before or during the development phase.

| # | Open Question | Applies To | Area |
|---|---|---|---|
| 1 | What are the exact prices for the Popular and Advanced plans? (Basic is confirmed free.) | Barber | Billing |
| 2 | What is the exact policy for gallery media that exceeds upload limits after a plan downgrade or expiry? (e.g., must barber manually remove excess files? Is there a prompt or deadline?) | Barber | Uploads |
| 3 | What are the SLAs (response times) for Standard, Premium Basic, and Premium Priority support? | Barber | Support |
| 4 | What are the specific boost weights or scoring values for each promotional visibility tier? | Barber | Visibility |
| 5 | Can barber subscriptions be paused or put on hold? If so, how do features (badge, visibility, uploads, statements) behave during the hold? | Barber | Lifecycle |
| 6 | How is the fee waiver tied to the customer's identity to prevent gaming via account re-registration? (e.g., verified phone number as persistent identifier) | Customer | Bookings |
| 7 | What is the refund policy for platform fees on customer-cancelled bookings? | Customer | Bookings |

---

*This document is based on the Evercut Professional Report (Storage, Subscription & Platform Cost Analysis) and incorporates confirmed clarifications on the Barber/Customer user-type separation. It is intended for internal development use by Quantneural and is scoped exclusively to subscription and platform fee systems. All structures are based on current internal research and estimations and are subject to change.*
