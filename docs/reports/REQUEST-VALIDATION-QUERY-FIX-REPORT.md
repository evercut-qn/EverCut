# Request Validation Query Fix Report

> Legacy snapshot: This document records findings against the pre-2026-04-24 role-prefixed routing layout and removed `controllers/customer/*` / `controllers/barber/*` files. Treat route and file references here as historical unless explicitly updated. For the current API surface, see [ROUTING-STRATEGY-ANALYSIS](../architecture/ROUTING-STRATEGY-ANALYSIS.md).

> **Generated:** 2026-03-20  
> **Scope:** Generic request validation middleware, all validated routes in `server/src/routes`, and the controller contract used by the barber and customer APIs.

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

The same validation middleware is also used by many body-, params-, and query-validated routes, so the long-term fix needed a consistent request contract across the backend instead of a route-specific patch.

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

The long-term design chosen for this backend is:

- never mutate `req.body`, `req.params`, or `req.query` inside validation middleware
- store sanitized values only under `req.validated[source]`
- make controllers read validated input explicitly from that container
- fail fast if a controller expects validated input but the route is missing the matching validation middleware
- keep pagination fields available on validated paginated query routes

### Implementation

1. Added `src/utils/request-validation.utils.js`

This utility now:

- stores validated request payloads under `req.validated[source]`
- provides `getValidatedRequestData(req, source)` so controllers can read validated inputs explicitly
- throws if a controller asks for validated data that was never populated by middleware

2. Refactored `src/middleware/validate.middleware.js`

The middleware now:

- validates the incoming source with Joi
- stores the sanitized payload via `storeValidatedRequestData(req, source, value)`
- never writes sanitized data back onto native Express request properties

3. Updated controllers behind validated routes

Controllers that sit behind `validate(...)` now read from `req.validated.*` via `getValidatedRequestData(req, source)` instead of reading raw request properties. This covers validated:

- auth request bodies
- onboarding request bodies
- barber request bodies, params, and validated queries
- customer request bodies, params, and validated queries

In practice, the affected controllers include:

- `src/controllers/barber/barber-service.controller.js`
- `src/controllers/barber/barber-photo.controller.js`
- `src/controllers/barber/barber-booking.controller.js`
- `src/controllers/barber/barber-employee.controller.js`
- `src/controllers/barber/barber-profile.controller.js`
- `src/controllers/barber/barber-rating.controller.js`
- `src/controllers/barber/barber-shop.controller.js`
- `src/controllers/customer/customer-shop.controller.js`
- `src/controllers/customer/customer-booking.controller.js`
- `src/controllers/customer/customer-profile.controller.js`
- `src/controllers/customer/customer-rating.controller.js`
- `src/controllers/auth.controller.js`
- `src/controllers/onboarding.controller.js`

4. Fixed validated booking query schemas

`src/validators/booking.validator.js` now extends `paginationSchema` for:

- `customerBookingsQuerySchema`
- `bookingsByStatusQuerySchema`

This preserves `page` and `limit` on validated booking routes. Before this change, those values were stripped by Joi even though the service layer paginates the results.

5. Added regression tests

`src/middleware/__tests__/validate.middleware.test.js` now verifies that:

- query validation succeeds without throwing
- sanitized query data is available through the new validated-request contract
- raw `req.query` remains untouched
- raw `req.body` remains untouched while validated body data is available separately
- raw `req.params` remains untouched while validated params data is available separately
- validated booking query schemas preserve `page` and `limit`

---

## 4. Why This Fix Is Correct

- It removes the direct cause of the 500 by avoiding writes to an immutable Express request property.
- It applies one input contract everywhere: raw input stays raw, validated input lives in `req.validated.*`.
- It avoids silent fallback behavior, so missing validation middleware is easier to detect during development.
- It centralizes validated input handling in a reusable utility instead of scattering one-off route patches.
- It corrects paginated validated booking queries so schema validation and service-layer pagination are aligned.

---

## 5. Verification Performed

The following verification was completed after the fix:

- `node --check src\\utils\\request-validation.utils.js`
- `node --check src\\middleware\\validate.middleware.js`
- `node --check src\\controllers\\barber\\barber-service.controller.js`
- `node --check src\\controllers\\barber\\barber-photo.controller.js`
- `node --check src\\controllers\\barber\\barber-booking.controller.js`
- `node --check src\\controllers\\barber\\barber-employee.controller.js`
- `node --check src\\controllers\\barber\\barber-profile.controller.js`
- `node --check src\\controllers\\barber\\barber-rating.controller.js`
- `node --check src\\controllers\\barber\\barber-shop.controller.js`
- `node --check src\\controllers\\customer\\customer-shop.controller.js`
- `node --check src\\controllers\\customer\\customer-booking.controller.js`
- `node --check src\\controllers\\customer\\customer-profile.controller.js`
- `node --check src\\controllers\\customer\\customer-rating.controller.js`
- `node --check src\\controllers\\auth.controller.js`
- `node --check src\\controllers\\onboarding.controller.js`
- `node --check src\\validators\\booking.validator.js`
- `node --test --test-isolation=none src\\middleware\\__tests__\\validate.middleware.test.js`

Results:

- syntax checks passed for every modified JavaScript file
- the regression test suite passed
- the original query-validation path now returns success instead of throwing
- validated body, params, and query data are now separated cleanly from raw request data
- validated booking queries now preserve pagination fields

---

## 6. Affected Routes Protected By The Fix

The change protects the original failing query path and standardizes every route currently using validation middleware. That includes:

- `POST /api/v1/auth/otp/send`
- `POST /api/v1/auth/otp/verify`
- `POST /api/v1/auth/otp/resend`
- `POST /api/v1/auth/token/refresh`
- `POST /api/v1/onboarding/customers`
- `POST /api/v1/onboarding/barbers`
- `GET /api/v1/employees`
- `GET /api/v1/services`
- `GET /api/v1/bookings`
- `GET /api/v1/bookings/status`
- `GET /api/v1/photos`
- `GET /api/v1/ratings`
- `GET /api/v1/customers/me/home/services`
- `GET /api/v1/shops/nearby`
- `GET /api/v1/shops/:id/ratings`
- `GET /api/v1/services/search`
- `GET /api/v1/shops/search`
- `GET /api/v1/employees/:id/calendar`
- all validated body and params routes under `/api/v1/auth`, `/api/v1/onboarding`, and the resource routes mounted under `/api/v1`

---

## 7. Outcome

The root cause was the generic validation middleware attempting to overwrite `req.query` on an Express 5 request object, where `req.query` is getter-only.

The backend now uses a single explicit validated-input contract: Joi-sanitized data is stored under `req.validated.*`, controllers read from that contract, and native Express request properties are never rewritten by validation middleware. This removes the runtime error, makes validation behavior consistent across the backend, and aligns validated query pagination with the service layer.
