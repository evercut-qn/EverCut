# Payment Gateway API Testing Guide

This guide explains how to run, test, and troubleshoot the EverCut payment and payout system without guessing. It matches the current backend implementation in `server/src`.

After the 2026-04-24 routing migration, all API examples in this guide follow the feature-based route layout:

- `/api/v1/customers/me`
- `/api/v1/shops/*`
- `/api/v1/employees/*`
- `/api/v1/services/*`
- `/api/v1/bookings/*`
- `/api/v1/ratings/*`
- `/api/v1/earnings`
- `/api/v1/payments/*`
- `/api/v1/payouts/*`

## 1. Setup Instructions

### 1.1 Install Dependencies

Run from the backend folder:

```powershell
cd server
npm install
```

### 1.2 Configure `.env`

Start from the example file:

```powershell
Copy-Item .env.example .env
```

Fill the required values in `.env`.

For local smoke tests that do not call external providers, PhonePe and Cashfree credential values can stay blank because non-production config uses safe test fallbacks. For real sandbox or production integration tests, fill the real provider credentials.

### 1.3 Required Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `NODE_ENV` | Yes | Runtime mode. Use `development`, `test`, or `production`. |
| `PORT` | Yes | API port. Existing Postman environment uses `5000`. |
| `LOG_LEVEL` | No | Logger threshold. Defaults to debug behavior when unset. |
| `ALLOWED_ORIGINS` | Production | Comma-separated CORS allowlist used only when `NODE_ENV=production`. |
| `MONGODB_URI` | Yes | MongoDB connection string. Never log or commit credentials. |
| `JWT_ACCESS_SECRET` | Yes | Secret used to sign access JWTs. |
| `JWT_REFRESH_SECRET` | Yes | Secret used to sign refresh JWTs. |
| `JWT_ACCESS_EXPIRY` | No | Access token expiry. Default is `15m`. |
| `JWT_REFRESH_EXPIRY` | No | Refresh token expiry. Default is `180d`. |
| `FIREBASE_PROJECT_ID` | Yes | Firebase Admin SDK project ID. |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service-account client email. |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase service-account private key with literal `\n` line breaks. |
| `FIREBASE_API_KEY` | Script only | Used by `server/scripts/firebase-token-gen.js`; not required by API startup. |
| `MSG91_AUTH_KEY` | Yes | MSG91 auth key for OTP/SMS. |
| `MSG91_OTP_TEMPLATE_ID` | Yes | MSG91 OTP template ID. |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary upload account name. |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret. |
| `PHONEPE_ENV` | Yes | `SANDBOX` or `PRODUCTION`; controls PhonePe base URL. |
| `PHONEPE_CLIENT_ID` | Production/provider tests | PhonePe OAuth client ID. Required in production. |
| `PHONEPE_CLIENT_SECRET` | Production/provider tests | PhonePe OAuth client secret. Required in production. |
| `PHONEPE_CLIENT_VERSION` | Yes | PhonePe client version. Use `1` unless PhonePe issues another value. |
| `PHONEPE_MERCHANT_ID` | Production/provider tests | PhonePe merchant ID. Required in production. |
| `PHONEPE_WEBHOOK_USERNAME` | Production/provider tests | Username configured in PhonePe webhook security. |
| `PHONEPE_WEBHOOK_PASSWORD` | Production/provider tests | Password configured in PhonePe webhook security. |
| ~~`PAYMENT_REDIRECT_BASE_URL`~~ | ~~Deprecated~~ | ~~Old web redirect flow only~~ |
| `CASHFREE_PAYOUT_ENV` | Yes | `TEST` or `PRODUCTION`; controls Cashfree payout base URL. |
| `CASHFREE_PAYOUT_CLIENT_ID` | Production/provider tests | Cashfree Payouts client ID. Required in production. |
| `CASHFREE_PAYOUT_CLIENT_SECRET` | Production/provider tests | Cashfree Payouts client secret and webhook HMAC secret. Required in production. |

### 1.4 Run the Server

```powershell
npm run dev
```

The API base URL for local Postman testing is:

```text
http://localhost:5000/api/v1
```

If you change `PORT`, also update `base_url` in `server/postman-collections/EverCut.postman_environment.json`.

## 2. Postman Setup

### 2.1 Import Files

Import these files into Postman:

```text
server/postman-collections/EverCut.postman_environment.json
server/postman-collections/01-authentication.json
server/postman-collections/02-onboarding.json
server/postman-collections/04-customer-bookings.json
server/postman-collections/10-barber-bookings.json
server/postman-collections/14-payments-payouts.json
```

Import the other existing collections if you need to create shops, employees, or services from scratch.

### 2.2 Configure Postman Environment Variables

Use the `EverCut Local` environment and verify these values:

| Postman variable | Value or source |
|---|---|
| `base_url` | `http://localhost:5000` |
| `api_prefix` | `api/v1` |
| `customer_access_token` | Auto-captured by auth/onboarding collections |
| `barber_access_token` | Auto-captured by auth/onboarding collections |
| `admin_access_token` | Manual ADMIN JWT; required only for payout retry |
| `payment_booking_id` | Booking ID to pay for; copied from `shared_booking_id` if available |
| `payment_id` | Auto-captured by `14-payments-payouts` request 1 |
| `merchant_order_id` | Auto-captured by `14-payments-payouts` request 1 |
| `merchant_refund_id` | Auto-captured by refund request |
| `refund_id` | Auto-captured by refund request |
| `payout_id` | Manual payout transaction `_id` from MongoDB |
| `payout_transfer_id` | Manual payout transaction `transferId` from MongoDB |
| `gateway_transfer_id` | Provider transfer ID for Cashfree webhook samples |
| `phonepe_webhook_username` | Match `PHONEPE_WEBHOOK_USERNAME`; local default is `test-phonepe-webhook-user` |
| `phonepe_webhook_password` | Match `PHONEPE_WEBHOOK_PASSWORD`; local default is `test-phonepe-webhook-password` |
| `cashfree_webhook_secret` | Match `CASHFREE_PAYOUT_CLIENT_SECRET`; local default is `test-cashfree-client-secret` |

The collection generates PhonePe and Cashfree webhook signatures automatically.

## 3. End-to-End API Testing Flow

### 3.1 Authenticate Test Users

Run:

1. `01-authentication.json` -> `Send Barber OTP`
2. `01-authentication.json` -> `Verify Barber OTP`
3. `02-onboarding.json` -> `Complete Barber Profile` if the barber is new
4. `01-authentication.json` -> `Send Customer OTP`
5. `01-authentication.json` -> `Verify Customer OTP`
6. `02-onboarding.json` -> `Complete Customer` if the customer is new

Local OTP is `123456` because MSG91 test mode is enabled when `NODE_ENV` is not `production`.

### 3.2 Create Bookable Data

Run the barber collections in order when the database has no shop data:

1. `07-barber-profile-shop.json`
2. `08-barber-employees.json`
3. `09-barber-services.json`

Then run `04-customer-bookings.json` request `Create a booking`.

Expected booking behavior:

```json
{
  "paymentRequired": true,
  "booking": {
    "status": "pending",
    "paymentStatus": "pending",
    "payoutStatus": "not_initiated"
  }
}
```

Set `payment_booking_id` to the created booking ID if it was not auto-copied from `shared_booking_id`.

### 3.3 Create Payment

Run `14-payments-payouts.json` -> `1. Initiate Payment`.

Request:

```http
POST /api/v1/payments
Authorization: Bearer {{customer_access_token}}
Content-Type: application/json
```

```json
{
  "bookingId": "{{payment_booking_id}}"
}
```

Expected result (Native SDK):

```json
{
  "success": true,
  "message": "Payment initiated",
  "data": {
    "paymentId": "65f1e7a125d0dc001f2a2001",
    "bookingId": "booking_id",
    "merchantOrderId": "EC-...",
    "orderId": "OMO123456789",
    "token": "eyJhbGci...",
    "merchantId": "MERCHANT_ID",
    "amountInPaisa": 30300,
    "amountInRupees": 303,
    "state": "PENDING",
    "expiresAt": 1234567890000,
    "gateway": "phonepe",
    "paymentFlow": "PHONEPE_SDK"
  }
}
```

**Note:** Response includes `orderId`, `token`, `merchantId` for Flutter SDK launch (NO `redirectUrl`).

The collection captures `payment_id` and `merchant_order_id`.

### 3.4 Verify Payment Status

Run `14-payments-payouts.json` -> `2. Verify Payment`.

**Note:** In production, Flutter calls this after PhonePe SDK callback. For backend testing, simulate SDK callback:

Request:

```http
POST /api/v1/payments/:paymentId/verify
Authorization: Bearer {{customer_access_token}}
Content-Type: application/json
```

```json
{
  "sdkStatus": "SUCCESS",
  "sdkResponseCode": "PAYMENT_SUCCESS",
  "sdkMessage": "Payment completed successfully"
}
```

Backend action: Polls PhonePe Order Status API to verify actual payment state.

Expected statuses:

| Status | Meaning |
|---|---|
| `initiated` | Transaction created before PhonePe order response. |
| `pending` | Checkout created; waiting for customer/webhook/poller. |
| `completed` | Payment succeeded and booking is confirmed. |
| `failed` | Payment failed. |
| `expired` | Pending payment expired. |
| `refund_pending` | Refund request submitted to PhonePe. |
| `refunded` | Refund completed. |
| `refund_failed` | Refund failed. |

### 3.5 Simulate Successful Payment Webhook

Run `14-payments-payouts.json` -> `7. PhonePe Payment Success Webhook`.

The collection computes:

```text
Authorization = SHA256(PHONEPE_WEBHOOK_USERNAME + ":" + PHONEPE_WEBHOOK_PASSWORD)
```

Expected backend behavior:

1. Payment transaction becomes `completed`.
2. Booking `paymentStatus` becomes `success`.
3. Booking `status` becomes `awaiting_confirmation`.
4. Endpoint returns HTTP 200 with `{ "received": true }`.

**Note:** Webhook is a backup reliability mechanism. Primary verification is via the verify endpoint.

### 3.6 Refund Before Payout

Run `14-payments-payouts.json` -> `5. Initiate Refund`.

Allowed roles: `BARBER` or `ADMIN`.

Refund rules:

| Booking payout status | Automatic refund allowed? |
|---|---|
| `not_initiated` | Yes |
| `failed` | Yes |
| `reversed` | Yes |
| `initiated` | No |
| `pending` | No |
| `completed` | No |

Refund amount:

```text
refundAmount = totalPaid - refundFee - platformFee
```

Current fee rules:

| Booking type | Platform fee | Refund fee |
|---|---:|---:|
| Single service | INR 3 | INR 7 |
| Bundle | INR 10 | INR 15 |

Then run `9. PhonePe Refund Completed Webhook` to simulate refund completion.

### 3.7 Complete Booking

After payment success, run `10-barber-bookings.json` -> `Update booking status` with:

```json
{
  "status": "completed"
}
```

Expected behavior:

1. Booking becomes `completed`.
2. `payoutStatus` stays `not_initiated`.
3. Refund window remains open until payout batch starts.

### 3.8 Trigger Payout

There is no public trigger-payout API by design. Payouts are aggregated by barber and started by the end-of-day batch job.

For integration testing with real Cashfree sandbox credentials, run this from `server` after at least one paid booking is completed:

```powershell
node --input-type=module -e "import('./src/jobs/payout-batch.cron.js').then(async (m) => { console.log(await m.runPayoutBatchNow()); }).catch((err) => { console.error(err); process.exit(1); })"
```

Expected behavior:

1. Completed bookings with `payoutStatus=not_initiated` are grouped by barber.
2. One `PayoutTransaction` is created per barber.
3. Booking `payoutStatus` becomes `pending` after Cashfree accepts the transfer.
4. Payment settlement fields are marked settled only after payout success.

Find the generated payout in MongoDB:

```javascript
db.payout_transactions
  .find({ bookingIds: ObjectId("PASTE_BOOKING_ID") })
  .sort({ createdAt: -1 })
  .limit(1)
```

Copy `_id` into `payout_id` and `transferId` into `payout_transfer_id`.

### 3.9 Simulate Payout Webhooks

Run `14-payments-payouts.json` -> `10. Cashfree Transfer Success Webhook`.

The collection computes:

```text
x-webhook-signature = Base64(HMAC_SHA256(timestamp + rawBody, CASHFREE_PAYOUT_CLIENT_SECRET))
```

Expected success behavior:

1. Payout transaction status becomes `SUCCESS`.
2. Booking `payoutStatus` becomes `completed`.
3. Booking stores `barberUtr`.
4. Payment settlement becomes `settled=true`.

To test failure and retry:

1. Run `11. Cashfree Transfer Failed Webhook`.
2. Confirm payout transaction status becomes `FAILED`.
3. Set `admin_access_token`.
4. Run `6. Retry Failed Payout`.

## 4. Webhook Testing Notes

### PhonePe Webhook Endpoint

Endpoint:

```http
POST /api/v1/payments/webhook
```

Headers:

```http
Content-Type: application/json
Authorization: {{phonepe_webhook_authorization}}
```

Supported events:

| Event | Effect |
|---|---|
| `checkout.order.completed` | Marks payment completed and booking confirmed. |
| `checkout.order.failed` | Marks payment failed and booking payment failed. |
| `pg.refund.completed` | Marks payment refunded and booking refunded. |
| `pg.refund.failed` | Marks refund failed. |

### Cashfree Payout Webhook Endpoint

Endpoint:

```http
POST /api/v1/payouts/webhook
```

Headers:

```http
Content-Type: application/json
x-webhook-timestamp: {{cashfree_webhook_timestamp}}
x-webhook-signature: {{cashfree_webhook_signature}}
```

Supported events:

| Event | Effect |
|---|---|
| `TRANSFER_SUCCESS` | Completes payout, updates bookings, settles payments. |
| `TRANSFER_FAILED` | Marks payout and linked bookings failed. |
| `TRANSFER_REVERSED` | Marks payout and linked bookings reversed. |

The backend captures raw request body before JSON parsing for this endpoint. Do not reformat the body after Postman generates the signature unless you resend the request and let the pre-request script recompute the signature.

## 5. Failure Cases to Test

| Case | How to test | Expected result |
|---|---|---|
| Missing customer token | Clear `customer_access_token`, run initiate payment | 401 unauthorized |
| Booking belongs to another customer | Use another customer's booking ID | 403 forbidden |
| Already paid booking | Run initiate payment after success | 409 conflict |
| Invalid payment ID | Use malformed `payment_id` | 400 validation error |
| Invalid PhonePe webhook auth | Override `Authorization` with `bad-signature` | Endpoint returns 200 received, logs processing error |
| Refund after payout starts | Trigger payout first, then refund | 400 refund not allowed |
| Cashfree signature mismatch | Change webhook body after signature generation | Endpoint returns 200 received with processing error, logs invalid signature |
| Payout retry for pending payout | Use payout not in failed/reversed state | 400 can only retry failed or reversed payouts |
| Missing payout destination | Remove barber UPI and bank config, run batch | 400 shop has no payout destination configured |

## 6. Common Issues and Fixes

### Invalid PhonePe Keys

Symptoms:

```text
PhonePe token refresh failed
PhonePe API error: 401
```

Fix:

1. Confirm `PHONEPE_ENV=SANDBOX` for sandbox credentials or `PRODUCTION` for live credentials.
2. Verify `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`, `PHONEPE_CLIENT_VERSION`, and `PHONEPE_MERCHANT_ID`.
3. Restart the server after changing `.env`.

### PhonePe Webhook Authentication Fails

Symptoms:

```text
Invalid webhook authentication
```

Fix:

1. Confirm Postman `phonepe_webhook_username` and `phonepe_webhook_password` match `.env`.
2. Confirm the `Authorization` header is a SHA256 hex digest, not HTTP Basic Auth.
3. Re-run the request so the pre-request script recomputes the digest.

### Cashfree Signature Mismatch

Symptoms:

```text
Invalid Cashfree webhook signature
```

Fix:

1. Confirm Postman `cashfree_webhook_secret` matches `CASHFREE_PAYOUT_CLIENT_SECRET`.
2. Do not manually edit the body after the pre-request script runs.
3. Ensure `x-webhook-timestamp` and `x-webhook-signature` are both present.

### Payment Stays Pending

Fix:

1. Run `GET /payments/{{payment_id}}/status` to poll PhonePe once.
2. Confirm PhonePe webhook URL is reachable from the public internet for real sandbox tests.
3. Check server logs for PhonePe token or API errors.
4. The payment poller also scans stale pending payments while the server is running.

### Payout Stays Pending

Fix:

1. Confirm Cashfree webhook URL is reachable from the public internet.
2. Run `Cashfree Transfer Success Webhook` in Postman with the correct `payout_transfer_id`.
3. Check Cashfree wallet balance and beneficiary validation status.
4. The payout poller scans stuck payouts older than 10 minutes while the server is running.

### Refund Is Rejected

Fix:

1. Check booking `payoutStatus`.
2. Refund is automatic only while `payoutStatus` is `not_initiated`, `failed`, or `reversed`.
3. Once payout is `initiated`, `pending`, or `completed`, handle refund through manual reconciliation.

## 7. Validation Checklist

Before handing this system to another developer, verify:

1. `.env` contains all required non-provider values.
2. PhonePe and Cashfree credentials are filled for real sandbox tests.
3. `npm run dev` starts the API without missing-env errors.
4. Postman environment `base_url` matches server `PORT`.
5. Auth collections capture customer and barber JWTs.
6. Booking creation returns `paymentRequired=true`.
7. Payment initiation captures `payment_id` and `merchant_order_id`.
8. Webhook simulations return `{ "received": true }`.
9. Refund tests are run before payout starts.
10. Payout batch is run only when Cashfree sandbox credentials and payout destination data are ready.
