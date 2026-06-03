# Appointments and Income Analytics

**Last Updated:** May 30, 2026  
**Status:** Production Ready

---

## Overview

EverCut exposes appointment and income analytics through existing resource-owned barber APIs:

- `GET /api/v1/bookings/overview` returns booking dashboard data plus the `appointments` analytics block.
- `GET /api/v1/earnings` returns earnings dashboard data plus the `income` analytics block.

No standalone analytics endpoint is required for this contract. The data remains colocated with the resources that own it, while `14-operational-analytics.json` groups the same resource-owned requests for dashboard testing.

---

## Appointment Analytics Contract

`GET /api/v1/bookings/overview` adds a sibling `appointments` object next to the existing `summary`, `milestones`, `today`, and `queue` fields.

```json
{
  "appointments": {
    "total": 845,
    "growth": 12.5,
    "statistics": [
      { "month": "November", "count": 110 },
      { "month": "December", "count": 125 },
      { "month": "January", "count": 135 },
      { "month": "February", "count": 128 },
      { "month": "March", "count": 150 },
      { "month": "April", "count": 197 }
    ]
  }
}
```

Appointments analytics counts closed appointment outcomes only:

- Included: `completed`, `no-show`
- Excluded: `pending`, `awaiting_confirmation`, `confirmed`, `cancelled`

This follows the existing dashboard and employee analytics convention where completed and no-show bookings are treated as done work.

---

## Income Analytics Contract

`GET /api/v1/earnings` adds a sibling `income` object next to existing earnings fields such as `totalEarnings`, `currentMonth`, `pendingPayouts`, and `monthlyRevenue`.

```json
{
  "income": {
    "total": 78500,
    "growth": 8.7,
    "statistics": [
      { "month": "November", "amount": 10500 },
      { "month": "December", "amount": 11800 },
      { "month": "January", "amount": 12400 },
      { "month": "February", "amount": 12100 },
      { "month": "March", "amount": 14500 },
      { "month": "April", "amount": 17200 }
    ]
  }
}
```

Income analytics uses completed payment transactions for the authenticated shop. Monthly amounts are summed from the barber payout amount when settlement data exists, with fallback to service amount or transaction amount for legacy rows.

---

## Date Range Rules

Both analytics blocks use the same month-window rules:

- Use the last six completed months only.
- Exclude the current month entirely.
- Always return exactly six months.
- Use full English month names.
- Return months in chronological order from oldest to newest.
- Return `0` for missing months.
- Never return `null` for missing months.

Example: for a request on May 30, 2026, the returned months are November 2025 through April 2026.

---

## Growth Rules

Growth is calculated from the two most recent completed months:

```text
((currentMonth - previousMonth) / previousMonth) * 100
```

Growth values are rounded to one decimal place.

When the previous month is zero:

- Previous `0`, current `0` returns `0`.
- Previous `0`, current greater than `0` returns `100`.

This matches the existing earnings `monthlyRevenue` behavior and avoids returning `Infinity`, `null`, or omitting the field.

---

## Testing

The implementation is covered by:

- Utility tests for month range generation, zero filling, totals, growth, and cross-year windows.
- Repository aggregation tests for booking and payment monthly pipelines.
- Service tests for `getBookingOverview` and `getEarnings`.
- Generated Postman assertions in `10-barber-bookings.json`, `12-barber-earnings.json`, and `14-operational-analytics.json`.
