# EverCut Backend - Employees Section Fix Report

> **Generated:** 2026-03-20  
> **Primary scope:** `server/src/routes/barber.routes.js` employee endpoints and the connected employee-dependent booking/history flows.

---

## 1. Current Backend Context Reviewed

The `server/` backend follows a layered Express 5 structure:

- `src/routes/` defines public API surfaces for auth, onboarding, customer, and barber flows.
- `src/controllers/` reads validated request data and formats API responses.
- `src/services/` contains business rules and cross-repository orchestration.
- `src/repositories/` encapsulates Mongoose access.
- `src/models/` defines persistence rules and indexes.
- `src/validators/` uses Joi for request validation and normalization.
- `src/middleware/` handles authentication, uploads, validation, and error flow.
- `postman-collections/` contains the generated route-verification collections used for manual API checks.

The `Employees` request path reviewed was:

1. `src/routes/barber.routes.js`
2. `src/controllers/barber/barber-employee.controller.js`
3. `src/services/employee.service.js`
4. `src/repositories/employee.repository.js`
5. `src/models/employee.model.js`
6. `src/validators/employee.validator.js`

Connected downstream consumers also reviewed:

- `src/services/booking.service.js`
- `src/repositories/booking.repository.js`
- `src/services/earnings.service.js`
- `src/repositories/customer.repository.js`
- customer employee-calendar and booking-history routes

---

## 2. Issues Identified And Fixed

| Issue | Root Cause | Fix Implemented |
| --- | --- | --- |
| Employee input accepted invalid phone numbers, malformed `workingHours`, malformed `blockedDates`, and future DOB values. | `employee.validator.js` allowed broad `Joi.string()` fallback values and deferred too much parsing to the service/model layer. | Added strict employee validation for international phone numbers, `HH:MM` 24-hour working hours, normalized blocked-date arrays, and `dateOfBirth <= now`. |
| Invalid multipart employee requests could upload Cloudinary assets before body validation failed. | Multer runs before Joi validation on multipart routes, but validation failure did not clean uploaded files. | Added `src/utils/upload-cleanup.utils.js` and made validation middleware clean uploaded assets on validation failure only. |
| Recreating an employee after soft delete could fail with duplicate-key errors. | The employee unique index did not account for soft-deleted rows, and soft delete kept the original phone number. | Updated the model to use a partial unique index on active rows and changed employee soft delete to anonymize the stored phone number. |
| Race-condition duplicate writes could still leak as raw Mongo `11000` errors and orphan uploaded employee photos. | Service-level duplicate checks were pre-write only. | Added duplicate-write translation and Cloudinary cleanup in employee create/update service paths. |
| Employee deletion could break booking dashboards, booking history, earnings, and customer booking views. | Barber booking/earnings queries were scoped through active employee IDs instead of `shopId`, and booking populates hid soft-deleted employees. | Switched barber booking/earnings aggregation to `shopId`, populated deleted employees for historical bookings, and preserved booking history after employee soft delete. |
| Customer employee calendar and booking conflict checks could treat cancelled bookings as active. | Repository queries did not exclude cancelled bookings. | Updated employee-date calendar reads and slot-conflict lookups to ignore cancelled bookings. |
| Employees could be deleted while unresolved bookings still referenced them. | Employee deletion did not check for active future/pending usage. | Added a booking guard that blocks employee deletion when pending/confirmed bookings still exist. |

---

## 3. Similar Issues Found Elsewhere And Fixed

The same underlying patterns appeared in adjacent sections and were fixed consistently:

- `src/services/user.service.js`
  Customer profile photo replacement now validates email uniqueness first, cleans up newly uploaded assets on failed writes, and deletes the old asset only after a successful replacement.

- `src/services/account.service.js`
  Barber profile picture replacement now removes the previous Cloudinary asset only after the new database write succeeds.

- `src/services/photo.service.js`
  Shop cover replacement now cleans up the new upload on write failure and removes the previous cover only after success.

- `postman-collections/`
  Several generated collections were reading paginated responses as `response.data` instead of `response.data.items`. This was corrected in:
  `04-customer-bookings.json`, `08-barber-employees.json`, `09-barber-services.json`, `11-barber-photos.json`, and `13-barber-ratings.json`.

---

## 4. Files Modified

- `server/src/middleware/validate.middleware.js`
- `server/src/utils/upload-cleanup.utils.js`
- `server/src/validators/employee.validator.js`
- `server/src/models/employee.model.js`
- `server/src/repositories/employee.repository.js`
- `server/src/services/employee.service.js`
- `server/src/repositories/booking.repository.js`
- `server/src/repositories/customer.repository.js`
- `server/src/services/booking.service.js`
- `server/src/services/earnings.service.js`
- `server/src/services/user.service.js`
- `server/src/services/account.service.js`
- `server/src/services/photo.service.js`
- `server/src/middleware/__tests__/validate.middleware.test.js`
- `server/src/services/__tests__/employee.service.test.js`
- `server/src/services/__tests__/booking.service.test.js`
- `server/scripts/regenerate-postman-collections.mjs`
- `server/postman-collections/04-customer-bookings.json`
- `server/postman-collections/08-barber-employees.json`
- `server/postman-collections/09-barber-services.json`
- `server/postman-collections/11-barber-photos.json`
- `server/postman-collections/13-barber-ratings.json`
- `server/postman-collections/EverCut.postman_environment.json`

---

## 5. Verification Performed

### Syntax checks

- `node --check server/src/middleware/validate.middleware.js`
- `node --check server/src/validators/employee.validator.js`
- `node --check server/src/services/employee.service.js`
- `node --check server/src/repositories/booking.repository.js`
- `node --check server/src/services/booking.service.js`
- `node --check server/src/services/earnings.service.js`
- `node --check server/src/services/user.service.js`
- `node --check server/src/services/photo.service.js`
- `node --check server/src/services/account.service.js`
- `node --check server/src/utils/upload-cleanup.utils.js`
- `node --check server/scripts/regenerate-postman-collections.mjs`

### Targeted tests

- `node --test --test-isolation=none server/src/middleware/__tests__/validate.middleware.test.js`
- `node --test --test-isolation=none server/src/services/__tests__/employee.service.test.js`
- `node --test --test-isolation=none server/src/services/__tests__/booking.service.test.js`

### Postman artifact refresh

- `node server/scripts/regenerate-postman-collections.mjs`

Results:

- all syntax checks passed
- all targeted tests passed
- employee validation now normalizes multipart input correctly and rejects malformed data
- employee deletion is blocked when unresolved bookings still exist
- historical bookings, barber-side booking lists, and earnings calculations no longer disappear after employee soft deletes
- the regenerated Postman collections now read paginated list responses from `data.items`

---

## 6. Additional Observations

- The employee fix exposed a broader backend rule: any business object referenced by bookings should be queried historically by `shopId`, not indirectly through only active child records.
- Validation-time upload cleanup is now intentionally narrow. It runs on validation failures only, which avoids deleting successfully persisted assets during unrelated downstream failures.
- The employee unique-index correction is now consistent with the service catalog’s soft-delete-aware uniqueness approach.
