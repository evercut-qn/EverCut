# Notification Operations and Troubleshooting Guide

This guide details operational checks, metrics monitoring, and recipes for resolving common push notification delivery issues.

---

## 1. Monitoring Metrics

Regularly monitor the following metrics via system logs or direct database queries:
- **Delivery Counts**: Review `successCount` and `failureCount` on the broadcast metrics.
- **Skipped Recipient Rate**: Monitor the number of `skipped` inbox notifications (usually caused by users who have no active FCM tokens registered).
- **Invalid-Token Rate**: Monitor token deactivations. A high rate of token invalidations suggests that users are uninstalling the app or clearing local cache frequently.
- **Audit Trails**: Ensure admin actions generate audit logs:
  - `notification.created` (when broadcast is drafted/created).
  - `notification.sent` (when broadcast is dispatched).
  - `delivery.completed` (if dispatcher encounters errors mid-process).

---

## 2. Troubleshooting Recipes

### Issue 1: Broadcast Sent But Recipient Did Not Receive Push
1. **Check Recipients List**: Fetch `GET /api/v1/notifications/broadcasts/:id/recipients`. Verify that the recipient's `userId` is present and their status is `sent`.
2. **Check Token Count**: If status is `sent` and `skippedReason` is `No active FCM tokens`, the user has no registered active tokens.
3. **Check Recipient Token Detail**: Fetch `GET /api/v1/notifications/broadcasts/:id/recipients` for that notification. Each recipient record contains a `tokenAttempts` array with per-device delivery outcomes, including `firebaseErrorCode` and `firebaseErrorMessage` for each failed token.
4. **Inspect Device Permissions**: Verify that the user has allowed push notifications in their device settings (iOS settings or Android App Info).
5. **Inspect Token Registration**: Verify that the user's current token is active in the database:
   ```javascript
   // Query fcmtokens collection
   db.fcmtokens.find({ userId: ObjectId("user_id"), status: "active" })
   ```

### Issue 2: Spikes in Invalid Tokens
If you see a sudden spike in token invalidations in your logs:
- **Cause A (Expected)**: Occurs after mobile app updates or releases where many users reinstall the application (expiring old registration tokens).
- **Cause B (Credentials Change)**: Check if the APNs or Android Package configurations in the Firebase Console have changed or expired.
- **Cause C (Environment Mixup)**: A test build running in development might have registered a dev token under a production Firebase configuration (or vice versa).

### Issue 3: Firebase Admin SDK Outage or Latency
FCM HTTP v1 API responses may occasionally fail due to transient network issues:
- **Transient Failures**: Recorded with codes like `messaging/server-unavailable` or `messaging/internal-error`.
- **Mitigation**: These transient failures are retried up to 2 times automatically with exponential backoff and jitter. If retries fail, the user will still see the notification in their inbox feed (`GET /api/v1/notifications/inbox`) as soon as they open the app, even if the real-time push was not delivered.

### Issue 4: Broadcasts Stuck in "Sending" Status
If a broadcast's status is permanently stuck in `sending` state:
- **Cause**: The server crashed, restarted, or went offline in the middle of dispatching a broadcast.
- **Recovery**: On next restart, the **Startup Recovery Scan** checks for broadcasts stuck in `sending` for more than 5 minutes. It automatically marks them as `failed` and logs progress details to `failureReason` (e.g., `Server restarted during dispatch. Processed 150 of 500 recipients. 350 remaining.`).
- **Resolution**: Check the logs around the recovery timestamp and reissue the broadcast to the remaining audience if necessary.

### Issue 5: Token Staleness and Weekly Cleanup
Inactive device tokens are cleaned up weekly:
- **Operation**: The stale token cleanup job removes FCM tokens that haven't registered or received a successful delivery for over 90 days.
- **Verification**: Check server logs for `[CleanupStaleTokens]` statements, indicating the number of cleaned tokens.
