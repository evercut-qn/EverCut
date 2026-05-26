# Payout Details Management Guide

**Feature:** Complete payout account details management for barber payouts  
**Date:** 2026-05-03  
**Status:** ✅ IMPLEMENTED

---

## OVERVIEW

This guide documents the complete payout details management system for barber shops. A valid UPI ID is required for receiving payouts from completed bookings. Bank account fields are optional profile metadata and may be provided when available.

### Key Features
- ✅ Dedicated bank details endpoints (separate from general business info)
- ✅ Required UPI capture during onboarding
- ✅ Optional bank detail capture during onboarding and payout updates
- ✅ Secure update with validation
- ✅ Masked account numbers in responses
- ✅ Verification status tracking
- ✅ Beneficiary management integration

---

## API ENDPOINTS

### 1. GET Payout Details

**Endpoint:** `GET /api/v1/shops/me/payout-details`

**Purpose:** Retrieve current payout details with verification status

**Authentication:** Required (BARBER role)

**Response:**
```json
{
  "success": true,
  "message": "Payout details fetched",
  "data": {
    "upiId": "john@paytm",
    "accountHolderName": null,
    "bankName": null,
    "bankAccount": null,
    "ifsc": null,
    "verificationStatus": "verified",
    "isVerified": true,
    "verifiedAt": "2026-05-01T10:30:00.000Z",
    "beneficiaryId": "BENEF123456",
    "beneficiaryCreatedAt": "2026-05-01T10:25:00.000Z",
    "canReceivePayouts": true
  }
}
```

**Field Descriptions:**
- `upiId`: Required UPI ID for payouts
- `accountHolderName`: Optional name on the bank account
- `bankName`: Optional name of the bank
- `bankAccount`: Optional bank account number (displayed in full, unmasked when present)
- `ifsc`: Optional IFSC code of the bank branch
- `verificationStatus`: One of `pending`, `verified`, `failed`
- `isVerified`: Boolean indicating if account is verified
- `verifiedAt`: Timestamp when account was verified
- `beneficiaryId`: Payout gateway beneficiary ID
- `beneficiaryCreatedAt`: When beneficiary was created in payout gateway
- `canReceivePayouts`: Boolean indicating if shop can receive payouts

---

### 2. UPDATE Payout Details

**Endpoint:** `PATCH /api/v1/shops/me/payout-details`

**Purpose:** Update UPI payout details and optional bank account metadata

**Authentication:** Required (BARBER role)

**Request Body:**
```json
{
  "upiId": "john@paytm"
}
```

**Validation Rules:**
- `upiId`: Required, valid UPI ID format (`local-part@provider`)
- `accountHolderName`: Optional, 1-100 characters when provided
- `bankName`: Optional, 1-120 characters when provided
- `bankAccount`: Optional, 6-34 digits only when provided
- `ifsc`: Optional, valid IFSC format (XXXX0XXXXXX) when provided
- Omitted bank fields preserve existing values on payout-details updates
- `null` or empty optional bank fields clear the stored value

**Response:**
```json
{
  "success": true,
  "message": "Payout details updated successfully",
  "data": {
    "upiId": "john@paytm",
    "accountHolderName": null,
    "bankName": null,
    "bankAccount": null,
    "ifsc": null,
    "verificationStatus": "verified",
    "isVerified": true,
    "verifiedAt": "2026-05-01T10:30:00.000Z",
    "beneficiaryId": "BENEF123456",
    "beneficiaryCreatedAt": "2026-05-01T10:25:00.000Z",
    "canReceivePayouts": false
  }
}
```

**Important Notes:**
- If bank account or IFSC changes, verification status resets to `pending`
- Updating only `upiId` does not reset bank verification status
- Beneficiary will need to be re-verified in payout gateway
- Previous beneficiary ID is retained for tracking

---

## ONBOARDING INTEGRATION

### Required UPI During Onboarding

UPI ID is required during barber onboarding. Bank account fields are optional and are stored as `null` when omitted, empty, or explicitly sent as `null`.

**Endpoint:** `POST /api/v1/onboarding/barbers`

**Request Body (partial):**
```json
{
  "shopName": "John's Barbershop",
  "upiId": "john@paytm",
  ...
}
```

**Behavior:**
- `upiId` is **REQUIRED** during onboarding and payout-details updates
- `accountHolderName`, `bankName`, `bankAccount`, and `ifsc` are optional
- Optional bank fields are stored on the Barber profile when supplied
- Bank fields can be added, partially updated, or cleared through the payout update endpoint

---

## VALIDATION DETAILS

### UPI ID
- **Required:** Yes
- **Format:** `local-part@provider`
- **Pattern:** `/^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{1,63}$/`
- **Examples:**
  - ✅ Valid: `john@paytm`
  - ✅ Valid: `test.barber@upi`
  - ❌ Invalid: `john` (missing provider)
  - ❌ Invalid: `@paytm` (missing local part)

### Bank Account Number
- **Required:** No
- **Format:** 6-34 digits only
- **Pattern:** `/^\d{6,34}$/`
- **Examples:**
  - ✅ Valid: `123456789012`
  - ✅ Valid: `1234567890123456`
  - ❌ Invalid: `12345` (too short)
  - ❌ Invalid: `ABCD1234` (contains letters)

### IFSC Code
- **Required:** No
- **Format:** 4 letters + 0 + 6 alphanumeric characters
- **Pattern:** `/^[A-Z]{4}0[A-Z0-9]{6}$/i`
- **Examples:**
  - ✅ Valid: `SBIN0001234`
  - ✅ Valid: `HDFC0000123`
  - ❌ Invalid: `SBIN1001234` (5th character must be 0)
  - ❌ Invalid: `SBI0001234` (must be 4 letters)

---

## SECURITY CONSIDERATIONS

### 1. Account Number Display
- Bank account numbers are **displayed in full** (unmasked) in API responses for authorized barber profile views
- No masking or redaction is applied to `bankAccount` in the backend serializer or mobile app layer

### 2. Sensitive Data Handling
- Bank account, IFSC, account holder, bank name, and UPI ID are stored on the Barber profile
- Gateway beneficiary metadata is stored in the Barber profile `payoutConfig` subdocument
- Verification status is system-managed (cannot be set by user)
- Beneficiary ID is system-managed (set by payout service)

### 3. Recommended Enhancements (Future)
- [ ] Require PIN verification for bank detail updates
- [ ] Rate limiting (max 3 updates per day)
- [ ] Audit trail for all bank detail changes
- [ ] Email notification on bank detail changes
- [ ] Encryption at rest for bank account numbers

---

## VERIFICATION FLOW

### Automatic Verification
1. Barber provides/updates UPI and optional bank details
2. System sets `verificationStatus: 'pending'` when bank account or IFSC changes
3. Payout service creates/updates beneficiary in gateway
4. Gateway verifies bank account (penny drop or similar)
5. System updates `verificationStatus: 'verified'` and sets `verifiedAt`
6. Barber can now receive payouts

### Verification Statuses
- **`pending`**: Bank details provided but not yet verified
- **`verified`**: Bank account verified by payout gateway
- **`failed`**: Verification failed (invalid account/IFSC)

---

## INTEGRATION WITH PAYOUT SYSTEM

### Beneficiary Creation
When payout details are provided/updated:
1. System stores payout destination details on the Barber profile
2. Payout service creates a Cashfree beneficiary using the required UPI ID
3. Beneficiary ID is stored in `barber.payoutConfig.beneficiaryId`
4. Verification status is tracked in `barber.payoutConfig.verificationStatus`

### Payout Requirements
Before a payout can be initiated:
- ✅ Valid UPI ID must be provided
- ✅ Account must be verified (`verificationStatus: 'verified'`)
- ✅ Beneficiary must exist in payout gateway
- ✅ `canReceivePayouts` must be `true`

---

## ERROR HANDLING

### Common Errors

**1. Missing Required UPI**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": ["upiId is required"]
  },
  "statusCode": 400
}
```

**2. Invalid UPI Format**
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": ["upiId must be a valid UPI ID"]
  },
  "statusCode": 400
}
```

**3. Invalid Bank Account Format**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "bankAccount must be 6-34 digits"
  ],
  "statusCode": 400
}
```

**4. Invalid IFSC Format**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "ifsc must be a valid IFSC code (e.g., SBIN0001234)"
  ],
  "statusCode": 400
}
```

**5. Shop Not Found**
```json
{
  "success": false,
  "message": "Shop profile not found",
  "statusCode": 404
}
```

---

## TESTING

### Manual Testing Checklist

#### GET Bank Details
- [ ] Fetch bank details for shop with no bank details
- [ ] Fetch bank details for shop with unverified details
- [ ] Fetch bank details for shop with verified details
- [ ] Verify account number is unmasked and fully displayed
- [ ] Verify verification status is correct

#### UPDATE Bank Details
- [ ] Update only required UPI ID
- [ ] Update all bank details fields
- [ ] Update with all bank fields omitted
- [ ] Clear optional bank fields with `null` or empty strings
- [ ] Update with valid bank account (6-34 digits)
- [ ] Update with valid IFSC code
- [ ] Attempt update with invalid bank account (too short)
- [ ] Attempt update with invalid bank account (contains letters)
- [ ] Attempt update with invalid IFSC (wrong format)
- [ ] Verify verification status resets to pending on change
- [ ] Verify previous beneficiary ID is retained

#### Onboarding
- [ ] Create barber with required UPI and bank details
- [ ] Create barber with required UPI and without bank details
- [ ] Reject barber onboarding without UPI
- [ ] Verify bank details are stored correctly
- [ ] Verify verification status is set to pending

---

## POSTMAN COLLECTION

### Collection Structure
```
07-barber-profile-shop/
├── Get My Shop Profile
├── Update Business Info
├── Get Payout Details
├── Update Payout Details
├── Update PIN
├── Update Profile Picture
├── Update Cover Image
└── Toggle Shop Status
```

### Sample Requests

**Get Payout Details:**
```
GET {{baseUrl}}/shops/me/payout-details
Authorization: Bearer {{barberAccessToken}}
```

**Update Payout Details:**
```
PATCH {{baseUrl}}/shops/me/payout-details
Authorization: Bearer {{barberAccessToken}}
Content-Type: application/json

{
  "upiId": "john@paytm"
}
```

---

## MIGRATION NOTES

### API Compatibility
- No backward compatibility is retained for the old shop-scoped payment endpoints.
- Payout details are managed only through `GET /shops/me/payout-details` and `PATCH /shops/me/payout-details`.
- General shop profile updates use `PATCH /shops/me` and do not accept payout fields.

---

## FUTURE ENHANCEMENTS

### Priority 1 (Security)
- [ ] Require PIN verification for bank detail updates
- [ ] Add rate limiting (max 3 updates per day)
- [ ] Implement audit trail for all changes
- [ ] Send email notification on bank detail changes

### Priority 2 (Features)
- [ ] Manual verification trigger endpoint
- [ ] Bank account verification history
- [ ] Support for multiple bank accounts
- [ ] Preferred payout method selection

### Priority 3 (UX)
- [ ] Bank name auto-suggestion from IFSC
- [ ] IFSC code lookup/validation
- [ ] Account holder name validation
- [ ] Payout eligibility checker

---

## RELATED DOCUMENTATION

- [Cashfree Payout Implementation Guide](./CASHFREE-SUBSCRIPTIONS-IMPLEMENTATION-GUIDE.md)
- [Payment Gateway Implementation Guide](./PAYMENT-GATEWAY-IMPLEMENTATION-GUIDE.md)
- [Payout API Research](../../research/PAYOUT-API-RESEARCH.md)
- [Backend Field Coverage Audit](../../reports/BACKEND-FIELD-COVERAGE-AUDIT.md)

---

**Document Status:** ✅ COMPLETE  
**Last Updated:** 2026-05-03  
**Maintained By:** Backend Team
