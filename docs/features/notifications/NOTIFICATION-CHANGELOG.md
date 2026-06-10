# EverCut Notification Platform Changelog

All notable changes to the EverCut notification system are documented in this file.

## [1.0.0] - 2026-06-10

### Added
- **Asynchronous Broadcast Dispatch**: Creates broadcast templates and initiates delivery asynchronously in the background using `setImmediate`, allowing the admin create API to respond immediately (`201 Created`) and prevent HTTP timeouts.
- **FCM Retry with Exponential Backoff**: Automatically retries transient FCM failures (e.g. `messaging/server-unavailable`, `messaging/internal-error`) up to 2 times. Uses exponential backoff ($2^{\text{attempt}} \times 1000$ ms) and random jitter.
- **Startup Recovery Scan**: Scans on server startup for broadcasts stuck in the transient `sending` status for more than 5 minutes (due to an unexpected server crash) and marks them as `failed`. Records processed vs remaining recipient context in `failureReason`.
- **Weekly Stale Token Cleanup**: Automatically deletes device tokens that have been inactive (no successful registrations or successful deliveries) for over 90 days. Checked via weekly cron job.
- **Referential Linking**: Automatically links inbox notification copies to recipient tracking objects by populating `inboxNotificationId` on `NotificationRecipient` objects.
- **Last Successful Delivery Tracking**: Populates `lastSuccessfulDeliveryAt` on `FcmToken` objects upon successful multicast deliveries to prevent active tokens from being classified as stale.
- **Audit Log Client Context**: Automatically captures `ip` and `userAgent` from headers during admin broadcast events and logs them in `NotificationAuditLog`.
- **User-Centric Reporting Separation**: Separated derived user-level outcome metrics into a dedicated `reporting` block (`deliveredUsers`, `failedUsers`, `offlineUsers`) resolved at read-time via MongoDB aggregation on `GET /broadcasts/:id`, maintaining clear boundaries from persisted, device-level `metrics`.
- **Flutter Migration Guide**: Created [FLUTTER-NOTIFICATION-MIGRATION-GUIDE.md](../../flows/FLUTTER-NOTIFICATION-MIGRATION-GUIDE.md) detailing Flutter code updates required for the new API endpoint URLs.

### Changed
- **Option A RESTful API Separation**: Restructured unified `/notifications` route into resource-separated collection groups, eliminating role-branching controller code:
  - User Inbox: `GET /inbox`, `GET /inbox/unread-count`, `GET /inbox/:id`, `PATCH /inbox/:id`, `PATCH /inbox`.
  - Admin Broadcasts: `GET /broadcasts`, `POST /broadcasts`, `GET /broadcasts/:id`, `GET /broadcasts/:id/recipients`, `GET /broadcasts/:id/inbox-items`, `GET /broadcasts/:id/audits`.
  - Tokens: `POST /tokens`, `DELETE /tokens/:token` (now uses path parameter).
- **Controller Import Naming Standardization**: Standardized route controller imports to use explicit names (e.g., `import * as notificationController` instead of `import * as ctrl`) across routing files to ensure naming consistency and clear code structure.
- **Parallel Dispatch**: Processes recipient batches in parallel with a size limit of 50 to optimize database load.
- **Next.js Admin Integration**: Updated Next.js API service layer and UI components to reflect Option A routes and Toast notices for async dispatching.
- **Postman Collection Generator**: Updated `regenerate-postman-collections.mjs` to map to the new route structure.

### Removed
- **`NotificationDeliveryAttempt` Model**: Deleted the redundant schema, repository, and service hooks in favor of embedded `tokenAttempts` on `NotificationRecipient`.
- **Stale Token Configuration Centralization**: Completely removed `STALE_TOKEN_THRESHOLD_DAYS` and `STALE_TOKEN_CLEANUP_CRON` environment variables and centralized the defaults (90 days threshold, `0 3 * * 0` cleanup schedule) under the `notification` block of `server/src/config/index.js` as frozen constants.
- **Redundant index**: Removed unnecessary index on `FcmToken.token`.
- **Dead schemas and fields**: Removed unused validator `adminNotificationUpdateSchema` and unused model field `preview`.
