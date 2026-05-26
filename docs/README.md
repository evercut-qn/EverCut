# EverCut Backend Documentation

> **Last Updated:** May 3, 2026  
> **Project:** EverCut — Salon & Barber Booking Platform API

---

## 📚 Documentation Index

This directory contains comprehensive documentation for the EverCut backend system. Documents are organized by category for easy navigation.

---

## 🏗️ Architecture & Planning

Core architectural documents and implementation plans.

| Document | Description | Status |
|----------|-------------|--------|
| [IMPLEMENTATION-PLAN.md](./architecture/IMPLEMENTATION-PLAN.md) | Complete backend refactoring plan with layered architecture design | ✅ Reference |

---

## 🔄 Developer Flow Guides

Detailed, implementation-ready guides for Flutter developers and backend testing.

| Document | Description | Status |
|----------|-------------|--------|
| [FLUTTER-BOOKING-PAYMENT-FLOW.md](./flows/FLUTTER-BOOKING-PAYMENT-FLOW.md) | Complete Flutter implementation guide for booking + native PhonePe SDK payment flow | ✅ Production Ready |
| [flutter-notification-integration-guide.md](./flows/flutter-notification-integration-guide.md) | Flutter integration guide for FCM token handling and foreground/background/terminated notification handling | ✅ Production Ready |
| [POSTMAN-BOOKING-PAYMENT-GUIDE.md](./testing/POSTMAN-BOOKING-PAYMENT-GUIDE.md) | Postman testing guide for booking & payment flow (auth → payment → barber approval) | ✅ Production Ready |
| [MANUAL-PAYOUT-POSTMAN-TESTING-GUIDE.md](./testing/MANUAL-PAYOUT-POSTMAN-TESTING-GUIDE.md) | Complete Postman testing guide for admin manual payouts and Cashfree compatibility | ✅ Production Ready |
| [notification-system-postman-guide.md](./testing/notification-system-postman-guide.md) | Postman-only notification backend testing guide | ✅ Production Ready |

> **Note:** The `docs/flows/` directory contains detailed, step-by-step implementation guides for developers. The `docs/testing/` directory contains Postman API testing documentation.

---

## 🔐 Security & Audits

Security assessments, vulnerability reports, and audit findings.

| Document | Description | Status |
|----------|-------------|--------|
| [SECURITY-AUTH-AUDIT.md](./security/SECURITY-AUTH-AUDIT.md) | Authentication & authorization security audit | ✅ Completed |
| [SECURITY-CODE-AUDIT.md](./security/SECURITY-CODE-AUDIT.md) | Comprehensive security & code quality audit | ✅ Completed |
| [SECURITY_AUDIT.md](./security/SECURITY_AUDIT.md) | General security audit report | ✅ Completed |

---

## 🔧 Feature Implementation

Detailed guides for implementing specific features.

### Authentication & Authorization

| Document | Description | Status |
|----------|-------------|--------|
| [GOOGLE-OAUTH-UNIVERSAL-AUTH.MD](./features/auth/GOOGLE-OAUTH-UNIVERSAL-AUTH.MD) | Google OAuth + OTP universal authentication architecture | 📋 Implementation Guide |

### MSG91 Integration

| Document | Description | Status |
|----------|-------------|--------|
| [MSG91-COMPLETE-GUIDE.md](./features/msg91/MSG91-COMPLETE-GUIDE.md) | Complete MSG91 OTP integration guide | 📋 Implementation Guide |
| [MSG91-INTEGRATION-GUIDE.md](./features/msg91/MSG91-INTEGRATION-GUIDE.md) | MSG91 OTP integration implementation guide | 📋 Implementation Guide |
| [MSG91-EXTERNAL-SETUP-GUIDE.md](./features/msg91/MSG91-EXTERNAL-SETUP-GUIDE.md) | MSG91 account setup and DLT registration | 📋 Setup Guide |
| [MSG91-POSTMAN-UPDATES-GUIDE.md](./features/msg91/MSG91-POSTMAN-UPDATES-GUIDE.md) | Postman collection updates for MSG91 | 📋 Testing Guide |

### Booking & Payment System

| Document | Description | Status |
|----------|-------------|--------|
| [BOOKING-SYSTEM-GUIDE.md](./features/bookings/BOOKING-SYSTEM-GUIDE.md) | Complete booking system with native PhonePe SDK payment flow | ✅ Production Ready |
| [FLUTTER-BOOKING-PAYMENT-FLOW.md](./flows/FLUTTER-BOOKING-PAYMENT-FLOW.md) | Flutter implementation guide for native SDK payments | ✅ Production Ready |
| [BOOKING-DATE-RESTRICTION-UPDATE.md](./features/bookings/BOOKING-DATE-RESTRICTION-UPDATE.md) | Booking date window restrictions | 📋 Implementation Guide |
| [README.md](./features/bookings/README.md) | Booking system quick reference | ✅ Reference |

### Employee Management

| Document | Description | Status |
|----------|-------------|--------|
| [EMPLOYEE-DETAIL-ENDPOINT.md](./features/employees/EMPLOYEE-DETAIL-ENDPOINT.md) | Employee detail endpoint implementation | ✅ Production Ready |

### Payment Integration

| Document | Description | Status |
|----------|-------------|--------|
| [PAYMENT-MODES-CONFIGURATION.md](./features/payments/PAYMENT-MODES-CONFIGURATION.md) | Payment modes configuration using PhonePe V2 schema (official docs) | ✅ Production Ready |
| [PHONEPE-SDK-WEBHOOK-ISSUE-SOLUTION.md](./features/payments/PHONEPE-SDK-WEBHOOK-ISSUE-SOLUTION.md) | PhonePe SDK webhook not arriving - polling solution | ✅ Production Ready |
| [PHONEPE-PG-FLUTTER-NODEJS.md](./research/PHONEPE-PG-FLUTTER-NODEJS.md) | **Native PhonePe Flutter SDK integration** (source of truth) | ✅ Production Ready |
| [POSTMAN-BOOKING-PAYMENT-GUIDE.md](./testing/POSTMAN-BOOKING-PAYMENT-GUIDE.md) | Postman testing guide for booking & payment flow | ✅ Production Ready |
| [PAYMENT-GATEWAY-IMPLEMENTATION-GUIDE.md](./features/payments/PAYMENT-GATEWAY-IMPLEMENTATION-GUIDE.md) | PhonePe payment gateway implementation details | 📋 Implementation Guide |
| [PAYMENT-GATEWAY-RESEARCH-GUIDE.md](./features/payments/PAYMENT-GATEWAY-RESEARCH-GUIDE.md) | Payment gateway research and comparison | 📊 Research |
| [old-method/](./features/payments/old-method/) | Archived web redirect/payment-link documentation | 📦 Archived |

> **Note:** EverCut migrated from web redirect payment flow to native PhonePe Flutter SDK in April 2026. Old redirect-based documentation is archived in `features/payments/old-method/` for historical reference only.

### Payout System

| Document | Description | Status |
|----------|-------------|--------|
| [MANUAL-PAYOUT-IMPLEMENTATION-GUIDE.md](./features/payouts/MANUAL-PAYOUT-IMPLEMENTATION-GUIDE.md) | Manual payout redesign architecture, RESTful API design, and implementation guide | 📋 Implementation Guide |
| [MANUAL-PAYOUT-POSTMAN-TESTING-GUIDE.md](./testing/MANUAL-PAYOUT-POSTMAN-TESTING-GUIDE.md) | Postman guide for manual payout lifecycle, auth, edge cases, and compatibility checks | ✅ Production Ready |

### Notifications

| Document | Description | Status |
|----------|-------------|--------|
| [notification-system-overview.md](./features/notifications/notification-system-overview.md) | Functional overview of hybrid FCM + REST notification behavior | ✅ Production Ready |
| [flutter-notification-integration-guide.md](./flows/flutter-notification-integration-guide.md) | Flutter client integration guide for FCM and REST notification APIs | ✅ Production Ready |
| [notification-system-postman-guide.md](./testing/notification-system-postman-guide.md) | Postman-only backend notification testing guide | ✅ Production Ready |

### Subscription System

| Document | Description | Status |
|----------|-------------|--------|
| [EVERCUT-SUBSCRIPTION-DEVELOPER-DOCUMENTATION.md](./features/subscription/EVERCUT-SUBSCRIPTION-DEVELOPER-DOCUMENTATION.md) | Business requirements and plan specifications | ✅ Reference |
| [SUBSCRIPTION-EXTERNAL-SETUP-DOCUMENTATION.md](./features/subscription/SUBSCRIPTION-EXTERNAL-SETUP-DOCUMENTATION.md) | Razorpay dashboard setup, plan creation, UPI AutoPay mandates | 📋 Setup Guide |
| [SUBSCRIPTION-INTERNAL-IMPLEMENTATION-DOCUMENTATION.md](./features/subscription/SUBSCRIPTION-INTERNAL-IMPLEMENTATION-DOCUMENTATION.md) | Complete technical architecture and implementation blueprint | 📋 Implementation Guide |

### Webhook Development

| Document | Description | Status |
|----------|-------------|--------|
| [HOOKDECK-DAILY-WORKFLOW.md](./features/webhooks/HOOKDECK-DAILY-WORKFLOW.md) | Local webhook development workflow (PhonePe, Cashfree, Razorpay) using Hookdeck | 📋 Development Guide |

---

## 🐛 Bug Fixes & Reports

Reports documenting issues found and fixes applied.

| Document | Description | Status |
|----------|-------------|--------|
| [BACKEND-INTEGRITY-FIXES-REPORT.md](./reports/BACKEND-INTEGRITY-FIXES-REPORT.md) | Backend integrity issues and fixes applied | ✅ Completed |
| [E2E-BACKEND-VERIFICATION-REPORT.md](./reports/E2E-BACKEND-VERIFICATION-REPORT.md) | Full authenticated backend verification and follow-up fixes | ✅ Completed |
| [EMPLOYEE-AVAILABILITY-STATUS-IMPLEMENTATION-REPORT.md](./reports/EMPLOYEE-AVAILABILITY-STATUS-IMPLEMENTATION-REPORT.md) | Employee availability status toggle API implementation | ✅ Completed |
| [MSG91-Revision-Improvements-Report.md](./reports/MSG91-Revision-Improvements-Report.md) | MSG91 integration improvements report | ✅ Completed |
| [PHOTO-GALLERY-FIXES-REPORT.md](./reports/PHOTO-GALLERY-FIXES-REPORT.md) | Photo gallery backend fixes | ✅ Completed |
| [REQUEST-VALIDATION-QUERY-FIX-REPORT.md](./reports/REQUEST-VALIDATION-QUERY-FIX-REPORT.md) | Express 5 query-validation runtime fix report | ✅ Completed |
| [SERVICE-CATALOG-FIXES-REPORT.md](./reports/SERVICE-CATALOG-FIXES-REPORT.md) | Service catalog backend fixes | ✅ Completed |
| [2026-05-26-MANUAL-PAYOUT-IMPLEMENTATION-REPORT.md](./reports/2026-05-26-MANUAL-PAYOUT-IMPLEMENTATION-REPORT.md) | Manual payout implementation, validation, and compatibility report | ✅ Completed |
| [notification-system-report.md](./reports/notification-system-report.md) | Hybrid FCM + REST notification system implementation report | ✅ Completed |

---

## 🔬 Research & Analysis

Research documents for technology decisions and comparisons.

| Document | Description | Status |
|----------|-------------|--------|
| [OBJECT-STORAGE-RESEARCH.MD](./research/OBJECT-STORAGE-RESEARCH.MD) | Object storage platform comparison (Cloudflare R2, S3, B2, etc.) | 📊 Research |
| [OTP-AUTH-RESEARCH.md](./research/OTP-AUTH-RESEARCH.md) | Firebase Auth vs MSG91 cost and feature analysis | 📊 Research |

---

## 📂 Directory Structure

```
docs/
├── README.md                          # This file
├── flows/                             # Developer implementation guides
│   ├── FLUTTER-BOOKING-PAYMENT-FLOW.md
│   └── flutter-notification-integration-guide.md
├── testing/                           # Postman API testing guides
│   ├── POSTMAN-BOOKING-PAYMENT-GUIDE.md
│   ├── MANUAL-PAYOUT-POSTMAN-TESTING-GUIDE.md
│   └── notification-system-postman-guide.md
├── architecture/                      # Architecture & planning docs
│   └── IMPLEMENTATION-PLAN.md
├── security/                          # Security audits & reports
│   ├── SECURITY-AUTH-AUDIT.md
│   ├── SECURITY-CODE-AUDIT.md
│   └── SECURITY_AUDIT.md
├── features/                          # Feature implementation guides
│   ├── auth/
│   │   └── GOOGLE-OAUTH-UNIVERSAL-AUTH.MD
│   ├── bookings/
│   │   ├── BOOKING-SYSTEM-GUIDE.md
│   │   ├── BOOKING-DATE-RESTRICTION-UPDATE.md
│   │   └── README.md
│   ├── payments/
│   │   └── old-method/                # Archived redirect flow docs
│   ├── payouts/
│   │   ├── MANUAL-PAYOUT-IMPLEMENTATION-GUIDE.md
│   │   └── parts/                     # Source documents
│   ├── subscription/
│   │   ├── EVERCUT-SUBSCRIPTION-DEVELOPER-DOCUMENTATION.md
│   │   ├── SUBSCRIPTION-EXTERNAL-SETUP-DOCUMENTATION.md
│   │   └── SUBSCRIPTION-INTERNAL-IMPLEMENTATION-DOCUMENTATION.md
│   ├── webhooks/
│   │   └── HOOKDECK-DAILY-WORKFLOW.md  # PhonePe + Cashfree + Razorpay
│   ├── notifications/
│   │   └── notification-system-overview.md
│   └── msg91/
│       ├── MSG91-COMPLETE-GUIDE.md
│       ├── MSG91-INTEGRATION-GUIDE.md
│       ├── MSG91-EXTERNAL-SETUP-GUIDE.md
│       └── MSG91-POSTMAN-UPDATES-GUIDE.md
├── reports/                           # Bug fixes & improvement reports
│   ├── BACKEND-INTEGRITY-FIXES-REPORT.md
│   ├── E2E-BACKEND-VERIFICATION-REPORT.md
│   ├── MSG91-Revision-Improvements-Report.md
│   ├── PHOTO-GALLERY-FIXES-REPORT.md
│   ├── REQUEST-VALIDATION-QUERY-FIX-REPORT.md
│   ├── notification-system-report.md
│   └── SERVICE-CATALOG-FIXES-REPORT.md
├── research/                          # Research & analysis docs
│   ├── OBJECT-STORAGE-RESEARCH.MD
│   ├── OTP-AUTH-RESEARCH.md
│   ├── PAYOUT-API-RESEARCH.md
│   ├── UPI-API-RESEARCH.md
│   ├── ZOHO-VS-PHONEPE-PG-COMPARISON.md
│   └── PHONEPE-PG-FLUTTER-NODEJS.md   # Native SDK integration research
└── testing/                           # Postman API testing guides
    └── POSTMAN-BOOKING-PAYMENT-GUIDE.md
```

---

## 🎯 Quick Start Guides

### For New Developers

1. Start with [IMPLEMENTATION-PLAN.md](./architecture/IMPLEMENTATION-PLAN.md) to understand the architecture
2. Review [SECURITY-AUTH-AUDIT.md](./security/SECURITY-AUTH-AUDIT.md) for security best practices
3. Follow [MSG91-INTEGRATION-GUIDE.md](./features/msg91/MSG91-INTEGRATION-GUIDE.md) for authentication setup

### For Flutter Developers

1. **Booking + Payment Flow:** [FLUTTER-BOOKING-PAYMENT-FLOW.md](./flows/FLUTTER-BOOKING-PAYMENT-FLOW.md) — Complete implementation guide with native PhonePe SDK
2. **Notifications:** [flutter-notification-integration-guide.md](./flows/flutter-notification-integration-guide.md) — FCM setup, token handling, and foreground/background/terminated handling
3. **Backend Contract:** [BOOKING-SYSTEM-GUIDE.md](./features/bookings/BOOKING-SYSTEM-GUIDE.md) — API contracts and flow details
4. **Native SDK Source:** [PHONEPE-PG-FLUTTER-NODEJS.md](./research/PHONEPE-PG-FLUTTER-NODEJS.md) — PhonePe integration reference

### For Backend Testing

1. **Booking & Payment Testing:** [POSTMAN-BOOKING-PAYMENT-GUIDE.md](./testing/POSTMAN-BOOKING-PAYMENT-GUIDE.md) — Test booking & payment flow from auth to barber approval
2. **Manual Payout Testing:** [MANUAL-PAYOUT-POSTMAN-TESTING-GUIDE.md](./testing/MANUAL-PAYOUT-POSTMAN-TESTING-GUIDE.md) — Test admin auth, manual payout lifecycle, concurrency, and Cashfree compatibility
3. **Notification Testing:** [notification-system-postman-guide.md](./testing/notification-system-postman-guide.md) — Test FCM token management, notification history, unread count, and read tracking
4. **Postman Collections:** `server/postman-collections/` — Ready-to-use API test collections with auto-generated signatures

### For Security Review

1. [SECURITY-AUTH-AUDIT.md](./security/SECURITY-AUTH-AUDIT.md) — Authentication & authorization audit
2. [SECURITY-CODE-AUDIT.md](./security/SECURITY-CODE-AUDIT.md) — Code quality & security issues
3. [SECURITY_AUDIT.md](./security/SECURITY_AUDIT.md) — General security assessment

### For Feature Implementation

1. **Authentication:** [GOOGLE-OAUTH-UNIVERSAL-AUTH.MD](./features/auth/GOOGLE-OAUTH-UNIVERSAL-AUTH.MD)
2. **OTP/SMS:** [MSG91-INTEGRATION-GUIDE.md](./features/msg91/MSG91-INTEGRATION-GUIDE.md)
3. **Storage:** [OBJECT-STORAGE-RESEARCH.MD](./research/OBJECT-STORAGE-RESEARCH.MD)
4. **Payouts:** [MANUAL-PAYOUT-IMPLEMENTATION-GUIDE.md](./features/payouts/MANUAL-PAYOUT-IMPLEMENTATION-GUIDE.md)

---

## 📊 Document Status Legend

| Icon | Status | Description |
|------|--------|-------------|
| ✅ | Completed | Implementation finished, document archived |
| 📋 | Implementation Guide | Active guide for implementing features |
| 📊 | Research | Analysis and comparison documents |
| 🤖 | Reference | AI prompts and development workflows |

---

## 🔄 Document Maintenance

- All documents use Markdown format
- Keep this README updated when adding new documents
- Archive completed implementation guides to `reports/` directory
- Use consistent naming: `FEATURE-TYPE-NAME.md`

---

## 📝 Contributing

When adding new documentation:

1. Place in appropriate category directory
2. Update this README with entry in relevant section
3. Use clear, descriptive filenames
4. Include status and last updated date in document header
5. Follow existing document structure patterns

---

*For questions or clarifications, refer to the specific document or contact the development team.*
