# PhonePe Payment Gateway — Flutter + Node.js Integration Guide

> **Source:** [developer.phonepe.com/payment-gateway](https://developer.phonepe.com/payment-gateway)  
> **Scope:** Standard Checkout (Mobile SDK) · In-App Payment Flow  
> **Stack:** Flutter (Android + iOS) · Node.js Backend  
> **Version:** Flutter SDK via `phonepe_payment_sdk` pub package

---

## Table of Contents

1. [Architecture & Flow Overview](#1-architecture--flow-overview)
2. [Prerequisites & Credentials](#2-prerequisites--credentials)
3. [Node.js Backend Setup](#3-nodejs-backend-setup)
   - 3.1 [Auth Token — Generate & Cache](#31-auth-token--generate--cache)
   - 3.2 [Create Order Token](#32-create-order-token)
   - 3.3 [Check Order Status](#33-check-order-status)
   - 3.4 [Initiate Refund](#34-initiate-refund)
   - 3.5 [Webhook Receiver](#35-webhook-receiver)
4. [Flutter SDK Setup](#4-flutter-sdk-setup)
   - 4.1 [Android Native Config](#41-android-native-config)
   - 4.2 [iOS Native Config](#42-ios-native-config)
   - 4.3 [Flutter Plugin Integration](#43-flutter-plugin-integration)
   - 4.4 [SDK Init & Transaction Flow](#44-sdk-init--transaction-flow)
5. [API Reference](#5-api-reference)
   - 5.1 [Authorization API](#51-authorization-api)
   - 5.2 [Create Order Token API](#52-create-order-token-api)
   - 5.3 [Check Order Status API](#53-check-order-status-api)
   - 5.4 [Initiate Refund API](#54-initiate-refund-api)
6. [Webhook Reference](#6-webhook-reference)
7. [Error Handling & Edge Cases](#7-error-handling--edge-cases)
8. [UAT Testing & Go-Live Checklist](#8-uat-testing--go-live-checklist)

---

## 1. Architecture & Flow Overview

```
Flutter App                     Node.js Backend              PhonePe PG
    │                                 │                           │
    │──── 1. Tap "Pay" ──────────────►│                           │
    │                                 │── 2. GET /auth ──────────►│
    │                                 │◄── access_token ──────────│
    │                                 │                           │
    │                                 │── 3. POST /create-order ─►│
    │                                 │◄── { orderId, token } ────│
    │                                 │                           │
    │◄── 4. Return { orderId,token } ─│                           │
    │                                 │                           │
    │─── 5. SDK.startTransaction() ──►│(PhonePe SDK takes over)   │
    │          ┌─────────────────────────────────────────────────►│
    │          │  UPI / Card / NetBanking UI handled natively     │
    │          └─────────────────────────────────────────────────►│
    │                                 │                           │
    │◄── 6. SDK callback { status } ──│                           │
    │                                 │◄── 7. Webhook S2S ────────│
    │─── 8. POST /verify-payment ────►│                           │
    │                                 │── 9. GET /order-status ──►│
    │                                 │◄── { state: COMPLETED } ──│
    │◄── 10. Final status ────────────│                           │
```

**Key rules:**
- Auth token is fetched **server-side only**. Never expose `client_secret` to the app.
- The `token` from Create Order API is a **single-use, time-limited** bearer passed to the Flutter SDK.
- The Flutter SDK **callback is informational only** — always verify payment status via the backend Order Status API or webhook before fulfilling orders.
- Webhooks are the primary notification mechanism. Poll Order Status API as a fallback.

---

## 2. Prerequisites & Credentials

### Obtain from PhonePe Business Dashboard (`business.phonepe.com`)

| Credential | Used For |
|---|---|
| `client_id` | Auth token generation |
| `client_version` | Auth token generation |
| `client_secret` | Auth token generation (keep secret, backend only) |
| `merchantId` | SDK init + order creation |

Navigate: **Dashboard → Developer Settings → API Keys**

### Environments

| Environment | Auth Base URL | PG Base URL |
|---|---|---|
| **Sandbox** | `https://api-preprod.phonepe.com/apis/pg-sandbox` | `https://api-preprod.phonepe.com/apis/pg-sandbox` |
| **Production** | `https://api.phonepe.com/apis/identity-manager` | `https://api.phonepe.com/apis/pg` |

---

## 3. Node.js Backend Setup

### Project Structure

```
backend/
├── src/
│   ├── config.js          # env vars
│   ├── phonepeAuth.js     # token fetch + cache
│   ├── routes/
│   │   ├── payment.js     # /create-order, /order-status, /refund
│   │   └── webhook.js     # /webhook
│   └── server.js
├── .env
└── package.json
```

### `.env`

```env
PHONEPE_CLIENT_ID=your_client_id
PHONEPE_CLIENT_VERSION=1
PHONEPE_CLIENT_SECRET=your_client_secret
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_ENV=SANDBOX            # SANDBOX | PRODUCTION
WEBHOOK_USERNAME=your_webhook_user
WEBHOOK_PASSWORD=your_webhook_pass
PORT=3000
```

### `src/config.js`

```js
const isSandbox = process.env.PHONEPE_ENV === 'SANDBOX';

module.exports = {
  clientId: process.env.PHONEPE_CLIENT_ID,
  clientVersion: process.env.PHONEPE_CLIENT_VERSION,
  clientSecret: process.env.PHONEPE_CLIENT_SECRET,
  merchantId: process.env.PHONEPE_MERCHANT_ID,
  webhookUsername: process.env.WEBHOOK_USERNAME,
  webhookPassword: process.env.WEBHOOK_PASSWORD,
  authUrl: isSandbox
    ? 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token'
    : 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
  pgBaseUrl: isSandbox
    ? 'https://api-preprod.phonepe.com/apis/pg-sandbox'
    : 'https://api.phonepe.com/apis/pg',
};
```

---

### 3.1 Auth Token — Generate & Cache

Tokens are long-lived (check `expires_at` epoch). Cache server-side; do not re-fetch per request.

**`src/phonepeAuth.js`**

```js
const axios = require('axios');
const qs = require('qs');
const config = require('./config');

let tokenCache = { token: null, expiresAt: 0 };

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  // Refresh 60s before expiry
  if (tokenCache.token && tokenCache.expiresAt > now + 60) {
    return tokenCache.token;
  }

  const response = await axios.post(
    config.authUrl,
    qs.stringify({
      client_id: config.clientId,
      client_version: config.clientVersion,
      client_secret: config.clientSecret,
      grant_type: 'client_credentials',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, expires_at } = response.data;
  tokenCache = { token: access_token, expiresAt: expires_at };
  return access_token;
}

module.exports = { getAccessToken };
```

---

### 3.2 Create Order Token

**`src/routes/payment.js` (excerpt)**

```js
const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { getAccessToken } = require('../phonepeAuth');
const config = require('../config');

const router = express.Router();

// POST /api/payment/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, userId } = req.body; // amount in paisa (₹10 = 1000)

    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'amount must be >= 100 paisa' });
    }

    const merchantOrderId = `ORD-${uuidv4().replace(/-/g, '').slice(0, 20)}`;
    const token = await getAccessToken();

    const payload = {
      merchantOrderId,
      amount,           // in paisa
      expireAfter: 1200, // seconds (min 300, max 3600)
      metaInfo: {
        udf1: userId ?? '',
      },
      paymentFlow: {
        type: 'PG_CHECKOUT',
        // Optional: restrict payment modes
        // paymentModeConfig: {
        //   enabledPaymentModes: [
        //     { type: 'UPI_INTENT' },
        //     { type: 'UPI_COLLECT' },
        //     { type: 'CARD', cardTypes: ['DEBIT_CARD', 'CREDIT_CARD'] },
        //   ],
        // },
      },
    };

    const response = await axios.post(
      `${config.pgBaseUrl}/checkout/v2/sdk/order`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `O-Bearer ${token}`,
        },
      }
    );

    const { orderId, token: orderToken, state, expireAt } = response.data;

    // Persist merchantOrderId ↔ orderId mapping in your DB here

    return res.json({
      merchantOrderId,
      orderId,
      token: orderToken,
      state,
      expireAt,
      merchantId: config.merchantId,
    });
  } catch (err) {
    console.error('create-order error:', err?.response?.data ?? err.message);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});
```

---

### 3.3 Check Order Status

```js
// GET /api/payment/order-status/:merchantOrderId
router.get('/order-status/:merchantOrderId', async (req, res) => {
  try {
    const { merchantOrderId } = req.params;
    const { details = 'false', errorContext = 'true' } = req.query;
    const token = await getAccessToken();

    const response = await axios.get(
      `${config.pgBaseUrl}/checkout/v2/order/${merchantOrderId}/status`,
      {
        params: { details, errorContext },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `O-Bearer ${token}`,
        },
      }
    );

    // Authoritative status: response.data.state
    // Values: PENDING | COMPLETED | FAILED
    return res.json(response.data);
  } catch (err) {
    console.error('order-status error:', err?.response?.data ?? err.message);
    return res.status(500).json({ error: 'Failed to fetch order status' });
  }
});
```

**Polling strategy for PENDING status:**

```js
// Call from Flutter after SDK callback if webhook not yet received
// Recommended intervals: 15s → 30s → 60s
async function pollOrderStatus(merchantOrderId, maxAttempts = 5) {
  const delays = [15000, 30000, 60000, 60000, 60000];
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, delays[i]));
    const res = await axios.get(`/api/payment/order-status/${merchantOrderId}`);
    if (res.data.state !== 'PENDING') return res.data;
  }
  return null; // still pending after max attempts — handle manually
}
```

---

### 3.4 Initiate Refund

**`src/routes/payment.js` (refund excerpt)**

```js
// POST /api/payment/refund
router.post('/refund', async (req, res) => {
  try {
    const { originalMerchantOrderId, merchantRefundId, amount } = req.body;
    const token = await getAccessToken();

    const payload = {
      merchantRefundId,         // unique refund ID you generate
      originalMerchantOrderId,  // the original order's merchantOrderId
      amount,                   // refund amount in paisa (partial or full)
    };

    const response = await axios.post(
      `${config.pgBaseUrl}/checkout/v2/order/refund`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `O-Bearer ${token}`,
        },
      }
    );

    return res.json(response.data);
  } catch (err) {
    console.error('refund error:', err?.response?.data ?? err.message);
    return res.status(500).json({ error: 'Refund initiation failed' });
  }
});

module.exports = router;
```

---

### 3.5 Webhook Receiver

**`src/routes/webhook.js`**

```js
const express = require('express');
const crypto = require('crypto');
const config = require('../config');

const router = express.Router();

// Compute expected Authorization header value
function computeWebhookAuth() {
  return crypto
    .createHash('sha256')
    .update(`${config.webhookUsername}:${config.webhookPassword}`)
    .digest('hex');
}

// POST /api/webhook/phonepe
router.post('/phonepe', express.json(), (req, res) => {
  try {
    const incomingAuth = req.headers['authorization'];
    const expectedAuth = computeWebhookAuth();

    if (incomingAuth !== expectedAuth) {
      console.warn('Webhook auth mismatch — rejected');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { event, payload } = req.body;

    // CRITICAL: Use payload.state, NOT event type alone
    switch (event) {
      case 'checkout.order.completed':
        handleOrderCompleted(payload);
        break;
      case 'checkout.order.failed':
        handleOrderFailed(payload);
        break;
      case 'pg.refund.completed':
        handleRefundCompleted(payload);
        break;
      case 'pg.refund.failed':
        handleRefundFailed(payload);
        break;
      default:
        console.log('Unhandled webhook event:', event);
    }

    // Always respond 200 quickly to acknowledge receipt
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

function handleOrderCompleted(payload) {
  const { merchantOrderId, orderId, state, amount } = payload;
  console.log(`Order COMPLETED: ${merchantOrderId} | PhonePe ID: ${orderId} | ₹${amount / 100}`);
  // TODO: Update your DB, fulfill order, notify user
}

function handleOrderFailed(payload) {
  const { merchantOrderId, state, paymentDetails } = payload;
  const errorCode = paymentDetails?.[0]?.errorCode;
  console.log(`Order FAILED: ${merchantOrderId} | Error: ${errorCode}`);
  // TODO: Update your DB, notify user, optionally allow retry
}

function handleRefundCompleted(payload) {
  const { merchantRefundId, originalMerchantOrderId, amount, state } = payload;
  console.log(`Refund COMPLETED: ${merchantRefundId} for order ${originalMerchantOrderId}`);
  // TODO: Update refund status in DB
}

function handleRefundFailed(payload) {
  const { merchantRefundId, errorCode } = payload;
  console.log(`Refund FAILED: ${merchantRefundId} | Error: ${errorCode}`);
  // TODO: Handle failed refund (retry logic, manual intervention flag)
}

module.exports = router;
```

**`src/server.js`**

```js
const express = require('express');
const paymentRoutes = require('./routes/payment');
const webhookRoutes = require('./routes/webhook');

const app = express();
app.use(express.json());

app.use('/api/payment', paymentRoutes);
app.use('/api/webhook', webhookRoutes);

app.listen(process.env.PORT || 3000, () =>
  console.log(`Server running on port ${process.env.PORT || 3000}`)
);
```

---

## 4. Flutter SDK Setup

### 4.1 Android Native Config

**`android/build.gradle` (project-level)**

```groovy
allprojects {
  repositories {
    google()
    maven {
      url = uri("https://phonepe.mycloudrepo.io/public/repositories/phonepe-intentsdk-android")
    }
  }
}
```

**`android/app/src/main/kotlin/.../MainActivity.kt`**

```kotlin
import io.flutter.embedding.android.FlutterFragmentActivity

class MainActivity : FlutterFragmentActivity()
```

> `MainActivity` **must** extend `FlutterFragmentActivity`, not `FlutterActivity`.

**`android/app/src/main/AndroidManifest.xml`** (add inside `<activity>` tag for Sandbox deep link):

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="ppesim" />
</intent-filter>
```

---

### 4.2 iOS Native Config

**`ios/Runner/Info.plist`** — add `LSApplicationQueriesSchemes`:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>ppemerchantsdkv1</string>
  <string>ppemerchantsdkv2</string>
  <string>ppemerchantsdkv3</string>
  <string>paytmmp</string>
  <string>gpay</string>
</array>
```

Create a URL Type (deep link scheme) for your app in Xcode:

- **Identifier:** `com.yourapp.phonepe` (anything unique)
- **URL Schemes:** e.g., `myapppay` (only alphanumeric, dots, and hyphens; **must start with a letter**)

**`ios/Runner/AppDelegate.m`** — add `openURL` handler:

```objc
- (BOOL)application:(UIApplication *)app
           openURL:(NSURL *)url
           options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  NSMutableDictionary *userInfo = [[NSMutableDictionary alloc] init];
  [userInfo setObject:options forKey:@"options"];
  [userInfo setObject:url forKey:@"openUrl"];
  [[NSNotificationCenter defaultCenter]
    postNotificationName:@"ApplicationOpenURLNotification"
    object:nil
    userInfo:userInfo];
  return YES;
}
```

Install pods:

```bash
cd ios && pod install
```

---

### 4.3 Flutter Plugin Integration

```bash
flutter pub add phonepe_payment_sdk
flutter pub get
```

**`pubspec.yaml`** (auto-added):

```yaml
dependencies:
  phonepe_payment_sdk: ^latest
  http: ^1.1.0
```

---

### 4.4 SDK Init & Transaction Flow

**Complete payment service — `lib/services/phonepe_service.dart`**

```dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:phonepe_payment_sdk/phonepe_payment_sdk.dart';

class PhonePeService {
  static const String _backendBase = 'https://your-backend.com/api/payment';

  // Environment: 'SANDBOX' or 'PRODUCTION'
  static const String _environment = 'SANDBOX';

  // Your merchant ID (from PhonePe dashboard)
  static const String _merchantId = 'YOUR_MERCHANT_ID';

  // iOS URL scheme (must match Info.plist URL Type)
  static const String _iosAppSchema = 'myapppay://';

  /// Initialize SDK — call once (e.g., in main.dart or app init)
  static Future<bool> initSdk({required String flowId}) async {
    try {
      final bool isInitialized = await PhonePePaymentSdk.init(
        _environment,
        _merchantId,
        flowId,   // alphanumeric, no special chars — use userId or UUID
        false,    // enableLogging — set false in production
      );
      debugPrint('PhonePe SDK init: $isInitialized');
      return isInitialized;
    } catch (e) {
      debugPrint('PhonePe SDK init failed: $e');
      return false;
    }
  }

  /// Full payment flow: backend order creation → SDK transaction
  static Future<PhonePePaymentResult> startPayment({
    required int amountInPaisa,
    required String userId,
  }) async {
    try {
      // Step 1: Create order on backend
      final orderResponse = await _createOrder(
        amount: amountInPaisa,
        userId: userId,
      );

      final String orderId = orderResponse['orderId'];
      final String token = orderResponse['token'];
      final String merchantOrderId = orderResponse['merchantOrderId'];
      final String merchantId = orderResponse['merchantId'];

      // Step 2: Build SDK request payload
      final Map<String, dynamic> payloadMap = {
        'orderId': orderId,
        'merchantId': merchantId,
        'token': token,
        'paymentMode': {'type': 'PAY_PAGE'},
      };
      final String request = jsonEncode(payloadMap);

      // Step 3: Launch PhonePe SDK
      final Map<dynamic, dynamic>? sdkResponse =
          await PhonePePaymentSdk.startTransaction(request, _iosAppSchema);

      if (sdkResponse == null) {
        return PhonePePaymentResult(
          status: PaymentStatus.incomplete,
          merchantOrderId: merchantOrderId,
          message: 'Transaction not completed',
        );
      }

      final String sdkStatus = sdkResponse['status']?.toString() ?? 'UNKNOWN';

      // Step 4: Verify on backend regardless of SDK status
      final verifiedStatus = await _verifyPayment(merchantOrderId);

      return PhonePePaymentResult(
        status: _mapStatus(verifiedStatus),
        merchantOrderId: merchantOrderId,
        message: sdkStatus,
      );
    } catch (e) {
      debugPrint('PhonePe payment error: $e');
      return PhonePePaymentResult(
        status: PaymentStatus.error,
        merchantOrderId: '',
        message: e.toString(),
      );
    }
  }

  static Future<Map<String, dynamic>> _createOrder({
    required int amount,
    required String userId,
  }) async {
    final response = await http.post(
      Uri.parse('$_backendBase/create-order'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'amount': amount, 'userId': userId}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to create order: ${response.body}');
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  static Future<String> _verifyPayment(String merchantOrderId) async {
    // Poll with backoff if PENDING
    for (int attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) {
        await Future.delayed(Duration(seconds: [0, 15, 30, 60, 60][attempt]));
      }

      final response = await http.get(
        Uri.parse('$_backendBase/order-status/$merchantOrderId'
            '?details=false&errorContext=true'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final state = data['state']?.toString() ?? 'UNKNOWN';
        if (state != 'PENDING') return state;
      }
    }
    return 'PENDING'; // couldn't resolve; webhook will arrive
  }

  static PaymentStatus _mapStatus(String state) {
    switch (state) {
      case 'COMPLETED':
        return PaymentStatus.success;
      case 'FAILED':
        return PaymentStatus.failed;
      case 'PENDING':
        return PaymentStatus.pending;
      default:
        return PaymentStatus.unknown;
    }
  }
}

enum PaymentStatus { success, failed, pending, incomplete, error, unknown }

class PhonePePaymentResult {
  final PaymentStatus status;
  final String merchantOrderId;
  final String message;

  PhonePePaymentResult({
    required this.status,
    required this.merchantOrderId,
    required this.message,
  });
}
```

**Usage in Widget:**

```dart
// In main.dart or app startup:
await PhonePeService.initSdk(flowId: currentUser.id);

// On checkout button press:
final result = await PhonePeService.startPayment(
  amountInPaisa: 4999,  // ₹49.99
  userId: currentUser.id,
);

switch (result.status) {
  case PaymentStatus.success:
    showSuccessScreen(result.merchantOrderId);
    break;
  case PaymentStatus.failed:
    showFailureScreen('Payment failed. Please try again.');
    break;
  case PaymentStatus.pending:
    showPendingScreen('Payment is processing. We will notify you.');
    break;
  default:
    showErrorScreen('Something went wrong.');
}
```

---

## 5. API Reference

### 5.1 Authorization API

| | Sandbox | Production |
|---|---|---|
| **Method** | POST | POST |
| **URL** | `https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token` | `https://api.phonepe.com/apis/identity-manager/v1/oauth/token` |

**Request Headers:**

```
Content-Type: application/x-www-form-urlencoded
```

**Request Body (form-urlencoded):**

| Parameter | Value |
|---|---|
| `client_id` | Client ID from dashboard |
| `client_version` | Client version from dashboard |
| `client_secret` | Client secret from dashboard |
| `grant_type` | `client_credentials` |

**Response:**

```json
{
  "access_token": "eyJhbGci...",
  "encrypted_access_token": "...",
  "expires_in": null,
  "issued_at": 1706073005,
  "expires_at": 1706697605,
  "session_expires_at": 1706697605,
  "token_type": "O-Bearer"
}
```

| Field | Description |
|---|---|
| `access_token` | Token to use in `Authorization: O-Bearer <token>` header |
| `expires_at` | Unix epoch (seconds) — refresh before this time |
| `token_type` | Always `O-Bearer` |

---

### 5.2 Create Order Token API

| | Sandbox | Production |
|---|---|---|
| **Method** | POST | POST |
| **URL** | `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/sdk/order` | `https://api.phonepe.com/apis/pg/checkout/v2/sdk/order` |

**Request Headers:**

```
Content-Type: application/json
Authorization: O-Bearer <access_token>
```

**Request Body:**

```json
{
  "merchantOrderId": "ORD-abc123",
  "amount": 1000,
  "expireAfter": 1200,
  "metaInfo": {
    "udf1": "user_id_or_any_string",
    "udf2": ""
  },
  "paymentFlow": {
    "type": "PG_CHECKOUT"
  }
}
```

| Parameter | Type | Required | Constraints |
|---|---|---|---|
| `merchantOrderId` | String | Yes | Max 63 chars; only `A-Z a-z 0-9 _ -` |
| `amount` | Long | Yes | Minimum `100` (paisa) |
| `expireAfter` | Long | No | `300` – `3600` seconds (default applied if omitted) |
| `metaInfo.udf1-10` | String | No | Max 256 chars each |
| `metaInfo.udf11-15` | String | No | Max 50 chars; alphanumeric + `_ - + @ .` |
| `paymentFlow.type` | String | Yes | Must be `PG_CHECKOUT` |

**Response:**

```json
{
  "orderId": "OMO123456789",
  "state": "PENDING",
  "expireAt": 1703756259307,
  "token": "eyJhbGci..."
}
```

| Field | Description |
|---|---|
| `orderId` | PhonePe's internal order ID — pass to Flutter SDK |
| `token` | Order token — pass to Flutter SDK |
| `state` | `PENDING` on creation |
| `expireAt` | Epoch ms — order expires after this |

**Payment mode control (optional):**

```json
"paymentFlow": {
  "type": "PG_CHECKOUT",
  "paymentModeConfig": {
    "enabledPaymentModes": [
      { "type": "UPI_INTENT" },
      { "type": "UPI_COLLECT" },
      { "type": "UPI_QR" },
      { "type": "NET_BANKING" },
      { "type": "CARD", "cardTypes": ["DEBIT_CARD", "CREDIT_CARD"] }
    ]
  }
}
```

> **Rule:** Pass either `enabledPaymentModes` **or** `disabledPaymentModes`, never both.
> If `type: CARD` is set without `cardTypes`, PhonePe uses its default card config.

---

### 5.3 Check Order Status API

| | Sandbox | Production |
|---|---|---|
| **Method** | GET | GET |
| **URL** | `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/{merchantOrderId}/status` | `https://api.phonepe.com/apis/pg/checkout/v2/order/{merchantOrderId}/status` |

**Request Headers:**

```
Content-Type: application/json
Authorization: O-Bearer <access_token>
```

**Query Parameters:**

| Parameter | Default | Description |
|---|---|---|
| `details` | `false` | `true` = all attempts; `false` = latest attempt only |
| `errorContext` | `false` | `true` = include error detail block when FAILED |

**Order States:**

| State | Meaning |
|---|---|
| `PENDING` | Payment not yet resolved — poll again |
| `COMPLETED` | Payment successful |
| `FAILED` | Payment failed |

**Sample COMPLETED response:**

```json
{
  "orderId": "OMO2403282020198641071317",
  "state": "COMPLETED",
  "amount": 1000,
  "expireAt": 1711867462542,
  "paymentDetails": [
    {
      "paymentMode": "UPI_INTENT",
      "transactionId": "OM2403...",
      "timestamp": 1711694662542,
      "amount": 1000,
      "state": "COMPLETED",
      "rail": {
        "type": "UPI",
        "utr": "455069731511",
        "upiTransactionId": "YBL369f6d...",
        "vpa": "user@ybl"
      },
      "instrument": {
        "type": "ACCOUNT",
        "maskedAccountNumber": "XXXXXX5533",
        "accountType": "SAVINGS"
      }
    }
  ]
}
```

**Sample FAILED response (with `errorContext=true`):**

```json
{
  "orderId": "OMO2407121214...",
  "state": "FAILED",
  "amount": 200,
  "errorCode": "INVALID_MPIN",
  "detailedErrorCode": "ZM",
  "errorContext": {
    "errorCode": "INVALID_MPIN",
    "detailedErrorCode": "ZM",
    "source": "CUSTOMER",
    "stage": "AUTHENTICATION",
    "description": "Wrong MPIN was entered"
  },
  "paymentDetails": [...]
}
```

---

### 5.4 Initiate Refund API

| | Sandbox | Production |
|---|---|---|
| **Method** | POST | POST |
| **URL** | `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/refund` | `https://api.phonepe.com/apis/pg/checkout/v2/order/refund` |

**Request Headers:**

```
Content-Type: application/json
Authorization: O-Bearer <access_token>
```

**Request Body:**

```json
{
  "merchantRefundId": "REF-unique-id-123",
  "originalMerchantOrderId": "ORD-abc123",
  "amount": 500
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `merchantRefundId` | String | Yes | Unique ID you generate per refund |
| `originalMerchantOrderId` | String | Yes | `merchantOrderId` of the original order |
| `amount` | Long | Yes | Refund amount in paisa (can be partial) |

**Response:** Refund status tracked via webhook (`pg.refund.completed` / `pg.refund.failed`).

---

## 6. Webhook Reference

### Setup (Dashboard)

1. Go to **business.phonepe.com → Developer Settings → Webhook**
2. Click **Create Webhook**
3. Fill in:
   - **Webhook URL:** `https://your-backend.com/api/webhook/phonepe`
   - **Username / Password:** values used in SHA256 auth verification
4. Subscribe to events: `checkout.order.completed`, `checkout.order.failed`, `pg.refund.completed`, `pg.refund.failed`

### Authorization Verification

PhonePe sends an `Authorization` header value computed as:

```
Authorization: SHA256(username:password)
```

Verify on your server:

```js
const crypto = require('crypto');
const expected = crypto.createHash('sha256')
  .update(`${webhookUsername}:${webhookPassword}`)
  .digest('hex');

if (req.headers['authorization'] !== expected) {
  return res.status(401).end();
}
```

### Webhook Payload Structure

```json
{
  "event": "checkout.order.completed",
  "payload": {
    "orderId": "OMO...",
    "merchantId": "MERCHANT_ID",
    "merchantOrderId": "ORD-abc123",
    "state": "COMPLETED",
    "amount": 1000,
    "expireAt": 1724866793837,
    "metaInfo": { "udf1": "..." },
    "paymentDetails": [
      {
        "paymentMode": "UPI_INTENT",
        "transactionId": "OM...",
        "timestamp": 1724866793837,
        "amount": 1000,
        "state": "COMPLETED",
        "splitInstruments": [
          {
            "amount": 1000,
            "rail": { "type": "UPI", "upiTransactionId": "...", "vpa": "..." },
            "instrument": { "type": "ACCOUNT", "accountType": "SAVINGS" }
          }
        ]
      }
    ]
  }
}
```

### Event Types

| Event | Trigger |
|---|---|
| `checkout.order.completed` | Order paid successfully |
| `checkout.order.failed` | Payment failed |
| `pg.refund.accepted` | Refund accepted by PhonePe |
| `pg.refund.completed` | Refund credited to customer |
| `pg.refund.failed` | Refund processing failed |

### Webhook Handling Rules

- **Always use `payload.state`** to determine final status, not just the event name.
- **Always use `event` field** to identify event type — ignore any `type` field inside the payload.
- **Do not use strict deserialization** — PhonePe may add new fields; use a permissive JSON parser.
- **Respond `200` immediately** to acknowledge receipt before any async processing.
- `expireAt` and `timestamp` are in **epoch milliseconds**.

---

## 7. Error Handling & Edge Cases

### SDK Callback Status vs. Verified Status

| SDK `status` | Meaning | Action |
|---|---|---|
| `SUCCESS` | SDK flow completed | Still verify via Order Status API |
| `FAILURE` | User failed / cancelled | Verify; may retry |
| `INTERRUPTED` | App backgrounded / deep link issue | Always verify; do not assume failed |

> **Never fulfil an order based solely on the SDK `SUCCESS` callback.** Always confirm via backend.

### Common Error Codes

| Error Code | Source | Description | Action |
|---|---|---|---|
| `INVALID_MPIN` | Customer | Wrong UPI PIN | Let user retry |
| `AUTHORIZATION_ERROR` | Bank | Bank declined | Show failure, suggest different instrument |
| `PAYMENT_DECLINED` | PhonePe | Transaction declined | Show failure message |
| `TRANSACTION_NOT_FOUND` | API | Invalid merchant order ID | Check ID format |
| `MERCHANT_ORDER_MAPPING_NOT_FOUND` | API | Order doesn't exist in PhonePe system | Check if order was created |
| `ORDER_EXPIRED` | PhonePe | Order past `expireAfter` | Create a new order |

### Edge Cases

**Token expiry:**
- Cache `access_token` using `expires_at`. Refresh at least 60s before expiry.
- If a request returns `401`, immediately refresh token and retry once.

**Duplicate orders:**
- `merchantOrderId` must be globally unique. Use UUIDs.
- If a Create Order call fails mid-response, do not re-use the same `merchantOrderId` — generate a new one.

**App backgrounded during payment:**
- SDK returns `INTERRUPTED`.
- On app foreground, call Order Status API to check real state.
- Implement a background job or webhook to update status.

**Webhook delivery failure:**
- PhonePe retries webhooks multiple times.
- Your webhook endpoint must be idempotent — processing the same event twice must not double-credit/fulfill.
- Use `merchantOrderId` as an idempotency key in your DB.

**Partial refunds:**
- Allowed. Sum of all refund amounts must not exceed original `amount`.
- Each refund requires a unique `merchantRefundId`.

**PENDING state timeout:**
- After polling 5 times with increasing delays and status remains PENDING, mark as "processing" in your DB.
- The webhook will eventually deliver the terminal state.
- Do NOT cancel or assume failure while PENDING.

---

## 8. UAT Testing & Go-Live Checklist

### Sandbox Test Credentials

| Field | Value |
|---|---|
| `merchantId` | `PGTESTPAYUAT` |
| `saltKey` | `099eb0cd-02cf-4e2a-8aca-3e6c6aff0399` |
| `saltIndex` | `1` |
| Environment | `SANDBOX` |
| Auth URL | `https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token` |

Use test mobile numbers/cards provided by PhonePe during UAT (contact `merchant-integration@phonepe.com` for test SIM/credentials).

### UAT Checklist

- [ ] Auth token fetched and cached correctly
- [ ] Order created with all mandatory fields
- [ ] SDK initializes successfully on Android and iOS
- [ ] `startTransaction` called with valid `orderId`, `token`, `merchantId`
- [ ] iOS `appSchema` URL registered correctly and redirects back to app
- [ ] SDK callback received for SUCCESS, FAILURE, and INTERRUPTED
- [ ] Order Status API called and returns correct terminal state
- [ ] Webhook received and `Authorization` header verified correctly
- [ ] Order fulfilled only after `COMPLETED` state confirmed
- [ ] Refund flow tested: initiate, receive `pg.refund.completed` webhook
- [ ] PENDING state polling works without hanging the app
- [ ] Duplicate `merchantOrderId` rejected gracefully
- [ ] Expired order handled (create new order flow)
- [ ] Logging disabled in SDK (`enableLogging: false`) for production build

### SDK Flutter Environment Values

| String | Maps To |
|---|---|
| `'SANDBOX'` | UAT / Test environment |
| `'PRODUCTION'` | Live environment |

> Any unknown value defaults to `PRODUCTION` — always pass the correct string explicitly.

### Go-Live Steps

1. Switch `PHONEPE_ENV=PRODUCTION` in backend `.env`
2. Update `_environment = 'PRODUCTION'` in Flutter service
3. Obtain production `client_id`, `client_secret`, `merchantId` from dashboard
4. Configure production webhook URL in Dashboard
5. Submit UAT test evidence to PhonePe for merchant approval
6. Enable production mode on PhonePe Business Dashboard

---

## Quick Reference: API Endpoints Summary

| Operation | Method | Sandbox URL |
|---|---|---|
| Get Auth Token | POST | `.../pg-sandbox/v1/oauth/token` |
| Create Order | POST | `.../pg-sandbox/checkout/v2/sdk/order` |
| Order Status | GET | `.../pg-sandbox/checkout/v2/order/{merchantOrderId}/status` |
| Initiate Refund | POST | `.../pg-sandbox/checkout/v2/order/refund` |

All production URLs replace `api-preprod.phonepe.com/apis/pg-sandbox` with `api.phonepe.com/apis/pg` (and auth URL uses `api.phonepe.com/apis/identity-manager`).

---

*Document compiled from PhonePe Developer Portal — [developer.phonepe.com/payment-gateway](https://developer.phonepe.com/payment-gateway)*  
*Support: merchant-integration@phonepe.com | Sample App: [github.com/PhonePe/phonepe-pg-sdk-flutter](https://github.com/PhonePe/phonepe-pg-sdk-flutter)*
