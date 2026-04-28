# EverCut Routing Strategy Analysis

> Status: implemented on 2026-04-24
> Scope audited: `server/src/routes`, `server/src/controllers`, `server/src/services`, `server/src/middleware`, `server/src/utils`

## Final Decision

EverCut now uses a **feature-based, resource-oriented routing architecture with role-aware authorization**.

This decision was derived from the backend code, not from preference alone:

- Shared business logic was already concentrated in feature services such as `booking.service.js`, `rating.service.js`, `shop.service.js`, `service-catalog.service.js`, `photo.service.js`, `earnings.service.js`, and `payment.service.js`.
- The largest duplication existed at the HTTP layer, where customer-facing and barber-facing route groups exposed the same underlying resources through separate URL prefixes and separate controller files.
- Router-level role prefixes made public-safe discovery endpoints harder to place cleanly and encouraged inconsistent authorization patterns.
- The payment refund flow exposed a real security bug because authorization assumptions were split between route role checks and service ownership checks. The controller passed `req.user.role` while auth middleware populated `req.user.roleType`; as a result, barber ownership verification could be skipped until this migration fixed it.

## What The Audit Found

### Legacy architecture type

Before this migration, the backend was a **hybrid**:

- Feature-based routes already existed for `auth`, `onboarding`, `payments`, and `payouts`.
- Role-based routes grouped the rest of the API under customer and barber prefixes.
- Controllers were split by role even when both sides delegated into the same feature services.

### Structural problems found in code

1. Duplicate resource surfaces
- bookings existed through separate customer and barber route trees
- ratings existed through separate customer and barber route trees
- shop discovery, employee calendar, and shop profile concerns were mixed into role buckets rather than resource buckets

2. Thin controller duplication
- separate role-specific controllers often did little more than forward to the same service layer with different wrappers
- this increased file count without improving ownership boundaries

3. Inconsistent authorization strategy
- some routers used blanket router-level authorization
- other feature routes used endpoint-level authorization
- this made access control harder to audit and easier to get subtly wrong

4. REST drift
- route naming mixed role nouns with resource nouns
- some customer routes described UI screens rather than resources (`homepage`, `search`)
- the same resource was addressed by different URL families depending on caller role

5. Security coupling
- ownership checks lived in services, but the route layout implied that URL prefix alone provided safety
- the refund bug proved that role-prefix routing did not remove the need for explicit service-layer authorization

## Approach Evaluation

### 1. Role-based routing

Pros in this codebase:
- easy to understand for a very small API with only two personas
- router-level `authorize(...)` can be applied once

Cons in this codebase:
- duplicates route surfaces for the same resource
- scales poorly when adding `ADMIN`, `MANAGER`, or future cross-role features
- pushes discovery endpoints into customer-only spaces even when they are not customer-only concerns
- encourages controller duplication while services remain shared
- weak REST alignment because URLs describe caller identity before resource identity

Verdict: inferior for EverCut because roles are an access concern, while the domain is centered on resources such as shops, bookings, services, ratings, photos, payments, and payouts.

### 2. Feature-based routing

Pros in this codebase:
- matches the existing service layer organization
- removes duplicated route trees for shared resources
- keeps one route file and one controller module per resource
- makes public, customer, barber, and admin actions coexist under one resource surface with explicit RBAC
- aligns better with REST and future expansion

Cons in this codebase:
- some endpoints need role-aware branching inside a unified controller or service
- route files must be disciplined about endpoint-level authorization instead of relying only on router-level guards

Verdict: best fit for the code that already existed.

### 3. Hybrid routing

Pros:
- requires the least immediate change

Cons:
- preserves the exact inconsistency that caused drift
- keeps architecture decisions ambiguous for future contributors
- does not address duplication or security clarity at the HTTP layer

Verdict: rejected.

## Current Route Topology

All current API routes are mounted from `server/src/routes/index.js`:

- `/auth`
- `/onboarding`
- `/customers`
- `/shops`
- `/employees`
- `/services`
- `/bookings`
- `/photos`
- `/ratings`
- `/earnings`
- `/payments`
- `/payouts`
- `/health`

### Authorization model by resource

- `auth`: public OTP and token flows, plus authenticated logout
- `onboarding`: onboarding-token protected
- `customers`: authenticated `CUSTOMER` only
- `shops`: mix of public discovery endpoints and authenticated `BARBER` owner endpoints under `/shops/me`
- `employees`: authenticated calendar lookup by employee ID, barber-only CRUD
- `services`: public search, barber-only CRUD
- `bookings`: shared resource with role-aware behavior
  - customer: list/create/update/reschedule/reorder/favorite/confirmation/cancel own bookings
  - barber: list shop bookings, stats, progress, status updates, paid-booking deletion
- `photos`: barber-only
- `ratings`: public shop reads, customer create, barber owner reads/replies/deletes
- `earnings`: barber-only
- `payments`: customer payment initiation, authenticated payment reads, barber/admin refunds, public webhook/redirect callbacks
- `payouts`: admin retry plus public webhook callback

## Architectural Rules

1. One route file per resource.
2. One top-level controller module per resource unless a subdomain is genuinely independent.
3. Controllers stay thin: parse validated input, select role-aware flow, delegate to services.
4. Services own business rules, ownership checks, and cross-entity coordination.
5. Roles are enforced with middleware and service checks, not URL prefixes.
6. Public-safe reads stay public or minimally authenticated; they do not live under persona-specific URL roots.
7. Shared resources use one canonical URL family regardless of caller role.

## Controller And Service Strategy

### Unified controllers introduced

- `customer.controller.js`
- `shop.controller.js`
- `employee.controller.js`
- `service.controller.js`
- `booking.controller.js`
- `photo.controller.js`
- `rating.controller.js`
- `earnings.controller.js`
- `payment.controller.js`
- `payout.controller.js`

### Shared service model retained

The migration intentionally kept the service layer feature-based because that was already the strongest part of the old design. The route and controller layers were brought into alignment with it.

Examples:
- bookings stay in `booking.service.js`
- ratings stay in `rating.service.js`
- shop logic stays in `shop.service.js`
- service catalog logic stays in `service-catalog.service.js`
- payments stay in `payment.service.js`

## Problems Resolved By The Migration

- Removed duplicated role-prefixed routers and controllers.
- Consolidated HTTP entry points around resources.
- Moved to endpoint-level RBAC where a resource serves multiple roles.
- Preserved ownership enforcement in services.
- Fixed the refund authorization bug by aligning the payment controller and payment service on `req.user.roleType` semantics.
- Standardized payments and payouts onto the same flat controller structure as the rest of the feature modules instead of leaving nested controller-only exceptions.
- Standardized paginated responses through `ApiResponse.paginated(...)`, including mixed metadata for barber booking lists.

## Current Routing Philosophy

EverCut is now **resource-based and role-aware**:

- URLs identify the resource first.
- Middleware identifies who is calling.
- Controllers choose the correct role-specific flow only when behavior truly differs.
- Services remain the final authority for ownership and business invariants.

That combination gives the project the best balance of scalability, maintainability, and correctness.
