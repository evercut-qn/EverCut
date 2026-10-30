# Walkthrough & Implementation Report: EverCut Admin Login "Failed to fetch" Resolution

## 1. Executive Summary

When administrators attempted to sign in on the live website at `https://evercut.in/login` (or `/adminevercut`), clicking **"Request OTP"** consistently failed with the error:
> **`Failed to fetch`** (or *"Failed to contact login service"*).

The exact same workflow worked properly on local development systems (`http://localhost:3000`).

Both the primary root cause (missing production CORS origins on the Express API) and secondary architectural vulnerabilities (client-side OTP requests bypassing Server Actions) have been fixed, deployed, and verified on the production server (`76.13.245.70`) and synchronized with the local repository.

---

## 2. Root Cause Analysis & Log Evidence

### Investigation on Remote Host (`76.13.245.70`)

Remote process inspection identified two PM2 processes:
- **`evercut-server`** (ID 0): Node.js Express API listening on port `5000`, exposed externally by Traefik at `https://api.evercut.in`.
- **`evercut-admin`** (ID 1): Next.js App Router frontend listening on port `3000`, exposed externally by Traefik at `https://evercut.in`.

### Root Cause 1: CORS Origin Whitelist Rejection
When inspecting `/root/.pm2/logs/evercut-server-out.log`, every OTP send request from the live site yielded:
```json
{"level":"error","message":"Unhandled error","error":"Origin not allowed by CORS"}
{"level":"warn","message":"Request completed with error","method":"POST","url":"/api/v1/auth/otp/send","status":500,"ip":"76.13.245.70"}
```

In `/home/ubuntu/Downloads/EverCut/server/.env`, `ALLOWED_ORIGINS` was configured as:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173
```
Because `https://evercut.in` was missing, Express CORS middleware in `src/config/cors.config.js` rejected the browser's preflight `OPTIONS` request with HTTP 500 without returning the `Access-Control-Allow-Origin: https://evercut.in` header. The browser immediately aborted the request, throwing `TypeError: Failed to fetch`.

### Why Local Testing Worked
On developer machines, the web app ran on `http://localhost:3000`. This matched `ALLOWED_ORIGINS` and `DEFAULT_LOCAL_ORIGINS` in `cors.config.js`, causing the preflight check to pass with HTTP 204.

### Root Cause 2: Asymmetric Client vs Server Action Architecture in Next.js
In `admin/src/app/(auth)/login`:
- **Step 2 (Verify OTP)** was implemented as a Next.js Server Action (`handleLoginAction` in `login.action.js`), executed server-to-server.
- **Step 1 (Request OTP)** was called directly from the user's browser in `LoginForm.js` via `requestOTP(phone)` (`apiFetch`), making it subject to browser CORS preflight restrictions and exposing the backend endpoint.

---

## 3. Implementation Plan & Changes Applied

### Overview of Fixed Flow

1. **Admin Browser** submits phone number to Next.js server via Server Action `handleRequestOtpAction`.
2. **Next.js Server** calls Express API `POST /api/v1/auth/otp/send` server-to-server (no browser CORS restrictions).
3. **Express API** dispatches OTP and returns HTTP 200.
4. **CORS Configuration** is also updated on Express API to explicitly allow `https://evercut.in` and `https://www.evercut.in` for all browser and preflight requests.

---

### 3.1 Backend Configuration & CORS

#### 1. `server/.env` (Remote: `/home/ubuntu/Downloads/EverCut/server/.env` & Local: `server/.env`)
Added `https://evercut.in` and `https://www.evercut.in` to `ALLOWED_ORIGINS`:
```env
# Comma-separated browser origins allowed by CORS.
ALLOWED_ORIGINS=https://evercut.in,https://www.evercut.in,http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173
```

#### 2. `server/src/config/cors.config.js`
Added `Accept` and `X-Requested-With` to `allowedHeaders` so custom header preflights succeed cleanly:
```diff
         methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
-        allowedHeaders: ['Content-Type', 'Authorization'],
+        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
         credentials: false,
         maxAge: 600,
```

---

### 3.2 Frontend Architecture (`admin`)

#### 3. `admin/src/app/(auth)/login/_actions/login.action.js`
Added `handleRequestOtpAction` as a Next.js Server Action with Zod schema validation:
```javascript
/**
 * Server Action to request an OTP code for administrative login.
 * Executed server-side from Next.js server to backend API.
 *
 * @param {Object} payload
 * @param {string} payload.phone - 10-digit Indian mobile number
 * @returns {Promise<{success: boolean, message: string, errors?: Array}>}
 */
export async function handleRequestOtpAction({ phone }) {
  try {
    const validation = requestOTPSchema.safeParse({ phone });
    if (!validation.success) {
      return {
        success: false,
        message: 'Invalid phone number format.',
        errors: validation.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }

    return await requestOTP(phone);
  } catch (error) {
    return {
      success: false,
      message: error?.message || 'Failed to contact authentication service. Please try again.',
    };
  }
}
```

#### 4. `admin/src/app/(auth)/login/_components/LoginForm.js`
Updated `onPhoneSubmit` and `handleResend` to invoke `handleRequestOtpAction` instead of direct client-side `requestOTP`:
```diff
 import { FormInput } from '@/components/forms';
 import { requestOTPSchema, verifyOTPSchema } from '@/lib/schemas/auth.schema';
-import { requestOTP } from '@/lib/services/auth.service';
-import { handleLoginAction } from '../_actions/login.action';
+import { handleLoginAction, handleRequestOtpAction } from '../_actions/login.action';
 
...
   async function onPhoneSubmit(data) {
     startTransition(async () => {
       try {
-        const result = await requestOTP(data.phone);
+        const result = await handleRequestOtpAction({ phone: data.phone });
 
...
   async function handleResend() {
     if (resendTimer > 0) return;
     startTransition(async () => {
       try {
-        const result = await requestOTP(phoneVal);
+        const result = await handleRequestOtpAction({ phone: phoneVal });
```

---

### 3.3 Build & Deployment on Remote Host

1. **Restarted Express Backend**:
   ```bash
   pm2 restart evercut-server --update-env
   ```
2. **Recompiled Next.js Admin**:
   ```bash
   cd /home/ubuntu/Downloads/EverCut/admin && npm run build
   ```
   *Result*: Compiled in 10.7s, generated all static and dynamic routes with fresh action identifiers.
3. **Restarted Next.js Admin in PM2**:
   ```bash
   pm2 restart evercut-admin
   ```

---

## 4. Verification & Validation Results

### Test 1: Live Preflight OPTIONS Request with Production Origin
```bash
curl -sI -X OPTIONS https://api.evercut.in/api/v1/auth/otp/send \
  -H 'Origin: https://evercut.in' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,accept'
```
**Output**:
```http
HTTP/2 204 
access-control-allow-headers: Content-Type,Authorization,Accept,X-Requested-With
access-control-allow-methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
access-control-allow-origin: https://evercut.in
access-control-max-age: 600
```
*Result*: PASSED (Preflight succeeded with HTTP 204 and valid CORS headers).

### Test 2: Live POST Request with Production Origin
```bash
echo '{"mobile": "9876543210"}' | curl -s -X POST https://api.evercut.in/api/v1/auth/otp/send \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://evercut.in' \
  -d @-
```
**Output**:
```json
{"success":true,"message":"OTP sent successfully","data":{}}
```
*Result*: PASSED (OTP dispatched with HTTP 200).

### Test 3: Frontend Route Status
```bash
curl -sI https://evercut.in/login
```
**Output**:
```http
HTTP/2 200 
content-type: text/html; charset=utf-8
```
*Result*: PASSED.

### Test 4: Remote PM2 Service Health
```
┌────┬───────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┐
│ id │ name              │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │
├────┼───────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┤
│ 1  │ evercut-admin     │ default     │ N/A     │ fork    │ 3744323  │ online │ 3    │ online    │
│ 0  │ evercut-server    │ default     │ 2.1.0   │ fork    │ 3738874  │ online │ 3    │ online    │
└────┴───────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┘
```
*Result*: Both services are active and running without errors.

---

## 5. User Testing Instructions

1. Open your browser and go to:
   **`https://evercut.in/login`** (or **`https://evercut.in/adminevercut`**)
   *(Perform a hard refresh with `Ctrl + F5` or `Cmd + Shift + R` to ensure any cached build bundles are cleared).*
2. Enter your administrative mobile number.
3. Click **"Request OTP"**.
4. Verify that:
   - No "Failed to fetch" error appears.
   - The toast confirms `"OTP sent successfully"`.
   - The form advances to Step 2 (6-digit OTP verification).
5. Enter the OTP code to log in to the admin overview dashboard.
