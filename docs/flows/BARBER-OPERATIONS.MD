# Barber Operations Flow

## Overview

Barbers manage shop profile, services, employees, photos, bookings, ratings, and earnings from authenticated role-specific APIs.

## Shop APIs

- Profile: `GET /api/v1/shops/me`
- Update profile: `PUT /api/v1/shops/me`
- UPI details: `GET /api/v1/shops/me/upi`
- Update UPI: `PUT /api/v1/shops/me/upi`
- Toggle open status: `PUT /api/v1/shops/me/status`
- Update profile picture: `PUT /api/v1/shops/me/picture`
- Update cover image: `PUT /api/v1/shops/me/cover`
- Update PIN: `PUT /api/v1/shops/me/pin`

## Service APIs

- List: `GET /api/v1/services`
- Create: `POST /api/v1/services`
- Update: `PUT /api/v1/services/:id`
- Delete: `DELETE /api/v1/services/:id`

## Employee APIs

- List: `GET /api/v1/employees`
- Create: `POST /api/v1/employees`
- Update: `PUT /api/v1/employees/:id`
- Delete: `DELETE /api/v1/employees/:id`

## Booking APIs

- Dashboard list: `GET /api/v1/bookings`
- Pending confirmations: `GET /api/v1/bookings/pending-confirmations`
- Stats: `GET /api/v1/bookings/stats`
- Progress: `GET /api/v1/bookings/progress`
- Filter by status: `GET /api/v1/bookings/status?status=confirmed`
- Confirm: `PATCH /api/v1/bookings/:id/confirm`
- Status update: `PUT /api/v1/bookings/:id/status`
- Cancel: `POST /api/v1/bookings/:id/cancel`

## Important Notes

- Employee deletion is blocked when unresolved bookings still reference the employee.
- Status supports `confirmed`, `completed`, `cancelled`, and `no-show`.
- `no-show` bookings are payout-eligible like completed bookings.
