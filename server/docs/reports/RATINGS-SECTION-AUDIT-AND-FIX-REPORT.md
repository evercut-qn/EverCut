# Ratings Section Audit And Fix Report

> **Generated:** 2026-03-20  
> **Scope:** `server/` architecture review with a deep dive into the ratings routes, controllers, services, repositories, models, validators, and related QA assets.

## 1. Server Architecture Context

The `server/` directory is organized as a layered Express 5 backend:

- `src/app.js` bootstraps middleware, routing, 404 handling, and the global error handler.
- `src/routes/` defines API surface areas for auth, onboarding, customer, and barber flows.
- `src/controllers/` translates validated HTTP requests into service calls and standard API envelopes.
- `src/services/` holds business rules, ownership checks, pagination, and orchestration across repositories.
- `src/repositories/` encapsulates Mongoose access patterns.
- `src/models/` defines persistence schemas and indexes.
- `src/validators/` uses Joi to validate and sanitize route inputs.
- `src/middleware/` handles authentication, authorization, uploads, validation, logging, and error translation.
- `postman-collections/` and `scripts/regenerate-postman-collections.mjs` provide the primary manual QA assets.

Within that structure, the ratings flow is:

1. `customer.routes.js` / `barber.routes.js`
2. `validate(...)`
3. `customer-rating.controller.js` / `barber-rating.controller.js`
4. `rating.service.js`
5. `rating.repository.js`
6. `rating.model.js`

The ratings section also depends on:

- `customer.repository.js` to resolve the authenticated user into a `Customer`
- `shop.repository.js` for shop existence and barber-ownership checks
- `booking.repository.js` for booking-based eligibility rules

## 2. Issues Identified In The Ratings Section

### Issue A: Customers could rate shops without ever completing a booking there

**Root cause**  
`addRating()` only checked authenticated customer identity, shop existence, and duplicate ratings. It never verified that the customer had completed any booking for the target shop.

**Impact**  
- Incorrect business behavior
- Low-trust ratings and review spam risk
- Customers could rate arbitrary shops discovered through search/nearby APIs

**Fix implemented**  
- Added `bookingRepository.hasCompletedBooking(customerId, shopId)`
- Updated `rating.service.js` to require at least one completed booking before allowing a rating

### Issue B: Reply creation and reply updates used stale Mongoose documents

**Root cause**  
`rating.repository.js` used `findByIdAndUpdate()` without `{ new: true }` for reply add/update/delete operations.

**Impact**  
- `POST /barber/ratings/:id/reply` could throw at runtime because the returned document still had `reply: null`
- `PUT /barber/ratings/:id/reply` returned stale reply content instead of the updated value

**Fix implemented**  
- Switched reply mutations to `findOneAndUpdate(...)`
- Added `{ new: true, runValidators: true }`
- Kept response population aligned with the updated document

### Issue C: `POST /barber/ratings/:id/reply` could overwrite an existing reply

**Root cause**  
The service exposed separate `POST` and `PUT` endpoints, but the `POST` path did not reject ratings that already had a reply.

**Impact**  
- Incorrect route semantics
- Existing replies could be overwritten through the create endpoint

**Fix implemented**  
- Added a service-level conflict check for existing replies
- Added repository-level conditional updates so create/update/delete reply operations enforce the expected reply state

### Issue D: Ratings APIs leaked reviewer email addresses unnecessarily

**Root cause**  
`rating.repository.js` populated nested `User.email`, and `rating.service.js` returned that email in customer-facing and barber-facing rating responses.

**Impact**  
- Reviewer privacy exposure
- Unnecessary PII in API payloads

**Fix implemented**  
- Removed email population from rating reads
- Standardized response shaping to return reviewer name and photo only

### Issue E: Ratings list and summary endpoints returned `200` for nonexistent shops

**Root cause**  
`getRatingsByShop()` and `getRatingSummary()` counted ratings directly by `shopId` without confirming that the shop existed.

**Impact**  
- Invalid shop IDs that passed ObjectId validation produced misleading empty successful responses
- Inconsistent behavior compared with other shop-centric endpoints

**Fix implemented**  
- Added explicit shop existence checks before listing ratings or building summaries

### Issue F: Ratings summary loaded every rating document into memory

**Root cause**  
`getShopSummary()` read all ratings for a shop and computed totals in JavaScript.

**Impact**  
- Avoidable memory and CPU overhead on larger datasets
- Weaker scaling characteristics for a hot read path

**Fix implemented**  
- Replaced the in-memory summary computation with a MongoDB aggregation pipeline

### Issue G: Rating reply validation allowed whitespace-only strings

**Root cause**  
The Joi schema used `required().max(500)` but did not trim or enforce a non-empty post-trim value.

**Impact**  
- Validators and service rules were misaligned
- Blank replies could pass validation and only fail later in service logic

**Fix implemented**  
- Updated `addReplySchema` to use `.trim().min(1).required()`
- Updated review validation to trim review text as well

## 3. Similar Issues Found Elsewhere And Fixed

### Similar issue 1: Seed data used `User` IDs where `Customer` IDs were required

**Location**  
`server/scripts/seed-barber-rating-mock-data.js`

**Root cause**  
The ratings and booking fixtures wrote `customer.user._id` into `customerId`, but both `Booking.customerId` and `Rating.customerId` now reference the `Customer` model.

**Impact**  
- Seeded barber rating flows could populate reviewer data incorrectly or not at all
- Postman verification became unreliable even when the API code was correct

**Fix implemented**  
- Updated the seed script to use `customer.profile._id` for both bookings and ratings

### Similar issue 2: Postman collections still treated paginated responses as raw arrays

**Locations**  
- `server/scripts/regenerate-postman-collections.mjs`
- regenerated JSON collections under `server/postman-collections/`

**Root cause**  
Several collection scripts still read `response.data` directly even though the backend now returns paginated envelopes as `response.data.items`.

**Impact**  
- ID capture scripts silently failed
- QA flows looked broken even when endpoints were behaving correctly

**Fix implemented**  
- Updated paginated capture logic for:
  - customer bookings
  - barber employees
  - barber services
  - barber photos
  - barber ratings

### Similar issue 3: Customer ratings Postman flow no longer matched the corrected rating rules

**Location**  
`06-customer-ratings.json` and its generator source

**Root cause**  
The collection bootstrapped a random nearby shop, but the corrected backend now requires a completed booking at the rated shop.

**Impact**  
- The collection would select unrated/invalid targets and fail with a business-rule error

**Fix implemented**  
- Changed the bootstrap request to capture a shop from completed past bookings instead of nearby shops
- Updated the collection README to document the new prerequisite

## 4. Files Modified

- `server/src/validators/rating.validator.js`
- `server/src/repositories/booking.repository.js`
- `server/src/repositories/rating.repository.js`
- `server/src/services/rating.service.js`
- `server/src/middleware/__tests__/validate.middleware.test.js`
- `server/src/services/__tests__/rating.service.test.js`
- `server/scripts/seed-barber-rating-mock-data.js`
- `server/scripts/regenerate-postman-collections.mjs`
- `server/postman-collections/README.md`
- regenerated Postman collections:
  - `server/postman-collections/04-customer-bookings.json`
  - `server/postman-collections/06-customer-ratings.json`
  - `server/postman-collections/08-barber-employees.json`
  - `server/postman-collections/09-barber-services.json`
  - `server/postman-collections/11-barber-photos.json`
  - `server/postman-collections/13-barber-ratings.json`

## 5. Verification Performed

The following verification is expected for this fix set:

- syntax checks on the modified backend source files
- `node --test` for the new `rating.service` test coverage
- regeneration of Postman collections from the updated generator

The automated test coverage added here verifies:

- rating creation rejects customers without completed bookings
- duplicate rating writes resolve to clean conflict errors
- nonexistent shops return `404` for ratings list/summary
- reviewer emails are omitted from rating payloads
- reply creation rejects duplicates and trims reply text
- barber ownership mismatches now surface as `403 Forbidden`
- rating validators trim reviews and reject blank replies

The existing validation middleware regression test was also adjusted to invoke middleware directly instead of binding a local socket. That keeps the same assertions intact while making the suite portable in sandboxed environments where ephemeral ports are blocked.

## 6. Additional Observations

- The ratings section now follows the project’s established pattern more closely: validators normalize input, services enforce business rules and ownership, repositories stay responsible for conditional writes, and responses avoid leaking unnecessary internal data.
- The Postman and seed fixes were necessary to make route verification trustworthy. Without them, QA artifacts would still have failed even after the backend logic was corrected.
