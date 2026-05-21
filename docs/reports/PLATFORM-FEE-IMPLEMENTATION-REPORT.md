# Platform Fee Implementation Report

**Date:** 2026-05-20  
**Scope:** Server-side customer platform-fee, introductory waiver, minimum amount validation, payment settlement, and cancellation refund behavior.

## Executive Summary

Implemented and simplified the customer platform-fee feature across the Node.js backend. The backend now applies ₹4 for single-service bookings and ₹10 for bundle/combined bookings, enforces corrected booking-type-specific service-amount minimums before fee logic (single: ₹69; bundle/combined: ₹299), supports two lifetime customer fee waivers, consumes waiver slots only after confirmed payment success, and keeps financial audit data on payment transactions without duplicating snapshots on bookings.

## Gap Analysis

Existing compatible pieces:
- Payment initiation and PhonePe webhook confirmation already centralized in `payment.service.js`.
- Booking cancellation already separated customer cancellation from barber/auto cancellation through `isBarberCancellation`.
- Payment settlement already tracked `serviceAmount`, `platformFee`, and barber payout in paisa.

Missing or incorrect:
- `platformFeeSingle` was set to `3` instead of canonical `4`.
- Minimum service amount validation used incorrect legacy threshold values instead of the corrected ₹69 single-service and ₹299 bundle/combined rules.
- Customer waiver state and post-payment waiver consumption did not exist.
- Payment transactions did not persist whether a waiver was applied.
- Refund financial audit lived only in payment/refund state and needed to stay there rather than being duplicated to booking records.
- Postman payment collection did not describe or assert the final fee settlement response shape.

## Architectural Decisions

- Preserved the existing pending booking reservation model for backward compatibility with slot locking and idempotent booking creation.
- Kept the active platform-fee business values in the existing `config.payment` structure in `server/src/config/index.js`. `server/src/utils/platform-fee.utils.js` is now the single reusable logic layer for classification, calculation, threshold validation, and waiver resolution, but it does not own separate business constants.
- Removed duplicated quota constraints from the customer schema/repository/serializer path so waiver limits derive from `config.payment.feeWaiverQuota`.
- Rejected the heavier snapshot/policy-style model for the current project stage. The final implementation persists only the new fields needed for behavior: `Customer.feeWaiverBookingsUsed` and `PaymentTransaction.waiverApplied`.
- Used active waiver payment reservations to prevent more than two concurrent pending payment sessions from receiving waived platform fees.
- Kept booking records lean. Platform-fee charge and refund audit values remain on `PaymentTransaction` in paisa, matching the existing payment storage convention.

## Database Changes

- `Customer`: added only `feeWaiverBookingsUsed`.
- `Booking`: no new platform-fee, waiver, cancellation type, refund fee, or refund amount fields are persisted.
- `PaymentTransaction`: added top-level `waiverApplied`.
- `PaymentTransaction.settlement`: keeps `serviceAmount`, `platformFee`, `barberPayout`, and `isBundle`; no extra standard-fee, booking-fee-type, or waiver metadata is duplicated in settlement.
- Added repository methods for atomic waiver consumption and active waiver reservation counting.

## API Changes

- Booking responses remain backward-compatible and do not expose new platform-fee snapshot fields.
- Payment responses now include top-level `waiverApplied`.
- Payment settlement responses expose `serviceAmount`, `platformFee`, `barberPayout`, and `isBundle`.
- Booking amount responses now use clear payable semantics: `serviceAmount` is services-only, `platformFee` is the current or charged platform fee, and `totalAmount` is the final payable/charged amount.
- No route URLs or request schemas changed.
- Existing pending booking/payment lifecycle remains compatible.

## Security Improvements

- Waiver usage is tied to the authenticated customer document and consumed through an atomic guarded repository update.
- Payment amount mismatch handling remains intact and cancels unpaid bookings without consuming waiver slots.
- Refund initiation still enforces existing barber/admin authorization and shop ownership checks.

## Performance Improvements

- Fee calculation is in-process and uses selected service data already loaded for booking/payment flows.
- Active waiver reservation counting uses indexed payment transaction fields: `customerId`, `status`, and top-level `waiverApplied`.
- No additional network calls were added.

## Testing Summary

Added and updated automated tests for:
- Fee classification and explicit bundle/combined ₹10 cap.
- Existing `config.payment` platform-fee keys as the single active configuration source.
- Customer schema persists only the waiver usage counter while serializer derives quota/exhausted state from payment config.
- Booking schema does not persist platform-fee snapshot or refund audit fields.
- Corrected ₹69 single-service and ₹299 bundle/combined minimum validation in booking creation, reorder, and payment initiation flows.
- Payment initiation with standard and waived platform fees.
- Waiver slot consumption after payment success.
- Customer cancellation refund amount and payment transaction refund audit persistence.
- Booking serializer amount semantics for paid bookings with populated payment transactions and pending booking creation payable previews.

## Regression Validation

Targeted verification passed:
- `node --test src/config/__tests__/platform-fee-config.test.js src/config/__tests__/payment-config.test.js src/utils/__tests__/platform-fee.utils.test.js src/services/__tests__/booking.service.test.js src/services/__tests__/payment.service.test.js`
- Result: 48/48 passing.

Full backend verification passed:
- `npm test`
- Result: 200/200 passing.

## Risks & Future Recommendations

- Anti-abuse for account re-registration remains a product/security policy decision. The current implementation ties waivers to the customer document, but the open requirement asks for a persistent identity such as verified phone.
- If future reporting needs booking-level denormalized fee analytics, add a deliberate reporting projection or migration then. The current runtime model intentionally avoids duplicating payment financial data into bookings.
- If the product later removes pre-payment booking reservations, slot locking, idempotency, and payment initiation should be redesigned together.
