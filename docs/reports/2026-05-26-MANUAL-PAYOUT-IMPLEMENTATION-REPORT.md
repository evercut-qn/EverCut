# Manual Payout Implementation and Validation Report

> Date: May 26, 2026
> Scope: Manual payout mode, admin payout APIs, Cashfree preservation, Postman support, tests, and documentation.

---

## 1. Complete Implementation Summary

Implemented a production-ready manual payout workflow for admins while preserving the existing automatic Cashfree payout infrastructure. The backend now supports manual payout queue review, manual payout recording, payout history/detail lookup, failure correction, audit fields, duplicate prevention, and feature-toggle-safe Cashfree bypass.

---

## 2. Architecture Decisions Taken

- Kept the existing layered architecture: route, controller, validator, service, repository, model, serializer.
- Used existing `User.roleType=ADMIN` and OTP/JWT auth instead of creating a new admin model.
- Kept `GET /payouts/pending` because pending manual payouts are derived from bookings, not payout records.
- Avoided duplicate list APIs such as `/payouts/completed` or `/payouts/failed`; filters live on `GET /payouts`.
- Used atomic booking claim semantics for double-payout prevention.
- Kept Cashfree webhook and retry routes active for backward compatibility.

---

## 3. Deviations and Improvements from Original Guide

- Replaced check-then-update duplicate prevention with atomic booking claims.
- Added a partial unique index on `PayoutTransaction.utr`.
- Restricted `PATCH /payouts/:id` to manual payouts only.
- Added `lastStatusUpdatedByAdminId` so failure correction does not overwrite the admin who completed the payout.
- Corrected payment settlement naming to `settlement.settled`.
- Corrected automatic payout validation so no-show bookings match the batch query.
- Used validated request data in controllers instead of raw `req.body` or `req.query`.

---

## 4. API Changes Summary

New admin endpoints:

- `GET /api/v1/payouts/pending`
- `GET /api/v1/payouts`
- `POST /api/v1/payouts`
- `GET /api/v1/payouts/:payoutId`
- `PATCH /api/v1/payouts/:payoutId`

Preserved endpoints:

- `POST /api/v1/payouts/webhook`
- `POST /api/v1/payouts/:payoutId/retry`

---

## 5. Route Additions and Changes

`server/src/routes/payout.routes.js` now registers admin payout management routes after public webhook and authentication middleware. `/:payoutId/retry` is registered before `/:payoutId` to avoid route conflicts.

---

## 6. Service-Level Changes

`server/src/services/payout.service.js` now includes:

- `getPendingPayoutsForAdmin`
- `createManualPayout`
- `updatePayoutStatus`
- `listPayouts`
- `getPayoutDetail`

Existing Cashfree functions remain intact.

---

## 7. Controller-Level Changes

`server/src/controllers/payout.controller.js` now exposes the new admin handlers and uses `getValidatedRequestData()` for query, params, and body inputs.

---

## 8. Middleware Changes

No new middleware was required. Existing `authenticate`, `authorize(ROLES.ADMIN)`, and `validate` middleware were reused.

---

## 9. Schema and Model Changes

`PayoutTransaction` received additive fields:

- `gateway`
- `completedByAdminId`
- `lastStatusUpdatedByAdminId`
- `adminNotes`

Indexes added:

- `gateway/status/createdAt` admin query index
- partial unique `utr` index

---

## 10. Migration Details

No destructive migration is required. Existing payout records remain valid and serialize as `gateway=cashfree` when the field is absent.

Operational note: MongoDB will build the new unique partial UTR index at startup/model initialization. Existing duplicate non-null UTR values should be checked before production rollout.

---

## 11. Validation Improvements

Added Joi schemas for:

- pending payout query
- manual payout create
- payout status update
- payout history query

Validation now covers unique booking IDs, UTR normalization, ObjectId inputs, pagination, sort syntax, date filters, and gateway/status enums.

---

## 12. Security Improvements

- Admin-only route guards on all manual payout operations.
- Admin identity is sourced from JWT, not request payload.
- Amount is computed server-side from payment records.
- Cashfree payouts cannot be manually mutated through the manual correction endpoint.
- OTP rate limiting remains the brute-force protection for admin login.

---

## 13. Concurrency Handling Strategy

- Manual payout creation atomically claims all requested bookings by current state.
- Stale or concurrent submissions return `409 Conflict`.
- Manual status correction uses status-precondition updates.
- Duplicate UTR is prevented at service and database levels.
- Manual failure correction reopens bookings and unsettles linked payments for retry.

---

## 14. Backward Compatibility Validation

Backward compatibility was preserved:

- Cashfree webhook route remains public and signature-verified.
- Cashfree retry route remains admin-only.
- Automatic payout service remains in place.
- Existing payout records remain serializable.
- Manual mode bypasses only automatic batch/poller execution.

---

## 15. Cashfree Preservation Strategy

`config.payout.mode` is set to `manual`. The batch job and poller self-skip in manual mode, but Cashfree adapter, webhook handling, retry handling, and automatic payout code remain available for future reactivation.

---

## 16. Feature Toggle Implementation Details

The toggle is code-level:

```javascript
payout: Object.freeze({
  mode: 'manual'
})
```

`runPayoutBatchNow` and `startPayoutPoller` accept override options in tests, so auto-mode compatibility can be verified without changing production config.

---

## 17. Testing Coverage Summary

Automated tests cover:

- manual payout happy path
- stale booking claim conflict
- manual failure correction
- Cashfree payout patch rejection
- no-show auto payout compatibility
- validator behavior
- payout route architecture
- manual batch skip
- manual poller skip

Full suite result on May 26, 2026:

```text
npm test
tests 262
pass 262
fail 0
```

---

## 18. Edge-Case Validation Summary

Covered or documented:

- duplicate booking IDs
- duplicate UTR
- concurrent admin submissions
- stale pending-list submissions
- already settled payments
- invalid status transitions
- missing admin auth
- non-admin access
- manual retry after failure
- Cashfree auto path preservation

---

## 19. Known Limitations

- `payout.mode` is code-level, not environment-managed.
- There is no dedicated persistent audit collection; audit is stored on payout records and application logs.
- Cross-collection MongoDB transactions were not introduced to preserve compatibility with local standalone MongoDB setups used by the project.
- There is no admin dashboard UI in this implementation.

---

## 20. Rollback Considerations

To resume automatic payouts:

1. Change `config.payout.mode` to `auto`.
2. Confirm Cashfree sandbox or production credentials.
3. Run payout batch and poller tests.
4. Deploy.
5. Monitor Cashfree webhook and payout status logs.

Manual payout records remain valid after rollback.

---

## 21. Future Re-enable Strategy

Before re-enabling Cashfree in production:

- Reconcile pending manual payouts.
- Verify no duplicate non-null UTR values before index build.
- Confirm Cashfree beneficiary data and UPI requirements.
- Run staging batch with `payoutMode: 'auto'`.
- Validate webhook success, failure, and reversal flows.

---

## 22. File-by-File Implementation Summary

- `server/src/utils/constants.js`: added payout gateway constants.
- `server/src/config/index.js`: added `payout.mode`.
- `server/src/models/payout-transaction.model.js`: added manual metadata fields and indexes.
- `server/src/repositories/payout.repository.js`: added create/id/query/detail/atomic helpers.
- `server/src/repositories/booking.repository.js`: added manual claim, complete, fail, release, and pending aggregation methods.
- `server/src/repositories/payment.repository.js`: added session-compatible settlement updates.
- `server/src/services/payout.service.js`: added manual payout business logic and preserved Cashfree flow.
- `server/src/controllers/payout.controller.js`: added admin payout handlers.
- `server/src/routes/payout.routes.js`: added compact RESTful admin payout routes.
- `server/src/validators/payout.validator.js`: added manual payout schemas.
- `server/src/serializers/payout.serializer.js`: added manual/audit serialization.
- `server/src/jobs/payout-batch.cron.js`: skips automatic batch in manual mode.
- `server/src/jobs/payout-poller.cron.js`: skips poller in manual mode.
- `server/scripts/create-admin-user.mjs`: added admin bootstrap script.
- `server/scripts/regenerate-postman-collections.mjs`: added admin auth and manual payout collection support.
- `server/postman-collections/*.json`: regenerated affected Postman artifacts.
- `docs/features/payouts/MANUAL-PAYOUT-IMPLEMENTATION-GUIDE.md`: aligned guide with final implementation.
- `docs/testing/MANUAL-PAYOUT-POSTMAN-TESTING-GUIDE.md`: added full Postman testing guide.

---

## 23. Assumptions Made

- Manual payout mode is temporary but must be production-safe.
- Admin users are pre-created operational users, not self-registering users.
- UTR is available only after the admin completes the external transfer.
- UPI remains the primary payout destination for barbers.
- Existing local MongoDB setups may not run as replica sets.

---

## 24. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Double payout | Atomic booking claim plus UTR unique index |
| Stale admin screen | State validation and `409 Conflict` |
| Cashfree regression | Existing routes/services preserved and tested |
| Admin correction corrupts Cashfree payout | Manual correction restricted to `gateway=manual` |
| Lost audit actor | `completedByAdminId` and `lastStatusUpdatedByAdminId` |
| Partial persistence failure | Deterministic reconciliation via payout and booking references |

---

## 25. Final Verification Checklist

- Manual payout routes implemented.
- Admin auth flow supported in Postman.
- Manual payout creation computes amount server-side.
- Duplicate UTR rejected.
- Duplicate booking processing rejected.
- Manual failure correction reopens bookings.
- Cashfree webhook and retry preserved.
- Automatic batch/poller skip in manual mode.
- Postman collections regenerated.
- Manual payout testing guide created.
- Full automated test suite passed.

