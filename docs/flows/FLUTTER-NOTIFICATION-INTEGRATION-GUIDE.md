# Flutter Notification Integration Guide

This guide explains how Flutter should consume EverCut notifications. The backend uses FCM for real-time triggers and REST for source-of-truth data.

## Setup

1. Add Firebase to the Flutter app.
2. Add platform files:
   - Android: `google-services.json`
   - iOS: `GoogleService-Info.plist`
3. Add packages:

```yaml
dependencies:
  firebase_core: ^3.0.0
  firebase_messaging: ^15.0.0
```

4. Initialize Firebase before using messaging.

```dart
await Firebase.initializeApp();
FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
```

## Token Registration

Register the token after login and whenever Firebase refreshes it.

```dart
Future<void> registerFcmToken(String accessToken) async {
  final messaging = FirebaseMessaging.instance;
  await messaging.requestPermission();

  final token = await messaging.getToken();
  if (token == null) return;

  await api.post(
    '/notifications/tokens',
    bearerToken: accessToken,
    body: {
      'token': token,
      'platform': Platform.isIOS ? 'ios' : 'android',
      'deviceId': await deviceId(),
      'appVersion': await appVersion(),
    },
  );

  FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
    await api.post(
      '/notifications/tokens',
      bearerToken: accessToken,
      body: {
        'token': newToken,
        'platform': Platform.isIOS ? 'ios' : 'android',
        'deviceId': await deviceId(),
        'appVersion': await appVersion(),
      },
    );
  });
}
```

On logout:

```dart
await api.delete(
  '/notifications/tokens/$token',
  bearerToken: accessToken,
);
```

## Foreground Handling

`onMessage` fires when the app is open. Do not trust FCM as complete state. Fetch REST data.

```dart
FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
  final data = message.data;
  await notificationStore.refreshUnreadCount();
  await notificationStore.refreshFirstPage();

  if (data['requiresFetch'] == 'true') {
    await domainStore.refreshEntity(
      data['entityType'],
      data['entityId'],
    );
  }

  // Optionally show a local notification for hybrid/push messages.
});
```

## Background Tap Handling

`onMessageOpenedApp` fires when the user taps a notification from background.

```dart
FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) async {
  await notificationStore.refreshFirstPage();
  await routeFromNotificationData(message.data);
});
```

Routing rule:

```dart
Future<void> routeFromNotificationData(Map<String, dynamic> data) async {
  switch (data['entityType']) {
    case 'booking':
      router.go('/bookings/${data['entityId']}');
      break;
    case 'rating':
      router.go('/ratings');
      break;
    case 'payout':
      router.go('/earnings');
      break;
    default:
      router.go('/notifications');
  }
}
```

## Terminated State Handling

Call `getInitialMessage` after app bootstrap.

```dart
final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
if (initialMessage != null) {
  await notificationStore.refreshFirstPage();
  await routeFromNotificationData(initialMessage.data);
}
```

## Background Message Handler

The background handler must be a top-level function.

```dart
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();

  final data = message.data;
  // Keep work short. Store a lightweight flag and refresh from REST on next app open.
  await localNotificationCache.markSyncRequired(data['eventType']);
}
```

## Payload Contract

Every FCM data payload includes string values:

```json
{
  "id": "<notification id>",
  "type": "hybrid",
  "eventType": "booking.confirmed",
  "entityType": "booking",
  "entityId": "<bookingId>",
  "bookingId": "<bookingId>",
  "requiresFetch": "true"
}
```

Use `id` to correlate with `/notifications/inbox`. Use `entityType/entityId` to fetch domain state.

## REST APIs

```text
POST   /api/v1/notifications/tokens
DELETE /api/v1/notifications/tokens/:token
GET    /api/v1/notifications/inbox
GET    /api/v1/notifications/inbox/unread-count
GET    /api/v1/notifications/inbox/:id
PATCH  /api/v1/notifications/inbox/:id
PATCH  /api/v1/notifications/inbox
```

## Client Rules

- Always call REST after FCM.
- Treat FCM as a trigger, not the source of truth.
- Register token after login and token refresh.
- Unregister token on logout.
- Support multiple devices by never deleting other device tokens.
- Show local notifications in foreground if product wants visible foreground alerts.
