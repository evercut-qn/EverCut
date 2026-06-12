# Notification System Implementation Report

## Scope

This report documents the backend notification system added to EverCut. The implementation uses a hybrid model:

- REST APIs are the source of truth for notification history, unread count, and domain data fetching.
- Firebase Cloud Messaging is used only as a real-time trigger for mobile/web clients.

## Codebase Findings

- The server already had Firebase Admin configuration via environment variables, but no messaging abstraction used it for FCM.
- There was no FCM token table, so multi-device delivery and token ownership validation were missing.
- There was no notification persistence model, unread/read tracking, notification history, delivery status, dedupe key, or FCM failure handling.
- Booking, payment, refund, rating, payout, and account flows changed business state without notifying the affected role.
- No chat/message module exists in `server/src`; chat notification hooks are designed but cannot be wired until message persistence exists.
- Several docs are historical snapshots. In particular, some reports still mention removed legacy routes such as `/customers/me/home`.
- Local secret files exist in the server folder. The implementation uses environment configuration and does not read or embed local secret files.

## Final Architecture

Textual flow:

```text
Business event
  -> domain service updates MongoDB state
  -> notification-events.service builds event-specific payload
  -> notification.service persists Notification with dedupeKey
  -> notification.service reads active FcmToken records
  -> fcm.service sends FCM multicast payload
  -> invalid FCM tokens are revoked
  -> Notification delivery status is updated
  -> Flutter receives trigger and fetches REST source of truth
```

## Event Catalog

Implemented event hooks:

- `booking.awaiting_confirmation`: payment succeeds and barber must confirm.
- `booking.confirmed`: barber confirms a paid booking.
- `booking.cancelled`: customer or barber cancels.
- `booking.auto_cancelled`: awaiting confirmation timed out.
- `booking.completed`: barber closes booking as completed.
- `booking.no_show`: barber marks customer no-show.
- `payment.failed`: payment failed, expired, or amount verification failed.
- `payment.refund_pending`: refund was initiated.
- `payment.refunded`: refund webhook confirms completion.
- `payment.refund_failed`: refund failed or needs manual handling.
- `rating.received`: customer adds a shop rating.
- `rating.reply`: barber replies to a customer rating.
- `account.updated`: email, phone, customer profile, shop profile, or payout details changed.
- `shop.status_updated`: barber toggles shop open/closed.
- `payout.completed`: payout completed.
- `payout.failed`: payout failed or reversed.

Designed future event:

- `chat.message`: to be emitted after a future chat module persists a message.

## Notification Types

- `push`: FCM notification payload plus data. OS may display it in background/terminated states.
- `silent`: FCM data-only payload. Used for cache refresh triggers such as account/profile changes.
- `hybrid`: notification plus data payload. Used for booking/payment/rating/payout events.

## Data Model

### `FcmToken`

Stores one row per device token:

- `userId`
- `token` unique
- `platform`: `android`, `ios`, `web`, `unknown`
- `deviceId`, `appVersion`
- `lastSeenAt`
- `revokedAt`
- `failureCount`, `lastFailureAt`, `failureReason`

Registering the same token again refreshes metadata. If another authenticated user registers the same token, ownership is reassigned to the current user.

### `Notification`

Stores one row per event notification:

- `recipientUserId`
- `actorUserId`
- `type`
- `eventType`
- `title`, `body`
- `data`
- `entityType`, `entityId`
- `dedupeKey` unique when present
- `status`: `queued`, `sent`, `failed`
- `delivery.successCount`, `delivery.failureCount`
- `deliveredAt`, `readAt`, `failureReason`
- `expiresAt` optional TTL

## API Surface

All endpoints require authentication.

```text
POST   /api/v1/notifications/tokens
DELETE /api/v1/notifications/tokens
GET    /api/v1/notifications
GET    /api/v1/notifications/unread-count
PATCH  /api/v1/notifications/:id
PATCH  /api/v1/notifications
```

## Reliability Decisions

- Persistence happens before FCM delivery, so history remains available even when FCM fails.
- Dedupe keys prevent duplicate notification rows and duplicate FCM sends for idempotent business events.
- Invalid FCM tokens are revoked after Firebase reports token errors.
- Notification failures are logged and never roll back booking, payment, rating, payout, or profile state changes.
- Multi-device delivery uses active token lookup by `recipientUserId`.
- REST remains authoritative, so client foreground/background/terminated handling can always refetch.

## Security Decisions

- Token registration and revocation require `authenticate`.
- Token revocation is scoped to `{ userId, token }`.
- Notification history and read APIs are scoped to `recipientUserId`.
- Clients cannot create arbitrary notifications through public APIs.
- Firebase Admin credentials remain environment-driven.

## Trade-Offs

- Delivery retry queues are represented by persisted `failed` states, but no background retry worker was added yet. This avoids introducing queue infrastructure before the project has one.
- FCM delivery is awaited after domain commits so failures are observable in the same request/job, while domain success remains protected by notification event error handling.
- Chat notifications are documented as a future integration because there is no server-side chat persistence layer.

## Assumptions

- MongoDB remains the authoritative store for notifications.
- Flutter will fetch `/notifications` and the domain endpoint referenced by `entityType/entityId` after each FCM trigger.
- Firebase Admin credentials are supplied through `.env` or runtime environment variables.
- Local `server/.env` and `server/firebase-admin-sdk.json` are treated as secrets and were not used as implementation input.
- The codebase scope reviewed was `docs/` and `server/`, excluding generated dependencies such as `server/node_modules` and local secret material.

---

## Addendum: RESTful API Migration & Reliability Refactoring (June 2026)

In June 2026, the notification platform underwent a major RESTful API refactoring and reliability expansion to align with Option A (Full Resource Separation) and introduce enterprise-grade reliability patterns:

### 1. API Surface Separation
The unified `/notifications` route was split into distinct collections to eliminate role-dependent controller logic and enforce RESTful boundaries:
- **Inbox Notifications**: Managed under `/api/v1/notifications/inbox` (GET list, GET detail, GET unread-count, PATCH mark read, PATCH mark all read).
- **Admin Broadcasts**: Managed under `/api/v1/notifications/broadcasts` (GET templates, POST create, GET details, GET recipients, GET inbox-items, GET audits).
- **Tokens**: Managed under `/api/v1/notifications/tokens` (POST register, DELETE /tokens/:token).

### 2. Reliability & Resilience Upgrades
- **FCM Retry with Exponential Backoff**: Transient FCM delivery errors (such as `server-unavailable` or `internal-error`) are retried up to 2 times with exponential backoff ($2^{\text{attempt}} \times 1000$ ms) and jitter.
- **Asynchronous Broadcast Dispatch**: Broadcast creation (`POST /broadcasts`) responds with `201 Created` immediately, executing the dispatch task asynchronously in the background via `setImmediate` to prevent HTTP timeouts.
- **Parallel Dispatch Processing**: Recipients are processed in parallel batches of 50 to optimize database load and memory usage.
- **Weekly Stale Token Cleanup**: A background cron job automatically deletes FCM tokens that have been inactive (no successful registrations or deliveries) for over 90 days.
- **Startup Recovery Scan**: On server restart, a recovery task scans for broadcasts stuck in the transient `sending` state. It marks them as `failed` and records progress context (e.g., processed vs remaining recipients) in `failureReason`.
