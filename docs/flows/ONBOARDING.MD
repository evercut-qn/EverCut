# Onboarding Flow

## Overview

Onboarding creates the role-specific profile after OTP verification. Customer onboarding creates a customer profile. Barber onboarding creates the user, shop profile, cover image, and initial shop gallery records.

## API Steps

1. Verify OTP and receive `onboardingToken`.
2. Complete customer onboarding:
   `POST /api/v1/onboarding/customers`
3. Or complete barber onboarding:
   `POST /api/v1/onboarding/barbers`
4. Store returned `accessToken` and `refreshToken`.

## Customer Request Example

`multipart/form-data`

```text
firstName=Test
lastName=Customer
email=test.customer@example.com
gender=Male
dateOfBirth=1998-01-01
address=Church Street, Bengaluru
location={"type":"Point","coordinates":[77.5946,12.9716]}
photo=<file>
```

## Barber Request Example

`multipart/form-data`

```text
firstName=Test
lastName=Barber
email=test.barber@example.com
gender=Male
dateOfBirth=1990-01-01
shopName=Postman Test Barber Studio
category=Barber
targetCustomers=male
upiId=success@upi
accountHolderName=Test Barber
bankName=Test Bank
address=MG Road, Bengaluru
location={"type":"Point","coordinates":[77.5946,12.9716]}
availableDays=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
openTime=09:00
closeTime=21:00
pin=1234
confirmPin=1234
shopImages=<3 files>
```

## Response Example

```json
{
  "success": true,
  "message": "Customer created",
  "data": {
    "user": { "_id": "user_id", "roleType": "CUSTOMER" },
    "profile": { "_id": "customer_id" },
    "accessToken": "jwt",
    "refreshToken": "jwt"
  }
}
```

## Important Notes

- Barber onboarding requires exactly 3 shop images.
- Shop schedule input accepts `HH:MM` and legacy `hh:mm AM/PM`; storage is normalized to `HH:MM`.
- The phone number comes from the onboarding token, not the body.
