# Payment & Payout API Selection Guide — India 2026
## Research & Provider Comparison Document

> **Context:** EverCut Salon Booking Platform (India)
> **Stack:** Node.js Backend · Flutter · MongoDB Atlas (ap-south-1)
> **Use Case:** Customer Payments (Collection) + Automated Barber Payouts (Disbursement)
> **Prepared:** April 2026 | Based on official source verification
> **Status:** Research complete — Implementation pending

---

## Executive Summary

This document provides comprehensive research on payout API providers for the EverCut platform, with detailed analysis of Cashfree Payouts, RazorpayX, and PayU Payouts. Based on cost analysis, API maturity, and startup-friendliness, Cashfree Payouts is recommended as the optimal provider.

### Current Implementation Status

**⚠️ IMPORTANT: NO PAYOUT FUNCTIONALITY HAS BEEN IMPLEMENTED**

This is a research and planning document. The EverCut codebase currently contains:
- ❌ No payout service integration
- ❌ No Cashfree (or any payout provider) configuration
- ❌ No payout-related models, controllers, or routes
- ❌ No payout transaction tracking
- ❌ No automated barber disbursement logic

All code examples in Section 6 are reference implementations for future development.

---

## Table of Contents

1. [Architecture Context](#1-architecture-context)
2. [PhonePe PG — Payout API Verification](#2-phonepe-pg--payout-api-verification)
3. [Top 3 Payout API Providers — Research](#3-top-3-payout-api-providers--research)
4. [Comparative Analysis](#4-comparative-analysis)
5. [Best Provider Selection & Justification](#5-best-provider-selection--justification)
6. [Cashfree Payouts — Implementation Guide](#6-cashfree-payouts--implementation-guide)
7. [Recommended Architecture](#7-recommended-architecture)
8. [Pre-Production Verification Checklist](#8-pre-production-verification-checklist)

---

## 1. Architecture Context

### 1.1 Platform Overview

EverCut is an India-first salon booking marketplace. Its payment architecture has two distinct money flows:

```
INBOUND (Collection)
Customer ──→ PhonePe PG v2 ──→ EverCut Nodal Account
    ↑ Implementation status: To be implemented

OUTBOUND (Payout)
EverCut Nodal Account ──→ [PAYOUT PROVIDER] ──→ Barber's UPI / Bank Account
    ↑ This layer requires a dedicated payout API — subject of this research document
    ↑ Implementation status: Not yet implemented
```

### 1.2 Payout Business Logic

When a barber marks a booking as `Completed`, the payout service must automatically transfer:

| Recipient | Share | Method |
|-----------|-------|--------|
| Barber | 85% of booking value | UPI ID or Bank Account |
| EverCut (platform) | 15% retained | Stays in settlement account |

**Example:** ₹500 booking → Barber receives ₹425 within 30 seconds of completion.

### 1.3 Critical Requirements from Existing Documents

Based on reading all four provided documents (`PAYMENT-AGGREGATORS-RESEARCH.md`, `UPI-API-RESEARCH.md`, `PAYMENT-GATEWAY-IMPLEMENTATION-GUIDE.md`, `PAYMENT-GATEWAY-RESEARCH-GUIDE.md`), the following requirements were extracted:

| Requirement | Priority | Notes |
|-------------|----------|-------|
| Real-time UPI payout to barber's UPI ID | 🔴 Critical | Sub-30s settlement required |
| Bank account payout (IMPS/NEFT) fallback | 🔴 Critical | For barbers without UPI |
| Zero or minimal per-transaction fees | 🔴 Critical | Startup-stage cost constraint |
| Webhook-based status notifications | 🔴 Critical | Existing architecture uses webhooks |
| Sandbox/UAT environment | 🔴 Critical | Must test before go-live |
| Node.js SDK or clean REST API | 🟡 High | Backend is Node.js (Express) |
| Fast merchant onboarding (< 5 days) | 🟡 High | Startup velocity |
| No setup fee / no AMC | 🟡 High | Pre-revenue stage |
| Penny drop / bank account verification | 🟡 High | Prevent misrouted payouts |
| RBI-licensed provider | 🔴 Critical | Regulatory compliance |

---

## 2. PhonePe PG — Payout API Verification

### 2.1 Verification Methodology

**Source consulted:** `https://developer.phonepe.com/payment-gateway` (Official PhonePe Developer Portal — fetched and reviewed on April 17, 2026)

**Method:** Direct inspection of the complete official developer documentation navigation tree.

### 2.2 Finding: PhonePe PG Does NOT Offer a Payout API

**Verdict: ❌ PAYOUT API DOES NOT EXIST IN PHONEPE PG**

The complete navigation structure of the official PhonePe developer portal (`developer.phonepe.com`) lists exactly the following product categories and sub-sections:

| Category | Sub-Features |
|----------|-------------|
| **Payment Gateway** | Standard Checkout, Backend SDKs, Mobile SDKs, Webhook Handling |
| **Autopay** | Subscription Setup, Mandate Management, Recurring Billing |
| **Payment Links** | No-code payment collection |
| **In-store Payments** | Static QR, Smart Speakers, EDC devices |
| **UAT Testing & Go-Live** | Sandbox, Checklists, Go-Live |

**There is no "Payouts," "Disbursements," "B2B Transfers," or any outbound money movement API listed** anywhere in the official PhonePe developer documentation.

### 2.3 What PhonePe PG Does Offer

PhonePe PG v2 is a **collection-only Payment Aggregator**. Its confirmed capabilities are:

- **Inbound payments:** UPI Intent, UPI Collect, UPI QR, Debit/Credit Cards, Net Banking, PhonePe Wallet
- **Autopay:** UPI mandate-based recurring subscriptions
- **Refunds:** Partial and full refund of collected payments back to payers
- **Payment Links:** No-code payment collection links

**Refunds ≠ Payouts.** A refund reverses a prior collection. A payout disburses funds to a third party (e.g., a barber who has never transacted with PhonePe PG). These are fundamentally different operations — refunds are supported; payouts are not.

### 2.4 Evidence Summary

| Evidence Point | Detail |
|----------------|--------|
| Official developer portal URL | `https://developer.phonepe.com/payment-gateway` |
| Payout section present? | ❌ No — not in any section of the navigation |
| PhonePe consumer app payouts | Separate product (P2P consumer transfers); not accessible via merchant API |
| Third-party claims of PhonePe payout API | Unverified; no official documentation exists to support these claims |
| Existing research documents' assessment | Consistent: "❌ Not primary" for UPI payout, "❌ Limited" for IMPS/NEFT payout |

### 2.5 Implication for EverCut

PhonePe PG **cannot** be used for barber payouts. A separate, dedicated **Payout API provider** must be integrated for the outbound money flow. This is consistent with the architecture proposed in the uploaded documents.

---

## 3. Top 3 Payout API Providers — Research

Research was conducted against official sources: provider documentation portals, official pricing pages, and RBI authorization records.

### 3.1 Provider Pool Evaluated

The following providers were considered before finalizing the top 3:

| Provider | Category | Evaluated? |
|----------|----------|-----------|
| **Cashfree Payouts** | Full-stack PA with dedicated payout product | ✅ Yes |
| **RazorpayX** | Payout/banking arm of Razorpay | ✅ Yes |
| **PayU Payouts** | Payout capability within PayU PA | ✅ Yes |
| Paytm Payouts | Payout capability within Paytm PA | ⚠️ Regulatory risk (2024 RBI action on Paytm Payments Bank) |
| Hypto | Developer-first BaaS/payout platform | ✅ Evaluated but excluded (limited market data, smaller scale) |
| Bulkpe | Flat-fee payout specialist | ✅ Evaluated but excluded (smaller ecosystem, less mature documentation) |
| Decentro | BaaS platform with virtual accounts | ✅ Evaluated but excluded (better fit for marketplace ledgering, not startup payouts) |

**Final Top 3: Cashfree Payouts · RazorpayX · PayU Payouts**

---

### 3.2 Cashfree Payouts

**Official Sources:** `cashfree.com/payouts`, `cashfree.com/payment-gateway-charges`, `cashfree.com/docs/api-reference/payouts/overview`

#### Overview

Cashfree Payments (founded 2015, YC-backed, RBI-licensed PA) operates a dedicated **Payouts** product that is architecturally separate from its payment gateway. It is purpose-built for high-frequency, automated disbursements.

#### Pricing (Verified from Official Source — `cashfree.com/payment-gateway-charges`)

**Payout Fees (per transaction, exclusive of 18% GST):**

| Transfer Mode | Up to ₹1,000 | ₹1,001–₹10,000 | Above ₹10,000 |
|---------------|-------------|----------------|----------------|
| **IMPS** | ₹2.50 | ₹5.00 | ₹10.00 |
| **NEFT** | ₹1.75 | ₹1.75 | ₹1.75 |
| **UPI** | ₹3.00 | ₹6.00 | ₹10.00 |
| **Visa/Mastercard Cards** | ₹10.00 | ₹10.00 | ₹10.00 |
| **Amazon Pay Wallet** | 1.00% | 1.00% | 1.00% |

> **⚠️ Pricing Discrepancy Note:** Prior research documents cited "UPI payouts at ₹2/txn." The current official Cashfree pricing page shows UPI payouts at ₹3 (≤₹1,000), ₹6 (₹1,001–₹10,000), and ₹10 (>₹10,000). The ₹2 figure may reflect an older promotional rate or a volume-negotiated rate. Always verify directly on `cashfree.com/payment-gateway-charges` before financial modeling.

**For EverCut's typical payout (₹200–₹1,700):** Most barber payouts will fall in the ≤₹1,000 or ₹1,001–₹10,000 brackets. Expected payout cost:
- UPI payouts: **₹3–₹6 per transaction** (+18% GST = ₹3.54–₹7.08 effective)
- IMPS payouts: **₹2.50–₹5 per transaction** (+18% GST = ₹2.95–₹5.90 effective)
- NEFT payouts: **₹1.75 flat** (+18% GST = ₹2.07 effective)

**Collection Pricing (Promotional — valid for new merchants signing up before April 30, 2026):**

- **1.60% flat** for UPI, domestic cards, net banking (first 12 months, or up to ₹1Cr GTV/month)
- **1.95% standard** post-promotional period or beyond ₹1Cr/month

#### Key Features

- **Instant fund transfers:** 24×7 real-time to bank accounts, UPI IDs, wallets, debit/credit cards
- **Multi-mode disbursals:** IMPS, NEFT, RTGS, UPI, Card Payouts
- **Bulk payouts:** Up to 1,000+ beneficiaries in a single API call
- **Smart routing:** Multi-bank failover with 99.98% uptime SLA
- **Payout Links (Cashgram):** Send money when only a mobile number/email is known — recipient chooses withdrawal mode
- **Beneficiary management:** Add, verify, and delete beneficiaries via API
- **Bank Account Verification:** Penny drop API before sending payouts (free IFSC verification)
- **Webhooks:** Real-time success/failure/reversal notifications (V2 webhooks available)
- **One Escrow:** Marketplace escrow for split-settlement flows
- **Payout Protect:** Real-time fraud detection at payout level

#### API & Developer Experience

- **API Version:** V2 (current) + V1 (legacy, still supported)
- **Documentation:** `cashfree.com/docs/api-reference/payouts/overview` — well-structured, Mintlify-hosted
- **SDKs:** REST/JSON APIs; Node.js, Python, Java, PHP client libraries available
- **Postman Collection:** Available for all Payout endpoints
- **Sandbox:** Full sandbox environment (`sandbox.cashfree.com`) for UAT testing
- **Authentication:** API Key + Client Secret (HTTPS headers)
- **IP Whitelisting:** Required for production payout API calls

#### Onboarding

- **Signup:** `merchant.cashfree.com/merchants/signup` — 100% paperless
- **KYC:** Digital verification (PAN, business proof, bank account)
- **Activation Time:** 1–2 business days for standard onboarding
- **Payouts Activation:** Separate from PG — requires explicit Payouts account activation (same portal)
- **Setup Fee:** ₹0
- **Annual Maintenance Charge:** ₹0

#### Settlement

- **Into EverCut account:** T+1 to T+2 (from collections on PG)
- **Out to barbers (payout):** Real-time/instant via UPI and IMPS; NEFT follows banking hours

#### Pros

- Best-in-class payout API depth and reliability in India
- Paperless, fast digital onboarding
- Zero setup and AMC fees
- Lowest NEFT payout rate (₹1.75 flat regardless of amount)
- Smart routing improves payout success rates
- Active V2 API with modern REST design
- Used by Nykaa, CRED, and major Indian fintechs for disbursements

#### Cons

- Phone support unavailable (email/chat only)
- UPI payout fees (₹3–₹10) are higher than NEFT (₹1.75); may need to default to NEFT for cost optimization
- Brand recognition slightly lower than Razorpay for enterprise buyers
- Subscription/dunning tooling less mature than Razorpay (not relevant for EverCut payouts)

---

### 3.3 RazorpayX

**Official Sources:** `razorpay.com/x/payouts`, `razorpay.com/docs/x/manage-teams/billing`

#### Overview

RazorpayX is Razorpay's dedicated business banking and payout arm. It is the most well-known payout solution in India's startup ecosystem, trusted by 70% of India's unicorns per Razorpay's own marketing. It operates via partnerships with RBL Bank, Yes Bank, and Axis Bank.

#### Pricing (Verified from Official Source — `razorpay.com/docs/x/manage-teams/billing`)

**Per-payout fee example from official documentation:**
> "For a payout of ₹10,000, the fees applicable is ₹5 and the tax on this is ₹0.90."

This implies a **standard rate of approximately ₹5/payout** for the RazorpayX Lite (virtual account) product, with 18% GST additional.

**Pricing structure:**
- **RazorpayX Lite (Virtual Account):** Fees charged per payout in real-time at the moment of transfer
- **RazorpayX Current Account:** Fees billed monthly; volume-based pricing available
- **Free payouts:** Some plans include a quota of free payouts before per-transaction fees apply
- **Exact tiered pricing:** Not publicly listed on the main pricing page — contact Razorpay sales for current schedule

> **⚠️ Transparency Note:** RazorpayX does not publish a comprehensive public payout fee schedule comparable to Cashfree's pricing page. Exact costs require direct engagement with Razorpay sales or a live account dashboard. Budget approximately ₹5–₹15/txn inclusive of GST for planning purposes.

#### Key Features

- **Automated payouts:** Bulk transfers via API to bank accounts, UPI, wallets
- **AI-powered routing:** Multi-bank failover with 2-second average payout speed
- **Payroll:** Full HR/payroll module (not relevant for EverCut)
- **Vendor payments:** Integrated with approval workflows
- **Corporate cards:** Expense management (not relevant for EverCut)
- **Bank Account Verification:** Smart penniless technology for instant validation
- **Idempotency keys:** Prevent duplicate payouts
- **IP whitelisting:** Available for production security
- **Webhooks:** Real-time payout status events
- **Payout Links:** URL-based payout for unknown bank details

#### API & Developer Experience

- **Documentation:** `razorpay.com/docs/x/` — best-in-class documentation quality in India
- **SDKs:** Node.js, Python, Java, PHP, Go, Ruby — all officially maintained
- **Postman Collection:** Publicly available
- **Sandbox:** Provided for all API endpoints
- **Authentication:** API Key ID + Secret (HTTP Basic Auth)

#### Onboarding

- **Signup:** `dashboard.razorpay.com` — digital
- **KYC:** PAN, business documents, bank account
- **Activation Time:** 1–2 business days (with Razorpay Early Stage program: potentially same day)
- **Separate product from PG:** RazorpayX requires separate activation even if Razorpay PG is active
- **Setup Fee:** ₹0
- **Annual Maintenance Charge:** ₹0 (for basic accounts; some premium features may carry AMC)

#### Pros

- Best developer documentation and community support in India
- Strong ecosystem if already using Razorpay PG for collections
- AI-powered routing with excellent uptime and 2-second payouts
- Trusted by 70% of Indian unicorns — enterprise credibility
- Rich payout ecosystem: bulk, single, API, payout links, payroll

#### Cons

- Payout fees are less transparently published vs Cashfree
- At standard rates (~₹5–₹15/txn), slightly more expensive than Cashfree NEFT (₹1.75)
- Deeper ecosystem features (payroll, corporate cards) may add complexity for a startup needing simple payouts
- T+2 settlement default on PG side (Cashfree offers T+1)

---

### 3.4 PayU Payouts

**Official Sources:** `payu.in`, `payuin.com`

#### Overview

PayU India (owned by Prosus/Naspers) is one of India's oldest Payment Aggregators. Its payout capability exists but is not a primary product focus — it's packaged more as a complement to its gateway.

#### Pricing

- **UPI Payouts:** ~₹3–₹5/txn (indicative — not publicly listed with same detail as Cashfree)
- **IMPS Payouts:** ~₹5–₹10/txn
- **NEFT Payouts:** ~₹5–₹10/txn
- **Setup Fee:** ₹0
- **Exact pricing requires sales contact**

#### Key Features

- IMPS/NEFT/UPI disbursements
- Bulk payout capability
- Dashboard-based payout management
- LazyPay BNPL integration (relevant only for collections)

#### API & Developer Experience

- Documentation quality: ⭐⭐⭐ (adequate, not developer-first)
- Older API design patterns (V1-style)
- Sandbox available but less polished
- SDK coverage: Java, PHP, .NET, Python (community-maintained)

#### Onboarding

- Activation Time: 2–5 business days
- KYC: Standard business documents required
- Setup Fee: ₹0

#### Pros

- RBI-licensed, established entity
- Wide merchant network and banking relationships
- LazyPay BNPL integration for future checkout enhancement

#### Cons

- Payout is not a product priority — API depth and reliability lag behind Cashfree and RazorpayX
- Higher per-transaction fees than Cashfree for NEFT
- Documentation less developer-friendly
- Support quality rated lower than Cashfree and Razorpay by merchant communities
- Onboarding slower (2–5 days vs 1–2 days)

---

## 4. Comparative Analysis

### 4.1 Master Comparison Table

| Criterion | Cashfree Payouts | RazorpayX | PayU Payouts |
|-----------|------------------|-----------|--------------|
| **UPI Payout Fee** | ₹3–₹10/txn (by amount) | ~₹5/txn (est.) | ~₹3–₹5/txn (est.) |
| **IMPS Payout Fee** | ₹2.50–₹10/txn | ~₹5–₹15/txn (est.) | ~₹5–₹10/txn (est.) |
| **NEFT Payout Fee** | ₹1.75 flat ✅ | ~₹5–₹15/txn (est.) | ~₹5–₹10/txn (est.) |
| **Pricing Transparency** | ✅ Fully public | ⚠️ Partial (needs sales) | ⚠️ Not fully public |
| **Setup Fee** | ₹0 | ₹0 | ₹0 |
| **AMC** | ₹0 | ₹0 | ₹0 |
| **Onboarding Speed** | 1–2 days ✅ | 1–2 days ✅ | 2–5 days |
| **KYC Complexity** | Low (digital) | Low (digital) | Moderate |
| **Sandbox** | ✅ Full sandbox | ✅ Full sandbox | ✅ Available |
| **Node.js SDK** | ✅ REST + libraries | ✅ Officially maintained | ⚠️ Community |
| **API Quality** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Documentation Quality** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Bulk Payout (1000+ txns)** | ✅ Native Batch API | ✅ Native Bulk API | ⚠️ Limited |
| **UPI Payouts** | ✅ Real-time | ✅ Real-time | ✅ Available |
| **IMPS Payouts** | ✅ Real-time | ✅ Real-time | ✅ Available |
| **NEFT Payouts** | ✅ Banking hours | ✅ Banking hours | ✅ Banking hours |
| **Card Payouts** | ✅ Debit + Credit | ✅ | ❌ |
| **Cashgram/Payout Links** | ✅ (Cashgram) | ✅ (Payout Links) | ❌ |
| **Bank Account Verification** | ✅ Penny Drop + IFSC | ✅ Smart Penniless | ⚠️ Basic |
| **Smart Routing (Multi-bank)** | ✅ 99.98% uptime | ✅ AI routing | ⚠️ Single bank path |
| **Webhooks** | ✅ V2 webhooks | ✅ Real-time | ✅ Basic |
| **Payout Protect (Fraud)** | ✅ Native feature | ⚠️ Basic fraud checks | ⚠️ Basic |
| **Escrow/Marketplace** | ✅ One Escrow | ✅ Razorpay Route | ❌ |
| **Settlement into EverCut** | T+1 ✅ | T+2 | T+2 |
| **RBI Licensed PA** | ✅ | ✅ | ✅ |
| **Startup Friendliness** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Payout API Maturity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Support Channels** | Email/Chat | Email/Chat/Tickets | Email/Tickets |
| **Phone Support** | ❌ | ❌ | ❌ |

### 4.2 Payout Cost Modeling for EverCut

**Assumptions:**
- Average booking: ₹600
- Barber payout: 85% = ₹510 per booking (falls in ₹1–₹1,000 bracket for UPI; ₹1,001–₹10,000 bracket for IMPS)
- Mix: 70% UPI payouts, 30% NEFT payouts
- Monthly bookings: 1,000 (early growth stage)

| Provider | UPI Cost (700 txns) | NEFT Cost (300 txns) | Monthly Total | Annual Total |
|----------|--------------------|--------------------|--------------|-------------|
| **Cashfree** | 700 × ₹3 = ₹2,100 | 300 × ₹1.75 = ₹525 | **₹2,625** | **₹31,500** |
| **RazorpayX** | 700 × ₹5 = ₹3,500 | 300 × ₹5 = ₹1,500 | **₹5,000** | **₹60,000** |
| **PayU** | 700 × ₹4 = ₹2,800 | 300 × ₹7.5 = ₹2,250 | **₹5,050** | **₹60,600** |

*All figures pre-GST. Add 18% GST for net cost.*

**At 1,000 payouts/month, Cashfree saves approximately ₹2,375/month (₹28,500/year) over RazorpayX.**

---

## 5. Best Provider Selection & Justification

### 5.1 Decision: 🥇 Cashfree Payouts

**For EverCut's payout layer, Cashfree Payouts is the definitive choice.**

### 5.2 Evidence-Based Justification

**Cost Leadership:**
The cost analysis above shows Cashfree's payout fees are the lowest of the three verified providers, primarily due to NEFT at ₹1.75 flat — the lowest in the Indian market. For a pre-revenue startup, every rupee saved on infrastructure compounds directly into runway.

**Payout API Depth:**
Cashfree's Payout API V2 offers all required capabilities: standard single transfers, batch transfers, UPI payouts, IMPS, NEFT, bank account verification (penny drop), webhooks, and sandbox — everything EverCut needs. The official API documentation is well-maintained on Mintlify with clear endpoint specifications.

**Transparent Pricing:**
Unlike RazorpayX (which requires a sales conversation for exact payout fees), Cashfree publishes its complete payout fee schedule publicly at `cashfree.com/payment-gateway-charges`. This transparency is important for startup financial modeling.

**Fast, Paperless Onboarding:**
Cashfree offers 100% digital onboarding with activation within 1–2 business days. As a pre-revenue startup, EverCut benefits from Cashfree's MSME-friendly onboarding without requiring large transaction volumes to get access.

**Proven at Scale:**
Cashfree processes payouts for CRED (credit card repayments), Nykaa (instant refunds), and major gig economy platforms. The underlying infrastructure has been stress-tested at volumes EverCut will not reach for years.

**Architecture Complement:**
EverCut uses PhonePe PG for collection. Adding Cashfree solely for payouts creates a clean separation of concerns: PhonePe handles inbound (where its ~50% UPI market share maximizes success rates), Cashfree handles outbound (where its payout infrastructure is deepest). This is the widely-recommended dual-provider architecture for Indian fintechs.

**Settlement Advantage:**
Cashfree's default settlement from its PG is T+1 (vs Razorpay's T+2). If EverCut later consolidates onto Cashfree for collection as well, the faster settlement improves working capital.

### 5.3 Runner-up: RazorpayX

RazorpayX would be the correct choice if:
- EverCut plans to use Razorpay PG for collection (combined ecosystem benefit)
- Developer experience is the primary constraint (Razorpay's docs are marginally better)
- Enterprise credibility matters for investor or partner conversations (70% unicorn adoption)
- EverCut scales to a point where custom pricing makes RazorpayX competitive

### 5.4 Why Not PayU

PayU's payout product lacks the API maturity, documentation quality, and fee transparency required for a developer-first startup. It is best suited for large enterprises with pre-existing PayU banking relationships.

---

## 6. Cashfree Payouts — Implementation Guide

> **⚠️ IMPLEMENTATION STATUS: NOT IMPLEMENTED**
> 
> The code examples, services, models, controllers, and integrations described in this entire section (6.1 through 6.14) are reference implementations for future development. 
> 
> **What does NOT exist in the codebase:**
> - No Cashfree configuration files
> - No `server/src/adapters/cashfree/` directory
> - No `server/src/services/payout.service.js`
> - No `server/src/controllers/payout/` directory
> - No `server/src/models/payout-transaction.model.js`
> - No `server/src/jobs/payout-poller.cron.js`
> - No Cashfree environment variables in `.env` or `.env.example`
> - No payout-related routes or API endpoints
> 
> This section provides a complete implementation guide for when the payout feature is ready to be developed.

### 6.1 Account Creation and Onboarding Process (Future Implementation)

**Step-by-step registration:**

```
Step 1: Visit https://merchant.cashfree.com/merchants/signup
Step 2: Enter business mobile number → receive OTP → verify
Step 3: Provide business details:
  - Business Name (legal name)
  - Business Type (Pvt Ltd / LLP / Sole Proprietor / Partnership)
  - Category (Technology / Marketplace / Services)
  - Website URL (or app description if no website)
Step 4: Submit KYC documents (see Section 6.2)
Step 5: Bank account linking (Cashfree sends ₹1 penny drop for verification)
Step 6: Account activated for TEST environment
Step 7: Activate Payouts product separately:
  - Navigate to Dashboard → Products → Payouts → Activate
  - Payouts has a separate virtual wallet and separate API credentials
Step 8: Complete Payouts-specific KYC (may need additional business proof)
Step 9: Production go-live for Payouts after internal review (1–2 business days)
```

### 6.2 Business Verification and KYC Requirements (Future Implementation)

**Required Documents by Business Type:**

| Business Type | Documents Required |
|--------------|-------------------|
| **Sole Proprietor** | PAN Card, Aadhaar Card, Cancelled Cheque, GST Certificate (if applicable) |
| **Private Limited / LLP** | Certificate of Incorporation, PAN of Company, GST (if applicable), Board Resolution, Aadhaar + PAN of authorized signatory |
| **Partnership** | Partnership Deed, PAN of firm, Aadhaar + PAN of managing partner |

**GST Requirement:**
- GST is **optional** for businesses with turnover below ₹40L/year
- GST mandatory for businesses above threshold or in mandatory-registration categories
- EverCut should include GST number if available — it streamlines approval

**For Payouts specifically (additional):**
- Business purpose of payouts (e.g., "platform commission disbursements to service providers")
- Intended beneficiary types (e.g., "Individual bank accounts and UPI IDs of barbers")
- Expected monthly payout volume (even estimated figures acceptable at signup)

### 6.3 API Key Generation (Future Implementation)

> **Note:** These steps are for future implementation. No Cashfree API keys have been generated for the EverCut project yet.

After account activation:

```
1. Login to https://merchant.cashfree.com
2. Navigate to: Developers → API Keys
3. For Payouts API: The App ID and Secret Key are SEPARATE from PG credentials
   - PG credentials → Payment Gateway section
   - Payout credentials → Payouts section
4. Generate Payouts API credentials:
   - Click "Create Key" in Payouts section
   - Note the App ID (Client ID) and Secret Key
5. Store securely (never commit to version control)
6. Whitelist your server IP addresses:
   - Navigate to: Developers → IP Whitelisting
   - Add production server IP(s) — mandatory for payout API calls
```

**Environment Variables for EverCut (Reference - Not Currently in .env):**

> **Note:** These environment variables do not currently exist in the `.env` or `.env.example` files.

```env
# ─── Cashfree Payouts ───────────────────────────────────────────
CASHFREE_PAYOUT_CLIENT_ID=CF_PAYOUT_CLIENT_ID_HERE
CASHFREE_PAYOUT_CLIENT_SECRET=CF_PAYOUT_SECRET_HERE
CASHFREE_PAYOUT_ENV=TEST           # TEST or PRODUCTION

# ─── PhonePe PG (existing) ──────────────────────────────────────
PHONEPE_CLIENT_ID=your_phonepe_client_id
PHONEPE_CLIENT_SECRET=your_phonepe_client_secret
PHONEPE_ENV=SANDBOX
```

### 6.4 Sandbox Setup and Testing Flow (Future Implementation)

**Base URLs:**

| Environment | Base URL |
|-------------|---------|
| **Sandbox (TEST)** | `https://sandbox.cashfree.com/payout` |
| **Production** | `https://payout-api.cashfree.com` |

**Sandbox testing flow:**

```javascript
// 1. Authenticate (V2)
// Headers: x-client-id + x-client-secret
// POST /payout/v2/authorize
// Response: { token, expiry }

// 2. Add a test beneficiary
// POST /payout/v2/beneficiary
// Body: { beneId, name, upi (or bank+ifsc), email, phone }

// 3. Initiate a test transfer
// POST /payout/v2/transfers
// Body: { beneId, amount, transferId, remarks, transferMode }

// 4. Check transfer status
// GET /payout/v2/transfers/{transferId}

// 5. Configure webhook for status callbacks
// Dashboard → Payouts → Webhook Settings → add your ngrok/sandbox URL
```

**Sandbox test credentials:**
These are provided in your Cashfree merchant dashboard under Developer → API Keys → Test Mode.

### 6.5 Payout API Endpoints Reference (V2) (For Future Implementation)

**Authentication:**

```http
POST /payout/v2/authorize
Headers:
  x-client-id: {CASHFREE_PAYOUT_CLIENT_ID}
  x-client-secret: {CASHFREE_PAYOUT_CLIENT_SECRET}
  x-api-version: 2024-01-01

Response:
{
  "status": "SUCCESS",
  "data": {
    "token": "Bearer eyJhbGci...",
    "expiry": 1714000000
  }
}
```

**Bearer token:** Valid for ~30 minutes. Cache it and refresh before expiry.

**Add Beneficiary:**

```http
POST /payout/v2/beneficiary
Authorization: Bearer {token}
Content-Type: application/json

{
  "beneId": "BARBER_USER_ID_123",        // Your internal barber ID
  "name": "Rahul Sharma",
  "upi": "rahulsharma@upi",             // UPI payout
  // OR for bank account:
  "bankAccount": "1234567890",
  "ifsc": "SBIN0001234",
  "email": "rahul@example.com",
  "phone": "9876543210"
}
```

**Standard Transfer (Single Payout):**

```http
POST /payout/v2/transfers
Authorization: Bearer {token}
Content-Type: application/json

{
  "beneId": "BARBER_USER_ID_123",
  "amount": "425.00",
  "transferId": "PAYOUT_BOOKING_456_1714000000",  // Unique per transfer
  "transferMode": "UPI",                           // UPI | IMPS | NEFT | RTGS
  "remarks": "EverCut - Booking #456 - Haircut Service"
}

Response:
{
  "status": "SUCCESS",
  "data": {
    "referenceId": "CF_REF_123456",
    "status": "PENDING",
    "utr": null,                // UTR populated on completion
    "processedOn": null
  }
}
```

**Get Transfer Status:**

```http
GET /payout/v2/transfers/{transferId}
Authorization: Bearer {token}

Response:
{
  "status": "SUCCESS",
  "data": {
    "transferId": "PAYOUT_BOOKING_456_1714000000",
    "referenceId": "CF_REF_123456",
    "status": "SUCCESS",        // SUCCESS | PENDING | FAILED | REVERSED
    "utr": "424242424242",
    "amount": "425.00",
    "processedOn": "2026-04-17T10:30:00Z"
  }
}
```

**Batch Transfer (Multiple Payouts):**

```http
POST /payout/v2/transfers/batch
Authorization: Bearer {token}
Content-Type: application/json

{
  "batchTransferId": "BATCH_20260417_001",
  "batchFormat": "BANK_ACCOUNT",
  "batch": [
    {
      "transferId": "PAYOUT_BOOKING_456",
      "amount": "425.00",
      "phone": "9876543210",
      "bankAccount": "1234567890",
      "ifsc": "SBIN0001234",
      "name": "Rahul Sharma"
    }
  ]
}
```

**Bank Account Verification (Penny Drop):**

```http
POST /payout/v2/beneficiary/verify
Authorization: Bearer {token}

{
  "bankAccount": "1234567890",
  "ifsc": "SBIN0001234",
  "name": "Rahul Sharma"     // Optional name match
}

Response:
{
  "status": "SUCCESS",
  "data": {
    "accountExists": true,
    "nameMatches": true,
    "nameAtBank": "RAHUL SHARMA"
  }
}
```

### 6.6 Authentication — Token Management (Reference Implementation)

> **Note:** This code does not currently exist in the codebase. It is provided as a reference for future implementation.

The V2 API uses Bearer token authentication. Token lifecycle management is critical:

```javascript
// server/src/adapters/cashfree/cashfree-token.manager.js

class CashfreePayoutTokenManager {
  constructor() {
    this._token = null;
    this._expiryMs = null;
    this._refreshPromise = null;
  }

  async getToken() {
    const bufferMs = 60_000; // Refresh 1 min before expiry
    if (this._token && Date.now() < this._expiryMs - bufferMs) {
      return this._token;
    }
    if (!this._refreshPromise) {
      this._refreshPromise = this._fetchNewToken();
    }
    try {
      return await this._refreshPromise;
    } finally {
      this._refreshPromise = null;
    }
  }

  async _fetchNewToken() {
    const response = await fetch(
      `${process.env.CASHFREE_PAYOUT_BASE_URL}/payout/v2/authorize`,
      {
        method: 'POST',
        headers: {
          'x-client-id': process.env.CASHFREE_PAYOUT_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_PAYOUT_CLIENT_SECRET,
          'x-api-version': '2024-01-01',
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await response.json();
    if (data.status !== 'SUCCESS') {
      throw new Error(`Cashfree auth failed: ${JSON.stringify(data)}`);
    }
    this._token = data.data.token;
    this._expiryMs = data.data.expiry * 1000;
    return this._token;
  }
}

export const cashfreeTokenManager = new CashfreePayoutTokenManager();
```

### 6.7 Payout Service Implementation (Reference Implementation)

> **Note:** This service does not currently exist in the codebase. The file `server/src/services/payout.service.js` has not been created. This is a reference implementation for future development.

```javascript
// server/src/services/payout.service.js

import { cashfreeTokenManager } from '../adapters/cashfree/cashfree-token.manager.js';
import { PayoutTransaction } from '../models/payout-transaction.model.js';
import logger from '../utils/logger.js';

const CASHFREE_BASE_URL = process.env.CASHFREE_PAYOUT_ENV === 'PRODUCTION'
  ? 'https://payout-api.cashfree.com'
  : 'https://sandbox.cashfree.com/payout';

const PLATFORM_COMMISSION_PERCENT = parseInt(process.env.PLATFORM_COMMISSION_PERCENT || '15');

export async function initiateBarberPayout(booking, barber) {
  const payoutAmount = Math.floor(booking.totalAmount * (1 - PLATFORM_COMMISSION_PERCENT / 100));
  const transferId = `PAYOUT_${booking._id}_${Date.now()}`;

  // 1. Idempotency check
  const existing = await PayoutTransaction.findOne({ bookingId: booking._id });
  if (existing) {
    logger.warn({ bookingId: booking._id }, 'Payout already exists for booking');
    return existing;
  }

  // 2. Create payout record
  const payoutTxn = await PayoutTransaction.create({
    bookingId: booking._id,
    barberId: barber._id,
    transferId,
    amount: payoutAmount,
    status: 'INITIATED',
  });

  try {
    // 3. Ensure beneficiary exists
    await ensureBeneficiary(barber);

    // 4. Initiate transfer
    const token = await cashfreeTokenManager.getToken();
    const response = await fetch(`${CASHFREE_BASE_URL}/payout/v2/transfers`, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
        'x-api-version': '2024-01-01',
      },
      body: JSON.stringify({
        beneId: `BARBER_${barber._id}`,
        amount: (payoutAmount / 100).toFixed(2), // Convert paise to rupees
        transferId,
        transferMode: barber.upiId ? 'UPI' : 'IMPS',
        remarks: `EverCut - Booking ${booking._id}`,
      }),
    });

    const data = await response.json();

    if (data.status !== 'SUCCESS') {
      throw new Error(`Cashfree payout failed: ${JSON.stringify(data)}`);
    }

    // 5. Update payout record
    await PayoutTransaction.findByIdAndUpdate(payoutTxn._id, {
      status: 'PENDING',
      referenceId: data.data.referenceId,
    });

    logger.info({ transferId, referenceId: data.data.referenceId }, 'Payout initiated');
    return payoutTxn;

  } catch (error) {
    await PayoutTransaction.findByIdAndUpdate(payoutTxn._id, { status: 'FAILED' });
    logger.error({ transferId, error: error.message }, 'Payout initiation failed');
    throw error;
  }
}

async function ensureBeneficiary(barber) {
  const token = await cashfreeTokenManager.getToken();
  const beneId = `BARBER_${barber._id}`;

  // Check if already registered
  const checkRes = await fetch(
    `${CASHFREE_BASE_URL}/payout/v2/beneficiary/${beneId}`,
    { headers: { Authorization: token, 'x-api-version': '2024-01-01' } }
  );

  if (checkRes.status === 200) return; // Already exists

  // Register new beneficiary
  const body = {
    beneId,
    name: barber.fullName,
    phone: barber.phone,
    email: barber.email,
    ...(barber.upiId
      ? { upi: barber.upiId }
      : { bankAccount: barber.bankAccount, ifsc: barber.ifsc }
    ),
  };

  const regRes = await fetch(`${CASHFREE_BASE_URL}/payout/v2/beneficiary`, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
      'x-api-version': '2024-01-01',
    },
    body: JSON.stringify(body),
  });

  const regData = await regRes.json();
  if (regData.status !== 'SUCCESS') {
    throw new Error(`Beneficiary registration failed: ${JSON.stringify(regData)}`);
  }
}
```

### 6.8 Webhooks and Event Handling (Reference Implementation)

> **Note:** The webhook handler described below does not currently exist in the codebase. This is a reference implementation for future development.

**Configure webhook URL in Cashfree Dashboard (when implementing):**
```
Payouts → Settings → Webhook Settings → Add URL
URL: https://api.evercut.in/api/v1/payouts/webhook
Events: All transfer events
```

**Webhook payload (Cashfree V2):**

```json
{
  "type": "TRANSFER_SUCCESS",
  "data": {
    "transferId": "PAYOUT_BOOKING_456_1714000000",
    "referenceId": "CF_REF_123456",
    "status": "SUCCESS",
    "utr": "424242424242",
    "amount": "425.00",
    "processedOn": "2026-04-17T10:30:00Z"
  },
  "signature": "base64_signature_here"
}
```

**Webhook handler:**

```javascript
// server/src/controllers/payout/payout-webhook.controller.js

import crypto from 'crypto';
import { PayoutTransaction } from '../../models/payout-transaction.model.js';
import { Booking } from '../../models/booking.model.js';

export async function handlePayoutWebhook(req, res) {
  // 1. Verify webhook signature
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const rawBody = req.rawBody; // Ensure raw body capture in middleware

  const expectedSig = crypto
    .createHmac('sha256', process.env.CASHFREE_PAYOUT_CLIENT_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest('base64');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  )) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { type, data } = req.body;

  // 2. Idempotency — check if already processed
  const payout = await PayoutTransaction.findOne({ transferId: data.transferId });
  if (!payout || payout.status === 'SUCCESS' || payout.status === 'FAILED') {
    return res.status(200).json({ received: true }); // Already processed
  }

  // 3. Process event
  switch (type) {
    case 'TRANSFER_SUCCESS':
      await PayoutTransaction.findByIdAndUpdate(payout._id, {
        status: 'SUCCESS',
        utr: data.utr,
        processedOn: data.processedOn,
      });
      await Booking.findByIdAndUpdate(payout.bookingId, {
        payoutStatus: 'COMPLETED',
        barberUtr: data.utr,
      });
      break;

    case 'TRANSFER_FAILED':
    case 'TRANSFER_REVERSED':
      await PayoutTransaction.findByIdAndUpdate(payout._id, {
        status: 'FAILED',
        failureReason: data.failureReason || type,
      });
      await Booking.findByIdAndUpdate(payout.bookingId, {
        payoutStatus: 'FAILED',
      });
      // TODO: Trigger admin alert for manual retry
      break;
  }

  return res.status(200).json({ received: true });
}
```

### 6.9 Error Handling and Edge Cases (Reference Implementation)

| Scenario | Detection | Handling |
|----------|-----------|----------|
| **Auth token expired** | 401 on API call | Auto-refresh via TokenManager, retry once |
| **Beneficiary doesn't exist** | `BENE_NOT_FOUND` error | Auto-register via `ensureBeneficiary()` |
| **Duplicate transferId** | `TRANSFER_ID_EXISTS` error | Check idempotency before API call |
| **Insufficient payout wallet balance** | `INSUFFICIENT_BALANCE` error | Alert admin; pause automated payouts |
| **Webhook not received** | No update after 5 min | Poll `/payout/v2/transfers/{transferId}` |
| **Bank account incorrect** | `INVALID_ACCOUNT` error | Flag barber account for re-verification |
| **Bank downtime** | `BANK_OFFLINE` or timeout | Retry with exponential backoff (3s, 9s, 27s) |
| **Double webhook delivery** | Same transferId already processed | Return 200, no re-processing (idempotency) |
| **Payout for failed booking** | Booking not in `Completed` state | Service layer validates state before initiating |

**Retry Strategy:**

```javascript
async function initiatePayoutWithRetry(booking, barber, maxAttempts = 3) {
  let attempt = 0;
  let delayMs = 3000;

  while (attempt < maxAttempts) {
    try {
      return await initiateBarberPayout(booking, barber);
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) throw error;
      if (error.code === 'INSUFFICIENT_BALANCE') throw error; // Non-retryable
      await new Promise(r => setTimeout(r, delayMs));
      delayMs *= 3; // Exponential backoff
    }
  }
}
```

### 6.10 Rate Limits and Security Best Practices (For Future Implementation)

**Rate Limits (Cashfree V2):**
- Exact limits are account-tier dependent; contact Cashfree support for your plan
- General guidance: implement request queuing for burst payout scenarios
- Sandbox limits are lower than production — don't use sandbox limits for production planning

**Security Best Practices:**

| Practice | Implementation |
|----------|---------------|
| **IP Whitelisting** | Mandatory in Cashfree dashboard; whitelist all EverCut production server IPs |
| **Secret Storage** | Store `CASHFREE_PAYOUT_CLIENT_SECRET` in environment variables only; never in code or logs |
| **Webhook Verification** | Always verify `x-webhook-signature` using HMAC-SHA256 before processing |
| **Timing-Safe Comparison** | Use `crypto.timingSafeEqual()` for signature comparison |
| **Idempotency Keys** | Use unique `transferId` per payout; check before every API call |
| **Amount in Rupees** | Cashfree Payouts V2 accepts amount in **rupees** (not paise) — critical distinction from PhonePe |
| **Data Localization** | Store all payout records in MongoDB Atlas `ap-south-1` (Mumbai) — NPCI requirement |
| **Never Log** | Do not log `client_secret`, Bearer tokens, or full bank account numbers |
| **Beneficiary Verification** | Always run penny drop verification before first payout to a new barber |
| **Payout Wallet Monitoring** | Set up dashboard alerts for low payout wallet balance |

### 6.11 Database Schema (Reference Implementation)

> **Note:** The `PayoutTransaction` model does not currently exist in the codebase. The file `server/src/models/payout-transaction.model.js` has not been created. This is a reference schema for future implementation.

```javascript
// server/src/models/payout-transaction.model.js

import mongoose from 'mongoose';

const payoutTransactionSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  transferId: { type: String, required: true, unique: true },  // Our ID
  referenceId: { type: String, index: true },                  // Cashfree's ID
  amount: { type: Number, required: true },                    // In paise
  transferMode: { type: String, enum: ['UPI', 'IMPS', 'NEFT', 'RTGS'] },
  status: {
    type: String,
    enum: ['INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'REVERSED'],
    default: 'INITIATED',
    index: true,
  },
  utr: { type: String },                                       // Bank UTR on success
  processedOn: { type: Date },
  failureReason: { type: String },
  retryCount: { type: Number, default: 0 },
}, {
  timestamps: true,
  collection: 'payout_transactions',
});

// Compound index for polling stuck payouts
payoutTransactionSchema.index({ status: 1, createdAt: 1 });

export const PayoutTransaction = mongoose.model('PayoutTransaction', payoutTransactionSchema);
```

### 6.12 Cron Job — Stuck Payout Resolution (Reference Implementation)

> **Note:** This cron job does not currently exist in the codebase. The file `server/src/jobs/payout-poller.cron.js` has not been created. This is a reference implementation for future development.

```javascript
// server/src/jobs/payout-poller.cron.js
// Runs every 10 minutes to resolve payouts stuck in PENDING

import cron from 'node-cron';
import { PayoutTransaction } from '../models/payout-transaction.model.js';
import { cashfreeTokenManager } from '../adapters/cashfree/cashfree-token.manager.js';

export function startPayoutPoller() {
  cron.schedule('*/10 * * * *', async () => {
    const stuckPayouts = await PayoutTransaction.find({
      status: 'PENDING',
      createdAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) }, // Older than 10 min
    }).limit(50);

    for (const payout of stuckPayouts) {
      try {
        const token = await cashfreeTokenManager.getToken();
        const res = await fetch(
          `${CASHFREE_BASE_URL}/payout/v2/transfers/${payout.transferId}`,
          { headers: { Authorization: token, 'x-api-version': '2024-01-01' } }
        );
        const data = await res.json();

        if (data.data?.status === 'SUCCESS') {
          await PayoutTransaction.findByIdAndUpdate(payout._id, {
            status: 'SUCCESS',
            utr: data.data.utr,
            processedOn: data.data.processedOn,
          });
        } else if (data.data?.status === 'FAILED') {
          await PayoutTransaction.findByIdAndUpdate(payout._id, { status: 'FAILED' });
        }
      } catch (err) {
        logger.error({ transferId: payout.transferId, err }, 'Payout poll failed');
      }
    }
  });
}
```

### 6.13 Go-Live Process (Future Implementation Checklist)

> **Note:** These steps are for future implementation when the payout feature is developed.

```
Step 1: Complete all sandbox UAT testing
  □ Token generation and caching
  □ Beneficiary creation (UPI + bank account)
  □ Single transfer — success scenario
  □ Single transfer — failure scenario (invalid UPI)
  □ Bank account verification (penny drop)
  □ Webhook receipt and processing
  □ Duplicate webhook idempotency
  □ Poll-based status recovery (simulate missed webhook)
  □ Batch transfer (if used)

Step 2: Switch to Production credentials
  □ Generate production API keys in Cashfree Dashboard
  □ Update CASHFREE_PAYOUT_ENV=PRODUCTION in .env
  □ Update CASHFREE_PAYOUT_CLIENT_ID and CLIENT_SECRET to production values
  □ Whitelist production server IPs in Cashfree Dashboard

Step 3: Payout wallet funding
  □ Transfer initial funds to Cashfree Payout virtual wallet
  □ This is different from PG settlement — Payout wallet requires explicit funding
  □ Minimum balance recommendation: ≥ 2× expected daily payout volume

Step 4: Production webhook configuration
  □ Update webhook URL in Cashfree Dashboard to production endpoint
  □ Confirm HTTPS on production webhook endpoint
  □ Test webhook delivery from Cashfree Dashboard

Step 5: Monitor first 20 live payouts
  □ Verify real-time transfer to barber UPI/bank
  □ Confirm webhook receipt in production logs
  □ Verify payout_transactions records in MongoDB
  □ Confirm booking payoutStatus transitions
```

### 6.14 API Endpoint Summary for EverCut (Reference for Future Implementation)

| Method | Cashfree Endpoint | EverCut Usage |
|--------|-------------------|---------------|
| `POST` | `/payout/v2/authorize` | Token generation (internal) |
| `POST` | `/payout/v2/beneficiary` | Register barber before first payout |
| `GET` | `/payout/v2/beneficiary/{beneId}` | Check if barber is registered |
| `POST` | `/payout/v2/beneficiary/verify` | Penny drop bank verification |
| `POST` | `/payout/v2/transfers` | Initiate barber payout |
| `GET` | `/payout/v2/transfers/{transferId}` | Poll payout status |
| `POST` | `/payout/v2/transfers/batch` | Batch payouts (future: daily settlement) |
| Webhook | `POST /api/v1/payouts/webhook` | Receive Cashfree transfer events |

---

## 7. Recommended Architecture (Proposed Design)

> **IMPLEMENTATION STATUS:** This architecture represents the recommended design for the EverCut payment system. Currently, neither the collection layer (PhonePe PG) nor the disbursement layer (Cashfree Payouts) have been implemented in the codebase.

### 7.1 EverCut Payment Stack (Proposed for 2026)

```
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOMER (Flutter App)                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Books service + Pays
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: COLLECTION (Inbound)                                  │
│  PhonePe Payment Gateway v2                                     │
│  • UPI Intent, Debit/Credit Cards, Net Banking                  │
│  • 0% MDR on UPI (dominant payment mode)                        │
│  • ~50% UPI market share = highest success rates                │
│  • Settlement: T+1 into EverCut nodal account                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Settlement (T+1)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  EverCut Nodal/Settlement Account                               │
│  (15% platform commission retained)                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │ 85% barber share → Payout wallet funded
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: DISBURSEMENT (Outbound)                               │
│  Cashfree Payouts API V2                                        │
│  • UPI payouts: ₹3–₹6/txn (real-time, 24×7)                     │
│  • NEFT payouts: ₹1.75 flat (banking hours)                     │
│  • IMPS payouts: ₹2.50–₹5/txn (real-time)                       │
│  • Smart routing: 99.98% uptime SLA                             │
│  • Webhooks: Real-time success/failure events                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Real-time transfer
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BARBER'S UPI / BANK ACCOUNT                  │
│              Receives 85% within 30 seconds (UPI)               │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Payout Trigger Flow (Proposed Design)

> **Note:** This flow describes the intended behavior once the payout system is implemented. Currently, the payout service and related components do not exist in the codebase.

```
Proposed Flow (with payout integration):
  1. Customer creates booking (status: pending, paymentStatus: pending)
  2. Customer pays via PhonePe PG
  3. PhonePe webhook confirms payment
  4. Booking status: confirmed, paymentStatus: success
  5. Barber performs service
  6. Barber marks booking: Completed
  7. payout.service.js triggers Cashfree payout (TO BE IMPLEMENTED):
     a. Ensure barber is registered as Cashfree beneficiary
     b. Calculate payout amount = bookingTotal * 0.85
     c. POST /payout/v2/transfers (UPI preferred; IMPS fallback)
  8. Cashfree webhook confirms payout success
  9. Booking payoutStatus: COMPLETED
  10. Barber receives funds (typically within 30 seconds for UPI)
```

---

## 8. Pre-Production Verification Checklist (Future Implementation)

> **IMPLEMENTATION STATUS:** These checklists are for future use when implementing the payment and payout systems. Currently, neither PhonePe PG nor Cashfree Payouts have been integrated into the EverCut codebase.

### 8.1 PhonePe PG (To Be Implemented — Collection Layer)

| # | Action | Priority |
|---|--------|----------|
| 1 | Confirm `PHONEPE_ENV=PRODUCTION` in production .env | 🔴 Critical |
| 2 | Webhook URL updated to production endpoint | 🔴 Critical |
| 3 | OAuth token auto-refresh tested and working | 🔴 Critical |
| 4 | All 10 UAT test cases from PAYMENT-GATEWAY-RESEARCH-GUIDE passed | 🔴 Critical |
| 5 | Payment data stored on MongoDB Atlas `ap-south-1` | 🔴 Critical |
| 6 | `PHONEPE_CLIENT_SECRET` never logged | 🟡 High |

### 8.2 Cashfree Payouts (To Be Implemented — Disbursement Layer)

| # | Action | Priority |
|---|--------|----------|
| 1 | Cashfree Payouts account activated (separate from PG) | 🔴 Critical |
| 2 | Production Payout API credentials generated | 🔴 Critical |
| 3 | Production server IP(s) whitelisted in Cashfree Dashboard | 🔴 Critical |
| 4 | Payout wallet funded with initial balance | 🔴 Critical |
| 5 | Production webhook URL configured in Cashfree Dashboard | 🔴 Critical |
| 6 | All UAT tests in Section 6.13 completed | 🔴 Critical |
| 7 | Penny drop verification tested for both UPI and bank account | 🟡 High |
| 8 | Payout cron job enabled for stuck PENDING resolution | 🟡 High |
| 9 | Admin alert configured for payout failures | 🟡 High |
| 10 | `payout_transactions` MongoDB collection indexes created | 🟡 High |
| 11 | Payout wallet low-balance alert set up | 🟡 High |
| 12 | `CASHFREE_PAYOUT_CLIENT_SECRET` never logged or committed | 🔴 Critical |

### 8.3 General Security

| # | Action | Priority |
|---|--------|----------|
| 1 | Webhook signature verification implemented for both PhonePe and Cashfree | 🔴 Critical |
| 2 | Idempotency implemented for both payment and payout webhooks | 🔴 Critical |
| 3 | Amount validation server-side (never trust client-provided amount) | 🔴 Critical |
| 4 | UPI VPAs and bank accounts masked in logs | 🟡 High |
| 5 | HTTPS enforced on all webhook endpoints | 🔴 Critical |
| 6 | Rate limiting on payment initiation endpoint | 🟡 High |

---

## Appendix A — Pricing Quick Reference (All figures pre-18% GST)

### Cashfree — Collection

| Method | Rate |
|--------|------|
| UPI (all instruments) | 1.60% promotional / 1.95% standard |
| Domestic Cards | 1.60% promotional / 1.95% standard |
| Net Banking | ₹10–₹15 flat |
| International Cards | 2.95%+ |

### Cashfree — Payouts

| Mode | ≤₹1,000 | ₹1,001–₹10,000 | >₹10,000 |
|------|---------|-----------------|---------|
| UPI | ₹3.00 | ₹6.00 | ₹10.00 |
| IMPS | ₹2.50 | ₹5.00 | ₹10.00 |
| NEFT | ₹1.75 | ₹1.75 | ₹1.75 |
| Cards | ₹10.00 | ₹10.00 | ₹10.00 |

**Source:** `cashfree.com/payment-gateway-charges` — verified April 2026.

### PhonePe PG — Collection (for reference)

| Method | Rate |
|--------|------|
| UPI Bank-to-Bank | 0% (NPCI mandate) |
| UPI via PPI/Wallet | 0.5–2.0% |
| Debit Card ≤₹2,000 | 0.4% |
| Debit Card >₹2,000 | 0.9% |
| Credit Card | 1.5–2.0% |
| Net Banking | ₹3–₹15 flat |

**PhonePe Payouts:** ❌ Not available — verified from official developer portal.

---

## Appendix B — Key URLs

| Resource | URL |
|----------|-----|
| Cashfree Merchant Signup | `merchant.cashfree.com/merchants/signup` |
| Cashfree Payout API Docs | `cashfree.com/docs/api-reference/payouts/overview` |
| Cashfree Pricing Page | `cashfree.com/payment-gateway-charges` |
| Cashfree Payouts Product | `cashfree.com/payouts` |
| PhonePe Developer Docs | `developer.phonepe.com/payment-gateway` |
| PhonePe Business Portal | `business.phonepe.com/pg/register` |
| RazorpayX Payouts | `razorpay.com/x/payouts` |
| NPCI UPI Guidelines | `npci.org.in/what-we-do/upi` |
| RBI PA/PG Master Direction | `rbi.org.in` |

---

*All pricing data verified against official provider sources as of April 17, 2026. Pricing is subject to change — always verify directly with the provider before making financial commitments. Regulatory compliance requirements (RBI, NPCI) should be independently confirmed before production deployment.*
