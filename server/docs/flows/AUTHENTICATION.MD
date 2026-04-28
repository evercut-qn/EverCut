# Authentication Flow

## Overview

EverCut uses OTP login. Returning users receive `accessToken` and `refreshToken`. New users receive an `onboardingToken` and must complete onboarding before using normal APIs.

## API Steps

1. Send OTP
   `POST /api/v1/auth/otp/send`

2. Verify OTP
   `POST /api/v1/auth/otp/verify`

3. If returning user, store `accessToken` and `refreshToken`.

4. If new user, store `onboardingToken` and continue to onboarding.

5. Refresh session when the access token expires.
   `POST /api/v1/auth/token/refresh`

6. Logout when needed.
   `POST /api/v1/auth/logout`

## Request Example

```json
{
  "mobile": "9876543210",
  "otp": "123456"
}
```

## Returning User Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "isNewUser": false,
    "user": { "_id": "user_id", "roleType": "CUSTOMER" },
    "profile": { "_id": "customer_id" },
    "accessToken": "jwt",
    "refreshToken": "jwt"
  }
}
```

## New User Response

```json
{
  "success": true,
  "message": "OTP verified. Please complete your profile.",
  "data": {
    "isNewUser": true,
    "onboardingToken": "jwt"
  }
}
```

## Important Notes

- Send `Authorization: Bearer <accessToken>` for authenticated APIs.
- Send `Authorization: Bearer <onboardingToken>` only for onboarding APIs.
- Refresh token rotation is enforced; replace both tokens after every refresh.
