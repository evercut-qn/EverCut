# Notification System Overview

EverCut uses a hybrid real-time design for user notifications. The system ensures that notifications remain lightweight, highly secure, and consistent across different clients (mobile app and admin portal).

---

## 1. Hybrid Real-Time Architecture

The system uses **Firebase Cloud Messaging (FCM)** as a real-time wake-up trigger. When a notification event occurs:
1. The backend persists the state (recipient and inbox feed entry).
2. The backend sends a minimal multicast FCM payload containing only routing metadata (e.g. `id`, `eventType`, `entityType`, `entityId`).
3. The client receives the FCM trigger and queries the **EverCut REST API** to fetch the authoritative, up-to-date state.

This approach avoids sending full business objects (e.g. booking details, payment data) over push payloads, keeping payloads under size limits and ensuring sensitive information is never exposed outside the authenticated API boundary.

---

## 2. Actors and Responsibilities

- **Customer**: Receives transactional booking confirmations, cancellations, payment failures, refund updates, rating replies, and account updates.
- **Barber**: Receives paid booking requests, customer cancellations, rating notifications, payout updates, and shop profile updates.
- **Admin**: Resolves audiences and drafts/sends bulk promotional or system alert notifications to segments (e.g. all customers, all barbers).
- Writes delivery logs and triggers unread-count updates.
- Purges obsolete payload entries idempotently.

---

## 3. User Journey Examples

### Booking Confirmation Flow
```text
Customer pays for booking
  -> Payment service marks booking status as "awaiting_confirmation"
  -> Notification domain service sends hybrid FCM wake-up to barber
  -> Barber app receives wake-up and fetches pending confirmations from REST
  -> Barber clicks "Confirm" in app
  -> Notification domain service sends hybrid FCM wake-up to customer
  -> Customer app receives wake-up and refetches booking details from REST
```

### Customer Cancellation Flow
```text
Customer cancels booking
  -> Booking service validates cancellation window and releases time slot
  -> Refund is initiated if payment was successful
  -> Notification domain service sends event "booking.cancelled" to barber
  -> Barber dashboard fetches latest bookings list via REST
```

### Rating Reply Flow
```text
Barber replies to a rating
  -> Rating service persists reply
  -> Notification domain service sends event "rating.reply" to customer
  -> Customer app receives wake-up and refetches rating thread via REST
```

---

## 4. Inbox Notifications vs. Broadcasts

To distinguish between personal notifications and bulk templates, the system uses two concepts and enforces full RESTful resource separation at the API layer:
- **Notification (Broadcast)**: Represents a bulk message template created by admins targeting a specific audience segment (e.g., a promotional offer). Managed via `/api/v1/notifications/broadcasts`.
- **InboxNotification (Personal Feed)**: Represents a single recipient's inbox feed item (e.g., a booking update or a resolved copy of a broadcast notification). Managed via `/api/v1/notifications/inbox`.

---

## 5. Notification Delivery & Failure States

### Client Handlers
- **Foreground (`onMessage`)**: Flutter app receives the trigger, increments the unread badge count, and refreshes the notification list in the active view.
- **Background (`onMessageOpenedApp`)**: The OS displays the notification card. Tapping it triggers the handler, routes the user based on the payload metadata, and refreshes state from the REST API.
- **Terminated (`getInitialMessage`)**: Tapping the notification card boots the app, processes routing metadata, and fetches details before rendering the view.

### Failure Handling
- **No Active Tokens**: If the target user has no registered FCM tokens, the inbox notification status is marked `sent` and the `skippedCount` metric is incremented.
- **FCM Partial Failure**: If sending to multiple devices succeeds for some but fails for others, the status is marked `sent` and each failed token's error code is recorded in the `tokenAttempts` embedded array on the recipient document.
- **FCM Outage / Failure**: If all sends fail, status is marked `failed`.
- **Token Invalidation**: Stale, revoked, or unregistered FCM tokens are automatically deactivated upon receiving feedback from Firebase.
- **Resilience**: Crucial business workflows (e.g., confirming a booking) are completely decoupled from push notifications. If FCM is down, the notification is stored in the user's inbox feed and will display whenever they open the app.

---

## 6. System Resilience & Cleanup

The notification platform includes autonomous jobs to ensure reliability:
1. **FCM Retry with Exponential Backoff**: Transient errors (e.g., rate limits, network timeouts) are retried automatically up to 2 times using an exponential backoff strategy with random jitter.
2. **Weekly Stale Token Cleanup**: A background cron job automatically deletes FCM tokens that have been inactive for over 90 days, maintaining database efficiency.
3. **Startup Recovery Scan**: On server boot, a recovery job identifies any broadcasts stuck in the transient `sending` status (due to a server crash or sudden restart) and marks them as `failed` with detailed recipient context in `failureReason`.
