# EverCut Backend - Ratings Section Fix Report

> **Generated:** 2026-03-20  
> **Primary scope:** `server/src/routes/customer.routes.js` and `server/src/routes/barber.routes.js` rating endpoints, plus the connected rating data consumers.

---

## 1. Current Backend Context Reviewed

The `server/` backend follows a layered Express 5 structure:

- `src/routes/` defines the API surface for customer and barber flows.
- `src/controllers/` reads validated request data and formats response envelopes.
- `src/services/` contains business rules and authorization checks.
- `src/repositories/` encapsulates Mongoose access.
- `src/models/` defines Mongo persistence rules and indexes.
- `src/validators/` applies Joi validation and normalization before controllers run.
- `postman-collections/` contains the generated route-verification artifacts used for manual QA.

The ratings request path reviewed was:

1. `src/routes/customer.routes.js`
2. `src/routes/barber.routes.js`
3. `src/controllers/customer/customer-rating.controller.js`
4. `src/controllers/barber/barber-rating.controller.js`
5. `src/services/rating.service.js`
6. `src/repositories/rating.repository.js`
7. `src/models/rating.model.js`
8. `src/validators/rating.validator.js`

Connected consumers also reviewed:

- `src/repositories/booking.repository.js`
- `src/services/shop.service.js`
- `src/middleware/__tests__/validate.middleware.test.js`
- `scripts/seed-barber-rating-mock-data.js`
- `scripts/regenerate-postman-collections.mjs`
- `postman-collections/06-customer-ratings.json`
- `postman-collections/13-barber-ratings.json`
- `postman-collections/README.md`

---

## 2. Issues Identified And Fixed

| Issue | Root Cause | Fix Implemented |
| --- | --- | --- |
| Customers could rate shops without ever completing a booking there. | `addRating()` resolved the customer, shop, and duplicate-rating state, but never verified booking eligibility. | Added a booking-level eligibility check through `booking.repository.js`, and `addRating()` now rejects rating creation unless the customer has a completed booking at that shop. |
| `POST /barber/ratings/:id/reply` could overwrite an existing reply instead of behaving like a create-only route. | `rating.service.js` did not check whether a reply already existed before calling the repository update path. | Added an explicit conflict guard so `POST` now fails with `409 Conflict` when a reply already exists. |
| Reply add/update endpoints could return stale data or crash on a fresh reply. | `rating.repository.js` used `findByIdAndUpdate()` without `{ new: true }`, so the service received the pre-update document. | Enabled `{ new: true, runValidators: true }` for reply mutations and kept the updated document populated for the response payload. |
| Duplicate rating writes could still surface as raw MongoDB `11000` errors. | `addRating()` only pre-checked for an existing rating, but the unique index can still win the race on concurrent writes. | Added duplicate-key translation in `rating.service.js` so race-condition duplicates now return a clean `409 Conflict`. |
| Customer and barber rating list payloads exposed customer email addresses unnecessarily. | The repository populated nested `userId.email`, and the service returned it directly in rating responses. | Removed the nested email population and standardized rating serialization to return only name/photo fields needed by the current API. |
| `/customer/shops/:id/ratings` and `/customer/shops/:id/ratings/summary` returned empty success payloads even when the shop ID did not exist. | The service counted ratings directly without first resolving the parent shop resource. | Added explicit shop existence checks so unknown shop IDs now return `404 Not Found`. |
| Ratings embedded in the shop-details response were inconsistent and missed customer photo data. | `shop.service.js` manually rebuilt rating payloads, while `rating.repository.js` did not populate `customer.photoUrl`. | Added a shared rating serializer and expanded the repository populate to include `photoUrl`, then reused that serializer in `shop.service.js`. |
| Rating summary calculation loaded every rating document into memory. | `rating.repository.js#getShopSummary()` used `find().lean()` plus in-process aggregation. | Replaced the in-memory summary calculation with a MongoDB aggregation pipeline. |
| Ownership failures in barber rating management used the wrong HTTP semantics. | `rating.service.js` threw `BadRequestError` for "not your shop" cases. | Switched those paths to `ForbiddenError` so authorization failures return `403`. |
| Reply validation allowed whitespace-only input to reach the service layer. | `rating.validator.js` used a plain required string without trimming/min-length enforcement. | Added `.trim().min(1)` to reply validation and trimmed review text consistently. |

---

## 3. Similar Issues Found Elsewhere And Fixed

The same ratings-related inconsistencies appeared outside the dedicated ratings routes:

- `src/services/shop.service.js`
  The customer shop-details endpoint was building a second, partially different rating shape and expecting customer `photoUrl` that the repository did not populate. This was corrected by introducing `src/utils/rating-response.utils.js` and reusing it in both `rating.service.js` and `shop.service.js`.

- `scripts/seed-barber-rating-mock-data.js`
  The seed script was still writing `User._id` into `Booking.customerId` and `Rating.customerId` even though both now reference `Customer`. That fixture now uses the seeded customer profile ID, and the seed summary also prints the customer profile ID explicitly.

- `postman-collections/06-customer-ratings.json`
  The customer ratings collection was still capturing a random nearby shop, which no longer matches the booking-based eligibility rule. The collection now captures `shop_id` from the authenticated customer's completed past bookings and fails clearly when no eligible booking exists.

- `postman-collections/13-barber-ratings.json`
  The collection assumed add-reply was safely rerunnable with `200 OK`. After fixing the create-only reply behavior, the generated collection and README were updated to document/accept the correct `409 Conflict` rerun outcome.

- `src/middleware/__tests__/validate.middleware.test.js`
  The validation regression tests were opening a local HTTP socket just to assert sanitized request storage. Those tests now invoke the middleware directly, which keeps the assertions intact and makes the suite safe in sandboxed environments where ephemeral ports may be blocked.

---

## 4. Files Modified

- `server/src/repositories/booking.repository.js`
- `server/src/repositories/rating.repository.js`
- `server/src/services/rating.service.js`
- `server/src/services/shop.service.js`
- `server/src/validators/rating.validator.js`
- `server/src/utils/rating-response.utils.js`
- `server/src/middleware/__tests__/validate.middleware.test.js`
- `server/src/services/__tests__/rating.service.test.js`
- `server/src/repositories/__tests__/rating.repository.test.js`
- `server/src/validators/__tests__/rating.validator.test.js`
- `server/scripts/seed-barber-rating-mock-data.js`
- `server/scripts/regenerate-postman-collections.mjs`
- `server/postman-collections/06-customer-ratings.json`
- `server/postman-collections/13-barber-ratings.json`
- `server/postman-collections/README.md`
- `server/postman-collections/EverCut.postman_environment.json`

---

## 5. Verification Performed

### Syntax checks

- `node --check server/src/repositories/booking.repository.js`
- `node --check server/src/utils/rating-response.utils.js`
- `node --check server/src/repositories/rating.repository.js`
- `node --check server/src/services/rating.service.js`
- `node --check server/src/services/shop.service.js`
- `node --check server/src/validators/rating.validator.js`
- `node --check server/scripts/seed-barber-rating-mock-data.js`
- `node --check server/scripts/regenerate-postman-collections.mjs`

### Targeted tests

- `node --test --test-isolation=none server/src/services/__tests__/rating.service.test.js server/src/repositories/__tests__/rating.repository.test.js server/src/validators/__tests__/rating.validator.test.js server/src/middleware/__tests__/validate.middleware.test.js`

### Postman artifact refresh

- `node server/scripts/regenerate-postman-collections.mjs`

Results:

- all syntax checks passed
- all targeted tests passed
- rating creation now requires a completed booking at the target shop
- reply add/update flows now return the updated rating data instead of stale pre-update documents
- duplicate add-rating and duplicate add-reply paths now return conflict responses cleanly
- unknown shop IDs now fail as `404` on rating list and summary routes
- rating payloads are now consistent across dedicated rating endpoints and customer shop details
- validation regression tests now run without binding a local socket

---

## 6. Additional Observations

- The customer ratings Postman flow now depends on at least one completed past booking on the authenticated customer account. That keeps the collection aligned with the backend business rule, but it also makes the prerequisite explicit instead of hiding it behind nearby-shop discovery.
- The ratings management API still allows barbers to delete ratings entirely. That behavior is explicit in the current route surface and Postman artifacts, so it was left intact. If the product should preserve review history immutably, that should be handled as a separate product/security decision rather than an incidental bug fix.
