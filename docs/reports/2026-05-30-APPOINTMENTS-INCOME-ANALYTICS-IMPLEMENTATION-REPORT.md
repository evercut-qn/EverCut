# Appointments and Income Analytics Implementation Report

**Date:** May 30, 2026  
**Status:** Completed  
**Scope:** `GET /api/v1/bookings/overview`, `GET /api/v1/earnings`, generated Postman collections, and documentation.

---

## Architecture Decision

The analytics contract is implemented through existing resource-owned APIs instead of a new standalone endpoint:

- `GET /api/v1/bookings/overview` owns appointment dashboard data and now returns appointment analytics.
- `GET /api/v1/earnings` owns earnings dashboard data and now returns income analytics.

This keeps the API RESTful, avoids duplicating domain queries in a generic analytics controller, and preserves backward compatibility by adding sibling response fields without removing or renaming existing fields.

---

## Response Placement

### Booking Overview

`appointments` is returned as a top-level sibling next to `summary`, `milestones`, `today`, and `queue`.

It was not placed under `summary` because `summary` represents current operational counts. It was not placed under `milestones` because milestones are service progress indicators, not month-series analytics. A dedicated nested `analytics` object would be viable for a new endpoint, but the existing overview response already uses named dashboard sections.

### Earnings

`income` is returned as a top-level sibling next to existing earnings fields.

It was not merged into `monthlyRevenue` because `monthlyRevenue` is the current-month dashboard metric. The new `income` block is a last-six-completed-month aggregate with total, growth, and monthly statistics.

---

## Data Source Decisions

Appointment analytics counts `completed` and `no-show` bookings. Existing service logic treats both statuses as done work in employee stats, booking overview done counts, and payout-facing completed booking queries.

Income analytics uses completed payment transactions. The monthly amount is summed from `settlement.barberPayout` when available, then `settlement.serviceAmount`, then transaction `amount` for legacy compatibility.

---

## Date and Growth Decisions

Both analytics blocks share a reusable month analytics utility:

- UTC month boundaries.
- Last six completed months.
- Current month excluded.
- Chronological output.
- Exact six-row zero-filled statistics.
- Full month names.

Growth is calculated from the two most recent completed months and rounded to one decimal. If the previous month is zero, the result is `100` when the current month is positive and `0` when both months are zero, matching the existing earnings percentage convention.

---

## Validation

Implemented validation coverage includes:

- Date-window utility tests, including cross-year ranges.
- Growth tests for positive, negative, flat, previous-zero, and both-zero cases.
- Booking overview service tests for the new `appointments` sibling.
- Earnings service tests for the new `income` sibling.
- Repository aggregation tests for monthly booking and payment pipelines.
- Generated Postman assertions for six-month analytics response shapes.

---

## Backward Compatibility

No existing endpoint, HTTP method, route, request schema, or existing response field was removed or renamed. Consumers that ignore unknown response fields continue to work unchanged.
