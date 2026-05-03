# Notification System Functional Overview

EverCut notifications use a hybrid real-time design.

## What Real-Time Means Here

FCM provides the real-time wake-up trigger. The mobile client receives a push or data message as soon as the backend processes an event. The app then fetches REST APIs to load the authoritative state.

This avoids stale or incomplete client state because the notification payload does not need to contain the full booking, payment, rating, or payout object.

## Main Actors

- Customer receives booking confirmations, cancellations, payment failures, refund updates, rating replies, and account updates.
- Barber receives paid booking requests, customer cancellations, new ratings, payout updates, shop/account updates, and future chat messages.
- Admin may register tokens and view personal notifications, but no admin-specific notification events were added.

## User Journey Examples

### Paid Booking Confirmation

```text
Customer pays for booking
  -> payment service marks booking awaiting_confirmation
  -> notification event sends hybrid FCM to barber
  -> barber app fetches pending confirmations through REST
  -> barber confirms booking
  -> notification event sends hybrid FCM to customer
  -> customer app fetches booking details through REST
```

### Customer Cancellation

```text
Customer cancels booking
  -> booking service validates ownership and cancellation window
  -> refund starts if payment succeeded
  -> booking is cancelled and slot is released
  -> barber receives booking.cancelled trigger
  -> barber dashboard fetches latest bookings through REST
```

### Rating Reply

```text
Barber replies to rating
  -> rating service persists reply
  -> customer receives rating.reply trigger
  -> customer app opens rating or notifications screen
```

## Notification State

Each notification has:

- event type
- notification type
- recipient
- optional actor
- title/body for visible notifications
- data payload for routing and refetch
- read/unread status
- delivery status
- dedupe key for idempotent events

## Delivery Behavior

Foreground:

- Flutter receives `onMessage`.
- App refreshes unread count and notification list.
- App may show a local notification.

Background:

- OS displays notification payload for push/hybrid messages.
- User tap is handled with `onMessageOpenedApp`.
- App refreshes from REST.

Terminated:

- User tap is handled with `getInitialMessage`.
- App fetches REST state before routing.

Silent:

- Data-only triggers refresh cached state.
- Best suited for account/profile/shop status changes.

## Failure Behavior

- If there are no active tokens, the notification row is marked `skipped`.
- If FCM partially fails, the row is marked `partial`.
- If all FCM sends fail, the row is marked `failed`.
- Invalid or unregistered FCM tokens are revoked.
- Business workflows never fail because notification delivery failed.

## Future Chat Integration

When chat persistence exists, the chat service should call the central notification service after saving the message:

```text
message persisted
  -> identify recipient
  -> if recipient is not active in the conversation, send chat.message
  -> include conversationId/messageId in data
  -> app fetches conversation through REST
```
