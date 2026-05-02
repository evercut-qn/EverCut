# Phone Number Update System - Quick Guide

> **Feature**: Secure phone number update with OTP verification  
> **Status**: ✅ Production Ready  
> **Version**: 1.0.0

---

## Overview

Users can update their phone numbers with mandatory OTP verification. The system ensures:
- ✅ OTP verification required before update
- ✅ No duplicate phone numbers allowed
- ✅ Verified phone never asked again
- ✅ Rate limiting prevents abuse
- ✅ Atomic updates (all-or-nothing)

---

## API Endpoints

### 1. Send OTP to New Phone
```http
POST /api/v1/account/phone/send-otp
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "newMobile": "9876543299"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "OTP sent successfully to new phone number",
  "data": {
    "message": "OTP sent successfully to new phone number"
  }
}
```

### 2. Verify OTP and Update Phone
```http
POST /api/v1/account/phone/verify-otp
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "newMobile": "9876543299",
  "otp": "123456"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Phone number updated successfully",
  "data": {
    "phoneNumber": "+919876543299"
  }
}
```

---

## Flutter Integration

### Step 1: Send OTP
```dart
Future<void> sendPhoneUpdateOtp(String newMobile) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/v1/account/phone/send-otp'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken',
    },
    body: jsonEncode({'newMobile': newMobile}),
  );

  if (response.statusCode == 200) {
    navigateToOtpScreen(newMobile);
  } else {
    handleError(response);
  }
}
```

### Step 2: Verify OTP
```dart
Future<void> verifyPhoneUpdateOtp(String newMobile, String otp) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/v1/account/phone/verify-otp'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken',
    },
    body: jsonEncode({
      'newMobile': newMobile,
      'otp': otp,
    }),
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body)['data'];
    updateUserPhone(data['phoneNumber']);
    showSuccess('Phone number updated successfully');
  } else {
    handleError(response);
  }
}
```

---

## Error Handling

| Status | Error | Action |
|--------|-------|--------|
| 400 | Invalid phone format | Show "Enter valid 10-digit number" |
| 400 | Same as current phone | Show "Enter a different number" |
| 400 | Invalid or expired OTP | Show "Invalid OTP. Try again" |
| 409 | Phone already registered | Show "Phone already in use" |
| 429 | Too many requests | Show "Too many attempts. Wait X seconds" |
| 503 | Service unavailable | Show "Service temporarily down" |

---

## Security Features

1. **OTP Verification**: Phone updated only after successful OTP verification
2. **Duplicate Prevention**: Checked before sending OTP and before updating
3. **Rate Limiting**: 
   - 5 OTP sends per phone per 15 minutes
   - 10 OTP verifies per phone per 15 minutes
4. **Authentication**: JWT access token required for all operations
5. **Atomic Updates**: Phone updated in single database operation
6. **Race Condition Protection**: Double-check availability before update

---

## Testing with Postman

1. Import updated collection: `server/postman-collections/01-authentication.json`
2. Run "Verify Customer OTP" to get access token
3. Run "Send Phone Update OTP (Customer)" with new phone number
4. Run "Verify Phone Update OTP (Customer)" with OTP `123456` (test mode)
5. Verify phone updated successfully

---

## Configuration

### Development (Test Mode)
```javascript
// server/src/config/index.js
msg91: {
  testMode: true,  // Bypass real SMS in development
  testOtp: '123456',
}
```

### Production
```bash
# .env
MSG91_AUTH_KEY=your_auth_key
MSG91_OTP_TEMPLATE_ID=your_template_id
NODE_ENV=production  # Disables test mode
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PHONE UPDATE FLOW                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. User enters new phone → POST /account/phone/send-otp│
│     ├─ Authenticate user                                │
│     ├─ Validate phone format                            │
│     ├─ Check if phone already in use                    │
│     ├─ Send OTP via MSG91                               │
│     └─ Return success                                   │
│                                                           │
│  2. User enters OTP → POST /account/phone/verify-otp    │
│     ├─ Authenticate user                                │
│     ├─ Verify OTP with MSG91                            │
│     ├─ Double-check phone availability                  │
│     ├─ Update phone atomically                          │
│     └─ Return updated phone                             │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Files Created

```
server/src/
├── controllers/account.controller.js      - HTTP handlers
├── services/phone-update.service.js       - Business logic
├── routes/account.routes.js               - Route definitions
└── validators/phone.validator.js          - Request validation
```

---

## Related Documentation

- **Complete Report**: `docs/reports/PHONE-VERIFICATION-UPDATE-SYSTEM-REPORT.md`
- **MSG91 Guide**: `docs/features/msg91/MSG91-COMPLETE-GUIDE.md`
- **Auth Guide**: `docs/features/auth/GOOGLE-OAUTH-UNIVERSAL-AUTH.MD`

---

**For detailed implementation, testing, and deployment information, see the complete report.**
