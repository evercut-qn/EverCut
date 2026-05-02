# Onboarding Data Guide - Flutter Integration

> **Feature**: Customer and Barber onboarding data requirements  
> **Status**: ✅ Production Ready  
> **Version**: 1.0.0  
> **Last Updated**: May 2, 2026

---

## 📋 Overview

This guide documents the exact data that Flutter app must send during onboarding for both **Customer** and **Barber** users.

### **Important Notes**
- ⚠️ **Phone number is NOT sent during onboarding** - it comes from the onboarding token (already verified via OTP)
- ✅ **Email is required** for both user types
- ✅ **Location is required** for both user types (GeoJSON format)
- ✅ **All data is validated** on the backend

---

## 🔐 Authentication Flow

```
1. User enters phone number
2. Backend sends OTP via MSG91
3. User enters OTP
4. Backend verifies OTP
5. If new user → Backend returns onboardingToken (30-minute validity)
6. Flutter uses onboardingToken to complete profile
7. Backend creates user + profile
8. Backend returns accessToken + refreshToken
```

---

## 👤 CUSTOMER ONBOARDING

### **Endpoint**
```http
POST /api/v1/onboarding/customers
Authorization: Bearer {onboardingToken}
Content-Type: multipart/form-data
```

### **Required Fields**

| Field | Type | Format | Example | Notes |
|-------|------|--------|---------|-------|
| `firstName` | String | 1-50 chars | "John" | Required |
| `lastName` | String | 1-50 chars | "Doe" | Required |
| `email` | String | Valid email | "john.doe@example.com" | Required |
| `gender` | String | Enum | "Male" | Male/Female/Other |
| `dateOfBirth` | String | YYYY-MM-DD | "1994-06-15" | Must be in past |
| `address` | String | Text | "Church Street, Bengaluru" | Required |
| `location` | String | GeoJSON | See below | Required |
| `photo` | File | Image | profile.jpg | JPEG/PNG |

### **Location Format**
```json
{
  "type": "Point",
  "coordinates": [77.5946, 12.9716]
}
```
**Note**: Coordinates are `[longitude, latitude]` order!

### **Flutter Example**
```dart
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

Future<Map<String, dynamic>> completeCustomerOnboarding({
  required String onboardingToken,
  required String firstName,
  required String lastName,
  required String email,
  required String gender,
  required String dateOfBirth,
  required String address,
  required double longitude,
  required double latitude,
  required File photoFile,
}) async {
  final request = http.MultipartRequest(
    'POST',
    Uri.parse('$baseUrl/api/v1/onboarding/customers'),
  );

  // Authorization header
  request.headers['Authorization'] = 'Bearer $onboardingToken';

  // Text fields
  request.fields['firstName'] = firstName;
  request.fields['lastName'] = lastName;
  request.fields['email'] = email;
  request.fields['gender'] = gender;
  request.fields['dateOfBirth'] = dateOfBirth;
  request.fields['address'] = address;
  
  // Location (GeoJSON format)
  request.fields['location'] = jsonEncode({
    'type': 'Point',
    'coordinates': [longitude, latitude],
  });

  // Profile photo
  request.files.add(await http.MultipartFile.fromPath(
    'photo',
    photoFile.path,
  ));

  // Send request
  final response = await request.send();
  final responseData = await response.stream.bytesToString();
  final jsonResponse = jsonDecode(responseData);

  if (response.statusCode == 201) {
    final data = jsonResponse['data'];
    
    // Save tokens for future requests
    await saveAccessToken(data['accessToken']);
    await saveRefreshToken(data['refreshToken']);
    
    return {
      'success': true,
      'user': data['user'],
      'profile': data['profile'],
      'accessToken': data['accessToken'],
      'refreshToken': data['refreshToken'],
    };
  } else {
    throw Exception(jsonResponse['message'] ?? 'Onboarding failed');
  }
}
```

### **Success Response (201)**
```json
{
  "success": true,
  "message": "Customer created",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "phoneNumber": "+919876543210",
      "email": "john.doe@example.com",
      "emailVerified": false,
      "roleType": "CUSTOMER",
      "isActive": true,
      "createdAt": "2026-05-02T10:30:00.000Z"
    },
    "profile": {
      "_id": "507f1f77bcf86cd799439012",
      "userId": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "gender": "Male",
      "dateOfBirth": "1994-06-15T00:00:00.000Z",
      "address": "Church Street, Bengaluru",
      "location": {
        "type": "Point",
        "coordinates": [77.5946, 12.9716]
      },
      "photoUrl": "https://res.cloudinary.com/...",
      "favoriteShops": [],
      "favoriteBookings": []
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### **Error Responses**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Validation error | Missing required fields or invalid format |
| 401 | Invalid token | Onboarding token expired or invalid |
| 409 | Conflict | Email or phone already registered |

---

## 💈 BARBER ONBOARDING

### **Endpoint**
```http
POST /api/v1/onboarding/barbers
Authorization: Bearer {onboardingToken}
Content-Type: multipart/form-data
```

### **Required Fields**

#### **Personal Information**
| Field | Type | Format | Example | Notes |
|-------|------|--------|---------|-------|
| `firstName` | String | 1-50 chars | "John" | Required |
| `lastName` | String | 1-50 chars | "Barber" | Required |
| `email` | String | Valid email | "john.barber@example.com" | Required |
| `gender` | String | Enum | "Male" | Male/Female/Other |
| `dateOfBirth` | String | YYYY-MM-DD | "1991-01-12" | Must be in past |

#### **Shop Information**
| Field | Type | Format | Example | Notes |
|-------|------|--------|---------|-------|
| `shopName` | String | 1-100 chars | "John's Barber Studio" | Required |
| `shopOwner` | String | 1-100 chars | "John Barber" | Required |
| `businessCategory` | String | Enum | "Barber" | See categories below |
| `targetCustomers` | String | Enum | "male" | male/female/unisex |

#### **Location**
| Field | Type | Format | Example | Notes |
|-------|------|--------|---------|-------|
| `address` | String | Text | "MG Road, Bengaluru" | Required |
| `location` | String | GeoJSON | See below | Required |

#### **Amenities**
| Field | Type | Format | Example | Notes |
|-------|------|--------|---------|-------|
| `amenities` | String | JSON array | See below | Required |

#### **Working Schedule**
| Field | Type | Format | Example | Notes |
|-------|------|--------|---------|-------|
| `workingDays` | String | JSON array | See below | Required |
| `workingHours` | String | JSON object | See below | Required |
| `breakTimings` | String | JSON array | See below | Required |

#### **Payment Information**
| Field | Type | Format | Example | Notes |
|-------|------|--------|---------|-------|
| `accountHolderName` | String | 1-100 chars | "John Barber" | Required |
| `bankName` | String | 1-120 chars | "HDFC Bank" | Required |
| `upiAddress` | String | UPI ID | "john.barber@upi" | Required |

#### **Security**
| Field | Type | Format | Example | Notes |
|-------|------|--------|---------|-------|
| `pin` | String | 4 digits | "1234" | Required |
| `confirmPin` | String | 4 digits | "1234" | Must match pin |

#### **Images**
| Field | Type | Format | Example | Notes |
|-------|------|--------|---------|-------|
| `shopImages` | File[] | Images | [img1.jpg, img2.jpg] | 1-3 images required |

### **Optional Fields**
| Field | Type | Default | Example |
|-------|------|---------|---------|
| `bio` | String | "" | "Professional barber with 10 years experience" |
| `numberOfEmployees` | Integer | 1 | 5 |
| `yearsOfExperience` | Integer | 0 | 10 |

### **Enums & Formats**

#### **Business Categories**
```dart
enum BusinessCategory {
  salon('Salon'),
  beautyParlour('Beauty Parlour'),
  barber('Barber'),
  doorStep('Door-Step');
  
  final String value;
  const BusinessCategory(this.value);
}
```

#### **Target Customers**
```dart
enum TargetCustomers {
  male('male'),
  female('female'),
  unisex('unisex');
  
  final String value;
  const TargetCustomers(this.value);
}
```

#### **Amenities**
```dart
final amenities = [
  'Air Conditioning',
  'Waiting Area',
  'Drinking Water',
  'Washrooms',
  'Parking Area',
  'Wi-Fi',
  'Charging Points',
];

// Send as JSON string
request.fields['amenities'] = jsonEncode(amenities);
```

#### **Working Days**
```dart
final workingDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Send as JSON string
request.fields['workingDays'] = jsonEncode(workingDays);
```

#### **Working Hours**
```dart
// Option 1: 24-hour format (recommended)
final workingHours = {
  'opensAt': '09:00',
  'closesAt': '20:00',
};

// Option 2: 12-hour format (backend normalizes)
final workingHours = {
  'opensAt': '09:00 AM',
  'closesAt': '08:00 PM',
};

// Send as JSON string
request.fields['workingHours'] = jsonEncode(workingHours);
```

#### **Break Timings**
```dart
final breakTimings = [
  {
    'startsAt': '13:00',
    'endsAt': '14:00',
  },
  {
    'startsAt': '17:00',
    'endsAt': '17:30',
  },
];

// Send as JSON string
request.fields['breakTimings'] = jsonEncode(breakTimings);
```

### **Flutter Example**
```dart
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

Future<Map<String, dynamic>> completeBarberOnboarding({
  required String onboardingToken,
  required String firstName,
  required String lastName,
  required String email,
  required String gender,
  required String dateOfBirth,
  required String shopName,
  required String businessCategory,
  required String targetCustomers,
  required String address,
  required double longitude,
  required double latitude,
  required List<String> amenities,
  required List<String> workingDays,
  required String opensAt,
  required String closesAt,
  required List<Map<String, String>> breakTimings,
  required String accountHolderName,
  required String bankName,
  required String upiAddress,
  required String pin,
  required List<File> shopImages,
  String? bio,
  int? numberOfEmployees,
  int? yearsOfExperience,
}) async {
  final request = http.MultipartRequest(
    'POST',
    Uri.parse('$baseUrl/api/v1/onboarding/barbers'),
  );

  // Authorization header
  request.headers['Authorization'] = 'Bearer $onboardingToken';

  // Personal Information
  request.fields['firstName'] = firstName;
  request.fields['lastName'] = lastName;
  request.fields['email'] = email;
  request.fields['gender'] = gender;
  request.fields['dateOfBirth'] = dateOfBirth;

  // Shop Information
  request.fields['shopName'] = shopName;
  request.fields['shopOwner'] = '$firstName $lastName';
  request.fields['businessCategory'] = businessCategory;
  request.fields['targetCustomers'] = targetCustomers;

  // Location
  request.fields['address'] = address;
  request.fields['location'] = jsonEncode({
    'type': 'Point',
    'coordinates': [longitude, latitude],
  });

  // Amenities (JSON array as string)
  request.fields['amenities'] = jsonEncode(amenities);

  // Working Schedule
  request.fields['workingDays'] = jsonEncode(workingDays);
  request.fields['workingHours'] = jsonEncode({
    'opensAt': opensAt,
    'closesAt': closesAt,
  });
  request.fields['breakTimings'] = jsonEncode(breakTimings);

  // Payment Information
  request.fields['accountHolderName'] = accountHolderName;
  request.fields['bankName'] = bankName;
  request.fields['upiAddress'] = upiAddress;

  // Security PIN
  request.fields['pin'] = pin;
  request.fields['confirmPin'] = pin;

  // Optional fields
  if (bio != null) request.fields['bio'] = bio;
  if (numberOfEmployees != null) {
    request.fields['numberOfEmployees'] = numberOfEmployees.toString();
  }
  if (yearsOfExperience != null) {
    request.fields['yearsOfExperience'] = yearsOfExperience.toString();
  }

  // Shop Images (1-3 images)
  for (var i = 0; i < shopImages.length && i < 3; i++) {
    request.files.add(await http.MultipartFile.fromPath(
      'shopImages',
      shopImages[i].path,
    ));
  }

  // Send request
  final response = await request.send();
  final responseData = await response.stream.bytesToString();
  final jsonResponse = jsonDecode(responseData);

  if (response.statusCode == 201) {
    final data = jsonResponse['data'];
    
    // Save tokens for future requests
    await saveAccessToken(data['accessToken']);
    await saveRefreshToken(data['refreshToken']);
    
    return {
      'success': true,
      'user': data['user'],
      'shop': data['shop'],
      'photos': data['photos'],
      'accessToken': data['accessToken'],
      'refreshToken': data['refreshToken'],
    };
  } else {
    throw Exception(jsonResponse['message'] ?? 'Onboarding failed');
  }
}
```

### **Success Response (201)**
```json
{
  "success": true,
  "message": "Barber profile created",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "phoneNumber": "+919876543211",
      "email": "john.barber@example.com",
      "emailVerified": false,
      "roleType": "BARBER",
      "isActive": true,
      "createdAt": "2026-05-02T10:30:00.000Z"
    },
    "shop": {
      "_id": "507f1f77bcf86cd799439013",
      "ownerId": "507f1f77bcf86cd799439011",
      "shopName": "John's Barber Studio",
      "ownerName": "John Barber",
      "ownerFirstName": "John",
      "ownerLastName": "Barber",
      "ownerGender": "Male",
      "ownerDateOfBirth": "1991-01-12T00:00:00.000Z",
      "category": "Barber",
      "targetCustomers": "male",
      "address": "MG Road, Bengaluru",
      "location": {
        "type": "Point",
        "coordinates": [77.5946, 12.9716]
      },
      "facilities": ["Air Conditioning", "Waiting Area", "Wi-Fi"],
      "availableDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      "openTime": "09:00",
      "closeTime": "20:00",
      "breakTimes": [{"start": "13:00", "end": "14:00"}],
      "upiId": "john.barber@upi",
      "accountHolderName": "John Barber",
      "bankName": "HDFC Bank",
      "isOpen": true,
      "numberOfEmployees": 1,
      "yearsOfExperience": 0
    },
    "photos": [
      {
        "_id": "507f1f77bcf86cd799439014",
        "shopId": "507f1f77bcf86cd799439013",
        "imageUrl": "https://res.cloudinary.com/...",
        "photoType": "shop_interior"
      }
    ],
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 📊 COMPARISON TABLE

| Field | Customer | Barber | Notes |
|-------|----------|--------|-------|
| **phoneNumber** | ❌ No | ❌ No | Comes from onboarding token |
| **firstName** | ✅ Required | ✅ Required | |
| **lastName** | ✅ Required | ✅ Required | |
| **email** | ✅ Required | ✅ Required | |
| **gender** | ✅ Required | ✅ Required | Male/Female/Other |
| **dateOfBirth** | ✅ Required | ✅ Required | YYYY-MM-DD format |
| **address** | ✅ Required | ✅ Required | |
| **location** | ✅ Required | ✅ Required | GeoJSON Point |
| **photo** | ✅ Required | ❌ No | Customer profile photo |
| **shopName** | ❌ No | ✅ Required | |
| **shopOwner** | ❌ No | ✅ Required | |
| **businessCategory** | ❌ No | ✅ Required | Salon/Barber/etc |
| **targetCustomers** | ❌ No | ✅ Required | male/female/unisex |
| **amenities** | ❌ No | ✅ Required | JSON array |
| **workingDays** | ❌ No | ✅ Required | JSON array |
| **workingHours** | ❌ No | ✅ Required | JSON object |
| **breakTimings** | ❌ No | ✅ Required | JSON array |
| **accountHolderName** | ❌ No | ✅ Required | For payouts |
| **bankName** | ❌ No | ✅ Required | For payouts |
| **upiAddress** | ❌ No | ✅ Required | For payouts |
| **pin** | ❌ No | ✅ Required | 4-digit security PIN |
| **confirmPin** | ❌ No | ✅ Required | Must match pin |
| **shopImages** | ❌ No | ✅ Required | 1-3 images |
| **bio** | ❌ No | ⭕ Optional | Shop description |
| **numberOfEmployees** | ❌ No | ⭕ Optional | Default: 1 |
| **yearsOfExperience** | ❌ No | ⭕ Optional | Default: 0 |

---

## ✅ VALIDATION RULES

### **Common Rules (Both Users)**
- Email must be valid email format
- Gender must be: "Male", "Female", or "Other"
- Date of birth must be in the past
- Location must be valid GeoJSON Point with coordinates `[longitude, latitude]`
- Phone number comes from onboarding token (don't send it)

### **Customer-Specific Rules**
- Profile photo is required (JPEG/PNG)
- All fields are required (no optional fields)

### **Barber-Specific Rules**
- Business category must be: "Salon", "Beauty Parlour", "Barber", or "Door-Step"
- Target customers must be: "male", "female", or "unisex"
- Working days must be valid day names (Monday-Sunday)
- Working hours: `opensAt` must be before `closesAt`
- Break timings: `startsAt` must be before `endsAt`
- PIN must be exactly 4 digits
- `confirmPin` must match `pin`
- UPI address is required for payouts
- 1-3 shop images required
- Optional fields have defaults: `numberOfEmployees: 1`, `yearsOfExperience: 0`, `bio: ""`

---

## 🚨 COMMON ERRORS

### **1. Phone Number in Request**
```dart
// ❌ WRONG: Don't send phoneNumber
request.fields['phoneNumber'] = '9876543210';

// ✅ CORRECT: Phone comes from onboarding token
// Backend extracts it from: req.onboardingContext.phoneNumber
```

### **2. Location Format**
```dart
// ❌ WRONG: Latitude, Longitude order
request.fields['location'] = jsonEncode({
  'type': 'Point',
  'coordinates': [12.9716, 77.5946], // WRONG ORDER!
});

// ✅ CORRECT: Longitude, Latitude order
request.fields['location'] = jsonEncode({
  'type': 'Point',
  'coordinates': [77.5946, 12.9716], // CORRECT ORDER!
});
```

### **3. JSON Fields as Objects**
```dart
// ❌ WRONG: Sending as Dart objects
request.fields['amenities'] = amenities; // List<String>

// ✅ CORRECT: Convert to JSON string
request.fields['amenities'] = jsonEncode(amenities);
```

### **4. Working Hours Format**
```dart
// ❌ WRONG: Invalid time format
request.fields['workingHours'] = jsonEncode({
  'opensAt': '9:00',      // Missing leading zero
  'closesAt': '8:00 pm',  // Inconsistent format
});

// ✅ CORRECT: Consistent 24-hour format
request.fields['workingHours'] = jsonEncode({
  'opensAt': '09:00',
  'closesAt': '20:00',
});
```

### **5. Missing Required Fields**
```dart
// ❌ WRONG: Missing required fields
// Backend will return 400 with validation errors

// ✅ CORRECT: Include all required fields
// Check the tables above for required fields
```

---

## 🎯 TESTING

### **Test Customer Onboarding**
```bash
# 1. Get onboarding token
POST /api/v1/auth/otp/send { "mobile": "9876543210" }
POST /api/v1/auth/otp/verify { "mobile": "9876543210", "otp": "123456" }
# Response: { "onboardingToken": "..." }

# 2. Complete onboarding
POST /api/v1/onboarding/customers
Authorization: Bearer {onboardingToken}
# Include all required fields + photo

# 3. Verify response
# Should return 201 with accessToken + refreshToken
```

### **Test Barber Onboarding**
```bash
# 1. Get onboarding token
POST /api/v1/auth/otp/send { "mobile": "9876543211" }
POST /api/v1/auth/otp/verify { "mobile": "9876543211", "otp": "123456" }
# Response: { "onboardingToken": "..." }

# 2. Complete onboarding
POST /api/v1/onboarding/barbers
Authorization: Bearer {onboardingToken}
# Include all required fields + 1-3 shop images

# 3. Verify response
# Should return 201 with accessToken + refreshToken
```

---

## 📚 RELATED DOCUMENTATION

- **Authentication Flow**: `docs/features/auth/GOOGLE-OAUTH-UNIVERSAL-AUTH.MD`
- **MSG91 OTP Guide**: `docs/features/msg91/MSG91-COMPLETE-GUIDE.md`
- **Account Management**: `docs/features/auth/ACCOUNT-MANAGEMENT-GUIDE.md`
- **Phone Update Guide**: `docs/features/auth/PHONE-UPDATE-GUIDE.md`

---

## 🎉 SUMMARY

### **Customer Onboarding**
- **Fields**: 8 required fields + 1 photo
- **Phone**: ❌ Not sent (comes from token)
- **Email**: ✅ Required
- **Location**: ✅ Required (GeoJSON)
- **Photo**: ✅ Required

### **Barber Onboarding**
- **Fields**: 20+ required fields + 1-3 photos
- **Phone**: ❌ Not sent (comes from token)
- **Email**: ✅ Required
- **Location**: ✅ Required (GeoJSON)
- **Schedule**: ✅ Required (working days, hours, breaks)
- **Payment**: ✅ Required (UPI, bank details)
- **Security**: ✅ Required (4-digit PIN)
- **Images**: ✅ Required (1-3 shop images)

### **After Successful Onboarding**
- ✅ User account created
- ✅ Profile created (Customer or Shop)
- ✅ `accessToken` returned (use for authenticated requests)
- ✅ `refreshToken` returned (use to refresh access token)
- ✅ User can now access the app

---

**END OF DOCUMENT**
