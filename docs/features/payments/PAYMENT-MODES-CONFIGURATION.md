# Payment Modes Configuration (PhonePe V2 Schema)

**Last Updated:** April 30, 2026  
**Based on:** [Official PhonePe Documentation](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment/configure-payment-modes)  
**Compatible with:** Flutter PhonePe SDK + Node.js Backend

---

## Overview

Configure payment methods using PhonePe's V2 schema for fine-grained control over which payment options customers see during checkout.

**File:** `server/src/config/index.js` (line ~155)  
**Property:** `config.payment.paymentModes`

---

## Quick Start

```javascript
// In server/src/config/index.js
payment: Object.freeze({
  // ... other business rules
  paymentModes: [{ type: 'UPI' }], // Change this
}),
```

**Examples:**
```javascript
// UPI only (current default)
paymentModes: [{ type: 'UPI' }],

// All payment methods
paymentModes: [],

// UPI + Cards
paymentModes: [{ type: 'UPI' }, { type: 'CARD' }],
```

---

## Payment Mode Types

| Type | Description |
|------|-------------|
| `UPI` | Unified Payments Interface |
| `CARD` | Credit/Debit Cards |
| `NET_BANKING` | Retail Net Banking |
| `CORPORATE_NET_BANKING` | Corporate Net Banking |
| `EMI` | Equated Monthly Installments |
| `WALLET` | Digital Wallets |

---

## Configuration Examples

### 1. UPI Only (Current Default - Recommended)

```javascript
payment: Object.freeze({
  // ... other config
  paymentModes: [{ type: 'UPI' }],
}),
```

**Benefits:**
- ✅ 80%+ adoption in India
- ✅ 0-1% transaction fees
- ✅ Instant settlement
- ✅ No chargebacks

### 2. UPI + Cards

```javascript
paymentModes: [{ type: 'UPI' }, { type: 'CARD' }],
```

### 3. UPI (PhonePe Only)

```javascript
paymentModes: [{ type: 'UPI', apps: ['phonepe'] }],
```

### 4. UPI (PhonePe + GPay)

```javascript
paymentModes: [{ type: 'UPI', apps: ['phonepe', 'gpay'] }],
```

### 5. UPI Intent Only (No QR/Collect)

```javascript
paymentModes: [{ type: 'UPI', flows: ['INTENT'] }],
```

### 6. Cards (Domestic Only)

```javascript
paymentModes: [{ type: 'CARD', geoScopes: ['DOMESTIC'] }],
```

### 7. Cards (Credit Cards Only)

```javascript
paymentModes: [{ type: 'CARD', types: ['CREDIT_CARD'] }],
```

### 8. Cards (Visa/Mastercard Only)

```javascript
paymentModes: [{ type: 'CARD', networks: ['VISA', 'MASTER_CARD'] }],
```

### 9. Net Banking (Specific Banks)

```javascript
paymentModes: [{ type: 'NET_BANKING', banks: ['HDFC', 'ICIC', 'SBIN'] }],
```

### 10. All Payment Methods

```javascript
paymentModes: [],
```

---

## Advanced Configuration

### UPI Configuration Options

```javascript
{
    type: 'UPI',
    flows: ['INTENT', 'COLLECT', 'QR'],        // Optional
    apps: ['phonepe', 'gpay', 'paytm'],        // Optional (lowercase)
    instruments: ['BANK_ACCOUNT', 'RUPAY_CC', 'CREDIT_LINE'], // Optional
}
```

**UPI Flows:**
- `INTENT` - App-to-app payment
- `COLLECT` - VPA-based collect request
- `QR` - QR code scan

**UPI Apps:** (lowercase)
- `phonepe`, `gpay`, `paytm`, `amazonpay`, `bhim`, etc.

**UPI Instruments:**
- `BANK_ACCOUNT` - Regular bank account
- `RUPAY_CC` - RuPay credit card on UPI
- `CREDIT_LINE` - UPI credit line (BNPL)

### Card Configuration Options

```javascript
{
    type: 'CARD',
    types: ['CREDIT_CARD', 'DEBIT_CARD'],      // Optional
    networks: ['VISA', 'MASTER_CARD', 'RUPAY', 'AMEX', 'DINERS_CLUB'], // Optional
    variants: ['CONSUMER', 'PREMIUM', 'SUPER_PREMIUM', 'CORPORATE'], // Optional
    geoScopes: ['DOMESTIC', 'INTERNATIONAL'],  // Optional
}
```

**Card Types:**
- `CREDIT_CARD`
- `DEBIT_CARD`

**Card Networks:**
- `VISA`
- `MASTER_CARD`
- `RUPAY`
- `AMEX`
- `DINERS_CLUB`

**Card Variants:**
- `CONSUMER` - Standard consumer cards
- `PREMIUM` - Premium cards with rewards
- `SUPER_PREMIUM` - Signature/Infinite/World Elite
- `CORPORATE` - Corporate/business cards

**Geo Scopes:**
- `DOMESTIC` - Indian-issued cards
- `INTERNATIONAL` - Foreign-issued cards

### Net Banking Configuration Options

```javascript
{
    type: 'NET_BANKING',
    banks: ['HDFC', 'ICIC', 'SBIN', 'UTIB'], // Optional (uppercase)
}
```

**Common Bank Codes:**
- `HDFC` - HDFC Bank
- `ICIC` - ICICI Bank
- `SBIN` - State Bank of India
- `UTIB` - Axis Bank
- `YESB` - Yes Bank

### EMI Configuration Options

```javascript
{
    type: 'EMI',
    types: ['CREDIT_CARD'], // Optional
}
```

### Wallet Configuration Options

```javascript
{
    type: 'WALLET',
    wallets: ['PHONEPE'], // Optional
}
```

---

## Flutter Integration

### Backend Response (Node.js)

```javascript
// POST /api/v1/payments
{
  "success": true,
  "data": {
    "paymentId": "65f1a2b3c4d5e6f7g8h9i0j1",
    "bookingId": "65e1a2b3c4d5e6f7g8h9i0j1",
    "merchantOrderId": "EC-65e1a2b3c4d5e6f7g8h9i0j1-1735689600000-a1b2c3d4",
    "orderId": "OMO2604301118589567301213",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "merchantId": "MERCHANTUAT",
    "amountInPaisa": 31300,
    "amountInRupees": 313,
    "currency": "INR",
    "state": "PENDING",
    "expiresAt": 1735690800000,
    "gateway": "phonepe",
    "paymentFlow": "PHONEPE_SDK"
  }
}
```

### Flutter SDK Usage

```dart
import 'package:phonepe_payment_sdk/phonepe_payment_sdk.dart';

// 1. Initialize SDK (once in app)
await PhonePePaymentSdk.init(
  environment: Environment.sandbox, // or Environment.production
  merchantId: "MERCHANTUAT",
  appId: null,
  enableLogging: true,
);

// 2. Create payment order (call your backend)
final response = await http.post(
  Uri.parse('$baseUrl/api/v1/payments'),
  headers: {
    'Authorization': 'Bearer $accessToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({'bookingId': bookingId}),
);

final paymentData = jsonDecode(response.body)['data'];

// 3. Start payment with PhonePe SDK
final result = await PhonePePaymentSdk.startPgTransaction(
  body: paymentData['token'],
  callbackUrl: '$baseUrl/api/v1/payments/callback',
  checksum: '', // Not needed for SDK flow
  packageName: 'com.yourapp.package',
);

// 4. Handle result
if (result != null) {
  final status = result['status'];
  
  if (status == 'SUCCESS') {
    // Verify with backend
    await verifyPayment(paymentData['paymentId']);
  } else if (status == 'FAILURE') {
    // Handle failure
    showError('Payment failed');
  }
}
```

**Payment modes configured in backend automatically apply to Flutter SDK!**

---

## How It Works

### V2 Schema Structure

```javascript
// In payment.service.js
const PAYMENT_MODE_CONFIG = {
    enabledPaymentModes: [
        { type: 'UPI' },
        { type: 'CARD', geoScopes: ['DOMESTIC'] },
    ],
};

// Sent to PhonePe API
{
    "paymentFlow": {
        "type": "PG_CHECKOUT",
        "paymentModeConfig": {
            "version": "V2",
            "enabledPaymentModes": [
                { "type": "UPI" },
                { "type": "CARD", "geoScopes": ["DOMESTIC"] }
            ]
        }
    }
}

// Flutter SDK receives token with these restrictions embedded
// User sees only UPI and domestic cards in PhonePe app
```

### Wildcard Behavior

Omitting a field means "match all values for that dimension":

```javascript
// This allows ALL UPI (all flows, all apps, all instruments)
{ type: 'UPI' }

// This allows UPI intent only, but ALL apps
{ type: 'UPI', flows: ['INTENT'] }

// This allows ALL credit cards (all networks, all variants, all geographies)
{ type: 'CARD', types: ['CREDIT_CARD'] }
```

### AND Logic

All fields within a constraint are evaluated with AND logic:

```javascript
{
    type: 'CARD',
    types: ['CREDIT_CARD'],
    networks: ['VISA'],
    geoScopes: ['DOMESTIC']
}
// Result: Only domestic Visa credit cards
```

---

## Production Recommendations

### For Indian Market (Current Default)

```javascript
const PAYMENT_MODE_CONFIG = {
    enabledPaymentModes: [
        { type: 'UPI' },
    ],
};
```

**Why:**
- 80%+ users prefer UPI
- Lowest fees (0-1%)
- Instant settlement
- No chargebacks
- Simple UX

### For Broader Coverage

```javascript
const PAYMENT_MODE_CONFIG = {
    enabledPaymentModes: [
        { type: 'UPI' },
        { type: 'CARD', geoScopes: ['DOMESTIC'] },
    ],
};
```

**Why:**
- Covers 95%+ users
- UPI for most users
- Domestic cards as fallback
- Reasonable fees

### For Maximum Coverage

```javascript
const PAYMENT_MODE_CONFIG = {
    enabledPaymentModes: [],
};
```

**Why:**
- All payment methods
- International users
- Maximum flexibility

---

## Implementation Details

**Configuration:** `server/src/config/index.js` (line ~155)
```javascript
payment: Object.freeze({
  platformFeeSingle: 4,
  platformFeeBundle: 10,
  // ... other business rules
  paymentModes: [{ type: 'UPI' }], // Change this
}),
```

**Usage:** `server/src/services/payment.service.js` (line ~570)
```javascript
paymentModeConfig: config.payment.paymentModes?.length > 0
    ? {
        version: 'V2',
        enabledPaymentModes: config.payment.paymentModes,
    }
    : null,
```

---

## Testing

1. Edit `server/src/config/index.js` (line ~155)
2. Update `paymentModes` array in `payment` config
3. Restart server: `cd server && npm run dev`
4. Create payment via Postman or Flutter app
5. Verify only configured payment methods appear in PhonePe SDK

---

## References

- [PhonePe Payment Mode Configuration](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment/configure-payment-modes)
- [PhonePe Payment Mode Reference](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment/payment-mode)
- [PhonePe V2 Schema Documentation](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment/configure-payment-modes)
- [PhonePe Flutter SDK](https://pub.dev/packages/phonepe_payment_sdk)

---

## Summary

✅ **Official PhonePe V2 Schema** - Based on official documentation  
✅ **Fine-Grained Control** - Configure flows, apps, networks, variants, etc.  
✅ **Flutter Compatible** - Works seamlessly with PhonePe Flutter SDK  
✅ **Simple Configuration** - Single array in service file  
✅ **Production-Ready** - Current default: UPI only (recommended)  
✅ **Node.js + Flutter** - Perfect integration between backend and mobile app
