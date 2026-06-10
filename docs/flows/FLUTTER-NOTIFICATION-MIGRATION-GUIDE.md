# Flutter Notification Migration Guide

> **Document Type**: Client Integration Reference
> **Status**: APPROVED
> **Target Audience**: Mobile Application Engineers (Flutter)
> **Applicable Version**: v4.0+

---

## 1. What Changed

The backend API routes for the EverCut Notification Platform have been refactored to conform strictly to RESTful design principles. Specifically:
- Legacy role-branched routes under the shared `/api/v1/notifications` namespace have been separated into dedicated resources:
  - `/api/v1/notifications/inbox` for personal user inbox operations (Customers and Barbers)
  - `/api/v1/notifications/broadcasts` for administrative broadcast templates and dispatch tracking (Admin Dashboard)
- Endpoint routing logic has been removed from controller bodies and is now enforced at the routing layer via standard Express and authorization middlewares.

---

## 2. Why the Changes Were Made

To ensure clean system boundaries, future scalability, and prevent role-dependent side effects:
1. **REST Compliance**: Eliminates route polymorphism. One URL now identifies exactly one resource type.
2. **Security**: Role guards are enforced at the network boundary, making it impossible to bypass admin/customer separation.
3. **Decoupled Workflows**: Decouples admin templates and logs from personal notifications.

---

## 3. Old APIs vs New APIs

The following table lists every notification-related API route and its migrated path. 

| # | Old Route | New Route | Role Required | Notes |
|---|---|---|---|---|
| **Token Management** |||||
| 1 | `POST /notifications/tokens` | `POST /notifications/tokens` | Any | **No Change** |
| 2 | `DELETE /notifications/tokens/:token` | `DELETE /notifications/tokens/:token` | Owner | **No Change** |
| **User Inbox** |||||
| 3 | `GET /notifications` | `GET /notifications/inbox` | Customer, Barber | URL updated |
| 4 | `GET /notifications/unread-count` | `GET /notifications/inbox/unread-count` | Customer, Barber | URL updated |
| 5 | `GET /notifications/:id` | `GET /notifications/inbox/:id` | Owner | URL updated |
| 6 | `PATCH /notifications/:id` | `PATCH /notifications/inbox/:id` | Owner | URL updated |
| 7 | `PATCH /notifications` | `PATCH /notifications/inbox` | Customer, Barber | URL updated |
| **Admin Broadcasts (Not used by Flutter app)** |||||
| 8 | `GET /notifications` | `GET /notifications/broadcasts` | Admin | Dashboard only |
| 9 | `POST /notifications` | `POST /notifications/broadcasts` | Admin | Dashboard only |
| 10| `GET /notifications/:id` | `GET /notifications/broadcasts/:id` | Admin | Dashboard only |
| 11| `GET /notifications/:id/recipients` | `GET /notifications/broadcasts/:id/recipients` | Admin | Dashboard only |
| 12| `GET /notifications/:id/notifications`| `GET /notifications/broadcasts/:id/inbox-items` | Admin | Renamed & updated |
| 13| `GET /notifications/:id/audits` | `GET /notifications/broadcasts/:id/audits` | Admin | Dashboard only |

---

## 4. Request/Response Contract Changes

> [!IMPORTANT]
> **There are zero changes to request bodies, query parameters, or response payloads.**
> All schemas, serializations, and pagination envelopes remain identical. Only URL paths change.

---

## 5. Notification Workflow Changes

The hybrid push delivery model remains unchanged:
1. Trigger event occurs on the backend.
2. A high-priority silent or visible FCM push signal is sent to the client.
3. The Flutter application receives the signal and calls `GET /notifications/inbox` (previously `GET /notifications`) to fetch the latest sync items.

---

## 6. Token Management Changes

The token register and unregister endpoints are completely unchanged:
- Register: `POST /notifications/tokens`
- Revoke: `DELETE /notifications/tokens/:token`

No client changes are required for FCM token registration logic.

---

## 7. Read/Unread Workflow Changes

Updating read status or listing notifications must use the `/notifications/inbox` resource path.
For example, to mark all read:
- OLD: `PATCH /api/v1/notifications`
- NEW: `PATCH /api/v1/notifications/inbox`

---

## 8. Foreground Notification Handling

No handler code changes are required. As long as your API client utility base path or endpoint constants are updated, foreground refreshes (e.g., updating badges when a booking confirms) will function normally.

---

## 9. Background Notification Handling

No changes are required for `onBackgroundMessage()` or `onMessageOpenedApp()`. Payload structure and parameters (e.g. `entityId`, `entityType`) are identical.

---

## 10. Required Flutter Code Changes

Update your API constant paths in Dart:

```dart
// BEFORE
class ApiEndpoints {
  static const String tokens = '/notifications/tokens';
  static const String listNotifications = '/notifications';
  static const String unreadCount = '/notifications/unread-count';
}

// AFTER
class ApiEndpoints {
  static const String tokens = '/notifications/tokens'; // Unchanged
  static const String listNotifications = '/notifications/inbox'; // Updated
  static const String unreadCount = '/notifications/inbox/unread-count'; // Updated
}
```

Ensure that any references to marking read use:
- `/notifications/inbox/$notificationId` instead of `/notifications/$notificationId`
- `/notifications/inbox` instead of `/notifications`

---

## 11. Migration Steps

1. **Update Constants**: Locate the API routes configuration file in the Flutter codebase and apply the 5 path updates.
2. **Compile and Run**: Clean build the Flutter application (`flutter clean && flutter pub get`).
3. **Verify API Client logs**: Run the app with logger enabled and audit the network requests.
4. **Trigger Smoke Tests**: Perform manual validation scenarios (listed below).

---

## 12. Validation Steps

Perform these manual tests to verify client integration:

1. **Token Registration**: Log out and log in. Verify a `POST /notifications/tokens` request succeeds with status `200`.
2. **Notification Listing**: Open the Notification Center. Verify a `GET /notifications/inbox` request is initiated and returns a list of notifications.
3. **Badge Unread Count**: Verify the unread badge is populated by checking that `GET /notifications/inbox/unread-count` returns the correct count.
4. **Mark Notification Read**: Tap a notification item. Verify a `PATCH /notifications/inbox/:id` request is sent and returns status `200`.
5. **Mark All Read**: Tap "Mark all as read". Verify a `PATCH /notifications/inbox` request is sent and returns status `200`.

---

## 13. Testing Checklist

- [ ] Token registers successfully on fresh login
- [ ] Token revokes successfully on logout
- [ ] Foreground notification refreshes the inbox and unread count
- [ ] Tapping system notification launches app and navigates to target screen (deep links)
- [ ] Terminated state deep linking routes correctly
- [ ] Marks all as read clears badge count instantly
