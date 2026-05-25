# Msg91 Revision Improvements Report

> Legacy snapshot: This document records findings against the pre-2026-04-24 role-prefixed routing layout and removed `controllers/customer/*` / `controllers/barber/*` files. Treat route and file references here as historical unless explicitly updated. For the current API surface, see [ROUTING-STRATEGY-ANALYSIS](../architecture/ROUTING-STRATEGY-ANALYSIS.md).

> **Project:** EverCut Backend — Firebase → MSG91 + JWT Migration
> **Prepared:** March 16, 2026

---

## The Central Problem — Chicken-and-Egg: New User Auth Flow

> This is the root issue that drove most of the meaningful changes in the revised guide. Every other improvement in this report either fixes a consequence of it or was noticed during the investigation of it.

### What the problem is

After a new user successfully verifies their OTP, the backend must create their account. The sequence looks straightforward on the surface:

```
User verifies OTP → calls onboarding endpoint → account is created → tokens are issued
```

But there is a hard dependency cycle buried in the middle:

```
┌─────────────────────────────────────────────────────────────────┐
│                  THE CHICKEN-AND-EGG LOOP                       │
│                                                                 │
│  To call the onboarding endpoint → need a Bearer token          │
│  To get a Bearer token           → need to be in the database   │
│  To be in the database           → need to complete onboarding  │
│  To complete onboarding          → need a Bearer token   ←──┐   │
│                                                             │   │
│                         (impossible)                        │   │
└─────────────────────────────────────────────────────────────┘
```

The new user has just verified their OTP. They are not yet in the database. Without a database record, no JWT access token can be issued. Without a JWT, they cannot authenticate to the onboarding endpoint. The system is locked — a new user can never actually complete onboarding.

### How the old guide was silently hiding it

In the Firebase era, Firebase itself acted as the identity authority even for users who had never touched the database. The `authenticate` middleware had a Firebase fallback:

```
Try JWT verification (fails — no JWT exists for this new user)
      ↓
Fall back to Firebase Admin SDK verification
      ↓
Firebase says: "yes, this person exists" (even without a DB record)
      ↓
Middleware sets req.user = { firebaseUid, phoneNumber, isNewUser: true }
      ↓
Onboarding endpoint receives the request — no 401
```

Firebase was an external trust anchor that silently bootstrapped new users across the gap. The `isNewUser: true` flag in `req.user` and the corresponding guard in `authorize.middleware.js` (`if (req.user.isNewUser) return 403`) were direct artefacts of this: the system knew new users had no DB record and worked around it at the middleware layer.

### Why replacing Firebase exposed the problem

The complete guide replaces Firebase with MSG91 + JWT but does not replace the trust anchor. After OTP verification, a new user receives:

```json
{ "isNewUser": true, "phoneNumber": "9876543210" }
```

A plain phone number string — **no token of any kind**. The client then calls the onboarding endpoint with nothing to put in the `Authorization` header. The authenticate middleware tries JWT (fails), then falls back to Firebase (fails — there is no Firebase token in the new flow either). The onboarding endpoint returns 401.

**The new user flow is completely broken.** It was previously held together by Firebase. Removing Firebase without replacing what it was doing for new users leaves a hard gap with no way across.

### How the revised guide solves it

The revised guide introduces a dedicated **Onboarding Token**: a short-lived JWT (valid for 30 minutes) that is issued immediately after OTP verification for new users only. It contains exactly one piece of data: the verified phone number.

```
New user verifies OTP
      ↓
Backend: no DB record found → issue onboardingToken
      ↓
Response: { isNewUser: true, onboardingToken: "eyJ..." }
      ↓
Client calls POST /onboarding/customers  (or /barbers)
with:  Authorization: Bearer <onboardingToken>
      ↓
authenticateOnboarding middleware accepts only ONBOARDING token type
→ populates req.onboardingContext = { phoneNumber }
      ↓
Onboarding service creates the User record with all required fields
→ immediately issues full { accessToken, refreshToken }
      ↓
Client now has full credentials — chicken-and-egg is broken
```

The gap is bridged by the `onboardingToken`. It is not a session token — it cannot be used on any standard API route. It exists only to safely carry the verified phone number from the OTP verification step to the onboarding step, giving the client something valid to present to the onboarding endpoint without needing a pre-existing DB record.

### Why this matters beyond just "it works"

The onboarding token pattern has several secondary benefits that cascade through the rest of the codebase:

- **No zombie users.** Previously the flow would create a partial placeholder User record (or allow a non-DB user through via Firebase) in case the user abandoned the onboarding screen. With the token approach, no DB record is created until the user successfully completes onboarding. The database is never polluted with incomplete accounts.
- **`email` can stay required.** Because the User record is only ever created at the very end of onboarding — when the client has submitted all required fields — `email: { required: true }` remains a valid constraint. The previous approach pressured developers to make `email` optional to accommodate pre-onboarding placeholder users.
- **`authorize.middleware.js` dead code is removable.** The `isNewUser` guard in `authorize` only existed because Firebase allowed half-authenticated users through `authenticate`. With the onboarding token enforcing a strict separation, no new user ever reaches a standard API route — the guard is structurally unreachable and can be deleted.
- **`authenticate` becomes simpler.** It no longer needs a Firebase fallback or an `isNewUser` flag. It accepts one token type — `ACCESS` — and either the user is fully in the database, or the request is rejected.

---

## Table of Contents

1. [Architectural Design](#1-architectural-design) (3 improvements)
2. [Security Hardening](#2-security-hardening) (4 improvements)
3. [Code Correctness & Bug Fixes](#3-code-correctness--bug-fixes) (4 improvements)
4. [Separation of Concerns](#4-separation-of-concerns) (4 improvements)
5. [Completeness — Previously Unaddressed Files](#5-completeness--previously-unaddressed-files) (7 improvements)
6. [Structural & Documentation Clarity](#6-structural--documentation-clarity) (8 improvements)
7. [Summary Table](#7-summary-of-all-improvements)

---

## 1. Architectural Design

### 1.1 `CRITICAL` — Onboarding Token Pattern Introduced (Chicken-and-Egg Solved)

As described in full above. The core change is:

**Before:** New user verifies OTP → receives only a raw phone number → has no token → cannot authenticate to the onboarding endpoint → **stuck**.

**After:** New user verifies OTP → receives a short-lived `onboardingToken` JWT → uses it on the onboarding endpoint via the new `authenticateOnboarding` middleware → User record is created with all required fields → full `accessToken` + `refreshToken` are issued → normal session begins.

The `onboardingToken`:
- Is signed with the same access secret as regular tokens
- Contains only `{ sub: phoneNumber, type: "onboarding" }`
- Expires in 30 minutes
- Is explicitly rejected by the standard `authenticate` middleware — it cannot be used anywhere except onboarding endpoints

---

### 1.2 Clean Replacement Strategy (No Migration Period)

The previous guide was framed as a gradual migration: deprecated Firebase code paths (`createSession`, Firebase config, `firebaseUid` lookup) were kept throughout and removed only at the end in an appendix-style cleanup section. This implied a live production system needed protecting.

The revised guide is explicitly framed as a clean replacement from the start, with a context note clarifying that the project is in active development with no existing users or data. This drives several downstream simplifications:

- All Firebase-referencing code paths are removed outright rather than deprecated.
- The Post-Migration Cleanup appendix is dissolved and its contents are integrated into the main implementation flow.
- All code samples use decisive verbs (`REWRITE`, `REMOVE`, `DELETE`) rather than hedging ones (refactor, deprecate, keep during migration).

---

### 1.3 Architecture Overview Reoriented to the New System Only

The previous guide opened with a diagram of the Firebase flow, labelled "Current Flow." For a guide whose purpose is to replace Firebase entirely, this added noise and implied the reader needed to understand the old system to implement the new one.

The revised guide removes the Firebase flow diagram and replaces it with a new-flow diagram showing both execution paths — returning users and new users — side by side in a single, readable block. The developer needs to understand the system they are building, not the one they are discarding.

---

## 2. Security Hardening

### 2.1 Production Guard Added to Test Mode

The previous guide's SMS provider service had a test mode that could technically be activated in any environment. If a developer mistakenly set the test mode flag to `true` in production, the service would silently accept any OTP without making real API calls — bypassing the entire authentication mechanism.

The revised guide adds an explicit production guard:

```js
if (msg91.testMode) {
    if (process.env.NODE_ENV === 'production') {
        logger.error('CRITICAL: MSG91 test mode is enabled in production!');
        throw new AppError('Configuration error', 500);
    }
    // ... test mode logic
}
```

In the current implementation, `sms-provider.service.js` imports `msg91` from `config/msg91.config.js` directly instead of reaching through the general `config` object at each use site.

Misconfiguration now fails loudly at the call site rather than silently degrading security. This guard is also listed as a distinct row in the Security Best Practices table so it is visible to reviewers and auditors.

---

### 2.2 Rate Limiting Extracted from Service Layer into Middleware

The previous guide embedded rate limiting — the `checkRateLimit` function and the `rateLimitStore` Map — directly inside `otp.service.js`. The service was responsible for both business logic and infrastructure concerns simultaneously, and was stateful (a `setInterval` cleanup loop ran at import time).

The revised guide extracts all rate limiting into a dedicated `otp-rate-limiter.middleware.js`, implemented as a reusable Express middleware factory. Rate limits are applied at the route level before the request reaches any service. The OTP service becomes stateless and pure — it only delegates to the SMS provider and interprets the result.

- The factory accepts configurable parameters: `windowMs`, `max`, `keyPrefix`, `keySource`.
- Both IP-based and phone-based limiters are stacked on the send endpoint.
- The cleanup interval is changed from 5 to 10 minutes to reduce overhead.

---

### 2.3 Token Type Boundary Errors Explicitly Defined

The previous guide's error handling table did not cover what happens when a token of the wrong type is presented to an endpoint — a direct consequence of the new strict token type separation introduced by the onboarding token pattern.

The revised guide adds two explicit error scenarios:

| Scenario | Status | Message |
|---|---|---|
| Onboarding token used on a standard API route | 401 | `"Standard account access token required"` |
| Already-onboarded user re-submitting an onboarding token to an onboarding endpoint | 409 | `"User is already onboarded"` |

Both are handled at the middleware level (token type check) and the service level (phone number uniqueness guard), making behaviour deterministic and documented.

---

### 2.4 Refresh Token Expiry Extended to 180 Days for Mobile UX

The previous guide set the refresh token expiry to 30 days. The revised guide changes this to 180 days (6 months).

Mobile users expect to stay logged in for extended periods. A 30-day expiry causes frequent, disruptive re-authentication prompts. Because refresh token rotation is implemented (a new pair is issued on every refresh, and hash mismatches immediately revoke the session), a longer expiry does not weaken revocation or theft-detection guarantees — it only affects how long a legitimately issued token chain remains valid without re-authentication. This change is reflected in both the environment variable default and the JWT Token Strategy table.

---

## 3. Code Correctness & Bug Fixes

### 3.1 `CRITICAL` — `findByIdWithRefreshHash()` Added — Fixes Broken Token Rotation

The previous guide's `refreshAccessToken` function retrieved the user via the standard `findById()` repository method. However, `refreshTokenHash` is defined with `select: false` in the User model, which excludes it from all default queries.

`findById()` would always return `undefined` for `refreshTokenHash`. Every rotation check would compare the incoming hash against `undefined` — a guaranteed mismatch. This would trigger the token-theft detection path on every single refresh request, logging a spurious warning and invalidating the user's session.

**The fix:** A dedicated `findByIdWithRefreshHash(id)` method is added to the user repository, calling `User.findById(id).select('+refreshTokenHash')` to explicitly opt the field back in. The `refreshAccessToken` function is updated to use this method. The change is documented in both the User Model section and the Firebase Removal section so it is not overlooked.

---

### 3.2 Upload Middleware `resolveActorKey` Fixed for Onboarding Context

The previous guide removed the `firebaseUid` fallback from `resolveActorKey`, leaving:

```js
// Previous fix — incomplete
req.user?._id?.toString() || 'anonymous'
```

However, the upload middleware is used on onboarding routes where `req.user` is not populated — only `req.onboardingContext` is available. This fix would log and rate-limit all uploads during onboarding under the single `'anonymous'` key, making per-user tracking impossible and potentially conflating uploads from different users.

The revised guide correctly handles both contexts:

```js
// Correct fix
req.user?._id?.toString() || req.onboardingContext?.phoneNumber || 'anonymous'
```

---

### 3.3 `serializeBarberProfile` Called with Correct Arguments

In the previous guide's `resolveOtpSession`, the barber profile serialization call was:

```js
// WRONG — options object passed as second argument
serializeBarberProfile(shop, { photos })
```

The serializer requires the `user` object as its second argument. The correct call is:

```js
// CORRECT
serializeBarberProfile(shop, existingUser, { photos })
```

Without this fix, returning barber users would receive either an error or a malformed profile response on every login.

---

### 3.4 `ensureUniqueUserIdentity` Logic Corrected for the New Flow

The previous guide's `ensureUniqueUserIdentity` function used `firebaseUid` as the identity anchor for duplicate checks: "reject if this phone or email belongs to a *different* Firebase user." This logic no longer applies — there is no `firebaseUid`.

In the new flow, User records are only created at the end of onboarding, and the `onboardingToken` guarantees the phone number has just been verified as unique. Both checks become simple existence checks:

```js
// Before (broken without firebaseUid)
if (emailOwner && emailOwner.firebaseUid !== firebaseUid) → throw ConflictError
if (phoneOwner && phoneOwner.firebaseUid !== firebaseUid) → throw ConflictError

// After (correct)
if (emailOwner)  → throw ConflictError  // email is already registered
if (phoneOwner)  → throw ConflictError  // race condition: two simultaneous onboarding requests
```

---

## 4. Separation of Concerns

### 4.1 Token Verification Unified — Type Enforcement Moved to Middleware

The previous guide had separate `verifyAccessToken` and `verifyRefreshToken` functions. `verifyAccessToken` only accepted `type: 'access'` tokens, meaning a new function would need to be added or modified to handle onboarding tokens (which at the time were also signed with the access secret).

The revised guide replaced `verifyAccessToken` with a unified `verifyBearerToken` function, with type enforcement moved to the middleware layer. This was subsequently evolved once a dedicated onboarding secret was introduced (see note below):

- `verifyAccessToken` — verifies with `accessSecret`; enforces `type === TOKEN_TYPE.ACCESS` internally.
- `verifyOnboardingToken` — verifies with `onboardingSecret`; enforces `type === TOKEN_TYPE.ONBOARDING` internally.
- `authenticate` — calls `verifyAccessToken` (type is enforced inside the service function).
- `authenticateOnboarding` — calls `verifyOnboardingToken` (type is enforced inside the service function).

> **Subsequent update (May 2026):** With the introduction of `JWT_ONBOARDING_SECRET` (a dedicated secret for onboarding tokens), the onboarding token is now signed with a *different* secret from access tokens. A single unified verification function can no longer verify both — each type requires its own secret. The naming has reverted to `verifyAccessToken` alongside the new `verifyOnboardingToken`. To ensure robustness and symmetry, type enforcement has been centralized back into the service functions, eliminating redundant checks in the middleware. See `docs/security/TOKEN-FLOW-GUIDE.md` for the current design.

---

### 4.2 OTP Service Is Now Stateless and Purely Business Logic

Because rate limiting was previously inside `otp.service.js`, the service was stateful — it held a `Map` in module scope and ran a `setInterval` at import time. This made it harder to test and created hidden side effects.

With rate limiting moved to middleware (see §2.2), the OTP service is now a clean, stateless module. It imports only the SMS provider and error classes, contains no timers, and can be unit-tested by simply mocking the SMS provider — no request context needed.

---

### 4.3 Authenticate Middleware Split into Two Explicit Exports with Shared Helpers

The previous guide's middleware file exported only a single default function. The revised guide exports two named functions from the same file — `authenticate` and `authenticateOnboarding` — plus the default export for backward compatibility.

Both share two internal helpers to avoid duplication:

- `extractBearerToken(req, missingMessage)` — shared Bearer header parsing and null-checking.
- `loadActiveUser(userId)` — shared DB lookup with consistent `isActive`/`deletedAt` guards.

---

### 4.4 OTP Length and Expiry Moved from `.env` to Config Constants

The previous guide made OTP length (6 digits) and OTP expiry (10 minutes) environment variables. This treated fixed application constants as deployment-time variables — an unnecessary abstraction.

These values are tied to the registered DLT template. Changing them without updating the DLT-registered template would break SMS delivery. They do not vary between development, staging, and production. The revised guide hardcodes them in `config/index.js` directly:

```js
otpLength: 6,
otpExpiry: 10,   // minutes
```

The `.env.example` becomes cleaner as a result.

---

## 5. Completeness — Previously Unaddressed Files

### 5.1 `authorize.middleware.js` — Unreachable `isNewUser` Guard Removed

This is a direct consequence of the chicken-and-egg fix described above.

The `isNewUser` guard in `authorize.middleware.js` only existed because Firebase allowed non-DB users through the `authenticate` middleware with `req.user.isNewUser = true`. In the new design, new users receive an `onboardingToken` — which is rejected by the standard `authenticate` middleware. A new user never reaches `authorize()`. The guard is dead code.

```diff
- if (req.user.isNewUser) {
-     return next(new ForbiddenError('Please complete your profile first'));
- }
```

Keeping dead code in a middleware that runs on every protected request is a maintenance liability.

---

### 5.2 User Model Changes More Comprehensive (`emailVerified`, `email` rationale, full schema)

The previous guide only added `refreshTokenHash`. The revised guide makes three additional changes:

**`emailVerified` field added:**
```js
emailVerified: { type: Boolean, default: false }
```
Added now to preserve design intent for future email verification. The guide includes a full note explaining the intended future flow: collect email during onboarding → store with `emailVerified: false` → verify when an email service is available.

**`email` kept as `required: true` and `unique: true` with explicit rationale:**
The onboarding token pattern means the User record is only ever created at the final step of onboarding, after all required fields have been collected. There is no reason to relax the `email` constraint — doing so would allow corrupt incomplete records, which the token pattern was specifically designed to prevent.

**Full updated schema reference included:**
A complete, ready-to-use `userSchema` block is provided so there is no ambiguity about the final model shape.

---

### 5.3 Onboarding Validator — `phoneNumber` Removed with Security Rationale

The previous guide's fix only mentioned removing `phoneNumber` from the customer onboarding validator. The revised guide adds the security rationale:

The phone number is already verified via OTP and cryptographically passed inside the `onboardingToken`. Accepting it again from the request body would introduce a **trust gap**: the client could submit a different phone number than the one that was actually verified. The server must use `req.onboardingContext.phoneNumber` exclusively — accepting it from the body reopens the verification bypass the token was designed to prevent.

---

### 5.4 Seed Script Cleanup Added

The previous guide's Firebase removal section did not address the project's seed script (`seed-barber-rating-mock-data.js`). Without this update, running the seed script after migration fails with a Mongoose validation error (`firebaseUid` field does not exist). The revised guide adds:

- Remove `firebaseUid` from all user fixture objects.
- Refactor `upsertUser()` to search by `phoneNumber` instead of `firebaseUid`.
- Remove `firebaseUid` from the `User.create()` call.

---

### 5.5 `.gitignore` Firebase Entries Removed

The previous guide did not address `.gitignore`. Firebase-specific ignore entries (`firebase-admin-sdk.json`, `*-firebase-adminsdk-*.json`, `firebase-tokens.txt`) serve no purpose once Firebase is removed and will mislead developers — suggesting Firebase credentials might still be expected. The revised guide adds a dedicated removal step for these entries.

---

### 5.6 Dependencies Section Covers Both Install and Uninstall in One Step

The previous guide's dependency section only covered adding `jsonwebtoken`. The revised guide treats the change as a single paired action:

```bash
npm install jsonwebtoken
npm uninstall firebase-admin
```

Both are presented in a unified table. The verification command (`npm ls firebase-admin`) confirming removal is included immediately after, rather than buried in a later cleanup section.

---

### 5.7 Client (Mobile App) Section Added to Pre-Launch Checklist

The previous guide's checklist covered backend and security only. The revised guide adds a dedicated client checklist:

- App updated to call `/auth/otp/send` and `/auth/otp/verify`.
- App handles `isNewUser: true` → navigates to onboarding and stores the `onboardingToken`.
- App sends `Bearer <onboardingToken>` in onboarding requests.
- Token storage uses device secure storage (Keychain / Keystore).
- Auto-refresh logic implemented using `/auth/token/refresh`.
- Logout calls `/auth/logout`.
- Error handling for 401 (redirect to login) and 429 (show retry timer).

The backend implementation is only complete when the client correctly implements the new authentication contract.

---

## 6. Structural & Documentation Clarity

### 6.1 Firebase Removal Integrated into Main Guide (Not an Appendix)

In the previous guide, Firebase removal was a 10-step appendix at the end of a 17-section document — implying it was optional or deferred. With a clean-replacement strategy, it is a core step.

The revised guide integrates all removal into Section 7 ("Firebase Removal — Existing File Changes"), positioned directly after the new implementation sections. Each removal item follows the corresponding new implementation it replaces, creating a natural read flow: "here is what you are building, and here is what you are removing."

---

### 6.2 Layer Mapping Table Shows Explicit Action Types

The previous guide's Layer Mapping table listed files without indicating what action was being taken. The revised guide uses explicit labels: `NEW`, `REWRITE`, `REFACTOR`, `UPDATE` — making the scope of work immediately scannable.

---

### 6.3 API Endpoint Matrix Added as a Standalone Section

The previous guide had no standalone endpoint reference. Endpoint information was spread across controller, route, and middleware sections. The revised guide adds a dedicated API Endpoint Matrix table listing all five auth endpoints with method, path, auth requirement, and purpose.

---

### 6.4 Header Metadata — Scope and Context More Precisely Described

The previous guide's header understated the scope ("integrating MSG91 OTP authentication"). The revised guide's header is more precise: "replace Firebase Phone Auth with MSG91 OTP + JWT." The additional context line clarifies this is a clean replacement in an active-development project, preventing readers from applying a gradual migration approach.

---

### 6.5 `TOKEN_TYPE` Constant Includes `ONBOARDING` Type

The previous guide's `TOKEN_TYPE` only defined `ACCESS` and `REFRESH`. The revised guide adds `ONBOARDING`, ensuring the new token type is a named constant rather than a raw string literal scattered across the codebase. A clarifying note is also added explaining that OTP length and expiry live in `msg91.config.js` (backed by `config/index.js`) and are intentionally not duplicated here.

---

### 6.6 Spurious Route Index Update Section Removed

The previous guide included a "Route Index Update" section describing changes to `src/routes/index.js`. No changes to that file are actually needed — auth routes are already mounted at `/auth`. The revised guide removes this section and replaces it with a short inline note confirming no changes are required, preventing unnecessary work.

---

### 6.7 Architecture Section Explains Design Rationale Instead of Legacy Flow

The previous guide described the old Firebase flow as the "Current Flow." The revised guide replaces this with a Key Design Decision callout that explains the onboarding token pattern and specifically names the zombie user problem as the reason for it. Developers get the context to understand the architecture without having to read about a system they are discarding.

---

### 6.8 Related Documents Table Added at Top of Document

The previous guide mentioned companion documents only in a prerequisite line and in the checklist. The revised guide adds a "Related Documents" table immediately below the header, linking to:

- `MSG91-EXTERNAL-SETUP-GUIDE.md` — MSG91 account creation, DLT registration, test/sandbox environment.
- `MSG91-POSTMAN-UPDATES-GUIDE.md` — Postman collection updates for OTP/JWT authentication.

A developer landing on the document for the first time immediately has a map of the surrounding documentation.

---

## 7. Summary of All Improvements

| # | Improvement | Category | Impact |
|---|---|---|---|
| **—** | **Chicken-and-egg: new user has no token to reach onboarding (root cause)** | **Root Cause** | **Critical** |
| 1.1 | Onboarding Token pattern introduced — chicken-and-egg solved | Architecture | Foundational |
| 1.2 | Clean replacement strategy — no migration period | Architecture | Foundational |
| 1.3 | Architecture overview reoriented to the new system only | Architecture | Foundational |
| 2.1 | Production guard added to test mode | Security | Critical |
| 2.2 | Rate limiting extracted from service layer to middleware | Security | Critical |
| 2.3 | Token type boundary errors explicitly defined | Security | Critical |
| 2.4 | Refresh token expiry extended to 180d for mobile UX | Security | High |
| 3.1 | `findByIdWithRefreshHash()` added — fixes broken token rotation | Bug Fix | Critical |
| 3.2 | Upload middleware `resolveActorKey` fixed for onboarding context | Bug Fix | Critical |
| 3.3 | `serializeBarberProfile` called with correct arguments | Bug Fix | High |
| 3.4 | `ensureUniqueUserIdentity` logic corrected for the new flow | Bug Fix | High |
| 4.1 | Token verification unified — type enforcement moved to middleware (subsequently evolved, see note) | Design | High |
| 4.2 | OTP service is now stateless and purely business logic | Design | High |
| 4.3 | Authenticate middleware split into two explicit exports | Design | High |
| 4.4 | OTP length and expiry moved from `.env` to config constants | Design | Medium |
| 5.1 | `authorize.middleware.js` unreachable `isNewUser` guard removed (consequence of §1.1) | Added | High |
| 5.2 | User model more comprehensive (`emailVerified`, email rationale, full schema) | Added | High |
| 5.3 | Onboarding validator `phoneNumber` removed with security rationale | Added | High |
| 5.4 | Seed script cleanup added | Added | Medium |
| 5.5 | `.gitignore` Firebase entries removed | Added | Medium |
| 5.6 | Dependencies section covers both install and uninstall in one step | Added | Medium |
| 5.7 | Client (mobile app) section added to pre-launch checklist | Added | Medium |
| 6.1 | Firebase removal integrated into main guide (not an appendix) | Clarity | High |
| 6.2 | Layer mapping table shows explicit action types | Clarity | Medium |
| 6.3 | API Endpoint Matrix added as standalone section | Clarity | Medium |
| 6.4 | Header metadata — scope and context more precisely described | Clarity | Medium |
| 6.5 | `TOKEN_TYPE` constant includes `ONBOARDING` type | Clarity | Medium |
| 6.6 | Spurious Route Index Update section removed | Clarity | Medium |
| 6.7 | Architecture section explains design rationale instead of legacy flow | Clarity | Medium |
| 6.8 | Related Documents table added at top of document | Clarity | Low |
