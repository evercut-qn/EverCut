# Payout Details Management Guide

**Feature:** Complete payout account details management for barber payouts  
**Date:** 2026-05-03  
**Status:** ✅ IMPLEMENTED

---

## OVERVIEW

This guide documents the complete payout details management system for barber shops. Payout details are required for receiving payouts from completed bookings.

### Key Features
- ✅ Dedicated bank details endpoints (separate from general business info)
- ✅ Optional capture during onboarding
- ✅ Secure update with validation
- ✅ Masked account numbers in responses
- ✅ Verification status tracking
- ✅ Beneficiary management integration

---

## API ENDPOINTS

### 1. GET Payout Details

**Endpoint:** `GET /api/v1/shops/me/payout-details`

**Purpose:** Retrieve current bank account details with verification status

**Authentication:** Required (BARBER role)

**Response:**
```json
{
  "success": true,
  "message": "Bank details fetched",
  "data": {
    "accountHolderName": "John Doe",
    "bankName": "State Bank of India",
    "bankAccountLast4": "******5678",
    "ifsc": "SBIN0001234",
    "upiId": "john@paytm",
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
- `accountHolderName`: Name on the bank account
- `bankName`: Name of the bank
- `bankAccountLast4`: Masked account number (shows last 4 digits only)
- `ifsc`: IFSC code of the bank branch
- `upiId`: UPI ID for payouts
- `verificationStatus`: One of `pending`, `verified`, `failed`
- `isVerified`: Boolean indicating if account is verified
- `verifiedAt`: Timestamp when account was verified
- `beneficiaryId`: Payout gateway beneficiary ID
- `beneficiaryCreatedAt`: When beneficiary was created in payout gateway
- `canReceivePayouts`: Boolean indicating if shop can receive payouts

---

### 2. UPDATE Payout Details

**Endpoint:** `PATCH /api/v1/shops/me/payout-details`

**Purpose:** Update bank account details

**Authentication:** Required (BARBER role)

**Request Body:**
```json
{
  "accountHolderName": "John Doe",
  "bankName": "State Bank of India",
  "bankAccount": "12345678901234",
  "ifsc": "SBIN0001234",
  "upiId": "john@paytm"
}
```

**Validation Rules:**
- `accountHolderName`: Required, 1-100 characters
- `bankName`: Required, 1-120 characters
- `bankAccount`: Required, 6-34 digits only
- `ifsc`: Required, valid IFSC format (XXXX0XXXXXX)
- `upiId`: Required, valid UPI ID

**Response:**
```json
{
  "success": true,
  "message": "Bank details updated successfully",
  "data": {
    "accountHolderName": "John Doe",
    "bankName": "State Bank of India",
    "bankAccountLast4": "******1234",
    "ifsc": "SBIN0001234",
    "upiId": "john@paytm",
    "verificationStatus": "pending",
    "isVerified": false,
    "verifiedAt": null,
    "beneficiaryId": null,
    "beneficiaryCreatedAt": null,
    "canReceivePayouts": false
  }
}
```

**Important Notes:**
- If bank account or IFSC changes, verification status resets to `pending`
- Beneficiary will need to be re-verified in payout gateway
- Previous beneficiary ID is retained for tracking

---

## ONBOARDING INTEGRATION

### Optional Bank Details During Onboarding

Bank details can be optionally provided during barber onboarding:

**Endpoint:** `POST /api/v1/onboarding/barbers`

**Request Body (partial):**
```json
{
  "shopName": "John's Barbershop",
  "accountHolderName": "John Doe",
  "bankName": "State Bank of India",
  "upiId": "john@paytm",
  "bankAccount": "12345678901234",
  "ifsc": "SBIN0001234",
  ...
}
```

**Behavior:**
- `bankAccount` and `ifsc` are **OPTIONAL** during onboarding
- If provided, they are stored with `verificationStatus: 'pending'`
- If not provided, barber can add them later via update endpoint
- Barber must provide bank details before receiving first payout

---

## VALIDATION DETAILS

### Bank Account Number
- **Format:** 6-34 digits only
- **Pattern:** `/^\d{6,34}$/`
- **Examples:**
  - ✅ Valid: `123456789012`
  - ✅ Valid: `1234567890123456`
  - ❌ Invalid: `12345` (too short)
  - ❌ Invalid: `ABCD1234` (contains letters)

### IFSC Code
- **Format:** 4 letters + 0 + 6 alphanumeric characters
- **Pattern:** `/^[A-Z]{4}0[A-Z0-9]{6}$/i`
- **Examples:**
  - ✅ Valid: `SBIN0001234`
  - ✅ Valid: `HDFC0000123`
  - ❌ Invalid: `SBIN1001234` (5th character must be 0)
  - ❌ Invalid: `SBI0001234` (must be 4 letters)

---

## SECURITY CONSIDERATIONS

### 1. Account Number Masking
- Bank account numbers are **always masked** in API responses
- Only last 4 digits are shown: `******5678`
- Full account number is never exposed via API

### 2. Sensitive Data Handling
- Bank details are stored in `payoutConfig` subdocument
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
1. Barber provides/updates bank details
2. System sets `verificationStatus: 'pending'`
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
When bank details are provided/updated:
1. System stores details in `shop.payoutConfig`
2. Payout service creates beneficiary in Cashfree
3. Beneficiary ID is stored in `payoutConfig.beneficiaryId`
4. Verification status is tracked in `payoutConfig.verificationStatus`

### Payout Requirements
Before a payout can be initiated:
- ✅ Bank details must be provided
- ✅ Account must be verified (`verificationStatus: 'verified'`)
- ✅ Beneficiary must exist in payout gateway
- ✅ `canReceivePayouts` must be `true`

---

## ERROR HANDLING

### Common Errors

**1. Missing Required Fields**
```json
{
  "success": false,
  "message": "All bank details fields are required",
  "statusCode": 400
}
```

**2. Invalid Bank Account Format**
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

**3. Invalid IFSC Format**
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

**4. Shop Not Found**
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
- [ ] Verify account number is masked
- [ ] Verify verification status is correct

#### UPDATE Bank Details
- [ ] Update all bank details fields
- [ ] Update with valid bank account (6-34 digits)
- [ ] Update with valid IFSC code
- [ ] Attempt update with invalid bank account (too short)
- [ ] Attempt update with invalid bank account (contains letters)
- [ ] Attempt update with invalid IFSC (wrong format)
- [ ] Verify verification status resets to pending on change
- [ ] Verify previous beneficiary ID is retained

#### Onboarding
- [ ] Create barber with bank details
- [ ] Create barber without bank details
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
  "accountHolderName": "John Doe",
  "bankName": "State Bank of India",
  "bankAccount": "12345678901234",
  "ifsc": "SBIN0001234",
  "upiId": "john@paytm"
}
```

---

## MIGRATION NOTES

### Existing Shops
- Shops created before this feature will have `payoutConfig: undefined`
- They can add payout details via the update endpoint
- No data migration required

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
