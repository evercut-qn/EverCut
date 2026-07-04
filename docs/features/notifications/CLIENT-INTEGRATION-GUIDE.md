# Notification Client Integration Guide

This guide details frontend integration procedures for both the mobile Flutter application and the Next.js admin portal.

---

## 1. Flutter Mobile Client Integration

### 1.1 Startup and Authentication Flow
At startup (or immediately after a user successfully logs in):
1. **Initialize Firebase**: Call `Firebase.initializeApp()`.
2. **Request Permission**: Use `FirebaseMessaging.instance.requestPermission()` to obtain user consent.
3. **Retrieve Token**: Retrieve the current FCM token:
   ```dart
   String? token = await FirebaseMessaging.instance.getToken();
   ```
4. **Register with Backend**: Send the token to the EverCut server via `POST /api/v1/notifications/tokens`:
   ```json
   {
     "token": "fcm-token-value...",
     "platform": "android", // or "ios", "web"
     "deviceId": "pixel-8-id",
     "appVersion": "2.4.1"
   }
   ```
5. **Listen for Token Refresh**: Subscribe to token updates and send refreshes to the backend:
   ```dart
   FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
       // Send token update to POST /api/v1/notifications/tokens
   });
   ```

### 1.2 Handlers for Push Notification Lifecycle
- **Foreground (`onMessage`)**: Flutter's listener receives the message object. The app must increment the unread feed badge count and refresh the notifications list in the UI. In-app banner alerts can be shown locally.
- **Background (`onMessageOpenedApp`)**: Fired when the user taps a notification card in the system tray while the app is in the background. The app should parse the payload data (e.g. `eventType`, `entityId`) to route the user, and then fetch the latest state from the REST API.
- **Terminated (`getInitialMessage`)**: Handles cold boots from notification taps. Read the initial message on launch, route the user, and perform the REST state fetch.

### 1.3 Logout Flow
To ensure a device does not receive notifications after logout, **always revoke the token** on the backend:
1. Make a `DELETE /api/v1/notifications/tokens/:token` call passing the current active token.
2. Clear the local token cache.

### 1.4 REST API Integration
For managing user notifications feeds, the Flutter app integrates with the following inbox-specific REST routes:
- **Fetch Notifications List**: `GET /api/v1/notifications/inbox` (supports `page`, `limit`, and `read` query parameters)
- **Get Unread Badge Count**: `GET /api/v1/notifications/inbox/unread-count`
- **Mark Single Notification as Read**: `PATCH /api/v1/notifications/inbox/:id` with `{ "read": true }`
- **Mark All Notifications as Read**: `PATCH /api/v1/notifications/inbox` with `{ "read": true }`
- **Fetch Notification Details**: `GET /api/v1/notifications/inbox/:id`

Inbox list and detail responses return `id`, `title`, `body`, `imageUrl`, `datetime`, and `data`. `datetime` is an ISO 8601 UTC string sourced from the backend creation timestamp and should be used for display ordering/date labels. FCM payloads do not include `datetime`; after any push, fetch REST for the authoritative timestamp.

---

## 2. Next.js Admin Portal Integration

Admins manage bulk broadcasts using the Next.js admin dashboard.

### 2.1 Schema and Form Management
Admin broadcasts are created using a client-side Zod validator [notification.schema.js](file:///c:/Users/manis/Projects/EverCut/admin/src/lib/schemas/notification.schema.js):
- **Fields**:
  - `title` (String, max 120 chars)
  - `body` (String, max 500 chars)
  - `type` (Enum: `push`, `silent`, `hybrid`)
  - `category` (Enum: `transactional`, `admin_broadcast`, `silent_sync`, `system_alert`, `promotional`)
  - `audienceMode` (Enum: `customers`, `barbers`, `customers_and_barbers`)
  - `imageMediaId` (Optional media id returned by the notification image upload flow)
  - `dataJson` (Valid JSON object string containing custom FCM data; reserved Firebase keys are rejected)

### 2.2 Notification Image Upload
The admin form uploads images through the existing media flow before creating the broadcast:
1. Request a signed R2 upload URL from `POST /api/v1/media/upload-url` with `purpose: "notification"`.
2. Upload the selected PNG, JPEG, or WebP file directly to R2.
3. Confirm the upload with `POST /api/v1/media/confirm`.
4. Submit the returned `mediaId` as `imageMediaId` on `POST /api/v1/notifications/broadcasts`.

The broadcast API stores and returns a stable Cloudflare `imageUrl` without signed expiry parameters. If no image is selected, the backend uses the default system notification image.

### 2.3 Server Action Dispatches
Because the admin session cookies (`evercut_admin_session`) are protected with `HttpOnly` security, they cannot be read by browser-side JavaScript. To successfully authenticate writes, the frontend form calls a Next.js Server Action [notification.action.js](file:///c:/Users/manis/Projects/EverCut/admin/src/app/(admin)/notifications/_actions/notification.action.js):

```javascript
export async function handleCreateNotificationAction(formData) {
  // 1. Reads secure cookie in server context
  // 2. Performs schema validation
  // 3. Executes POST /api/v1/notifications/broadcasts via API client
}
```

If validation fails, the Server Action returns structured field errors that are mapped and fed back directly into the React Hook Form `NotificationForm.js` for validation display.
Once created, the broadcast is immediately resolved and dispatched asynchronously in the background. The server returns a 201 Created response immediately, and the admin is routed to `/notifications/:notificationId` (admin page route) to monitor live delivery success, failure, and audit metrics.
