# Notification System Postman Testing Guide

Use Postman only for these backend checks. Import `server/postman-collections/17-notifications.json` and `server/postman-collections/EverCut.postman_environment.json` after regenerating collections.

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
  "appVersion": "1.0.0"
}
```

Expected:

- `200`
- Response contains the registered token document.
- Re-running the request refreshes the same token instead of creating duplicate active token ownership.

## Flow 2: Trigger A Booking Notification

Use existing Postman collections:

1. Customer creates a booking with `04-customer-bookings.json`.
2. Customer initiates/verifies payment with `15-payments.json`.
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

FCM data values are strings and do not include `datetime`. The REST inbox response includes `datetime` as an ISO 8601 UTC string plus typed `data` values:

```json
{
  "id": "<notificationId>",
  "title": "Booking confirmed",
  "body": "Your booking is confirmed.",
  "imageUrl": "https://<cloudflare-media-domain>/images/notifications/system/evercut.png",
  "datetime": "2026-07-01T10:06:34.000Z",
  "data": {
    "eventType": "booking.confirmed",
    "entityType": "booking",
    "entityId": "<bookingId>",
    "bookingId": "<bookingId>",
    "requiresFetch": true
  }
}
```

## Flow 3: Read Notification History

Request:

```http
GET /api/v1/notifications/inbox?page=1&limit=20
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
- `data` is an array of notification DTOs for the authenticated user only.
- `meta.pagination` contains normal pagination metadata.

## Flow 4: Read Unread Count

Request:

```http
GET /api/v1/notifications/inbox/unread-count
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
PATCH /api/v1/notifications/inbox/{{notification_id}}
Authorization: Bearer {{customer_access_token}}
Content-Type: application/json

{
  "read": true
}
```

Expected:

- `200` for a notification owned by the token user.
- `404` if the notification belongs to another user or does not exist.

## Flow 6: Mark All Notifications Read

Request:

```http
PATCH /api/v1/notifications/inbox
Authorization: Bearer {{customer_access_token}}
Content-Type: application/json

{
  "read": true
}
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
DELETE /api/v1/notifications/tokens/{{fcm_token}}
Authorization: Bearer {{customer_access_token}}
```

Expected:

- `200`
- `data.revoked` is `true` when the token belonged to the authenticated user.
- `data.revoked` is `false` when the token was already revoked or owned by another user.

## Admin Broadcast Flows

Admins manage bulk broadcasts using separated broadcast routes. Make sure to authenticate as an admin (`{{admin_access_token}}`).

### Flow 8: List Broadcasts
Request:
```http
GET /api/v1/notifications/broadcasts?page=1&limit=10
Authorization: Bearer {{admin_access_token}}
```

### Flow 9: Create Broadcast (Async Dispatch)

To attach an image, first use the existing media flow as an admin:

1. `POST /api/v1/media/upload-url` with `purpose: "notification"` and an image MIME type (`image/png`, `image/jpeg`, or `image/webp`).
2. Upload the image bytes to the returned R2 `uploadUrl`.
3. `POST /api/v1/media/confirm` with the returned `mediaId`.
4. Use that `mediaId` as `imageMediaId` in the broadcast request.

Request:
```http
POST /api/v1/notifications/broadcasts
Authorization: Bearer {{admin_access_token}}
Content-Type: application/json

{
  "title": "Promo Alert",
  "body": "Get 20% off your next booking!",
  "type": "hybrid",
  "category": "promotional",
  "audience": {
    "mode": "customers",
    "filters": {}
  },
  "imageMediaId": "{{notification_image_media_id}}",
  "data": {
    "route": "/offers/weekend",
    "discount": "20"
  }
}
```
Expected: `201 Created` response immediately. Dispatch runs asynchronously in the background. If `imageMediaId` is omitted, the backend uses the default stable Cloudflare notification image.

### Flow 10: View Broadcast Details & Metrics
Request:
```http
GET /api/v1/notifications/broadcasts/{{broadcast_id}}
Authorization: Bearer {{admin_access_token}}
```

### Flow 11: View Broadcast Recipients
Request:
```http
GET /api/v1/notifications/broadcasts/{{broadcast_id}}/recipients
Authorization: Bearer {{admin_access_token}}
```

### Flow 12: View Inbox Items Generated by Broadcast
Request:
```http
GET /api/v1/notifications/broadcasts/{{broadcast_id}}/inbox-items
Authorization: Bearer {{admin_access_token}}
```

### Flow 13: View Broadcast Audit Trail
Request:
```http
GET /api/v1/notifications/broadcasts/{{broadcast_id}}/audits
Authorization: Bearer {{admin_access_token}}
```

## Multi-Device Scenario

1. Register token A with `deviceId=device-a`.
2. Register token B with `deviceId=device-b`.
3. Trigger a booking event.
4. Confirm that one notification row exists and FCM multicast targets both active tokens.

## Invalid Token Scenario

1. Register a stale or invalid real FCM token.
2. Trigger a notification.
3. Firebase returns an invalid-token error.
4. Backend marks the token `revokedAt` and records delivery as `sent` when at least one device succeeds, or `failed` when all targeted devices fail.

Synthetic Postman tokens cannot validate real Firebase delivery. They validate only REST persistence and ownership behavior.
