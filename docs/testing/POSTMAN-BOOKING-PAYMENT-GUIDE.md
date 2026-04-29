# Postman Testing Guide: Booking & Payment Flow

**Version:** 2.0  
**Last Updated:** April 29, 2026  
**Status:** ✅ Production Ready

---

## 📚 Table of Contents

1. [Quick Setup](#quick-setup)
2. [Environment Configuration](#environment-configuration)
3. [Booking & Payment Flow](#booking--payment-flow)
4. [Webhook Testing](#webhook-testing)
5. [Failure Scenarios](#failure-scenarios)
6. [Verification & Troubleshooting](#verification--troubleshooting)

---

## Overview

This guide covers the **complete booking and payment flow** from authentication to barber approval:

```
Auth → Create Booking → Initiate Payment → Verify Payment → Webhook → Barber Approval
```

**What You'll Test:**
- ✅ Customer & Barber authentication
- ✅ Booking creation with payment
- ✅ Native PhonePe SDK payment flow
- ✅ Payment verification
- ✅ Webhook simulation (backup verification)
- ✅ Barber booking approval

---

## Quick Setup

### 1. Import Collections

Import from `server/postman-collections/`:

```
✅ EverCut.postman_environment.json
✅ 01-authentication.json
✅ 02-onboarding.json
✅ 04-customer-bookings.json
✅ 08-barber-employees.json
✅ 09-barber-services.json
✅ 10-barber-bookings.json
✅ 14-payments-payouts.json
```

### 2. Start Server

```powershell
cd server
npm run dev
```

**Expected Output:**
```
Server running on port 5000
MongoDB connected
PhonePe adapter initialized (SANDBOX mode)
Cashfree adapter initialized (SANDBOX mode)
```

---

## Environment Configuration

### Required Variables

Select **"EverCut Local"** environment in Postman and verify:

| Variable | Default Value | Purpose |
|----------|---------------|---------|
| `base_url` | `http://localhost:5000` | API server URL |
| `api_prefix` | `api/v1` | API route prefix |
| `test_customer_mobile` | `9876543210` | Test customer phone |
| `test_barber_mobile` | `9876543211` | Test barber phone |
| `test_otp` | `123456` | Test OTP (dev mode) |

### Webhook Credentials (Must Match `.env`)

| Postman Variable | `.env` Variable | Default Value |
|------------------|-----------------|---------------|
| `phonepe_webhook_username` | `PHONEPE_WEBHOOK_USERNAME` | `test-phonepe-webhook-user` |
| `phonepe_webhook_password` | `PHONEPE_WEBHOOK_PASSWORD` | `test-phonepe-webhook-password` |
| `cashfree_webhook_secret` | `CASHFREE_PAYOUT_CLIENT_SECRET` | `test-cashfree-client-secret` |

**⚠️ Important:** These must match exactly or webhook tests will fail!

### Date & Time (Automatic)

**No configuration needed!** The system auto-generates:

- ✅ Future dates (tomorrow, skips Sundays)
- ✅ Working hours (9 AM - 8 PM)
- ✅ Multiple test dates for different scenarios

**Manual Override:** Set in environment:
```
booking_date = 2026-05-15  (YYYY-MM-DD)
booking_time = 14:30       (HH:MM, 24-hour)
```

**Reset:** Clear variables to resume auto-generation.

---

## Booking & Payment Flow

### Step 1: Authentication

**Collection:** `01-authentication.json`

```
1. Send Customer OTP
   POST /auth/otp/send
   Body: { "mobile": "9876543210" }
   
2. Verify Customer OTP
   POST /auth/otp/verify
   Body: { "mobile": "9876543210", "otp": "123456" }
   ✅ Captures: customer_access_token

3. Send Barber OTP
   POST /auth/otp/send
   Body: { "mobile": "9876543211" }
   
4. Verify Barber OTP
   POST /auth/otp/verify
   Body: { "mobile": "9876543211", "otp": "123456" }
   ✅ Captures: barber_access_token
```

**Local OTP:** Always `123456` when `NODE_ENV !== 'production'`

---

### Step 2: Onboarding

**Collection:** `02-onboarding.json`

```
1. Complete Customer Profile
   POST /onboarding/customers
   ✅ Creates customer profile

2. Complete Barber Profile
   POST /onboarding/barbers
   ✅ Creates shop, captures shop_id
```

---

### Step 3: Create Shop Data

**Collections:** `08-barber-employees.json`, `09-barber-services.json`

```
1. Create Employee
   POST /shops/:id/employees
   ✅ Captures: employee_id

2. Create Service
   POST /shops/:id/services
   ✅ Captures: service_id
```

---

### Step 4: Create Booking

**Collection:** `04-customer-bookings.json`

```
POST /bookings
Authorization: Bearer {{customer_access_token}}

Body:
{
  "serviceId": ["{{service_id}}"],
  "employeeId": "{{employee_id}}",
  "shopId": "{{shop_id}}",
  "date": "{{booking_date}}",
  "time": "{{booking_time}}"
}

Expected Response:
{
  "success": true,
  "data": {
    "paymentRequired": true,
    "booking": {
      "status": "pending",
      "paymentStatus": "pending",
      "totalAmount": 300
    }
  }
}

✅ Captures: booking_id → payment_booking_id
```

---

### Step 5: Payment Flow (Native SDK)

**Collection:** `14-payments-payouts.json`

#### 5.1 Initiate Payment

```
Request #1: Create Native SDK Payment Order
POST /payments
Authorization: Bearer {{customer_access_token}}

Body:
{
  "bookingId": "{{payment_booking_id}}"
}

Expected Response:
{
  "success": true,
  "data": {
    "paymentId": "...",
    "merchantOrderId": "EC-...",
    "orderId": "OMO123456789",
    "token": "eyJhbGci...",
    "merchantId": "MERCHANT_ID",
    "amountInPaisa": 30300,
    "state": "PENDING",
    "gateway": "phonepe",
    "paymentFlow": "PHONEPE_SDK"
  }
}

✅ Captures: payment_id, merchant_order_id
❌ NO redirectUrl (native SDK, not web redirect)
```

#### 5.2 Verify Payment (Simulate SDK Callback)

```
Request #2: Verify Native SDK Payment
POST /payments/{{payment_id}}/verify
Authorization: Bearer {{customer_access_token}}

Body:
{
  "sdkStatus": "SUCCESS",
  "sdkResponseCode": "PAYMENT_SUCCESS",
  "sdkMessage": "Payment completed successfully"
}

What Happens:
1. Backend receives SDK status (informational only)
2. Backend calls PhonePe Order Status API
3. Backend trusts ONLY PhonePe's response
4. Updates payment and booking status

Expected Response:
{
  "success": true,
  "data": {
    "status": "completed",
    "gatewayState": "COMPLETED",
    "paymentStatus": "success",
    "bookingStatus": "awaiting_confirmation"
  }
}
```

**🔒 Security:** SDK status is ignored. Backend verifies with PhonePe directly.

#### 5.3 Webhook (Backup Verification)

```
Request #7: PhonePe Payment Success Webhook
POST /payments/webhook
Authorization: {{phonepe_webhook_authorization}}  ← Auto-computed!

Body:
{
  "event": "checkout.order.completed",
  "payload": {
    "merchantOrderId": "{{merchant_order_id}}",
    "orderId": "PO123456789",
    "state": "COMPLETED",
    "amount": 30300,
    "paymentDetails": [{
      "paymentMode": "UPI",
      "transactionId": "TXN123456789",
      "amount": 30300,
      "state": "COMPLETED"
    }]
  }
}

Expected Response:
{
  "received": true
}

What Happens:
1. Pre-request script computes SHA256(username:password)
2. Sets Authorization header automatically
3. Backend verifies signature
4. Backend calls PhonePe Order Status API (double verification)
5. Updates payment and booking
```

---

### Step 6: Barber Approves Booking

**Collection:** `10-barber-bookings.json`

```
PATCH /bookings/{{booking_id}}
Authorization: Bearer {{barber_access_token}}

Body:
{
  "status": "confirmed"
}

Expected Response:
{
  "success": true,
  "data": {
    "status": "confirmed",
    "paymentStatus": "success"
  }
}

What Happens:
- Booking → confirmed
- Customer receives confirmation
- Booking is ready for service
```

**✅ Flow Complete!** Customer has paid, barber has confirmed the booking.

---

## Webhook Testing

### PhonePe Webhooks (SHA256 Authentication)

**Requests:** #7 (Success), #8 (Failure), #9 (Refund)

**How It Works:**
```javascript
// Pre-request script (automatic)
const username = pm.environment.get('phonepe_webhook_username');
const password = pm.environment.get('phonepe_webhook_password');
const authSignature = CryptoJS.SHA256(username + ':' + password).toString(CryptoJS.enc.Hex);
pm.collectionVariables.set('phonepe_webhook_authorization', authSignature);
```

**Backend Verification:**
```javascript
const expectedAuth = crypto
  .createHash('sha256')
  .update(`${PHONEPE_WEBHOOK_USERNAME}:${PHONEPE_WEBHOOK_PASSWORD}`)
  .digest('hex');

if (receivedAuth !== expectedAuth) {
  throw new Error('Invalid webhook authentication');
}
```

**Security:** Attacker cannot spoof without knowing username + password.

---

**Security:** Attacker cannot spoof without knowing username + password.

---

## Failure Scenarios

### Payment Failure

**Request #2:** Change SDK status
```json
{
  "sdkStatus": "FAILURE",
  "sdkResponseCode": "PAYMENT_DECLINED",
  "sdkMessage": "Insufficient funds"
}
```

**Request #8:** Payment Failure Webhook
```json
{
  "event": "checkout.order.failed",
  "payload": {
    "merchantOrderId": "{{merchant_order_id}}",
    "state": "FAILED",
    "paymentDetails": [{
      "state": "FAILED",
      "errorCode": "PAYMENT_DECLINED"
    }]
  }
}
```

**Expected:**
- Payment → failed
- Booking → payment_failed
- Slot lock released

---

### Refund Testing

**Request #5:** Initiate Refund
```
POST /payments/{{payment_id}}/refund
Authorization: Bearer {{barber_access_token}}

Body:
{
  "reason": "Customer cancelled"
}
```

**Request #9:** Refund Completed Webhook
```json
{
  "event": "pg.refund.completed",
  "payload": {
    "merchantRefundId": "{{merchant_refund_id}}",
    "state": "COMPLETED",
    "amount": 29000
  }
}
```

**Expected:**
- Payment → refunded
- Booking → cancelled
- Customer receives refund

---

## Verification & Troubleshooting

### Check Payment Status

**Request #3:** Get Payment Status
```
GET /payments/{{payment_id}}
Authorization: Bearer {{customer_access_token}}

Response:
{
  "success": true,
  "data": {
    "status": "completed",  // or pending, failed, expired
    "gatewayState": "COMPLETED",
    "amount": 303
  }
}
```

---

### Check Database State

```javascript
// Payment
db.paymenttransactions.findOne({ _id: ObjectId("payment_id") })

// Expected after success:
{
  status: "completed",
  gatewayState: "COMPLETED",
  amount: 30300
}

// Booking
db.bookings.findOne({ _id: ObjectId("booking_id") })

// Expected after barber approval:
{
  status: "confirmed",
  paymentStatus: "success"
}
```

---

### Common Issues

#### "Invalid webhook authentication"

**Cause:** Webhook credentials don't match `.env`

**Fix:**
1. Check Postman environment:
   - `phonepe_webhook_username`
   - `phonepe_webhook_password`
2. Check `.env` file:
   - `PHONEPE_WEBHOOK_USERNAME`
   - `PHONEPE_WEBHOOK_PASSWORD`
3. Ensure they match exactly
4. Restart server after changing `.env`

---

#### "Invalid webhook signature"

**Cause:** Cashfree secret doesn't match `.env`

**Fix:**
1. Check Postman: `cashfree_webhook_secret`
2. Check `.env`: `CASHFREE_PAYOUT_CLIENT_SECRET`
3. Ensure they match exactly
4. Don't manually edit webhook body after pre-request script runs

---

#### Payment stays "pending"

**Fix:**
1. Run Request #2 (Verify Payment) to poll PhonePe
2. Check PhonePe credentials in `.env`
3. Check server logs for PhonePe API errors
4. Use Request #7 (Webhook) to force completion

---

#### Date/time issues

**Fix:**
1. Clear `booking_date` and `booking_time` in environment
2. Let auto-generation create valid future dates
3. Or set manually: `booking_date = 2026-05-15`, `booking_time = 14:30`

---

### Success Criteria Checklist

After running complete flow, verify:

- [ ] Payment status = `completed`
- [ ] Booking status = `confirmed`
- [ ] Booking `paymentStatus` = `success`
- [ ] Payment verified by PhonePe
- [ ] Webhook processed successfully
- [ ] Barber approved the booking
- [ ] No errors in server logs

---

## Quick Reference

### Test Sequence

```
1. Auth (Customer + Barber) → Captures tokens
2. Onboarding → Creates profiles
3. Create Employee + Service → Captures IDs
4. Create Booking → Captures booking_id
5. Initiate Payment → Captures payment_id
6. Verify Payment → Simulates SDK callback
7. Payment Webhook → Backup verification
8. Barber Approves Booking → Booking confirmed
```

### Environment Variables

| Variable | Purpose | Auto-Set? |
|----------|---------|-----------|
| `customer_access_token` | Customer auth | ✅ |
| `barber_access_token` | Barber auth | ✅ |
| `shop_id` | Shop reference | ✅ |
| `employee_id` | Employee reference | ✅ |
| `service_id` | Service reference | ✅ |
| `booking_id` | Booking reference | ✅ |
| `payment_id` | Payment reference | ✅ |
| `merchant_order_id` | PhonePe order ID | ✅ |
| `phonepe_webhook_username` | Webhook auth | ❌ Manual |
| `phonepe_webhook_password` | Webhook auth | ❌ Manual |

### Webhook Requests

| Request | Collection | Purpose |
|---------|------------|---------|
| #7 | 14-payments-payouts | PhonePe payment success |
| #8 | 14-payments-payouts | PhonePe payment failure |
| #9 | 14-payments-payouts | PhonePe refund completed |

---

## Related Documentation

- **Flutter Implementation:** `docs/flows/FLUTTER-BOOKING-PAYMENT-FLOW.md`
- **Webhook Testing with Hookdeck:** `docs/features/payments/HOOKDECK-DAILY-WORKFLOW.md`

---

**You're ready to test!** 🎉

This guide covers the complete booking and payment flow from authentication to barber approval. For payout testing, refer to the complete backend testing documentation.
