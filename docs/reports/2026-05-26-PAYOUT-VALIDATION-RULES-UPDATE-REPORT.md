# Payout Validation Rules Update Report

## 1. Overview

Objective: update backend payout validation so `upiId` is required and `accountHolderName`, `bankName`, `bankAccount`, and `ifsc` are optional across the server implementation.

Scope: Express request validation, service-level normalization, Mongoose persistence, Cashfree payout beneficiary creation, generated Postman collections, active API documentation, and automated tests.

Affected modules:
- Onboarding: `POST /api/v1/onboarding/barbers`
- Shop payout details: `GET/PATCH /api/v1/shops/me/payout-details`
- Payout execution and retry flows
- Cashfree payout beneficiary adapter
- Barber model persistence
- Postman onboarding and barber profile collections

Dependency map:
- `app.js` mounts `routes/index.js`.
- `routes/onboarding.routes.js` and `routes/shops.routes.js` apply `validate(...)`.
- `validate.middleware.js` runs Joi with `allowUnknown: false`, `stripUnknown: true`, and stores sanitized input in `req.validated`.
- Controllers read sanitized payloads through `getValidatedRequestData(...)`.
- `onboarding.service.js` and `shop.service.js` normalize payout fields before repository writes.
- `barber.repository.js` persists with Mongoose `runValidators: true`.
- `payout.service.js` reads Barber payout data, creates Cashfree beneficiaries, and initiates UPI transfers.
- `shop.serializer.js` returns payout details with nullable optional bank fields.
- `scripts/regenerate-postman-collections.mjs` generates the public Postman examples.

## 2. Validation Changes

Previous behavior:
- `upiId` was optional in onboarding and payout details.
- `accountHolderName`, `bankName`, `bankAccount`, and `ifsc` were required in validators, service guards, and the Barber model.
- Payout execution could fall back to bank account plus IFSC when UPI was absent.

New behavior:
- `upiId` is required and must match the shared UPI pattern.
- Optional bank fields may be omitted.
- Optional bank fields may be sent as `null` or empty strings and are normalized to `null` by services.
- Partial bank payloads are accepted as long as provided non-empty values are valid.
- Payout initiation and retry require UPI and use UPI transfer mode.
- Cashfree beneficiary creation rejects bank-only instruments.

Final validation rules:
- `upiId`: required, trimmed, valid `local-part@provider` format.
- `accountHolderName`: optional, 1-100 characters when non-empty.
- `bankName`: optional, 1-120 characters when non-empty.
- `bankAccount`: optional, 6-34 digits when non-empty.
- `ifsc`: optional, valid IFSC pattern when non-empty, uppercased before persistence.

## 3. Files Updated

- `server/src/utils/payout-details.utils.js`: added shared UPI regex and payout string normalization helpers.
- `server/src/validators/common.validator.js`: added reusable `upiIdSchema`.
- `server/src/validators/onboarding.validator.js`: made UPI required and bank fields optional.
- `server/src/validators/shop.validator.js`: made UPI required for payout updates and bank fields optional.
- `server/src/models/barber.model.js`: required `upiId`, added UPI format validation, removed required constraints from bank fields.
- `server/src/services/onboarding.service.js`: normalized UPI and optional bank fields; direct service calls now enforce UPI.
- `server/src/services/shop.service.js`: preserved omitted bank fields, cleared null/empty bank fields, required UPI, and reset verification only when bank account or IFSC changes.
- `server/src/services/payout.service.js`: rejected bank-only payout destinations and forced UPI transfer mode for initiate/retry.
- `server/src/adapters/cashfree/cashfree-payout.adapter.js`: rejected beneficiary creation without UPI VPA.
- `server/scripts/regenerate-postman-collections.mjs`: updated onboarding and payout examples to include required UPI and omit optional bank fields.
- `server/postman-collections/02-onboarding.json`: regenerated UPI-based barber onboarding example.
- `server/postman-collections/07-barber-profile-shop.json`: regenerated UPI-only payout update example.
- `server/postman-collections/EverCut.postman_environment.json`: regenerated timestamp from Postman generation.
- `docs/features/auth/ONBOARDING-DATA-GUIDE.md`: updated barber onboarding field table and example.
- `docs/features/payments/BANK-DETAILS-MANAGEMENT-GUIDE.md`: updated validation rules, examples, errors, and testing checklist.
- `docs/features/payments/PAYMENT-GATEWAY-IMPLEMENTATION-GUIDE.md`: updated payout implementation notes and Cashfree beneficiary sample.
- Test files under validators, services, model, adapter, and route architecture were updated to lock in the new contract.

## 4. Implementation Details

Architectural considerations:
- Validation remains Joi-first at the route layer and service-enforced for direct internal calls.
- The shared `upiIdSchema` prevents onboarding and payout update schemas from drifting.
- Mongoose now protects persistence from invalid or missing UPI values even outside normal routes.
- Existing serializers already returned nullable payout fields, so no serializer changes were required.

Normalization strategy:
- Omitted bank fields on payout update are not written, preserving existing values.
- Explicit `null` or empty optional bank fields are normalized to `null` and clear stored values.
- On onboarding, omitted optional bank fields are stored as `null`.
- `ifsc` is uppercased only when present.

Business logic changes:
- Payout execution no longer treats bank account plus IFSC as sufficient.
- Payout retry also requires the current Barber profile to have UPI.
- Cashfree beneficiary creation accepts only UPI VPA for EverCut beneficiary creation.

Backward compatibility:
- Existing clients that still send all bank fields continue to pass when `upiId` is included.
- Bank details remain accepted and returned when present.
- Existing response shapes retain the same payout keys with `null` for absent optional values.

## 5. Test Coverage

Tests added or updated:
- Validator tests for missing, null, empty, and invalid `upiId`.
- Validator tests for omitted, partial, null, and empty optional bank fields.
- Model tests proving UPI is required and bank fields are optional.
- Onboarding service tests for required UPI and null optional bank persistence.
- Shop service tests for UPI-only updates, omitted bank preservation, and null/empty bank clearing.
- Payout service test rejecting bank-only destinations.
- Cashfree adapter test rejecting bank-only beneficiary creation.
- Postman source contract test proving examples include UPI and do not reference stale bank-required messaging.

Covered edge cases:
- Valid UPI.
- Missing UPI.
- Null UPI.
- Empty UPI.
- Invalid UPI format.
- All bank fields omitted.
- Individual optional bank fields provided.
- Optional bank fields sent as `null`.
- Optional bank fields sent as empty strings.
- Partial bank payloads.
- Bank-only legacy payout destination rejected.
- Provider-managed payout metadata stripped from user payloads.
- Generated Postman examples synchronized with implementation.

## 6. Test Execution Results

Commands executed:
- `node --test src/validators/__tests__/onboarding.validator.test.js src/validators/__tests__/shop.validator.test.js src/models/__tests__/barber-shop-boundary.model.test.js src/services/__tests__/onboarding.service.test.js src/services/__tests__/shop.service.test.js src/services/__tests__/payout.service.test.js src/routes/__tests__/routing-architecture.route.test.js`
  - Result: 41 tests passed, 0 failed.
- `node scripts/regenerate-postman-collections.mjs`
  - Result: regenerated Postman collections and environment timestamp.
- `node --test src/adapters/cashfree/__tests__/cashfree-payout.adapter.test.js src/services/__tests__/payout.service.test.js`
  - Result: 9 tests passed, 0 failed.
- `npm test`
  - Result: 250 tests passed, 0 failed.

Validation scans:
- Searched source, scripts, generated Postman collections, and active docs for stale phrases such as "UPI ID remains optional", "All bank details fields are required", and bank-only payout fallback references.
- No stale references remain in active implementation or API contract files.
- Remaining research-guide mentions are external payment rail notes, not EverCut API validation contracts.

## 7. Edge Cases Verified

- Missing UPI fails validation.
- Null UPI fails validation.
- Empty UPI fails validation.
- Invalid UPI fails validation.
- Omitted bank fields pass validation.
- Null optional bank fields pass validation and clear stored values on update.
- Empty optional bank fields pass validation and clear stored values on update.
- Partial optional bank updates pass validation when values are valid.
- Invalid bank account still fails when provided.
- Invalid IFSC still fails when provided.
- Bank-only payout execution fails before beneficiary creation or transfer.
- UPI-only payout details update preserves bank verification state unless bank account or IFSC changes.

## 8. Final Validation Summary

Implementation completeness:
- Complete across validators, services, model constraints, adapter boundary, business logic, generated Postman examples, tests, and active docs.

Documentation synchronization:
- Barber onboarding and payout details documentation now match the implementation.
- Payment gateway implementation notes now state required UPI and optional bank details.

Postman synchronization:
- Collections were regenerated from `server/scripts/regenerate-postman-collections.mjs`.
- Barber onboarding example includes required `upiId`.
- Payout update example sends required `upiId` and omits optional bank fields.

Regression verification:
- Full backend test suite passed.
- Post-change scans found no stale active-contract references.

Production readiness assessment:
- Ready for production from the backend perspective. The change is deterministic, covered by automated tests, and keeps existing response shapes stable while enforcing the new UPI-required contract.
