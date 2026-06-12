# API Response Sanitization Architecture Report

Date: 2026-05-04

## 1. Summary Of The Problem

The backend exposed raw Mongoose document internals in API responses. The observed payload contained fields such as `$__`, `_doc`, `$isNew`, `parent`, and `populated`. This was a system-level response architecture failure, not an isolated endpoint bug.

The failure mode came from returning hydrated Mongoose documents, spreading populated documents into response objects, inconsistent `.lean()` use, and no single serialization boundary. Any endpoint that returned a document, nested populated document, or repository result could accidentally leak database implementation details or sensitive fields.

## 2. Root Cause Analysis

Root causes identified across routes, controllers, services, repositories, models, and response utilities:

- Controllers trusted service return values and sent them through `ApiResponse` without sanitization.
- Services frequently returned repository results directly: customer profiles, onboarding user/profile records, employees, services, photos, bookings, payments, payouts, notifications, and FCM token registrations.
- Booking detail construction spread populated Mongoose documents into plain objects, which copied document internals such as `$__` and `_doc`.
- Populates were sometimes returned as raw nested documents instead of resource-level DTOs.
- `.lean()` was inconsistent. Some read-only list queries returned hydrated documents even though no document methods were needed.
- Response envelopes were inconsistent for paginated responses: lists lived under `data.items`, pagination under `data.pagination`, while other endpoints returned arrays or objects directly.
- Webhook controllers bypassed `ApiResponse` and returned `{ received: true }` or `{ received: false, error }`.
- No hard enforcement existed to recursively strip Mongoose metadata or sensitive operational fields.

## 3. System-Wide Impact

Affected API groups:

- Authentication and onboarding: user/profile/session payloads.
- Customers: profile, update profile, favorite bookings, favorite shops.
- Shops: owner profile, public shop details, nearby shops, nearby services, payout details, cover/profile image updates.
- Employees: create, list, detail, update, status, public shop employees.
- Services: create, list, update, search, gender discovery.
- Bookings: create, reorder, detail, customer lists, barber lists, favorites, schedule/status updates, queue/dashboard payloads.
- Photos: upload, list, detail, stats.
- Ratings: list, add, reply update/delete, summary references.
- Earnings: transaction list and detail payloads.
- Payments: initiation, list, status, verification, refund, webhooks.
- Payouts: retry and webhooks.
- Notifications: FCM token registration, notification list, read/unread operations.

## 4. Identified Anti-Patterns

- Returning Mongoose documents from services.
- Spreading hydrated documents or populated documents.
- Building nested API objects by copying whole documents instead of whitelisting fields.
- Using `_id` as public API contract instead of a stable `id` alias.
- Mixing list payload shapes across endpoints.
- Placing pagination inside `data` rather than response metadata.
- Returning sensitive fields such as `pinHash`, Cloudinary internal IDs, raw bank accounts, payment SDK tokens outside the intended payment initiation contract, gateway responses, and webhook identifiers.
- Webhook endpoints bypassing the global response envelope.

## 5. Final API Response Architecture

All JSON APIs use this envelope:

```json
{
  "success": true,
  "message": "Human-readable status",
  "data": {},
  "meta": {}
}
```

Rules:

- `success` is required boolean.
- `message` is required string.
- `data` is required and contains the resource object or list array.
- `meta` is optional and contains pagination, counts, summaries, and other non-resource metadata.
- Paginated endpoints return `data: [...]` and `meta.pagination`.
- Public resource identifiers use exactly one field: `id`.
- Relation identifiers use explicit names such as `shopId`, `bookingId`, or `serviceIds` only when the relation is not returned as a nested DTO. If a nested relation is present, the parallel flat relation ID is omitted.
- API responses never expose `_id`, `__v`, `$__`, `_doc`, `$isNew`, `parent`, `populated`, `$locals`, `$op`, or keys beginning with `$`.

### Resource Schemas

Customer:

- Required: `id`, `firstName`, `lastName`, `gender`, `dateOfBirth`, `address`, `photoUrl`, `location`, `favoriteBookingIds`, `favoriteShopIds`.
- Optional: `userId`, `user`, `createdAt`, `updatedAt`.

User:

- Required: `id`, `phoneNumber`, `email`, `emailVerified`, `roleType`.
- Optional: `isActive`, `lastLoginAt`, `createdAt`, `updatedAt`.
- Never returned: `refreshTokenHash`, `deletedAt`.

Shop:

- Required public: `id`, `shopName`, `address`, `location`, `category`, `targetCustomers`, `coverUrl`, `amenities`, `workingDays`, `workingHours`, `isOpen`.
- Owner/private additions: `owner`, `payout`, `numberOfEmployees`, `yearsOfExperience`, `bio`, `missedConfirmations`.
- Never returned: `pinHash`, raw `bankAccount`, Cloudinary internal IDs.

Employee:

- Required: `id`, `shopId`, `firstName`, `lastName`, `photoUrl`, `gender`, `workingHours`, `isActive`.
- Private owner additions: `phoneNumber`, `dateOfBirth`, `blockedDates`.
- Never returned: `cloudinaryId`, `deletedAt`.

Service:

- Required: `id`, `serviceName`, `serviceType`, `serviceFor`, `imageUrl`, `offerPrice`, `finalPrice`.
- Relation: `shopId` when no nested `shop` is returned.
- Optional: `duration`, `actualPrice`, `bundledServices`, `totalDuration`, `totalPrice`, `isActive`, `shop`, `createdAt`, `updatedAt`.

Booking:

- Required: `id`, `date`, `time`, `endTime`, `totalAmount`, `durationMinutes`, `status`, `paymentStatus`, `payoutStatus`.
- Relation IDs when not populated: `customerId`, `shopId`, `employeeId`, `serviceIds`.
- Optional nested DTOs: `customer`, `shop`, `employee`, `services`.
- Optional lifecycle fields: `paymentTransactionId`, `merchantOrderId`, `paymentGateway`, `paidAt`, `paymentMode`, `payoutTransactionId`, `payoutCompletedAt`, `barberUtr`, `completedAt`, `cancelledAt`, `barberCancelledAt`, `barberConfirmedAt`, `autoCancelledAt`, `noShowAt`, `cancellationNote`, `rescheduleCount`.

Photo:

- Required: `id`, `shopId`, `photoUrl`, `photoName`, `photoType`, `isActive`.
- Optional: `description`, `fileSize`, `mimeType`, `createdAt`, `updatedAt`.
- Never returned: `cloudinaryId`.

Rating:

- Required: `id`, `rating`, `review`, `user`, `reply`.
- Optional: `shopId`, `createdAt`, `updatedAt`.
- User summary contains public customer fields only.

Payment:

- Required: `id`, `merchantOrderId`, `status`, `amountInPaisa`, `amountInRupees`, `currency`.
- Relation IDs when not populated: `bookingId`, `customerId`, `shopId`.
- Optional: `booking`, `customer`, `shop`, `orderId`, `gatewayState`, `paymentMode`, `transactionId`, `refund`, `settlement`, `expiresAt`, `createdAt`, `updatedAt`.
- Payment initiation additionally returns `token` because the native PhonePe SDK requires it.
- Never returned in normal payment DTOs: stored `sdkOrderToken`, gateway raw response, webhook IDs.

Payout:

- Required: `id`, `bookingIds`, `barberId`, `shopId`, `paymentTransactionIds`, `transferId`, `beneficiaryId`, `amount`, `amountInRupees`, `transferMode`, `status`.
- Optional: `gatewayTransferId`, `utr`, `processedAt`, `failureReason`, `errorCode`, `retryCount`, `maxRetries`, `lastRetryAt`, `remarks`, `createdAt`, `updatedAt`.

Notification:

- Required: `id`, `recipientUserId`, `type`, `eventType`, `title`, `body`, `data`, `status`, `delivery`.
- Optional: `actorUserId`, `entityType`, `entityId`, `readAt`, `deliveredAt`, `createdAt`, `updatedAt`.

FCM Token Registration:

- Required: `id`, `userId`, `platform`, `deviceId`.
- Optional: `appVersion`, `lastSeenAt`, `revokedAt`, `createdAt`, `updatedAt`.
- Never returned: raw FCM token value.

## 6. Transformation Boundary

The enforced transformation boundary is the API response boundary:

- Services return resource DTOs for all controller-facing operations.
- `ApiResponse` is the final hard backstop. It recursively sanitizes every response payload before Express sends JSON.
- Serializers live in `server/src/serializers/` and are imported by services.
- Utility compatibility exports remain in `server/src/utils/barber-profile.utils.js` and `server/src/utils/rating-response.utils.js`, but delegate to serializers.

This boundary is hard to bypass because every controller uses `ApiResponse.success`, `ApiResponse.paginated`, or `ApiResponse.error`, including webhooks.

## 7. Query And Population Rules

- Use `.lean()` for read-only API lists and populated read payloads.
- Keep hydrated documents only inside mutating workflows that require `.save()` or Mongoose document behavior.
- Never return those hydrated documents directly.
- Every API-facing populate must specify `select`.
- Populated documents must pass through their resource serializer.
- Do not spread populated docs into response objects.
- Use `toObject()` only as a serializer input conversion, never as a complete API response strategy.

## 8. Response Validation Strategy

Implemented validation layers:

- Unit tests for `ApiResponse` prove nested raw Mongoose documents, spread documents, internal fields, and sensitive fields are removed.
- `ApiResponse.paginated` tests prove list data and pagination metadata are separated.
- Postman collection tests now include a standard envelope assertion and a recursive string scan for forbidden internal fields.
- Service tests were updated to assert public IDs and absence of `_id` on DTO returns.

## 9. Implementation Strategy

The migration was performed in this order:

1. Add failing tests for the response sanitizer and pagination envelope.
2. Implement `core.serializer.js` with recursive document conversion, ID normalization, sensitive-field removal, and list serialization.
3. Enforce sanitization in `ApiResponse`.
4. Add resource serializers for all API resources.
5. Refactor services to return DTOs instead of repository documents.
6. Standardize webhooks under the response envelope.
7. Add `.lean()` to read-only repository methods and keep hydrated docs only for mutating flows.
8. Update service tests for the new DTO contract.
9. Update Postman generator and regenerate collections.
10. Update relevant documentation and create this report.
11. Run tests and leakage scans.

## 10. Before Vs After

Before, a booking detail could include a spread populated document:

```json
{
  "success": true,
  "data": {
    "customer": {
      "$__": {},
      "_doc": {},
      "$isNew": false,
      "firstName": "Jane"
    }
  }
}
```

After:

```json
{
  "success": true,
  "message": "Booking details fetched",
  "data": {
    "id": "booking_123",
    "customer": {
      "id": "customer_123",
      "firstName": "Jane",
      "lastName": "Smith",
      "photoUrl": null
    }
  }
}
```

Before paginated responses:

```json
{
  "success": true,
  "message": "Bookings fetched",
  "data": {
    "items": [],
    "pagination": {}
  }
}
```

After:

```json
{
  "success": true,
  "message": "Bookings fetched",
  "data": [],
  "meta": {
    "pagination": {}
  }
}
```

## 11. Benefits

- Security: internal persistence details, token hashes, raw bank accounts, Cloudinary IDs, gateway payloads, and raw FCM tokens are removed from responses.
- Performance: read-only list/populated queries use `.lean()` where document behavior is unnecessary.
- Maintainability: response shaping is centralized in serializers instead of scattered controller/service object literals.
- Frontend usability: stable public IDs, camelCase keys, and consistent list/pagination envelopes reduce client-side branching.
- Regression resistance: `ApiResponse` and Postman tests provide a hard safety net for future endpoints.

## 12. Validation Checklist

- [x] Internal Mongoose fields are stripped recursively.
- [x] Services return DTOs for controller-facing operations.
- [x] Webhooks use the same response envelope.
- [x] Paginated endpoints return arrays in `data` and metadata in `meta`.
- [x] Postman generator updated and collections regenerated.
- [x] Relevant documentation updated.
- [x] Unit test suite passes.
