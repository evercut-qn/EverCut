# RESTful Bookings, Shops, and Employees API Refactor Report

**Date:** May 4, 2026  
**Scope:** `bookings`, `shops`, `employees`, related account actions, Postman collections, and active API documentation

## 1. Summary of Changes

The bookings, shops, and employees APIs were refactored from action-heavy and partially overlapping routes into predictable resource-oriented endpoints. The refactor removes duplicate booking transitions, merges schedule changes into one `PATCH /bookings/:id` contract, replaces shop owner `me` routes with `current`, moves account actions to `/account`, and consolidates dashboard-style booking and employee metrics under resource analytics paths.

No backward compatibility was retained. Removed endpoints are intentionally unavailable.

## 2. Problems in the Old Design

### Duplicate or Overlapping Endpoints

| Area | Old endpoints | Problem |
|---|---|---|
| Booking status | `PATCH /bookings/:id/confirm`, `PUT /bookings/:id/status`, `POST /bookings/:id/cancel` | Multiple endpoints changed the same `booking.status` field. |
| Booking schedule | `PUT /bookings/:id`, `PUT /bookings/:id/reschedule` | Both changed booking date/time with slightly different payloads. |
| Reorder | `POST /bookings/:id/reorder` | Created a new booking but was modeled as an action on an existing booking. |
| Booking favorites | Toggle behavior on one endpoint | Toggle is ambiguous for clients and hard to retry safely. |
| Shop favorites | Toggle behavior on one endpoint | Same ambiguity as booking favorites. |
| Shop payout data | `/shops/me`, `/shops/me/upi`, `/shops/me/bank-details` | Payout fields could be written through multiple paths. |
| Employee availability | `/employees/:id/calendar`, `/employees/:id/available-slots` | Different names exposed overlapping availability concepts. |
| Barber booking lists | `/bookings/status`, `/bookings/pending-confirmations`, `/bookings` | Separate endpoints were filters over the same booking collection. |

### Inconsistencies and Anti-Patterns

- Mixed `PUT`, `PATCH`, and `POST` for partial state changes.
- Action routes used verbs in URLs: `confirm`, `cancel`, `reschedule`, `reorder`.
- Shop owner profile initially used inconsistent patterns compared to customer routes.
- Analytics endpoints were mixed into collection and dashboard-style paths.
- Frontend clients had to remember special endpoints for tiny variations of the same booking list.

## 3. New API Design Overview

### Design Rules

- Collections use plural nouns: `/shops`, `/employees`, `/bookings`.
- Resource mutation uses `PATCH /:id` for partial updates.
- Create operations use `POST /collection`, including creating a booking from a source booking.
- Idempotent favorite operations use `PUT` to add and `DELETE` to remove.
- Nested resources are used only when ownership is clear and stable, such as `/shops/:id/employees`.
- Analytics live under `/analytics` below the owning resource.
- Account/session operations live under `/account`, not under shop profile routes.

### Request and Response Standardization

- Success responses continue using the standard API envelope:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {}
}
```

- Paginated lists use the existing paginated envelope with `items` and `pagination`.
- Booking creation accepts either direct booking data or source booking data:

```json
{
  "shopId": "shop_id",
  "employeeId": "employee_id",
  "serviceIds": ["service_id"],
  "date": "2026-05-05",
  "time": "10:00",
  "idempotencyKey": "optional-client-key"
}
```

```json
{
  "sourceBookingId": "booking_id",
  "date": "2026-05-05",
  "time": "10:00"
}
```

- Booking patch accepts one operation shape at a time:

```json
{
  "employeeId": "employee_id",
  "date": "2026-05-05",
  "time": "10:00"
}
```

```json
{
  "status": "confirmed"
}
```

## 4. Removed Endpoints

### Bookings

- `GET /api/v1/bookings/:id/confirmation`
- `PUT /api/v1/bookings/:id/reschedule`
- `POST /api/v1/bookings/:id/reorder`
- `POST /api/v1/bookings/:id/cancel`
- `PATCH /api/v1/bookings/:id/confirm`
- `PUT /api/v1/bookings/:id/status`
- `GET /api/v1/bookings/status`
- `GET /api/v1/bookings/pending-confirmations`
- `GET /api/v1/bookings/stats`
- `GET /api/v1/bookings/progress`
- `GET /api/v1/bookings/stats/today`
- `GET /api/v1/bookings/queue`
- `POST /api/v1/bookings/:id/refund`

### Shops

- `GET /api/v1/shops/nearby`
- `GET /api/v1/shops/doorstep`
- `GET /api/v1/shops/search`
- `GET /api/v1/shops/nearby/services`
- `GET /api/v1/shops/me`
- `PUT /api/v1/shops/me`
- `GET /api/v1/shops/me/upi`
- `PUT /api/v1/shops/me/upi`
- `GET /api/v1/shops/me/bank-details`
- `PUT /api/v1/shops/me/bank-details`
- `PUT /api/v1/shops/me/status`
- `PUT /api/v1/shops/me/picture`
- `PUT /api/v1/shops/me/cover`
- `PUT /api/v1/shops/me/pin`
- `POST /api/v1/shops/me/sign-out-everywhere`
- `DELETE /api/v1/shops/me`

### Employees

- `GET /api/v1/employees/:id/calendar`
- `GET /api/v1/employees/:id/available-slots`
- `GET /api/v1/employees/availability`
- `PUT /api/v1/employees/:id`
- `PUT /api/v1/employees/:id/status`

## 5. Merged Endpoints

| Old functionality | New endpoint |
|---|---|
| Create booking | `POST /api/v1/bookings` |
| Reorder booking | `POST /api/v1/bookings` with `sourceBookingId` |
| Update booking schedule | `PATCH /api/v1/bookings/:id` |
| Reschedule booking | `PATCH /api/v1/bookings/:id` |
| Confirm booking | `PATCH /api/v1/bookings/:id` with `status=confirmed` |
| Complete/no-show/cancel booking | `PATCH /api/v1/bookings/:id` with `status` |
| Pending confirmations | `GET /api/v1/bookings?status=awaiting_confirmation&paymentStatus=success` |
| Status filtered bookings | `GET /api/v1/bookings?status=...` |
| Nearby shops | `GET /api/v1/shops?coordinates=lng,lat` or `longitude` + `latitude` |
| Doorstep shops | `GET /api/v1/shops?category=Door-Step` |
| Shop search | `GET /api/v1/shops?query=...` |
| Shop UPI and bank details | `GET/PATCH /api/v1/shops/me/payout-details` |
| Employee calendar and slots | `GET /api/v1/employees/:id/availability` |

## 6. Final Endpoint Structure

### Bookings

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/bookings` | Create a booking or create from `sourceBookingId` |
| GET | `/api/v1/bookings` | List bookings using `period`, `favorite`, `status`, `paymentStatus`, pagination |
| GET | `/api/v1/bookings/:id` | Get booking details for customer or shop owner |
| PATCH | `/api/v1/bookings/:id` | Update schedule or status |
| PUT | `/api/v1/bookings/:id/favorite` | Add favorite booking |
| DELETE | `/api/v1/bookings/:id/favorite` | Remove favorite booking |
| POST | `/api/v1/bookings/:id/refunds` | Initiate a refund |
| GET | `/api/v1/bookings/analytics/summary` | Booking status summary |
| GET | `/api/v1/bookings/analytics/milestones` | Monthly completed-booking milestone progress |
| GET | `/api/v1/bookings/analytics/today` | Today's pulse metrics |
| GET | `/api/v1/bookings/analytics/queue` | Today's queue |

### Shops

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/shops` | Discover/search shops using `coordinates`, `longitude` + `latitude`, `query`, or `category` |
| GET | `/api/v1/shops/services` | Nearby service discovery |
| GET | `/api/v1/shops/favorites` | List customer favorite shops |
| GET | `/api/v1/shops/me` | Get barber's own shop profile |
| PATCH | `/api/v1/shops/me` | Update barber business profile |
| GET | `/api/v1/shops/me/payout-details` | Get payout details |
| PATCH | `/api/v1/shops/me/payout-details` | Update payout details |
| PATCH | `/api/v1/shops/me/pin` | Update shop PIN |
| PATCH | `/api/v1/shops/me/picture` | Update owner profile picture |
| PATCH | `/api/v1/shops/me/cover` | Update shop cover image |
| PATCH | `/api/v1/shops/me/status` | Update shop open/closed status |
| GET | `/api/v1/shops/:id` | Get public shop details |
| GET | `/api/v1/shops/:id/employees` | List active shop employees |
| GET | `/api/v1/shops/:id/availability` | Get shop-wide availability |
| PUT | `/api/v1/shops/:id/favorite` | Add favorite shop |
| DELETE | `/api/v1/shops/:id/favorite` | Remove favorite shop |

### Employees

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/employees` | List barber employees |
| POST | `/api/v1/employees` | Create employee |
| GET | `/api/v1/employees/:id` | Get employee detail and statistics |
| PATCH | `/api/v1/employees/:id` | Update employee |
| PATCH | `/api/v1/employees/:id/status` | Update employee availability status |
| DELETE | `/api/v1/employees/:id` | Delete employee |
| GET | `/api/v1/employees/:id/availability` | Get employee availability |
| GET | `/api/v1/employees/analytics/availability` | Get staff availability analytics |

### Account

| Method | Endpoint | Purpose |
|---|---|---|
| DELETE | `/api/v1/account/sessions` | Sign out from all sessions |
| DELETE | `/api/v1/account` | Delete barber account |

## 7. Design Decisions and Reasoning

- `PATCH /bookings/:id` is the single booking mutation point because schedule changes and status transitions are partial updates to one booking resource.
- Reorder is modeled as `POST /bookings` because it creates a new booking, even when it uses an existing booking as the source.
- Favorite add/remove uses `PUT` and `DELETE` instead of toggle so requests are retry-safe and predictable.
- `/shops/me` is used for the authenticated barber's own shop following the industry-standard `/me` convention (consistent with `/customers/me`), clearly distinguishing it from public `/:id` routes.
- Payout details are isolated from business profile updates to avoid accidental payment-field writes.
- Analytics routes are grouped under owning resources, making dashboard data discoverable without creating a separate dashboard route family.
- Static routes are registered before parameterized routes to prevent paths like `/employees/analytics/availability` from being interpreted as employee IDs.

## 8. Assumptions Made

- `roleType` continues to be the canonical role field on authenticated users.
- Customers may cancel through `PATCH /bookings/:id` with `status=cancelled`; barbers may confirm, complete, no-show, or cancel through the same field according to existing service rules.
- `GET /shops` without discovery/search filters can return an empty list until a product decision is made for global shop browsing.
- Historical research and audit reports may still mention old endpoints as historical evidence; active guides and Postman references were updated.

## 9. Benefits of the Refactor

- Smaller API surface with fewer endpoints to document, test, and maintain.
- More predictable frontend client code through collection filters instead of special list endpoints.
- Clear separation between shop profile, payout details, account/session operations, and analytics.
- Safer favorite operations because add/remove are explicit and idempotent.
- Easier future expansion for booking filters and analytics without adding action routes.
- Better REST consistency across shops, employees, and bookings.
