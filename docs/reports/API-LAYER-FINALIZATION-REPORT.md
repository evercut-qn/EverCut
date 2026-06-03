# API Layer Finalization Report

## 1. Summary

The backend already had a mostly resource-oriented Express API, but the API layer was still incomplete and inconsistent in a few important places:

- Favorites were tied to bookings through `GET /bookings?type=favorites` and the non-idempotent `PUT /bookings/:id/favorite`.
- There was no favorite shops model support or API surface.
- Payments supported create/status/verify/booking lookup, but did not expose `GET /payments`.
- The previous route/controller refactor wrapped simple files in domain `index.js` folders, which added structure without adding clarity.
- Postman documentation still emitted the old booking favorite endpoint.

Fixed:

- Moved booking favorites into `/bookings` and shop favorites into `/shops`.
- Added `favoriteShops` persistence on `Customer`.
- Added role-aware `GET /payments` and role-aware `GET /payments/:id` access.
- Restored simple direct route/controller files while keeping the corrected API surface.
- Removed the standalone `/favorites` API surface and the old non-idempotent favorite toggle behavior.
- Updated route architecture tests and Postman collection generation.

## 2. Key Issues Identified

Missing APIs:

- Missing get favorite bookings API: covered by `GET /bookings?type=favorites`.
- Missing favorite shops APIs: fixed with `GET /shops/favorites` and `PUT`, `DELETE`, and `PATCH` under `/shops/:id/favorite`.
- Missing get all payments API: fixed with `GET /payments`.

Bad structure:

- The previous refactor moved direct route/controller modules into `routes/<domain>/index.js` and `controllers/<domain>/index.js`, which made navigation harder without improving ownership.
- Favorites were briefly split into a standalone module; they now live in the booking and shop flows where they are used.

Inconsistencies:

- `PUT /bookings/:id/favorite` performed a toggle, which is not idempotent and therefore not a good `PUT`.
- `GET /payments/:id` was mounted for any authenticated user, but the service only supported customer ownership.
- Favorite booking and shop behavior now share customer profile persistence without a standalone favorites domain boundary.

## 3. Final API Design

All endpoints are mounted under `/api/v1`.

### Auth

- `POST /auth/otp/send` - public
- `POST /auth/otp/verify` - public
- `POST /auth/otp/resend` - public
- `POST /auth/token/refresh` - public
- `POST /auth/logout` - authenticated

### Onboarding

- `POST /onboarding/customers` - onboarding token
- `POST /onboarding/barbers` - onboarding token

### Customers

- `GET /customers/me` - customer
- `PUT /customers/me` - customer
- `GET /customers/me/home` - customer

### Shops

- `GET /shops/me` - barber
- `PUT /shops/me` - barber
- `GET /shops/me/upi` - barber
- `PUT /shops/me/upi` - barber
- `PUT /shops/me/security` - barber
- `PUT /shops/me/media/picture` - barber
- `PUT /shops/me/media/cover` - barber
- `PUT /shops/me` - barber
- `POST /shops/me/sign-out-everywhere` - barber
- `DELETE /shops/me` - barber
- `GET /shops/nearby/services` - public
- `GET /shops/nearby` - public
- `GET /shops/doorstep` - public
- `GET /shops/search` - public
- `GET /shops/favorites` - customer, list favorite shops
- `PUT /shops/:id/favorite` - customer, add shop favorite
- `DELETE /shops/:id/favorite` - customer, remove shop favorite
- `PATCH /shops/:id/favorite` - customer, toggle shop favorite
- `GET /shops/:id/employees` - public
- `GET /shops/:id/availability` - authenticated
- `GET /shops/:id` - public

### Employees

- `GET /employees/:id/calendar` - authenticated
- `GET /employees/:id/available-slots` - authenticated
- `GET /employees` - barber
- `POST /employees` - barber
- `PUT /employees/:id` - barber
- `DELETE /employees/:id` - barber

### Services

- `GET /services/search` - public
- `GET /services` - barber
- `POST /services` - barber
- `PUT /services/:id` - barber
- `DELETE /services/:id` - barber

### Bookings

- `POST /bookings` - customer
- `GET /bookings` - customer/barber
- `GET /bookings?type=favorites` - customer, list favorite bookings
- `GET /bookings/status` - barber
- `GET /bookings/pending-confirmations` - barber
- `GET /bookings/overview` - barber
- `GET /bookings/:id` - customer/barber
- `GET /bookings/:id/confirmation` - customer
- `PUT /bookings/:id` - customer
- `PUT /bookings/:id/reschedule` - customer
- `POST /bookings/:id/reorder` - customer
- `PUT /bookings/:id/favorite` - customer, add booking favorite
- `DELETE /bookings/:id/favorite` - customer, remove booking favorite
- `PATCH /bookings/:id/favorite` - customer, toggle booking favorite
- `PATCH /bookings/:id/confirm` - barber
- `POST /bookings/:id/cancel` - customer/barber
- `POST /bookings/:id/refund` - admin/barber
- `PUT /bookings/:id/status` - barber

### Photos

- `GET /photos` - barber
- `POST /photos` - barber
- `GET /photos/analytics` - barber
- `GET /photos/:id` - barber
- `DELETE /photos/:id` - barber

### Ratings

- `GET /shops/:id/ratings` - public
- `GET /shops/:id/ratings/analytics` - public
- `GET /ratings/analytics` - barber
- `GET /ratings` - barber
- `POST /ratings` - customer
- `PUT /ratings/:id/reply` - barber
- `DELETE /ratings/:id/reply` - barber
- `DELETE /ratings/:id` - barber

### Earnings

- `GET /earnings` - barber

### Payments

- `POST /payments/webhook` - provider/public callback
- `GET /payments` - customer/barber/admin
- `POST /payments` - customer
- `POST /payments/:id/verify` - customer
- `GET /payments/:id` - customer/barber/admin

### Payouts

- `POST /payouts/webhook` - provider/public callback
- `POST /payouts/:payoutId/retry` - admin

### Health

- `GET /health` - public

## 4. Implementation Changes

Added APIs:

- `PUT /bookings/:id/favorite`
- `DELETE /bookings/:id/favorite`
- `PATCH /bookings/:id/favorite`
- `GET /shops/favorites`
- `PUT /shops/:id/favorite`
- `DELETE /shops/:id/favorite`
- `PATCH /shops/:id/favorite`
- `GET /payments`

Removed APIs:

- `GET /favorites/bookings`
- `PUT /favorites/bookings/:id`
- `DELETE /favorites/bookings/:id`
- `PATCH /favorites/bookings/:id/toggle`
- `GET /favorites/shops`
- `PUT /favorites/shops/:id`
- `DELETE /favorites/shops/:id`
- `PATCH /favorites/shops/:id/toggle`

Modified APIs:

- `GET /payments/:id` is now explicitly authorized for `CUSTOMER`, `BARBER`, and `ADMIN`, with service-level ownership checks.
- `GET /bookings?type=favorites` remains the booking-list filter for favorite bookings and is handled inside the booking service.

## 5. File-Wise Changes

Routes:

- `server/src/routes/index.js` now imports direct route files without mounting `/favorites`.
- `server/src/routes/bookings.routes.js` owns booking favorite add/remove/toggle routes.
- `server/src/routes/shops.routes.js` owns favorite shop list/add/remove/toggle routes.
- `server/src/routes/payment.routes.js` adds `GET /payments` and explicit role authorization for `GET /payments/:id`.
- Other `server/src/routes/*.routes.js` files are direct route files; unnecessary `routes/<domain>/index.js` wrappers were removed.

Controllers:

- `server/src/controllers/booking.controller.js` adds booking favorite HTTP handlers.
- `server/src/controllers/shop.controller.js` adds favorite shop HTTP handlers.
- `server/src/controllers/payment.controller.js` adds `getPayments` and passes full actor context to status reads.
- `server/src/controllers/favorite.controller.js` was removed.
- Other `server/src/controllers/*.controller.js` files are direct controller files; unnecessary `controllers/<domain>/index.js` wrappers were removed.

Services:

- `server/src/services/booking.service.js` owns favorite booking list/add/remove/toggle logic and ownership checks.
- `server/src/services/shop.service.js` owns favorite shop list/add/remove/toggle logic.
- `server/src/services/payment.service.js` adds role-aware payment listing and access checks.

Repositories and models:

- `server/src/models/customer.model.js` adds `favoriteShops`.
- `server/src/repositories/customer.repository.js` adds favorite shop mutations and populated favorite list readers.
- `server/src/repositories/payment.repository.js` adds `findAll` and `countAll`.

Validators:

- `server/src/validators/payment.validator.js` adds `paymentListQuerySchema`.

Tests and docs:

- `server/src/routes/__tests__/routing-architecture.route.test.js` validates direct route/controller files, booking/shop favorite APIs, and payment list routing.
- `server/src/routes/__tests__/customer-service-removal.route.test.js` now reads the direct booking files.
- `server/src/services/__tests__/booking.service.test.js` covers favorite booking behavior.
- `server/src/services/__tests__/shop.service.test.js` covers favorite shop behavior.
- `server/src/services/__tests__/payment.service.test.js` covers role-scoped `GET /payments`.
- `server/scripts/regenerate-postman-collections.mjs` now emits booking/shop favorite APIs and `GET /payments`.
- `server/postman-collections/*.json` and `server/postman-collections/README.md` were regenerated/updated for the changed API surface.
- `docs/architecture/ROUTING-STRATEGY-ANALYSIS.md` now reflects direct route/controller files and flow-based favorite placement.

## 6. Final Folder Structure

```text
server/src/routes/
  index.js
  auth.routes.js
  onboarding.routes.js
  customers.routes.js
  shops.routes.js
  employees.routes.js
  services.routes.js
  bookings.routes.js
  photos.routes.js
  ratings.routes.js
  earnings.routes.js
  payment.routes.js
  payout.routes.js

server/src/controllers/
  auth.controller.js
  onboarding.controller.js
  customer.controller.js
  shop.controller.js
  employee.controller.js
  service.controller.js
  booking.controller.js
  photo.controller.js
  rating.controller.js
  earnings.controller.js
  payment.controller.js
  payout.controller.js

server/src/services/
  booking.service.js
  payment.service.js
  ...
```

## 7. Assumptions

- A customer can favorite only their own bookings.
- A customer can favorite any existing, non-deleted shop visible through the shop repository.
- Favorite `DELETE` routes are idempotent membership removals; they require the customer profile but do not require the underlying booking/shop document to still be visible.
- `GET /payments` means "all payments visible to the authenticated actor":
  - customers see their own payment transactions
  - barbers see transactions for their own shop
  - admins see all transactions
- Payment lists do not poll PhonePe per item; they return stored transaction state for scalable listing. Single-payment reads may still sync mutable payments with the gateway.
- Historical reports under `docs/reports/` can remain historical snapshots; this report is the current API finalization document.

## 8. Validation Checklist

- [x] All route files reviewed.
- [x] All controller files reviewed.
- [x] Middleware and authorization flow reviewed.
- [x] Models relevant to bookings, favorites, shops, and payments reviewed.
- [x] Existing API documentation and Postman generator reviewed.
- [x] Toggle favorite exists through `PATCH /bookings/:id/favorite`.
- [x] Get favorite bookings exists through `GET /bookings?type=favorites`.
- [x] Favorite shops APIs exist.
- [x] Get all payments exists through `GET /payments`.
- [x] Standalone favorites module removed.
- [x] RESTful favorite add/remove endpoints added with `PUT` and `DELETE`.
- [x] Direct route/controller file structure implemented.
- [x] Booking favorite, shop favorite, payments, and shop discovery flows are connected.
- [x] Automated backend test suite passes.
