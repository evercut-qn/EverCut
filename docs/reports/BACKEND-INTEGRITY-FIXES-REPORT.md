# Backend Integrity Fixes Report

> Legacy snapshot: This document records findings against the pre-2026-04-24 role-prefixed routing layout and removed `controllers/customer/*` / `controllers/barber/*` files. Treat route and file references here as historical unless explicitly updated. For the current API surface, see [ROUTING-STRATEGY-ANALYSIS](../architecture/ROUTING-STRATEGY-ANALYSIS.md).

## Scope

This document tracks the issues identified during the backend review pass, the root cause of each issue, the fix that was applied, and the impact on the existing system.

## 1. Reorder Booking Allowed Cross-Customer Access

### Issue
`reorderBooking()` allowed a customer to create a new booking from any existing booking ID, even when the original booking belonged to another customer.

### Root Cause
The service loaded the original booking and reused its data without verifying that the booking belonged to the authenticated customer.

### Fix Applied
An ownership check was added in `booking.service.js` before any reorder logic runs. The flow now rejects requests unless the source booking belongs to the current customer.

### Impact
- Closes an insecure direct object reference path.
- Prevents unauthorized reuse of another customer's booking history.
- No request/response contract change for valid clients.

## 2. Booking Amount Could Be Tampered With by the Client

### Issue
The booking API accepted a client-supplied `amount`, and the service preferred that value over the server-calculated total.

### Root Cause
Pricing ownership was split between the request payload and backend calculation, which allowed a client to submit an underpriced booking.

### Fix Applied
- Removed `amount` from `bookSalonSchema` in `booking.validator.js`.
- Updated `bookSalon()` in `booking.service.js` to always calculate `totalAmount` from the selected services on the server.

### Impact
- Pricing is now server-authoritative.
- Prevents underpayment caused by request-body manipulation.
- Existing clients must no longer send `amount` when creating bookings.

## 3. Employee Slot Claims Did Not Enforce Shop Ownership

### Issue
The booking flow could claim an employee slot using a valid `employeeId` from another shop.

### Root Cause
`employeeRepository.claimSlot()` only checked employee availability and blocked dates. It did not constrain the claim to the target shop.

### Fix Applied
- Refactored `claimSlot()` in `employee.repository.js` to accept an options object.
- Added `shopId`, `isActive`, and `deletedAt` constraints to the atomic slot-claim query.
- Updated booking flows in `booking.service.js` to pass the booking shop context when claiming or restoring slots.

### Impact
- Prevents cross-shop bookings and cross-shop slot restoration.
- Tightens slot integrity for create, update, reschedule, and reorder flows.
- No external API contract change.

## 4. Rating Creation Failed at Runtime

### Issue
Submitting a customer rating could fail with a runtime `ReferenceError`.

### Root Cause
`rating.service.js` used `customerRepository.findByUserId(...)` without importing `customerRepository`.

### Fix Applied
Imported `customerRepository` in `rating.service.js`.

### Impact
- Restores the `POST /customer/ratings` path.
- No contract change.

## 5. Service Uniqueness Was Not Enforced Atomically for Case-Insensitive Duplicates

### Issue
The service catalog performed a case-insensitive duplicate pre-check in application code, but the MongoDB unique index was case-sensitive. Concurrent writes could still create duplicates such as `Hair Cut` and `hair cut`.

### Root Cause
The uniqueness rule existed in two different forms:
- application layer: case-insensitive
- database layer: case-sensitive

### Fix Applied
- Updated the active service unique index in `service.model.js` to use case-insensitive collation.
- Updated `service.repository.js` duplicate lookup to use a case-insensitive exact match with the same collation.
- Added duplicate-write handling in `service-catalog.service.js` so race-condition collisions return the same business-level conflict message as the pre-check.

### Impact
- The duplicate rule is now enforced consistently at both the application and database layers.
- Race-condition inserts now fail cleanly with a 409 conflict.
- Deployment requires the existing service unique index to be recreated so the collation-aware index can take effect.

## 6. Postman Collections Were Out of Sync With Paginated Endpoints

### Issue
Some Postman collections still treated paginated endpoint responses as raw arrays.

### Root Cause
The collections were not updated after the controller responses were standardized to the paginated envelope shape.

### Fix Applied
- Updated `08-barber-employees.json` to read `response.data.items`.
- Updated `13-barber-ratings.json` to read `response.data.items`.

### Impact
- Postman automation now captures IDs from the real API response shape.
- Reduces false negatives during manual QA.

## Files Updated

- `server/src/services/booking.service.js`
- `server/src/validators/booking.validator.js`
- `server/src/repositories/employee.repository.js`
- `server/src/services/rating.service.js`
- `server/src/models/service.model.js`
- `server/src/repositories/service.repository.js`
- `server/src/services/service-catalog.service.js`
- `server/postman-collections/08-barber-employees.json`
- `server/postman-collections/13-barber-ratings.json`

## Rollout Note

Because the service uniqueness index definition changed, the existing MongoDB unique index on active services should be dropped and recreated, or `syncIndexes()` should be run during deployment, so the case-insensitive collation is actually applied in the database.
