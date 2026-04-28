# Ratings Route Audit Report

> Legacy snapshot: This document records findings against the pre-2026-04-24 role-prefixed routing layout and removed `controllers/customer/*` / `controllers/barber/*` files. Treat route and file references here as historical unless explicitly updated. For the current API surface, see [ROUTING-STRATEGY-ANALYSIS](../architecture/ROUTING-STRATEGY-ANALYSIS.md).

> **Generated:** 2026-03-21
> **Scope:** `server/src/routes/*` rating endpoints, connected controllers/services/repositories/models/validators, and the related Postman/docs artifacts

---

## 1. Current Backend Context

The `server/` application is an Express 5 API mounted under `/api/v1` with a consistent layered structure:

- `src/routes/` defines role-based HTTP surfaces (`customer`, `barber`, `auth`, `onboarding`)
- `src/controllers/` reads validated input from `req.validated` and returns the standard `ApiResponse` envelope
- `src/services/` contains business rules, ownership checks, and pagination orchestration
- `src/repositories/` encapsulates Mongoose queries and aggregates
- `src/models/` defines the persisted MongoDB schema and indexes
- `src/validators/` applies Joi validation before controllers execute

For the Ratings section, the shared persistence layer is:

- Model: `src/models/rating.model.js`
- Repository: `src/repositories/rating.repository.js`
- Service: `src/services/rating.service.js`
- Serializer: `src/utils/rating-response.utils.js`
- Validator: `src/validators/rating.validator.js`

Role-specific entry points are:

- Customer: `src/routes/customer.routes.js` -> `src/controllers/customer/customer-rating.controller.js`
- Barber: `src/routes/barber.routes.js` -> `src/controllers/barber/barber-rating.controller.js`

---

## 2. Task 1 - All Existing Ratings Routes

### Customer role

| Method | Path | Purpose | Validators | Controller | Service |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/v1/customer/ratings` | Submit one rating for a shop the customer has completed a booking with | `addRatingSchema` | `addRating` | `addRating` |
| `GET` | `/api/v1/customer/shops/:id/ratings` | List ratings for a specific shop with pagination | `shopIdParamSchema`, `paginationSchema` | `getRatingsByShop` | `getRatingsByShop` |
| `GET` | `/api/v1/customer/shops/:id/ratings/summary` | Return aggregate rating metrics for a specific shop | `shopIdParamSchema` | `getRatingSummary` | `getRatingSummary` |

### Barber role

| Method | Path | Purpose | Validators | Controller | Service |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/barber/ratings` | List ratings for the authenticated barber's owned shop with pagination | `paginationSchema` | `getRatings` | `getRatingsByShopForBarber` |
| `GET` | `/api/v1/barber/ratings/summary` | Return aggregate rating metrics for the authenticated barber's owned shop | None required: no route params, query, or body input | `getRatingSummary` | `getRatingSummaryForBarber` |
| `POST` | `/api/v1/barber/ratings/:id/reply` | Create a reply on a rating owned by the barber's shop | `objectIdParamSchema`, `addReplySchema` | `addReply` | `addReplyToRating` |
| `PUT` | `/api/v1/barber/ratings/:id/reply` | Update an existing reply on a rating owned by the barber's shop | `objectIdParamSchema`, `addReplySchema` | `updateReply` | `updateReplyToRating` |
| `DELETE` | `/api/v1/barber/ratings/:id/reply` | Remove an existing reply from a rating owned by the barber's shop | `objectIdParamSchema` | `deleteReply` | `deleteReplyFromRating` |
| `DELETE` | `/api/v1/barber/ratings/:id` | Delete a rating owned by the barber's shop | `objectIdParamSchema` | `removeRating` | `removeRating` |

### Naming convention review

Current route naming is mostly coherent:

- Customer reads are nested under the parent shop resource: `/customer/shops/:id/ratings...`
- Customer creates are collection-scoped: `/customer/ratings`
- Barber routes are owner-scoped under the controlled collection: `/barber/ratings...`
- Reply management is modeled as a clear sub-resource: `/ratings/:id/reply`

The only parity gap found during this audit was that customer routes already exposed a `summary` read shape while barber routes did not.

---

## 3. Task 2 - Missing Routes And Functional Gaps

### Missing route identified

| Missing or incomplete item | Why it was expected | Status |
| --- | --- | --- |
| `GET /api/v1/barber/ratings/summary` | The codebase already had a shared rating summary aggregate (`rating.repository.js#getShopSummary`) and customer-facing summary route. Barber already had list access for the same owned shop, so summary access was the missing read-side counterpart. | Implemented |

### Additional functional gaps found

| Gap | Impact | Status |
| --- | --- | --- |
| `postman-collections/13-barber-ratings.json` captured seeded IDs from `match._id`, but ratings responses serialize the identifier as `ratingId` | The barber ratings Postman flow could fail to capture IDs even when the API responded correctly | Fixed |
| `scripts/regenerate-postman-collections.mjs` generated the same stale `_id` capture logic | Regenerating collections would reintroduce the broken barber ratings flow | Fixed |
| Architecture and Postman reference docs did not mention the barber-side summary route | Docs drifted from the completed implementation after the parity fix | Fixed |

### Items reviewed but intentionally not added

- Customer update/delete rating routes were not added.
  There is no current product or architecture evidence in this repo that customers are meant to edit or delete submitted ratings.
- Barber rating detail-by-id was not added.
  The existing list response already returns the data required by reply and delete flows, and no current client artifact expects a dedicated detail route.

---

## 4. Task 3 - Naming And Structural Issues

### Issues found

| Area | Finding | Action |
| --- | --- | --- |
| Route parity | Customer exposed `ratings/summary`, barber did not | Added `/barber/ratings/summary` |
| Verification artifacts | Postman used `_id` while the API emits `ratingId` | Updated generator and generated collection to read `ratingId` first |
| Documentation | Ratings route references did not describe the barber summary endpoint | Updated docs |

### Observations left unchanged to avoid unnecessary churn

- `getRatingsByShopForBarber` is slightly verbose but still clear and non-breaking, so it was left as-is.
- The public response serializer returns a `user` object even though the backing relation is `customerId`.
  This is a naming mismatch at the API-contract level, but changing it now would be a breaking response change. It is better handled in a versioned cleanup.
- Other barber modules use `stats` for some aggregates (`/bookings/stats`, `/photos/stats`), while ratings uses `summary`.
  This audit kept `summary` for ratings so both customer and barber rating endpoints use the same aggregate naming.

---

## 5. Task 4 - Fixes Implemented

### Backend changes

- Added `GET /api/v1/barber/ratings/summary` in `src/routes/barber.routes.js`
- Added `getRatingSummary` controller in `src/controllers/barber/barber-rating.controller.js`
- Added `getRatingSummaryForBarber(ownerId)` in `src/services/rating.service.js`
- Added a focused service test covering barber summary resolution through the owned shop

### Postman and documentation changes

- Updated `scripts/regenerate-postman-collections.mjs` to:
  - generate the new barber summary request
  - capture seeded rating IDs from `ratingId` instead of assuming `_id`
- Regenerated `postman-collections/13-barber-ratings.json`
- Updated `postman-collections/README.md`
- Updated `docs/architecture/IMPLEMENTATION-PLAN.md`

---

## 6. Files Modified

- `server/src/routes/barber.routes.js`
- `server/src/controllers/barber/barber-rating.controller.js`
- `server/src/services/rating.service.js`
- `server/src/services/__tests__/rating.service.test.js`
- `server/scripts/regenerate-postman-collections.mjs`
- `server/postman-collections/13-barber-ratings.json`
- `server/postman-collections/README.md`
- `docs/architecture/IMPLEMENTATION-PLAN.md`
- `docs/reports/RATINGS-ROUTE-AUDIT-REPORT.md`

---

## 7. Verification

Targeted verification for this audit:

- `node --check src/routes/barber.routes.js`
- `node --check src/controllers/barber/barber-rating.controller.js`
- `node --check src/services/rating.service.js`
- `node --check scripts/regenerate-postman-collections.mjs`
- `node --test src/services/__tests__/rating.service.test.js`
- `node scripts/regenerate-postman-collections.mjs`

Expected outcomes:

- barber rating summary route resolves without validation/runtime errors
- service test coverage includes the new summary path
- regenerated Postman collection includes the new summary request
- seeded barber rating flows capture IDs from `ratingId` successfully

---

## 8. Recommendations

1. If ratings become editable by customers, add that only with a clear product rule for whether replies are preserved, cleared, or versioned.
2. Consider documenting the serialized ratings contract explicitly, especially the use of `ratingId` and `user`, to reduce future Postman/client drift.
3. If the API ever gets a version bump, consider renaming response `user` to `customer` for better alignment with the database model and service naming.
