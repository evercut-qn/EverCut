# API Response Consistency Stabilization Report

Date: 2026-05-04

## 1. Summary Of Issues Found

The initial sanitization refactor removed raw Mongoose internals, but the public contract still contained avoidable duplication and client-facing drift:

- Several resources exposed an own identifier plus a domain alias, for example `id` plus `shopId`, `bookingId`, `employeeId`, `serviceId`, `paymentId`, `photoId`, `ratingId`, `notificationId`, or `tokenId`.
- `/shops/me` returned repeated concepts under multiple names: owner fields both flattened and nested, amenities/facilities, workingDays/availableDays, multiple time naming styles, duplicated payout fields, and photo/cover aliases.
- Booking list and queue APIs used overlapping time filters: customer lists used `period`, while queue used `filter`.
- Postman collections still captured old aliases and still documented `period` and `filter`.
- Documentation and mobile integration notes still showed alias-heavy examples such as `paymentId`, `employeeId`, `fullName`, `shopOwner`, `businessCategory`, `upiAddress`, and `shopImages`.
- FCM notification payloads used `notificationId` while REST notification DTOs had already been cleaned to `id`.
- Barber onboarding and shop update validators still accepted deprecated request aliases, so clients could continue sending old field names even though responses were clean.

## 2. Root Cause Analysis

The remaining issues were not caused by Mongoose hydration anymore. They came from contract compatibility residue:

- Serializers initially preserved historical aliases to reduce client churn.
- Services still hand-built a few dashboard, earnings, employee, and payment payloads outside the strict serializer shape.
- Query schemas had been migrated endpoint-by-endpoint, so semantically identical time filters were named differently.
- Postman generation relied on defensive fallback captures such as `paymentId || id`, which kept deprecated response names alive.
- Documentation examples were not treated as executable contract artifacts, so they lagged behind the backend DTOs.

## 3. System-Wide Impact

The cleanup pass covered these API groups:

- Authentication and onboarding response examples and Postman captures.
- Customer profile, shop discovery, booking, and rating flows.
- Barber shop/profile, payout details, employees, services, photos, ratings, earnings, and dashboard analytics.
- Payments, refunds, payouts, and native PhonePe SDK order initiation.
- Notifications, FCM token registration, notification history, and outbound FCM payload shape.

## 4. Final API Design

All JSON APIs use:

```json
{
  "success": true,
  "message": "Human-readable status",
  "data": {},
  "meta": {}
}
```

`meta` is optional. Paginated endpoints return arrays directly in `data` and pagination details in `meta.pagination`.

Identifier rules:

- A resource's own identifier is always `id`.
- `_id`, `__v`, `$__`, `_doc`, `$isNew`, `parent`, `populated`, `$locals`, `$op`, and keys beginning with `$` are never API fields.
- Domain aliases for the same resource identity are removed.
- Relation IDs such as `shopId`, `bookingId`, `employeeId`, or `serviceIds` appear only when the response does not also include the nested relation object.

Resource-level response rules:

- Customer: `id`, `firstName`, `lastName`, `gender`, `dateOfBirth`, `address`, `photoUrl`, `location`, favorite ID arrays, timestamps where relevant.
- Shop: `id`, `shopName`, `category`, `targetCustomers`, `address`, `location`, `amenities`, `workingDays`, `workingHours.openTime`, `workingHours.closeTime`, `breakTimes`, `coverUrl`, `isOpen`, optional nested `owner`, optional private `payout`.
- Employee: `id`, `shopId`, `firstName`, `lastName`, `photoUrl`, `gender`, `workingHours`, `isActive`, and private owner-only fields where needed.
- Service: `id`, service pricing/duration/catalog fields, optional `shopId` or nested `shop`.
- Booking: `id`, schedule/payment/status fields, exact range metadata, and either relation IDs or nested relation DTOs.
- Photo: `id`, `shopId`, `photoUrl`, `photoName`, `photoType`, status, metadata.
- Rating: `id`, `rating`, `review`, `user`, `reply`, timestamps.
- Payment: `id`, merchant/order/status/amount/gateway fields, relation IDs only when not populated.
- Payout: `id`, relation IDs, transfer IDs, amount/status/retry fields.
- Notification and FCM token: `id` as the public identifier; raw FCM token values are never returned.

Query rules:

- Booking list time scope is `timeframe=past|upcoming`.
- Queue time scope is `timeframe=active|upcoming`.
- Deprecated `period` and `filter` query parameters are rejected by validation.
- Other query parameters keep one responsibility each: `status`, `paymentStatus`, `dateFrom/dateTo` where implemented, `page`, `limit`, `sortBy`, and feature-specific filters.

## 5. Implementation Strategy

The stabilization pass followed a contract-first migration:

1. Add serializer contract tests proving own-ID aliases are absent.
2. Add query validation tests proving `timeframe` replaces `period` and `filter`.
3. Remove aliases from serializers and hand-built service payloads.
4. Preserve relation IDs only where they are not duplicated by nested relation DTOs.
5. Update queue controllers/services/validators to use `timeframe`.
6. Align notification FCM payloads to `id`.
7. Reject deprecated request aliases in barber onboarding and shop update validators.
8. Regenerate all Postman collections from the source generator.
9. Update the relevant API, Postman, Flutter, dashboard, onboarding, employee, earnings, and response architecture docs.
10. Run the backend test suite and contract scans.

## 6. Before Vs After

Before `/shops/me` contained repeated concepts:

```json
{
  "id": "shop_1",
  "shopId": "shop_1",
  "ownerName": "Test Barber",
  "ownerFirstName": "Test",
  "ownerLastName": "Barber",
  "facilities": ["Wi-Fi"],
  "amenities": ["Wi-Fi"],
  "availableDays": ["Monday"],
  "workingDays": ["Monday"],
  "openTime": "09:00",
  "workingHours": { "opensAt": "09:00" },
  "upiId": "test@upi",
  "upiAddress": "test@upi"
}
```

After `/shops/me` has one source of truth:

```json
{
  "id": "shop_1",
  "owner": {
    "id": "user_1",
    "firstName": "Test",
    "lastName": "Barber"
  },
  "shopName": "Postman Test Barber Studio",
  "amenities": ["Wi-Fi"],
  "workingDays": ["Monday"],
  "workingHours": {
    "openTime": "09:00",
    "closeTime": "20:00"
  },
  "payout": {
    "upiId": "test@upi",
    "bankAccountLast4": "1234"
  }
}
```

Before queue:

```text
GET /api/v1/bookings/analytics/queue?filter=active
```

After queue:

```text
GET /api/v1/bookings/analytics/queue?timeframe=active
```

Before payment initiation:

```json
{ "paymentId": "payment_1", "merchantOrderId": "EC-1" }
```

After payment initiation:

```json
{ "id": "payment_1", "merchantOrderId": "EC-1" }
```

## 7. Validation Results

Validated with:

- `npm.cmd test`
- Serializer contract tests for own-ID alias removal.
- Booking validator tests for `timeframe` and deprecated query rejection.
- Onboarding/shop validator tests for deprecated request alias rejection.
- Postman generator regeneration and stale URL/alias scans.
- Documentation scans for deprecated query examples and obsolete response aliases.

The backend test suite passed with 136 tests.

## 8. Benefits

- Security: no Mongoose internals or sensitive persistence fields can leak through the response layer.
- Frontend usability: each field has one meaning and one name.
- Maintainability: serializers are the single response-shaping layer; services no longer invent duplicate shapes.
- Performance: query and populate rules continue to support lean read paths and controlled field selection.
- Regression resistance: tests and Postman assertions now enforce the envelope, internal-field stripping, canonical IDs, and query naming.
