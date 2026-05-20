# Service Catalog Fixes Report

> Legacy snapshot: This document records findings against the pre-2026-04-24 role-prefixed routing layout and removed `controllers/customer/*` / `controllers/barber/*` files. Treat route and file references here as historical unless explicitly updated. For the current API surface, see [ROUTING-STRATEGY-ANALYSIS](../architecture/ROUTING-STRATEGY-ANALYSIS.md).

> **Generated:** 2026-03-20  
> **Scope:** Backend service-management flows driven by the Add Service UI (Single and Bundle), plus the related booking and Postman integrations.

---

## 1. Summary

This document records the issues identified while reviewing the backend against the current Add Service screens, along with the fixes that were implemented.

The review showed that the backend already had service CRUD endpoints, but some important behaviors were either missing or only partially implemented. The main problems were:

- The validator rules did not fully match the UI payloads
- Bundled service pricing was not consistently usable across the rest of the system
- Service updates could leave derived prices stale
- Duplicate service handling did not align with service type, gender, or soft-delete behavior
- Service listing did not support clean filtering for the Single and Bundle tabs
- Booking validation did not ensure selected services belonged to the chosen shop
- Postman collections were slightly out of sync with the real API response shapes and request bodies

---

## 2. Issues And Fixes

### Issue 1 - Add Service validation did not match the current UI

**Problem found**  
The Add Service screens show:

- A single-service flow with service, gender, amount, and offer value
- A bundle flow with bundle name, selected services, gender, amount, and offer value

The backend, however, required:

- `duration` for every `single` service
- `totalDuration` for every `bundled` service

This meant the backend expected fields that are not clearly present in the current UI flow.

**Root cause**  
The Joi validators had become stricter than the live product flow and no longer reflected the actual request shape the UI implies.

**Fix implemented**  
Updated [service.validator.js](/c:/Users/manis/Projects/EverCut/server/src/validators/service.validator.js) so that:

- `duration` is optional for `single` services
- `totalDuration` is optional for `bundled` services
- `bundledServices` remains required for `bundled` services
- `offerPrice` cannot exceed `actualPrice`
- service list query validation now supports filtering by `serviceType` and `serviceFor`

**Impact on the existing system**  
- The backend now accepts request bodies that align with the current Add Service screens
- Existing clients that still send `duration` or `totalDuration` continue to work
- Validation is stricter where it matters most: invalid discounts are now blocked early

---

### Issue 2 - Bundled services did not expose a consistent bookable price

**Problem found**  
The create-service flow stored bundled pricing in `totalPrice`, but other backend flows such as booking, booking confirmation, and some service reads rely on `finalPrice` as the effective price.

This created a partial implementation:

- bundled services could be created
- but downstream flows could treat them as having no usable price

That could lead to incorrect totals, including `0` in some booking scenarios.

**Root cause**  
The system had two pricing fields for services (`finalPrice` and `totalPrice`), but the logic using them was not centralized. Bundled services were saved one way and consumed another way.

**Fix implemented**  
Created [service-pricing.utils.js](/c:/Users/manis/Projects/EverCut/server/src/utils/service-pricing.utils.js) to centralize pricing logic:

- `calculateDiscountedPrice()`
- `getEffectiveServicePrice()`
- `normalizeServicePricing()`

Then applied that pricing normalization in:

- [service-catalog.service.js](/c:/Users/manis/Projects/EverCut/server/src/services/service-catalog.service.js)
- [shop.service.js](/c:/Users/manis/Projects/EverCut/server/src/services/shop.service.js)
- [booking.service.js](/c:/Users/manis/Projects/EverCut/server/src/services/booking.service.js)

**Impact on the existing system**  
- Bundled services now behave consistently across create, read, and booking flows
- Booking totals, booking confirmations, and customer-facing service payloads now use a reliable effective price
- This removes a hidden pricing bug without changing the external endpoint structure

---

### Issue 3 - Service updates did not recompute derived pricing fields

**Problem found**  
Updating a service could change `actualPrice` or `offerPrice`, but the backend update path did not recalculate derived price fields. That meant the service record could become internally inconsistent after an edit.

**Root cause**  
The update path passed incoming data directly to the repository instead of rebuilding the full service payload with recalculated derived values.

**Fix implemented**  
Refactored [service-catalog.service.js](/c:/Users/manis/Projects/EverCut/server/src/services/service-catalog.service.js) so that both create and update flows use shared service-payload construction logic:

- `buildServicePayload()`
- `assertValidDiscount()`
- `normalizeBundledServices()`

Now:

- `finalPrice` is recalculated when pricing changes
- `totalPrice` is recalculated for bundled services
- bundled service names are normalized and deduplicated
- image URL is refreshed if the service name changes

**Impact on the existing system**  
- Edited services remain internally consistent
- Pricing bugs caused by stale derived values are removed
- Update behavior is more predictable and safer for future frontend changes

---

### Issue 4 - Duplicate service handling did not match real business dimensions

**Problem found**  
The old uniqueness model treated `shopId + serviceName` as unique. That was too broad for the UI and business model because it did not account for:

- `serviceType` (`single` vs `bundled`)
- `serviceFor` (`men`, `women`, `unisex`)
- soft-deleted records

This could block legitimate combinations such as:

- the same name used for different genders
- the same name used for a single service and a bundle
- re-adding a previously deleted service

**Root cause**  
The database index and duplicate check logic were designed around only the service name, not the full business identity of a service.

**Fix implemented**  
Updated [service.model.js](/c:/Users/manis/Projects/EverCut/server/src/models/service.model.js) and [service-catalog.service.js](/c:/Users/manis/Projects/EverCut/server/src/services/service-catalog.service.js) so that:

- the unique index is now scoped to `shopId + serviceType + serviceFor + serviceName`
- the index only applies to active, non-deleted records via `partialFilterExpression`
- duplicate checks in the service layer now use the same business rules

**Impact on the existing system**  
- Duplicate handling now aligns with how the UI is structured
- Soft-deleted services no longer permanently block re-creation
- Gender-specific and type-specific service definitions are supported correctly

**Rollout note**  
The previous MongoDB unique index on `{ shopId, serviceName }` must be dropped or synced during deployment so the new partial unique index can take effect cleanly.

---

### Issue 5 - Service listing did not support clean Single/Bundle filtering

**Problem found**  
The route `GET /barber/services` returned paginated services, but it did not support filtering by service type or service-for category. That made it harder for the frontend to support distinct Single and Bundle tabs cleanly from one endpoint.

**Root cause**  
The listing endpoint supported pagination, but not the UI-specific filters needed by the current screen design.

**Fix implemented**  
Added query-level filtering support in:

- [service.validator.js](/c:/Users/manis/Projects/EverCut/server/src/validators/service.validator.js)
- [barber.routes.js](/c:/Users/manis/Projects/EverCut/server/src/routes/barber.routes.js)
- [service-catalog.service.js](/c:/Users/manis/Projects/EverCut/server/src/services/service-catalog.service.js)

Supported filters now include:

- `serviceType`
- `serviceFor`
- existing pagination parameters

**Impact on the existing system**  
- The frontend can request only single services or only bundled services as needed
- Existing clients that call the list endpoint without filters still continue to work
- The endpoint is more flexible without introducing a new route

---

### Issue 6 - Booking validation did not ensure services belonged to the selected shop

**Problem found**  
During the service-flow review, an integrity gap was identified in booking: service IDs were validated for existence, but not verified against the selected `shopId`.

That meant a request could potentially combine:

- one shop in `shopId`
- service IDs belonging to another shop

**Root cause**  
The booking logic validated the service documents, but it did not verify ownership of those services relative to the requested shop.

**Fix implemented**  
Updated [booking.service.js](/c:/Users/manis/Projects/EverCut/server/src/services/booking.service.js) so booking now rejects requests where:

- any selected service does not belong to the target shop
- the number of resolved services does not match the number of requested service IDs

**Impact on the existing system**  
- Prevents cross-shop service selection inconsistencies
- Strengthens backend integrity for customer bookings
- Reduces the risk of invalid mixed-shop booking payloads from clients

---

### Issue 7 - Postman collections were not fully aligned with the live API behavior

**Problem found**  
The affected Postman collections had a few mismatches:

- some scripts assumed `response.data` was a raw array, but the real endpoint returns paginated data under `response.data.items`
- service request examples still reflected the old validation assumptions

**Root cause**  
The backend and Postman collections had drifted slightly apart over time.

**Fix implemented**  
Updated:

- [09-barber-services.json](/c:/Users/manis/Projects/EverCut/server/postman-collections/09-barber-services.json)
- [04-customer-bookings.json](/c:/Users/manis/Projects/EverCut/server/postman-collections/04-customer-bookings.json)

Changes included:

- fixing paginated response parsing in test scripts
- updating request descriptions
- updating sample request bodies to match the corrected service-validator behavior

**Impact on the existing system**  
- Postman examples now reflect the real API contract more accurately
- Manual QA and API verification are less likely to produce false failures
- The collections now better represent the mobile UI payload expectations

---

## 3. Files Updated

### Backend files

- [service.model.js](/c:/Users/manis/Projects/EverCut/server/src/models/service.model.js)
- [service.repository.js](/c:/Users/manis/Projects/EverCut/server/src/repositories/service.repository.js)
- [service.validator.js](/c:/Users/manis/Projects/EverCut/server/src/validators/service.validator.js)
- [barber.routes.js](/c:/Users/manis/Projects/EverCut/server/src/routes/barber.routes.js)
- [service-catalog.service.js](/c:/Users/manis/Projects/EverCut/server/src/services/service-catalog.service.js)
- [shop.service.js](/c:/Users/manis/Projects/EverCut/server/src/services/shop.service.js)
- [booking.service.js](/c:/Users/manis/Projects/EverCut/server/src/services/booking.service.js)
- [service-pricing.utils.js](/c:/Users/manis/Projects/EverCut/server/src/utils/service-pricing.utils.js)

### Postman files

- [09-barber-services.json](/c:/Users/manis/Projects/EverCut/server/postman-collections/09-barber-services.json)
- [04-customer-bookings.json](/c:/Users/manis/Projects/EverCut/server/postman-collections/04-customer-bookings.json)

---

## 4. Verification Performed

The following focused verification was completed after the fixes:

- `node --check` on the updated backend JavaScript files
- JSON parsing validation for the updated Postman collections

This confirmed that:

- the modified backend files are syntactically valid
- the updated Postman collections remain valid JSON

---

## 5. Overall Outcome

The backend now supports the service-management UI more completely and more safely.

Most importantly:

- the Add Service flows are aligned with the UI
- bundled services now participate correctly in pricing-related flows
- edits no longer leave service pricing stale
- list filtering supports the Single and Bundle tabs
- booking integrity is stronger
- Postman collections accurately reflect the live API behavior

These changes were intentionally kept focused so they integrate cleanly with the existing layered architecture and minimize unnecessary system-wide churn.
