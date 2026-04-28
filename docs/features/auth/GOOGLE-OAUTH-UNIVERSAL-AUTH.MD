# Google OAuth + OTP: Universal Authentication Architecture
### Progressive Token Issuance — Complete Reference

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & Configuration](#2-prerequisites--configuration)
3. [Database Model Updates](#3-database-model-updates)
4. [Constants](#4-constants)
5. [Token Service — Progressive Onboarding Token](#5-token-service--progressive-onboarding-token)
6. [OTP Verify Service — Phone-First Flow](#6-otp-verify-service--phone-first-flow)
7. [Google OAuth Service — Google-First Flow](#7-google-oauth-service--google-first-flow)
8. [Phone Upgrade Service — Google-First Flow, Phase 2](#8-phone-upgrade-service--google-first-flow-phase-2)
9. [Controllers & Routes](#9-controllers--routes)
10. [Onboarding Service](#10-onboarding-service)
11. [Onboarding Controller & Route](#11-onboarding-controller--route)
12. [Middleware — `authenticateOnboarding`](#12-middleware--authenticateonboarding)
13. [Validation Schemas (Joi)](#13-validation-schemas-joi)
14. [Complete Flow Diagrams](#14-complete-flow-diagrams)
15. [Edge Cases & Error Handling](#15-edge-cases--error-handling)
16. [Security Checklist](#16-security-checklist)

---

## 1. Architecture Overview

### The Core Problem

Your database has a hard constraint: every `User` record **must** have both a `phoneNumber` and an `email`. The two providers each verify only one of them:

| Provider    | Verified Upfront | Missing       |
|-------------|------------------|---------------|
| MSG91 OTP   | `phoneNumber`    | `email`       |
| Google OAuth| `email`          | `phoneNumber` |

A naive solution would write a partial `User` to the database and fill it in later. This creates orphaned records, broken constraint logic, and a support nightmare.

### The Solution: Progressive Token Issuance

The **Onboarding Token** is a short-lived, server-signed JWT that acts as a cryptographic receipt of what has been verified so far. Critically, it progresses through two defined states before the database is ever touched:

| Step | Constant | Contains | Issued After |
|------|----------|----------|--------------|
| `needs_phone` | `ONBOARDING_STEP.NEEDS_PHONE` | `email`, `googleId` | Google sign-in (new user) |
| `ready_for_profile` | `ONBOARDING_STEP.READY` | `phoneNumber` (+ optionally `email`, `googleId`) | OTP verification (either flow) |

The `POST /onboarding/customers` endpoint **only accepts `ready_for_profile` tokens**. It is structurally impossible to create a User without a verified phone number.

### Why This Matters

Without the `step` gate, a user with a `needs_phone` Google token could call `POST /onboarding/customers` directly, submit any phone number they want, and register it unverified. The `step` flag closes this gap at the middleware level — before any service logic runs.

### The Two Flows

```
[Phone-First Flow]                        [Google-First Flow]
        │                                          │
POST /auth/otp/send                    POST /auth/google
        │                                          │
POST /auth/otp/verify                Issue needs_phone token
        │                                          │
Issue ready_for_profile token       POST /auth/otp/send (for phone)
  { step:'ready_for_profile',               │
    provider:'phone',              POST /auth/onboarding/verify-phone
    phoneNumber }                            │
        │                           Issue ready_for_profile token
        │                             { step:'ready_for_profile',
        │                               provider:'google',
        │                               phoneNumber, email, googleId }
        │                                          │
        └──────────────────┬───────────────────────┘
                           ▼
              POST /onboarding/customers
          (middleware enforces step: ready_for_profile)
          (client provides: name, email OR phoneNumber)
                           │
                           ▼
              User + Profile created ✅
    (both phone AND email verified before DB write)
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| `step` flag instead of separate token types | A single `ONBOARDING` token type with a `step` discriminator keeps middleware simple while making the state machine explicit and extensible. |
| `step` enforced in middleware, not the service | Enforcement at the boundary means the onboarding service never receives an incomplete context. It is a structural guarantee, not a runtime check. |
| `findByGoogleId` lookup first, email second | `googleId` (the `sub` claim) is Google's permanent, immutable account identifier. It does not change if the user changes their Gmail address. Email is a fallback for account linking only. |
| Hard error on `googleId` conflict | If a `googleId` is already bound to a *different* account, silently overwriting it is a security hole. A `ConflictError` forces the anomaly to be investigated. |
| `emailVerified: true` for Google users | Google has already verified the email before issuing an ID Token. Recording this allows other parts of the system (email guards, etc.) to trust it without re-verification. |
| Phone is always OTP-verified | Both flows end with a phone number that was verified by MSG91 in the current session and signed into the JWT by the backend. The database never receives an unverified phone number. |
| 60-minute token lifetime | The OTP window (typically 10 minutes) is only needed for the 30 seconds the user types the code. Once verified, the state lives in the signed token for 60 minutes — ample time for a multi-step form. |

---

## 2. Prerequisites & Configuration

### Install the Google Auth Library

```bash
npm install google-auth-library
```

### Environment Variables

```dotenv
# Your Google OAuth Client ID (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com

# Comma-separated list of valid audiences.
# Include separate iOS/Android client IDs if applicable.
GOOGLE_AUDIENCE=web_client_id.apps.googleusercontent.com,ios_client_id.apps.googleusercontent.com
```

### `src/config/index.js`

```js
export default {
  // ... existing config
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    audience: process.env.GOOGLE_AUDIENCE
      ? process.env.GOOGLE_AUDIENCE.split(',').map((s) => s.trim())
      : [process.env.GOOGLE_CLIENT_ID],
  },
};
```

---

## 3. Database Model Updates

### `src/models/user.model.js`

```js
import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.constants.js';

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
    googleId: {
      type: String,
      unique: true,
      // sparse: true is mandatory — allows many documents to have null/undefined
      // without conflicting on the unique index. OTP-only users will not have this.
      sparse: true,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      // false by default; set to true immediately for Google-authenticated users
      // because Google guarantees email verification before issuing an ID Token.
      default: false,
    },
    roleType: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    // ... rest of your existing fields
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
```

### Repository Methods Required

```js
// src/repositories/user.repository.js
findByEmail(email)                    // existing
findByPhone(phoneNumber)              // existing
findByGoogleId(googleId)             // ADD — primary lookup for Google users
updateById(id, updates)               // existing
updateLastLogin(id)                   // existing
updateRefreshTokenHash(id, token)     // existing
create(data)                          // existing
```

---

## 4. Constants

### `src/constants/token.constants.js`

```js
export const TOKEN_TYPE = {
  ACCESS: 'ACCESS',
  REFRESH: 'REFRESH',
  ONBOARDING: 'ONBOARDING',
};

/**
 * Onboarding step discriminator.
 *
 * NEEDS_PHONE  — Google identity verified; phone not yet verified.
 *                Token carries: provider, email, googleId.
 *                Only valid on: POST /auth/onboarding/verify-phone
 *
 * READY        — Phone verified (and optionally email + googleId from Google flow).
 *                Token carries: provider, phoneNumber (+ email, googleId if Google flow).
 *                Only valid on: POST /onboarding/customers
 */
export const ONBOARDING_STEP = {
  NEEDS_PHONE: 'needs_phone',
  READY: 'ready_for_profile',
};
```

---

## 5. Token Service — Progressive Onboarding Token

### `src/services/auth.service.js`

```js
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { TOKEN_TYPE, ONBOARDING_STEP } from '../constants/token.constants.js';

/**
 * Generates a signed onboarding token representing one step of the
 * progressive verification state machine.
 *
 * Step 1 — needs_phone (Google-first flow only):
 *   identityData: { provider: 'google', email: string, googleId: string }
 *
 * Step 2 — ready_for_profile (both flows):
 *   identityData (phone-first):  { provider: 'phone', phoneNumber: string }
 *   identityData (google-first): { provider: 'google', phoneNumber: string,
 *                                   email: string, googleId: string }
 *
 * @param {object} identityData - Verified identity data for this step
 * @param {string} step         - One of ONBOARDING_STEP.*
 * @returns {string} Signed JWT, valid for 60 minutes
 */
export const generateOnboardingToken = (identityData, step) => {
  return jwt.sign(
    { ...identityData, step, type: TOKEN_TYPE.ONBOARDING },
    config.jwt.accessSecret,
    { expiresIn: '60m' },
  );
};
```

**Resulting token payloads:**

```json
// Step 1 — issued after Google sign-in (new user, no phone yet)
{
  "type": "ONBOARDING",
  "step": "needs_phone",
  "provider": "google",
  "email": "user@gmail.com",
  "googleId": "10769150350006150715113082367"
}

// Step 2 — issued after OTP verification (phone-first flow)
{
  "type": "ONBOARDING",
  "step": "ready_for_profile",
  "provider": "phone",
  "phoneNumber": "+919876543210"
}

// Step 2 — issued after phone upgrade (google-first flow)
{
  "type": "ONBOARDING",
  "step": "ready_for_profile",
  "provider": "google",
  "phoneNumber": "+919876543210",
  "email": "user@gmail.com",
  "googleId": "10769150350006150715113082367"
}
```

---

## 6. OTP Verify Service — Phone-First Flow

When MSG91 confirms the OTP, the OTP verify handler issues a `ready_for_profile` token directly. There is no intermediate step for the phone-first flow.

### `src/services/auth.service.js` (continued)

```js
/**
 * Called from the OTP verify controller after MSG91 confirms the OTP.
 * Resolves to either a full session (returning user) or a ready_for_profile
 * onboarding token (new user).
 *
 * @param {string} phoneNumber - E.164 formatted, e.g. "+919876543210"
 * @returns {Promise<{ isNewUser: false, user, profile, tokens }
 *                  | { isNewUser: true, onboardingToken: string }>}
 */
export const resolvePhoneSession = async (phoneNumber) => {
  const existingUser = await userRepository.findByPhone(phoneNumber);

  if (existingUser) {
    // Returning user — issue a full session immediately
    await userRepository.updateLastLogin(existingUser._id);
    const tokens = generateTokenPair(existingUser._id, existingUser.roleType);
    await userRepository.updateRefreshTokenHash(existingUser._id, tokens.refreshToken);
    const profile = await profileRepository.findByUserId(existingUser._id);

    return { isNewUser: false, user: existingUser, profile, tokens };
  }

  // New user — issue a Step 2 token. Phone is now server-verified.
  const onboardingToken = generateOnboardingToken(
    { provider: 'phone', phoneNumber },
    ONBOARDING_STEP.READY,
  );

  return { isNewUser: true, onboardingToken };
};
```

---

## 7. Google OAuth Service — Google-First Flow

### `src/services/auth.service.js` (continued)

```js
import { OAuth2Client } from 'google-auth-library';
import { UnauthorizedError, ConflictError } from '../errors/index.js';

// A single shared client instance is recommended
const googleClient = new OAuth2Client();

/**
 * Verifies a Google ID Token and resolves to one of two outcomes:
 *   1. Full session  — returning user (found by googleId or linked by email)
 *   2. Step 1 token  — new user; phone not yet verified
 *
 * @param {string} idToken - Google ID Token from the mobile client
 */
export const resolveGoogleSession = async (idToken) => {
  // ── Step 1: Verify the token cryptographically ──────────────────────────
  // NEVER trust the client to send an email or googleId directly.
  // verifyIdToken validates: signature, expiry, and the 'aud' claim.
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google.audience,
    });
    payload = ticket.getPayload();
  } catch (err) {
    // Distinguish between an invalid/expired token and a network failure
    if (
      err.message?.includes('Token used too late') ||
      err.message?.includes('Invalid token') ||
      err.message?.includes('Wrong number of segments')
    ) {
      throw new UnauthorizedError('Google sign-in failed. The token is invalid or expired.');
    }
    logger.error('Google token verification failed — possible network issue', {
      error: err.message,
    });
    throw err; // Re-throw as a 500; do not swallow infrastructure errors
  }

  const { email, sub: googleId, email_verified } = payload;

  // Belt-and-suspenders: Google should only issue verified-email tokens,
  // but we guard explicitly against any edge cases.
  if (!email_verified) {
    throw new UnauthorizedError('Google account email is not verified.');
  }

  // ── Step 2: Lookup — googleId first, email second ────────────────────────
  // googleId ('sub') is Google's permanent, immutable account identifier.
  // It does NOT change if the user changes their Gmail address.
  // We fall back to email only to handle account linking for users who
  // originally registered via OTP and are now signing in with Google.
  let existingUser = await userRepository.findByGoogleId(googleId);

  if (!existingUser) {
    existingUser = await userRepository.findByEmail(email);

    if (existingUser) {
      // ── Account Linking ──────────────────────────────────────────────────
      // Found by email but not googleId → OTP user signing in with Google
      // for the first time.

      if (existingUser.googleId && existingUser.googleId !== googleId) {
        // SECURITY HARD STOP: This email is already bound to a DIFFERENT
        // Google identity. This must never be silently overwritten — doing
        // so would allow account takeover. Surface this to the user and
        // log both googleId values for manual investigation.
        logger.error('googleId conflict detected', {
          userId: existingUser._id,
          storedGoogleId: existingUser.googleId,
          incomingGoogleId: googleId,
          email,
        });
        throw new ConflictError(
          'This email is already associated with a different Google account. Please contact support.',
        );
      }

      // Safe to link: existingUser.googleId is null (first Google sign-in)
      // or is already this same value (idempotent re-link — harmless).
      await userRepository.updateById(existingUser._id, {
        googleId,
        emailVerified: true,
      });
    }
  }

  // ── Step 3: Returning user — issue a full session ────────────────────────
  if (existingUser) {
    await userRepository.updateLastLogin(existingUser._id);
    const tokens = generateTokenPair(existingUser._id, existingUser.roleType);
    await userRepository.updateRefreshTokenHash(existingUser._id, tokens.refreshToken);
    const profile = await profileRepository.findByUserId(existingUser._id);

    return { isNewUser: false, user: existingUser, profile, tokens };
  }

  // ── Step 4: New user — issue a Step 1 token ──────────────────────────────
  // Do NOT create a User document yet. The phone number is still unverified.
  // The client must send the user through OTP before the onboarding form.
  const onboardingToken = generateOnboardingToken(
    { provider: 'google', email, googleId },
    ONBOARDING_STEP.NEEDS_PHONE,
  );

  return { isNewUser: true, onboardingToken };
};
```

---

## 8. Phone Upgrade Service — Google-First Flow, Phase 2

This is the endpoint that closes the security gap. It accepts a `needs_phone` Step 1 token, verifies the OTP, and **upgrades** the token to `ready_for_profile` — carrying all verified identity from both providers.

### `src/services/auth.service.js` (continued)

```js
/**
 * Verifies an OTP for a user in the middle of Google-first onboarding,
 * then upgrades their Step 1 token to a Step 2 token containing both the
 * verified phone number and the previously-verified Google identity.
 *
 * Called from: POST /auth/onboarding/verify-phone
 * Requires:    Authorization: Bearer <needs_phone onboarding token>
 *
 * @param {object} onboardingContext - Decoded Step 1 token payload (from middleware)
 * @param {string} phoneNumber       - E.164 phone number from request body
 * @param {string} otp               - OTP submitted by the user
 * @returns {Promise<{ onboardingToken: string }>} Step 2 token
 */
export const upgradeTokenWithPhone = async (onboardingContext, phoneNumber, otp) => {
  // ── Step 1: Verify the OTP via MSG91 ────────────────────────────────────
  const isValid = await msg91Service.verifyOtp({ mobile: phoneNumber, otp });
  if (!isValid) {
    throw new UnauthorizedError('Invalid or expired OTP. Please try again.');
  }

  // ── Step 2: Check the phone number is not already registered ────────────
  // It is valid for a user to enter a phone number that belongs to another account.
  // Rather than letting them proceed to waste 15 minutes on the form, redirect them now.
  const existingUser = await userRepository.findByPhone(phoneNumber);
  if (existingUser) {
    throw new ConflictError(
      'An account with this phone number already exists. Please sign in instead.',
    );
  }

  // ── Step 3: Upgrade to a Step 2 token ───────────────────────────────────
  // Merge the Google identity (from the signed Step 1 token — immutable,
  // cannot be tampered with by the client) with the now-verified phone number.
  const upgradedToken = generateOnboardingToken(
    {
      provider: 'google',
      phoneNumber,                          // Just verified via MSG91 ✅
      email: onboardingContext.email,       // From signed Step 1 token ✅
      googleId: onboardingContext.googleId, // From signed Step 1 token ✅
    },
    ONBOARDING_STEP.READY,
  );

  return { onboardingToken: upgradedToken };
};
```

---

## 9. Controllers & Routes

### `src/controllers/auth.controller.js`

```js
import {
  resolvePhoneSession,
  resolveGoogleSession,
  upgradeTokenWithPhone,
} from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * POST /auth/otp/verify
 * Body: { phoneNumber: string, otp: string }
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phoneNumber, otp } = req.body;

  // Replace with your actual MSG91 OTP verification call
  const isValid = await msg91Service.verifyOtp({ mobile: phoneNumber, otp });
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid or expired OTP.' });
  }

  const result = await resolvePhoneSession(phoneNumber);

  if (result.isNewUser) {
    return res.status(200).json({
      isNewUser: true,
      onboardingToken: result.onboardingToken,
      message: 'Phone verified. Please complete your profile.',
    });
  }

  return res.status(200).json({
    isNewUser: false,
    user: result.user,
    profile: result.profile,
    tokens: result.tokens,
  });
});

/**
 * POST /auth/google
 * Body: { idToken: string }
 *
 * New user response:       { isNewUser: true, onboardingToken, step: 'needs_phone' }
 * Returning user response: { isNewUser: false, user, profile, tokens }
 */
export const googleSignIn = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  const result = await resolveGoogleSession(idToken);

  if (result.isNewUser) {
    return res.status(200).json({
      isNewUser: true,
      onboardingToken: result.onboardingToken,
      step: 'needs_phone',
      message: 'New user detected. Please verify your phone number.',
    });
  }

  return res.status(200).json({
    isNewUser: false,
    user: result.user,
    profile: result.profile,
    tokens: result.tokens,
  });
});

/**
 * POST /auth/onboarding/verify-phone
 * Headers: Authorization: Bearer <needs_phone onboarding token>
 * Body: { phoneNumber: string, otp: string }
 *
 * Response: { onboardingToken: string, step: 'ready_for_profile' }
 *
 * req.onboardingContext is attached by authenticateOnboarding middleware,
 * configured to accept only NEEDS_PHONE tokens on this route.
 */
export const verifyPhoneForOnboarding = asyncHandler(async (req, res) => {
  const { phoneNumber, otp } = req.body;

  const result = await upgradeTokenWithPhone(req.onboardingContext, phoneNumber, otp);

  return res.status(200).json({
    onboardingToken: result.onboardingToken,
    step: 'ready_for_profile',
    message: 'Phone verified. Please complete your profile.',
  });
});
```

### `src/routes/auth.routes.js`

```js
import express from 'express';
import { verifyOtp, googleSignIn, verifyPhoneForOnboarding } from '../controllers/auth.controller.js';
import { authenticateOnboarding } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import {
  googleSignInSchema,
  verifyPhoneSchema,
  verifyOtpSchema,
} from '../validations/auth.validation.js';
import { ONBOARDING_STEP } from '../constants/token.constants.js';

const router = express.Router();

// ... existing POST /auth/otp/send route
router.post('/otp/verify', validateBody(verifyOtpSchema), verifyOtp);
router.post('/google',     validateBody(googleSignInSchema), googleSignIn);

// Upgrade route: requires a Step 1 (needs_phone) token specifically
router.post(
  '/onboarding/verify-phone',
  authenticateOnboarding({ requiredStep: ONBOARDING_STEP.NEEDS_PHONE }),
  validateBody(verifyPhoneSchema),
  verifyPhoneForOnboarding,
);

export default router;
```

---

## 10. Onboarding Service

### `src/services/onboarding.service.js`

By the time this service runs, `onboardingContext.step` is **guaranteed** to be `ready_for_profile` by the middleware. The phone number in the token has been OTP-verified in this session.

```js
import { userRepository } from '../repositories/user.repository.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { uploadService } from './upload.service.js';
import { BadRequestError, ConflictError, ValidationError } from '../errors/index.js';
import { generateTokenPair } from './auth.service.js';
import { ROLES } from '../constants/roles.constants.js';
import {
  otpOnboardingSchema,
  googleOnboardingSchema,
} from '../validations/onboarding.validation.js';

/**
 * Creates a new Customer User and their Profile.
 * Accepts both phone-first and Google-first onboarding contexts.
 *
 * Precondition (enforced by middleware):
 *   onboardingContext.step === ONBOARDING_STEP.READY
 *   onboardingContext.phoneNumber is OTP-verified in this session
 *
 * @param {object} onboardingContext - Decoded Step 2 token payload
 * @param {object} profileData       - Client-submitted form fields
 * @param {object|null} file         - Optional avatar upload
 */
export const createCustomerOnboarding = async (onboardingContext, profileData, file) => {
  const { provider } = onboardingContext;

  // ── Step 0: Dynamic schema validation ─────────────────────────────────────
  // The server selects the schema based on the signed token's provider.
  // The client cannot influence which fields are required.
  const schema = provider === 'google' ? googleOnboardingSchema : otpOnboardingSchema;
  const { error, value: validatedBody } = schema.validate(profileData, { abortEarly: false });
  if (error) {
    throw new ValidationError(error.details.map((d) => d.message));
  }
  profileData = validatedBody;

  // ── Step 1: Resolve final identity values ─────────────────────────────────
  //
  // Rule: Server-verified values come from the signed token. They are
  //       immutable and cannot be overridden by anything in the request body.
  //       Client-provided values fill in only what the token cannot supply.
  //
  // Phone-first:  token has phoneNumber → body supplies email
  // Google-first: token has phoneNumber + email + googleId → body supplies name only
  //               (phone is in the token because it was OTP-verified in Phase 2)

  const finalPhone = onboardingContext.phoneNumber; // Always in token; always OTP-verified ✅

  const finalEmail =
    provider === 'google'
      ? onboardingContext.email  // Verified by Google — from signed token ✅
      : profileData.email;       // User-supplied — validated by Joi schema

  // ── Step 2: Completeness guard ─────────────────────────────────────────────
  if (!finalPhone || !finalEmail) {
    throw new BadRequestError(
      'Both a verified phone number and email are required to complete registration.',
    );
  }

  // ── Step 3: Duplicate detection (parallel) ────────────────────────────────
  // Explicit checks before any write produce clear, user-facing error messages.
  // The unique index is the structural last-resort guarantee (see Step 4).
  const [emailConflict, phoneConflict] = await Promise.all([
    userRepository.findByEmail(finalEmail),
    userRepository.findByPhone(finalPhone),
  ]);

  if (emailConflict) {
    throw new ConflictError('An account with this email address already exists.');
  }
  if (phoneConflict) {
    throw new ConflictError('An account with this phone number already exists.');
  }

  // ── Step 4: Create the User ───────────────────────────────────────────────
  let user;
  try {
    user = await userRepository.create({
      phoneNumber: finalPhone,
      email: finalEmail,
      emailVerified: provider === 'google',         // Pre-verified by Google
      googleId: onboardingContext.googleId ?? null, // null for phone-first users
      roleType: ROLES.CUSTOMER,
    });
  } catch (err) {
    // Catch any race condition that slips through the explicit duplicate check
    if (err.code === 11000) {
      throw new ConflictError(
        'An account with this identity already exists. Please sign in.',
      );
    }
    throw err;
  }

  // ── Step 5: Create the Profile ────────────────────────────────────────────
  const avatarUrl = file ? await uploadService.upload(file) : null;
  const profile = await profileRepository.create({
    userId: user._id,
    name: profileData.name,
    avatar: avatarUrl,
  });

  // ── Step 6: Issue the final token pair ────────────────────────────────────
  const tokens = generateTokenPair(user._id, user.roleType);
  await userRepository.updateRefreshTokenHash(user._id, tokens.refreshToken);

  return { user, profile, tokens };
};
```

---

## 11. Onboarding Controller & Route

### `src/controllers/onboarding.controller.js`

```js
import { createCustomerOnboarding } from '../services/onboarding.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * POST /onboarding/customers
 * Headers: Authorization: Bearer <ready_for_profile onboarding token>
 *
 * Body (phone-first flow):  { name: string, email: string }
 * Body (Google-first flow): { name: string }
 *   (email is already in the token; nothing else is needed from the client)
 */
export const onboardCustomer = asyncHandler(async (req, res) => {
  const result = await createCustomerOnboarding(
    req.onboardingContext,
    req.body,
    req.file ?? null,
  );

  return res.status(201).json({
    message: 'Account created successfully.',
    user: result.user,
    profile: result.profile,
    tokens: result.tokens,
  });
});
```

### `src/routes/onboarding.routes.js`

```js
import express from 'express';
import { onboardCustomer } from '../controllers/onboarding.controller.js';
import { authenticateOnboarding } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { onboardingBodySchema } from '../validations/onboarding.validation.js';
import { upload } from '../middlewares/upload.middleware.js';
import { ONBOARDING_STEP } from '../constants/token.constants.js';

const router = express.Router();

router.post(
  '/customers',
  // Enforces step: 'ready_for_profile'. A needs_phone token is rejected here.
  authenticateOnboarding({ requiredStep: ONBOARDING_STEP.READY }),
  validateBody(onboardingBodySchema),
  upload.single('avatar'),
  onboardCustomer,
);

export default router;
```

---

## 12. Middleware — `authenticateOnboarding`

The middleware is now a factory function that accepts a `requiredStep` option, making it configurable per-route. The verify-phone route requires `needs_phone`; the final onboarding route requires `ready_for_profile`.

### `src/middlewares/auth.middleware.js`

```js
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { TOKEN_TYPE, ONBOARDING_STEP } from '../constants/token.constants.js';
import { UnauthorizedError } from '../errors/index.js';

/**
 * Factory that returns an Express middleware validating an onboarding Bearer token.
 *
 * @param {{ requiredStep: string }} options
 *   requiredStep — The step the token MUST be at to proceed.
 *                  Use ONBOARDING_STEP.NEEDS_PHONE for /auth/onboarding/verify-phone
 *                  Use ONBOARDING_STEP.READY       for /onboarding/customers
 *
 * On success, attaches the decoded payload to req.onboardingContext.
 */
export const authenticateOnboarding = ({ requiredStep } = {}) => {
  return (req, _res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Onboarding token is missing.'));
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret);

      // Guard 1: Correct token type
      if (decoded.type !== TOKEN_TYPE.ONBOARDING) {
        return next(
          new UnauthorizedError('Invalid token type. An onboarding token is required.'),
        );
      }

      // Guard 2: Correct step for this route
      if (requiredStep && decoded.step !== requiredStep) {
        const message =
          decoded.step === ONBOARDING_STEP.NEEDS_PHONE
            ? 'Phone verification is required before completing your profile.'
            : 'This token cannot be used at this step.';
        return next(new UnauthorizedError(message));
      }

      // Guard 3: Payload shape integrity
      if (!decoded.provider || !['phone', 'google'].includes(decoded.provider)) {
        return next(new UnauthorizedError('Malformed onboarding token: unknown provider.'));
      }
      if (decoded.step === ONBOARDING_STEP.NEEDS_PHONE) {
        if (!decoded.email || !decoded.googleId) {
          return next(
            new UnauthorizedError('Malformed onboarding token: missing Google identity.'),
          );
        }
      }
      if (decoded.step === ONBOARDING_STEP.READY) {
        if (!decoded.phoneNumber) {
          return next(
            new UnauthorizedError('Malformed onboarding token: missing verified phone number.'),
          );
        }
      }

      req.onboardingContext = decoded;
      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return next(
          new UnauthorizedError(
            'Onboarding session has expired. Please restart the sign-in process.',
          ),
        );
      }
      if (err instanceof jwt.JsonWebTokenError) {
        return next(new UnauthorizedError('Invalid onboarding token.'));
      }
      next(err);
    }
  };
};
```

---

## 13. Validation Schemas (Joi)

### `src/validations/auth.validation.js`

```js
import Joi from 'joi';

const phoneSchema = Joi.string()
  .pattern(/^\+[1-9]\d{6,14}$/)
  .required()
  .messages({
    'string.pattern.base': 'Phone number must be in E.164 format (e.g. +919876543210).',
    'any.required': 'Phone number is required.',
  });

export const googleSignInSchema = Joi.object({
  idToken: Joi.string().required().messages({
    'string.empty': 'Google ID token is required.',
    'any.required': 'Google ID token is required.',
  }),
});

export const verifyOtpSchema = Joi.object({
  phoneNumber: phoneSchema,
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'OTP must be 6 digits.',
    'string.pattern.base': 'OTP must contain digits only.',
    'any.required': 'OTP is required.',
  }),
});

// Reused for POST /auth/onboarding/verify-phone
export const verifyPhoneSchema = verifyOtpSchema;
```

### `src/validations/onboarding.validation.js`

```js
import Joi from 'joi';

// ── Shared field definitions ──────────────────────────────────────────────────
const nameSchema = Joi.string().trim().min(2).max(60).required().messages({
  'string.min': 'Name must be at least 2 characters.',
  'string.max': 'Name must be no longer than 60 characters.',
  'any.required': 'Name is required.',
});

const emailSchema = Joi.string().email().lowercase().trim().required().messages({
  'string.email': 'A valid email address is required.',
  'any.required': 'Email is required.',
});

// ── Phone-first onboarding body ───────────────────────────────────────────────
// Token has: phoneNumber
// Body must supply: name, email
export const otpOnboardingSchema = Joi.object({
  name:  nameSchema,
  email: emailSchema,
});

// ── Google-first onboarding body ──────────────────────────────────────────────
// Token has: phoneNumber (OTP-verified), email (Google-verified), googleId
// Body must supply: name only — all identity is already in the token
export const googleOnboardingSchema = Joi.object({
  name: nameSchema,
});

// ── Route-level schema (permissive union) ─────────────────────────────────────
// Applied at the route before the service determines the provider.
// Accepts the superset of all possible fields. Strict per-provider enforcement
// happens inside the service via dynamic schema selection above.
export const onboardingBodySchema = Joi.object({
  name:  nameSchema,
  email: Joi.string().email().lowercase().trim().optional(),
}).options({ allowUnknown: false });
```

---

## 14. Complete Flow Diagrams

### Flow A — New User via Phone (OTP-First)

```
Client                      Backend                     MSG91
  │                            │                           │
  ├─ POST /auth/otp/send ─────►│                           │
  │   { phoneNumber }          ├─ Send OTP ───────────────►│
  │◄─ { message: 'OTP sent' } ─┤◄─ Delivered ──────────────┤
  │                            │                           │
  ├─ POST /auth/otp/verify ───►│                           │
  │   { phoneNumber, otp }     ├─ Verify OTP ─────────────►│
  │                            │◄─ Valid ──────────────────┤
  │                            ├─ resolvePhoneSession
  │                            │   → findByPhone → null (new user)
  │                            ├─ generateOnboardingToken
  │                            │   { step:'ready_for_profile',
  │                            │     provider:'phone', phoneNumber }
  │◄─ { isNewUser: true,       │
  │     onboardingToken } ─────┤
  │                            │
  │  [App shows form: Name + Email. Phone shown read-only.]
  │                            │
  ├─ POST /onboarding/customers►│
  │   Authorization: Bearer <ready_for_profile token>
  │   { name, email }          ├─ middleware: step === ready_for_profile ✅
  │                            ├─ schema: otpOnboardingSchema
  │                            ├─ finalPhone ← token.phoneNumber  ✅ OTP-verified
  │                            ├─ finalEmail ← body.email         ✅ Joi-validated
  │                            ├─ duplicate checks (email + phone)
  │                            ├─ userRepository.create(...)
  │                            ├─ profileRepository.create(...)
  │                            ├─ generateTokenPair(...)
  │◄─ 201 { user, profile,     │
  │          tokens } ─────────┤
```

### Flow B — New User via Google (Google-First), All Phases

```
Client                      Backend                     Google / MSG91
  │                            │                               │
  │  [User taps "Sign in with Google"; SDK returns idToken]    │
  │                            │                               │
  ├─ POST /auth/google ───────►│                               │
  │   { idToken }              ├─ verifyIdToken ──────────────►│
  │                            │◄─ { email, sub, verified } ───┤
  │                            ├─ findByGoogleId → null
  │                            ├─ findByEmail    → null
  │                            ├─ generateOnboardingToken
  │                            │   { step:'needs_phone',
  │                            │     provider:'google',
  │                            │     email, googleId }
  │◄─ { isNewUser: true,       │
  │     step: 'needs_phone',   │
  │     onboardingToken } ─────┤
  │                            │
  │  [App shows: "Enter your phone number to continue"]
  │                            │
  ├─ POST /auth/otp/send ─────►│                               │
  │   { phoneNumber }          ├─ Send OTP ────────────────────►│
  │◄─ { message: 'OTP sent' } ─┤◄─ Delivered ─────────────────┤
  │                            │                               │
  ├─ POST /auth/onboarding/verify-phone ──►│                   │
  │   Authorization: Bearer <needs_phone token>                 │
  │   { phoneNumber, otp }     ├─ middleware: step === needs_phone ✅
  │                            ├─ Verify OTP ──────────────────►│
  │                            │◄─ Valid ──────────────────────┤
  │                            ├─ findByPhone → null (not taken)
  │                            ├─ generateOnboardingToken
  │                            │   { step:'ready_for_profile',
  │                            │     provider:'google',
  │                            │     phoneNumber,  ← OTP-verified ✅
  │                            │     email,        ← from Step 1 token ✅
  │                            │     googleId }    ← from Step 1 token ✅
  │◄─ { step:'ready_for_profile',│
  │     onboardingToken } ─────┤
  │                            │
  │  [App shows form: Name only. Email + phone shown read-only.]
  │                            │
  ├─ POST /onboarding/customers►│
  │   Authorization: Bearer <ready_for_profile token>
  │   { name }                 ├─ middleware: step === ready_for_profile ✅
  │                            ├─ schema: googleOnboardingSchema (name only)
  │                            ├─ finalPhone ← token.phoneNumber  ✅ OTP-verified
  │                            ├─ finalEmail ← token.email        ✅ Google-verified
  │                            ├─ duplicate checks (email + phone)
  │                            ├─ userRepository.create({ emailVerified: true, googleId, ... })
  │                            ├─ profileRepository.create(...)
  │                            ├─ generateTokenPair(...)
  │◄─ 201 { user, profile,     │
  │          tokens } ─────────┤
```

### Flow C — Returning User via Google (Account Linking)

```
Client                      Backend                     Google
  │                            │                           │
  ├─ POST /auth/google ───────►│                           │
  │   { idToken }              ├─ verifyIdToken ──────────►│
  │                            │◄─ { email, sub } ─────────┤
  │                            ├─ findByGoogleId(sub) → null (not yet linked)
  │                            ├─ findByEmail(email)  → User found! (OTP user)
  │                            ├─ existingUser.googleId === null → safe to link
  │                            ├─ UPDATE: { googleId, emailVerified: true }
  │                            ├─ generateTokenPair(...)
  │                            ├─ updateRefreshTokenHash(...)
  │◄─ 200 { isNewUser: false,  │
  │          user, profile,    │
  │          tokens } ─────────┤
  │  [Logged in. No onboarding screen needed.]
```

### Flow D — Returning User via Google (Already Linked)

```
Client                      Backend                     Google
  │                            │                           │
  ├─ POST /auth/google ───────►│                           │
  │   { idToken }              ├─ verifyIdToken ──────────►│
  │                            │◄─ { email, sub } ─────────┤
  │                            ├─ findByGoogleId(sub) → User found! ✅
  │                            │  (email lookup skipped entirely)
  │                            ├─ generateTokenPair(...)
  │◄─ 200 { isNewUser: false,  │
  │          user, profile,    │
  │          tokens } ─────────┤
```

---

## 15. Edge Cases & Error Handling

### Edge Case 1: Client Tries to Skip Phone Verification (Step Gate Bypass Attempt)

A user with a `needs_phone` token directly calls `POST /onboarding/customers`, submitting a phone number in the body.

**What happens:** The `authenticateOnboarding({ requiredStep: ONBOARDING_STEP.READY })` middleware checks `decoded.step !== 'ready_for_profile'` and returns:

> *"Phone verification is required before completing your profile."*

The service layer is never reached. This bypass is structurally impossible.

### Edge Case 2: Replay / Re-use of a `ready_for_profile` Token

After `createCustomerOnboarding` succeeds, the `User` record exists. Any subsequent call with the same token hits the `emailConflict` or `phoneConflict` check and throws a `ConflictError`. The token cannot create duplicate accounts.

### Edge Case 3: Race Condition (Simultaneous Requests)

If two identical requests arrive in parallel, both may pass the explicit duplicate check before either writes. The second `create` call hits the MongoDB unique index and throws **E11000**, which is caught and converted to a `ConflictError`. No duplicate account is created.

### Edge Case 4: Expired Token at Any Step

| Token State | Route | Error Returned |
|---|---|---|
| `needs_phone` token expired | `POST /auth/onboarding/verify-phone` | "Onboarding session has expired. Please restart the sign-in process." |
| `ready_for_profile` token expired | `POST /onboarding/customers` | "Onboarding session has expired. Please restart the sign-in process." |

The client should return the user to the first sign-in screen to begin a fresh token chain.

### Edge Case 5: Phone Number Already Registered (During Google Upgrade)

The user enters a phone number in the verify-phone step that already belongs to another account. `upgradeTokenWithPhone` calls `findByPhone` **before** issuing the Step 2 token:

> *"An account with this phone number already exists. Please sign in instead."*

This check happens at the upgrade step — not just at the final submission — so the user gets an immediate, actionable error rather than discovering the conflict after filling out a long form.

### Edge Case 6: User Changes Google Email (Post-Registration)

The user originally registered via OTP with `alice@gmail.com`. They later sign in via Google, but their Google account now uses `alice@newdomain.com`.

- `findByGoogleId(sub)` → **User found.** The `sub` claim is permanent.
- Login succeeds immediately. The email change on Google's side is irrelevant.

This is precisely why `findByGoogleId` is the primary lookup. An email-first search would treat this user as a brand-new account.

### Edge Case 7: `googleId` Conflict (Anomalous State)

`findByEmail` finds a user whose stored `googleId` is set to a **different** value. `resolveGoogleSession` logs both IDs and throws:

> *"This email is already associated with a different Google account. Please contact support."*

This state indicates either a data integrity issue or an extremely rare Google account transfer event. Both conflicting `googleId` values are logged for manual investigation.

### Edge Case 8: `google-auth-library` Network or Validation Failure

`verifyIdToken` is wrapped in a try-catch (see Section 7). Distinguishable errors (invalid token, expired token, malformed segments) return a clean `401`. Infrastructure failures (network timeout, unexpected library error) are logged and re-thrown as a `500` rather than swallowed silently.

---

## 16. Security Checklist

| # | Check | Status |
|---|---|---|
| 1 | **Never trust client-supplied identity.** All emails and `googleId`s originate from server-verified sources (Google's servers or your own signed tokens). | ✅ |
| 2 | **`aud` claim is validated.** `verifyIdToken` is called with `audience: config.google.audience`, rejecting tokens issued for other apps. | ✅ |
| 3 | **`email_verified` is checked explicitly.** Guards against edge cases where Google issues tokens for unverified emails. | ✅ |
| 4 | **`googleId` (`sub`) is the primary lookup key.** Immutable; survives email changes. Email is a fallback for account linking only. | ✅ |
| 5 | **`googleId` conflict throws, not overwrites.** Prevents silent account takeover on `googleId` mismatch. Both conflicting IDs are logged for investigation. | ✅ |
| 6 | **`step` flag enforced per-route at middleware level.** A `needs_phone` token cannot reach the onboarding service. A `ready_for_profile` token cannot reach the upgrade service. Structurally unbypassable. | ✅ |
| 7 | **Phone number is OTP-verified for ALL users.** Both phone-first and Google-first flows produce a server-signed, MSG91-verified phone number in the `ready_for_profile` token. The database never receives an unverified phone. | ✅ |
| 8 | **Token type guard.** The `type: 'ONBOARDING'` claim prevents a regular access token from being used on onboarding endpoints. | ✅ |
| 9 | **60-minute token lifetime.** Decouples the 30-second OTP verification window from the 15+ minute form-filling experience. No expiry anxiety. | ✅ |
| 10 | **Phone conflict checked at upgrade step, not only at final submission.** Prevents users from losing form progress when a phone number is already registered. | ✅ |
| 11 | **Duplicate checks run before DB write (parallel).** Produces clear user-facing errors instead of raw database constraint violations. | ✅ |
| 12 | **MongoDB E11000 caught as last resort.** Handles race conditions that slip through explicit duplicate checks. | ✅ |
| 13 | **E.164 phone number validation.** Enforced by Joi across all endpoints that accept a phone number. | ✅ |
| 14 | **Refresh token is hashed and stored.** Enables server-side session invalidation (logout, token rotation). | ✅ |
| 15 | **`google-auth-library` network failure is handled.** Infrastructure errors are logged and returned as 500; invalid tokens are returned as 401. | ✅ |
| 16 | **Rate limiting on `/auth/google` and `/auth/otp/send`.** Add `express-rate-limit` to prevent brute-force and OTP stuffing attacks. | ⚠️ TODO |
