# Admin Dashboard Specification

## Overview

This document defines a **minimal, high-impact** admin dashboard for the EverCut platform. The specification is derived from the existing backend codebase and focuses on essential monitoring, analytics, and control capabilities.

**Design Principle:** Admin is an **observer and resolver**, not a super-user. The dashboard provides visibility into system health and business metrics, with minimal intervention capabilities limited to critical issues.

---

## Admin Role Definition

**What Admin IS:**
- System health monitor
- Business analytics viewer
- Issue resolver (payments, payouts, disputes)
- Platform oversight authority

**What Admin IS NOT:**
- A replacement for customer/barber workflows
- A content manager (shops manage their own data)
- A micromanager of individual bookings

---

## Core Feature Set

### 1. Analytics Dashboard (READ-ONLY)

**Purpose:** Provide high-level business insights and platform health metrics.

#### 1.1 Platform Overview
- **Total Users:** Count by role (customers, barbers, active/inactive)
- **Total Shops:** Active vs inactive shops
- **Total Bookings:** All-time, monthly, weekly breakdown
- **Revenue Metrics:** Total platform revenue, monthly trends
- **Growth Trends:** User signups, booking volume over time

**Why:** Essential for understanding platform health and growth trajectory.

**Data Source:** Aggregations from `User`, `Shop`, `Booking`, `PaymentTransaction` models.

---

#### 1.2 Booking Analytics
- **Booking Status Distribution:** Pending, confirmed, completed, cancelled counts
- **Booking Trends:** Daily/weekly/monthly booking volume
- **Top Performing Shops:** By booking count and revenue
- **Cancellation Rate:** Percentage and trends
- **Average Booking Value:** Platform-wide and per-shop

**Why:** Core business metric for platform success.

**Data Source:** `Booking` model with status aggregations.

---

#### 1.3 Financial Analytics
- **Payment Success Rate:** Completed vs failed payments
- **Total Revenue:** Sum of successful payments
- **Platform Fees Collected:** From completed bookings
- **Payout Status:** Pending, completed, failed payout counts
- **Refund Metrics:** Total refunds, refund rate, manual resolution count

**Why:** Critical for financial health monitoring and identifying payment/payout issues.

**Data Source:** `PaymentTransaction`, `PayoutTransaction`, `Booking` models.

---

#### 1.4 User Activity
- **Active Users:** Daily/weekly/monthly active customers and barbers
- **New Registrations:** Signup trends
- **Customer Retention:** Repeat booking rate
- **Shop Utilization:** Shops with recent bookings vs dormant shops

**Why:** Understand user engagement and identify inactive segments.

**Data Source:** `User`, `Customer`, `Shop`, `Booking` models.

---

### 2. Monitoring & Operations (READ-ONLY + LIMITED ACTIONS)

**Purpose:** Real-time visibility into system operations and critical issue resolution.

#### 2.1 Recent Activity Feed
- **Recent Bookings:** Last 50 bookings with status
- **Recent Payments:** Last 50 payment transactions with status
- **Recent Payouts:** Last 50 payout transactions with status
- **Failed Transactions:** Payments/payouts requiring attention

**Why:** Quick visibility into current system activity and issues.

**Data Source:** `Booking`, `PaymentTransaction`, `PayoutTransaction` sorted by `createdAt`.

---

#### 2.2 Payment & Payout Monitoring
- **Pending Payments:** List of initiated/pending payments older than 30 minutes
- **Failed Payments:** List with error codes and reasons
- **Pending Payouts:** List of initiated/pending payouts
- **Failed Payouts:** List with failure reasons and retry status
- **Manual Resolution Queue:** Refunds and payouts flagged for manual intervention

**Why:** Payment and payout issues directly impact user trust and business operations.

**Data Source:** `PaymentTransaction`, `PayoutTransaction` with status filters.

**Actions:**
- **Retry Failed Payout:** Trigger manual retry (already exists in codebase)
- **View Transaction Details:** Deep dive into payment/payout records

---

#### 2.3 System Health
- **Webhook Status:** Recent webhook events and processing status
- **Cron Job Status:** Last run times for payment poller, payout batch, payout poller
- **Error Logs:** Recent critical errors (if logging infrastructure exists)

**Why:** Proactive identification of system failures.

**Data Source:** `PaymentTransaction.webhookProcessed`, cron job logs (if available).

---

### 3. User & Shop Management (MINIMAL CONTROL)

**Purpose:** Handle critical user/shop issues without micromanaging.

#### 3.1 User Lookup
- **Search by:** Phone number, email, user ID
- **View:** User profile, role, account status, registration date
- **Action:** Deactivate/reactivate user account (sets `isActive` flag)

**Why:** Handle abuse, fraud, or user-requested account actions.

**Data Source:** `User`, `Customer`, `Shop` models.

---

#### 3.2 Shop Lookup
- **Search by:** Shop name, owner ID, shop ID
- **View:** Shop details, owner info, booking stats, ratings
- **Action:** Deactivate/reactivate shop (sets `isOpen` flag)

**Why:** Handle policy violations or shop-requested temporary closures.

**Data Source:** `Shop`, `Booking`, `Rating` models.

---

#### 3.3 Booking Lookup
- **Search by:** Booking ID, customer phone, shop name
- **View:** Full booking details, payment status, payout status
- **Action:** View only (no status changes unless payment/payout related)

**Why:** Customer support and dispute resolution.

**Data Source:** `Booking` model with populated references.

---

### 4. Financial Operations (CRITICAL ACTIONS ONLY)

**Purpose:** Resolve payment and payout issues that cannot be auto-resolved.

#### 4.1 Refund Management
- **View:** All refunds (pending, completed, failed)
- **Action:** Initiate manual refund for completed bookings (already exists for ADMIN role)

**Why:** Handle customer disputes and cancellation edge cases.

**Existing Route:** `POST /api/v1/bookings/:id/refunds` (ADMIN authorized)

---

#### 4.2 Payout Management
- **View:** All payouts with status and failure reasons
- **Action:** Retry failed payout (already exists for ADMIN role)

**Why:** Ensure barbers receive their earnings despite gateway failures.

**Existing Route:** `POST /api/payouts/:payoutId/retry` (ADMIN authorized)

---

## Feature Justification Summary

| Feature | Impact | Complexity | Justification |
|---------|--------|------------|---------------|
| Platform Overview | High | Low | Essential business metrics |
| Booking Analytics | High | Low | Core business KPI |
| Financial Analytics | High | Medium | Revenue and payment health |
| Recent Activity Feed | High | Low | Real-time system visibility |
| Payment/Payout Monitoring | High | Low | Critical for operations |
| User/Shop Lookup | Medium | Low | Support and moderation |
| Refund Management | High | Low | Already implemented |
| Payout Retry | High | Low | Already implemented |

---

## What is NOT Included (Intentionally)

- **Content Management:** Shops manage their own services, photos, employees
- **Booking Creation/Editing:** Admin does not create bookings
- **Rating Moderation:** No rating deletion (trust-based system)
- **Detailed Logs Viewer:** Use external logging tools (e.g., CloudWatch, Datadog)
- **User Messaging:** No in-app messaging system
- **Advanced Reporting:** Export to CSV for external analysis

**Reason:** These features are either low-impact, high-complexity, or better handled by existing tools.

---

## Implementation Notes

### Existing Infrastructure
- **ADMIN role exists** in `User` model and authorization middleware
- **Refund endpoint** already supports ADMIN role
- **Payout retry endpoint** already supports ADMIN role
- **Aggregation queries** exist in repositories for bookings and earnings

### Required New Endpoints
1. `GET /api/admin/analytics/overview` - Platform-wide metrics
2. `GET /api/admin/analytics/bookings` - Booking analytics
3. `GET /api/admin/analytics/financial` - Payment/payout metrics
4. `GET /api/admin/monitoring/recent-activity` - Recent transactions
5. `GET /api/admin/monitoring/failed-transactions` - Issues requiring attention
6. `GET /api/admin/users/search` - User lookup
7. `GET /api/admin/shops/search` - Shop lookup
8. `GET /api/admin/bookings/search` - Booking lookup
9. `PUT /api/admin/users/:userId/status` - Activate/deactivate user
10. `PUT /api/admin/shops/:shopId/status` - Activate/deactivate shop

### Security
- All admin routes MUST use `authenticate` + `authorize(ROLES.ADMIN)` middleware
- Sensitive data (UPI IDs, bank accounts) should be masked in responses
- Admin actions MUST be logged for audit trail

---

## Future Scope (Not Now)

- **Dispute Resolution Workflow:** Structured process for handling customer complaints
- **Automated Alerts:** Email/SMS notifications for critical system failures
- **Advanced Fraud Detection:** ML-based anomaly detection
- **Custom Report Builder:** Dynamic query interface for analytics

**Reason:** These are valuable but not essential for MVP admin dashboard. Implement only when current features prove insufficient.

---

## Success Criteria

The admin dashboard is successful if:
1. Admin can identify and resolve payment/payout issues within 5 minutes
2. Platform health can be assessed at a glance (< 30 seconds)
3. User/shop support queries can be resolved without database access
4. Financial metrics are accurate and up-to-date

---

## Conclusion

This specification defines a **minimal but complete** admin dashboard focused on:
- **Monitoring:** Real-time visibility into system health
- **Analytics:** Business insights for decision-making
- **Control:** Limited actions for critical issue resolution

Every feature is justified by existing system capabilities and real operational needs. No feature bloat, no hypothetical use cases.
