# UPI API Research — Production-Grade Report

> **Compiled:** April 2026  
> **Scope:** Indian UPI ecosystem — providers, architecture, pricing, compliance, and implementation guidance  
> **Status:** Ready for architectural and financial decision-making. All unverified claims are explicitly labeled inline.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [UPI Ecosystem](#2-upi-ecosystem)
3. [Modern UPI Features](#3-modern-upi-features)
4. [API Providers](#4-api-providers)
5. [Pricing Analysis](#5-pricing-analysis)
6. [Comparison Table](#6-comparison-table)
7. [When to Use vs. When NOT to Use](#7-when-to-use-vs-when-not-to-use)
8. [Real-World Architecture Recommendations](#8-real-world-architecture-recommendations)
9. [Risks & Pitfalls](#9-risks--pitfalls)
10. [Compliance & Regulatory](#10-compliance--regulatory)
11. [Gaps & Uncertainties](#11-gaps--uncertainties)
12. [Final Verdict](#12-final-verdict)

---

## 1. Executive Summary

### 1.1 Key Insights

- The UPI network processes an estimated **20–22 billion transactions monthly** *(⚠️ forward projection — the last confirmed figure was ~15–17 billion as of Q2 2025; verify against current NPCI data)*, with annualized settlement exceeding USD 3.4 trillion. UPI integration is non-negotiable for any Indian market participant.

- **Zero MDR exists only at the network routing layer.** It does not apply to aggregator platform fees, which range from ~1.5%–2% (percentage-based) to ₹1.5–₹15 per transaction (flat-fee). All platform fees additionally attract **18% GST**, which is absent from most published pricing comparisons.

- **UPI P2P Collect has been actively restricted by NPCI** to combat social engineering fraud. Only P2M Collect remains active, restricted primarily to desktop-to-mobile scenarios where deep linking is impossible. `[Formal deprecation date requires NPCI circular confirmation]`

- **PSP banks (ICICI, Axis, Yes) levy infrastructure fees directly on Payment Aggregators.** These costs are passed downstream to merchants, eroding the practical value of "zero MDR" promises.

- **Percentage-based fees are punishing for high-ticket B2B transactions.** A ₹50,000 invoice costs ₹975–₹1,000 under 2% PA pricing, but only ₹7–₹8 via flat-fee providers like Hypto or Bulkpe — a difference of over 99%.

### 1.2 Top Recommendations — Quick Reference

| Goal | Best Provider | Why |
|---|---|---|
| Zero-cost B2C checkout | PhonePe PG | Promotional 0% MDR; best SDK ecosystem |
| Indie developer / MVP | Hypto or Bulkpe | Developer-first; no strict corporate docs required |
| High-volume payouts | Cashfree or Bulkpe | Flat-fee / tiered payout pricing at batch scale |
| Marketplace / Virtual Accounts | Decentro | Multi-bank failover; SaaS pricing; BaaS architecture |
| Recurring subscriptions (SaaS/Lending) | Setu (Pine Labs) | Native Autopay mandates; TPV; BBPS integration |
| Enterprise / true zero MDR | Direct Bank API (ICICI/Axis) | No aggregator markup; only viable at scale |
| Absolute zero-cost MVP | Raw UPI Intent URI | No PA; no fee; no automated reconciliation |

### 1.3 Best Providers by Category

- **Registered Startups:** PhonePe PG (collections) + Hypto/Bulkpe (payouts) — split architecture
- **Scale:** Decentro (BaaS) or Cashfree (high-volume batch payouts)
- **Low/Zero Cost Collections:** PhonePe PG promotional tier or raw UPI Intent URI
- **Low-Cost Payouts:** Hypto (₹1.5–₹7/txn) or Bulkpe (flat-fee, pay-as-you-go)
- **Complex Flows:** Setu for mandates and BFSI-regulated recurring; Decentro for virtual accounts and multi-vendor ledgering

---

## 2. UPI Ecosystem

### 2.1 Role of NPCI

The **National Payments Corporation of India (NPCI)** is the sole central authority that owns and operates the UPI switch. Its responsibilities include:

- Prescribing technical guidelines and managing the dispute resolution framework
- Facilitating real-time clearing and settlement
- Processing transactions at peak capacity exceeding **1 lakh transactions per minute (as of 2024)**, with ongoing infrastructure scaling
- Operating two key subsidiaries: **NPCI International Payments Limited (NIPL)** for cross-border UPI expansion, and **NPCI BHIM Services Limited (NBSL)** for the BHIM application ecosystem

NPCI's core switch validates Virtual Payment Addresses (VPAs), orchestrates secure message flows between acquiring and issuing banks, and dispatches final success or failure signals to all participating nodes.

### 2.2 UPI Technical Protocol

UPI is a payment protocol specification developed by NPCI, built atop **IMPS (Immediate Payment Service)** for real-time interbank settlement. The interbank communication layer of IMPS uses NPCI's proprietary message specification (conceptually influenced by ISO 8583-era design, but not ISO 8583 compliant). UPI's **network-level messaging** uses NPCI's UPI Technical Circular specification with XML-structured messages (closer to the ISO 20022 paradigm). The **developer-facing integration layer** presents a modern REST/JSON API abstraction.

> **Important:** ISO 8583 is a card-payment standard (debit/credit/ATM) and is not part of the UPI specification. The two must not be conflated in technical documentation.

UPI APIs allow developers and merchants to interact programmatically with the NPCI switch via PSP Banks or Payment Aggregators. The system operates over IMPS rails but abstracts all complexity into modern REST/JSON interfaces, enabling real-time, interoperable fund movement across any bank.

### 2.3 Entity Hierarchy

| Entity | Role | Examples |
|---|---|---|
| **NPCI** | Central switch, settlement, technical rules | — |
| **PSP Banks** | Direct connection to UPI switch; VPA creation; PIN validation | Axis Bank, Yes Bank, ICICI Bank, HDFC Bank |
| **TPAPs** | Consumer-facing UPI apps; partner with a PSP bank; do NOT hold customer funds | Google Pay, PhonePe (consumer app), BHIM, Cred |
| **Payment Aggregators (PAs)** | RBI-authorized intermediaries; pool and settle merchant funds; provide APIs/SDKs | PhonePe PG, Cashfree, Easebuzz |
| **Technology Service Providers (TSPs)** | API abstraction layers; do NOT pool funds; operate under a PA's authorization | Setu (under Pine Labs) |
| **BaaS Platforms** | Multi-bank API abstraction; may operate as TSP or PA depending on product | Decentro, Hypto |

**Critical distinction:** A TPAP (like the PhonePe consumer app) does not hold funds — it routes payment intents via its sponsor PSP bank. PhonePe's **Payment Gateway** is a completely separate B2B PA product.

### 2.4 Flow Types

#### UPI Collect (Pull)

- Merchant-initiated server-side request sent to the user's VPA
- NPCI routes the request to the user's TPAP app, triggering a push notification
- User must open the app, review, and authorize with UPI PIN
- Introduces moderate friction (app-switching, notification latency)
- **P2P Collect is actively restricted by NPCI** to combat social engineering fraud `[POST-CUTOFF — formal deprecation date requires NPCI circular]`. P2M Collect remains active, restricted to desktop-to-mobile scenarios where deep linking is impossible.
- Best for: B2B invoice payments, remote collections, desktop e-commerce

#### UPI Intent / Deep Links

- Merchant generates a `upi://pay?...` URI
- Mobile OS opens the user's preferred UPI app with parameters pre-filled
- User enters PIN only — no manual data entry required
- **The standard for mobile-native transactions**; dramatically improves conversion and reduces cart abandonment

**Full URI anatomy:**
```
upi://pay?pa=merchant@bank&pn=Merchant%20Name&tr=TXN12345&am=150.00&cu=INR&mc=5311
```

| Parameter | Name | Requirement |
|---|---|---|
| `pa` | Payee VPA | Mandatory |
| `pn` | Payee Name | Must match registered legal entity name |
| `tr` | Transaction Reference | Unique per transaction |
| `am` | Amount | Two decimal places |
| `cu` | Currency | INR only |
| `mc` | Merchant Category Code | Mandatory for P2M compliance |

> **⚠️ Security:** Client-side parameter tampering (amount or VPA modification) is a well-known attack vector. Architecture must rely **exclusively** on server-side webhook verification — never on client-side callback values.

#### UPI Autopay (e-Mandates / Recurring)

- User performs a one-time UPI PIN authentication to authorize a mandate
- Subsequent debits up to ₹15,000 execute automatically without additional authentication (per NPCI April 2021 circular — verify for any subsequent revision)
- For mandate amounts exceeding ₹15,000: 2FA is required for each debit execution
- Pre-debit notification mandatory: customers must receive notice at least 24 hours before execution
- **Execution window restriction:** Autopay during peak network hours is reportedly prohibited. The specific time bands cited (10:00 AM–1:00 PM and 5:00 PM–9:30 PM) are `[UNVERIFIED — requires NPCI circular before engineering reliance]`
- Applicable for: SaaS subscriptions, loan EMI, SIP investments, insurance premiums

#### UPI Payouts (Push)

- Entirely backend-driven push from merchant's nodal account to a user's VPA or bank account
- Zero end-user interaction required
- Routed over IMPS or UPI credit transfer rails
- Essential for: gig-economy disbursements, vendor settlements, refunds, marketplace payouts
- **Payouts universally incur per-transaction API fees** — government zero MDR does not apply to payouts
- **Idempotency is critical:** inject unique `referenceId` values on every call; providers reject duplicates to prevent double-disbursements

---

## 3. Modern UPI Features

### 3.1 UPI Lite

**Status:** Launched August 2022 (pilot); expanded commercially 2023–2024. Verified from NPCI official documentation.

UPI Lite is an on-device prepaid wallet funded from the user's linked bank account, designed for small-value transactions.

| Parameter | Value |
|---|---|
| Transaction limit | ₹500 per transaction |
| Wallet balance limit | ₹2,000 maximum on-device |
| Authentication | No UPI PIN required |
| Connectivity | Works in low/no-connectivity environments |
| Settlement | Instant debit; no real-time bank server round-trip per transaction |

**UPI Lite X:** An offline NFC-based variant piloted for tap-to-pay use cases.

**Developer implications:**
- UPI Lite transactions appear with different metadata in merchant reconciliation feeds compared to standard UPI flows. Standard Collect/Intent webhooks do not capture them identically.
- No separate integration is needed to *accept* UPI Lite — the user's TPAP handles it client-side. However, **PA webhook handlers must gracefully parse UPI Lite metadata flags** or reconciliation will break.
- Build UPI Lite metadata handling into webhook parsers from Day 1.

### 3.2 UPI Plug-in (In-App Payments)

**Status:** Launched by NPCI in 2024.

UPI Plug-in allows users to complete UPI payments **within the merchant's own app** without being redirected to a third-party UPI app. This is architecturally different from UPI Intent, which requires an OS-level app switch.

**Developer implications:**
- Eliminates drop-off caused by app-switching in Intent flows
- User authenticates directly within the merchant's app via a lightweight in-app SDK
- Requires integration with an NPCI-certified PSP bank or PA that supports UPI Plug-in
- Not all aggregators have certified support — verify with your chosen PA before architectural decisions

### 3.3 UPI Circle (Delegated Payments)

**Status:** Launched by NPCI, August 2024. Verified.

Primary account holders can delegate payment capability to secondary devices or users with hard limits:

| Limit | Value |
|---|---|
| Per-transaction | ₹5,000 |
| Monthly cap | ₹15,000 |

Delegated device transactions appear with a different authorization principal in transaction metadata. Reconciliation and fraud logic must account for this.

### 3.4 UPI Reserve Pay (Single Block Multiple Debits)

Also known as UPI One Time Block (OTB). Blocks a customer-authorized amount in their bank account; the merchant can then initiate multiple smaller debits against the block without requiring repeated UPI PIN entry.

| Parameter | Value | Status |
|---|---|---|
| Maximum block amount | ₹1,00,000 (₹1 lakh) per customer per merchant | `[Requires verification against current NPCI Reserve Pay circular]` |
| Block duration | Up to 90 days | Consistent with available information |
| Retry on timeout | Up to 3 times within 24 hours | — |

**Use cases:** Hotel hold, securities margin, travel booking pre-authorization.

### 3.5 API Rate Limiting

**Status:** `[POST-CUTOFF — requires NPCI circular verification]` — Reportedly effective August 2025.

| API | Reported Limit |
|---|---|
| Balance Check | 50 requests/user/app/day |
| List Account | 25 requests/day |
| Transaction Status Polling | Max 3 attempts per transaction; 90-second mandatory gap |

Do not hard-engineer against these figures until confirmed via an official NPCI circular.

---

## 4. API Providers

> **Note:** Razorpay is outside the scope of this document. Its existence as a major RBI-licensed PA is noted in Section 11.

---

### 4.1 PhonePe Payment Gateway

| Attribute | Detail |
|---|---|
| **Type** | Payment Aggregator / Gateway (B2B product, separate from PhonePe consumer app) |
| **Portal** | developer.phonepe.com |
| **Sandbox** | Available |

**Capabilities:**
- UPI Intent, Standard Checkout, Dynamic QR generation
- UPI Autopay / subscription management
- UPI Collect (P2M)
- Native SDKs: Java, Node.js, Python, PHP, Android, iOS, Flutter

**Onboarding:**
- Fully digital; accepts freelancers, sole proprietors, MSMEs (Udyam registration accepted)
- Production access requires: UAT sign-off via PhonePe Simulator; merchant app package name whitelisted
- Approval: **24–48 hours**

**Security:**
- All API requests require base64-encoded JSON payload + `X-VERIFY` header
- Formula (verified against PhonePe PG v2 API documentation):
  ```
  X-VERIFY = SHA256(Base64(Payload) + "/api/endpoint" + SaltKey) + "###" + SaltIndex
  ```
- All inbound webhooks must be validated server-side using this signature

**Limitations:**
- Promotional zero-fee pricing may be time-limited (see Pricing section)
- Payout API exists (Money Transfer APIs) but is not the platform's primary strength
- Not optimal for high-volume programmatic vendor payouts

**Notes:** Most mature SDK ecosystem among Indian aggregators. Best suited for B2C mobile applications.

---

### 4.2 Cashfree Payments

| Attribute | Detail |
|---|---|
| **Type** | Payment Aggregator & Payouts Infrastructure |
| **Portal** | cashfree.com |
| **Sandbox** | sandbox.cashfree.com (immediately accessible, before KYC) |

**Capabilities:**
- Payment Gateway: UPI, Cards, Net Banking, Wallets
- Payouts V3: synchronous and asynchronous transfers; bulk batch transfers to UPI VPAs
- Batch throughput: up to **1,000 Transactions Per Minute (TPM)** *(self-reported marketing figure)*
- Token Vaults, Subscription APIs, Penny Drop / VPA verification

**Onboarding:**
- Standard corporate KYC; immediate sandbox access before completing formalities
- Approval: **24–48 hours**

**Security:**
- Static API keys: `x-client-id`, `x-client-secret`
- Mandatory idempotency key (`referenceId`) on all payout requests
- Payout flow: `POST /payout/v1/addBeneficiary` → `POST /payout/v1/requestTransfer`
- Payouts return PENDING synchronously; SUCCESS/FAILED delivered via webhook

**Limitations:**
- Payout fees are always chargeable (₹3–₹15/txn)
- Not ideal if the primary objective is cost-minimizing simple B2C collections

**Notes:** Best-in-class for enterprise batch disbursement.

---

### 4.3 Decentro

| Attribute | Detail |
|---|---|
| **Type** | Banking-as-a-Service (BaaS) Platform |
| **Portal** | docs.decentro.tech |
| **Sandbox** | Available |

**Capabilities:**
- Programmatic creation of Virtual Bank Accounts linked to unique UPI IDs
- Payouts V3: JSON abstraction over ICICI, Axis, Yes Bank
- Automated webhook reconciliation, Escrow management, Bulk Payout JSON API
- Dynamic vendor payment splitting for marketplace ledgering
- Multi-bank failover ("Consumer URN" routing selects the most reliable bank in real-time)
- T+0 (same-day) settlement available (plan-dependent)

**Onboarding:**
- Full corporate KYC required: Certificate of Incorporation, GSTIN, Director PAN
- Approval: **3–5 days**

**Security:**
- Clean JSON REST APIs abstracting bank-level ISO/XML schemas
- Consumer URN routing for dynamic bank selection
- PENDING returned synchronously; SUCCESS/FAILED via webhook

**Limitations:**
- Not accessible to unregistered indie developers
- SaaS API charges apply on advanced payout and ledgering requests
- Suboptimal for simple B2C consumer checkout

**Notes:** ₹40,000 crores+ annually processed; 99.9% uptime SLA *(self-reported — requires independent verification)*. Best choice for marketplaces requiring automated reconciliation and high-availability payout infrastructure.

---

### 4.4 Setu (A Pine Labs Company)

| Attribute | Detail |
|---|---|
| **Type** | Technology Service Provider (TSP) / Unified Merchant Acquisition Platform (UMAP) |
| **Portal** | docs.setu.co |
| **Auth** | OAuth / JWT Bearer Token |

> **⚠️ Structural note:** Setu operates strictly as a **TSP**, not as an independently licensed Payment Aggregator. Following its acquisition by Pine Labs (2022–2023), Setu operates under Pine Labs' RBI PA authorization. **Actual fund flows go through Setu's acquiring partners, not Setu directly.** Confirm current structure with Setu/Pine Labs before architectural decisions.

**Capabilities:**
- UPI Deep Links (Intent generation)
- UPI Autopay / recurring mandates:
  ```
  POST /v1/merchants/mandates
  Body: { amountRule: "max", autoExecute: true }
  ```
- Third-Party Validation (TPV) — required for mutual fund and lending platforms
- UPI Collect (P2M), BBPS integration
- Create Merchant API + Create VPA API for programmatic sub-merchant onboarding at scale

**Onboarding:**
- Modular via UMAP interface; VPA must be registered through Setu's Express Ledger before production
- Approval: **3–5 days**

**Limitations:**
- Overkill for simple one-off e-commerce checkouts
- Pricing is module-specific and not publicly disclosed
- TSP routing introduces an additional compliance layer — relevant for architectural planning

**Notes:** Best-in-class for BFSI-regulated recurring billing: WealthTech, LendTech, insurance, SaaS subscriptions requiring TPV compliance.

---

### 4.5 Bulkpe

| Attribute | Detail |
|---|---|
| **Type** | Payout-Specialized Fintech / API Payments Platform |
| **Portal** | bulkpe.in |

**Capabilities:**
- High-volume programmatic payouts via UPI, IMPS, NEFT, RTGS
- Bulk Payout API; pay-as-you-go model

**Onboarding:** Designed for MSMEs and indie developers; minimal corporate documentation required.

**Limitations:**
- Primarily a payout platform — not a checkout/collections gateway
- Exact pricing not publicly disclosed; requires direct engagement at bulkpe.in
- API documentation quality not independently assessed

**Notes:** Flat-fee, pay-as-you-go model is its defining differentiator against percentage-based gateways. Best suited for gig-economy disbursements, reverse logistics settlements, and marketplace vendor payouts. **All pricing requires verification before financial modeling.**

---

### 4.6 Hypto

| Attribute | Detail |
|---|---|
| **Type** | API-First Banking Infrastructure / BaaS |
| **Portal** | hypto.in/docs |

**Capabilities:**
- VPA creation and validation (Penny Drop)
- Virtual account collections (stated: ₹8 flat/transaction)
- Programmatic payouts (stated: ₹1.5–₹7/transaction tiered)
- Custom wallet and ledger primitives

**Sample payout payload:**
```json
{
  "amount": 5000,
  "payment_type": "UPI",
  "upi_id": "vendor@bank",
  "note": "Invoice #1234",
  "udf1": "internal_ref_567"
}
```

**Onboarding:** Accepts unregistered businesses and solo developers; immediate sandbox access.

**Limitations:**
- B2B / developer-facing only — not a consumer checkout solution
- ₹8/collection flat fee is expensive for high-frequency, low-value inflows
- GST inclusion in stated pricing is unconfirmed — verify directly

**Notes:** Transparent flat-fee architecture uniquely suited for high-ticket B2B. Stated as the most affordable payout pricing among named providers. **All pricing requires verification at hypto.in/docs before financial commitment.**

---

### 4.7 Easebuzz

| Attribute | Detail |
|---|---|
| **Type** | Payment Aggregator (Mid-Tier, B2B Focus) |
| **Portal** | easebuzz.in |

**Capabilities:**
- **InstaCollect:** Virtual accounts and static/dynamic QR codes for NEFT, RTGS, IMPS, UPI collections
- **Easebuzz Slices:** Automated splitting of incoming payments across multiple sub-vendor accounts
- Invoice reconciliation APIs, UPI payment gateway

**Onboarding:** Standard PA KYC required.

**Limitations:**
- Percentage-based pricing (~1.5%) is expensive for high-ticket B2B vs. flat-fee alternatives
- Payout fees, settlement speed, and approval timeline not publicly specified

**Notes:** Strong fit for B2B SaaS, edtech, and real estate platforms needing automated invoice-to-bank reconciliation and multi-vendor splitting. InstaCollect is a standout module.

---

### 4.8 Direct Bank APIs (Axis / Yes / ICICI / HDFC)

| Attribute | Detail |
|---|---|
| **Type** | PSP Bank Infrastructure (Direct Integration) |

**Capabilities by bank:**

| Bank | Key Capability |
|---|---|
| **Axis Bank (Neo API Portal)** | 37+ UPI APIs; Beneficiary Enquiry; dynamic QR; status polling; custom form validation |
| **Yes Bank** | API-triggered transactions from ERP environments |
| **ICICI Bank (Corporate API Suite)** | ~250 APIs; RSA/AES hybrid payload encryption; direct corporate current account clearing |
| **HDFC Bank (SmartHub Vyapar)** | Merchant payment solutions; limited public technical detail available |

All banks: Direct access to the NPCI switch; **true zero MDR** on standard account-to-account transactions.

**Onboarding:**
- Existing high-value corporate banking relationship mandatory
- Stringent bank-mandated security audits; extensive offline paperwork; multi-week UAT sign-offs
- Integration timeline: **4–8 weeks**
- Axis Bank: Static IP whitelisting + two-way SSL with bank-signed CSRs
- ICICI Bank: Full JSON payload encrypted via RSA/AES before HTTPS transmission

**API portals:** Axis: `apiportal.axis.bank.in` | ICICI: `icici.bank.in/business-banking` | Yes Bank: `yes.bank.in/digital-banking`

**Fees:**
- Zero MDR on standard transactions
- Axis Bank: ₹25/Merchant ID/month maintenance *(requires verification at apiportal.axis.bank.in)*
- Significant hidden costs: security audits, CSR exchange, SSL infrastructure

**Limitations:**
- Inaccessible to startups and indie developers without established corporate banking relationships
- Stringent rate limiting — Axis Bank: 5-minute minimum for first status query; 30-minute for subsequent checks
- Only financially rational for high-volume enterprises that have outgrown aggregator pricing

---

### 4.9 Raw UPI Intent URI

| Attribute | Detail |
|---|---|
| **Type** | Direct P2M URI — No PA Required |
| **Transaction Fee** | ₹0 |
| **Reconciliation** | Manual only (user-submitted UTR) |
| **Trade-off** | No automated verification; no server-side confirmation; not scalable |

> **Practical alternative:** UPI Payment Links (offered by Cashfree and PhonePe) provide a middle ground — no SDK or backend required, with automated webhook confirmation. Often free or near-free at low volumes and more practical than raw URI for zero-code MVP scenarios.

---

## 5. Pricing Analysis

> **⚠️ Before using any figure below:**
> - All PA platform fees attract **18% GST** on top of the stated rate — add it to every financial model.
> - Volume discounts exist at Cashfree, PhonePe, and others — organizations processing >₹50 lakh/month should negotiate custom rates.
> - PA settlement float (T+1 to T+3 fund hold) creates a hidden opportunity cost at scale.
> - All pricing marked "requires verification" must be confirmed directly with the provider before any financial commitment.

---

### 5.1 PhonePe Payment Gateway

| Fee Type | Amount | Status |
|---|---|---|
| Setup / Onboarding | ₹0 | Verified |
| Annual Maintenance | ₹0 (waived) | Verified |
| UPI Collection (Standard Plan) | **0% OR 1.95%** — see note | Conflicting |
| RuPay Credit Card / PPI-funded UPI | Standard MDR applies; not covered by 0% promo | Estimated |
| Payout Fees | Not officially disclosed | Not disclosed |

**Pricing note:** Both figures appear simultaneously valid under different conditions. The 0% promotional rate applies to **bank-account-funded standard UPI P2M transactions only** and likely excludes RuPay Credit Card UPI, PPI-funded payments, and certain high-risk merchant categories. The ~1.95% reflects the baseline for non-promotional arrangements. **Verify at developer.phonepe.com/payment-gateway/pricing before any financial commitment.**

---

### 5.2 Cashfree Payments

| Fee Type | Amount | Status |
|---|---|---|
| Setup / Onboarding | Not disclosed | Not disclosed |
| UPI Collections | 0% or minimal (volume-negotiated) | Partially verified |
| Payout Fees | ₹3–₹15/txn (tiered by amount and routing rail) | Partially verified |
| Settlement | Negotiable; T+0 available for some tiers | Partially verified |

---

### 5.3 Decentro

| Fee Type | Amount | Status |
|---|---|---|
| Setup / Onboarding | Not disclosed | Not disclosed |
| Collections | SaaS / per-API-call (not percentage-based) | Requires quotation |
| Payout Fees | Flat per-API-call SaaS rate | Requires quotation |
| Settlement | T+0 available (plan-dependent) | Partially verified |

**Key economic advantage:** Per-API-call pricing means a ₹5,00,000 bulk settlement costs the same as a ₹5,000 transfer — dramatically more efficient than percentage-based fees at high AOV. Exact rates require direct engagement with Decentro's sales team.

---

### 5.4 Setu (Pine Labs)

| Fee Type | Amount | Status |
|---|---|---|
| All fees | Module-specific; negotiated per entity and volume | Not publicly available |

Requires direct sales engagement.

---

### 5.5 Bulkpe

| Fee Type | Amount | Status |
|---|---|---|
| Setup / Onboarding | Minimal (pay-as-you-go model) | Estimated |
| Payout Fees | Flat-fee per transaction (exact amount undisclosed) | Not disclosed |
| Collection Fees | Not disclosed | Not disclosed |

Requires direct engagement at bulkpe.in before any financial modeling.

---

### 5.6 Hypto

| Fee Type | Amount | Status |
|---|---|---|
| Collections (Virtual Account) | ₹8 flat/transaction | Unconfirmed — requires verification |
| Payout Fees | ₹1.5–₹7/transaction tiered | Unconfirmed — requires verification |
| GST inclusion | Unknown | Verify directly |

---

### 5.7 Easebuzz

| Fee Type | Amount | Status |
|---|---|---|
| UPI Collections | ~1.5% (percentage-based) | Partially verified |
| Payout Fees | Not disclosed | Not disclosed |

---

### 5.8 Direct Bank APIs

| Fee Type | Amount | Status |
|---|---|---|
| UPI Collections | ₹0 MDR | Verified |
| UPI Payouts | ₹0 MDR | Verified |
| Axis Bank maintenance | ₹25/Merchant ID/month | Unconfirmed — verify directly |
| Hidden costs | Security audits, CSR exchange, SSL infrastructure | Verified |

---

### 5.9 GST Impact on Platform Fees

All PA platform fees attract 18% GST. Real effective costs:

| Scenario | Base Fee | + 18% GST | Effective Cost |
|---|---|---|---|
| Cashfree payout at ₹15/txn | ₹15 | ₹2.70 | **₹17.70** |
| Hypto payout at ₹7/txn | ₹7 | ₹1.26 | **₹8.26** |
| Easebuzz 1.5% on ₹50,000 | ₹750 | ₹135 | **₹885** |
| PhonePe 1.95% on ₹50,000 | ₹975 | ₹175.50 | **₹1,150.50** |

---

## 6. Comparison Table

> ❓ = Not specified | ⚠️ = Conflicting or unverified | ✅ = Confirmed | ❌ = Not offered

| Feature / Metric | PhonePe PG | Cashfree | Decentro | Setu | Bulkpe | Hypto | Easebuzz | Direct Bank |
|---|---|---|---|---|---|---|---|---|
| **Type** | PA / Gateway | PA + Payouts | BaaS | TSP / UMAP | Payout Platform | API BaaS | PA (Mid-Tier) | PSP Bank |
| **UPI Collect (P2M)** | ✅ | ✅ | ✅ | ⚠️ Intent-first | ❓ | ✅ | ✅ | ✅ |
| **UPI Intent / Deep Links** | ✅ | ✅ | ✅ | ✅ | ❓ | ✅ | ✅ | ✅ |
| **UPI Autopay / Mandates** | ✅ | ✅ | ❓ | ✅ Core strength | ❓ | ❓ | ❓ | ✅ |
| **UPI Payouts** | ⚠️ Exists; not primary | ✅ Core strength | ✅ Core strength | ❓ | ✅ Core strength | ✅ Core strength | ❓ | ✅ |
| **Virtual Accounts** | ❓ | ✅ | ✅ | ✅ Express Ledger | ❓ | ✅ | ✅ InstaCollect | ✅ |
| **Bulk / Batch Payouts** | ❌ | ✅ 1,000 TPM | ✅ | ❓ | ✅ | ✅ | ❓ | ✅ |
| **Multi-Bank Failover** | ❓ | ❓ | ✅ Core feature | ❓ | ❓ | ❓ | ❓ | ❌ |
| **Sub-Merchant Onboarding** | ❓ | ❓ | ❓ | ✅ UMAP API | ❓ | ❓ | ✅ Slices | ❌ |
| **BBPS Integration** | ❓ | ❓ | ❓ | ✅ | ❓ | ❓ | ❓ | ❓ |
| **TPV (Securities/Lending)** | ❓ | ❓ | ❓ | ✅ | ❓ | ❓ | ❓ | ❓ |
| **Collection Fee** | ⚠️ 0%–1.95% | 0% or minimal | SaaS/volume | Module-specific | Not disclosed | ₹8/txn | ~1.5% | ₹0 MDR |
| **Payout Fee** | ⚠️ Not primary | ₹3–₹15/txn | SaaS/volume | Not primary | Flat (undisclosed) | ₹1.5–₹7/txn | Not disclosed | ₹0 MDR |
| **GST on Fees** | +18% | +18% | +18% | +18% | +18% | +18% | +18% | N/A |
| **SDK Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Approval Speed** | 24–48 hrs | 24–48 hrs | 3–5 days | 3–5 days | Low–Medium | Very Low | Medium | 4–8 weeks |
| **Settlement Speed** | T+1 standard | Negotiable; T+0 | T+0 available | Negotiable | Not specified | Not specified | Not specified | Real-time |
| **Startup Friendliness** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Scalability** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Corporate KYC Required** | No (MSME friendly) | Yes | Yes | Yes | Minimal | No | Yes | Yes + banking relationship |

---

## 7. When to Use vs. When NOT to Use

### PhonePe Payment Gateway

**Use when:** Building B2C mobile apps; targeting MSMEs or sole proprietors; rapid deployment (24–48 hrs) is a priority; needing the broadest SDK coverage; zero or near-zero collection fees are the primary constraint.

**Avoid when:** High-volume programmatic payouts to vendors are the primary need; complex sub-merchant ledgering or marketplace splitting is required.

---

### Cashfree Payments

**Use when:** Enterprise-grade batch payout throughput is needed; operating a marketplace requiring simultaneous disbursements to many vendors; immediate sandbox access before KYC is important.

**Avoid when:** Payout costs are the primary constraint (₹3–₹15/txn + GST accumulates at scale); primary use case is simple, low-volume B2C checkout.

---

### Decentro

**Use when:** Building a marketplace requiring dynamic virtual account issuance per vendor or order; multi-bank failover and 99.9%+ uptime are required; high-ticket B2B makes percentage-based fees prohibitive; automated multi-vendor ledgering or escrow is needed; T+0 settlement is a cash-flow requirement.

**Avoid when:** Unregistered indie developer; primary use case is simple consumer checkout; budget cannot support SaaS API call charges.

---

### Setu (Pine Labs)

**Use when:** Products require complex recurring mandate rules for BFSI, WealthTech, or LendTech; TPV is a regulatory requirement; BBPS integration is needed; programmatic sub-merchant onboarding at platform scale is required.

**Avoid when:** Simple one-off e-commerce checkout; pricing transparency is required upfront; a primary payout platform is needed.

---

### Bulkpe

**Use when:** High-volume flat-fee vendor or gig-worker payouts are the primary need; rapid capability without extensive corporate documentation.

**Avoid when:** Complex collection or checkout functionality is needed; pricing must be confirmed before building.

---

### Hypto

**Use when:** High-ticket B2B transactions where flat ₹7–₹8/txn vastly outperforms percentage-based fees; building a neobank MVP or custom wallet; Penny Drop / VPA validation is required; solo developer or unregistered business.

**Avoid when:** High-frequency, low-value inflows make ₹8/collection economically non-viable; consumer-facing checkout UI is required.

---

### Easebuzz

**Use when:** B2B SaaS, edtech, or real estate platform needing invoice-to-bank reconciliation; automated multi-vendor payment splitting (Slices) is specifically required.

**Avoid when:** High-ticket transactions where 1.5% + GST is prohibitive; payout capability is a primary requirement.

---

### Direct Bank APIs

**Use when:** Enterprise processing tens of thousands of transactions monthly where aggregator fees exceed direct bank fixed costs; zero MDR with no intermediary is a strict requirement; high-value corporate banking relationship already exists.

**Avoid when:** Startup or indie developer; integration speed is critical; engineering team is small or lacks financial-cryptography expertise.

---

### Raw UPI Intent URI

**Use when:** Zero-budget MVP or personal project; volume is very low (<10–20/day) and manual UTR verification is feasible; no backend infrastructure exists.

**Avoid when:** Scale beyond a handful of daily transactions is expected; automated payment confirmation is required; B2B, marketplace, or subscription flows are involved.

---

## 8. Real-World Architecture Recommendations

### 8.1 MVP / Pre-Revenue (0–6 months)

**Goal:** Validate product with real payments at minimal cost and friction.

1. Register as MSME (Udyam) or individual entity — unlocks simplified KYC at most PAs
2. Use **PhonePe PG** for all incoming collections — 24–48 hour onboarding; zero fees under current promotional plan; best SDKs for rapid integration
3. Consider **UPI Payment Links** (Cashfree/PhonePe) as a zero-code middle ground — no SDK or backend required, with automated webhook confirmation
4. For payouts: use **Hypto** or **Bulkpe** — flat-fee disbursements without upfront corporate documentation

**Engineering requirements from Day 1:**
- Webhook signature validation on every inbound payload
- Idempotency keys on all write operations
- Exponential backoff polling as webhook fallback
- Never assume client-side success — validate server-side on every transaction

---

### 8.2 Early Revenue / Growth (6–24 months)

**Goal:** Scale infrastructure; add recurring billing and payout automation; protect unit economics.

1. Evaluate if PhonePe PG promotional pricing is still active; plan for potential reversion
2. Add **Cashfree Payouts** if batch disbursement volume justifies per-transaction fees
3. For recurring billing: add **Setu** for BFSI/WealthTech mandates, or use PhonePe Autopay for consumer SaaS
4. Implement TSP / Split Payment architecture for any marketplace flows — route funds directly buyer-to-seller; avoid PA licensing requirements
5. Add UPI Lite metadata parsing to all webhook handlers; implement 20-business-day dispute hold before marking revenue as final

---

### 8.3 Scale / Enterprise (24+ months)

**Goal:** Eliminate aggregator markup; maximize operational efficiency; achieve regulatory completeness.

1. Migrate to **Decentro BaaS** for dynamic virtual account issuance and automated multi-vendor ledgering
2. Benchmark direct bank API integration (Axis/ICICI) — migrate if aggregator fees exceed direct bank fixed costs
3. Engage with **Setu UMAP** for programmatic sub-merchant onboarding at platform scale
4. Obtain PA-CB authorization if accepting payments from international customers in foreign currencies
5. Ensure compliance with NPCI API Rate Limiting rules `[POST-CUTOFF — verify current circular]` and Autopay execution windows `[UNVERIFIED — requires NPCI circular]`

---

## 9. Risks & Pitfalls

### 9.1 Security Risks

**UTR Spoofing**
The most common UPI merchant fraud. An attacker initiates a payment, captures or fabricates the UTR, and submits it claiming payment was made — without any actual fund transfer. **Never use UTR as a primary payment confirmation signal.** Validate success exclusively via server-side PA webhook or Status API. UTR is only useful for reconciliation after webhook-confirmed success.

**Client-Side Parameter Tampering (Intent)**
Intent URI parameters (`am`, `pa`) are visible and modifiable client-side before the OS intercepts the Intent. All transaction parameters must be validated server-side. The correct flow: Intent dispatched → user pays → NPCI signals PA → PA webhooks merchant server → server confirms before releasing goods/services.

**Webhook Replay Attacks**
Previously valid webhook payloads can be replayed to trigger duplicate order processing. Validate signature on every webhook; maintain an idempotency log of processed event IDs; reject replayed events.

---

### 9.2 Compliance Risks

**Operating as an Unregistered Payment Intermediary**
Pooling third-party funds in a personal or company account without a PA license violates RBI's PA regulations and the PSS Act. Use TSP/Split Payment architecture until PA licensing is confirmed. This is the most common startup mistake when building marketplaces.

**Data Localization Violation**
All UPI transaction data, VPA strings, and user telemetry must be stored on India-resident servers per NPCI mandate. Cloud architectures using only non-India regions (AWS us-east-1, GCP europe-west, etc.) are non-compliant. Use AWS ap-south-1, GCP asia-south1, or Azure India Central.

**PA-CB Licensing Gap**
Accepting payments from international customers in foreign currencies without a separate PA-CB authorization is a regulatory violation. Standard PA-O does not cover cross-border collections.

**GST Non-Compliance**
PA platform fees carry 18% GST. Failure to reconcile this separately for GST returns results in tax inefficiency. Build GST reconciliation into accounting integrations from Day 1.

---

### 9.3 Operational Risks

**Webhook Failure Without Fallback**
Webhooks are not guaranteed delivery. Implement exponential backoff Status API polling as a mandatory fallback — never rely solely on webhooks for payment confirmation.

**Double Disbursements**
Payout API timeouts leave the transaction in an ambiguous state. Retrying without the same idempotency key triggers a second disbursement. Always inject a unique, stable `referenceId`; retry only with the same ID; validate before retrying.

**Autopay Pre-Debit Notification Failures**
NPCI mandates a minimum 24-hour pre-debit notification before Autopay execution. Notification failures increase dispute rates. Use multi-channel notifications (SMS + push + email); log delivery confirmations.

**UPI Lite Reconciliation Gaps**
Webhook handlers built without UPI Lite awareness silently misclassify these transactions. Ensure all webhook parsers handle UPI Lite metadata fields gracefully.

---

## 10. Compliance & Regulatory

### 10.1 RBI Master Direction on Payment Aggregators

`[A September 15, 2025 date has been cited for this Master Direction. Verify against the actual official circular before compliance decisions.]`

**Licensing & Capitalization:**
- All non-bank PAs require explicit RBI authorization
- Minimum net worth: **₹15 crore** at application; **₹25 crore** by end of Year 3
- Three categories: **PA-O** (Online), **PA-P** (Physical POS), **PA-CB** (Cross-Border) `[formal enactment requires circular verification]`

**PA-CB (Cross-Border):** Governs entities collecting foreign-currency payments from international customers for Indian merchants. A **separate authorization** from PA-O/PA-P — non-negotiable for startups accepting inbound international payments.

**Escrow Segregation:**
- Merchant funds must be held in dedicated escrow accounts at Scheduled Commercial Banks
- Cross-border entities must strictly separate Inward (InCA) and Outward (OCA) Collection Accounts
- Commingling domestic and international flows is prohibited

**Simplified Merchant Onboarding:**
- Alternate KYC permitted for merchants with annual domestic turnover ≤ ₹40 lakh or export turnover ≤ ₹5 lakh
- Requirements: PAN / Form 60 + one Officially Valid Document + business premise verification

---

### 10.2 NPCI Data Security and Localization

- **Data Localization:** All payment data must be stored exclusively on India-resident servers. No exceptions.
- **PIN Handling:** Applications are prohibited from storing or caching UPI PINs. VPA validation must be dynamic; credentials must be tokenized.
- **Audit Standards:** TPAPs and direct-integration merchants are subject to periodic assessments covering cybersecurity, fraud vectors, and PCI-DSS compliance.

---

### 10.3 TSP / Split Payment Architecture

Startups that never touch the flow of funds qualify as **Technology Service Providers (TSPs)** rather than PAs, eliminating the PA licensing requirement. Split Payment APIs route funds directly from buyer to seller while simultaneously slicing the platform's technology fee. The startup receives a technology fee, never pooling third-party funds.

**Important:** Even TSPs must comply with NPCI's technical standards. Touching payment data — even without holding funds — triggers NPCI data security standards, PCI-DSS scope assessment, and periodic technical audits.

---

### 10.4 Zero MDR — The Full Picture

| Layer | MDR Applicable? | Notes |
|---|---|---|
| Standard bank-to-bank UPI (P2P / P2M) | ❌ Zero | Government mandate since January 1, 2020 |
| PA platform / technology fee | ✅ Yes | 1.5%–2% or flat SaaS; separate from MDR; attracts 18% GST |
| UPI via Prepaid Payment Instruments (PPIs) | ✅ 0.5%–2.0% | When user pays from a digital wallet |
| RuPay Credit Card on UPI (> ₹2,000) | ✅ **0.5%–1.8%** | Per NPCI 2022 circular; 1.8% cap for premium merchant categories |
| RuPay Credit Card on UPI (≤ ₹2,000) | ❌ Zero | Zero interchange below threshold |
| Fuel (petrol pump) transactions | ❌ Zero | Zero interchange regardless of amount |
| PSP bank infrastructure fees to PAs | ✅ Yes | Passed downstream to merchants |

---

### 10.5 BHIM Infrastructure

BHIM operates on the same UPI rails as all other TPAPs. **No special BHIM-specific API is needed** to accept payments from BHIM users — standard UPI Intent/Collect flows are fully compatible. Building a BHIM-like application requires a TPAP license (₹25 crore net worth, PSP bank partnership, full NPCI certification) and is completely inaccessible to startups or indie developers.

---

### 10.6 UPI Dispute and Chargeback Flow

| Stage | Timeline | Responsibility |
|---|---|---|
| Customer raises dispute | Reports to issuing bank / TPAP | Immediate |
| First response from acquirer | Within 3 banking days | Acquiring PA / PSP Bank |
| Final resolution | Within 15 banking days (~20 calendar days) | NPCI dispute arbitration |
| Auto-reversal (timeout transactions) | Within T+1 business day | Automatic via NPCI |

**Chargeback exposure:** Intent flows (user-initiated) generally carry lower merchant liability than Collect flows (merchant-initiated).

**Developer requirements:**
- Implement a minimum **20-business-day hold** before marking disputed transactions as final revenue
- Configure PA dispute webhook events to automatically update order status in your backend

---

### 10.7 NACH vs. UPI Autopay

| Feature | NACH | UPI Autopay |
|---|---|---|
| Settlement speed | Next-day (batch) | Real-time, instant |
| Setup process | Signed physical or digital mandate via bank | One-time UPI PIN in-app |
| Per-debit authentication | None after setup | None for amounts ≤ ₹15,000 |
| Common use cases | High-value EMI/SIP (>₹15,000), bank-debited subscriptions | Consumer subscriptions, insurance premiums, SIP ≤ ₹15,000 |
| Developer complexity | Higher | Lower |

For high-value recurring mandates (>₹15,000), NACH remains dominant — particularly for EMI collections, mutual fund SIPs, and insurance. UPI Autopay is preferred for lower-value consumer subscriptions.

---

### 10.8 Cross-Border UPI — NIPL Overview

**NPCI International Payments Limited (NIPL)** is NPCI's wholly-owned subsidiary for international expansion. UPI acceptance is active in UAE, Singapore, France, Bhutan, Nepal, Sri Lanka, and other countries via NIPL partnerships.

- **UPI One World:** Prepaid instrument for international visitors to India, enabling UPI usage without an Indian bank account
- **Developer API access:** Direct integration for cross-border UPI acceptance is not publicly documented at an implementation-ready level. Requires direct engagement with NIPL or a NIPL-certified acquiring partner.

---

## 11. Gaps & Uncertainties

### 11.1 Claims Requiring Verification

| Claim | Status |
|---|---|
| P2P Collect formal deprecation — October 2025 date | `[POST-CUTOFF — requires NPCI circular]` |
| RBI Master Direction — September 15, 2025 + PA-O/PA-P/PA-CB enactment | `[POST-CUTOFF — requires RBI circular]` |
| API Rate Limiting — August 2025; specific per-day figures | `[POST-CUTOFF — requires NPCI circular]` |
| Autopay execution window restrictions — specific time bands | `[UNVERIFIED — requires NPCI circular]` |
| Monthly UPI volume (20–22 billion) | Forward projection; last confirmed Q2 2025 figure was ~15–17 billion |
| UPI Reserve Pay ₹1 lakh block limit | Medium-high confidence; requires current NPCI Reserve Pay circular |
| On-device biometric auth for <₹5,000 — production rollout | `[PARTIALLY VERIFIED — requires NPCI circular]` |

### 11.2 Provider Pricing Gaps

| Provider | Missing Data |
|---|---|
| **Bulkpe** | Exact payout fee; collection fees; settlement speed |
| **Hypto** | Settlement speed; GST inclusion in stated pricing |
| **Setu** | Any public pricing; payout capability; settlement speed |
| **Cashfree** | Setup fees; exact collection fee breakdown |
| **Decentro** | Exact per-API-call SaaS rate; T+0 availability by plan tier |
| **Easebuzz** | Payout fees; setup fees; approval timeline; settlement speed |
| **PhonePe** | Definitive 0% vs. 1.95% resolution; payout API fees |
| **HDFC Bank** | Technical API details |

### 11.3 Providers Not Covered

The following providers are not evaluated here but represent material coverage gaps:

- **Razorpay / Razorpay X:** One of India's top 3 RBI-licensed PAs. Razorpay PG (collections), Razorpay X (payouts), Razorpay Route (marketplace splits), and Razorpay Subscriptions (recurring billing) are all significant products in the ecosystem.
- **Paytm Payment Gateway:** One97 Communications continues operating as a licensed PA. Its current regulatory standing and capabilities require independent verification.
- **BillDesk:** One of India's oldest payment processors, particularly for utility and recurring payments.

### 11.4 Technical Areas Requiring Further Research

- UPI Plug-in SDK: which PAs have certified support and what the integration path looks like
- e₹ / CBDC (digital rupee) integration pathway with existing PA APIs
- Cross-border UPI developer API access via NIPL — not publicly documented at implementation level
- Stripe India / international gateway UPI interoperability

---

## 12. Final Verdict

### 12.1 Summary Assessment

The Indian UPI API ecosystem in 2026 is defined by one fundamental tension: **government-mandated zero MDR at the network layer, but meaningful and unavoidable platform costs at the software infrastructure layer.** No provider offers a completely free, fully automated, and scalable payment system.

- **Collections at scale (consumer checkout):** PhonePe PG is best-in-class for SDK maturity, promotional pricing, and MSME-friendly onboarding.
- **Payouts at scale:** Hypto and Bulkpe dramatically outperform percentage-based alternatives for high-value transactions. Cashfree dominates for high-volume concurrent batch disbursements.
- **Complex fintech infrastructure:** Decentro (multi-bank BaaS, virtual accounts) or Setu (mandates, TPV, BBPS) — depending on whether the primary need is marketplace ledgering or subscription billing.
- **Enterprise true zero-cost:** Direct bank API is the only genuinely zero-MDR architecture at scale, but requires 4–8 weeks, significant engineering investment, and high-value banking relationships.

---

### 12.2 Non-Negotiable Engineering Principles

These apply across all phases and all provider choices:

1. **Webhook signature cryptographic validation** on every inbound payload — prevent spoofing
2. **Idempotency keys** on all write operations — prevent double-crediting and double-disbursements
3. **Exponential backoff polling** as a webhook fallback — never rely solely on webhooks
4. **Penny Drop Verification** before executing any significant payout — prevent fund misrouting
5. **India-based server storage** for all payment data — NPCI data localization compliance
6. **Never cache or store UPI PINs** or authentication credentials
7. **Never assume client-side success** — always validate via webhook or Status API on the server

---

### 12.3 Pre-Production Verification Checklist

| # | Action | Priority |
|---|---|---|
| 1 | Confirm PhonePe PG Standard Plan pricing (0% vs. 1.95%) and which transaction types are excluded | Critical |
| 2 | Obtain NPCI circular on UPI Reserve Pay block limits (confirm ₹1 lakh figure) | Critical |
| 3 | Obtain NPCI Autopay execution window circular (confirm or deny time-band restrictions) | Critical |
| 4 | Confirm RBI Master Direction date and PA-O/PA-P/PA-CB formal enactment | Critical |
| 5 | Obtain NPCI P2P Collect deprecation circular | Critical |
| 6 | Obtain NPCI API rate limiting circular and confirm specific figures | High |
| 7 | Obtain direct pricing from Hypto (hypto.in/docs) and Bulkpe (bulkpe.in) | High |
| 8 | Obtain direct pricing quotation from Decentro for expected API call volumes | High |
| 9 | Add 18% GST to all platform fee calculations in financial models | High |
| 10 | Update webhook handlers to gracefully parse UPI Lite transaction metadata | High |
| 11 | Build minimum 20-business-day dispute window into revenue finalization logic | Medium |
| 12 | Verify NPCI RuPay Credit Card-on-UPI interchange for any updates since 2022 | Medium |

---

### 12.4 Decision Matrix by Entity Type

| Entity Type | Primary | Payouts | Upgrade Trigger |
|---|---|---|---|
| **Individual / Unregistered** | Raw Intent URI or UPI Payment Links | Hypto | Volume > ~20 txns/day |
| **Registered MSME / Early Startup** | PhonePe PG | Hypto or Bulkpe | Subscription billing needed |
| **Marketplace / Gig Platform** | PhonePe PG + TSP/Split Payment | Cashfree | Virtual accounts per-vendor needed |
| **SaaS / WealthTech / LendTech** | Setu (mandates + BBPS) | PhonePe PG (one-off) | Complex mandate rules mature |
| **Scale Marketplace (Series B+)** | Decentro BaaS | Cashfree or Decentro | Direct bank API cost math works |
| **Enterprise (High Volume)** | Direct Bank API (Axis/ICICI) | Decentro (redundancy) | Already at the top of the stack |

---

*All pricing and regulatory data must be independently verified against official NPCI/RBI sources and direct provider documentation before financial or architectural commitments. Claims marked [POST-CUTOFF] or [UNVERIFIED] must not be treated as confirmed until the relevant circulars are obtained.*