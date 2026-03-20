# EverCut Backend - Request Query Validation Fix Report

> **Generated:** 2026-03-20  
> **Scope:** Generic request validation middleware, all query-validated routes in `server/src/routes`, and the controller contract used by the barber and customer APIs.

---

## 1. Backend Context Reviewed

The `server/` directory follows a layered Express backend structure:

- `src/app.js` and `src/server.js` bootstrap the Express 5 application, register middleware, mount routes, and wire global error handling.
- `src/routes/` defines the public API surface for auth, onboarding, customer, and barber flows.
- `src/controllers/` translates HTTP requests into service calls and formats API responses.
- `src/services/` contains business logic, pagination handling, and repository orchestration.
- `src/repositories/` encapsulates MongoDB and Mongoose access.
- `src/models/` defines persisted entities.
- `src/middleware/` handles authentication, authorization, logging, uploads, validation, and error translation.
- `src/validators/` uses Joi to validate and sanitize route inputs.
- `src/utils/` contains shared helpers such as pagination, response formatting, logging, and request-related utilities.

That review confirmed the failing request path for `GET /api/v1/barber/services` is:

1. `authenticate`
2. `authorize`
3. `validate(serviceListQuerySchema, 'query')`
4. `barber-service.controller.js`
5. `service-catalog.service.js`
6. `service.repository.js`

The same validation middleware is also used by other query-validated customer and barber routes, so the problem was not isolated to one endpoint.

---

## 2. Issue Identified

**Observed failure**  
`GET /api/v1/barber/services` returned HTTP 500 with:

`TypeError: Cannot set property query of #<IncomingMessage> which has only a getter`

**Root cause**  
The generic validation middleware in `src/middleware/validate.middleware.js` validated `req.query` with Joi and then reassigned the sanitized result back to `req.query`.

That behavior no longer works on this backend stack because:

- `package.json` uses `express@^5.2.1`
- Express 5 defines `req.query` as a getter-backed property on the request object
- assigning to `req.query` throws at runtime before the controller executes

This is why the error appears inside the middleware instead of deeper in the service or repository layers.

---

## 3. Fix Applied

### Design decision

The fix was kept minimal and aligned with the existing architecture:

- stop mutating `req.query`
- keep sanitized query data available to downstream code
- avoid breaking existing body and params controller behavior
- apply the fix consistently across all query-validated routes

### Implementation

1. Added `src/utils/request-validation.utils.js`

This utility now:

- stores validated request payloads under `req.validated[source]`
- exposes explicit aliases such as `req.validatedQuery`
- provides `getValidatedRequestData(req, source)` so controllers can read sanitized inputs safely

2. Refactored `src/middleware/validate.middleware.js`

The middleware now:

- validates the incoming source with Joi
- stores the sanitized payload via `storeValidatedRequestData(req, source, value)`
- only reassigns mutable request sources (`body` and `params`)
- never writes back to `req.query`

3. Updated controllers behind query-validated routes

The affected controllers now read validated query data through `getValidatedRequestData(req, 'query')` instead of relying on `req.query` being overwritten:

- `src/controllers/barber/barber-service.controller.js`
- `src/controllers/barber/barber-photo.controller.js`
- `src/controllers/barber/barber-booking.controller.js`
- `src/controllers/customer/customer-shop.controller.js`
- `src/controllers/customer/customer-booking.controller.js`

4. Added a regression test

`src/middleware/__tests__/validate.middleware.test.js` now verifies that:

- query validation succeeds without throwing
- sanitized query data is available through the new validated-request contract
- raw `req.query` remains untouched
- body validation behavior still works as before

---

## 4. Why This Fix Is Correct

- It removes the direct cause of the 500 by avoiding writes to an immutable Express request property.
- It preserves the existing controller contract for `req.body` and `req.params`, so the blast radius stays small.
- It centralizes validated input handling in a reusable utility instead of scattering one-off route patches.
- It covers every route that uses `validate(..., 'query')`, preventing the same regression from surfacing elsewhere.

---

## 5. Verification Performed

The following verification was completed after the fix:

- `node --check src\\utils\\request-validation.utils.js`
- `node --check src\\middleware\\validate.middleware.js`
- `node --check src\\controllers\\barber\\barber-service.controller.js`
- `node --check src\\controllers\\barber\\barber-photo.controller.js`
- `node --check src\\controllers\\barber\\barber-booking.controller.js`
- `node --check src\\controllers\\customer\\customer-shop.controller.js`
- `node --check src\\controllers\\customer\\customer-booking.controller.js`
- `node --test --test-isolation=none src\\middleware\\__tests__\\validate.middleware.test.js`

Results:

- syntax checks passed for every modified JavaScript file
- the regression test passed
- the original query-validation path now returns success instead of throwing
- body validation behavior remained intact

---

## 6. Affected Routes Protected By The Fix

The change protects all routes currently using query validation middleware:

- `GET /api/v1/barber/services`
- `GET /api/v1/barber/bookings/status`
- `GET /api/v1/barber/photos`
- `GET /api/v1/customer/homepage/services`
- `GET /api/v1/customer/bookings`
- `GET /api/v1/customer/shops/nearby`
- `GET /api/v1/customer/search/services`
- `GET /api/v1/customer/search/shops`
- `GET /api/v1/customer/employees/:id/calendar`

---

## 7. Outcome

The root cause was the generic validation middleware attempting to overwrite `req.query` on an Express 5 request object, where `req.query` is getter-only.

The backend now stores sanitized request data in a dedicated validated-request container and reads validated query input explicitly where needed. This removes the runtime error, preserves current behavior for mutable request sources, and keeps the change consistent with the project's existing layered backend design.
