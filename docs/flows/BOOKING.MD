# Booking Flow

## Overview

Bookings now use normalized `HH:MM` time and an atomic multi-slot lock. If a 60-minute service starts at `10:00`, the backend locks `10:00` and `10:30` so overlapping bookings cannot slip through.

## API Steps

1. Discover shops:
   `GET /api/v1/shops/nearby`

2. Select shop:
   `GET /api/v1/shops/:id`

3. Select service from `data.services.single` or `data.services.bundled`.

4. Select employee:
   `GET /api/v1/shops/:id/employees`

5. Check availability:
   `GET /api/v1/shops/:id/availability?date=2099-01-01&serviceId=<service_id>`

6. Create booking:
   `POST /api/v1/bookings`

7. Pay for booking:
   `POST /api/v1/payments`

8. Barber confirms paid booking:
   `PATCH /api/v1/bookings/:id/confirm`

## Create Booking Request

```json
{
  "shopId": "shop_id",
  "employeeId": "employee_id",
  "serviceId": ["service_id"],
  "date": "2099-01-01",
  "time": "10:00"
}
```

## Create Booking Response

```json
{
  "success": true,
  "message": "Booking created",
  "data": {
    "bookingId": "booking_id",
    "status": "pending",
    "paymentStatus": "pending",
    "paymentRequired": true,
    "durationMinutes": 60,
    "slotLockTimes": ["10:00", "10:30"]
  }
}
```

## Customer Management APIs

- List bookings: `GET /api/v1/bookings?type=upcoming`
- Details: `GET /api/v1/bookings/:id`
- Confirmation payload: `GET /api/v1/bookings/:id/confirmation`
- Update unpaid booking: `PUT /api/v1/bookings/:id`
- Reschedule unpaid booking: `PUT /api/v1/bookings/:id/reschedule`
- Reorder: `POST /api/v1/bookings/:id/reorder`
- Toggle favorite: `PUT /api/v1/bookings/:id/favorite`
- Cancel: `POST /api/v1/bookings/:id/cancel`

## Important Notes

- Update and reschedule are blocked once payment has started.
- Failed, expired, or suspicious payment sessions cancel the unpaid booking and release slot locks.
- Bundle bookings below the configured minimum amount are rejected before any slot is locked.
