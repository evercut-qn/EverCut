# EverCut — Token Flow & Authentication Guide

> **Last updated:** May 2026  
> **Covers:** JWT access tokens, refresh tokens, onboarding tokens, middleware chain, security model, and Flutter client integration.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Token Types & JWT Claims](#2-token-types--jwt-claims)
3. [Complete Auth Lifecycle](#3-complete-auth-lifecycle)
4. [API Response Shapes](#4-api-response-shapes)
5. [Middleware Chain](#5-middleware-chain)
6. [Token Rotation & Revocation](#6-token-rotation--revocation)
7. [Error Catalogue](#7-error-catalogue)
8. [Flutter Client Integration](#8-flutter-client-integration)
9. [Environment Variables](#9-environment-variables)
10. [Security Model Summary](#10-security-model-summary)

---

## 1. Architecture Overview

```
Client (Flutter)
      │
      │  POST /auth/otp/send       → triggers MSG91 OTP
      │  POST /auth/otp/verify     → returns tokens OR onboarding token
      │  POST /auth/token/refresh  → rotates token pair
      │  POST /auth/logout         → wipes refresh hash
      │
      ▼
Express Routes
      │
      ├── otpRateLimiter (IP + phone-based in-memory window)
      ├── validate (Joi schema)
      ├── authenticate (verifyAccessToken → access token guard)
      ├── authenticateOnboarding (verifyOnboardingToken → onboarding guard)
      └── authorize(...roles) (role-based access)
      │
      ▼
auth.service.js
      │
      ├── generateTokenPair()       → signed with accessSecret + refreshSecret
      ├── generateOnboardingToken() → signed with onboardingSecret (separate key)
      ├── verifyAccessToken()       → enforces iss, aud, differentiates expiry vs tamper
      ├── verifyRefreshToken()      → same, uses refreshSecret
      ├── verifyOnboardingToken()   → same, uses onboardingSecret
      ├── hashToken()               → SHA-256 of raw refresh token
      └── refreshAccessToken()      → hash comparison + rotation
      │
      ▼
user.model.js
      └── refreshTokenHash (String, select: false) — hashed refresh token only
```

---

## 2. Token Types & JWT Claims

### 2.1 Access Token

| Claim | Value | Purpose |
|---|---|---|
| `sub` | `userId` (MongoDB ObjectId string) | Identifies the user |
| `role` | `CUSTOMER` \| `BARBER` \| `ADMIN` | Role for `authorize()` middleware |
| `type` | `access` | Prevents onboarding/refresh tokens from being used as access |
| `jti` | `crypto.randomUUID()` | Unique token ID (future: blocklist revocation) |
| `iss` | `evercut-api` | Issuer — rejected if wrong |
| `aud` | `evercut-mobile` | Audience — rejected if wrong |
| `iat` | auto (unix seconds) | Issued-at |
| `exp` | `iat + 900` (15 min) | Expiry |

**Secret:** `JWT_ACCESS_SECRET`  
**TTL:** 15 minutes — defined as `config.jwt.accessExpiry` in `src/config/index.js`

### 2.2 Refresh Token

| Claim | Value |
|---|---|
| `sub` | `userId` |
| `type` | `refresh` |
| `jti` | `crypto.randomUUID()` |
| `iss` | `evercut-api` |
| `aud` | `evercut-mobile` |
| `exp` | `iat + 15552000` (180 days) |

**Secret:** `JWT_REFRESH_SECRET` (different from access secret)  
**TTL:** 180 days — defined as `config.jwt.refreshExpiry` in `src/config/index.js`  
**Stored:** SHA-256 hash only in `user.refreshTokenHash` (raw token never persisted)

### 2.3 Onboarding Token

| Claim | Value |
|---|---|
| `sub` | verified `phoneNumber` (E.164 format) |
| `type` | `onboarding` |
| `iss` | `evercut-api` |
| `aud` | `evercut-mobile` |
| `exp` | `iat + 86400` (24 hours) |

**Secret:** `JWT_ONBOARDING_SECRET` — **distinct from access and refresh secrets**  
**TTL:** 24 hours — defined as `config.jwt.onboardingExpiry` in `src/config/index.js`  
**Purpose:** Short-lived credential issued after OTP verification to a new (unregistered) phone number. Grants access only to `POST /onboarding/customers` and `POST /onboarding/barbers`.

> ⚠️ The onboarding token uses a **separate signing secret**. It cannot be used as an access token and vice versa — the secrets and the `type` claim both enforce this.

---

## 3. Complete Auth Lifecycle

### 3.1 New User Flow

```
1.  POST /auth/otp/send       { mobile: "9876543210" }
    ← 200 { message: "OTP sent successfully" }

2.  POST /auth/otp/verify     { mobile: "9876543210", otp: "123456" }
    ← 200 {
        isNewUser: true,
        onboardingToken: "<jwt>",
        onboardingExpiresIn: 86400
      }

3.  POST /onboarding/customers   Bearer: <onboardingToken>
        (multipart form with profile data + photo)
    ← 201 {
        user: { ... },
        profile: { ... },
        tokenType: "Bearer",
        accessToken: "<jwt>",
        expiresIn: 900,
        refreshToken: "<jwt>",
        refreshExpiresIn: 15552000
      }

4.  All subsequent API calls:
        Authorization: Bearer <accessToken>

5.  When access token expires:
    POST /auth/token/refresh  { refreshToken: "<jwt>" }
    ← 200 { tokenType, accessToken, expiresIn, refreshToken, refreshExpiresIn }

6.  On logout:
    POST /auth/logout   Bearer: <accessToken>
    ← 200 { message: "Logged out successfully" }
```

### 3.2 Returning User Flow

```
1.  POST /auth/otp/send       { mobile: "9876543210" }
2.  POST /auth/otp/verify     { mobile: "9876543210", otp: "123456" }
    ← 200 {
        isNewUser: false,
        tokenType: "Bearer",
        accessToken: "<jwt>",
        expiresIn: 900,
        refreshToken: "<jwt>",
        refreshExpiresIn: 15552000,
        user: { ... },
        profile: { ... }
      }
```

### 3.3 Token Refresh Flow

```
POST /auth/token/refresh
Body: { "refreshToken": "<stored_refresh_jwt>" }

Server:
  1. verifyRefreshToken(token) → checks iss, aud, type claim, expiry
  2. Load user + refreshTokenHash from DB (select: +refreshTokenHash)
  3. SHA-256(incoming token) === storedHash?
       NO  → wipe hash in DB, throw "Session invalidated" (theft detection)
       YES → generateTokenPair() → new accessToken + refreshToken
  4. Update DB: refreshTokenHash = SHA-256(newRefreshToken)
  5. Return full token metadata

← 200 {
    tokenType: "Bearer",
    accessToken: "<new_jwt>",
    expiresIn: 900,
    refreshToken: "<new_jwt>",      ← ROTATED every call
    refreshExpiresIn: 15552000
  }
```

---

## 4. API Response Shapes

### POST `/auth/otp/verify` — New User

```json
{
  "success": true,
  "message": "OTP verified. Please complete your profile.",
  "data": {
    "isNewUser": true,
    "onboardingToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "onboardingExpiresIn": 86400
  }
}
```

### POST `/auth/otp/verify` — Returning User

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "isNewUser": false,
    "tokenType": "Bearer",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshExpiresIn": 15552000,
    "user": {
      "id": "664a1f...",
      "phoneNumber": "+919876543210",
      "email": "user@example.com",
      "emailVerified": false,
      "roleType": "CUSTOMER"
    },
    "profile": { ... }
  }
}
```

### POST `/auth/token/refresh`

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokenType": "Bearer",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshExpiresIn": 15552000
  }
}
```

### POST `/onboarding/customers` or `/onboarding/barbers`

```json
{
  "success": true,
  "message": "Customer created",
  "data": {
    "user": { ... },
    "profile": { ... },
    "tokenType": "Bearer",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshExpiresIn": 15552000
  }
}
```

### POST `/auth/logout`

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": {}
}
```

---

## 5. Middleware Chain

### 5.1 `authenticate` (access token guard)

```
File: src/middleware/authenticate.middleware.js

1. Extract Bearer token from Authorization header
2. verifyAccessToken(token)
     ├── jwt.verify(token, accessSecret, { issuer, audience })
     ├── TokenExpiredError → 401 "Access token has expired. Please refresh your session."
     └── JsonWebTokenError → 401 "Invalid access token." + logger.warn (tamper alert)
3. Check decoded.type === TOKEN_TYPE.ACCESS
4. Load user from DB → check isActive and deletedAt
5. Attach req.user = { _id, roleType, phoneNumber, email, emailVerified }
```

### 5.2 `authenticateOnboarding` (onboarding token guard)

```
File: src/middleware/authenticate.middleware.js

1. Extract Bearer token from Authorization header
2. verifyOnboardingToken(token)           ← uses JWT_ONBOARDING_SECRET
     ├── jwt.verify(token, onboardingSecret, { issuer, audience })
     ├── TokenExpiredError → 401 "Onboarding token has expired. Please verify your OTP again."
     └── JsonWebTokenError → 401 "Invalid onboarding token." + logger.warn
3. Check decoded.type === TOKEN_TYPE.ONBOARDING
4. Check phone number not already registered (guard against double-onboarding)
5. Attach req.onboardingContext = { phoneNumber }
```

### 5.3 `authorize(...roles)` (RBAC)

```
File: src/middleware/authorize.middleware.js

Must be used AFTER authenticate.
Checks req.user.roleType against the allowed roles list.
→ 403 ForbiddenError if role not in allowedRoles
```

### 5.4 Route composition examples

```js
// Public
router.post('/auth/otp/send',    rateLimiter, validate(schema), controller);
router.post('/auth/token/refresh', validate(schema), controller);

// Onboarding (requires OTP-verified phone, new user only)
router.post('/onboarding/customers', authenticateOnboarding, upload, validate, controller);

// Authenticated (any role)
router.post('/auth/logout', authenticate, controller);

// Role-restricted
router.get('/earnings', authenticate, authorize('BARBER'), controller);
```

---

## 6. Token Rotation & Revocation

### Refresh Token Rotation

Every successful `/auth/token/refresh` call:
1. Issues a **brand new** access + refresh pair
2. SHA-256 hashes the new refresh token and writes it to `user.refreshTokenHash`
3. The old refresh token is immediately invalid

**Single-device model:** Only one refresh token hash is stored per user. A second login from a different device silently invalidates the first device's session. Multi-device support requires a separate `RefreshSession` collection (planned).

### Theft Detection (Reuse Attack)

If a refresh token is presented that **doesn't match** the stored hash:
- The stored hash is immediately wiped (`refreshTokenHash = null`)
- All active sessions are terminated
- `401 "Session invalidated. Please sign in again."` is returned
- A `logger.warn` event is emitted for monitoring

### Logout Revocation

`POST /auth/logout` (requires valid access token):
- Wipes `user.refreshTokenHash` to `null`
- The access token remains technically valid until its 15-min expiry
- No JTI blocklist is implemented yet — future work for immediate revocation

---

## 7. Error Catalogue

| Scenario | HTTP | Message |
|---|---|---|
| Missing `Authorization` header | 401 | `No token provided` |
| Access token expired | 401 | `Access token has expired. Please refresh your session.` |
| Access token tampered/invalid | 401 | `Invalid access token.` |
| Wrong token type (e.g. refresh used as access) | 401 | `Standard account access token required` |
| Onboarding token expired | 401 | `Onboarding token has expired. Please verify your OTP again.` |
| Onboarding token tampered | 401 | `Invalid onboarding token.` |
| Refresh token expired | 401 | `Refresh token has expired. Please sign in again.` |
| Refresh token tampered | 401 | `Invalid refresh token.` |
| Refresh token reuse (hash mismatch) | 401 | `Session invalidated. Please sign in again.` |
| Account inactive or deleted | 401 | `Account is inactive or deleted` |
| Insufficient role | 403 | `Access denied. Required role(s): BARBER` |
| OTP rate limit exceeded | 429 | `Too many requests. Please try again after N seconds.` |

---

## 8. Flutter Client Integration

### 8.1 Token storage

```dart
// Use flutter_secure_storage — never store in SharedPreferences
const storage = FlutterSecureStorage();

Future<void> saveTokens(Map<String, dynamic> data) async {
  await storage.write(key: 'access_token',       value: data['accessToken']);
  await storage.write(key: 'refresh_token',      value: data['refreshToken']);
  await storage.write(key: 'expires_at',         value:
      DateTime.now().add(Duration(seconds: data['expiresIn'] as int))
          .toIso8601String());
  await storage.write(key: 'refresh_expires_at', value:
      DateTime.now().add(Duration(seconds: data['refreshExpiresIn'] as int))
          .toIso8601String());
}
```

### 8.2 Proactive refresh (before 401)

```dart
Future<String?> getValidAccessToken() async {
  final expiresAtStr = await storage.read(key: 'expires_at');
  if (expiresAtStr == null) return null;

  final expiresAt = DateTime.parse(expiresAtStr);
  // Refresh 60 seconds before expiry to avoid races
  if (DateTime.now().isAfter(expiresAt.subtract(const Duration(seconds: 60)))) {
    await refreshTokens();
  }

  return storage.read(key: 'access_token');
}
```

### 8.3 Attaching the token

```dart
// Authorization: Bearer <token>
headers: {
  'Authorization': 'Bearer $accessToken',
  'Content-Type': 'application/json',
}
```

### 8.4 Handling 401 at the HTTP layer

```dart
// In your Dio interceptor or http wrapper:
if (response.statusCode == 401) {
  final message = response.body['message'];
  if (message.contains('expired')) {
    // Attempt refresh once, retry original request
    await refreshTokens();
    return retry(request);
  } else {
    // Tampered or invalidated — force re-login
    await clearSession();
    navigateTo('/login');
  }
}
```

### 8.5 Onboarding token flow

```dart
// After OTP verify returns isNewUser: true
if (data['isNewUser'] == true) {
  final onboardingToken = data['onboardingToken'];
  final expiresIn = data['onboardingExpiresIn']; // seconds, driven by config.jwt.onboardingExpiry (default: 86400)
  await storage.write(key: 'onboarding_token', value: onboardingToken);
  navigateTo('/onboarding');
}

// In onboarding API calls:
headers: { 'Authorization': 'Bearer $onboardingToken' }
```

---

## 9. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_ACCESS_SECRET` | ✅ | Signs access tokens. Min 64 random chars. |
| `JWT_REFRESH_SECRET` | ✅ | Signs refresh tokens. **Different** from access secret. |
| `JWT_ONBOARDING_SECRET` | ✅ | Signs onboarding tokens. **Different** from both above. |

> **Token TTLs are not environment variables.**  
> Access (`15m`), refresh (`180d`), and onboarding (`24h`) expiry values are code-level constants in `src/config/index.js` — intentionally not env-overridable. A TTL change is a security decision that must go through code review and a controlled deploy.

> **Generate secrets with the dedicated script:**
> ```bash
> node scripts/generate-token-secrets.mjs               # print .env block
> node scripts/generate-token-secrets.mjs --write       # write directly into .env
> node scripts/generate-token-secrets.mjs --check       # audit existing values
> ```
> Run from the `server/` directory. Never reuse secrets across environments.

---

## 10. Security Model Summary

| Property | Implementation |
|---|---|
| Separate secrets per token type | ✅ Access / Refresh / Onboarding use 3 different keys |
| Centralized TTL constants | ✅ All expiries in `config.jwt.*` — no env override, no desync risk |
| Token type claim enforcement | ✅ `decoded.type` checked in every guard |
| Issuer + Audience enforcement | ✅ `iss: evercut-api`, `aud: evercut-mobile` verified on all tokens |
| Refresh token hashing | ✅ SHA-256 stored, raw token never persisted |
| Refresh token rotation | ✅ New pair issued on every refresh call |
| Theft detection | ✅ Hash mismatch wipes all sessions |
| Error differentiation | ✅ `TokenExpiredError` vs `JsonWebTokenError` handled separately |
| Rate limiting (OTP) | ✅ IP + phone-based windows (in-memory, single-instance only) |
| Atomic login DB write | ✅ `lastLoginAt` + `refreshTokenHash` in single `updateById` call |
| `expiresIn` in response | ✅ Clients can proactively refresh before 401 |
| Multi-device sessions | ❌ Planned — requires `RefreshSession` collection |
| JTI blocklist (immediate revocation) | ❌ Planned — requires Redis |
| `tokenVersion` (global invalidation) | ❌ Planned — requires user schema field |
| Redis-backed rate limiter | ❌ Needed before horizontal scaling |
