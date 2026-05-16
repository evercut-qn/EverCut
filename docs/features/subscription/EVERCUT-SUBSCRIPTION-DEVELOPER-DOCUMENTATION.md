# Evercut — Subscription & Platform Fee System: Developer Documentation

**Document Type:** Internal Technical Reference  
**Audience:** Backend & Frontend Developers  
**Platform:** Evercut (by Quantneural)  
**Source:** Evercut Professional Report — Storage, Subscription & Platform Cost Analysis; Gap Solutions Document  
**Revision Note:** Updated to reflect confirmed user-type separation: Barbers and Customers; updated with confirmed business clarifications; updated with finalised gap answers; scoped exclusively to subscription and platform fee content  
**Status:** All core business rules confirmed. See Section 12 for remaining open items.

---

## ⚠ Critical Architectural Note — Read Before Anything Else

Evercut has **two distinct user types**, and the two primary monetisation systems each belong exclusively to one of them:

| System | Applies To | Does NOT Apply To |
|---|---|---|
| **Subscription Plans** | **Barbers** only | Customers |
| **Platform Fee Structure** | **Customers** only | Barbers |

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

Evercut offers three subscription tiers for barbers. The table below is the canonical feature matrix.

| Feature | Basic | Popular ⭐ | Advanced |
|---|---|---|---|
| **Internal Label** | Get Started | Most Recommended | Premium Growth |
| **Monthly Price** | ₹0 (Free) | ₹299/month | ₹499/month |
| **Verification Badge** | Not Verified | Blue Badge | Yellow Badge |
| **Photo Uploads** | 10 Photos | 30 Photos | 50 Photos |
| **Video Uploads** | 2 Videos | 10 Videos | 15 Videos |
| **Promotional Visibility** | None | Enhanced Reach & Local Visibility | Maximum Exposure & Priority Reach |
| **Statement Downloads** | 1 Statement | 5 Statements | 10 Statements |
| **Customer Support** | Standard Support | Premium Support – Basic | Premium Support – Priority |

> **⭐ Popular Plan:** Designated by the business as the most recommended tier. It must be visually highlighted in the plan selection UI (e.g., a "Most Recommended" or "Best Value" badge) on all barber-facing subscription screens.

### Plan Pricing Model

| Plan | Price | Billing |
|---|---|---|
| Basic | **₹0** — completely free | No billing; no renewal cycle; no expiry |
| Popular | **₹299/month** | Monthly; auto-renews every 30 days |
| Advanced | **₹499/month** | Monthly; auto-renews every 30 days |

> **Basic is a completely free tier**, equivalent to the free-tier model used by most major platforms. Barbers on Basic access the platform at no cost but with limited features. Only the **Popular** and **Advanced** plans involve any subscription charge. The pricing is designed to provide affordable entry-level access while offering premium growth and visibility features at higher tiers.

### Plan Identifiers

Each plan must be assigned a stable internal identifier used consistently across the database, APIs, and frontend:

| Plan Name | Enum / Key |
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
- Upload enforcement uses the `total_photos_uploaded` counter, which only ever increments and is never decremented under any circumstance.
- Separately, `active_photos_count` tracks how many photos are currently visible on the profile. This is used for display and downgrade/hidden-media management (see Section 3.3) and is distinct from the upload cap counter.
- The system must prevent a new upload if the barber's `total_photos_uploaded` equals or exceeds the plan limit.
- **Average assumed file size: 8 MB per image** (internal planning reference only; never exposed to barbers).

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
       → On success:
           - Increment total_photos_uploaded by 1
           - Increment active_photos_count by 1
           - Store file reference in barber profile
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
- Upload enforcement uses `total_videos_uploaded`; profile visibility uses `active_videos_count`.
- **Average assumed file size: 50 MB per video** (internal planning reference only).

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
       → On success:
           - Increment total_videos_uploaded by 1
           - Increment active_videos_count by 1
           - Store file reference in barber profile
```

### 3.3 Upload Enforcement — Edge Cases

#### On File Deletion

| Scenario | Required Behaviour |
|---|---|
| Barber deletes a gallery photo | `total_photos_uploaded` does **not** decrement — the upload slot is permanently consumed. `active_photos_count` decrements by 1. The file is removed from storage and the profile. |
| Barber deletes a gallery video | `total_videos_uploaded` does **not** decrement. `active_videos_count` decrements by 1. The file is removed from storage and the profile. |

#### On Plan Downgrade or Expiry — Excess Media Policy

When a barber downgrades to a lower plan (or their paid plan expires and reverts to Basic), the new plan's upload limit may be lower than the number of files currently active on the barber's profile. In this case, the platform follows a **hidden/inactive media model** as the primary approach, with a manual-removal fallback if that is technically infeasible.

---

**Primary Approach — Hidden/Inactive Media (Preferred)**

Excess active files that exceed the new plan's active count limit are **automatically marked as hidden or inactive** on the barber's public profile. They are not deleted — they remain stored in the system. When the barber upgrades their plan again to a tier that accommodates those files, hidden media is **automatically reactivated** and becomes visible on the profile again.

> **Example:** A barber on the Advanced plan has 50 active photos (`active_photos_count = 50`, `total_photos_uploaded = 50`). They downgrade to Basic (active limit: 10). 10 photos remain visible; the remaining 40 are marked hidden. `active_photos_count` becomes 10. `total_photos_uploaded` remains 50 — unchanged. The barber cannot upload any new photos on Basic (50 >= 10 cumulative limit). If the barber re-upgrades to Advanced, all 50 photos reactivate and `active_photos_count` returns to 50.

Key rules under this approach:

- Existing files are **never auto-deleted** by a downgrade or expiry event.
- `total_photos_uploaded` and `total_videos_uploaded` are **never decremented** — these cumulative counters are completely unaffected by hidden/inactive status changes.
- `active_photos_count` and `active_videos_count` are updated to reflect the new plan's active limit.
- The barber **cannot upload new files** if `total_photos_uploaded >= new_plan_limit`, even while some files are hidden. Hidden status does not free cumulative upload slots.
- **Ordering rule:** When excess files are hidden, a decision must be made on which specific files stay active and which are hidden. This ordering rule has not yet been finalised. See Section 12, Open Question 2.

```
On plan downgrade or expiry — media handling (Primary Approach):
  1. Determine new_photo_limit and new_video_limit for the new plan
  2. IF active_photos_count > new_photo_limit:
       excess = active_photos_count - new_photo_limit
       → Mark [excess] photo files as hidden (per ordering rule — TBD)
       → active_photos_count = new_photo_limit
  3. IF active_videos_count > new_video_limit:
       excess = active_videos_count - new_video_limit
       → Mark [excess] video files as hidden (per ordering rule — TBD)
       → active_videos_count = new_video_limit
  4. total_photos_uploaded and total_videos_uploaded → unchanged

On plan upgrade — media reactivation:
  1. Determine new_photo_limit and new_video_limit for the new plan
  2. IF hidden photos exist AND active_photos_count < new_photo_limit:
       → Reactivate hidden photos up to new_photo_limit
       → active_photos_count updated accordingly
  3. IF hidden videos exist AND active_videos_count < new_video_limit:
       → Reactivate hidden videos up to new_video_limit
       → active_videos_count updated accordingly
```

---

**Fallback Approach — Manual Removal (Only if Primary Approach is Technically Infeasible)**

If the platform cannot technically support hidden/inactive media handling at the time of implementation, the downgrade process must **not be permitted** until the barber manually removes enough files to bring their active count within the new plan's limit.

> **Example:** A barber on Advanced has 50 active photos and wishes to downgrade to Basic (limit: 10). The downgrade is blocked. The barber is shown a prompt explaining that they must delete 40 photos before the downgrade can proceed. Only after `active_photos_count <= 10` is the downgrade allowed.

Key rules under this approach:

- The downgrade UI must clearly communicate how many files must be removed and what the new plan limit is.
- Auto-deletion by the platform is not permitted under either approach.
- This approach must only be used if the Primary Approach cannot be implemented.

> **Recommendation:** The Primary Approach is strongly preferred for data safety, merchant trust, and user experience. The Fallback Approach is a last resort only.

---

#### Other Upload Edge Cases

| Scenario | Required Behaviour |
|---|---|
| Barber upgrades plan | New higher cumulative limit applies immediately. Hidden media (if any) reactivates up to the new plan limit automatically. No action required on already-active files. |
| Upload fails mid-transfer | Do not increment any counter. Roll back any partial storage writes. |

### 3.4 Verification Badge System

A verification badge is a trust signal displayed on the barber's public profile. It is **directly and exclusively derived from the barber's active subscription tier** and is never manually assignable or overridable.

| Plan | Badge Status | Badge Colour |
|---|---|---|
| Basic | Not Verified | None |
| Popular | Verified | Blue |
| Advanced | Verified | Yellow |

**Business Logic:**

- The badge must always reflect the barber's current active plan in real time.
- The badge is best treated as a **derived property** computed from `active_plan` at read time, eliminating sync issues entirely.
- If stored separately for performance, it must be updated synchronously within the same transaction as any subscription state change.

**State Transitions:**

| Event | Badge Change |
|---|---|
| Barber registers (defaults to Basic) | None |
| Barber subscribes: Basic → Popular | No Badge → Blue |
| Barber upgrades: Popular → Advanced | Blue → Yellow |
| Barber downgrades: Advanced → Popular | Yellow → Blue |
| Barber downgrades: Popular → Basic | Blue → None |
| Subscription expires or is cancelled | Revert to None (Basic state) |
| UPI AutoPay paused — current cycle still active | No change; badge remains at current tier until cycle end |
| UPI AutoPay paused — current cycle ends without renewal | Revert to None (Basic state) |

**Derivation Mapping:**

```
function getBadge(active_plan):
  PLAN_BASIC    → { verified: false, colour: null }
  PLAN_POPULAR  → { verified: true,  colour: "BLUE" }
  PLAN_ADVANCED → { verified: true,  colour: "YELLOW" }
```

### 3.5 Promotional Visibility

Promotional visibility controls how prominently a barber appears across the platform's search results, discovery feeds, and local/geographic recommendation surfaces.

| Plan | Visibility Label | Behaviour |
|---|---|---|
| Basic | None | Organic listing only. No ranking boost applied. |
| Popular | Enhanced Reach & Local Visibility | Boosted within local/geographic area of the barber. |
| Advanced | Maximum Exposure & Priority Reach | Highest priority boost across all discovery surfaces. |

**Business Logic:**

- Barbers on Basic appear solely through organic relevance ranking — no artificial boost is applied.
- Barbers on Popular receive a geo-localised boost specific to their service area or city.
- Barbers on Advanced receive the highest ranking priority across all customer-facing discovery surfaces.
- The visibility tier must be updated in the search/recommendation engine on every subscription lifecycle event.

**Current Implementation Scope — Tier Labels Only; No Fabricated Analytics:**

The exact recommendation algorithm, scoring weights, and boost values are **not defined at this stage** of the platform. Building a genuine recommendation engine requires user behaviour data, booking history, and sustained development effort that is outside the current launch scope.

The following rules are absolute and must be enforced in both code and product decisions:

- The platform will **only display the feature-based visibility labels** per plan tier as listed above. No numerical analytics, recommendation counts, or discovery statistics will be surfaced to barbers.
- **No fabricated or simulated analytics will ever be generated or displayed.** Examples of prohibited fabricated stats: "15 customers discovered your shop through priority visibility," "8 bookings were generated through recommendations." Such numbers would not reflect real system behaviour and are considered misleading and unethical regardless of how technically simple they are to generate.
- Recommendation analytics and visibility statistics will only be introduced in the product **after a genuine recommendation engine is fully built, tested, and validated** on real platform data.

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

- The download limit is a **per-billing-cycle cap**. The counter resets to `0` at the start of each new monthly billing cycle upon successful subscription renewal.
- The system maintains a `statements_downloaded_this_period` counter per barber.

**Enforcement Flow:**

```
On barber statement download request:
  1. Fetch barber's active_plan and statement_limit
  2. Fetch barber's statements_downloaded_this_period
  3. IF statements_downloaded_this_period >= statement_limit:
       → Reject request
       → Return error: "Statement download limit reached for this period.
                        Upgrade your plan or wait for renewal."
  4. ELSE:
       → Serve the statement download
       → Increment statements_downloaded_this_period by 1
```

**Counter Reset:** Resets to `0` at the start of each new monthly billing cycle upon successful renewal.

**Edge Cases:**

| Scenario | Behaviour |
|---|---|
| Barber upgrades mid-cycle | New higher limit applies immediately; existing count is retained. Barber gains headroom from the higher limit immediately. |
| Barber downgrades mid-cycle | If `statements_downloaded_this_period` already exceeds the new plan limit, no further downloads are permitted until the counter resets at the next renewal. |
| Subscription expires or lapses | Basic limits apply immediately. Barber is capped at 1 download for the current or any lapsed period. |

### 3.7 Customer Support Tier Routing

A barber's subscription plan determines the support label and queue associated with their support tickets.

| Plan | Support Tier Label | Queue |
|---|---|---|
| Basic | Standard Support | Standard queue |
| Popular | Premium Support – Basic | Premium queue |
| Advanced | Premium Support – Priority | Priority queue |

**Business Logic:**

**Initial stage:** At the current scale of the platform, merchant volume is manageable and Evercut will treat all support requests with high priority regardless of subscription tier. This is an internal operational decision — the support tier labels per plan are still displayed in the product and tagged on tickets, but actual SLA differentiation between queues has not yet been activated in operations.

**At scale:** As merchant volume grows, the support structure will gradually transition to fully differentiated SLA enforcement per tier — Standard, Premium Basic, and Premium Priority — as defined in the subscription plans. Specific SLA response time targets are an operations decision and will be defined separately when the differentiated support model is activated.

**Developer implementation:** The system must still tag every support ticket with the barber's support tier at the time of submission — always, regardless of whether operations currently enforces SLA differentiation. This ensures the tagging infrastructure is ready when differentiated SLAs are activated.

- Open tickets retain the support tier tag assigned at time of submission.
- Upgrades after submission do not automatically re-prioritise existing open tickets unless a business rule specifies otherwise.

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

- When a barber registers, they are assigned `PLAN_BASIC` by default (free). Upgrade to a paid plan is available at any time.
- The subscription record must be created simultaneously with the barber account.
- Barbers on `PLAN_BASIC` have no billing — the free plan carries no charge, no renewal cycle, and no expiry.

### 4.2 Effects of Plan Changes

All plan changes (upgrade or downgrade) must trigger the following effects synchronously or via a reliable event/hook:

| Feature | On Upgrade | On Downgrade |
|---|---|---|
| Upload Limits | New higher cumulative limit applies immediately. Hidden media (if any) reactivates up to the new plan limit. | New lower limit applies. Excess active media is hidden per the Primary Approach (Section 3.3). New uploads blocked if cumulative counter already exceeds new limit. |
| Verification Badge | Updated to new tier badge immediately. | Reverted to lower tier badge immediately. |
| Promotional Visibility | Boost tier upgraded immediately. | Boost tier reduced immediately. |
| Statement Limit | Higher limit applies for current period. | Lower limit applies; if already exceeded, further downloads blocked until reset. |
| Support Tier | Higher priority tag applied to new tickets. | Lower priority tag applied to new tickets. |

### 4.3 Subscription Expiry & Lapse

When a paid subscription (Popular or Advanced) expires without renewal, features are restricted **immediately** — there is no grace period.

- All features revert to `PLAN_BASIC` behaviour immediately.
- Badge reverts to "Not Verified."
- Visibility boost is removed.
- Excess active gallery media is hidden per the Primary Approach (Section 3.3). No new uploads permitted if cumulative counters already exceed Basic limits.
- `statements_downloaded_this_period` is not reset; the barber resumes under Basic limits (max 1 per period).

### 4.4 Billing Cycle, Renewal, Pause & Cancellation

#### Confirmed Rules

| Detail | Value |
|---|---|
| Billing cycle | **Monthly** |
| Plan duration | **30 days** — fixed from activation date, regardless of usage or inactivity |
| Renewal | **Automatic** — paid plans (Popular and Advanced) auto-renew every 30 days |
| Basic plan billing | **None** — free plan; no billing, no renewal, no expiry |

> **Fixed-duration model:** Once a paid plan is activated, the subscription runs for its full 30-day period regardless of whether the barber is active on the platform. Inactive usage does not earn extra days. This follows the standard telecom subscription model (e.g., Airtel, Jio) and keeps billing simple, predictable, and operationally manageable.

#### Pause Behaviour — Platform vs. UPI AutoPay

**No pause functionality exists on the Evercut platform itself.** Barbers cannot initiate a pause from within the app. The platform does not expose any pause, hold, or freeze mechanism, and the subscription always runs for its full fixed 30-day duration from the platform's perspective.

However, in India, barbers who pay via **UPI AutoPay** can pause or cancel their AutoPay mandate directly from their payment app (e.g., Google Pay, PhonePe, Paytm). This is an external action outside of Evercut's control. When this happens, the flow is handled entirely through payment gateway webhooks — no platform-side intervention is required or permitted. The platform reacts only to webhook events.

```
UPI AutoPay Pause — Webhook-Driven Flow:

  Barber pauses UPI AutoPay mandate in their payment app:
    → Payment gateway detects the pause
    → Renewal payment is NOT collected at next billing date
    → Platform receives a webhook: renewal_failed or mandate_paused

  While current billing cycle is still active (subscription_end_date not yet reached):
    → Barber retains full access to their current plan's features
    → No change to active_plan, badge, visibility, uploads, or any other feature
    → No platform-side action required — access continues normally until cycle end

  When subscription_end_date is reached with no successful renewal payment:
    → Platform processes this identically to a standard subscription expiry (Section 4.3)
    → active_plan reverts to PLAN_BASIC immediately
    → All paid plan features removed; excess media hidden; badge removed; visibility boost removed

  Barber resumes UPI AutoPay mandate in their payment app:
    → Payment gateway collects renewal payment
    → Platform receives a webhook: payment_success or subscription_renewed
    → active_plan is restored to the previously held paid tier (Popular or Advanced)
    → All plan features reinstated immediately
    → Hidden media reactivates up to the restored plan limit
    → New subscription_end_date set: current date + 30 days
    → statements_downloaded_this_period resets to 0
```

> **Developer note:** The platform must not attempt to detect, anticipate, or manage UPI AutoPay pauses proactively. The correct model is purely webhook-reactive: grant access until the current cycle's `subscription_end_date`; process a missed renewal webhook exactly as a standard expiry. The external pause mechanism in the user's payment app is entirely invisible to the platform until a webhook signals a failed renewal.

#### Cancellation

The cancellation policy — specifically whether cancellation terminates access immediately or allows access to continue until the end of the current 30-day billing period — is **not yet confirmed**. See Section 12, Open Question 1.

---

## 5. Barber Storage & Upload Constraints per Plan

> **Applies To: Barbers (internal planning reference). Must not be displayed in any barber-facing UI.**

### 5.1 Maximum Storage Footprint per Barber (Estimated)

The figures below represent **maximum cumulative storage** per barber — the total storage that would be consumed if a barber uploads the full number of files permitted by their plan's cumulative cap. Since upload limits are cumulative (not concurrent), deleted files reduce active content on the profile but do not reduce storage consumed. Hidden files also continue to occupy storage.

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

- The minimum booking amount threshold of **₹70 applies to the service amount only** — the total cost of selected services or bundles, before the platform fee is added. The platform fee is never included in this threshold calculation.
- A service amount of ₹70 with a ₹4 platform fee (total ₹74 charged) is valid. The ₹70 check is on the service amount alone.
- If the service amount falls below ₹70, the booking must be **rejected at creation time**.
- This validation applies to **all customers**, including those within the introductory fee waiver period.
- This validation must occur **before** any platform fee calculation or waiver check.

---

## 7. Customer Introductory Fee Waiver Logic

> **Applies To: Customers only.**

### 7.1 The Introductory Offer — Precise Definition

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
| Service amount below ₹70 during waiver period | Booking rejected. Counter must NOT increment. |
| Payment fails on a waiver-eligible booking | Counter must NOT increment. Waiver slot is preserved for the customer's next successful booking. |
| Customer cancels a waiver-covered booking after payment | The counter does **not** decrement. The fee waiver slot is permanently used, regardless of the cancellation. |
| Customer re-registers with a new account to reset waiver | The waiver must be tied to a persistent identifier beyond just the account (e.g., verified phone number) to prevent gaming. Anti-abuse mechanism must be confirmed — see Section 12, Open Question 3. |
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

### 8.3 Booking Record Fields

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
| `subscription_start_date` | Date | Start of current 30-day billing cycle. Paid plans only. |
| `subscription_end_date` | Date | End of current 30-day billing cycle; auto-renewal date. Paid plans only. |
| `verification_badge` | Derived / Enum | `NONE`, `BLUE`, `YELLOW` — derived from `active_plan` |
| `visibility_tier` | Derived / Enum | `NONE`, `LOCAL`, `PRIORITY` — derived from `active_plan` |
| `support_tier` | Derived / Enum | Derived from `active_plan` |
| `total_photos_uploaded` | Integer | Cumulative gallery photos ever uploaded. **Never decremented under any circumstance.** Used for upload cap enforcement. |
| `total_videos_uploaded` | Integer | Cumulative gallery videos ever uploaded. **Never decremented under any circumstance.** Used for upload cap enforcement. |
| `active_photos_count` | Integer | Gallery photos currently active (visible on profile). Decrements on delete or hidden-media downgrade; increments on upload or reactivation on upgrade. |
| `active_videos_count` | Integer | Gallery videos currently active (visible on profile). Decrements on delete or hidden-media downgrade; increments on upload or reactivation on upgrade. |
| `statements_downloaded_this_period` | Integer | Resets to 0 at the start of each new monthly billing cycle upon successful renewal. |

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
- [ ] Implement plan upgrade flow with immediate feature effect and hidden media reactivation
- [ ] Implement plan downgrade flow: immediate feature reversion; hidden-media logic (Primary Approach); Fallback Approach if Primary not technically feasible
- [ ] Implement subscription expiry/lapse handling: revert to Basic immediately, no grace period; trigger hidden-media logic
- [ ] Implement fixed 30-day billing cycle for paid plans (Popular and Advanced)
- [ ] Implement automatic subscription renewal via payment gateway at end of each 30-day cycle
- [ ] Implement webhook handling for: renewal success, renewal failure / mandate paused, mandate resumed
- [ ] On renewal failure or mandate-paused webhook: do NOT change access — hold current plan until `subscription_end_date` is reached
- [ ] On `subscription_end_date` reached with no successful renewal: trigger standard expiry flow (Section 4.3)
- [ ] On renewal success / mandate-resumed webhook: restore plan, reactivate hidden media, reset `statements_downloaded_this_period` to 0, set new `subscription_end_date` (current date + 30 days)
- [ ] Implement cancellation logic — **pending business confirmation** (see Section 12, Open Question 1)

### Barber — Upload Enforcement

- [ ] Track `total_photos_uploaded` per barber (cumulative; increment on successful gallery upload; **never decrement**)
- [ ] Track `total_videos_uploaded` per barber (cumulative; increment on successful gallery upload; **never decrement**)
- [ ] Track `active_photos_count` per barber (increment on upload or reactivation; decrement on delete or hidden-media downgrade)
- [ ] Track `active_videos_count` per barber (increment on upload or reactivation; decrement on delete or hidden-media downgrade)
- [ ] Enforce upload cap against cumulative counter (`total_photos_uploaded` / `total_videos_uploaded`) before accepting any gallery upload
- [ ] On downgrade or expiry: apply hidden-media logic — mark excess active files as hidden; update `active_photos_count` / `active_videos_count`
- [ ] On upgrade: reactivate hidden files up to new plan limit; update `active_photos_count` / `active_videos_count`
- [ ] Return clear error message with upgrade prompt when cumulative upload limit is reached
- [ ] Implement ordering rule for which files are hidden on downgrade — **pending decision** (see Section 12, Open Question 2)

### Barber — Badge & Visibility

- [ ] Derive verification badge from `active_plan` at read time (or sync on plan change event)
- [ ] Update badge on all subscription lifecycle events (upgrade, downgrade, expiry, UPI AutoPay cycle-end without renewal)
- [ ] Integrate visibility tier signal into search/recommendation engine
- [ ] Update visibility tier on all subscription lifecycle events
- [ ] Do **NOT** implement or display any fabricated recommendation analytics or visibility counts — only feature-based tier labels

### Barber — Statements

- [ ] Track `statements_downloaded_this_period` per barber
- [ ] Enforce plan-level statement download limit on each download request
- [ ] Reset counter to 0 on successful renewal webhook
- [ ] Handle mid-cycle upgrades (new limit applies immediately) and downgrades (block further downloads if limit already exceeded)

### Barber — Support Routing

- [ ] Tag all support tickets with barber's support tier at time of submission (always — regardless of current SLA enforcement status)
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

The following items are not yet resolved and must be confirmed before or during the development phase.

| # | Open Question | Applies To | Area |
|---|---|---|---|
| 1 | What is the cancellation policy? Does cancellation terminate features immediately, or does the barber retain access until the end of the current 30-day billing period? | Barber | Lifecycle |
| 2 | When a downgrade or expiry triggers the hidden-media policy and only a subset of active files can remain visible, which files stay active and which are hidden? Options: oldest uploads stay active (newest hidden); newest stay active (oldest hidden); barber is prompted to manually select which files to keep active. | Barber | Uploads |
| 3 | How is the fee waiver tied to the customer's identity to prevent gaming via account re-registration? (e.g., verified phone number as a persistent identifier that carries across accounts) | Customer | Bookings |
| 4 | What is the refund policy for platform fees on customer-cancelled bookings? | Customer | Bookings |

---

*This document is based on the Evercut Professional Report (Storage, Subscription & Platform Cost Analysis) and the Gap Solutions document, and incorporates confirmed clarifications on the Barber/Customer user-type separation. It is intended for internal development use by Quantneural and is scoped exclusively to subscription and platform fee systems. All confirmed rules reflect finalised business decisions as of the current revision.*
