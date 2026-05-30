# Dashboard Implementation Guide

## Overview

The barber dashboard is served through resource-owned API endpoints rather than a dedicated `/dashboard` route family. This keeps operational data close to the resource it describes and matches the current routing architecture.

## Dashboard Data Sources

| Dashboard section | Endpoint | Source resource |
|---|---|---|
| Booking summary, milestones, today pulse, queue, appointment trend | `GET /api/v1/bookings/overview` | Bookings |
| Staff daily progress | `GET /api/v1/employees/daily-progress` | Employees and bookings |
| Earnings and income trend | `GET /api/v1/earnings` | Earnings and payment transactions |
| Ratings summary | `GET /api/v1/ratings/summary` | Ratings |
| Gallery usage | `GET /api/v1/media/gallery/usage` | Media |

All dashboard-facing endpoints require a valid JWT. Barber-owned dashboard resources require the `BARBER` role and are scoped to the authenticated barber's shop.

## Booking Overview

**Endpoint:** `GET /api/v1/bookings/overview`

Returns existing dashboard sections plus historical appointment analytics:

```json
{
  "success": true,
  "message": "Booking overview fetched",
  "data": {
    "summary": {
      "total": 120,
      "pending": 4,
      "awaitingConfirmation": 6,
      "completed": 90,
      "cancelled": 8
    },
    "milestones": {},
    "today": {},
    "queue": {},
    "appointments": {
      "total": 845,
      "growth": 31.3,
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
}
```

### Appointment Analytics Rules

- Uses the last 6 completed UTC months.
- Excludes the current month entirely.
- Always returns exactly 6 month entries.
- Returns full month names in chronological order.
- Missing months return `0`.
- Counts closed appointment outcomes: `completed` and `no-show`.
- Excludes `pending`, `awaiting_confirmation`, `confirmed`, and `cancelled`.
- Growth compares the two most recent completed months.

## Today's Pulse

`data.today` is returned by `GET /api/v1/bookings/overview`.

It includes:

- `occupancy.booked`: booked minutes for today's non-cancelled bookings.
- `occupancy.total`: available staff capacity in minutes.
- `occupancy.percentage`: rounded occupancy percentage.
- `statusBreakdown`: all, pending, done, and cancelled counts for today.

`done` includes `completed` and `no-show`, matching staff progress and payout eligibility behavior.

## Staff Daily Progress

**Endpoint:** `GET /api/v1/employees/daily-progress`

Returns active, non-deleted employees with today's completed, total, remaining, and percentage progress. Completed progress includes both `completed` and `no-show` bookings. Cancelled bookings are excluded from each employee's daily total.

## Earnings And Income

**Endpoint:** `GET /api/v1/earnings`

The dashboard can use the `income` block for six completed months of barber payout income and the existing `monthlyRevenue` block for current-month revenue.

```json
{
  "success": true,
  "message": "Earnings fetched",
  "data": {
    "totalEarning": 500000,
    "lastMonthEarning": 145000,
    "todayEarning": 5000,
    "monthlyRevenue": {
      "amount": 25000,
      "currency": "INR",
      "changePercentage": 12.5,
      "changeDirection": "up",
      "period": "May 2026"
    },
    "income": {
      "total": 78500,
      "growth": 18.6,
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
}
```

## Growth Calculation

Historical appointment and income growth use the same rule:

```text
((CurrentCompletedMonth - PreviousCompletedMonth) / PreviousCompletedMonth) * 100
```

If the previous month is `0`:

- Current month greater than `0` returns `100`.
- Current month equal to `0` returns `0`.

The value is rounded to one decimal place and can be negative.

## Testing

Use the generated Postman collection:

```text
server/postman-collections/14-operational-analytics.json
```

Relevant requests:

- `GET /api/v1/bookings/overview`
- `GET /api/v1/employees/daily-progress`
- `GET /api/v1/earnings`
- `GET /api/v1/ratings/summary`
- `GET /api/v1/media/gallery/usage`

The generated collection asserts that appointment and income analytics each return exactly 6 monthly statistics entries.

## Related Documentation

- [Appointments and Income Analytics](../analytics/APPOINTMENTS-INCOME-ANALYTICS.md)
- [Earnings & Transactions](../earnings/README.md)
- [Transactions API Guide](../earnings/TRANSACTIONS-API-GUIDE.md)
- [Booking System Guide](../bookings/BOOKING-SYSTEM-GUIDE.md)
