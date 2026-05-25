# Onboarding Data Guide - Flutter Integration

> Status: Production ready  
> Last updated: May 12, 2026  
> Media stack: Cloudflare R2 direct upload with backend-confirmed media IDs

## Overview

Customer and barber onboarding endpoints accept JSON only. Media files are uploaded before onboarding through the R2 media flow:

1. Request a presigned upload URL from `POST /api/v1/media/onboarding/upload-url`.
2. Upload the binary file directly to R2 with `PUT {uploadUrl}`.
3. Confirm the object with `POST /api/v1/media/onboarding/confirm`.
4. Send the returned `mediaId` as `photoMediaId` in the onboarding JSON body.

The phone number is never sent during onboarding. It comes from the verified onboarding token.

## Authentication Flow

```text
User enters phone number
Backend sends OTP
User verifies OTP
Backend returns onboardingToken for new users
Client uploads media to R2 and confirms it
Client submits onboarding JSON with photoMediaId
Backend creates user, profile/shop, and returns accessToken + refreshToken
```

## Onboarding Media Upload

### Request Presigned URL

```http
POST /api/v1/media/onboarding/upload-url
Authorization: Bearer {onboardingToken}
Content-Type: application/json
```

```json
{
  "contentType": "image/jpeg",
  "sizeBytes": 245760,
  "purpose": "onboarding"
}
```

### Upload Directly To R2

```http
PUT {uploadUrl}
Content-Type: image/jpeg
```

The request body is the raw file bytes. Do not send the app API bearer token to the R2 URL.

### Confirm Upload

```http
POST /api/v1/media/onboarding/confirm
Authorization: Bearer {onboardingToken}
Content-Type: application/json
```

```json
{
  "mediaId": "01HXMEDIAEXAMPLE"
}
```

## Customer Onboarding

```http
POST /api/v1/onboarding/customers
Authorization: Bearer {onboardingToken}
Content-Type: application/json
```

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `firstName` | string | Yes | 1-50 chars |
| `lastName` | string | Yes | 1-50 chars |
| `email` | string | Yes | Valid email |
| `gender` | string | Yes | `male`, `female`, or `transgender` |
| `dateOfBirth` | string | Yes | `YYYY-MM-DD`, must be in the past |
| `address` | string | Yes | Human-readable address |
| `location` | object | Yes | GeoJSON point, `[longitude, latitude]` |
| `photoMediaId` | string | No | Confirmed onboarding media ID |

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "gender": "male",
  "dateOfBirth": "1994-06-15",
  "address": "Church Street, Bengaluru",
  "location": {
    "type": "Point",
    "coordinates": [77.5946, 12.9716]
  },
  "photoMediaId": "01HXMEDIAEXAMPLE"
}
```

## Barber Onboarding

```http
POST /api/v1/onboarding/barbers
Authorization: Bearer {onboardingToken}
Content-Type: application/json
```

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `firstName` | string | Yes | Owner first name |
| `lastName` | string | Yes | Owner last name |
| `email` | string | Yes | Valid email |
| `dateOfBirth` | string | Yes | `YYYY-MM-DD`, must be in the past |
| `gender` | string | Yes | `male`, `female`, or `transgender` |
| `shopName` | string | Yes | 1-100 chars |
| `category` | string | Yes | `Hair Salon`, `Beauty Salon`, `Barber Shop`, or `Doorstep Service` |
| `targetCustomers` | string | Yes | `men`, `women`, or `unisex` |
| `address` | string | Yes | Human-readable address |
| `location` | object | Yes | GeoJSON point, `[longitude, latitude]` |
| `amenities` | array | No | Shop amenities |
| `workingDays` | array | Yes | Day names |
| `workingHours` | object | Yes | `{ "openTime": "09:00", "closeTime": "20:00" }` |
| `breakTimes` | array | No | Optional `{ "start": "13:00", "end": "14:00" }` entries |
| `accountHolderName` | string | Yes | Payout account holder |
| `bankName` | string | Yes | Bank name |
| `bankAccount` | string | Yes | 6-34 digit payout bank account |
| `ifsc` | string | Yes | Valid IFSC code |
| `upiId` | string | No | Optional UPI ID |
| `pin` | string | Yes | 4 digit account PIN |
| `confirmPin` | string | Yes | Must match `pin` |
| `photoMediaId` | string | No | Confirmed onboarding media ID for owner/shop profile |

```json
{
  "firstName": "John",
  "lastName": "Barber",
  "email": "john.barber@example.com",
  "dateOfBirth": "1991-01-12",
  "gender": "male",
  "shopName": "John's Barber Studio",
  "category": "Barber Shop",
  "targetCustomers": "men",
  "address": "MG Road, Bengaluru",
  "location": {
    "type": "Point",
    "coordinates": [77.5946, 12.9716]
  },
  "amenities": ["Air Conditioning", "Waiting Area"],
  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  "workingHours": {
    "openTime": "09:00",
    "closeTime": "20:00"
  },
  "breakTimes": [
    {
      "start": "13:00",
      "end": "14:00"
    }
  ],
  "accountHolderName": "John Barber",
  "bankName": "HDFC Bank",
  "bankAccount": "12345678901234",
  "ifsc": "HDFC0001234",
  "pin": "1234",
  "confirmPin": "1234",
  "photoMediaId": "01HXMEDIAEXAMPLE"
}
```

## Success Response Shape

Both onboarding endpoints return the created `user`, the created `profile` (for customers) or `shop` (for barbers), and session tokens. Note that the `shop` profile returned during onboarding does not include the `photos` (gallery) array.

```json
{
  "success": true,
  "message": "Customer created",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "phoneNumber": "+919876543210",
      "email": "john.doe@example.com",
      "roleType": "CUSTOMER",
      "isActive": true
    },
    "profile": {
      "id": "507f1f77bcf86cd799439012",
      "firstName": "John",
      "lastName": "Doe",
      "photoUrl": "https://media.evercut.in/images/avatars/..."
    },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

## Flutter Notes

Use one authenticated API client for EverCut endpoints and a plain client for the R2 `PUT`. The R2 request must include a Content-Type header matching the contentType declared in the upload-url request. Do not send the onboarding bearer token to R2.

```dart
Future<String> uploadOnboardingPhoto({
  required Dio apiClient,
  required Dio uploadClient,
  required String onboardingToken,
  required File file,
}) async {
  final sizeBytes = await file.length();
  const contentType = 'image/jpeg';

  final presign = await apiClient.post(
    '/media/onboarding/upload-url',
    data: {
      'contentType': contentType,
      'sizeBytes': sizeBytes,
      'purpose': 'onboarding',
    },
    options: Options(headers: {'Authorization': 'Bearer $onboardingToken'}),
  );

  final data = presign.data['data'];

  await uploadClient.put(
    data['uploadUrl'],
    data: file.openRead(),
    options: Options(headers: { 'Content-Type': contentType }),
  );

  final confirm = await apiClient.post(
    '/media/onboarding/confirm',
    data: {'mediaId': data['mediaId']},
    options: Options(headers: {'Authorization': 'Bearer $onboardingToken'}),
  );

  return confirm.data['data']['mediaId'] as String;
}
```

## Error Responses

| Status | Cause |
|---:|---|
| 400 | Validation error, unsupported MIME type, mismatched upload metadata |
| 401 | Onboarding token expired or invalid |
| 404 | Confirmed media ID not found |
| 409 | Email or phone already registered |
| 413 | File size exceeds configured media limits |
