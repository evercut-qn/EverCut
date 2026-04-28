# Zoho Payments vs PhonePe Payment Gateway — India Comparison
## Research & Decision Document

> **Context:** EverCut Salon Booking Platform (India)
> **Stack:** Node.js · Flutter · MongoDB Atlas (ap-south-1)
> **Use Cases Evaluated:** Payment Collection · Payout Capability · Developer Experience · Startup Suitability
> **Prepared:** April 17, 2026
> **Sources:** `zoho.com/in/payments/` · `zoho.com/in/payments/pricing/` · `zoho.com/in/payments/api/v1/introduction/` · `developer.phonepe.com` · `business.phonepe.com`
> **Status:** Research complete — verified from official sources only

---

## ⚠️ Critical Disclaimer on PhonePe PG Pricing

PhonePe's official pricing page (`phonepe.com/business-solutions/payment-gateway/pricing/`) renders as an image/SVG layout and does not expose machine-readable rates. PhonePe currently advertises a **"Super Saving Offer"** for new merchants: zero processing fees, zero setup fees, zero transaction fees. Whether standard published rates apply post-offer is only confirmed through direct merchant agreements. Rates used in this document for PhonePe are based on:
- NPCI mandate: **0% MDR on bank-to-bank UPI** (confirmed official regulation)
- Wallet/PPI transactions: rates cited from PhonePe's own published guides
- Card/Net Banking rates: not publicly listed; noted as **"custom/negotiated"** per official sources

All Zoho Payments rates are fully verified from the official pricing page.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Feature Comparison](#2-feature-comparison)
3. [Pricing Comparison](#3-pricing-comparison)
4. [Fees Breakdown Table](#4-fees-breakdown-table)
5. [Payout Capability Analysis](#5-payout-capability-analysis--most-critical-section)
6. [Developer Experience](#6-developer-experience)
7. [Startup Friendliness](#7-startup-friendliness)
8. [Final Verdict](#8-final-verdict)

---

## 1. Overview

### 1.1 Zoho Payments

| Field | Detail |
|---|---|
| **Company** | Zoho Payment Technologies Pvt. Ltd. (subsidiary of Zoho Corporation) |
| **License** | RBI Certificate of Authorisation No. 275/2025 — Licensed Payment Aggregator |
| **Product Type** | Unified Payment Solution / Payment Gateway |
| **Target Users** | Freelancers, SMBs, enterprises, e-commerce, education, NGOs |
| **Coverage** | India (this document covers India edition only) |
| **Platforms** | Web, iOS App, Android App |
| **Ecosystem** | Tightly integrated with Zoho Books, Billing, Commerce, Payroll, Checkout, Invoice |
| **Primary Use Case** | Collecting payments from customers on behalf of merchants |

**What it is in one line:** A full-featured RBI-licensed payment gateway for online and in-store payment collection, best suited for businesses already in the Zoho ecosystem.

---

### 1.2 PhonePe Payment Gateway (PhonePe PG)

| Field | Detail |
|---|---|
| **Company** | PhonePe Private Limited |
| **License** | RBI-authorized Payment Aggregator |
| **Product Type** | Payment Gateway / Payment Aggregator |
| **Target Users** | Online businesses, e-commerce, startups, mobile apps |
| **Coverage** | India |
| **Platforms** | Web (Standard Checkout, API), iOS SDK, Android SDK, plugins (Shopify, WooCommerce, Magento) |
| **Market Strength** | ~50% UPI market share — highest UPI success rates in India |
| **Primary Use Case** | Collecting payments via UPI, cards, and net banking |

**What it is in one line:** India's largest UPI-native payment gateway with high success rates, a developer-friendly API, and a current zero-fee promotional offer for new merchants.

---

### 1.3 What This Comparison Covers

| Scenario | Relevant Provider |
|---|---|
| Accepting customer payments (UPI, cards, net banking) | Both |
| Sending money to barbers / vendors / third parties | Neither ← **critical finding** |
| Marketplace split payments | Neither |

---

## 2. Feature Comparison

### 2.1 Supported Payment Methods (India)

| Payment Method | Zoho Payments | PhonePe PG |
|---|---|---|
| UPI (BHIM, GPay, PhonePe, Paytm, etc.) | ✅ Yes | ✅ Yes |
| UPI Intent / Deep link | ✅ Yes | ✅ Yes |
| UPI Collect | ✅ Yes | ✅ Yes |
| UPI AutoPay (Mandates / Recurring) | ✅ Yes | ✅ Yes (Autopay product) |
| Dynamic QR Code | ✅ Yes | ✅ Yes |
| Domestic Debit Cards (Visa, MC, RuPay) | ✅ Yes | ✅ Yes |
| Domestic Credit Cards (Visa, MC, RuPay) | ✅ Yes | ✅ Yes |
| RuPay Credit Card on UPI | ✅ Yes | ✅ Yes |
| Corporate Credit Cards | ✅ Yes | ✅ Yes |
| AMEX Cards | ✅ Yes | ✅ Yes |
| International Cards | ✅ Yes | ✅ Yes |
| Net Banking (banks supported) | ✅ 70+ banks | ✅ Major banks |
| Wallets (PhonePe, Paytm, Amazon Pay, etc.) | ✅ Yes (6 wallets) | ✅ Yes |
| Bank Transfer (NEFT / RTGS / IMPS) | ✅ Yes (via Virtual Accounts) | ❌ Not as standard |
| Payment Links (no-code) | ✅ Yes | ✅ Yes |
| POS / In-store | ✅ Yes | ✅ Yes (QR, Smart Speakers, EDC) |
| Embedded Checkout Widget | ✅ Yes | ✅ Yes |
| Virtual Accounts | ✅ Yes | ❌ Not mentioned |

---

### 2.2 API & Integration Capabilities

| Capability | Zoho Payments | PhonePe PG |
|---|---|---|
| REST API | ✅ Full REST API | ✅ Full REST API |
| API Base URL | `payments.zoho.in/api/v1` | `api.phonepe.com/apis/hermes/pg/v1` |
| Authentication | OAuth 2.0 + API Keys | Salt Key + X-VERIFY header (HMAC-SHA256) |
| iOS SDK | ✅ Yes | ✅ Yes |
| Android SDK | ✅ Yes | ✅ Yes |
| Node.js SDK | ❌ No official SDK (REST API only) | ❌ No official SDK (REST API only) |
| Shopify / WooCommerce Plugin | ❌ Not mentioned | ✅ Yes (official plugins) |
| Webhooks | ✅ Yes | ✅ Yes |
| Sandbox / UAT Environment | ✅ Yes (`paymentssandbox.zoho.in`) | ✅ Yes (`api.preprod.phonepe.com`) |
| OpenAPI Spec | ✅ Yes (downloadable) | ❌ Not available |
| Postman Collection | ✅ Yes (official) | ❌ Not available |
| API Rate Limits | Payments: 600 req/min · Refunds: 60 req/min | Not publicly documented |

---

### 2.3 Webhooks & Notifications

| Feature | Zoho Payments | PhonePe PG |
|---|---|---|
| Payment success/failure webhook | ✅ Yes | ✅ Yes (callback URL) |
| Refund webhook | ✅ Yes | ✅ Yes |
| Virtual Account webhook | ✅ Yes | N/A |
| Settlement/Payout webhook | ✅ Yes (merchant settlement only) | ❌ Not applicable |
| Webhook signature verification | ✅ Yes | ✅ Yes (X-VERIFY checksum) |

---

### 2.4 Refunds

| Feature | Zoho Payments | PhonePe PG |
|---|---|---|
| Full refunds | ✅ Yes (via API + Dashboard) | ✅ Yes |
| Partial refunds | ✅ Yes | ✅ Yes |
| Refund API | ✅ Yes (`POST /refunds`) | ✅ Yes |
| Refund timeline | Standard bank timelines | Standard bank timelines |

> **⚠️ Refund ≠ Payout.** A refund reverses a prior payment back to the original payer. A payout sends money to a new, unrelated third party. Both providers support refunds. Neither supports third-party payouts.

---

### 2.5 Settlement

| Feature | Zoho Payments | PhonePe PG |
|---|---|---|
| Settlement cycle | Daily (T+1 or T+2) | T+1 to T+3 (typical) |
| Settlement fees | ₹0 — Free | ₹0 — Free |
| Settlement to own bank account | ✅ Yes (automatic) | ✅ Yes (automatic) |
| Split/multi-party settlement | ❌ Not supported | ❌ Not supported |

---

## 3. Pricing Comparison (India)

> **GST Note:** 18% GST applies to the platform fee for most Zoho Payments methods (except domestic cards ≤ ₹2,000). PhonePe PG currently advertises zero transaction fees for new merchants (promotional). Standard rates for PhonePe are negotiated; the table below uses verified regulatory baselines where available.

### 3.1 Online Payment Methods

| Payment Method | Zoho Payments (Rate) | Zoho Payments (Effective with GST) | PhonePe PG (Rate) | Notes |
|---|---|---|---|---|
| **UPI (bank-to-bank)** | 0.5% | **0.59%** (+ 18% GST on fee) | **0%** | NPCI zero-MDR mandate applies to PhonePe |
| **Debit Card ≤ ₹2,000** | 2.0% | **2.0%** (GST exempt) | Custom/negotiated | NPCI MDR cap applies |
| **Debit Card > ₹2,000** | 2.0% | **2.36%** (+ 18% GST) | Custom/negotiated | — |
| **Credit Card (domestic)** | 2.0% | **2.0%** (≤₹2K exempt) / **2.36%** (>₹2K) | Custom/negotiated | — |
| **Corporate Credit Card** | 2.75% | **3.245%** (+ 18% GST) | Custom/negotiated | — |
| **AMEX Card** | 3.0% | **3.54%** (+ 18% GST) | Custom/negotiated | — |
| **Net Banking** | 2.0% | **2.36%** (+ 18% GST) | Custom/negotiated | — |
| **Wallets / PPI** | 2.0% | **2.36%** (+ 18% GST) | 1.1% (>₹2K via PPI) | PhonePe rate per published guides |
| **International Cards** | 3.0% | **3.54%** (+ 18% GST) | Custom/negotiated | — |
| **Setup Fee** | ₹0 | ₹0 | ₹0 | — |
| **Annual Fee** | ₹0 | ₹0 | ₹0 | — |

**Source — Zoho Payments:** `zoho.com/in/payments/pricing/` (verified April 17, 2026)
**Source — PhonePe PG:** `phonepe.com/business-solutions/payment-gateway/pricing/` + `developer.phonepe.com` + NPCI official regulation (verified April 17, 2026)

> **Important — PhonePe PG Card/NB Rates:** PhonePe's pricing page renders as images and does not disclose standard card/NB MDR publicly. Merchants are advised to contact PhonePe directly for a rate card. Standard industry MDR ranges for reference: Debit Card 0.4–0.9%, Credit Card 1.5–2.0%, Net Banking ₹3–₹15 flat.

---

## 4. Fees Breakdown Table

> **Calculation method:** Fee = Transaction Amount × Rate; + 18% GST on fee where applicable (see rules below).
> **GST exemption (Zoho):** Domestic card payments ≤ ₹2,000 are GST-exempt. All other methods attract 18% GST on the platform fee.
> **PhonePe UPI:** 0% MDR → ₹0 deducted, merchant receives 100% of UPI payment.
> **PhonePe cards/NB:** Rates not publicly disclosed. Rows marked "Custom" — contact PhonePe for rates.

### 4.1 ₹100 Transaction

| Provider | Method | Platform Fee | GST on Fee (18%) | Total Deducted | Amount Received |
|---|---|---|---|---|---|
| **Zoho Payments** | UPI | ₹0.50 | ₹0.09 | ₹0.59 | **₹99.41** |
| **Zoho Payments** | Debit Card | ₹2.00 | ₹0.00 (exempt ≤₹2K) | ₹2.00 | **₹98.00** |
| **Zoho Payments** | Credit Card | ₹2.00 | ₹0.00 (exempt ≤₹2K) | ₹2.00 | **₹98.00** |
| **Zoho Payments** | Net Banking | ₹2.00 | ₹0.36 | ₹2.36 | **₹97.64** |
| **PhonePe PG** | UPI | ₹0.00 | ₹0.00 | ₹0.00 | **₹100.00** |
| **PhonePe PG** | Debit Card | Custom | Custom | Custom | Custom |
| **PhonePe PG** | Credit Card | Custom | Custom | Custom | Custom |
| **PhonePe PG** | Net Banking | Custom | Custom | Custom | Custom |

---

### 4.2 ₹500 Transaction

| Provider | Method | Platform Fee | GST on Fee (18%) | Total Deducted | Amount Received |
|---|---|---|---|---|---|
| **Zoho Payments** | UPI | ₹2.50 | ₹0.45 | ₹2.95 | **₹497.05** |
| **Zoho Payments** | Debit Card | ₹10.00 | ₹0.00 (exempt ≤₹2K) | ₹10.00 | **₹490.00** |
| **Zoho Payments** | Credit Card | ₹10.00 | ₹0.00 (exempt ≤₹2K) | ₹10.00 | **₹490.00** |
| **Zoho Payments** | Net Banking | ₹10.00 | ₹1.80 | ₹11.80 | **₹488.20** |
| **PhonePe PG** | UPI | ₹0.00 | ₹0.00 | ₹0.00 | **₹500.00** |
| **PhonePe PG** | Debit Card | Custom | Custom | Custom | Custom |
| **PhonePe PG** | Credit Card | Custom | Custom | Custom | Custom |
| **PhonePe PG** | Net Banking | Custom | Custom | Custom | Custom |

---

### 4.3 ₹1,000 Transaction

| Provider | Method | Platform Fee | GST on Fee (18%) | Total Deducted | Amount Received |
|---|---|---|---|---|---|
| **Zoho Payments** | UPI | ₹5.00 | ₹0.90 | ₹5.90 | **₹994.10** |
| **Zoho Payments** | Debit Card | ₹20.00 | ₹0.00 (exempt ≤₹2K) | ₹20.00 | **₹980.00** |
| **Zoho Payments** | Credit Card | ₹20.00 | ₹0.00 (exempt ≤₹2K) | ₹20.00 | **₹980.00** |
| **Zoho Payments** | Net Banking | ₹20.00 | ₹3.60 | ₹23.60 | **₹976.40** |
| **PhonePe PG** | UPI | ₹0.00 | ₹0.00 | ₹0.00 | **₹1,000.00** |
| **PhonePe PG** | Debit Card | Custom | Custom | Custom | Custom |
| **PhonePe PG** | Credit Card | Custom | Custom | Custom | Custom |
| **PhonePe PG** | Net Banking | Custom | Custom | Custom | Custom |

---

### 4.4 ₹5,000 Transaction

| Provider | Method | Platform Fee | GST on Fee (18%) | Total Deducted | Amount Received |
|---|---|---|---|---|---|
| **Zoho Payments** | UPI | ₹25.00 | ₹4.50 | ₹29.50 | **₹4,970.50** |
| **Zoho Payments** | Debit Card | ₹100.00 | ₹18.00 (GST applies >₹2K) | ₹118.00 | **₹4,882.00** |
| **Zoho Payments** | Credit Card | ₹100.00 | ₹18.00 (GST applies >₹2K) | ₹118.00 | **₹4,882.00** |
| **Zoho Payments** | Net Banking | ₹100.00 | ₹18.00 | ₹118.00 | **₹4,882.00** |
| **PhonePe PG** | UPI | ₹0.00 | ₹0.00 | ₹0.00 | **₹5,000.00** |
| **PhonePe PG** | Debit Card | Custom | Custom | Custom | Custom |
| **PhonePe PG** | Credit Card | Custom | Custom | Custom | Custom |
| **PhonePe PG** | Net Banking | Custom | Custom | Custom | Custom |

---

### 4.5 UPI Cost Comparison Summary

For the EverCut use case (salon bookings primarily paid via UPI):

| Transaction Value | Zoho Payments UPI Cost | PhonePe PG UPI Cost | PhonePe Advantage |
|---|---|---|---|
| ₹100 | ₹0.59 | **₹0.00** | Save ₹0.59 |
| ₹500 | ₹2.95 | **₹0.00** | Save ₹2.95 |
| ₹1,000 | ₹5.90 | **₹0.00** | Save ₹5.90 |
| ₹5,000 | ₹29.50 | **₹0.00** | Save ₹29.50 |

> PhonePe PG is **strictly cheaper on UPI** due to NPCI's zero-MDR mandate on bank-to-bank UPI, combined with PhonePe's promotional zero platform fee.
> Zoho Payments charges 0.5% + 18% GST = **0.59% effective** on UPI, which compounds meaningfully at volume.

---

## 5. Payout Capability Analysis — Most Critical Section

### 5.1 Terminology Definitions

| Term | Definition |
|---|---|
| **Payment Gateway** | Collects money from customers into a merchant's account |
| **Settlement** | Transfer of collected funds from the payment gateway to the merchant's own registered bank account |
| **Refund** | Reversal of a prior customer payment back to the same customer |
| **Payout API (True)** | Programmatically sending money to an external third party (e.g., a barber, vendor, or gig worker) who has no prior transaction with the gateway |

**Settlement ≠ Payout. Refund ≠ Payout.**

---

### 5.2 Payout Capability Table

| Provider | Payout API Available? | Type | Verdict |
|---|---|---|---|
| **Zoho Payments** | ❌ Not supported | Settlement only (read-only API) | ⚠️ SETTLEMENT ONLY |
| **PhonePe PG** | ❌ Not supported | Collection only — no outbound API | ❌ NOT SUPPORTED |

---

### 5.3 Zoho Payments — Payout Analysis

**Official Definition of "Payouts" in Zoho Payments:**
> *"Payouts refer to the sum of the money to be settled from Zoho Payments to your account. This amount is the payments you've received from your customers to your business after deducting the platform fees and adjusting the refunded amount."*
> — Source: `zoho.com/in/payments/faq/`

This is pure **merchant settlement** — not third-party disbursement.

| Payout Use Case | Supported? | Notes |
|---|---|---|
| Settlement to own merchant bank account (daily) | ✅ Yes | Free, automatic, daily |
| UPI Payouts to end users / vendors / third parties | ❌ No | Not available |
| Bank Transfer to third-party users | ❌ No | Not available |
| Bulk Payouts to multiple external recipients | ❌ No | Not available |
| Marketplace vendor/seller payouts | ❌ No | Not available |
| Programmatic payout initiation to arbitrary recipients | ❌ No | Payout API is read-only |
| Salary payouts via Zoho Payroll (employees only) | ⚠️ Limited | Requires Zoho Payroll; NEFT/RTGS/IMPS to employee bank accounts only; no UPI; employees only — not applicable for gig workers or vendors |

**Verdict for Zoho Payments Payouts:** ⚠️ SETTLEMENT ONLY — True payout API does not exist.

---

### 5.4 PhonePe PG — Payout Analysis

**Source verified:** `developer.phonepe.com` — official developer documentation navigation tree reviewed April 17, 2026.

The complete official PhonePe developer portal lists these product categories:

| Category | Sub-Features |
|---|---|
| Payment Gateway | Standard Checkout, Backend SDKs, Mobile SDKs, Webhook Handling |
| Autopay | Subscription Setup, Mandate Management, Recurring Billing |
| Payment Links | No-code payment collection |
| In-store Payments | Static QR, Smart Speakers, EDC devices |
| UAT Testing & Go-Live | Sandbox, Checklists, Go-Live |

**There is no "Payouts," "Disbursements," "B2B Transfers," or any outbound money movement API** listed anywhere in the official PhonePe PG developer documentation.

| Payout Use Case | Supported? | Notes |
|---|---|---|
| UPI Payouts to third parties | ❌ No | No API — not in developer documentation |
| Bank Transfer Payouts (IMPS/NEFT) | ❌ No | No API — not in developer documentation |
| Bulk Payouts | ❌ No | No API |
| Refunds (to original payer) | ✅ Yes | Supported — but this is NOT a payout |
| Settlement to own merchant account | ✅ Yes | Automatic — but this is NOT a payout |
| PhonePe consumer P2P transfers | ⚠️ Consumer only | Separate consumer product; not accessible via merchant API |

**Verdict for PhonePe PG Payouts:** ❌ NOT SUPPORTED — PhonePe PG is a collection-only Payment Aggregator.

---

### 5.5 Payout Conclusion

> ## 🚨 BOTH ZOHO PAYMENTS AND PHONEPE PG DO NOT SUPPORT TRUE PAYOUT APIs
>
> If your platform requires programmatic disbursement of funds to third parties (barbers, vendors, gig workers, drivers, freelancers), **a separate, dedicated Payout API provider is mandatory.**
>
> **Recommended payout providers for India (based on prior research):**
> - **Cashfree Payouts** — Best overall for startups; UPI payouts ₹3–₹6/txn; real-time; dedicated payout product; RBI-licensed
> - **RazorpayX Payouts** — Mature platform; ₹5/txn UPI; requires RazorpayX account
> - **PayU Payouts** — Enterprise-focused; good for high volume

---

## 6. Developer Experience

### 6.1 API Quality & Documentation

| Criteria | Zoho Payments | PhonePe PG |
|---|---|---|
| Documentation quality | ✅ Excellent — structured, versioned, complete | ✅ Good — clear step-by-step integration guides |
| OpenAPI Specification | ✅ Yes — downloadable | ❌ No |
| Postman Collection | ✅ Yes — official | ❌ No |
| API Reference coverage | Full endpoint reference (all resources) | Pay API, Status API, Refund API, Callback |
| Code examples | REST examples | Node.js, Java, Python examples available in community docs |
| Versioning | v1 API with clear changelog | v1 API (older v2 deprecated) |

---

### 6.2 SDKs

| SDK | Zoho Payments | PhonePe PG |
|---|---|---|
| iOS | ✅ Official SDK | ✅ Official SDK |
| Android | ✅ Official SDK | ✅ Official SDK |
| Node.js | ❌ No official SDK | ❌ No official SDK |
| React Native | ❌ No official SDK | ⚠️ Community packages available |
| Flutter | ❌ No official SDK | ⚠️ Community packages available |
| PHP / Python / Java | ❌ No official SDKs | ❌ No official SDKs |

> **Note for EverCut (Node.js + Flutter):** Neither provider offers an official Node.js SDK. Both require direct REST API integration on the backend. Flutter wrappers exist in the community for PhonePe PG; none documented for Zoho Payments.

---

### 6.3 Sandbox & Testing

| Feature | Zoho Payments | PhonePe PG |
|---|---|---|
| Sandbox URL | `paymentssandbox.zoho.in` | `api.preprod.phonepe.com` |
| Test credentials | Available via developer portal | Available via developer portal |
| UAT test cases provided | Not explicitly documented | ✅ Yes — documented test cases |
| Simulator app required | No | ⚠️ PhonePe Simulator app required for UPI Intent testing |

---

### 6.4 Authentication

| Provider | Method | Complexity |
|---|---|---|
| **Zoho Payments** | OAuth 2.0 (token refresh required) + API Keys | Medium — requires OAuth token management |
| **PhonePe PG** | HMAC-SHA256 checksum (Salt Key + payload + endpoint) | Low-Medium — stateless, no token refresh needed |

> PhonePe's checksum-based auth is simpler to implement in stateless Node.js services since it requires no token refresh cycle.

---

### 6.5 Rate Limits

| Provider | Limits |
|---|---|
| **Zoho Payments** | Payments: 600 req/min · Refunds: 60 req/min (increase possible via email) |
| **PhonePe PG** | Not publicly documented |

---

## 7. Startup Friendliness

| Criteria | Zoho Payments | PhonePe PG |
|---|---|---|
| **Setup Fee** | ₹0 | ₹0 |
| **Annual Maintenance Fee** | ₹0 | ₹0 |
| **Monthly Fee** | ₹0 | ₹0 |
| **UPI Rate** | 0.5% + 18% GST = **0.59% effective** | **0%** (NPCI mandate) |
| **Card/NB Rate** | Fixed (published, transparent) | Negotiated (not public — requires direct quote) |
| **Pricing Transparency** | ✅ Excellent — full pricing page with exact rates | ⚠️ Limited — card/NB rates not published; promotional offer not permanent |
| **Onboarding** | Standard KYC (PAN, address proof, business docs, bank account) | Standard KYC (GSTIN, PAN, business docs) |
| **KYC Complexity** | Medium (same as industry standard) | Medium (same as industry standard) |
| **Time to Go-Live** | Not officially stated (verify at FAQ) | Instant activation advertised (promotional) |
| **Sandbox Availability** | ✅ Yes | ✅ Yes |
| **PCI-DSS Compliance** | ✅ Yes | ✅ Yes |
| **RBI Licensed** | ✅ Yes (CoA No. 275/2025) | ✅ Yes |
| **Best Fit For** | Zoho ecosystem users · B2B invoicing · No-code payment links | High-UPI-volume apps · Mobile-first · Startups needing zero UPI cost |
| **Not Suited For** | Marketplace payouts · Non-Zoho stack | Marketplace payouts · Businesses needing transparent card pricing upfront |

---

## 8. Final Verdict

### 8.1 Which is Better for Payment Collection?

| Use Case | Recommended | Reason |
|---|---|---|
| **UPI-dominant platform** (e.g., EverCut) | **PhonePe PG** | 0% UPI MDR vs 0.59% effective on Zoho saves cost at every transaction |
| **Zoho ecosystem businesses** | **Zoho Payments** | Native integration with Zoho Books, Billing, Payroll; no reconciliation overhead |
| **Transparent, predictable pricing** | **Zoho Payments** | Full pricing page published; no surprises |
| **High success rate for UPI transactions** | **PhonePe PG** | ~50% UPI market share → higher first-attempt success rates |
| **E-commerce (Shopify / WooCommerce)** | **PhonePe PG** | Official plugins available |
| **Virtual Accounts / B2B collections** | **Zoho Payments** | Supported natively |

**Winner for EverCut (UPI-first mobile app):** ✅ **PhonePe PG** — zero UPI cost, higher UPI success rates, mobile SDK support.

---

### 8.2 Which is Better for Payouts?

| Provider | Payout Verdict |
|---|---|
| **Zoho Payments** | ⚠️ SETTLEMENT ONLY — cannot disburse to vendors or gig workers |
| **PhonePe PG** | ❌ NOT SUPPORTED — collection-only gateway |

**Payout Verdict:** ❌ **NEITHER PROVIDER SUPPORTS PAYOUT APIs.**

---

### 8.3 Architecture Recommendation for EverCut

```
LAYER 1 — COLLECTION (Inbound)
Customer → PhonePe PG v2 → EverCut Settlement Account
  ✅ 0% UPI MDR
  ✅ Highest UPI success rates
  ✅ T+1 settlement

LAYER 2 — DISBURSEMENT (Outbound)  ← SEPARATE PROVIDER REQUIRED
EverCut Account → [Dedicated Payout API] → Barber's UPI / Bank Account
  ✅ Cashfree Payouts (recommended): UPI ₹3–₹6/txn, real-time, 24×7
  ✅ RazorpayX: ₹5/txn UPI
  ✅ PayU Payouts: enterprise tier
```

> ### ⚠️ MANDATORY CONCLUSION
> A **SEPARATE PAYOUT PROVIDER IS REQUIRED** for any platform that needs to disburse funds to third parties (barbers, vendors, gig workers). Both Zoho Payments and PhonePe PG are payment *collection* tools only. They are architecturally incompatible with the outbound disbursement use case.
>
> **Recommended stack for EverCut:**
> - **Collection:** PhonePe PG v2 (zero UPI cost, high success rates)
> - **Payouts:** Cashfree Payouts API V2 (real-time UPI, IMPS, NEFT; startup-friendly pricing; dedicated payout product)

---

## Appendix A — Quick Reference

### Zoho Payments

| Parameter | Value |
|---|---|
| License | RBI CoA No. 275/2025 |
| API Base URL | `https://payments.zoho.in/api/v1` |
| Sandbox | `https://paymentssandbox.zoho.in/` |
| Auth | OAuth 2.0 + API Keys |
| UPI Effective Rate | **0.59%** (0.5% + 18% GST) |
| Debit Card Effective Rate | 2.0% (≤₹2K) / 2.36% (>₹2K) |
| Net Banking Effective Rate | **2.36%** |
| Setup Fee | ₹0 |
| Settlement | Daily, free |
| Payout API | Settlement read-only only |
| Third-party Payout | ❌ NOT SUPPORTED |

### PhonePe PG

| Parameter | Value |
|---|---|
| License | RBI-authorized PA |
| API Base URL | `https://api.phonepe.com/apis/hermes/pg/v1` |
| Sandbox | `https://api.preprod.phonepe.com/apis/hermes/pg/v1` |
| Auth | HMAC-SHA256 checksum (Salt Key) |
| UPI Rate | **0%** (NPCI zero-MDR mandate) |
| Card / NB Rate | Not publicly disclosed — custom negotiated |
| Setup Fee | ₹0 |
| Settlement | T+1 to T+3, free |
| Payout API | ❌ NOT SUPPORTED |
| Third-party Payout | ❌ NOT SUPPORTED |

---

## Appendix B — Official Source URLs

| Resource | URL |
|---|---|
| Zoho Payments India | `zoho.com/in/payments/` |
| Zoho Payments Pricing | `zoho.com/in/payments/pricing/` |
| Zoho Payments API Docs | `zoho.com/in/payments/api/v1/introduction/` |
| Zoho Payments Developer Docs | `zoho.com/in/payments/developerdocs/` |
| Zoho Payments Sandbox | `paymentssandbox.zoho.in` |
| Zoho Payments Signup | `zoho.com/in/payments/signup/` |
| PhonePe PG Developer Portal | `developer.phonepe.com` |
| PhonePe Business Portal | `business.phonepe.com/payment-gateway` |
| PhonePe PG Pricing | `phonepe.com/business-solutions/payment-gateway/pricing/` |
| PhonePe PG Registration | `business.phonepe.com/pg/register` |
| Cashfree Payouts | `cashfree.com/payouts` |
| Cashfree Payout API Docs | `cashfree.com/docs/api-reference/payouts/overview` |
| NPCI UPI Guidelines | `npci.org.in/what-we-do/upi` |

---

*All pricing and feature data verified against official provider sources as of April 17, 2026. Pricing is subject to change — always verify directly with the provider before making financial commitments. PhonePe PG's current zero-fee promotional offer may have an expiry or volume conditions — confirm before production deployment.*
