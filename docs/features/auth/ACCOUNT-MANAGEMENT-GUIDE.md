# Account Management System - Centralized Updates

> **Feature**: Centralized phone and email updates  
> **Status**: ✅ Production Ready  
> **Version**: 2.0.0

---

## Overview

All phone and email updates are now centralized under the `/account` endpoint. This ensures:
- ✅ **Single source of truth** for contact information updates
- ✅ **Consistent security** across all user types (customers, barbers, admins)
- ✅ **Phone verification** via OTP before updates
- ✅ **Email verification flag** for future verification implementation
- ✅ **No scattered updates** across profile endpoints

---

## Architecture Changes

### Before (Scattered Updates)
```
❌ PUT /customers/me { email: "new@email.com" }
❌ PATCH /shops/me { email: "new@email.com" }
❌ Multiple locations, inconsistent validation
```

### After (Centralized Updates)
```
✅ PUT /account/email { newEmail: "new@email.com" }
✅ POST /account/phone/send-otp { newMobile: "9876543299" }
✅ POST /account/phone/verify-otp { newMobile: "9876543299", otp: "123456" }
✅ Single location, consistent security
```

---

## API Endpoints

### 1. Update Email
```http
PUT /api/v1/account/email
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "newEmail": "updated@example.com"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Email updated successfully. Verification pending.",
  "data": {
    "email": "updated@example.com",
    "emailVerified": false
  }
}
```

**Features**:
- ✅ Duplicate email detection
- ✅ Same email rejection
- ✅ Sets `emailVerified: false` (ready for future verification)
- ✅ Works for all user types (customer, barber, admin)

### 2. Update Phone (2-Step Process)

#### Step 1: Send OTP
```http
POST /api/v1/account/phone/send-otp
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "newMobile": "9876543299"
}
```

#### Step 2: Verify OTP
```http
POST /api/v1/account/phone/verify-otp
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "newMobile": "9876543299",
  "otp": "123456"
}
```

**See**: `PHONE-UPDATE-GUIDE.md` for complete phone update documentation

---

## Profile Update Endpoints (Email Removed)

### Customer Profile Update
```http
PUT /api/v1/customers/me
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

firstName: Test
lastName: Customer
address: Church Street, Bengaluru
location: {"type":"Point","coordinates":[77.5946,12.9716]}
photo: [file]
```

**Removed**: `email` field (use `/account/email` instead)

### Barber Profile Update
```http
PATCH /api/v1/shops/me
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "shopName": "My Barber Shop",
  "firstName": "Test",
  "lastName": "Barber",
  "bio": "Professional barber",
  ...
}
```

**Removed**: `email` field (use `/account/email` instead)

---

## Flutter Integration

### Update Email
```dart
Future<void> updateEmail(String newEmail) async {
  final response = await http.put(
    Uri.parse('$baseUrl/api/v1/account/email'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken',
    },
    body: jsonEncode({'newEmail': newEmail}),
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body)['data'];
    updateUserEmail(data['email']);
    showSuccess('Email updated successfully');
  } else if (response.statusCode == 409) {
    showError('Email already in use');
  } else if (response.statusCode == 400) {
    showError('Invalid email or same as current');
  }
}
```

### Update Phone
See `PHONE-UPDATE-GUIDE.md` for complete Flutter integration

---

## Error Handling

### Email Update Errors
| Status | Error | Action |
|--------|-------|--------|
| 400 | Invalid email format | Show "Enter valid email address" |
| 400 | Same as current email | Show "Enter a different email" |
| 409 | Email already registered | Show "Email already in use" |

### Phone Update Errors
See `PHONE-UPDATE-GUIDE.md` for phone error handling

---

## Migration Guide

### For Frontend Developers

**Old Code (Remove)**:
```dart
// ❌ Don't update email via profile endpoints
await http.put(
  Uri.parse('$baseUrl/api/v1/customers/me'),
  body: {'email': 'new@email.com'},
);
```

**New Code (Use)**:
```dart
// ✅ Use centralized account endpoint
await http.put(
  Uri.parse('$baseUrl/api/v1/account/email'),
  body: {'newEmail': 'new@email.com'},
);
```

### For Backend Developers

**Changes Made**:
1. ✅ Removed `email` from `updateCustomerSchema` validator
2. ✅ Removed `email` from `updateBusinessSchema` validator
3. ✅ Removed email update logic from `user.service.js`
4. ✅ Removed email update logic from `shop.service.js`
5. ✅ Created centralized `email-update.service.js`
6. ✅ Added `/account/email` endpoint

---

## Security Features

### Email Updates
1. **Duplicate Prevention**: Email checked before update
2. **Same Email Rejection**: Prevents unnecessary updates
3. **Verification Flag**: `emailVerified: false` set automatically
4. **Authentication Required**: JWT access token mandatory
5. **Atomic Updates**: Email updated in single operation

### Phone Updates
See `PHONE-UPDATE-GUIDE.md` for phone security features

---

## Testing with Postman

### Test Email Update
1. Import collection: `server/postman-collections/01-authentication.json`
2. Run "Verify Customer OTP" to get access token
3. Run "Update Email (Customer)" with new email
4. Verify email updated with `emailVerified: false`

### Test Phone Update
See `PHONE-UPDATE-GUIDE.md` for phone testing

---

## Files Modified

### Services
- `server/src/services/user.service.js` - Removed email update logic
- `server/src/services/shop.service.js` - Removed email update logic

### Validators
- `server/src/validators/customer.validator.js` - Removed email field
- `server/src/validators/shop.validator.js` - Removed email field

### Postman Collections
- `server/scripts/regenerate-postman-collections.mjs` - Updated requests

---

## Files Created

### Services
- `server/src/services/email-update.service.js` - Centralized email updates

### Validators
- `server/src/validators/email.validator.js` - Email validation

### Controllers
- `server/src/controllers/account.controller.js` - Account management

### Routes
- `server/src/routes/account.routes.js` - Account endpoints

---

## Future Enhancements

### Email Verification (Planned)
1. Send verification email with token/link
2. Verify email via token
3. Set `emailVerified: true` after verification
4. Add email verification requirement for sensitive operations

### Phone Verification (Implemented)
- ✅ OTP-based phone verification
- ✅ Duplicate prevention
- ✅ Rate limiting
- ✅ Atomic updates

---

## Related Documentation

- **Phone Update Guide**: `docs/features/auth/PHONE-UPDATE-GUIDE.md`
- **Complete Report**: `docs/reports/PHONE-VERIFICATION-UPDATE-SYSTEM-REPORT.md`
- **MSG91 Guide**: `docs/features/msg91/MSG91-COMPLETE-GUIDE.md`

---

**All contact information updates are now centralized for security and consistency.**
