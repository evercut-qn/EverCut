# Admin Dashboard Specification

## Overview

This document defines a **minimal, high-impact** admin dashboard for the EverCut platform. The specification is derived from the existing backend codebase and focuses on essential monitoring, analytics, and control capabilities.

**Design Principle:** Admin is an **observer and resolver**, not a super-user. The dashboard provides visibility into system health and business metrics, with minimal intervention capabilities limited to critical payout issues.

---

## Admin Role Definition

**What Admin IS:**
- System health monitor (view-only)
- Business analytics viewer (simple KPI cards)
- Payout resolver (failed payout retries, UPI/UTR settlement recording)
- Platform oversight authority

**What Admin IS NOT:**
- A replacement for customer/barber workflows
- A content manager (shops manage their own data)
- A micromanager of individual bookings or active user accounts
- An active moderator with dashboard-based account suspensions, refund initiations, or subscription overrides

---

## Core Feature Set

### 1. Analytics Dashboard (READ-ONLY)

**Purpose:** Provide high-level business insights and platform health metrics using simple, visual KPI cards.

#### 1.1 Platform Overview
- **Total Users:** Displays the combined count of registered users (including both customers and barbers) on the main Operations Overview dashboard page.
- **Total Shops:** Active vs inactive shops.
- **Total Bookings:** All-time, monthly, weekly breakdown.
- **Revenue Metrics:** Total platform revenue, monthly trends.

**Why:** Essential for understanding platform health and growth trajectory at a glance.

**Data Source:** Aggregations from `User`, `Shop`, `Booking`, `PaymentTransaction` models.

---

#### 1.2 Booking Analytics
- **Booking Status Distribution:** Pending, confirmed, completed, cancelled counts.
- **Booking Trends:** Daily/weekly/monthly booking volume.
- **Top Performing Shops:** By booking count and revenue.

**Why:** Core business metric for platform success.

**Data Source:** `Booking` model with status aggregations.

---

#### 1.3 Financial Analytics
- [ ] **Payment Success Rate:** Completed vs failed payments.
- [ ] **Total Revenue:** Sum of successful payments.
- [ ] **Platform Fees Collected:** From completed bookings.
- [x] **Payout Status:** Pending, completed, failed payout counts *(Completed — implemented under dynamic `/payouts` tabs and `/overview` metrics)*.

**Why:** Critical for financial health monitoring.

**Data Source:** `PaymentTransaction`, `PayoutTransaction`, `Booking` models.

---

#### 1.4 User Activity
- **Active Users:** Basic count of active customers and barbers.
- **New Registrations:** Signup trends.

**Why:** Understand user signups and engagement.

**Data Source:** `User`, `Customer`, `Shop`, `Booking` models.

---

#### 1.5 Subscription Analytics
- **Active Subscriptions:** Total active barbers on Basic, Popular, and Advanced tiers.
- **Monetization Volume:** Monthly recurring revenue (MRR) from subscriptions.

**Why:** Track subscription performance.

**Data Source:** `Subscription` and `SubscriptionTransaction` models.

---

### 2. Monitoring & Operations (READ-ONLY + LIMITED ACTIONS)

**Purpose:** Real-time visibility into system operations and critical payout issue resolution.

#### 2.1 Recent Payouts Feed
- [x] **Recent Payouts:** Last 50 payout transactions with status *(Completed — listed in Payout History tab on `/payouts`)*.
- [x] **Failed Payouts:** Payout transactions requiring attention *(Completed — listed in Payout History with status flags and error reference logs)*.

**Why:** Quick visibility into payout status and issues.

**Data Source:** `PayoutTransaction` sorted by `createdAt`.

---

#### 2.2 Payout Monitoring & Resolution
- [x] **Pending Payouts:** List of initiated/pending payouts *(Completed — implemented under the dynamic `/payouts` Pending Payouts tab)*.
- [x] **Failed Payouts:** List with failure reasons and retry status *(Completed — implemented under `/payouts` Payout History tab and details page)*.
- [x] **Manual Resolution Queue:** Payouts flagged for manual intervention *(Completed for payouts — resolved via UPI QR / UTR recording flow)*.

**Why:** Payout issues directly impact barber trust and business operations.

**Data Source:** `PayoutTransaction` with status filters.

**Actions:**
- [x] **Retry Failed Payout:** Trigger manual retry *(Completed — integrated on Payout Details page)*.
- [x] **View Payout Details:** Deep dive into payout records *(Completed — dedicated dynamic layout route `/payouts/[payoutId]`)*.

---

### 3. User & Shop Management (READ-ONLY DIRECTORIES)

**Purpose:** Provide dedicated directory views for searching and viewing user accounts and business profiles.

#### 3.1 Customer Directory Page (Dedicated Route: `/customers`)
- **Grid / Table Listing:** A paginated table displaying all customers.
- **Metadata Fields:** Customer ID, Full Name, Contact Info (Phone/Email), Registration Date, Total Bookings Count, and Account status (`isActive`).
- **Controls & Filters:** 
  - Search bar to look up customers by phone number, email, or name.
  - Active/Inactive status filter.
- **Status Indicator:** Visual status pills (Active/Inactive) reflecting the user's database state. No edit or deactivation actions from the dashboard.

**Why:** Handle customer queries and review registration details.

**Data Source:** Paginated list from `User` (filtered by `role = 'CUSTOMER'`) joined with `Customer` profile properties and `Booking` summaries.

---

#### 3.2 Barber & Shop Directory Page (Dedicated Route: `/barbers`)
- **Grid / Table Listing:** A paginated table displaying all barbers joined with their corresponding shop data.
- **Metadata Fields:** Barber User ID, Shop ID, Barber Name, Shop Name, UPI / Payout ID, Address / Location, Rating Summary, and Operating state.
- **Controls & Filters:**
  - Search bar to filter by shop name, barber name, or UPI/payout identifier.
  - Operating state filters.
- **Status Indicator:** Visual status pills (Open/Closed/Active/Inactive). No operational toggle actions from the dashboard.
- **Shop Venue Details Route:** Rather than a separate shop detail view, physical shop profiles, specifications, operating timings, coordinates, and subscription plans are consolidated directly into the dynamic Barber profile detail view `/barbers/[id]`.

**Why:** Verify payout settings and review business details.

**Data Source:** Paginated list from `User` (filtered by `role = 'BARBER'`) joined with their corresponding `Shop` document.

---

#### 3.3 Booking Lookup Page
- **Search by:** Booking ID, customer phone, shop name.
- **View:** Full booking details, payment status, payout status.
- **Action:** View only.

**Why:** Customer support and dispute resolution.

**Data Source:** `Booking` model with populated references.

---

### 4. Financial Operations (CRITICAL ACTIONS ONLY)

**Purpose:** Resolve payout issues that cannot be auto-resolved.

#### 4.1 Refund View (READ-ONLY)
- **View:** All refunds (pending, completed, failed) associated with payments. No trigger buttons or manual action controls.

**Why:** Monitor refund status for user inquiries.

**Data Source:** `PaymentTransaction` with refund properties.

---

#### 4.2 Payout Management
- [x] **View:** All payouts with status and failure reasons *(Completed — built dynamic `/payouts` list and `/payouts/[payoutId]` views)*.
- [x] **Action:** Retry failed payout *(Completed — integrated on Payout Details page)*.
- [x] **Action:** Record Manual Payout Settlement *(Completed — built UPI QR generator, UPI app deep-linking, and reference UTR confirmation form)*.

**Why:** Ensure barbers receive their earnings despite gateway failures.

**Existing Route:** `POST /api/payouts/:payoutId/retry` (ADMIN authorized).

---

#### 4.3 Subscription View (READ-ONLY)
- **View:** Active subscription levels and subscription statuses for all barbers. No override or cancellation actions.

**Why:** Monitor subscription tiers.

**Data Source:** `Subscription` and `SubscriptionTransaction` models.

---

## Feature Justification Summary

| Feature | Impact | Complexity | Status | Justification |
|---------|--------|------------|--------|---------------|
| Platform Overview | High | Low | [x] Completed | Deployed with all KPI cards on the dashboard. |
| Booking Analytics | High | Low | [x] Completed | Booking status distribution and top shops tables built on `/overview`. |
| Financial Analytics | High | Medium | [x] Completed | Payment success, platform fees, and payouts integrated. |
| Recent Payouts Feed | High | Low | [x] Completed | Real-time payout visibility implemented under payouts history tabs. |
| Payout Monitoring | High | Low | [x] Completed | Deployed on `/payouts` and `/payouts/[payoutId]`. |
| User/Shop Lookup | Medium | Low | [x] Completed | Consolidated directories built at `/customers` and `/barbers` (incorporating shops). |
| Refund View | Medium | Low | [x] Completed | Read-only listing of refunds built at `/refunds`. |
| Payout Retry & Settlement | High | Low | [x] Completed | UTR manual recording and QR code modal integrated on payout details. |
| Subscription View | Medium | Low | [x] Completed | Deployed at `/subscriptions`. |

---

## What is NOT Included (Intentionally)

- **Content Management:** Shops manage their own services, photos, employees.
- **Booking Creation/Editing:** Admin does not create or edit bookings.
- **Rating Moderation:** No rating deletion (trust-based system).
- **Detailed Logs Viewer:** Use external logging tools (e.g., CloudWatch, Datadog).
- **User Messaging:** No in-app messaging system.
- **Advanced Reporting / Custom Charts:** Export to CSV for external analysis; use simple KPI cards.
- **Webhook Reconciliation / System Health UI:** APM-level system monitoring is handled by server logs and hosting providers.
- **Admin Action Audit UI:** No audit log interfaces; audit records are kept directly in database logs.
- **Admin User Creation UI:** Dashboard admin creation/promotion is omitted. Admin user setup is performed via CLI scripts.
- **Dashboard Action Toggles:** No deactivation triggers, manual refunds, or subscription overrides from the dashboard.

---

## Implementation Notes

### Existing Infrastructure
- **ADMIN role exists** in `User` model and authorization middleware.
- **Payout retry endpoint** already supports ADMIN role.
- **Aggregation queries** exist in repositories for bookings and earnings.

### Security
- All admin routes MUST use `authenticate` + `authorize(ROLES.ADMIN)` middleware.
- Sensitive data (UPI IDs, bank accounts) should be masked in responses.

---

## Prioritized Future Implementation (Important Next Steps)

All core operational capabilities identified in this specification have been successfully built and released:
1. **User & Shop Directory Views**: Searchable directories deployed at `/customers` and `/barbers`.
2. **Business Metrics on Operations Overview**: Integrated on `/overview`.

---

## Future Scope (Not Now)

- **Dispute Resolution Workflow:** Structured process for handling customer complaints.
- **Automated Alerts:** Email/SMS notifications for critical system failures.
- **Advanced Fraud Detection:** ML-based anomaly detection.
- **Custom Report Builder:** Dynamic query interface for analytics.
- **Admin Action Toggles & Moderation Tools:** Active dashboard tools to deactivate/activate accounts, manually trigger refunds, or override subscriptions.
- **Dashboard Admin Promotions:** Visual settings flow to invite or create new admins.

---

## Success Criteria

The admin dashboard is successful if:
1. Admin can identify and resolve payout issues within 5 minutes.
2. Platform health can be assessed at a glance (< 30 seconds).
3. User/shop support queries can be resolved without database access.
4. Financial metrics are accurate and up-to-date.

---

## Conclusion

This specification defines a **minimal but complete** admin dashboard focused on:
- **Monitoring:** Real-time visibility into payout health and transaction metrics.
- **Analytics:** Basic business insights for overview decision-making.
- **Control:** Read-only queries with limited actions for critical payout resolution.
