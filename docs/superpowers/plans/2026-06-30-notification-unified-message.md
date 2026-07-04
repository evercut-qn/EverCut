# Unified Notification Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor backend, FCM, Cloudflare media handling, admin UI, tests, and docs around one canonical notification message model.

**Architecture:** Add a focused notification message service as the single source of truth for API and FCM payload construction. Keep operational broadcast/recipient/audit storage, but expose only `{ id, title, body, imageUrl, data }` to Flutter. Use notification-specific stable Cloudflare URLs for notification images.

**Tech Stack:** Node.js ESM, Express 5, Mongoose 9, Joi, Firebase Admin SDK, Cloudflare R2, Next.js 16 App Router, React Hook Form, Zod, node:test.

---

## File Structure

- Create `server/src/services/notifications/notification-message.service.js`: canonical model, image resolution, FCM data validation, FCM payload conversion.
- Modify `server/src/services/notifications/fcm.service.js`: consume canonical payload and add image fields to platform notification blocks.
- Modify `server/src/models/notification.model.js`: add `imageUrl` to `Notification` and `InboxNotification`; keep operational metadata internal.
- Modify `server/src/serializers/notification.serializer.js`: add Flutter-facing message serializer and admin serializers with `imageUrl`.
- Modify `server/src/services/notifications/notification-domain.service.js`: build canonical messages for system notifications.
- Modify `server/src/services/notifications/notification-broadcast.service.js`: resolve admin `imageMediaId` and persist `imageUrl`.
- Modify `server/src/services/notifications/notification-dispatch.service.js`: use canonical message for inbox row creation and FCM delivery.
- Modify `server/src/validators/notification.validator.js`: accept `imageMediaId`; reuse shared reserved-key validation.
- Modify `server/src/utils/constants.js`: add `MEDIA_PURPOSE.NOTIFICATION`.
- Modify `server/src/services/media/media.service.js`: support notification purpose key paths and stable notification URL helpers.
- Create `server/scripts/seed-notification-default-image.mjs`: upload `server/assets/logo/evercut.png` to R2 and create/update system media.
- Modify `server/src/config/index.js`: add notification default image key and stable image URL TTL/config if needed.
- Modify admin notification schema/action/service/form/list/detail files for image upload and display.
- Modify tests under `server/src/**/__tests__`.
- Modify notification docs and Postman collection generator.

## Task 1: Canonical Message Tests

**Files:**
- Create: `server/src/services/__tests__/notification-message.service.test.js`
- Create: `server/src/services/notifications/notification-message.service.js`

- [ ] **Step 1: Write failing tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNotificationMessage,
  buildFcmPayload,
  normalizeNotificationData,
} from '../notifications/notification-message.service.js';

test('buildNotificationMessage returns only the canonical client fields', () => {
  const message = buildNotificationMessage({
    id: 'notification-1',
    title: 'Booking confirmed',
    body: 'Your booking is confirmed.',
    imageUrl: 'https://media.evercut.test/images/notifications/logo.png',
    data: { eventType: 'booking.confirmed', requiresFetch: true },
  });

  assert.deepEqual(message, {
    id: 'notification-1',
    title: 'Booking confirmed',
    body: 'Your booking is confirmed.',
    imageUrl: 'https://media.evercut.test/images/notifications/logo.png',
    data: { eventType: 'booking.confirmed', requiresFetch: true },
  });
});

test('normalizeNotificationData rejects reserved FCM data keys once', () => {
  assert.throws(
    () => normalizeNotificationData({ 'google.notification': 'bad' }),
    /reserved/i,
  );
});

test('buildFcmPayload keeps typed API data but stringifies FCM data values', () => {
  const payload = buildFcmPayload({
    id: 'notification-1',
    title: 'Title',
    body: 'Body',
    imageUrl: 'https://media.evercut.test/images/notifications/logo.png',
    data: { requiresFetch: true, count: 2 },
  });

  assert.equal(payload.message.id, 'notification-1');
  assert.equal(payload.message.imageUrl, 'https://media.evercut.test/images/notifications/logo.png');
  assert.deepEqual(payload.fcmData, {
    id: 'notification-1',
    imageUrl: 'https://media.evercut.test/images/notifications/logo.png',
    requiresFetch: 'true',
    count: '2',
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `node --test src/services/__tests__/notification-message.service.test.js`

Expected: FAIL because `notification-message.service.js` does not exist.

- [ ] **Step 3: Implement the service**

Implement:

```js
const RESERVED_FCM_DATA_KEY_PREFIXES = ['google.', 'gcm.', 'gcm.notification.'];

const isReservedFcmKey = (key) => RESERVED_FCM_DATA_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
const compact = (value) => Object.fromEntries(Object.entries(value).filter(([, nested]) => nested !== undefined));

export const normalizeNotificationData = (data = {}) => {
  const output = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (isReservedFcmKey(key)) throw new Error(`FCM data key "${key}" uses a reserved prefix`);
    if (value !== undefined) output[key] = value;
  }
  return output;
};

export const toFcmDataValue = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

export const normalizeFcmData = (data = {}) => Object.fromEntries(
  Object.entries(normalizeNotificationData(data))
    .map(([key, value]) => [key, toFcmDataValue(value)])
    .filter(([, value]) => value !== null),
);

export const buildNotificationMessage = ({ id = null, title = null, body = null, imageUrl = null, data = {} } = {}) => compact({
  id: id ? String(id) : null,
  title,
  body,
  imageUrl: imageUrl || null,
  data: normalizeNotificationData(data),
});

export const buildFcmPayload = (input = {}) => {
  const message = buildNotificationMessage(input);
  return {
    message,
    fcmData: normalizeFcmData({
      id: message.id,
      imageUrl: message.imageUrl,
      ...message.data,
    }),
  };
};
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `node --test src/services/__tests__/notification-message.service.test.js`

Expected: PASS.

## Task 2: Media And Stable Notification Image URLs

**Files:**
- Modify: `server/src/utils/constants.js`
- Modify: `server/src/config/index.js`
- Modify: `server/src/services/media/media-url.service.js`
- Modify: `server/src/services/media/media.service.js`
- Modify: `server/src/validators/media.validator.js`
- Create: `server/scripts/seed-notification-default-image.mjs`
- Modify tests: media validators/service tests as needed

- [ ] **Step 1: Write failing tests**

Add tests that assert:

```js
assert.equal(MEDIA_PURPOSE.NOTIFICATION, 'notification');
assert.equal(buildNotificationMediaUrl('images/notifications/evercut.png'), 'https://media.evercut.test/images/notifications/evercut.png');
```

Also assert `uploadUrlSchema` accepts `{ purpose: 'notification', contentType: 'image/png', sizeBytes: 1024 }`.

- [ ] **Step 2: Implement constants/config/url helpers**

Add `NOTIFICATION: 'notification'` to `MEDIA_PURPOSE`.

Add notification config:

```js
notification: Object.freeze({
  staleTokenThresholdDays: 90,
  staleTokenCleanupCron: '0 3 * * 0',
  defaultImageR2Key: optionalEnv('NOTIFICATION_DEFAULT_IMAGE_R2_KEY', 'images/notifications/system/evercut.png'),
})
```

Add `buildStableMediaUrl(r2Key)` to `media-url.service.js`; it returns `${CDN_BASE_URL}/{r2Key}` without `exp` or `token`.

- [ ] **Step 3: Update media key generation**

In `buildR2Key`, add:

```js
[MEDIA_PURPOSE.NOTIFICATION]: `images/notifications/${safeContext}/${mediaId}.${extension}`,
```

Ensure notification image uploads bypass barber gallery quota because entitlement middleware already skips non-gallery purposes.

- [ ] **Step 4: Add default image seed script**

Script behavior:

```bash
node scripts/seed-notification-default-image.mjs
node scripts/seed-notification-default-image.mjs --write
node scripts/seed-notification-default-image.mjs --write --force
```

The script uploads `assets/logo/evercut.png` to `config.notification.defaultImageR2Key`, then upserts a system `Media` document with purpose `notification`, status `ready`, and `userId: "system"`.

- [ ] **Step 5: Run media tests**

Run: `node --test src/services/media/__tests__/*.test.js src/validators/__tests__/notification.validator.test.js`

Expected: PASS after updates.

## Task 3: Models And Serializers

**Files:**
- Modify: `server/src/models/notification.model.js`
- Modify: `server/src/serializers/notification.serializer.js`
- Modify tests: `server/src/models/__tests__/notification-platform.model.test.js`, `server/src/services/__tests__/notification.service.test.js`

- [ ] **Step 1: Write failing tests**

Assert `InboxNotification` and `Notification` accept `imageUrl`.

Assert `serializeInboxNotification()` returns:

```js
{
  id: 'notification-1',
  title: 'Title',
  body: 'Body',
  imageUrl: 'https://media.evercut.test/images/notifications/system/evercut.png',
  data: { eventType: 'system.alert' }
}
```

Assert it does not return `type`, `category`, `eventType`, `entityType`, `entityId`, `status`, or `delivery`.

- [ ] **Step 2: Add schema fields**

Add `imageUrl` to `Notification` and `InboxNotification` with trim, max length 2048, default null.

- [ ] **Step 3: Update serializers**

Make `serializeInboxNotification()` return only canonical Flutter fields.

Make `serializeNotification()` include `imageUrl` for admin broadcast list/detail while keeping operational admin fields.

- [ ] **Step 4: Run serializer/model tests**

Run: `node --test src/models/__tests__/notification-platform.model.test.js src/services/__tests__/notification.service.test.js`

Expected: PASS.

## Task 4: FCM Builder Uses Canonical Messages

**Files:**
- Modify: `server/src/services/notifications/fcm.service.js`
- Modify tests: `server/src/services/__tests__/fcm.service.test.js`

- [ ] **Step 1: Write failing tests**

Add a visible notification test that expects:

```js
assert.equal(message.notification.imageUrl, imageUrl);
assert.equal(message.android.notification.imageUrl, imageUrl);
assert.equal(message.apns.fcmOptions.imageUrl, imageUrl);
assert.equal(message.webpush.notification.image, imageUrl);
assert.equal(message.data.imageUrl, imageUrl);
```

- [ ] **Step 2: Update FCM builder**

Import canonical `normalizeFcmData` or `buildFcmPayload`. Remove duplicate reserved-key logic from `fcm.service.js`.

Set notification image fields only when `imageUrl` is present.

- [ ] **Step 3: Run FCM tests**

Run: `node --test src/services/__tests__/fcm.service.test.js`

Expected: PASS.

## Task 5: System Notification Flow

**Files:**
- Modify: `server/src/services/notifications/notification-domain.service.js`
- Modify: `server/src/services/notifications/notification-events.service.js` only where needed
- Modify tests: `server/src/services/__tests__/notification.service.test.js`, `server/src/services/__tests__/notification-events.service.test.js`

- [ ] **Step 1: Write failing tests**

Assert `notifyUser()` persists `imageUrl` and sends the same `imageUrl` to FCM.

Assert a notification with no explicit image gets the default notification image.

- [ ] **Step 2: Implement default image resolution**

Add a helper in `notification-message.service.js` that resolves:

1. explicit `imageUrl`
2. explicit `imageMediaId` to stable media URL
3. default notification image stable URL

The default behavior lives in one place and is called by `notifyUser()`.

- [ ] **Step 3: Move routing fields into `data`**

When `notifyUser()` receives `eventType`, `entityType`, or `entityId`, merge them into `data` before building the canonical message.

- [ ] **Step 4: Run system notification tests**

Run: `node --test src/services/__tests__/notification.service.test.js src/services/__tests__/notification-events.service.test.js`

Expected: PASS.

## Task 6: Admin Broadcast Flow

**Files:**
- Modify: `server/src/validators/notification.validator.js`
- Modify: `server/src/services/notifications/notification-broadcast.service.js`
- Modify: `server/src/services/notifications/notification-dispatch.service.js`
- Modify tests: `server/src/validators/__tests__/notification.validator.test.js`, `server/src/services/__tests__/notification-platform.service.test.js`

- [ ] **Step 1: Write failing tests**

Assert admin create schema accepts `imageMediaId`.

Assert broadcast creation resolves and persists `imageUrl`.

Assert dispatch creates inbox rows with identical canonical `title`, `body`, `imageUrl`, and `data`, then sends identical FCM payload.

- [ ] **Step 2: Implement admin image resolution**

In broadcast creation, resolve `body.imageMediaId` through media service/repository, require `READY` image media, and convert to stable notification URL.

- [ ] **Step 3: Update dispatch**

Use the canonical message module to build each inbox row and FCM payload. Keep recipient metrics and token attempts unchanged.

- [ ] **Step 4: Run broadcast tests**

Run: `node --test src/services/__tests__/notification-platform.service.test.js src/validators/__tests__/notification.validator.test.js`

Expected: PASS.

## Task 7: Admin App Image Upload And Display

**Files:**
- Create: `admin/src/lib/services/media.service.js`
- Modify: `admin/src/lib/schemas/notification.schema.js`
- Modify: `admin/src/app/(admin)/notifications/_actions/notification.action.js`
- Modify: `admin/src/app/(admin)/notifications/_components/NotificationForm.js`
- Modify: `admin/src/app/(admin)/notifications/page.js`
- Modify: `admin/src/app/(admin)/notifications/[notificationId]/page.js`
- Modify: `admin/next.config.mjs` if `next/image` is used for remote Cloudflare images

- [ ] **Step 1: Add media service helpers**

Implement:

```js
export function requestMediaUploadUrl(payload, { token } = {}) {
  return apiFetch('/media/upload-url', { method: 'POST', body: payload, token });
}

export function confirmMediaUpload(mediaId, { token } = {}) {
  return apiFetch('/media/confirm', { method: 'POST', body: { mediaId }, token });
}
```

- [ ] **Step 2: Add schema field**

Add optional `imageMediaId` to `notificationFormSchema` and include it in `toNotificationPayload()`.

- [ ] **Step 3: Add client upload flow**

In `NotificationForm`, use a file input accepting `image/jpeg,image/png,image/webp`. On file selection, call a server action that obtains a presigned URL, PUTs the file to R2 from the browser, confirms the upload, stores `imageMediaId`, and displays a preview.

- [ ] **Step 4: Display images**

Show thumbnails in list and detail pages when `notification.imageUrl` exists. Use normal `img` unless `next/image` remote config is needed.

- [ ] **Step 5: Build admin**

Run: `npm run lint && npm run build`

Expected: PASS.

## Task 8: Docs And Postman

**Files:**
- Modify: `docs/features/notifications/README.md`
- Modify: `docs/features/notifications/BACKEND-DEVELOPER-GUIDE.md`
- Modify: `docs/features/notifications/CLIENT-INTEGRATION-GUIDE.md`
- Modify: `docs/features/notifications/OPERATIONS-AND-TROUBLESHOOTING-GUIDE.md`
- Modify: `docs/flows/FLUTTER-NOTIFICATION-INTEGRATION-GUIDE.md`
- Modify: `docs/flows/FLUTTER-NOTIFICATION-MIGRATION-GUIDE.md`
- Modify: `docs/testing/NOTIFICATION-SYSTEM-POSTMAN-GUIDE.md`
- Modify: `docs/reports/NOTIFICATION-SYSTEM-REPORT.md`
- Modify: `server/scripts/regenerate-postman-collections.mjs`
- Regenerate: `server/postman-collections/17-notifications.json`
- Modify: `server/scripts/README.md`

- [ ] **Step 1: Update docs to canonical model**

Replace old public payload examples with:

```dart
class NotificationMessage {
  final String? id;
  final String? title;
  final String? body;
  final String? imageUrl;
  final Map<String, dynamic> data;
}
```

Document that routing fields are in `data`.

- [ ] **Step 2: Update Postman generator**

Add `imageMediaId` to admin broadcast examples and assertions for `imageUrl` in notification DTOs.

- [ ] **Step 3: Regenerate collection**

Run: `node scripts/regenerate-postman-collections.mjs`

Expected: `server/postman-collections/17-notifications.json` updates cleanly.

## Task 9: Full Verification

**Files:**
- All changed files

- [ ] **Step 1: Run notification backend tests**

Run:

```bash
node --test "src/services/__tests__/notification*.test.js" "src/services/__tests__/fcm.service.test.js" "src/repositories/__tests__/notification-platform.repository.test.js" "src/models/__tests__/notification-platform.model.test.js" "src/validators/__tests__/notification.validator.test.js" "src/jobs/__tests__/startup-recovery.job.test.js" "src/jobs/__tests__/cleanup-stale-tokens.cron.test.js"
```

Expected: PASS.

- [ ] **Step 2: Run all backend tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run admin verification**

Run in `admin/`:

```bash
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 4: Review for duplicate message logic**

Run:

```bash
rg -n "eventType:|entityType:|entityId:|imageUrl|normalizeFcmData|reserved prefix|notification\\.image|webpush\\.notification|apns\\.fcmOptions" server/src admin/src docs/features/notifications docs/flows docs/testing
```

Expected: `imageUrl` appears in canonical/build/display/docs locations. FCM reserved key logic appears only in the canonical message service and tests. Flutter-facing docs do not show top-level `eventType`, `entityType`, or `entityId`.
