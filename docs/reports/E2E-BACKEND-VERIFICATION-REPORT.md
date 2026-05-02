# E2e Backend Verification Report

> Legacy snapshot: This document records findings against the pre-2026-04-24 role-prefixed routing layout and removed `controllers/customer/*` / `controllers/barber/*` files. Treat route and file references here as historical unless explicitly updated. For the current API surface, see [ROUTING-STRATEGY-ANALYSIS](../architecture/ROUTING-STRATEGY-ANALYSIS.md).

> **Generated:** 2026-03-20  
> **Scope:** Full authenticated, database-backed API verification after the request-validation refactor.

---

## 1. Objective

Validate the backend in the way the application is actually used:

- real authenticated customer and barber flows
- live database reads and writes
- route-level validation, controllers, services, repositories, and Mongoose integration
- critical barber and customer features beyond the original `req.query` runtime error

This verification was necessary because the validation fix removed the original Express 5 crash, but that alone did not prove the backend was healthy end to end.

---

## 2. E2E Scope Executed

The live run exercised these API areas successfully:

- health check
- OTP send and OTP verify for both customer and barber accounts
- customer onboarding
- barber onboarding
- token refresh for both account types
- barber profile
- barber service create and paginated service listing
- barber employee create and employee listing
- barber photo upload, list, stats, and detail
- customer profile and homepage data
- nearby shops, shop detail, service search, and shop search
- customer rating create
- barber ratings and barber reply create, update, and delete
- customer booking create
- customer booking list, detail, confirmation, favorite toggle, update, reschedule, delete service, reorder, and employee calendar
- barber booking list, status filtering, stats, status updates, and completed-booking view
- customer logout and barber logout

The final authenticated run completed successfully against the live local backend and database with no unhandled server errors.

---

## 3. Additional Issues Found During Live Verification

### Issue A: employee creation validation rejected multipart input

**Observed behavior**

`POST /api/v1/barber/employees` failed validation with:

`"blockedDates" must be an array`

**Root cause**

The route accepts `multipart/form-data`, so fields such as `blockedDates` arrive as strings.  
`employee.service.js` already supports normalizing stringified `blockedDates`, but `addEmployeeSchema` only accepted an array.

**Fix**

`src/validators/employee.validator.js` now accepts either:

- `Joi.array().items(Joi.date())`
- `Joi.string()`

This matches the existing service-layer parsing behavior and removes the validator-service mismatch.

### Issue B: global `sanitizeFilter` broke trusted internal MongoDB operators

**Observed behavior**

Several search, pagination, and booking endpoints failed during the live run with cast errors caused by filters containing operators such as:

- `$regex`
- `$in`
- `$gte`
- `$lt`
- `$ne`
- `$not`
- `$elemMatch`

**Root cause**

`src/config/database.config.js` enables:

`mongoose.set('sanitizeFilter', true);`

That is a good default for untrusted input, but Mongoose also sanitizes trusted server-built operator objects unless they are explicitly marked trusted. Repository filters built internally by the application were therefore being rewritten and then cast incorrectly.

**Fix**

A new utility, `src/utils/mongoose-query.utils.js`, recursively wraps trusted internal operator objects with `mongoose.trusted(...)` before repositories hand them to Mongoose.

That utility was applied in:

- `src/repositories/service.repository.js`
- `src/repositories/shop.repository.js`
- `src/repositories/booking.repository.js`
- `src/repositories/employee.repository.js`

The helper was also corrected to preserve `ObjectId` values instead of treating them as plain objects.

### Issue C: reorder booking depended on replica-set-only transactions

**Observed behavior**

`POST /api/v1/customer/bookings/:id/reorder` failed with:

`Transaction numbers are only allowed on a replica set member or mongos`

**Root cause**

`src/services/booking.service.js` used a Mongoose transaction in `reorderBooking()`, but the local backend is running against a standalone MongoDB instance. Standalone MongoDB does not support multi-document transactions.

**Fix**

`reorderBooking()` was refactored to use the same compensating-action pattern already used elsewhere in the booking service:

- claim the new employee slot
- create the new booking
- release the claimed slot if booking creation fails

This keeps the behavior safe without depending on replica-set infrastructure.

---

## 4. Tests Added

The verification work added and extended automated coverage:

- `src/middleware/__tests__/validate.middleware.test.js`
  - query, body, and params validated-input contract
  - booking pagination query preservation
  - multipart-compatible employee creation validation
- `src/utils/__tests__/mongoose-query.utils.test.js`
  - trusted operator preservation under `sanitizeFilter`
  - untrusted operator sanitization behavior
  - `ObjectId` preservation

---

## 5. Verification Performed

The following checks were completed while applying these fixes:

- `node --check` on all modified backend JavaScript files
- `node --test --test-isolation=none src\\middleware\\__tests__\\validate.middleware.test.js src\\utils\\__tests__\\mongoose-query.utils.test.js`
- full live authenticated API exercise against the running backend and database

Result:

- automated checks passed
- the final end-to-end run passed
- the original request-validation fix remained correct
- no additional runtime regressions were observed in the exercised flows

---

## 6. Design Assessment

The long-term request-validation design is still the correct one:

- never mutate `req.body`, `req.params`, or `req.query`
- store sanitized data under `req.validated.*`
- make controllers read validated input explicitly

That is the best contract for this backend because it is explicit, compatible with Express 5, and avoids hidden side effects on framework-owned request properties.

The live E2E run showed that the validation design was necessary but not sufficient by itself. The backend also needed the multipart validation fix, trusted Mongoose operator handling, and standalone-safe booking reorder flow described above.

---

## 7. Outcome

The backend now passes a full authenticated, database-backed end-to-end verification across customer and barber flows.

The original Express 5 `req.query` crash is fixed, and the additional runtime issues discovered during real API execution were also resolved with minimal changes that align with the existing layered architecture.
