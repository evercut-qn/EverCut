# Manual Payout Postman Testing Guide

> Last updated: May 26, 2026
> Scope: End-to-end API testing for manual payouts, Cashfree preservation, admin auth, and payout state safety.

---

## 1. What You Will Test

This guide verifies the complete payout flow with only:

- The generated Postman collections in `server/postman-collections/`
- The active Postman environment file `server/postman-collections/EverCut.postman_environment.json`
- The local EverCut backend setup

Manual payout mode means:

- Customer payment collection still uses PhonePe.
- Barber disbursement is recorded manually by an admin.
- Cashfree automatic batch and poller jobs self-skip while `config.payout.mode` is `manual`.
- Cashfree webhook and retry logic remain available for existing or future automatic payouts.

---

## 2. Required Local Setup

From the repository root:

```powershell
cd server
npm install
```

Start MongoDB locally or point `MONGODB_URI` to a test database.

Start the API:

```powershell
npm run dev
```

Default local API base URL:

```text
http://localhost:5000/api/v1
```

---

## 3. Required `.env` Configuration

Create or update `server/.env`. Use `server/.env.example` as the base.

Minimum local variables required by config:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/evercut-manual-payout-test

JWT_ACCESS_SECRET=replace-with-long-access-secret
JWT_REFRESH_SECRET=replace-with-long-refresh-secret
JWT_ONBOARDING_SECRET=replace-with-long-onboarding-secret

MSG91_AUTH_KEY=test-msg91-key
MSG91_OTP_TEMPLATE_ID=test-template

FIREBASE_PROJECT_ID=evercut-test
FIREBASE_CLIENT_EMAIL=firebase@example.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----"

CF_ACCOUNT_ID=test-account
R2_ACCESS_KEY_ID=test-access-key
R2_SECRET_ACCESS_KEY=test-secret-key
R2_BUCKET=evercut-media-test
CDN_BASE_URL=https://media.evercut.test
MEDIA_TOKEN_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

RAZORPAY_ENV=SANDBOX
RAZORPAY_KEY_ID=rzp_test_key
RAZORPAY_KEY_SECRET=test-razorpay-secret

PHONEPE_ENV=SANDBOX
CASHFREE_PAYOUT_ENV=SANDBOX
```

Notes:

- In non-production, MSG91 OTP test mode is enabled by config and the OTP is `123456`.
- Manual payout mode is currently a code-level config constant: `server/src/config/index.js` has `payout.mode: 'manual'`.
- There is no `PAYOUT_MODE` environment variable yet. This is intentional to keep rollout explicit.

---

## 4. Database Preparation

Use a disposable database for payout tests:

```powershell
mongosh "mongodb://localhost:27017/evercut-manual-payout-test"
```

Optional reset:

```javascript
db.bookings.deleteMany({});
db.paymenttransactions.deleteMany({});
db.payouttransactions.deleteMany({});
db.users.deleteMany({ phoneNumber: { $in: ["+919876543210", "+919876543211", "+919876543212"] } });
db.customers.deleteMany({});
db.barbers.deleteMany({});
db.shops.deleteMany({});
```

Then restart the API so in-memory OTP/rate-limit state is clean.

---

## 5. Create the Admin User

From `server/`:

```powershell
node scripts/create-admin-user.mjs --phone 9876543212 --email admin@example.com
```

Expected output:

```text
Admin user created
```

or:

```text
Admin user updated
```

The script creates or updates a `User` record with:

- `roleType: "ADMIN"`
- `isActive: true`
- normalized Indian phone format such as `+919876543212`

---

## 6. Import Postman Assets

In Postman:

1. Import all JSON files from `server/postman-collections/`.
2. Import `server/postman-collections/EverCut.postman_environment.json`.
3. Select the imported `EverCut` environment.
4. Confirm these variables:

| Variable | Value |
|---|---|
| `base_url` | `http://localhost:5000` |
| `api_prefix` | `api/v1` |
| `test_customer_mobile` | `9876543210` |
| `test_barber_mobile` | `9876543211` |
| `test_admin_mobile` | `9876543212` |
| `test_otp` | `123456` |

---

## 7. Authentication Flow

Run `01-authentication.json` in this order:

1. `1. Send Customer OTP`
2. `2. Verify Customer OTP`
3. `3. Send Barber OTP`
4. `4. Verify Barber OTP`
5. `5. Send Admin OTP`
6. `6. Verify Admin OTP`

Expected admin verify response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "isNewUser": false,
    "tokenType": "Bearer",
    "accessToken": "...",
    "refreshToken": "...",
    "user": {
      "roleType": "ADMIN"
    }
  }
}
```

Postman automatically stores:

- `customer_access_token`
- `barber_access_token`
- `admin_access_token`
- refresh tokens for each role

Use refresh requests `7`, `8`, and `9` if a token expires.

---

## 8. Required Headers

For admin payout requests:

```text
Authorization: Bearer {{admin_access_token}}
Content-Type: application/json
```

Postman collections already set these headers.

---

## 9. Test Data Preparation

Manual payout requires at least one booking that satisfies all of these:

- Booking `status` is `completed` or `no-show`
- Booking `paymentStatus` is `success`
- Booking `payoutStatus` is `not_initiated`, `failed`, or `reversed`
- Booking belongs to the target barber shop
- Payment transaction exists with `status: "completed"` and `settlement.settled` not true

Recommended API preparation:

1. Run `02-onboarding.json` for customer and barber if the auth response returned onboarding tokens.
2. Run booking discovery collections to capture `shop_id`, `employee_id`, and `service_id`.
3. Run `04-customer-bookings.json` to create a booking.
4. Run `15-payments-payouts.json` requests `1`, `2`, and `3` to create and verify payment.
5. Mark the booking completed through the barber booking status request in `10-barber-bookings.json`.

If a payment provider sandbox is not available, use the DB-only fallback below in a disposable database.

DB-only fallback after creating customer, barber, shop, and booking:

```javascript
const booking = db.bookings.findOne({ paymentStatus: "success" });
db.bookings.updateOne(
  { _id: booking._id },
  {
    $set: {
      status: "completed",
      paymentStatus: "success",
      payoutStatus: "not_initiated"
    }
  }
);

db.paymenttransactions.updateOne(
  { bookingId: booking._id },
  {
    $set: {
      status: "completed",
      "settlement.settled": false,
      "settlement.barberPayout": 9900,
      "settlement.serviceAmount": 9900
    }
  },
  { upsert: false }
);
```

---

## 10. Main Manual Payout Walkthrough

Run `15-payments-payouts.json` in this order:

1. `6. List Pending Manual Payouts`
2. `7. Create Manual Payout`
3. `8. List Manual Payout History`
4. `9. Get Payout Detail`

Request `6` captures:

- `manual_payout_barber_id`
- `manual_payout_booking_ids_json`

Request `7` generates a unique UTR unless you manually set `manual_payout_utr`.

---

## 11. Create Manual Payout Payload

```json
{
  "barberId": "{{manual_payout_barber_id}}",
  "bookingIds": {{manual_payout_booking_ids_json}},
  "utr": "{{manual_payout_utr}}",
  "transferMode": "upi",
  "notes": "Recorded through Postman manual payout flow"
}
```

Expected success:

```json
{
  "success": true,
  "message": "Payout created successfully",
  "data": {
    "gateway": "manual",
    "status": "SUCCESS",
    "utr": "POSTMANUTR1779801453601",
    "completedByAdminId": "...",
    "lastStatusUpdatedByAdminId": "..."
  }
}
```

---

## 12. Pending Payout Pagination and Filters

Examples:

```text
GET /api/v1/payouts/pending?page=1&limit=20
GET /api/v1/payouts/pending?search=Urban&page=1&limit=10
```

Expected pagination metadata:

```json
{
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalDocuments": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

## 13. Payout History Filters

Examples:

```text
GET /api/v1/payouts?gateway=manual&page=1&limit=20
GET /api/v1/payouts?status=SUCCESS&gateway=manual
GET /api/v1/payouts?barberId={{manual_payout_barber_id}}
GET /api/v1/payouts?startDate=2026-05-01&endDate=2026-05-26
GET /api/v1/payouts?sort=amount:desc
```

Avoid duplicate list APIs. Use query parameters on `GET /payouts`.

---

## 14. Manual Failure and Retry Flow

To test correction:

1. Create a manual payout.
2. Run `10. Mark Manual Payout Failed (Terminal)`.
3. Run `6. List Pending Manual Payouts` again.
4. Confirm the same booking group appears again.
5. Set a new `manual_payout_utr`.
6. Run `7. Create Manual Payout` again.

PATCH payload:

```json
{
  "status": "FAILED",
  "reason": "Postman failure correction test",
  "notes": "This reopens the booking payout status for retry"
}
```

Expected response:

```json
{
  "success": true,
  "message": "Payout updated",
  "data": {
    "gateway": "manual",
    "status": "FAILED",
    "failureReason": "Postman failure correction test"
  }
}
```

---

## 15. State Transition Checks

Valid manual workflow:

| Step | PayoutTransaction | Booking | Payment |
|---|---|---|---|
| Before payout | none | `payoutStatus=not_initiated` | `settlement.settled=false` |
| During claim | pending create | `payoutStatus=initiated` | unchanged |
| After create | `gateway=manual`, `status=SUCCESS` | `payoutStatus=completed`, `barberUtr=UTR` | `settlement.settled=true` |
| Manual failure correction | `status=FAILED` | `payoutStatus=failed`, `barberUtr=null` | `settlement.settled=false` |
| Retry manual payout | new manual payout `SUCCESS` | `payoutStatus=completed` | `settlement.settled=true` |

Invalid manual workflow:

- Cashfree payout cannot be marked failed through `PATCH /payouts/:id`.
- Manual payout cannot transition from `REVERSED` through this endpoint.
- `POST /payouts` cannot reuse settled payments.

---

## 16. Authorization Tests

Run these manually by switching tokens:

| Test | Token | Endpoint | Expected |
|---|---|---|---|
| Missing token | none | `GET /payouts/pending` | `401` |
| Customer token | `customer_access_token` | `GET /payouts/pending` | `403` |
| Barber token | `barber_access_token` | `POST /payouts` | `403` |
| Admin token | `admin_access_token` | all payout admin endpoints | `200` or `201` |

Expected forbidden response:

```json
{
  "success": false,
  "message": "Access denied. Required role(s): ADMIN",
  "data": {}
}
```

---

## 17. Invalid Request Tests

Use `POST /api/v1/payouts`:

| Payload Change | Expected |
|---|---|
| `bookingIds: []` | `400` validation error |
| duplicate booking id in `bookingIds` | `400` validation error |
| invalid `barberId` | `400` validation error |
| nonexistent valid ObjectId barber | `404` |
| UTR with symbols, for example `UTR-123` | `400` |
| same UTR as a previous payout | `409` |
| booking for another barber | `400` |
| booking status not completed/no-show | `400` |
| payment status not success | `400` |
| already settled payment | `409` |

---

## 18. Duplicate Payout Prevention

Booking-level duplicate:

1. Run `6. List Pending Manual Payouts`.
2. Run `7. Create Manual Payout`.
3. Keep the same `manual_payout_booking_ids_json`.
4. Set a different UTR.
5. Run `7. Create Manual Payout` again.

Expected: `409 Conflict`.

UTR-level duplicate:

1. Set `manual_payout_utr` to `DUPLICATEUTR001`.
2. Create a payout.
3. Reopen or prepare another eligible booking.
4. Try another payout with the same UTR.

Expected: `409 Conflict`.

---

## 19. Concurrency Test

In Postman:

1. Open two tabs for `7. Create Manual Payout`.
2. Use the same `manual_payout_barber_id` and `manual_payout_booking_ids_json`.
3. Use different UTR values.
4. Click Send in both tabs quickly.

Expected:

- One request returns `201`.
- The other returns `409`.
- Only one `payouttransactions` document is linked to the bookings.

Runner option:

- Duplicate request `7`.
- Use a fixed booking set.
- Run both requests with very low delay.

---

## 20. Rollback and Retry Testing

Manual correction is the operational rollback path:

1. Create a manual payout.
2. Mark it failed with request `10`.
3. Verify booking payout status is `failed`.
4. Verify payment settlement is unset.
5. Create another manual payout using a new UTR.

This validates that failed manual records do not permanently block payout retry.

---

## 21. Backward Compatibility Verification

Run the automated tests:

```powershell
npm test
```

Specific payout compatibility tests:

```powershell
node --test src/services/__tests__/payout.service.test.js src/jobs/__tests__/payout-batch.cron.test.js src/jobs/__tests__/payout-poller.cron.test.js
```

Confirm:

- Existing Cashfree retry endpoint still exists: `POST /api/v1/payouts/:payoutId/retry`
- Cashfree webhook endpoint still exists: `POST /api/v1/payouts/webhook`
- Existing payout documents without `gateway` serialize as `cashfree`
- No-show bookings are accepted by the automatic payout service when auto mode is re-enabled

---

## 22. Cashfree Disable Verification

Manual mode check:

```javascript
// server/src/config/index.js
payout: Object.freeze({
  mode: 'manual',
  ...
})
```

Run:

```powershell
node --test src/jobs/__tests__/payout-batch.cron.test.js src/jobs/__tests__/payout-poller.cron.test.js
```

Expected:

- Batch job returns `skipped: true`.
- Poller does not start.
- Cashfree webhook route still processes signed webhook requests for existing Cashfree payouts.

---

## 23. Future Cashfree Re-enable Validation

For a controlled staging test only:

1. Change `payout.mode` from `manual` to `auto`.
2. Configure Cashfree sandbox credentials.
3. Prepare eligible completed/no-show, paid bookings with `payoutStatus=not_initiated`.
4. Run batch job tests with `payoutMode: 'auto'`.
5. Trigger the batch job in staging.
6. Confirm Cashfree `PENDING`, webhook `SUCCESS`, booking payout completion, and payment settlement.
7. Change `payout.mode` back to `manual` if production still requires manual payout operation.

Do not test Cashfree production re-enable without a reconciliation checklist and finance approval.

---

## 24. Audit Verification

Manual payout create logs include:

- `payoutId`
- `adminId`
- `barberId`
- `bookingCount`
- `amountInRupees`
- `utr`
- `gateway`

Database checks:

```javascript
db.payouttransactions.find(
  { gateway: "manual" },
  {
    transferId: 1,
    utr: 1,
    status: 1,
    completedByAdminId: 1,
    lastStatusUpdatedByAdminId: 1,
    adminNotes: 1,
    bookingIds: 1,
    paymentTransactionIds: 1
  }
).sort({ createdAt: -1 }).limit(5);
```

Verify linked bookings:

```javascript
db.bookings.find(
  { payoutTransactionId: ObjectId("PASTE_PAYOUT_ID") },
  { status: 1, paymentStatus: 1, payoutStatus: 1, barberUtr: 1, payoutCompletedAt: 1 }
);
```

Verify linked payments:

```javascript
db.paymenttransactions.find(
  { _id: { $in: [ObjectId("PASTE_PAYMENT_ID")] } },
  { status: 1, settlement: 1 }
);
```

---

## 25. Common Failure Responses

Duplicate UTR:

```json
{
  "success": false,
  "message": "A payout with UTR POSTMANUTR001 already exists",
  "data": {}
}
```

Stale booking claim:

```json
{
  "success": false,
  "message": "One or more bookings were modified by another admin or already have an active payout",
  "data": {}
}
```

Invalid UTR:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      {
        "field": "utr",
        "message": "UTR must contain only alphanumeric characters"
      }
    ]
  }
}
```

---

## 26. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Admin verify returns `isNewUser: true` | Admin user was not created first | Run `node scripts/create-admin-user.mjs --phone 9876543212 --email admin@example.com` |
| `GET /payouts/pending` returns empty | No eligible completed paid bookings | Prepare booking/payment data or mark test booking completed |
| `POST /payouts` returns `403` | Wrong token | Run admin OTP verify and use `admin_access_token` |
| `POST /payouts` returns duplicate UTR | Reused UTR | Clear or change `manual_payout_utr` |
| Booking IDs array is a string | Postman variable was edited incorrectly | Keep `manual_payout_booking_ids_json` as a JSON array string such as `["id1","id2"]` |
| Cashfree still appears in collection | Retry and webhook are intentionally preserved | Only automatic batch/poller skip in manual mode |
| `node scripts/create-admin-user.mjs` cannot connect | Wrong `MONGODB_URI` | Confirm `.env` is in `server/.env` and Mongo is running |

---

## 27. Collection Regeneration

After route, schema, or Postman script changes:

```powershell
cd server
node scripts/regenerate-postman-collections.mjs
```

Re-import changed collection files in Postman:

- `01-authentication.json`
- `15-payments-payouts.json`
- `EverCut.postman_environment.json`

---

## 28. Cleanup and Reset

To reset payout-specific data only:

```javascript
db.payouttransactions.deleteMany({ gateway: "manual" });
db.bookings.updateMany(
  { payoutTransactionId: { $ne: null } },
  {
    $set: {
      payoutTransactionId: null,
      payoutStatus: "not_initiated",
      payoutCompletedAt: null,
      barberUtr: null
    }
  }
);
db.paymenttransactions.updateMany(
  {},
  {
    $set: {
      "settlement.settled": false,
      "settlement.settledAt": null
    }
  }
);
```

Use only in local test databases.

---

## 29. Full Happy-Path Checklist

- API server starts on `http://localhost:5000`.
- Postman environment is selected.
- Customer OTP send/verify succeeds.
- Barber OTP send/verify succeeds.
- Admin user is created.
- Admin OTP send/verify succeeds.
- At least one eligible booking exists.
- `GET /payouts/pending` returns a barber group.
- `POST /payouts` returns `201`.
- `GET /payouts?gateway=manual` returns the new payout.
- `GET /payouts/:payoutId` returns detail.
- Database booking is `payoutStatus=completed`.
- Database payment has `settlement.settled=true`.
- Automated tests pass.

---

## 30. Full Admin Workflow Checklist

- Admin logs in with OTP.
- Admin opens pending payouts.
- Admin pays externally through UPI/bank app.
- Admin records UTR using `POST /payouts`.
- Admin reviews payout history.
- If external transfer later fails, admin marks the manual payout failed.
- Failed bookings reappear in pending payout list.
- Admin retries with a new UTR.
- Audit fields identify the completion admin and latest correction admin.

