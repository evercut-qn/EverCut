# Notification System Postman Testing Guide

Use Postman only for these backend checks. Import `server/postman-collections/16-notifications.json` and `server/postman-collections/EverCut.postman_environment.json` after regenerating collections.

## Prerequisites

1. Start the API server.
2. Authenticate as a customer or barber using `01-authentication.json`.
3. Ensure the environment has `base_url`, `api_prefix`, and an access token.
4. Use a real FCM token for actual Firebase delivery. Use the synthetic Postman token only for token persistence and REST testing.

## Flow 1: Register A Device Token

Request:

```http
POST /api/v1/notifications/tokens
Authorization: Bearer {{customer_access_token}}
Content-Type: application/json
```

Body:

```json
{
  "token": "{{fcm_token}}",
  "platform": "android",
  "deviceId": "postman-device-1",
  "appVersion": "1.0.0",
  "locale": "en-IN"
}
```

Expected:

- `200`
- Response contains the registered token document.
- Re-running the request refreshes the same token instead of creating duplicate active token ownership.

## Flow 2: Trigger A Booking Notification

Use existing Postman collections:

1. Customer creates a booking with `04-customer-bookings.json`.
2. Customer initiates/verifies payment with `15-payments-payouts.json`.
3. When payment succeeds, backend emits `booking.awaiting_confirmation` to the barber.
4. Barber confirms booking with `10-barber-bookings.json`.
5. Backend emits `booking.confirmed` to the customer.

Expected notification payload data includes:

```json
{
  "eventType": "booking.confirmed",
  "entityType": "booking",
  "entityId": "<bookingId>",
  "bookingId": "<bookingId>",
  "requiresFetch": "true"
}
```

## Flow 3: Read Notification History

Request:

```http
GET /api/v1/notifications?page=1&limit=20
Authorization: Bearer {{customer_access_token}}
```

Optional filters:

```text
read=false
type=hybrid
eventType=booking.confirmed
```

Expected:

- `200`
- `data.items` contains notifications for the authenticated user only.
- `data.pagination` contains normal pagination metadata.

## Flow 4: Read Unread Count

Request:

```http
GET /api/v1/notifications/unread-count
Authorization: Bearer {{customer_access_token}}
```

Expected:

```json
{
  "success": true,
  "data": {
    "unreadCount": 1
  }
}
```

## Flow 5: Mark One Notification Read

First capture `notification_id` from Flow 3.

Request:

```http
PATCH /api/v1/notifications/{{notification_id}}/read
Authorization: Bearer {{customer_access_token}}
```

Expected:

- `200` for a notification owned by the token user.
- `404` if the notification belongs to another user or does not exist.

## Flow 6: Mark All Notifications Read

Request:

```http
PATCH /api/v1/notifications/read-all
Authorization: Bearer {{customer_access_token}}
```

Expected:

```json
{
  "success": true,
  "data": {
    "modifiedCount": 1
  }
}
```

## Flow 7: Unregister Device Token

Request:

```http
DELETE /api/v1/notifications/tokens
Authorization: Bearer {{customer_access_token}}
Content-Type: application/json
```

Body:

```json
{
  "token": "{{fcm_token}}"
}
```

Expected:

- `200`
- `data.revoked` is `true` when the token belonged to the authenticated user.
- `data.revoked` is `false` when the token was already revoked or owned by another user.

## Multi-Device Scenario

1. Register token A with `deviceId=device-a`.
2. Register token B with `deviceId=device-b`.
3. Trigger a booking event.
4. Confirm that one notification row exists and FCM multicast targets both active tokens.

## Invalid Token Scenario

1. Register a stale or invalid real FCM token.
2. Trigger a notification.
3. Firebase returns an invalid-token error.
4. Backend marks the token `revokedAt` and records delivery as `partial` or `failed`.

Synthetic Postman tokens cannot validate real Firebase delivery. They validate only REST persistence and ownership behavior.
