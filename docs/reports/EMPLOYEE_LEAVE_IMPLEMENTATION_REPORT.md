# Employee Leave Implementation Report

## Summary

Implemented employee leave as a date-based unavailability feature using the existing `Employee.blockedDates` model. Barbers can mark employees unavailable or available again for full dates. New bookings and reschedules are blocked for unavailable employee/date combinations, while existing bookings remain unchanged and receive a customer-facing availability flag.

## Problems Addressed

- Shops needed a simple way to mark an employee unavailable without complex reassignment logic.
- Customers needed visibility when their originally assigned employee is unavailable.
- Booking and availability APIs needed one consistent source of truth for leave dates.
- Postman flows needed coverage for marking leave and verifying booking response states.

## Design Decisions

- Reused `blockedDates` instead of adding a new leave collection.
- Added `PATCH /api/v1/employees/:id/availability` with `{ dates, available }`.
- Kept leave date granularity at full days, matching the simplified feature spec.
- Preserved existing bookings exactly as-is: no status change, no employee mutation, no cancellation.
- Added only `employee.isAvailableOnBookingDate` to booking responses; no redundant status/message fields.
- Used notification events for affected active bookings and dedupe keys per booking/employee/date.

## Edge Cases Handled

- Duplicate dates in service logic are idempotent.
- Already-blocked dates are not re-added or re-notified.
- Marking available again removes dates without notifying customers again.
- New booking and reorder attempts continue to fail through existing scheduling checks.
- Employee and shop availability endpoints already exclude blocked employees through slot calculation.
- Deleted employee history still populates booking employee data because populate uses `includeDeleted`.

## APIs Added/Modified

- Added `PATCH /api/v1/employees/:id/availability`.
- Modified booking list/detail serializers to include `employee.isAvailableOnBookingDate`.
- Modified booking employee population to include `blockedDates` internally for response computation.
- Added notification event `booking.employee_unavailable`.

## Files Changed

- `server/src/routes/employees.routes.js`: added availability update route.
- `server/src/controllers/employee.controller.js`: added availability controller.
- `server/src/validators/employee.validator.js`: added request validation.
- `server/src/services/employee.service.js`: added leave update, affected booking lookup, notification summary.
- `server/src/repositories/employee.repository.js`: added atomic blocked date add/remove helper.
- `server/src/repositories/booking.repository.js`: added affected-booking lookup and internal blocked date population.
- `server/src/services/notification-events.service.js`: added customer notification event.
- `server/src/serializers/booking.serializer.js`: computed employee booking-date availability.
- `server/src/serializers/employee.serializer.js`: exposed computed flag in public employee payloads.
- `server/src/utils/constants.js`: added notification event constant.
- `server/scripts/regenerate-postman-collections.mjs`: added leave flows and response assertions.
- `server/postman-collections/*.json`: regenerated affected collections.
- `docs/features/bookings/BOOKING-SYSTEM-GUIDE.md`: documented leave behavior.
- `docs/features/employees/EMPLOYEE-DETAIL-ENDPOINT.md`: documented availability update endpoint.

## Assumptions

- Leave is full-day only, not partial-day, because the simplified spec defines `blockedDates`.
- Existing bookings are considered affected only when status is `pending`, `awaiting_confirmation`, or `confirmed`.
- Customer cancellation fee changes for employee unavailability were not implemented because there is no request field or cancellation reason contract for that path yet.
- SMS and email delivery are represented through the existing hybrid notification system; external SMS/email providers were not added.

## Validation Checklist

- Feature spec read and mapped to existing `blockedDates` behavior.
- Booking creation checked against employee blocked dates.
- Reorder/reschedule checked against employee blocked dates.
- Employee availability API checked through slot calculator blocked date input.
- Shop availability API checked through per-employee blocked date input.
- Booking list and detail responses include `employee.isAvailableOnBookingDate`.
- Existing bookings remain unchanged when leave is created.
- Postman generator and generated collections updated.
- Targeted service and serializer tests added and passing.
