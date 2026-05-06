# Booking System Redesign Report

**Date:** May 3, 2026  
**Scope:** Backend booking, availability, persistence locks, Postman automation, and booking documentation.

## Executive Summary

EverCut's booking system was rebuilt from a slot-marker scheduler into an exact time-range scheduler. The old system rounded service duration into coarse slot markers, which prevented some overlaps but wasted time, exposed inconsistent availability, ignored breaks in the booking path, and allowed end-of-day spillover. The new system uses continuous `[startMinute, endMinute)` ranges everywhere: availability, validation, atomic employee locking, booking persistence, cancellation, payment expiry, completion, and cleanup.

## What Was Wrong

- Availability and booking used different conflict models.
- Booking validation checked start time but not `start + duration`.
- Shop break times existed in the schema but were not enforced by booking creation.
- Variable durations were rounded into marker locks, wasting real capacity.
- `Employee.bookedSlots[]` grew without cleanup and was used as the lock source.
- Completion and no-show could leave stale locks.
- Barber cancellation released locks before validating whether the cancellation was legal.
- Client retries had no idempotency guard.
- Dashboard occupancy used a hardcoded 16-slot capacity.

## What Changed

- Added exact booking fields: `endTime`, `startMinute`, `endMinute`, and optional `idempotencyKey`.
- Added `Employee.bookedRanges[]` as the primary atomic lock source.
- Added `employeeRepository.claimTimeRange()` with a single-document MongoDB overlap guard.
- Added `employeeRepository.moveTimeRange()` for same-employee reschedules/updates.
- Rebuilt `slot-calculator.utils.js` around exact free windows and range overlap.
- Booking create/update/reschedule/reorder now validate shop hours, employee hours, breaks, blocked dates, duration, and boundaries before claiming.
- Lifecycle releases now include exact ranges for cancel, payment expiry, auto-cancel, completion, and no-show.
- Added slot cleanup job for stale legacy markers and exact ranges.
- Updated Postman generation with break-safe exact times, idempotency key usage, and exact range assertions.
- Updated booking docs to describe the exact-range contract.

## Why The New Design Is Better

Exact ranges remove the false choice between safety and utilization. The system keeps MongoDB single-document atomicity while avoiding duration rounding. A 65-minute service ending at `13:35` releases the next bookable window at `13:35`, not `14:00`. The same range logic powers availability and booking creation, so customers see the same truth the write path enforces.

## Before Vs After

| Area | Before | After |
| --- | --- | --- |
| Lock source | `Employee.bookedSlots[]` markers | `Employee.bookedRanges[]` exact ranges |
| Availability | Range-ish checks over booking starts | Exact free windows from blocking ranges |
| Conflict prevention | Marker collision | Atomic exact overlap rejection |
| Variable duration | Rounded up to marker interval | Preserved to the minute |
| Breaks | Not enforced in create path | Enforced before claim and in availability |
| End boundary | Start time only | `endMinute <= effectiveClose` |
| Completion/no-show | Could leave stale locks | Releases exact range |
| Retry safety | Duplicate POST risk | Optional `idempotencyKey` replay guard |
| Cleanup | No range cleanup | Cleanup job removes past locks |

## Implementation Notes

- Legacy `slotLockTimes` and `bookedSlots` remain for compatibility only.
- New booking writes pre-generate a booking ObjectId, claim the exact range with that ID, and roll back the range if booking persistence fails.
- Availability returns both `slots[]` and `availableWindows[]`.
- Shop-wide availability batches booking reads for all active employees on the requested date.
- Occupancy now reports exact capacity minutes rather than a fixed 16-slot assumption.

## Validation Checklist

- Exact variable-duration range can be booked and persisted.
- Start inside hours but end after close is rejected before DB claim.
- Break overlap is rejected before DB claim.
- Availability resumes at exact booking or break end.
- Atomic repository query rejects overlapping ranges.
- Completion releases exact ranges.
- Full backend test suite passes with 113 tests.

## Assumptions

- Booking dates are single-day; overnight bookings remain unsupported.
- Times are local business times stored as `HH:MM`.
- Frontend should treat backend availability as authoritative and should not compute availability locally.
- `idempotencyKey` is optional but recommended for mobile booking creation retries.
