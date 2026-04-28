# Payments Flow

## Overview

Payments collect customer money through PhonePe. A booking remains `pending` until payment succeeds, then moves to `awaiting_confirmation` for barber action.

## API Steps

1. Create booking:
   `POST /api/v1/bookings`

2. Initiate payment:
   `POST /api/v1/payments`

3. Open `redirectUrl` in the client.

4. Poll payment if needed:
   `GET /api/v1/payments/:id`

5. Read latest payment for booking:
   `GET /api/v1/bookings/:id/payment`

6. If refund is required before payout starts:
   `POST /api/v1/bookings/:id/refund`

## Initiate Payment Request

```json
{
  "bookingId": "booking_id"
}
```

## Initiate Payment Response

```json
{
  "success": true,
  "message": "Payment initiated",
  "data": {
    "redirectUrl": "https://...",
    "paymentId": "payment_id",
    "merchantOrderId": "EC-booking_id-..."
  }
}
```

## Important Notes

- `POST /api/v1/payments` replaces old `/payments/initiate`.
- `GET /api/v1/payments/:id` replaces old `/payments/:id/status`.
- `GET /api/v1/bookings/:id/payment` replaces old `/payments/booking/:bookingId`.
- Expired or failed checkout sessions release the slot and cancel the unpaid booking.
