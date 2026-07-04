# Unified Notification Message Design

## Goal

Refactor EverCut notifications around one canonical message contract shared by REST APIs and Firebase Cloud Messaging:

```js
{
  id: string | null,
  title: string | null,
  body: string | null,
  imageUrl: string | null,
  data: Record<string, unknown>
}
```

This contract is the only notification shape Flutter depends on. Operational metadata remains available to backend/admin code only when it is useful for delivery, auditing, filtering, or troubleshooting.

## Current Architecture Summary

The backend currently has two delivery paths:

- System notifications call `notificationService.notifyUser()`, create one `InboxNotification`, and send FCM immediately.
- Admin broadcasts create a campaign `Notification`, resolve an audience, create `NotificationRecipient` and per-user `InboxNotification` records, then dispatch FCM asynchronously.

The current implementation is reliable in several ways: token lifecycle is explicit, invalid FCM tokens are revoked, transient FCM failures are retried, broadcasts have audit logs and startup recovery, and notification tests pass. The main problem is that public notification shape is spread across serializers, domain services, dispatch services, validators, and the FCM builder.

## Problems To Solve

- API and FCM payloads are constructed separately.
- Public notification fields include implementation details (`type`, `category`, `eventType`, `entityType`, `entityId`, delivery fields).
- There is no image support.
- The normal media URL policy uses short-lived signed URLs, which is unsuitable for push notification images.
- Admin notification creation has no image upload flow.
- FCM reserved-key validation exists in more than one place.
- System notification default image behavior is missing and must not be duplicated across event functions.

## Target Architecture

### Canonical Message Module

Create `server/src/services/notifications/notification-message.service.js` as the single source of truth for:

- building canonical message objects
- applying default image behavior
- validating and normalizing `data`
- moving routing/domain fields into `data`
- producing REST DTOs
- producing FCM payloads

All notification write paths call this module before persistence and delivery. Future changes to notification message fields should happen in this module first.

### Stored Data

Keep the existing three persistence concepts because they each serve a real operational purpose:

- `Notification`: admin broadcast/campaign metadata and aggregate delivery state.
- `NotificationRecipient`: per-user and per-device delivery reporting for admin broadcasts.
- `InboxNotification`: per-user notification inbox/read state.

Simplify their public message fields:

- Keep `title`, `body`, `imageUrl`, and `data`.
- Keep read/delivery/admin fields only for backend/admin operations.
- Stop exposing `type`, `category`, `eventType`, `entityType`, and `entityId` in Flutter-facing serializers. Domain-routing values move into `data`.

The `type` field remains internally for FCM visible-vs-silent behavior unless a smaller internal boolean proves cleaner during implementation.

### Data Shape

Domain events should provide routing metadata inside `data`, for example:

```js
{
  eventType: 'booking.confirmed',
  entityType: 'booking',
  entityId: '507f1f77bcf86cd799439011',
  bookingId: '507f1f77bcf86cd799439011',
  requiresFetch: true
}
```

FCM data values are strings, because Firebase requires string values. API `data` remains typed JSON.

### Image Policy

Notification images use stable long-lived Cloudflare URLs. They must not use the default short-lived signed media URLs because FCM notifications may render hours or days later.

Implementation details:

- Add `MEDIA_PURPOSE.NOTIFICATION`.
- Add notification-specific stable URL construction for R2 keys, without changing normal private media URLs.
- Use `server/assets/logo/evercut.png` as the default system notification image.
- Add a script to upload that logo to R2 and upsert a system `Media` row.
- Add config for the default notification image R2 key.
- System notifications automatically use the default image when no explicit image is provided.
- Admin broadcasts can supply `imageMediaId`; the backend resolves it to a stable notification `imageUrl`.

### FCM Payload

The FCM builder consumes the canonical message. For visible notifications, `imageUrl` is included in:

- `message.notification.imageUrl`
- `message.android.notification.imageUrl`
- `message.apns.fcmOptions.imageUrl`
- `message.webpush.notification.image`
- `message.data.imageUrl`

Silent notifications remain data-only and still include `id`, `imageUrl` if present, and `data`.

### Admin Application

The Next.js admin app keeps its existing architecture:

- Server Components fetch list/detail data.
- A client form handles interactive draft state.
- Server Actions authenticate mutations and call backend services.

Add a small media service for the admin upload flow:

1. request `POST /api/v1/media/upload-url` with `purpose: "notification"`
2. upload the selected image directly to Cloudflare R2 using the returned URL
3. confirm via `POST /api/v1/media/confirm`
4. create the broadcast with `imageMediaId`

The admin form, list, and detail page display the image when present.

### Documentation

Update only affected notification documentation and Postman artifacts:

- notification feature docs
- Flutter notification guides
- notification testing guide
- Postman notification collection generator and generated collection

## Field Decisions

Keep internally:

- `status`, `metrics`, `audience`, `createdByUserId`, `sentAt`, `completedAt`, `failureReason`: admin and operational delivery state.
- `NotificationRecipient.tokenAttempts`: troubleshooting failed broadcast delivery.
- `readAt`: inbox read state.
- `dedupeKey`: idempotency.
- FCM token lifecycle fields: token hygiene and delivery health.

Expose to Flutter:

- `id`
- `title`
- `body`
- `imageUrl`
- `data`

Remove from Flutter-facing output:

- `notificationId`
- `recipientId`
- `recipientUserId`
- `actorUserId`
- `type`
- `category`
- `eventType`
- `entityType`
- `entityId`
- `status`
- `delivery`
- `deliveredAt`
- `createdAt`
- `updatedAt`

Keep in admin broadcast responses as needed:

- campaign id, title, body, imageUrl, data
- audience
- status/displayStatus
- metrics/reporting
- timestamps

## Validation Strategy

Tests must verify:

- canonical REST message serialization
- canonical FCM payload generation
- default system image resolution
- explicit admin image resolution
- stable notification image URL generation
- reserved FCM key rejection in one place
- broadcast inbox rows and FCM payloads remain consistent
- system notifications and broadcasts both use the same message builder
- admin validator accepts `imageMediaId`
- media purpose `notification` is accepted and does not trigger barber gallery quota

## Non-Goals

- No migration or backward compatibility layer.
- No broad outbox/event-platform rewrite.
- No change to normal private media signed URL behavior.
- No speculative scheduling/template system.
- No full admin redesign.
