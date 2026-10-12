/**
 * EverCut Legal & Policies Repository
 * Contains comprehensive documentation for both Customer (Client) and Merchant (Salon Partner) audiences,
 * strictly incorporating DPDP Act 2023 compliance, IT Act 2000, and clear Refund Policies.
 */

export const legalPolicies = {
  customer: {
    privacy: {
      id: 'privacy-policy',
      title: 'Customer Privacy Policy',
      audience: 'Customers / Clients',
      lastUpdated: '10 October 2026',
      effectiveDate: '10 October 2026',
      version: 'v1.0',
      summary: 'Data protection and privacy practices under DPDP Act 2023 for EverCut customer app users.',
      sections: [
        {
          title: '1. Introduction and Commitment',
          content: `QUANTNEURAL PRIVATE LIMITED – EverCut is committed to protecting the privacy and security of your personal data. This Privacy Policy describes how we collect, use, store, share, and protect information about you when you use the EverCut platform ("Platform"), in compliance with the Digital Personal Data Protection Act, 2023 ("DPDP Act"), the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 ("SPDI Rules"), and other applicable Indian laws.

This Policy applies to all customers of the EverCut platform. By completing onboarding and using the Platform, you acknowledge that you have read this Policy and provided your consent to the data practices described herein.

**Data Fiduciary:** EverCut acts as a "Data Fiduciary" under the DPDP Act, 2023, and you are the "Data Principal". Your rights as a Data Principal are detailed in Section 12.`
        },
        {
          title: '2. Personal Data We Collect',
          content: `When you register and use the Platform as a customer, EverCut collects personal data required to operate and improve the Platform:

- **Identity Data:** Full name and profile photograph.
- **Contact Data:** Mobile phone number, which is the primary identifier for OTP-based authentication.
- **Location Data:** One-time GPS coordinates captured during onboarding.
- **Booking Data:** Appointment history, selected services, preferred merchants, and cancellation records.
- **Payment Data:** UPI transaction references and payment status. Full payment instrument details are processed exclusively by third-party gateways and are not stored by EverCut.
- **Device Data:** Firebase UID, device type, operating system version, push notification token, and app version.
- **Usage Data:** App interaction logs, search queries, browsing history within the Platform, and timestamped activity.
- **Review Data:** Ratings and textual reviews submitted for merchants and services.

**Data We Do Not Collect:** EverCut does not directly collect Aadhaar numbers, PAN numbers, bank account details, or biometric identifiers.`
        },
        {
          title: '3. Consent Management',
          content: `EverCut follows a consent-first approach. Consent is captured directly from you during onboarding, before any non-essential processing of personal data begins.

- **How Consent Is Captured:** During onboarding, you are presented with a dedicated consent screen describing what data will be collected, why it is collected, and with whom it may be shared. You must take an explicit affirmative action, such as tapping "I Agree" or checking a consent box.
- **Granularity and Withdrawal:** Where technically feasible, consent for distinct purposes (location access, notification delivery, data sharing with merchants) is requested separately. You may withdraw consent at any time through Settings > Privacy or by writing to privacy@evercut.in.
- **Record of Consent:** EverCut maintains a timestamped record of the consent you provided during onboarding for audit and compliance under DPDP Act 2023.`
        },
        {
          title: '4. Purposes of Data Processing',
          content: `EverCut processes personal data for specified purposes on valid legal bases under DPDP Act, 2023:
- Account Creation and Authentication (Legal basis: Consent)
- Appointment Booking and Management (Legal basis: Contractual necessity)
- Payment Processing via UPI (Legal basis: Contractual necessity)
- GPS-Based Onboarding Assistance (Legal basis: Consent)
- Sharing Name and Photo with Merchant for Identification (Legal basis: Consent)
- Push Notifications and Alerts (Legal basis: Consent)
- Platform Safety and Fraud Prevention (Legal basis: Legitimate interests / Legal obligation)
- Customer Support and Grievance Redressal (Legal basis: Legal obligation)`
        },
        {
          title: '5. Location Data & Limited Scope',
          content: `EverCut's use of location data is deliberately limited:
- **One-Time Collection:** GPS coordinates are requested and captured only once during onboarding to pre-fill your city or nearby area.
- **No Background Tracking:** EverCut does NOT track your location in the background or continuously monitor your movement after onboarding.
- **Purpose Limitation:** Used solely to show relevant nearby salons (e.g., Artwood Salon, Men Super Salon) without advertising profiling.
- **No Raw Coordinate Sharing:** Raw GPS coordinates are never shared with merchants or third parties.`
        },
        {
          title: '6. Data Sharing with Merchants & Processors',
          content: `**Sharing With Booked Merchants:** To complete your appointment, EverCut shares only your name and profile photograph with the chosen merchant strictly for in-person customer verification. Merchants are legally required to handle this solely for fulfilling the service.

**Third-Party Data Processors:**
- Firebase (Google LLC): Authentication, push notifications, crash analytics.
- UPI Payment Network: Routing transaction settlements without saving credentials.
- MongoDB Atlas (MongoDB, Inc.): Cloud database with localized storage.

**No Sale of Data:** EverCut never sells, rents, or trades customer data to ad brokers or third parties.`
        },
        {
          title: '7. Data Retention & Security',
          content: `Account and booking data is retained for active duration plus 3 years. Payment transaction records are retained for 7 years under applicable PMLA and GST regulations.

**Security Safeguards:** OTP multi-factor authentication, Firebase UID tokens, TLS/HTTPS data encryption in transit, and AES-256 database encryption at rest. In the event of a confirmed breach, affected users are notified within 72 hours via email.`
        },
        {
          title: '8. Data Principal Rights & Grievance Officer',
          content: `Under DPDP Act 2023, you have the right to access information, request correction or erasure, withdraw consent, and file grievances.

**Grievance Officer / Data Protection Contact:**
- **Name:** Aman Khobragade
- **Email:** grievance@evercut.in
- **Address:** HOUSE NO. 288/1/15, WARD NO. Kandri, Nagpur, Maharashtra – 441401
- **Response SLA:** Acknowledged within 24 hours, resolved within 30 days.`
        }
      ]
    },
    terms: {
      id: 'terms-and-conditions',
      title: 'Customer Terms and Conditions',
      audience: 'Customers / Clients',
      lastUpdated: '10 October 2026',
      effectiveDate: '10 October 2026',
      version: 'v1.0',
      summary: 'Platform usage agreement, booking guidelines, platform fees, and intermediary disclaimers.',
      sections: [
        {
          title: '1. Introduction & Intermediary Status',
          content: `Welcome to EverCut, operated by QUANTNEURAL PRIVATE LIMITED (Nagpur, Maharashtra - 441401).

EverCut is a technology marketplace and intermediary under the IT Act, 2000 and the Consumer Protection Act, 2019. EverCut provides scheduling technology connecting clients with salons; EverCut does not employ salon staff or perform grooming services. Responsibility for physical grooming quality and safety rests with the independent salon merchant.`
        },
        {
          title: '2. Eligibility & Account Security',
          content: `Users must be at least 18 years of age or supervised by an adult parent/guardian. Bookings for minors (e.g. child haircuts) must have a responsible adult present throughout the appointment. Accounts are secured by Firebase OTP authentication.`
        },
        {
          title: '3. Platform Fees Structure',
          content: `EverCut charges a nominal convenience platform fee per completed booking to maintain servers and booking infrastructure:
- **Single Service Booking:** ₹4 per Appointment.
- **Bundled Service Booking:** ₹10–₹20 per Appointment.
- **First Two Appointments:** ₹0 (Waived for new customer accounts).
- **Subsequent Appointments:** Displayed transparently at checkout before confirmation.`
        },
        {
          title: '4. Cancellation & Refund Rules',
          content: `Cancellation terms are strictly structured as follows:
- **Cancellation by Merchant:** 100% complete money refund is issued, including all salon service charges and platform fees.
- **Cancellation by Customer:** Service charges are refunded in accordance with the cancellation window (up to 30 mins before appointment), but the platform fee is non-refundable and will be deducted.
- **No-Show:** If customer fails to arrive for a confirmed slot, charges are not refunded.`
        },
        {
          title: '5. Reviews, Moderation & Conduct',
          content: `Only customers with a verified "Completed" appointment status can submit ratings and reviews. Reviews must reflect genuine personal experiences. False reviews, manipulation, harassment, or abusive conduct will result in immediate account termination.`
        },
        {
          title: '6. Grievance Redressal',
          content: `Grievance Officer: Aman Khobragade (grievance@evercut.in). Acknowledged within 24 hours, resolved within 15 days.`
        }
      ]
    }
  },
  merchant: {
    privacy: {
      id: 'merchant-privacy',
      title: 'Merchant Partner Privacy Policy',
      audience: 'Salon Merchants & Stylists',
      lastUpdated: '10 October 2026',
      effectiveDate: '10 October 2026',
      version: 'v1.0',
      summary: 'Data collection, business credentials, Razorpay billing, and independent data handler duties for salon partners.',
      sections: [
        {
          title: '1. Overview & Data Collected',
          content: `This Privacy Policy applies to all salon owners, barbers, and stylists using the EverCut Merchant App.

**Collected Information:**
- **Business Identity:** Salon name, description, Firebase UID, Barber/Merchant ID.
- **Business Contact & Media:** Physical business address, contact numbers, shop photos, cover photos, gallery images, and video tours.
- **Operating Schedules:** Working days, opening/closing hours, lunch/break schedules.
- **Service Catalog:** Service names, descriptions, durations, pricing, bundle packages.
- **Financial & Security Data:** Revenue dashboard metrics, subscription status processed through Razorpay (PCI-DSS compliant), and irreversibly cryptographically hashed Business Security PINs. Raw PINs are never stored or accessible.`
        },
        {
          title: '2. Merchant Duty as Independent Data Handler',
          content: `To complete customer appointments, EverCut provides merchants with the customer's name and profile photo:
- **Permitted Use:** Strictly to identify and welcome the customer for the booked appointment.
- **Prohibitions:** Merchants must NOT store, sell, disclose, or repurpose customer names or photos for off-platform marketing, spam, or profiling.
- **Security:** Merchants must keep their login devices secure with appropriate screen locks and safeguards.`
        },
        {
          title: '3. Data Retention & Deletion',
          content: `Merchant business data is retained for the active lifetime of the account and up to 3 years after termination. Financial and tax invoice records are retained for 7 years under statutory law. Hashed Business PINs are permanently destroyed immediately upon account closure.`
        },
        {
          title: '4. Grievance Officer',
          content: `Grievance Officer: Aman Khobragade (grievance@evercut.in, HOUSE NO. 288/1/15, WARD NO. Kandri, Nagpur, Maharashtra – 441401).`
        }
      ]
    },
    terms: {
      id: 'merchant-terms',
      title: 'Merchant Terms and Conditions',
      audience: 'Salon Merchants & Stylists',
      lastUpdated: '10 October 2026',
      effectiveDate: '10 October 2026',
      version: 'v1.0',
      summary: 'Merchant onboarding warranties, subscription tiers, review handling, and operational obligations.',
      sections: [
        {
          title: '1. Onboarding & Self-Declaration',
          content: `Salons register on a self-declaration basis. By completing onboarding, the Merchant warrants that all business information, prices, and amenities are accurate, and that the salon holds all valid commercial licenses, health permits, and GST registrations required under Indian law.`
        },
        {
          title: '2. Subscription Tiers & Billing',
          content: `EverCut provides three merchant tiers managed via Razorpay:
- **Free Tier (Default):** ₹0/month for profile listing and standard digital queuing.
- **Standard Tier:** Monthly fee unlocking expanded staff scheduling and catalog tools.
- **Premium Tier:** Monthly fee offering priority customer discovery, advanced analytics, and marketing tools.

Subscriptions do not auto-renew without deliberate merchant action. Erroneous charges are refunded within 7 business days.`
        },
        {
          title: '3. Service Liability & Salon Obligations',
          content: `Merchants perform physical grooming services using their own equipment and cosmetic products. The Merchant is solely liable for hygiene, sanitation, allergic reactions, burns, or physical injuries occurring on the salon premises. EverCut is a technology platform and bears no medical or salon liability.`
        },
        {
          title: '4. Cancellation & Payout Rules',
          content: `Confirmed appointments must be honored. If a merchant cancels a confirmed appointment, a 100% full refund (service fee + platform fee) is immediately returned to the customer. Net payouts for completed appointments are disbursed directly to the merchant's registered UPI/bank account.`
        }
      ]
    }
  },
  shared: {
    refund: {
      id: 'cancellation-refund',
      title: 'Cancellation & Refund Policy',
      audience: 'All Platform Users (Customers & Merchants)',
      lastUpdated: '10 October 2026',
      effectiveDate: '10 October 2026',
      version: 'v1.0',
      summary: 'Clear rules governing cancellations and refund disbursement for appointments and platform fees.',
      rules: [
        {
          ruleNumber: 1,
          party: 'Cancellation by Merchant',
          headline: '100% Complete Money Refund',
          detail: 'If an appointment is cancelled, rejected, or unfulfilled by the salon merchant or stylist for any reason, the customer receives a 100% complete refund. This includes the entire salon service charge AND the EverCut platform convenience fee. The refund is automatically initiated to the original UPI or bank payment method.',
          highlight: 'COMPLETE REFUND (Service Fee + Platform Fee 100% Returned)'
        },
        {
          ruleNumber: 2,
          party: 'Cancellation by Customer',
          headline: 'Platform Fee Deducted / Non-Refundable',
          detail: 'If an appointment is cancelled by the customer, the platform convenience fee (₹4 single / ₹10-20 bundle) is strictly non-refundable and will be deducted to cover payment gateway and server processing costs. The salon service charge is refunded in full if cancelled at least 30 minutes prior to the scheduled slot.',
          highlight: 'PLATFORM FEE DEDUCTED (Service Fee Refundable subject to 30-min window)'
        }
      ],
      timelines: [
        { method: 'UPI Instant Payout', timeline: 'Within 2 Hours' },
        { method: 'Credit / Debit Card', timeline: '2 to 5 Banking Business Days' },
        { method: 'Net Banking Reversion', timeline: '3 to 5 Banking Business Days' }
      ],
      sections: [
        {
          title: '1. Standard Cancellation Windows',
          content: `Customers may reschedule or cancel their appointment through the EverCut mobile application up to 30 minutes before the scheduled start time. Cancellations made within the allowable window qualify for a full refund of the service charge, while the platform fee remains non-refundable.`
        },
        {
          title: '2. Merchant Non-Fulfilment & Protection',
          content: `EverCut protects customer bookings. When a barber is unavailable or a salon closes unexpectedly, the booking is flagged as merchant-cancelled, and the customer is immediately credited 100% of their payment.`
        },
        {
          title: '3. Dispute Escalation',
          content: `For any billing discrepancies or refund status tracking, users can reach our billing helpdesk at support@evercut.in or open an in-app dispute within 48 hours of the appointment.`
        }
      ]
    },
    partner: {
      id: 'merchant-agreement',
      title: 'Merchant Partner Agreement',
      audience: 'Salon Merchants & Commercial Partners',
      lastUpdated: '10 October 2026',
      effectiveDate: '10 October 2026',
      version: 'v1.0',
      summary: 'Commercial partnership, commission terms, sanitation standards, and dispute arbitration.',
      sections: [
        {
          title: '1. Partnership Terms',
          content: `By partnering with EverCut, salons join an on-demand booking network dedicated to eliminating waiting rooms and maximizing chair occupancy across India.`
        },
        {
          title: '2. Direct UPI Payouts & Commission',
          content: `Merchant payouts are settled directly to registered bank accounts via UPI / NEFT after service verification. Commission percentages are fixed and transparent without surprise deductions.`
        },
        {
          title: '3. Hygiene & Safety Standard Warranties',
          content: `Partner salons agree to maintain sterilized grooming equipment, clean aprons, proper disposal of single-use blades, and certified cosmetic formulations.`
        }
      ]
    }
  }
};
