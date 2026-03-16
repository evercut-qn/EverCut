# MSG91 Complete Integration Guide — EverCut Backend

> **Created:** March 16, 2026
> **Scope:** End-to-end guide — MSG91 OTP + JWT authentication, DLT registration, and Postman tooling
> **Target Codebase:** `server/src/` (Express 5 · ES Modules · Mongoose 9 · Joi validation)
> **Context:** Clean replacement of Firebase Phone Auth. Project is in development with no existing users.

---

## Table of Contents

### Part I — Backend Integration
1. [Architecture Overview](#1-architecture-overview)
2. [Environment Variables & Configuration](#2-environment-variables--configuration)
3. [Dependencies](#3-dependencies)
4. [Implementation — Layer by Layer](#4-implementation--layer-by-layer)
5. [JWT Token Strategy](#5-jwt-token-strategy)
6. [User Model Changes](#6-user-model-changes)
7. [Firebase — Existing File Changes](#7-firebase--existing-file-changes)
8. [Security Best Practices](#8-security-best-practices)
9. [Error Handling](#9-error-handling)
10. [Future SMS Use Cases](#10-future-sms-use-cases)
11. [API Endpoint Matrix](#11-api-endpoint-matrix)
12. [File Map — All Changes at a Glance](#12-file-map--all-changes-at-a-glance)
13. [Pre-Launch Checklist](#13-pre-launch-checklist)

### Part II — MSG91 Account, DLT & External Setup
14. [Create MSG91 Account](#1-create-msg91-account)
15. [DLT Registration](#2-dlt-registration-mandatory-for-india-production)
16. [Test / Sandbox Environment](#3-test--sandbox-environment)
17. [Pre-Launch Checklist — External Setup](#4-pre-launch-checklist--external-setup)

### Part III — Postman Collection Updates
18. [Environment File](#1-environment-file)
19. [Rewrite 01-authentication.json](#2-rewrite-01-authenticationjson)
20. [Update All Downstream Collections (02–13)](#3-update-all-downstream-collections-02-13)
21. [Update Collection Descriptions](#4-update-collection-descriptions)
22. [Update README.md](#5-update-readmemd)
23. [Update Postman Collection Generator](#6-update-postman-collection-generator)
24. [File Matrix](#7-file-matrix)

---

## Project Timeline

| Day | Key Tasks & Milestones |
|---|---|
| **1** | MSG91 account created · Auth Key + OTP template obtained · DLT registration submitted · Firebase Phone Auth removed from auth/onboarding code (config + credentials retained for Google OAuth) |
| **2** | `.env` + `config/index.js` + `config/msg91.config.js` updated · `jsonwebtoken` installed · `sms-provider.service.js` built |
| **3** | `otp.service.js` built · `auth.service.js` rewritten · JWT access / refresh / onboarding token strategy complete |
| **4** | `otp-rate-limiter.middleware.js` + `authenticate.middleware.js` rewritten · validators + controller complete |
| **5** | `auth.routes.js` + `onboarding.routes.js` updated · User model changes applied · repository updated |
| **6** | All existing files refactored (account service, onboarding service/controller, upload middleware, authorize middleware) |
| **7** | `firebaseUid` fully purged from all models, scripts, and auth code · `firebase.config.js` + credentials retained for Google OAuth · `rg "firebaseUid" src/` returns zero matches |
| **8** | End-to-end flows tested in test mode — new user, returning user, token refresh, theft detection, rate limits |
| **9** | Postman collections rewritten + verified · collection generator script updated |
| **10** | Security review · pre-launch checklist signed off · staging smoke test with real SMS credits |

> ⏱ *DLT approval (Part II) runs in parallel and is expected within 5–10 business days. Backend development proceeds using `testMode: true` in `config/index.js` throughout.*

---

# Part I — Backend Integration Guide

## 1. Architecture Overview

### 1.1 New Auth Flow (MSG91 OTP + Custom JWT)

```text
─── Returning User ───────────────────────────────────────────────────
1. App → POST /api/v1/auth/otp/send  { mobile: "9876543210" }
2. Backend validates + rate-limits → calls MSG91 Send OTP API
3. MSG91 delivers OTP via SMS (fallback: WhatsApp → Voice)
4. User enters OTP in app
5. App → POST /api/v1/auth/otp/verify  { mobile, otp }
6. Backend calls MSG91 Verify OTP API
7. OTP valid → find existing User by phoneNumber
8. Update lastLoginAt → issue { accessToken, refreshToken }
9. Response: { isNewUser: false, user, profile, accessToken, refreshToken }
10. All subsequent requests use Bearer <accessToken>
11. POST /api/v1/auth/token/refresh for new access token

─── New User ─────────────────────────────────────────────────────────
1–6. Same as above
7. OTP valid → no User found by phoneNumber
8. **DO NOT create a User record**. Issue an internal short-lived `onboardingToken` (valid for 30m) containing only the verified `phoneNumber`.
9. Response: { isNewUser: true, onboardingToken }
10. App navigates to onboarding screen
11. App → POST /api/v1/onboarding/customers  (or /barbers)
        with header `Authorization: Bearer <onboardingToken>`
12. `authenticateOnboarding` validates the `onboardingToken`, extracts `phoneNumber`, and the backend creates the User and Profile records simultaneously.
13. Response returns the standard { user, profile, accessToken, refreshToken }.
14. All subsequent requests use Bearer <accessToken>
```

### 1.2 Layer Mapping

| Layer | New File(s) / Changes |
|---|---|
| **Config** | `config/index.js` — keep `firebase`, add `msg91` + `jwt` sections; `config/msg91.config.js` — default-export the ready-to-use `msg91` config object |
| **Provider** | `services/sms-provider.service.js` — **NEW** (SMS now handled here; `config/firebase.config.js` is **retained** for future Google OAuth) |
| **Service** | `services/otp.service.js` — **NEW**; `services/auth.service.js` — **REWRITE** |
| **Validator** | `validators/auth.validator.js` — **REWRITE** with OTP schemas |
| **Controller** | `controllers/auth.controller.js` — **REWRITE** with OTP + token handlers |
| **Route** | `routes/auth.routes.js` — **REWRITE** with OTP + token routes |
| **Middleware** | `middleware/authenticate.middleware.js` — **REWRITE** to export `authenticate` and `authenticateOnboarding` from the same file; `middleware/otp-rate-limiter.middleware.js` — **NEW** |
| **Model** | `models/user.model.js` — remove `firebaseUid`; add `refreshTokenHash`, `emailVerified`; keep `roleType` aligned to final persisted roles |
| **Constants** | `utils/constants.js` — keep existing roles; add OTP + token type constants |

---

## 2. Environment Variables & Configuration

### 2.1 Update `.env.example`

Keep all existing `FIREBASE_*` variables as-is — they are required for the future Google OAuth implementation. Add the following new variables:

```env
# ── MSG91 (OTP / SMS) ───────────────────────────────────────────────
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_OTP_TEMPLATE_ID=your_otp_template_id

# ── JWT (Custom Token Auth) ─────────────────────────────────────────
JWT_ACCESS_SECRET=your_access_token_secret_min_64_chars_random
JWT_REFRESH_SECRET=your_refresh_token_secret_min_64_chars_different
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=180d
```

### 2.2 Update `config/index.js`

Keep the existing `firebase` config block exactly as-is — it will be needed for Google OAuth. Add the following new sections alongside it:

```javascript
/** MSG91 OTP */
msg91: Object.freeze({
    authKey: requireEnv('MSG91_AUTH_KEY'),
    otpTemplateId: requireEnv('MSG91_OTP_TEMPLATE_ID'),
    otpLength: 6,
    otpExpiry: 10,                                              // minutes
    testMode: process.env.NODE_ENV !== 'production' && false,   // flip to true in dev to skip real SMS
    testOtp: '123456',
    baseUrl: 'https://control.msg91.com/api/v5',
}),

/** JWT */
jwt: Object.freeze({
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpiry: optionalEnv('JWT_ACCESS_EXPIRY', '15m'),
    refreshExpiry: optionalEnv('JWT_REFRESH_EXPIRY', '180d'),
}),
```

Then add a dedicated MSG91 config module so the rest of the app imports `msg91` directly, following the same default-export pattern used by the other files in `src/config/`:

```javascript
import config from './index.js';

const msg91 = Object.freeze({
    ...config.msg91,
    endpoints: Object.freeze({
        sendOtp: `${config.msg91.baseUrl}/otp`,
        verifyOtp: `${config.msg91.baseUrl}/otp/verify`,
        resendOtp: `${config.msg91.baseUrl}/otp/retry`,
    }),
    headers: Object.freeze({
        authkey: config.msg91.authKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    }),
});

export default msg91;
```

---

## 3. Dependencies

```bash
npm install jsonwebtoken
```

| Action | Package | Purpose |
|---|---|---|
| **Install** | `jsonwebtoken` | Sign/verify access & refresh tokens |
| **Retain** | `firebase-admin` | Kept for future Google OAuth implementation — do **not** uninstall |

---

## 4. Implementation — Layer by Layer

### 4.1 Constants

**File:** `src/utils/constants.js` — Add:

```javascript
// ── Roles (keep existing) ───────────────────────────────────────────
export const ROLES = Object.freeze({
    CUSTOMER: 'CUSTOMER',
    BARBER: 'BARBER',
    ADMIN: 'ADMIN',
});

export const ALL_ROLES = Object.values(ROLES);

// ── OTP Rate Limiting ──────────────────────────────────────────────
// Used by otp-rate-limiter.middleware.js.
// OTP length and expiry are configured via msg91.config.js,
// not duplicated here.
export const OTP_RATE_LIMIT = Object.freeze({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    maxSendPerPhone: 5,
    maxSendPerIp: 10,
    maxVerifyPerPhone: 10,
});

// ── Token Types ──────────────────────────────────────────────────────────────
export const TOKEN_TYPE = Object.freeze({
    ONBOARDING: 'onboarding',
    ACCESS: 'access',
    REFRESH: 'refresh',
});
```

---

### 4.2 MSG91 Provider Service

**File:** `src/services/sms-provider.service.js` — **NEW**

```javascript
import msg91 from '../config/msg91.config.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/api-error.js';

/**
 * SMS Provider Service — abstracts MSG91 OTP API.
 *
 * All MSG91 API communication is isolated here. To switch providers
 * (Twilio, 2Factor, etc.), only this file needs to change.
 */

/**
 * Send OTP to a mobile number via MSG91.
 * @param {string} mobile — 10-digit Indian mobile number (without country code)
 * @returns {Promise<{ success: boolean, requestId: string|null }>}
 */
export const sendOtp = async (mobile) => {
    if (msg91.testMode) {
        if (process.env.NODE_ENV === 'production') {
            logger.error('CRITICAL: MSG91 test mode is enabled in production!');
            throw new AppError('Configuration error', 500);
        }

        logger.info('MSG91 test mode — OTP send bypassed', {
            mobile: mobile.slice(-4).padStart(mobile.length, '*'),
            testOtp: msg91.testOtp,
        });
        return { success: true, requestId: 'test-mode' };
    }

    try {
        const response = await fetch(msg91.endpoints.sendOtp, {
            method: 'POST',
            headers: msg91.headers,
            body: JSON.stringify({
                template_id: msg91.otpTemplateId,
                mobile: `91${mobile}`,
                otp_length: msg91.otpLength,
                otp_expiry: msg91.otpExpiry,
            }),
        });

        const data = await response.json();

        if (data.type === 'success') {
            logger.info('OTP sent successfully', {
                mobile: mobile.slice(-4).padStart(mobile.length, '*'),
                requestId: data.request_id,
            });
            return { success: true, requestId: data.request_id };
        }

        logger.warn('MSG91 OTP send failed', {
            mobile: mobile.slice(-4).padStart(mobile.length, '*'),
            response: data,
        });
        return { success: false, requestId: null };
    } catch (err) {
        logger.error('MSG91 API error (sendOtp)', { error: err.message });
        throw new AppError('SMS service unavailable. Please try again later.', 503);
    }
};

/**
 * Verify OTP for a mobile number via MSG91.
 * @param {string} mobile — 10-digit Indian mobile number
 * @param {string} otp    — user-entered OTP
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const verifyOtp = async (mobile, otp) => {
    if (msg91.testMode) {
        const isValid = otp === msg91.testOtp;
        logger.info('MSG91 test mode — OTP verify bypassed', {
            mobile: mobile.slice(-4).padStart(mobile.length, '*'),
            valid: isValid,
        });
        return {
            success: isValid,
            message: isValid ? 'OTP verified (test mode)' : 'Invalid OTP (test mode)',
        };
    }

    try {
        const url = `${msg91.endpoints.verifyOtp}?mobile=91${mobile}&otp=${otp}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { authkey: msg91.authKey },
        });

        const data = await response.json();
        return {
            success: data.type === 'success',
            message: data.message || (data.type === 'success' ? 'OTP verified' : 'Invalid or expired OTP'),
        };
    } catch (err) {
        logger.error('MSG91 API error (verifyOtp)', { error: err.message });
        throw new AppError('SMS service unavailable. Please try again later.', 503);
    }
};

/**
 * Resend OTP via a different channel.
 * @param {string} mobile — 10-digit Indian mobile number
 * @param {'text'|'voice'} retryType — channel to retry on
 * @returns {Promise<{ success: boolean }>}
 */
export const resendOtp = async (mobile, retryType = 'text') => {
    if (msg91.testMode) {
        logger.info('MSG91 test mode — OTP resend bypassed', {
            mobile: mobile.slice(-4).padStart(mobile.length, '*'),
        });
        return { success: true };
    }

    try {
        const response = await fetch(msg91.endpoints.resendOtp, {
            method: 'POST',
            headers: msg91.headers,
            body: JSON.stringify({
                mobile: `91${mobile}`,
                retrytype: retryType,
            }),
        });

        const data = await response.json();
        return { success: data.type === 'success' };
    } catch (err) {
        logger.error('MSG91 API error (resendOtp)', { error: err.message });
        throw new AppError('SMS service unavailable. Please try again later.', 503);
    }
};
```

---

### 4.3 OTP Service

**File:** `src/services/otp.service.js` — **NEW**

```javascript
import * as smsProvider from './sms-provider.service.js';
import { BadRequestError } from '../utils/api-error.js';
import logger from '../utils/logger.js';

/**
 * OTP Service — orchestrates OTP operations via the SMS provider.
 *
 * Rate limiting is handled by the `otp-rate-limiter.middleware.js` at the route
 * level. This service focuses purely on business logic.
 */

/** Request OTP for a mobile number. */
export const requestOtp = async (mobile) => {
    const result = await smsProvider.sendOtp(mobile);
    if (!result.success) {
        throw new BadRequestError('Failed to send OTP. Please try again.');
    }
    return { message: 'OTP sent successfully' };
};

/** Verify OTP for a mobile number. */
export const verifyOtp = async (mobile, otp) => {
    const result = await smsProvider.verifyOtp(mobile, otp);
    if (!result.success) {
        throw new BadRequestError(result.message || 'Invalid or expired OTP');
    }
    return { verified: true };
};

/** Resend OTP via alternative channel. */
export const resendOtp = async (mobile, retryType) => {
    const result = await smsProvider.resendOtp(mobile, retryType);
    if (!result.success) {
        throw new BadRequestError('Failed to resend OTP. Please try again.');
    }
    return { message: `OTP resent via ${retryType}` };
};
```

---

### 4.4 Auth Service

**File:** `src/services/auth.service.js` — **REWRITE** (replaces the existing Firebase-based `createSession` service entirely)

```javascript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/index.js';
import userRepository from '../repositories/user.repository.js';
import customerProfileRepo from '../repositories/customer-profile.repository.js';
import shopRepository from '../repositories/shop.repository.js';
import photoRepository from '../repositories/photo.repository.js';
import { serializeBarberProfile } from '../utils/barber-profile.utils.js';
import { ROLES, TOKEN_TYPE } from '../utils/constants.js';
import { UnauthorizedError } from '../utils/api-error.js';
import logger from '../utils/logger.js';

// ── Token generation ──────────────────────────────────────────────────

/** Generate a short-lived onboarding token. */
export const generateOnboardingToken = (phoneNumber) => {
    // Note: intentionally signed with accessSecret (same secret as access tokens).
    // A third env variable is avoided; the `type: TOKEN_TYPE.ONBOARDING` claim is
    // the enforced differentiation. Both `authenticate` and `authenticateOnboarding`
    // verify the type claim after signature validation, so onboarding tokens are
    // rejected on standard access routes and vice-versa.
    return jwt.sign(
        {
            sub: phoneNumber,
            type: TOKEN_TYPE.ONBOARDING,
        },
        config.jwt.accessSecret,
        { expiresIn: '30m' }
    );
};

/** Generate a pair of access + refresh tokens. */
export const generateTokenPair = (userId, roleType) => {
    const accessToken = jwt.sign(
        {
            sub: userId.toString(),
            role: roleType,
            type: TOKEN_TYPE.ACCESS,
        },
        config.jwt.accessSecret,
        { expiresIn: config.jwt.accessExpiry },
    );

    const refreshToken = jwt.sign(
        { sub: userId.toString(), type: TOKEN_TYPE.REFRESH },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiry },
    );

    return { accessToken, refreshToken };
};

/** Verify a bearer token signed with the access secret. */
export const verifyBearerToken = (token) => {
    try {
        return jwt.verify(token, config.jwt.accessSecret);
    } catch {
        throw new UnauthorizedError('Invalid or expired token');
    }
};

/** Verify a refresh token and return decoded payload. */
export const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, config.jwt.refreshSecret);
        if (decoded.type !== TOKEN_TYPE.REFRESH) {
            throw new UnauthorizedError('Invalid token type');
        }
        return decoded;
    } catch {
        throw new UnauthorizedError('Invalid or expired refresh token');
    }
};

/** Hash a refresh token for secure storage (never store raw tokens in DB). */
export const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

// ── Session resolution ────────────────────────────────────────────────

/**
 * Resolve user session after OTP verification.
 *
 * - **Existing user:** update lastLoginAt, issue tokens, load profile.
 * - **New user:** issues a short-lived `onboardingToken` (valid 30 mins, contains only the phone number).
 *   The client proceeds to onboarding and passes this token to `authenticateOnboarding`.
 *
 * We DO NOT create a database record for incomplete user profiles.
 *
 * @param {string} phoneNumber — verified phone number (10-digit)
 * @returns {{ isNewUser: boolean, user?: object, profile?: object, tokens?: object, onboardingToken?: string }}
 */
export const resolveOtpSession = async (phoneNumber) => {
    const formattedPhone = phoneNumber.startsWith('+91')
        ? phoneNumber
        : `+91${phoneNumber}`;

    const existingUser = await userRepository.findByPhone(formattedPhone);

    if (existingUser) {
        // ── Returning user ────────────────────────────────────────────
        await userRepository.updateLastLogin(existingUser._id);

        const tokens = generateTokenPair(existingUser._id, existingUser.roleType);
        const refreshHash = hashToken(tokens.refreshToken);
        await userRepository.updateById(existingUser._id, { refreshTokenHash: refreshHash });

        let profile = null;
        if (existingUser.roleType === ROLES.CUSTOMER) {
            profile = await customerProfileRepo.findByUserId(existingUser._id);
        } else if (existingUser.roleType === ROLES.BARBER) {
            const shop = await shopRepository.findByOwnerId(existingUser._id);
            if (shop) {
                const photos = await photoRepository.findByShopId(shop._id, {});
                profile = serializeBarberProfile(shop, existingUser, { photos });
            }
        }
        return { isNewUser: false, user: existingUser, profile, tokens };
    }

    // ── New user — issue onboarding token ──────────────────────────────
    const onboardingToken = generateOnboardingToken(formattedPhone);

    logger.info('OTP verified for new user — issued onboarding token', {
        phone: formattedPhone.slice(-4).padStart(formattedPhone.length, '*'),
    });

    return { isNewUser: true, onboardingToken };
};

/** Refresh an access token using a valid refresh token. */
export const refreshAccessToken = async (refreshToken) => {
    const decoded = verifyRefreshToken(refreshToken);
    const userId = decoded.sub;

    // Must use findByIdWithRefreshHash because refreshTokenHash has select: false
    const user = await userRepository.findByIdWithRefreshHash(userId);
    if (!user || !user.isActive || user.deletedAt) {
        throw new UnauthorizedError('Account is inactive or deleted');
    }

    // Verify the refresh token matches stored hash (rotation check)
    const incomingHash = hashToken(refreshToken);
    if (user.refreshTokenHash !== incomingHash) {
        logger.warn('Refresh token mismatch — possible token theft', { userId });
        await userRepository.updateById(userId, { refreshTokenHash: null });
        throw new UnauthorizedError('Session invalidated. Please sign in again.');
    }

    // Issue new token pair (token rotation)
    const tokens = generateTokenPair(user._id, user.roleType);
    const newRefreshHash = hashToken(tokens.refreshToken);
    await userRepository.updateById(userId, { refreshTokenHash: newRefreshHash });

    return tokens;
};

/** Invalidate refresh token (logout). */
export const revokeRefreshToken = async (userId) => {
    await userRepository.updateById(userId, { refreshTokenHash: null });
};
```

---

### 4.5 Validators

**File:** `src/validators/auth.validator.js` — **REWRITE** (replaces the empty `sessionSchema`):

```javascript
import Joi from 'joi';

/** Indian mobile number: exactly 10 digits, starting with 6-9. */
const indianMobile = Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
        'string.pattern.base': 'Mobile number must be a valid 10-digit Indian number',
        'any.required': 'Mobile number is required',
    });

/** POST /auth/otp/send */
export const sendOtpSchema = Joi.object({
    mobile: indianMobile,
});

/** POST /auth/otp/verify */
export const verifyOtpSchema = Joi.object({
    mobile: indianMobile,
    otp: Joi.string()
        .pattern(/^\d{6}$/)
        .required()
        .messages({
            'string.pattern.base': 'OTP must be exactly 6 digits',
            'any.required': 'OTP is required',
        }),
});

/** POST /auth/otp/resend */
export const resendOtpSchema = Joi.object({
    mobile: indianMobile,
    retryType: Joi.string()
        .valid('text', 'voice')
        .default('text')
        .messages({
            'any.only': 'retryType must be "text" or "voice"',
        }),
});

/** POST /auth/token/refresh */
export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
        'any.required': 'Refresh token is required',
    }),
});
```

---

### 4.6 OTP Rate Limiter Middleware

**File:** `src/middleware/otp-rate-limiter.middleware.js` — **NEW**

```javascript
import { TooManyRequestsError } from '../utils/api-error.js';

// Dev-friendly in-memory store. Replace with Redis-backed storage
// (for example via `rate-limiter-flexible`) before multi-instance production use.
const store = new Map();

// Periodic cleanup (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
    }
}, 10 * 60 * 1000).unref();

/**
 * @param {{ windowMs: number, max: number, keyPrefix: string, keySource: 'ip'|'body.mobile' }} options
 */
export const otpRateLimiter = ({ windowMs, max, keyPrefix, keySource = 'ip' }) => {
    return (req, _res, next) => {
        const keyValue = keySource === 'ip'
            ? req.ip
            : req.body?.mobile || req.ip;

        const key = `${keyPrefix}:${keyValue}`;
        const now = Date.now();
        const entry = store.get(key);

        if (!entry || now > entry.resetAt) {
            store.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (entry.count >= max) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            return next(
                new TooManyRequestsError(
                    `Too many requests. Please try again after ${retryAfter} seconds.`,
                ),
            );
        }

        entry.count += 1;
        next();
    };
};
```

---

### 4.7 Controller

**File:** `src/controllers/auth.controller.js` — **REWRITE**:

Because the target codebase is Express 5, async controller rejections automatically flow into the global error handler. The examples below keep controller code minimal and avoid `try...catch` wrappers that only call `next(err)`.

```javascript
import * as otpService from '../services/otp.service.js';
import * as authService from '../services/auth.service.js';
import { ApiResponse } from '../utils/api-response.js';

/** POST /auth/otp/send */
export const sendOtp = async (req, res) => {
    const { mobile } = req.body;
    const result = await otpService.requestOtp(mobile);
    return res.status(200).json(ApiResponse.success(result, 'OTP sent successfully'));
};

/** POST /auth/otp/verify */
export const verifyOtp = async (req, res) => {
    const { mobile, otp } = req.body;
    await otpService.verifyOtp(mobile, otp);
    const session = await authService.resolveOtpSession(mobile);

    let responseData;
    if (session.isNewUser) {
        responseData = {
            isNewUser: true,
            onboardingToken: session.onboardingToken,
        };
    } else {
        responseData = {
            isNewUser: false,
            user: session.user,
            profile: session.profile,
            accessToken: session.tokens.accessToken,
            refreshToken: session.tokens.refreshToken,
        };
    }

    const message = session.isNewUser
        ? 'OTP verified. Please complete your profile.'
        : 'Login successful';

    return res.status(200).json(ApiResponse.success(responseData, message));
};

/** POST /auth/otp/resend */
export const resendOtp = async (req, res) => {
    const { mobile, retryType } = req.body;
    const result = await otpService.resendOtp(mobile, retryType);
    return res.status(200).json(ApiResponse.success(result, result.message));
};

/** POST /auth/token/refresh */
export const refreshToken = async (req, res) => {
    const { refreshToken: token } = req.body;
    const tokens = await authService.refreshAccessToken(token);
    return res.status(200).json(
        ApiResponse.success(tokens, 'Token refreshed successfully'),
    );
};

/** POST /auth/logout */
export const logout = async (req, res) => {
    await authService.revokeRefreshToken(req.user._id);
    return res.status(200).json(ApiResponse.success(null, 'Logged out successfully'));
};
```

---

### 4.8 Routes

**File:** `src/routes/auth.routes.js` — **REWRITE**:

```javascript
import { Router } from 'express';
import authenticate from '../middleware/authenticate.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { otpRateLimiter } from '../middleware/otp-rate-limiter.middleware.js';
import {
    sendOtpSchema, verifyOtpSchema, resendOtpSchema, refreshTokenSchema,
} from '../validators/auth.validator.js';
import * as authController from '../controllers/auth.controller.js';
import { OTP_RATE_LIMIT } from '../utils/constants.js';

const router = Router();

// ── OTP Endpoints (Public) ──────────────────────────────────────────

router.post('/otp/send',
    otpRateLimiter({ windowMs: OTP_RATE_LIMIT.windowMs, max: OTP_RATE_LIMIT.maxSendPerIp, keyPrefix: 'otp-send-ip', keySource: 'ip' }),
    otpRateLimiter({ windowMs: OTP_RATE_LIMIT.windowMs, max: OTP_RATE_LIMIT.maxSendPerPhone, keyPrefix: 'otp-send-phone', keySource: 'body.mobile' }),
    validate(sendOtpSchema, 'body'),
    authController.sendOtp,
);

router.post('/otp/verify',
    otpRateLimiter({ windowMs: OTP_RATE_LIMIT.windowMs, max: OTP_RATE_LIMIT.maxVerifyPerPhone, keyPrefix: 'otp-verify', keySource: 'body.mobile' }),
    validate(verifyOtpSchema, 'body'),
    authController.verifyOtp,
);

router.post('/otp/resend',
    otpRateLimiter({ windowMs: OTP_RATE_LIMIT.windowMs, max: OTP_RATE_LIMIT.maxSendPerPhone, keyPrefix: 'otp-resend', keySource: 'body.mobile' }),
    validate(resendOtpSchema, 'body'),
    authController.resendOtp,
);

// ── Token Endpoints ─────────────────────────────────────────────────

router.post('/token/refresh', validate(refreshTokenSchema, 'body'), authController.refreshToken);
router.post('/logout', authenticate, authController.logout);

export default router;
```

**Onboarding route wiring:** Update `src/routes/onboarding.routes.js` to import `authenticateOnboarding` (instead of `authenticate`) and use it on both onboarding endpoints:

```diff
- import authenticate from '../middleware/authenticate.middleware.js';
+ import { authenticateOnboarding } from '../middleware/authenticate.middleware.js';

  router.post(
      '/customers',
-     authenticate,
+     authenticateOnboarding,
      uploadCustomerPhoto,
      validate(customerOnboardingSchema, 'body'),
      onboardingController.createCustomerOnboarding,
  );

  router.post(
      '/barbers',
-     authenticate,
+     authenticateOnboarding,
      uploadBarberOnboardingImages,
      validate(barberOnboardingSchema, 'body'),
      onboardingController.createBarberOnboarding,
  );
```

---

### 4.9 Authenticate Middleware

**Best approach:** Keep both auth checks in the same middleware file, but split them into two explicit exports:
- `authenticate` accepts only `TOKEN_TYPE.ACCESS` and populates `req.user`
- `authenticateOnboarding` accepts only `TOKEN_TYPE.ONBOARDING` and populates `req.onboardingContext`
- Refresh tokens are always rejected by both

This keeps normal logged-in routes safe by default while still avoiding a second middleware file.

**File:** `src/middleware/authenticate.middleware.js` — **REWRITE** (JWT-based auth, fully replaces the Firebase `verifyIdToken` implementation and exports both access-route and onboarding-route middleware):

```javascript
import * as authService from '../services/auth.service.js';
import userRepository from '../repositories/user.repository.js';
import { UnauthorizedError } from '../utils/api-error.js';
import logger from '../utils/logger.js';
import { TOKEN_TYPE } from '../utils/constants.js';

/**
 * Shared bearer-token extraction for both auth modes.
 */
const extractBearerToken = (req, missingMessage) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedError(missingMessage);
    }

    const token = authHeader.split(' ')[1];
    if (!token) throw new UnauthorizedError(missingMessage);
    return token;
};

const loadActiveUser = async (userId) => {
    const user = await userRepository.findById(userId);
    if (!user || user.deletedAt || user.isActive === false) {
        throw new UnauthorizedError('Account is inactive or deleted');
    }
    return user;
};

export const authenticate = async (req, _res, next) => {
    try {
        const token = extractBearerToken(req, 'No token provided');
        const decoded = authService.verifyBearerToken(token);

        if (decoded.type !== TOKEN_TYPE.ACCESS) {
            throw new UnauthorizedError('Standard account access token required');
        }

        const user = await loadActiveUser(decoded.sub);

        req.user = {
            _id: user._id,
            roleType: user.roleType,
            phoneNumber: user.phoneNumber,
            email: user.email || null,
            emailVerified: user.emailVerified || false,
        };

        next();
    } catch (err) {
        if (err instanceof UnauthorizedError) return next(err);
        logger.warn('Token verification failed', { error: err.message });
        next(new UnauthorizedError('Invalid or expired token'));
    }
};

export const authenticateOnboarding = async (req, _res, next) => {
    try {
        const token = extractBearerToken(req, 'No token provided');
        const decoded = authService.verifyBearerToken(token);

        if (decoded.type !== TOKEN_TYPE.ONBOARDING) {
            throw new UnauthorizedError('Onboarding token required');
        }

        req.onboardingContext = {
            phoneNumber: decoded.sub,
        };

        next();
    } catch (err) {
        if (err instanceof UnauthorizedError) return next(err);
        logger.warn('Token verification failed', { error: err.message });
        next(new UnauthorizedError('Invalid or expired token'));
    }
};

export default authenticate;
```

---

## 5. JWT Token Strategy

| Aspect | Value | Rationale |
|---|---|---|
| **Access Token Expiry** | 15 minutes | Short-lived to minimize attack window |
| **Refresh Token Expiry** | 180 days (6 months) | Avoids frequent re-authentication for mobile users |
| **Signing Algorithm** | HS256 (HMAC-SHA256) | Sufficient for single-backend apps |
| **Storage (Client)** | Secure storage (Keychain/Keystore) | Never in plain localStorage on web |
| **Storage (Server)** | SHA-256 hash in User model | Never store raw refresh tokens |
| **Rotation** | Every refresh issues new pair | Detects token theft via hash mismatch |
| **Revocation** | Set `refreshTokenHash` to null | Immediate logout / sign-out-everywhere |
| **Onboarding Tokens** | 30 minutes | Used only for onboarding endpoints; signed with access secret (type claim enforces differentiation) |

---

## 6. User Model Changes

**File:** `src/models/user.model.js`

### 6.1 Remove `firebaseUid`

**Remove** the `firebaseUid` field entirely:

```diff
- firebaseUid: {
-     type: String,
-     required: true,
-     unique: true,
-     index: true,
- },
```

### 6.2 Add `refreshTokenHash`

```javascript
refreshTokenHash: {
    type: String,
    default: null,
    select: false,  // Don't include in default queries
},
```

### 6.3 Maintain `email` as Required + Add `emailVerified`

**Keep** the existing `email` field as it is in the database.

**Add** the `emailVerified` field (after `email`):

```javascript
emailVerified: {
    type: Boolean,
    default: false,
},
```

### 6.4 Remove `firebaseUid` logic, Keep `roleType` exact

```javascript
  roleType: {
      type: String,
      required: true,
      enum: ALL_ROLES,
      default: ROLES.CUSTOMER,
  },
```

### 6.5 Updated Indexes

Remove the old `firebaseUid` unique index. Both `email` and `phoneNumber` retain their standard unique indices since we guarantee data presence at creation block.

### 6.6 Full Updated Schema Reference

```javascript
const userSchema = new mongoose.Schema(
    {
        phoneNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
        roleType: {
            type: String,
            required: true,
            enum: ALL_ROLES,
            default: ROLES.CUSTOMER,
        },
        refreshTokenHash: {
            type: String,
            default: null,
            select: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLoginAt: {
            type: Date,
            default: null,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

// Indexes
// Note: phoneNumber and email already have unique indexes from the `unique: true` field option.
// Only add compound indexes that are not automatically created.
userSchema.index({ roleType: 1, isActive: 1 });
```

### 6.7 User Repository Updates

**File:** `src/repositories/user.repository.js`

Remove `findByFirebaseUid`:

```diff
- async findByFirebaseUid(firebaseUid, options = {}) {
-     return User.findOne({ firebaseUid }, null, options);
- }
```

**Add** `findByIdWithRefreshHash`:

```javascript
async findByIdWithRefreshHash(id) {
    return User.findById(id).select('+refreshTokenHash');
}
```

Update `authService.refreshAccessToken()` to use `findByIdWithRefreshHash()` instead of `findById()`.

---

## 7. Firebase — Existing File Changes

Since there are no users or existing data, all `firebaseUid` references are removed directly. **Firebase configuration, credentials, environment variables, and the `firebase-admin` package are intentionally preserved** for the future Google OAuth implementation. This section covers every existing file that currently references `firebaseUid` or calls Firebase services from auth/onboarding code.

### 7.1 Preserve Firebase Config (Required for Google OAuth)

**Do NOT delete these files.** They are required for the future Google OAuth implementation:

| File | Status | Reason |
|---|---|---|
| `src/config/firebase.config.js` | **KEEP** | Firebase Admin SDK initialisation — needed for Google OAuth |
| `firebase-admin-sdk.json` | **KEEP** | Service account credentials — needed for Google OAuth |

The Firebase Admin SDK is no longer imported by any auth or onboarding code after this migration (those now use MSG91 + JWT), but the config file and credentials must remain in place so Google OAuth can be wired up without additional setup.

> ℹ️ When implementing Google OAuth, `firebase.config.js` will be imported by the new Google auth service to call `admin.auth().verifyIdToken()` on the Firebase ID token returned by the client.

### 7.2 Refactor Account Service

**File:** `src/services/account.service.js`

```diff
- import admin from '../config/firebase.config.js';
+ import { revokeRefreshToken } from './auth.service.js';
```

**Remove** the `cleanupFirebaseAccess` function entirely — there is no Firebase to clean up.

**Replace `signOutEverywhere`** — signature changes from `firebaseUid` to `userId`:

```diff
- export const signOutEverywhere = async (firebaseUid) => {
-     await admin.auth().revokeRefreshTokens(firebaseUid);
-     return { revokedAt: new Date().toISOString() };
- };
+ export const signOutEverywhere = async (userId) => {
+     await revokeRefreshToken(userId);
+     return { revokedAt: new Date().toISOString() };
+ };
```

**Update `deleteBarberAccount`:**

```diff
- const firebaseResult = await cleanupFirebaseAccess(authUser.firebaseUid);
+ await revokeRefreshToken(authUser._id);
  return {
      deleted: true,
-     authCleanup: firebaseResult.authCleanup,
+     authCleanup: 'revoked',
  };
```

### 7.3 Refactor Onboarding Controller

**File:** `src/controllers/onboarding.controller.js`

```diff
  export const createCustomerOnboarding = async (req, res) => {
-         const { firebaseUid } = req.user;
-         const result = await onboardingService.createCustomerOnboarding(firebaseUid, req.body, req.file);
-         return res.status(201).json(ApiResponse.success(result, 'Customer profile created'));
+         const { phoneNumber } = req.onboardingContext;
+         const result = await onboardingService.createCustomerOnboarding(phoneNumber, req.body, req.file);
+         const { user, profile, tokens } = result;
+         return res.status(201).json(ApiResponse.success(
+             { user, profile, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
+             'Customer profile created'
+         ));
  };

  export const createBarberOnboarding = async (req, res) => {
-         const { firebaseUid } = req.user;
-         const result = await onboardingService.createBarberOnboarding(firebaseUid, req.user, req.body, req.files);
-         return res.status(201).json(ApiResponse.success(result, 'Barber profile created'));
+         const { phoneNumber } = req.onboardingContext;
+         const result = await onboardingService.createBarberOnboarding(phoneNumber, req.body, req.files);
+         const { user, shop, photos, tokens } = result;
+         return res.status(201).json(ApiResponse.success(
+             { user, shop, photos, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
+             'Barber profile created'
+         ));
  };
```

### 7.4 Refactor Onboarding Service

**File:** `src/services/onboarding.service.js`

#### 7.4.1 Update `ensureUniqueUserIdentity`

A user shouldn't exist because we only trigger this endpoint if the user didn't exist at the time of OTP verification. However, to be perfectly robust against race conditions, we assert uniqueness across `phoneNumber` AND `email`.

```diff
- const ensureUniqueUserIdentity = async ({ firebaseUid, email, phoneNumber }) => {
+ const ensureUniqueUserIdentity = async ({ email, phoneNumber }) => {
      const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
      const normalizedPhoneNumber = phoneNumber ? String(phoneNumber).trim() : null;

      const [emailOwner, phoneOwner] = await Promise.all([
          normalizedEmail ? userRepository.findByEmail(normalizedEmail) : null,
          normalizedPhoneNumber ? userRepository.findByPhone(normalizedPhoneNumber) : null,
      ]);

-     if (emailOwner && emailOwner.firebaseUid !== firebaseUid) {
+     if (emailOwner) {
          throw new ConflictError('Email already registered');
      }

-     if (phoneOwner && phoneOwner.firebaseUid !== firebaseUid) {
+     if (phoneOwner) {
          throw new ConflictError('Phone number already registered');
      }
  };
```

#### 7.4.2 Update `createCustomerOnboarding`

The function now receives the `phoneNumber` directly from the valid `onboardingToken`. Instead of searching by `firebaseUid`, we rely on `ensureUniqueUserIdentity` for both phone and email uniqueness, then freshly create the user. Finally we generate the authentication tokens using the `authService` layer.

```javascript
import * as authService from './auth.service.js';

export const createCustomerOnboarding = async (phoneNumber, profileData, file) => {
    if (!file) throw new BadRequestError('Profile photo is required');

    await ensureUniqueUserIdentity({
        email: profileData.email,
        phoneNumber: phoneNumber,
    });

    // ... location parsing ...

    const user = await userRepository.create({
        phoneNumber: phoneNumber,
        email: profileData.email,
        roleType: ROLES.CUSTOMER,
    });

    const profile = await customerProfileRepo.create({
        userId: user._id,
        // ... mapped profileData fields ...
    });

    const tokens = authService.generateTokenPair(user._id, user.roleType);
    const refreshHash = authService.hashToken(tokens.refreshToken);
    await userRepository.updateById(user._id, { refreshTokenHash: refreshHash });

    return { user, profile, tokens };
};
```

#### 7.4.3 Update `createBarberOnboarding`

The function signature changes from `(firebaseUid, authUser, shopData, files)` to `(phoneNumber, shopData, files)`. `normalizeBarberOnboardingInput(authUser, shopData)` currently reads `authUser.phoneNumber` and `authUser.email`, so we pass a synthetic context object that carries the verified phone number. The email still comes from `shopData`, and `ensureUniqueUserIdentity` remains the single uniqueness gate for both phone and email.

```javascript
export const createBarberOnboarding = async (phoneNumber, shopData, files) => {
    // Build a minimal authUser-like object for normalizeBarberOnboardingInput,
    // which reads authUser.phoneNumber and (optionally) authUser.email.
    const authContext = { phoneNumber, email: null };
    const normalized = normalizeBarberOnboardingInput(authContext, shopData);

    await ensureUniqueUserIdentity({
        email: normalized.email,
        phoneNumber: normalized.phoneNumber,
    });

    // ... Validation and Image Handlers (unchanged) ...

    const user = await userRepository.create({
        phoneNumber: normalized.phoneNumber,
        email: normalized.email,
        roleType: ROLES.BARBER,
    });

    const createdShop = await shopRepository.create({
         ownerId: user._id,
         // ... rest stays the same ...
    });

    const tokens = authService.generateTokenPair(user._id, user.roleType);
    const refreshHash = authService.hashToken(tokens.refreshToken);
    await userRepository.updateById(user._id, { refreshTokenHash: refreshHash });

    return { user, shop: serializeBarberProfile(createdShop, user, { photos }), photos, tokens };
};
```

#### 7.4.4 Update Onboarding Validators

**File:** `src/validators/onboarding.validator.js`

Remove `phoneNumber` from the **customer** onboarding schema — it's already verified and stored from OTP:

```diff
  export const customerOnboardingSchema = Joi.object({
-     phoneNumber: Joi.string().required(),
      email: Joi.string().email().required(),
      firstName: Joi.string().trim().min(1).max(50).required(),
      // ... rest unchanged ...
  });
```

### 7.5 Update User Repository

**File:** `src/repositories/user.repository.js`

Remove `findByFirebaseUid` (already documented in [§6.7](#67-user-repository-updates)):

```diff
- async findByFirebaseUid(firebaseUid, options = {}) {
-     return User.findOne({ firebaseUid }, null, options);
- }
```

### 7.6 Update Upload Middleware

**File:** `src/middleware/upload.middleware.js`

The `resolveActorKey` function must handle both authenticated users (`req.user`) and onboarding users (`req.onboardingContext`). During onboarding, `req.user` is not set — only `req.onboardingContext.phoneNumber` is available.

```diff
- const resolveActorKey = (req) => req.user?._id?.toString() || req.user?.firebaseUid || 'anonymous';
+ const resolveActorKey = (req) => req.user?._id?.toString() || req.onboardingContext?.phoneNumber || 'anonymous';
```

### 7.7 Clean Up Model Comments

Remove historical `firebaseUid` comments from these files:

| File | Comment to remove |
|---|---|
| `models/shop.model.js` | *"ownerId replaces firebaseUid"* |
| `models/service.model.js` | *"Replaces old model that used firebaseUid"* |
| `models/photo.model.js` | *"firebaseUid → shopId"* |
| `models/employee.model.js` | *"shopId replaces old firebaseUid"* |
| `utils/logger.js` | Rename *"Firebase private keys"* → *"private keys"* |

### 7.8 Update Authorize Middleware

**File:** `src/middleware/authorize.middleware.js`

In the new design, `authenticate` is used only on routes that require a fully onboarded user. That means `authorize()` can return to being a pure role-checking middleware, while onboarding routes use `authenticateOnboarding` and do not call `authorize()` at all.

**Remove the `isNewUser` guard** — new users no longer have access tokens (they have onboarding tokens which are rejected by `authenticate`), so this check is unreachable and unnecessary:

```diff
  export const authorize = (...allowedRoles) => {
      return (req, _res, next) => {
          if (!req.user) {
              return next(new UnauthorizedError('Authentication required'));
          }
-
-         if (req.user.isNewUser) {
-             // New users can only access auth/registration endpoints
-             return next(new ForbiddenError('Please complete your profile first'));
-         }
-
          if (!allowedRoles.includes(req.user.roleType)) {
              return next(
                  new ForbiddenError(
                      `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
                  ),
              );
          }

          next();
      };
  };
```

### 7.9 Update Barber Profile Controller & Clean Up Scripts

**File:** `src/controllers/barber/barber-profile.controller.js`

```diff
- const result = await accountService.signOutEverywhere(req.user.firebaseUid);
+ const result = await accountService.signOutEverywhere(req.user._id);
```

**Files to delete:**

| File | Reason |
|---|---|
| `scripts/firebase-token-gen.js` | Firebase test token generator — no longer needed |
| `scripts/verify-token.js` | Firebase token verifier — replace with JWT helper if desired |
| `scripts/test-tokens.txt` | Generated Firebase tokens (delete if present locally) |
| `scripts/test-tokens.json` | Generated Firebase tokens (delete if present locally) |

**File:** `scripts/seed-barber-rating-mock-data.js` — Remove `firebaseUid` from all fixtures and refactor `upsertUser()`:

```diff
- const upsertUser = async ({ firebaseUid, phoneNumber, email, roleType }) => {
-     let user = await withDeleted(User.findOne({ firebaseUid }));
+ const upsertUser = async ({ phoneNumber, email, roleType }) => {
+     let user = await withDeleted(User.findOne({ phoneNumber }));
      if (!user) {
-         user = await User.create({ firebaseUid, phoneNumber, email, roleType });
+         user = await User.create({ phoneNumber, email, roleType });
      }
      return user;
  };
```

**File:** `scripts/regenerate-postman-collections.mjs` — Replace all `customer_firebase_token` → `customer_access_token` and `barber_firebase_token` → `barber_access_token`. Update descriptions and pre-request scripts. See **Part III — Postman Collection Updates** for full details.

**File:** `scripts/README.md` — Remove all Firebase token generation and verification instructions.

### 7.10 Environment & Config — No Firebase Changes

**Keep all `FIREBASE_*` variables** in `.env` and `.env.example`. They are required for the future Google OAuth implementation:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_API_KEY`
- The `# ── Firebase` section header

**Keep all Firebase `.gitignore` entries** — do not remove:

```
# Firebase service account keys or any secrets
firebase-admin-sdk.json
*-firebase-adminsdk-*.json
# Firebase test tokens (in any location)
firebase-tokens.txt
```

Only the new MSG91 + JWT variables added in [§2.1](#21-update-envexample) need to be appended to these files.

### 7.11 Retain Firebase Dependency

**Do NOT uninstall `firebase-admin`.** It is retained for the future Google OAuth implementation.

**Final check — zero `firebaseUid` references in application code:**

```bash
rg -n "firebaseUid" src/
rg -n "firebaseUid" scripts/
```

> Both commands must return zero matches. References to `firebase` itself (in `firebase.config.js`, env vars, and `.gitignore`) are expected and intentional — only the `firebaseUid` database field and its usages should be gone.

---

## 8. Security Best Practices

| Practice | Implementation |
|---|---|
| **Never expose MSG91 auth key** | Only in `.env`, all API calls server-side only |
| **Rate limiting (send)** | 5/phone + 10/IP per 15-min window |
| **Rate limiting (verify)** | 10/phone per 15-min window |
| **Input validation** | Joi schemas; 10-digit Indian mobile regex |
| **Phone number normalization** | Always store with `+91` prefix |
| **JWT secrets** | Min 64 chars, cryptographically random, different for access vs refresh |
| **Refresh token rotation** | New pair on every refresh; hash mismatch = revoke all |
| **Token storage (DB)** | SHA-256 hash only |
| **HTTPS only** | Enforce in production |
| **Sensitive data logging** | Phone numbers masked to last 4 digits |
| **Test mode isolation** | Production guard built into `sms-provider.service.js` |

---

## 9. Error Handling

All errors follow the existing `AppError` hierarchy:

| Scenario | Error Class | Status | Message |
|---|---|---|---|
| Invalid mobile format | `BadRequestError` | 400 | Joi validation message |
| Invalid OTP format | `BadRequestError` | 400 | "OTP must be exactly 6 digits" |
| Wrong/expired OTP | `BadRequestError` | 400 | "Invalid or expired OTP" |
| OTP send failure | `BadRequestError` | 400 | "Failed to send OTP" |
| MSG91 API unavailable | `AppError` | 503 | "SMS service unavailable" |
| Rate limit exceeded | `TooManyRequestsError` | 429 | "Too many requests…" |
| Invalid access token | `UnauthorizedError` | 401 | "Invalid or expired token" |
| Invalid refresh token | `UnauthorizedError` | 401 | "Invalid or expired refresh token" |
| Refresh token mismatch | `UnauthorizedError` | 401 | "Session invalidated" |
| Inactive/deleted account | `UnauthorizedError` | 401 | "Account is inactive or deleted" |
| Onboarding token used on standard API route | `UnauthorizedError` | 401 | "Standard account access token required" |
| Already-onboarded user attempting onboarding | `ConflictError` | 409 | "Phone number already registered" / "Email already registered" |

---

## 10. Future SMS Use Cases

The `sms-provider.service.js` abstraction supports future SMS needs:

| Use Case | Extension |
|---|---|
| **Booking confirmation** | Add `sendTransactionalSms()` with new DLT template |
| **Appointment reminders** | Same + scheduled job (e.g., `node-cron`) |
| **Promotional SMS** | MSG91 Campaign API + promotional DLT template |
| **WhatsApp notifications** | MSG91 WhatsApp Business API |
| **Multi-country OTP** | Accept country code parameter, remove hardcoded `91` |
| **Provider switch** | New provider file with same function signatures; swap import |

**Provider interface contract** — any future SMS provider must export:

```javascript
export const sendOtp = async (mobile) => { /* { success, requestId } */ };
export const verifyOtp = async (mobile, otp) => { /* { success, message } */ };
export const resendOtp = async (mobile, retryType) => { /* { success } */ };
```

---

## 11. API Endpoint Matrix

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/auth/otp/send` | ❌ Public | Send OTP to phone number |
| `POST` | `/api/v1/auth/otp/verify` | ❌ Public | Verify OTP + authenticate |
| `POST` | `/api/v1/auth/otp/resend` | ❌ Public | Resend OTP (text/voice) |
| `POST` | `/api/v1/auth/token/refresh` | ❌ Public | Refresh access token |
| `POST` | `/api/v1/auth/logout` | ✅ Required | Revoke refresh token |

---

## 12. File Map — All Changes at a Glance

```text
server/
├── firebase-admin-sdk.json                  ← KEEP (retained for Google OAuth)
├── .env.example                             ← UPDATE: keep FIREBASE_*, add MSG91 + JWT vars
├── .env                                     ← UPDATE: keep FIREBASE_*, add MSG91 + JWT vars
├── .gitignore                               ← NO CHANGE: Firebase entries retained for Google OAuth
├── package.json                             ← ADD: jsonwebtoken (firebase-admin retained)
    └── src/
    ├── config/
    │   ├── firebase.config.js               ← KEEP (retained for Google OAuth)
    │   ├── msg91.config.js                  ← NEW: default-exported MSG91 settings, endpoints, and headers
    │   └── index.js                         ← UPDATE: keep firebase block; add msg91 + jwt config
    ├── controllers/
    │   ├── auth.controller.js               ← REWRITE: OTP + token + logout handlers
    │   ├── onboarding.controller.js         ← REFACTOR: pass verified onboarding phoneNumber
    │   │                                       from req.onboardingContext
    │   └── barber/
    │       └── barber-profile.controller.js  ← UPDATE: signOutEverywhere(req.user._id)
    ├── middleware/
    │   ├── authenticate.middleware.js        ← REWRITE: universal authenticate middleware;
    │   │                                       populates req.user or req.onboardingContext by token type
    │   ├── authorize.middleware.js           ← UPDATE: remove isNewUser check (no longer reachable)
    │   ├── otp-rate-limiter.middleware.js    ← NEW
    │   └── upload.middleware.js              ← UPDATE: replace firebaseUid fallback with onboardingContext
    ├── models/
    │   ├── user.model.js                    ← REMOVE: firebaseUid; ADD: refreshTokenHash, emailVerified;
    │   ├── shop.model.js                    ← REMOVE: Firebase comments
    │   ├── service.model.js                 ← REMOVE: Firebase comments
    │   ├── photo.model.js                   ← REMOVE: Firebase comments
    │   └── employee.model.js                ← REMOVE: Firebase comments
    ├── repositories/
    │   └── user.repository.js               ← REMOVE: findByFirebaseUid(); ADD: findByIdWithRefreshHash()
    ├── routes/
    │   ├── auth.routes.js                   ← REWRITE: OTP + token + logout 
    │   └── onboarding.routes.js             ← UPDATE: use `authenticateOnboarding` middleware
    ├── services/
    │   ├── auth.service.js                  ← REWRITE: JWT tokens, OTP session (creates onboardingToken),
    │   │                                       refresh rotation
    │   ├── account.service.js               ← REFACTOR: remove firebase-admin, use JWT revocation
    │   ├── onboarding.service.js            ← REFACTOR: receives phoneNumber, CREATES user + profile;
    │   │                                       adds findByPhone guard + ensureUniqueUserIdentity
    │   ├── otp.service.js                   ← NEW
    │   └── sms-provider.service.js          ← NEW
    ├── utils/
    │   ├── constants.js                     ← ADD: OTP_RATE_LIMIT, TOKEN_TYPE constants
    │   └── logger.js                        ← UPDATE: rename "Firebase private keys" comment
    └── validators/
        ├── auth.validator.js                ← REWRITE: OTP + token schemas
        └── onboarding.validator.js          ← UPDATE: remove phoneNumber from customer schema
```

---

## 13. Pre-Launch Checklist

### Backend Implementation

- [ ] `jsonwebtoken` installed; `firebase-admin` **retained** (required for Google OAuth — do not uninstall)
- [ ] `firebase.config.js` and `firebase-admin-sdk.json` **preserved** (required for Google OAuth)
- [ ] `FIREBASE_*` env vars **retained** in `.env` and `.env.example` (required for Google OAuth)
- [ ] `config/index.js` updated — `firebase` block kept; `msg91` + `jwt` sections added
- [ ] `config/msg91.config.js` added — default-exports the configured `msg91` object
- [ ] `sms-provider.service.js` created and tested
- [ ] `otp.service.js` created and tested
- [ ] `auth.service.js` fully rewritten — issues `onboardingToken` for new users, `accessToken` for returning
- [ ] `auth.validator.js` rewritten with OTP/token schemas
- [ ] `otp-rate-limiter.middleware.js` created
- [ ] `auth.controller.js` rewritten — returns `onboardingToken` for new users, `accessToken`/`refreshToken` for returning users
- [ ] `auth.routes.js` rewritten with all new routes
- [ ] `onboarding.routes.js` updated — uses `authenticateOnboarding` for onboarding endpoints
- [ ] `authenticate.middleware.js` rewritten — exports `authenticate` for fully onboarded routes and `authenticateOnboarding` for onboarding-only routes
- [ ] `authorize.middleware.js` updated — pure role checks after `authenticate`
- [ ] `user.model.js` changes applied:
  - [ ] `firebaseUid` removed
  - [ ] `refreshTokenHash` added (select: false)
  - [ ] `emailVerified` added (Boolean, default: false)
  - [ ] Keeps `email` strictly required and strictly unique
- [ ] `user.repository.js` — `findByFirebaseUid()` removed, `findByIdWithRefreshHash()` added
- [ ] `constants.js` updated — `ONBOARDING` token type added, OTP + `TOKEN_TYPE` constants
- [ ] `account.service.js` refactored to use JWT revocation
- [ ] `onboarding.controller.js` refactored — relies on `req.onboardingContext.phoneNumber`
- [ ] `onboarding.service.js` refactored — explicitly CREATES user upon completion of the profile
- [ ] `onboarding.validator.js` — `phoneNumber` removed from customer onboarding schema
- [ ] `shop.model.js` — Firebase-related comments removed
- [ ] `upload.middleware.js` — `resolveActorKey` updated to use `req.onboardingContext.phoneNumber` fallback
- [ ] `barber-profile.controller.js` updated to pass `req.user._id` to `signOutEverywhere`
- [ ] Firebase-related model comments removed
- [ ] Seed script updated to use `phoneNumber` identity
- [ ] All OTP endpoints tested (test mode)
- [ ] Refresh token rotation tested (happy path + theft detection)
- [ ] New user → OTP → onboardingToken → CUSTOMER onboarding flow tested end-to-end
- [ ] New user → OTP → onboardingToken → BARBER onboarding flow tested end-to-end
- [ ] Onboarding tokens blocked from standard API routes (401 test)
- [ ] Already-onboarded user bypassing OTP to reuse old onboarding token is blocked (409 test)
- [ ] Rate limiting tested (send + verify)
- [ ] `rg "firebaseUid" src/` returns zero matches (Firebase config files are expected to remain)

### Security

- [ ] JWT secrets generated (64+ chars, cryptographically random)
- [ ] Different secrets for access vs refresh tokens
- [ ] MSG91 Auth Key in `.env` only
- [ ] Phone numbers masked in all log output
- [ ] Rate limits configured and tested
- [ ] CORS origins restricted in production
- [ ] HTTPS enforced in production

### External Setup

See ****Part II — MSG91 Account, DLT & External Setup**** for MSG91 account and DLT checklist.

### Postman & Tooling

See ****Part III — Postman Collection Updates**** for collection updates.

### Client (Mobile App)

- [ ] App updated to use `/auth/otp/send` and `/auth/otp/verify`
- [ ] App handles `isNewUser: true` response → navigates to onboarding with token stored
- [ ] App sends `Bearer <onboardingToken>` in onboarding requests
- [ ] Token storage uses device secure storage (Keychain/Keystore)
- [ ] Auto-refresh logic implemented using `/auth/token/refresh`
- [ ] Logout calls `/auth/logout`
- [ ] Error handling for 401 (redirect to login), and 429 (show retry timer)

---

*This guide is designed for direct implementation within the EverCut `server/` codebase. Every code sample follows existing project conventions: ES Modules, Express 5 router patterns, Joi validation, the AppError/ApiResponse pattern, and the repository → service → controller → route layered architecture.*

---

# Part II — MSG91 Account, DLT & External Setup

> **When to use:** Complete these steps **before** implementing the backend integration.

---

## 1. Create MSG91 Account

1. Sign up at [msg91.com](https://msg91.com)
2. Navigate to **Dashboard → OTP** → Create a new OTP configuration
3. Note your **Auth Key** from **Dashboard → API Keys**
4. Create an **OTP Template**:
   - Go to **OTP → Templates → Create Template**
   - Template text: `Your OTP for EverCut is {otp}. Valid for {expiry} minutes. Do not share this code.`
   - Set OTP length: **6 digits**
   - Set OTP expiry: **10 minutes**
   - Note the generated **Template ID**

---

## 2. DLT Registration (Mandatory for India Production)

| Step | Action | Timeline | Cost |
|---|---|---|---|
| 1 | Register as **Principal Entity** on a DLT portal (Jio TrueConnect / Airtel DLT / Vi) | 1–3 working days | ~₹5,900/year (incl. GST) |
| 2 | Register **Sender ID** (Header): `EVRCUT` (6 chars, representing your brand) | 1–2 working days | ₹0 (included) |
| 3 | Register **OTP Template**: `Your OTP for EverCut is {#var#}. Valid for {#var#} minutes. Do not share this code.` | 1–2 working days | ₹0 (included) |
| 4 | **PE–TM Chain Binding**: Add MSG91 (Walkover Web Solutions) as your Telemarketer in the DLT portal | Immediate | ₹0 |
| 5 | In MSG91 Dashboard → **Settings → DLT**: Enter your DLT Entity ID, Sender ID, and approved Template ID | Immediate | ₹0 |

**Required Documents:**
- Company PAN Card
- GST Certificate (or Certificate of Incorporation)
- Authorized signatory ID proof (Aadhaar / PAN / Passport)
- Authorization Letter on company letterhead

---

## 3. Test / Sandbox Environment

Since DLT registration takes 1–2 weeks, use these strategies for development:

### 3.1 Development Bypass (Recommended)

In `src/config/index.js`, flip `testMode: true` inside the `msg91` config block. This makes `sms-provider.service.js`:
- **Skip MSG91 API calls** entirely
- Accept the hardcoded OTP (`testOtp: '123456'` in the same config block)
- Log the "sent" OTP to console for debugging

### 3.2 Staging with Real SMS

Once DLT is approved:
- Use a separate MSG91 project/auth key for staging
- Top up with minimal credits (~₹500) for testing
- Restrict to a whitelist of team phone numbers initially

---

## 4. Pre-Launch Checklist — External Setup

- [ ] MSG91 account created and Auth Key obtained
- [ ] OTP template created in MSG91 dashboard (note Template ID)
- [ ] DLT Entity Registration submitted (Jio/Airtel/Vi) — ~1–2 weeks
- [ ] DLT Sender ID registered: `EVRCUT`
- [ ] DLT OTP template text approved
- [ ] PE–TM chain binding: MSG91 (Walkover) added as Telemarketer
- [ ] DLT Entity ID + Sender ID + Template ID configured in MSG91 dashboard
- [ ] Calendar reminder set for annual DLT renewal (~₹5,900/year)

---

# Part III — Postman Collection Updates

> **When to use:** After the backend implementation and Firebase removal are complete.

---

## 1. Environment File

**File:** `postman-collections/EverCut.postman_environment.json`

Replace Firebase token variables with OTP/JWT variables:

```json
{
  "id": "evercut-local-environment",
  "name": "EverCut Local",
  "values": [
    { "key": "base_url", "value": "http://localhost:5000", "enabled": true },
    { "key": "api_prefix", "value": "api/v1", "enabled": true },
    { "key": "test_customer_mobile", "value": "9876543210", "enabled": true },
    { "key": "test_barber_mobile", "value": "9876543211", "enabled": true },
    { "key": "test_otp", "value": "123456", "enabled": true },
    { "key": "customer_access_token", "value": "", "enabled": true },
    { "key": "customer_refresh_token", "value": "", "enabled": true },
    { "key": "customer_onboarding_token", "value": "", "enabled": true },
    { "key": "barber_access_token", "value": "", "enabled": true },
    { "key": "barber_refresh_token", "value": "", "enabled": true },
    { "key": "barber_onboarding_token", "value": "", "enabled": true }
  ],
  "_postman_variable_scope": "environment"
}
```

| Variable | Purpose | Dev Value |
|---|---|---|
| `test_customer_mobile` | Test customer phone (10-digit) | `9876543210` |
| `test_barber_mobile` | Test barber phone (10-digit) | `9876543211` |
| `test_otp` | Hardcoded OTP used in test mode (only when `msg91.testMode` is `true` in `config/index.js`) | `123456` |
| `customer_access_token` | Auto-set by auth or onboarding collections | *(set by test script)* |
| `customer_refresh_token` | Auto-set by auth or onboarding collections | *(set by test script)* |
| `barber_access_token` | Auto-set by auth or onboarding collections | *(set by test script)* |
| `barber_refresh_token` | Auto-set by auth or onboarding collections | *(set by test script)* |
| `customer_onboarding_token` | Auto-set by auth collection | *(set by test script)* |
| `barber_onboarding_token` | Auto-set by auth collection | *(set by test script)* |

---

## 2. Rewrite `01-authentication.json`

The authentication collection uses the full OTP flow with 9 requests:

| # | Method | Endpoint | Description | Auth |
|---|---|---|---|---|
| 1 | POST | `/api/v1/auth/otp/send` | Send OTP to customer test number | None |
| 2 | POST | `/api/v1/auth/otp/verify` | Verify customer OTP → captures onboarding or session tokens | None |
| 3 | POST | `/api/v1/auth/otp/send` | Send OTP to barber test number | None |
| 4 | POST | `/api/v1/auth/otp/verify` | Verify barber OTP → captures onboarding or session tokens | None |
| 5 | POST | `/api/v1/auth/token/refresh` | Refresh customer access token | None |
| 6 | POST | `/api/v1/auth/token/refresh` | Refresh barber access token | None |
| 7 | POST | `/api/v1/auth/logout` | Logout customer | Bearer `{{customer_access_token}}` |
| 8 | POST | `/api/v1/auth/otp/resend` | Resend OTP (text channel) | None |
| 9 | GET | `/api/v1/health` | Health check | None |

### 2.1 Collection Variables

```json
"variable": [
  { "key": "base_url", "value": "http://localhost:5000", "type": "string" },
  { "key": "api_prefix", "value": "api/v1", "type": "string" },
  { "key": "test_customer_mobile", "value": "9876543210", "type": "string" },
  { "key": "test_barber_mobile", "value": "9876543211", "type": "string" },
  { "key": "test_otp", "value": "123456", "type": "string" },
  { "key": "customer_access_token", "value": "", "type": "string" },
  { "key": "customer_refresh_token", "value": "", "type": "string" },
  { "key": "customer_onboarding_token", "value": "", "type": "string" },
  { "key": "barber_access_token", "value": "", "type": "string" },
  { "key": "barber_refresh_token", "value": "", "type": "string" },
  { "key": "barber_onboarding_token", "value": "", "type": "string" }
]
```

### 2.2 Pre-Request Script

```javascript
const readScopedValue = (...keys) => {
  for (const key of keys) {
    const environmentValue = pm.environment.get(key);
    if (environmentValue) return environmentValue;
    const globalValue = pm.globals.get(key);
    if (globalValue) return globalValue;
  }
  return '';
};
const baseUrl = readScopedValue('base_url');
if (baseUrl) { pm.collectionVariables.set('base_url', baseUrl); }
const apiPrefix = readScopedValue('api_prefix');
if (apiPrefix) { pm.collectionVariables.set('api_prefix', apiPrefix); }

// Sync OTP test variables
const customerMobile = readScopedValue('test_customer_mobile');
if (customerMobile) { pm.collectionVariables.set('test_customer_mobile', customerMobile); }
const barberMobile = readScopedValue('test_barber_mobile');
if (barberMobile) { pm.collectionVariables.set('test_barber_mobile', barberMobile); }
const testOtp = readScopedValue('test_otp');
if (testOtp) { pm.collectionVariables.set('test_otp', testOtp); }
```

### 2.3 Send OTP Request (Example - Customer)

```json
{
  "name": "1. Send Customer OTP",
  "request": {
    "method": "POST",
    "header": [{ "key": "Content-Type", "value": "application/json" }],
    "url": "{{base_url}}/{{api_prefix}}/auth/otp/send",
    "body": {
      "mode": "raw",
      "raw": "{\n  \"mobile\": \"{{test_customer_mobile}}\"\n}",
      "options": { "raw": { "language": "json" } }
    },
    "auth": { "type": "noauth" }
  },
  "event": [{
    "listen": "test",
    "script": {
      "type": "text/javascript",
      "exec": ["pm.test('status is 200', function () { pm.response.to.have.status(200); });"]
    }
  }]
}
```

### 2.4 Verify OTP Request (Example - Customer, with Auto-Capture)

```json
{
  "name": "2. Verify Customer OTP",
  "request": {
    "method": "POST",
    "header": [{ "key": "Content-Type", "value": "application/json" }],
    "url": "{{base_url}}/{{api_prefix}}/auth/otp/verify",
    "body": {
      "mode": "raw",
      "raw": "{\n  \"mobile\": \"{{test_customer_mobile}}\",\n  \"otp\": \"{{test_otp}}\"\n}",
      "options": { "raw": { "language": "json" } }
    },
    "auth": { "type": "noauth" }
  },
  "event": [{
    "listen": "test",
    "script": {
      "type": "text/javascript",
      "exec": [
        "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
        "const response = pm.response.json();",
        "const data = response.data || {};",
        "",
        "// Capture tokens for use by all other collections",
        "if (data.isNewUser && data.onboardingToken) {",
        "  pm.collectionVariables.set('customer_onboarding_token', data.onboardingToken);",
        "  pm.environment.set('customer_onboarding_token', data.onboardingToken);",
        "} else {",
        "  if (data.accessToken) {",
        "    pm.collectionVariables.set('customer_access_token', data.accessToken);",
        "    pm.environment.set('customer_access_token', data.accessToken);",
        "  }",
        "  if (data.refreshToken) {",
        "    pm.collectionVariables.set('customer_refresh_token', data.refreshToken);",
        "    pm.environment.set('customer_refresh_token', data.refreshToken);",
        "  }",
        "}",
        "",
        "pm.collectionVariables.set('last_session_role', 'CUSTOMER');",
        "pm.collectionVariables.set('last_session_is_new_user', String(Boolean(data.isNewUser)));"
      ]
    }
  }]
}
```

### 2.5 Refresh Token Request (Example - Customer)

```json
{
  "name": "5. Refresh Customer Token",
  "request": {
    "method": "POST",
    "header": [{ "key": "Content-Type", "value": "application/json" }],
    "url": "{{base_url}}/{{api_prefix}}/auth/token/refresh",
    "body": {
      "mode": "raw",
      "raw": "{\n  \"refreshToken\": \"{{customer_refresh_token}}\"\n}",
      "options": { "raw": { "language": "json" } }
    },
    "auth": { "type": "noauth" }
  },
  "event": [{
    "listen": "test",
    "script": {
      "type": "text/javascript",
      "exec": [
        "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
        "const response = pm.response.json();",
        "const data = response.data || {};",
        "if (data.accessToken) {",
        "  pm.collectionVariables.set('customer_access_token', data.accessToken);",
        "  pm.environment.set('customer_access_token', data.accessToken);",
        "}",
        "if (data.refreshToken) {",
        "  pm.collectionVariables.set('customer_refresh_token', data.refreshToken);",
        "  pm.environment.set('customer_refresh_token', data.refreshToken);",
        "}"
      ]
    }
  }]
}
```

### 2.6 Logout Request (Example - Customer)

```json
{
  "name": "7. Logout Customer (Terminal)",
  "request": {
    "method": "POST",
    "header": [],
    "url": "{{base_url}}/{{api_prefix}}/auth/logout",
    "auth": {
      "type": "bearer",
      "bearer": [{ "key": "token", "value": "{{customer_access_token}}", "type": "string" }]
    }
  },
  "event": [{
    "listen": "test",
    "script": {
      "type": "text/javascript",
      "exec": [
        "pm.test('status is 200', function () { pm.response.to.have.status(200); });",
        "pm.environment.set('customer_access_token', '');",
        "pm.environment.set('customer_refresh_token', '');"
      ]
    }
  }]
}
```

---

## 3. Update All Downstream Collections (02-13)

Every collection needs **three changes**:

### 3.1 Collection-Level `auth` - Use JWT Access Tokens

**Customer Onboarding collection** (`02-onboarding.json` Customer request):
```json
"auth": {
  "type": "bearer",
  "bearer": [{ "key": "token", "value": "{{customer_onboarding_token}}", "type": "string" }]
}
```

**Barber Onboarding collection** (`02-onboarding.json` Barber request):
```json
"auth": {
  "type": "bearer",
  "bearer": [{ "key": "token", "value": "{{barber_onboarding_token}}", "type": "string" }]
}
```

**Customer collections** (03, 04, 05, 06):

```json
"auth": {
  "type": "bearer",
  "bearer": [{ "key": "token", "value": "{{customer_access_token}}", "type": "string" }]
}
```

**Barber collections** (07, 08, 09, 10, 11, 12, 13):

```json
"auth": {
  "type": "bearer",
  "bearer": [{ "key": "token", "value": "{{barber_access_token}}", "type": "string" }]
}
```

### 3.2 Collection Variables

For **all** downstream collections (02–13), add the access token variables:

```json
{ "key": "customer_access_token", "value": "", "description": "JWT access token - auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup" }
{ "key": "barber_access_token", "value": "", "description": "JWT access token - auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup" }
```

For **`02-onboarding.json` only**, also add the onboarding token variables — these are required because `02-onboarding.json` uses `{{customer_onboarding_token}}` and `{{barber_onboarding_token}}` as its Bearer tokens (see §3.1), and collection variables must be declared for template references to resolve:

```json
{ "key": "customer_onboarding_token", "value": "", "description": "Short-lived onboarding JWT - auto-set by 01-authentication.json when a new customer is detected" }
{ "key": "barber_onboarding_token", "value": "", "description": "Short-lived onboarding JWT - auto-set by 01-authentication.json when a new barber is detected" }
```

### 3.3 Pre-Request Script - Sync JWT Tokens

```javascript
// Must be redefined here — Postman does not share scope between collection scripts.
const readScopedValue = (...keys) => {
  for (const key of keys) {
    const environmentValue = pm.environment.get(key);
    if (environmentValue) return environmentValue;
    const globalValue = pm.globals.get(key);
    if (globalValue) return globalValue;
  }
  return '';
};

const customerToken = readScopedValue('customer_access_token');
if (customerToken) { pm.collectionVariables.set('customer_access_token', customerToken); }

const barberToken = readScopedValue('barber_access_token');
if (barberToken) { pm.collectionVariables.set('barber_access_token', barberToken); }
```

### 3.4 Per-File Summary

| File | Token Variable |
|---|---|
| `02-onboarding.json` | Both `customer_onboarding_token` + `barber_onboarding_token` |
| `03-customer-profile.json` | `customer_access_token` |
| `04-customer-bookings.json` | `customer_access_token` |
| `05-customer-shop-discovery.json` | `customer_access_token` |
| `06-customer-ratings.json` | `customer_access_token` |
| `07-barber-profile-shop.json` | `barber_access_token` |
| `08-barber-employees.json` | `barber_access_token` |
| `09-barber-services.json` | `barber_access_token` |
| `10-barber-bookings.json` | `barber_access_token` |
| `11-barber-photos.json` | `barber_access_token` |
| `12-barber-earnings.json` | `barber_access_token` |
| `13-barber-ratings.json` | `barber_access_token` |

---

## 4. Update Collection Descriptions

| Collection | New Description |
|---|---|
| `01-authentication.json` | `"OTP authentication endpoints for customer and barber test users. Sends OTP, verifies it, and captures onboarding tokens for brand-new users or JWT access/refresh tokens for returning users. Requires msg91.testMode set to true in config/index.js for local development."` |
| `02-onboarding.json` | `"Customer and barber onboarding requests wired for the OTP test users and the local sample upload asset. Run 01-authentication.json first to populate onboarding tokens. Upon successful onboarding, access and refresh tokens are captured for the other collections."` |
| `07-barber-profile-shop.json` | `"Barber profile and shop management collection. Uses the barber JWT access token captured by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup."` |

Request **9A** in `07-barber-profile-shop.json`:

```
"Revokes the JWT refresh token, invalidating all sessions. Run this only when you are finished testing."
```

Request **9B** in `07-barber-profile-shop.json`:

```
"Soft-deletes the barber account and revokes the JWT refresh token. Run this instead of the sign-out request when you want the account deleted."
```

---

## 5. Update `README.md`

**File:** `postman-collections/README.md`

### 5.1 Setup

```markdown
### Prerequisites

1. In `src/config/index.js`, set `testMode: true` inside the `msg91` config block to skip real SMS in development. (The default is `false`; the inline comment says "flip to true in dev to skip real SMS".)
2. The test OTP is hardcoded as `123456` via `testOtp: '123456'` in the same config block — no env var needed.
3. Start the server: `npm run dev`

No manual token generation needed - the authentication and onboarding collections handle token capture automatically.
```

### 5.2 Import Steps

```markdown
### Import into Postman

1. Import every `.json` collection from this folder.
2. Import `EverCut.postman_environment.json` as the active environment.
3. Verify `test_customer_mobile`, `test_barber_mobile`, and `test_otp` are set in the environment.
4. Run `01-authentication.json` requests 1-4 to send+verify OTP for both test users.
5. Returning users get access tokens immediately; brand-new users get onboarding tokens first and then receive access tokens from `02-onboarding.json`.
6. Run other collections in order.

```

### 5.3 Test Users

| Role | MongoDB `_id` | Email | Phone |
|---|---|---|---|
| Customer | *(auto-generated on first successful onboarding)* | `test.customer@example.com` | `9876543210` |
| Barber | *(auto-generated on first successful onboarding)* | `test.barber@example.com` | `9876543211` |

### 5.4 Environment Variables

| Variable | Value |
|---|---|
| `base_url` | `http://localhost:5000` |
| `api_prefix` | `api/v1` |
| `test_customer_mobile` | `9876543210` |
| `test_barber_mobile` | `9876543211` |
| `test_otp` | `123456` |
| `customer_access_token` | *(auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup)* |
| `customer_refresh_token` | *(auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup)* |
| `barber_access_token` | *(auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup)* |
| `barber_refresh_token` | *(auto-set by 01-authentication.json for returning users or by 02-onboarding.json after first-time signup)* |
| `customer_onboarding_token` | *(auto-set by 01-authentication.json)* |
| `barber_onboarding_token` | *(auto-set by 01-authentication.json)* |

### 5.5 Auth Collection Requests

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | POST | `/api/v1/auth/otp/send` | Send OTP to customer |
| 2 | POST | `/api/v1/auth/otp/verify` | Verify customer OTP - captures onboarding or session tokens |
| 3 | POST | `/api/v1/auth/otp/send` | Send OTP to barber |
| 4 | POST | `/api/v1/auth/otp/verify` | Verify barber OTP - captures onboarding or session tokens |
| 5 | POST | `/api/v1/auth/token/refresh` | Refresh customer access token |
| 6 | POST | `/api/v1/auth/token/refresh` | Refresh barber access token |
| 7 | POST | `/api/v1/auth/logout` | Logout customer *(Terminal)* |
| 8 | POST | `/api/v1/auth/otp/resend` | Resend OTP (text channel) |
| 9 | GET | `/api/v1/health` | Health check |

### 5.6 Recommended Run Order

**Barber side** (must run first to create bookable data):

1. `01-authentication.json` → **3. Send Barber OTP** → **4. Verify Barber OTP**
2. `02-onboarding.json` → **2. Complete Barber Profile** *(first run only)*
3. Continue with barber collections in order...

**Customer side:**

1. `01-authentication.json` → **1. Send Customer OTP** → **2. Verify Customer OTP**
2. `02-onboarding.json` → **1. Complete Customer Profile** *(first run only)*
3. Continue with customer collections in order...

---

## 6. Update Postman Collection Generator

**File:** `scripts/regenerate-postman-collections.mjs`

This script is the **source of truth** that generates all Postman JSON files. Apply these changes:

| Find | Replace |
|---|---|
| `customer_firebase_token` | `customer_access_token` |
| `barber_firebase_token` | `barber_access_token` |
| `bearerAuth('customer_firebase_token')` | `bearerAuth('customer_access_token')` |
| `bearerAuth('barber_firebase_token')` | `bearerAuth('barber_access_token')` |

Also update:
- Collection descriptions - remove Firebase references, use OTP/JWT descriptions from [Section 4](#4-update-collection-descriptions)
- Pre-request scripts - replace `readScopedValue('customer_firebase_token')` / `readScopedValue('barber_firebase_token')` with access token equivalents
- Environment variable definitions - replace Firebase token entries with OTP/JWT variables from [Section 1](#1-environment-file)
- **Onboarding Auth Token:** The `02-onboarding.json` collection needs to inject the `onboardingToken` into the Bearer token instead of the standard `accessToken`.
- **Onboarding Response Capture:** Add a post-request script to `02-onboarding.json` requests to capture the newly returned `accessToken` and `refreshToken` and set them into the postman environment, overwriting any previous values and fully logging in the user after successful onboarding.

After updating, regenerate and verify:

```bash
node scripts/regenerate-postman-collections.mjs
rg -n "firebase_token\|firebase_firebase\|customer_firebase\|barber_firebase" postman-collections/    # must return zero matches
```

---

## 7. File Matrix

```text
postman-collections/
├── 01-authentication.json           ← REWRITE: OTP flow (9 requests)
├── 02-onboarding.json               ← UPDATE: auth vars + descriptions
├── 03-customer-profile.json         ← UPDATE: use customer_access_token
├── 04-customer-bookings.json        ← UPDATE: use customer_access_token
├── 05-customer-shop-discovery.json  ← UPDATE: use customer_access_token
├── 06-customer-ratings.json         ← UPDATE: use customer_access_token
├── 07-barber-profile-shop.json      ← UPDATE: use barber_access_token + descriptions
├── 08-barber-employees.json         ← UPDATE: use barber_access_token
├── 09-barber-services.json          ← UPDATE: use barber_access_token
├── 10-barber-bookings.json          ← UPDATE: use barber_access_token
├── 11-barber-photos.json            ← UPDATE: use barber_access_token
├── 12-barber-earnings.json          ← UPDATE: use barber_access_token
├── 13-barber-ratings.json           ← UPDATE: use barber_access_token
├── EverCut.postman_environment.json ← REWRITE: OTP + JWT variables only
└── README.md                        ← REWRITE: setup, run order, variables
```
