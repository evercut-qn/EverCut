# Ratings Reply Filter Cast Error Fix Report

> **Generated:** 2026-03-20  
> **Scope:** `POST /api/v1/barber/ratings/:id/reply` failure investigation for the `Invalid reply.text: [object Object]` error.

## Issue

The barber reply route returned:

```json
{
  "success": false,
  "message": "Invalid reply.text: [object Object]",
  "data": {}
}
```

The request log showed the failure on:

- `POST /api/v1/barber/ratings/:id/reply`

## Root Cause

The failure originated in `server/src/repositories/rating.repository.js`.

The repository used conditional update filters like:

- `{ _id: ratingId, 'reply.text': { $exists: false } }`
- `{ _id: ratingId, 'reply.text': { $exists: true } }`

This backend globally enables `mongoose.set('sanitizeFilter', true)` in `server/src/config/database.config.js`.

That security setting is correct, but internal MongoDB operator filters must be wrapped with `mongoose.trusted(...)` via `trustQueryOperators(...)`. Without that trust wrapper, Mongoose sanitizes the `$exists` object and then attempts to cast it against the `reply.text` string path, which produces the observed cast error:

- `Invalid reply.text: [object Object]`

## Fix Applied

### 1. Trusted the internal `$exists` filters

Added `trustQueryOperators` to `server/src/repositories/rating.repository.js` and centralized the reply-state filter in `buildReplyStateFilter(...)`.

This ensures the repository’s internal `$exists` filters survive `sanitizeFilter` without being mis-cast.

### 2. Kept the update payload precise

The reply creation update now uses dot-path `$set` fields:

- `reply.text`
- `reply.repliedAt`
- `reply.repliedBy`

This keeps the mutation explicit and avoids replacing the full subdocument unnecessarily.

### 3. Checked for similar issues

Reviewed repository query code for the same sanitize-filter pattern.

Result:

- `booking.repository.js` already uses `trustQueryOperators(...)` for operator-based filters
- `employee.repository.js` already uses `trustQueryOperators(...)` for slot-claim filters
- no other matching `$exists` misuse was found in the repositories

## Files Updated

- `server/src/repositories/rating.repository.js`
- `server/src/repositories/__tests__/rating.repository.test.js`

## Verification

Completed:

- `node --check src/repositories/rating.repository.js`
- `node --check src/repositories/__tests__/rating.repository.test.js`
- `node --test --test-isolation=none src/repositories/__tests__/rating.repository.test.js src/services/__tests__/rating.service.test.js src/middleware/__tests__/validate.middleware.test.js src/utils/__tests__/mongoose-query.utils.test.js`

The new repository test verifies that `mongoose.sanitizeFilter(...)` preserves the intended `$exists` filters for:

- `addReply(...)`
- `updateReply(...)`
- `deleteReply(...)`

## Postman And Contract Impact

No request or response contract changed for the barber ratings endpoints.

The existing barber ratings Postman flow remains valid:

- `server/postman-collections/13-barber-ratings.json`

No Postman payload or test-script updates were required for this fix.

## Outcome

The reply route failure was caused by a security-hardening mismatch, not by request validation or controller logic.

With trusted internal filters in place, the repository now works correctly with `sanitizeFilter`, and the `POST /api/v1/barber/ratings/:id/reply` path no longer throws the `reply.text` cast error.
