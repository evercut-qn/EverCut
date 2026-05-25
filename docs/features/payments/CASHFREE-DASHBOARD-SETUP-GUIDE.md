# Cashfree Dashboard Setup Guide — EverCut Integration

> **Scope:** Exactly what to do on the Cashfree dashboard, what values to collect, and precisely where each value belongs in your `server/` directory. No code. No theory.

---

## Part 1 — Account Setup

### Step 1: Create a Cashfree Merchant Account

1. Go to [merchant.cashfree.com/merchants/signup](https://merchant.cashfree.com/merchants/signup).
2. Sign up with your business email.
3. Complete KYC — you will need:
   - Business PAN
   - GST number (if applicable)
   - Bank account details (for settlement)
   - Business registration proof
4. Once KYC is approved, your account will be activated for both **Sandbox** and **Production** access.

> You can start development immediately using the Sandbox environment — KYC approval is only required to go live in Production.

---

### Step 2: Enable the Subscriptions Product

1. Log in at [merchant.cashfree.com/auth/login](https://merchant.cashfree.com/auth/login).
2. On the left sidebar, look for **Payment Gateway**.
3. Inside Payment Gateway, confirm that **Subscriptions** is listed as an available product.
4. If it is not enabled by default, contact Cashfree support (support@cashfree.com) or use the in-dashboard chat to request Subscription activation for your account.

> Subscriptions is a separate product from the standard Payment Gateway. It must be explicitly enabled on your merchant account before the Subscription APIs will work — even in Sandbox.

---

## Part 2 — Collect API Credentials

### Step 3: Generate API Keys (Sandbox)

1. In the dashboard, switch to **Sandbox** mode using the environment toggle (usually at the top-right of the dashboard — labelled **Test** or **Sandbox**).
2. In the left sidebar, click **Developers**.
3. Click **API Keys**.
4. Click **Generate API Key** (or **Generate Test API Key** if you are in the Sandbox view).
5. Download the key file immediately — it is shown only once.
6. From the downloaded file (or the on-screen display), note down exactly two values:

| Value Name | What It Looks Like | What You Will Name It |
|---|---|---|
| App ID | A short alphanumeric string | `CASHFREE_APP_ID` |
| Secret Key | A longer alphanumeric string | `CASHFREE_SECRET_KEY` |

> These two values are your authentication credentials for all Subscription API calls in the Sandbox environment.

### Step 4: Generate API Keys (Production)

Repeat Step 3, but first switch the dashboard to **Production** mode. The values you get here are separate from Sandbox and should only be used when your server is deployed live.

| Value Name | What You Will Name It |
|---|---|
| App ID (Production) | `CASHFREE_APP_ID` (in your production `.env`) |
| Secret Key (Production) | `CASHFREE_SECRET_KEY` (in your production `.env`) |

---

## Part 3 — Configure Webhooks

### Step 5: Add a Webhook Endpoint (Sandbox)

Remain in **Sandbox** mode.

1. In the left sidebar, click **Developers**.
2. Click **Webhooks**.
3. Click **Add Webhook Endpoint**.
4. In the **Endpoint URL** field, enter:
   ```
   https://<your-sandbox-domain>/webhooks/cashfree
   ```
   During local development, you can use a tunnelling tool (e.g., ngrok) to expose your local server. The URL would look like:
   ```
   https://abc123.ngrok.io/webhooks/cashfree
   ```
5. In the **Webhook Version** dropdown, select **`2025-01-01`**. Do not select any older version.
6. Click **Test** to verify Cashfree can reach your endpoint. Your server must return HTTP `200` for the test to pass.
7. Click **Next**.
8. On the events selection screen, select **all Subscription events**:
   - `SUBSCRIPTION_STATUS_CHANGED`
   - `SUBSCRIPTION_AUTH_STATUS`
   - `SUBSCRIPTION_PAYMENT_NOTIFICATION_INITIATED`
   - `SUBSCRIPTION_PAYMENT_SUCCESS`
   - `SUBSCRIPTION_PAYMENT_FAILED`
   - `SUBSCRIPTION_PAYMENT_CANCELLED`
   - `SUBSCRIPTION_REFUND_STATUS`
   - `SUBSCRIPTION_CARD_EXPIRY_REMINDER`
9. Click **Add Webhook**.

### Step 6: Retrieve the Webhook Secret Key

After the webhook endpoint is created:

1. In **Developers → Webhooks**, locate your newly added endpoint.
2. Click on it (or look for a **View Secret** / **Show Secret** option).
3. Copy the **Webhook Secret Key** displayed.

| Value Name | What You Will Name It |
|---|---|
| Webhook Secret Key | `CASHFREE_WEBHOOK_SECRET` |

> This secret is used to verify that incoming webhook requests genuinely came from Cashfree. It is different from your API Secret Key.

### Step 7: Add a Webhook Endpoint (Production)

Switch to **Production** mode and repeat Step 5 with your live domain:
```
https://api.evercut.in/webhooks/cashfree
```
Collect the Production Webhook Secret Key separately and store it in your production `.env`.

> Production webhooks require an `https://` endpoint. Plain `http://` is rejected.

---

## Part 4 — Create a Subscription Plan on the Dashboard (Optional but Recommended)

You can create a plan via API in code, but doing it once on the dashboard confirms your account has Subscriptions active and gives you a reusable `plan_id` to reference in your code.

### Step 8: Create a Plan

1. In the left sidebar, click **Payment Gateway → Subscriptions** (or navigate directly to the Subscriptions section).
2. Click **Plans → Create Plan**.
3. Fill in the following fields:

| Field | Value for EverCut Monthly |
|---|---|
| Plan Name | `EverCut Monthly Pass` |
| Plan Type | `Periodic` |
| Currency | `INR` |
| Recurring Amount | `499` |
| Maximum Amount | `499` |
| Charge Customer Once Every | `1 Month` |
| Max Number of Debits | Leave blank (unlimited) or set `12` for annual cap |
| Description | `Monthly haircut subscription` |

4. Click **Create Plan**.
5. After creation, note down the **Plan ID** shown in the dashboard.

| Value Name | What You Will Name It |
|---|---|
| Plan ID | `CASHFREE_PLAN_ID_MONTHLY` |

Repeat for a Yearly plan if needed.

---

## Part 5 — Where Every Value Goes in `server/`

### The `.env` File

All values collected above belong in a single `.env` file at the root of your `server/` directory:

```
server/
└── .env          ← place ALL values here
```

The `.env` file must contain the following keys, populated with the values you collected:

```
# ─── Cashfree: Sandbox ──────────────────────────────────────────
CASHFREE_APP_ID=<App ID from Step 3>
CASHFREE_SECRET_KEY=<Secret Key from Step 3>
CASHFREE_WEBHOOK_SECRET=<Webhook Secret from Step 6>

# ─── Cashfree: API Version (do not change) ──────────────────────
CASHFREE_API_VERSION=2025-01-01

# ─── Cashfree: Plan IDs ─────────────────────────────────────────
CASHFREE_PLAN_ID_MONTHLY=<Plan ID from Step 8>
CASHFREE_PLAN_ID_YEARLY=<Plan ID if you created a yearly plan>

# ─── Cashfree: URLs ─────────────────────────────────────────────
CASHFREE_BASE_URL=https://sandbox.cashfree.com/pg

# ─── App URLs ───────────────────────────────────────────────────
APP_BASE_URL=https://api.evercut.in
SUBSCRIPTION_RETURN_URL=https://app.evercut.in/subscription/callback
```

When deploying to Production, replace the Sandbox values with the Production values from Steps 4 and 7, and change `CASHFREE_BASE_URL` to:
```
CASHFREE_BASE_URL=https://api.cashfree.com/pg
```

### Where Each Key Is Used in Your Code

| `.env` Key | Where It Is Read in `server/` |
|---|---|
| `CASHFREE_APP_ID` | Sent as the `x-client-id` header on every Cashfree API call — in your Cashfree API client file (`lib/cashfree.js` or equivalent) |
| `CASHFREE_SECRET_KEY` | Sent as the `x-client-secret` header on every Cashfree API call — same file as above |
| `CASHFREE_WEBHOOK_SECRET` | Used only in the webhook verification middleware to compute and compare the HMAC signature — in your webhook middleware file |
| `CASHFREE_API_VERSION` | Sent as the `x-api-version` header on every Cashfree API call |
| `CASHFREE_PLAN_ID_MONTHLY` | Referenced when creating a subscription for a monthly plan — in your subscription service or controller |
| `CASHFREE_PLAN_ID_YEARLY` | Referenced when creating a subscription for a yearly plan — same location |
| `CASHFREE_BASE_URL` | Used as the base URL in your Cashfree API client so switching environments requires changing only this one value |
| `SUBSCRIPTION_RETURN_URL` | Passed in the `subscription_meta.return_url` field when calling the Create Subscription API |

### `.gitignore` Requirement

Ensure your `server/.gitignore` (or root `.gitignore`) includes:
```
.env
```
Never commit `.env` to version control. The Cashfree Secret Key and Webhook Secret, if exposed, allow anyone to make API calls on your account and bypass webhook verification.

---

## Part 6 — Sandbox vs. Production Checklist

| Task | Sandbox | Production |
|---|---|---|
| Account signup | ✅ Self-serve, instant | ✅ Requires KYC approval |
| API Keys | ✅ From Step 3 | ✅ From Step 4 |
| Webhook endpoint | `http://` or `https://` allowed | `https://` only |
| Webhook Secret | ✅ From Step 6 (sandbox) | ✅ From Step 7 (production) |
| `CASHFREE_BASE_URL` | `https://sandbox.cashfree.com/pg` | `https://api.cashfree.com/pg` |
| Plan IDs | Sandbox plans only work in sandbox | Create separate plans in production |
| UPI test payments | Use Cashfree sandbox UPI VPAs from their test data page | Real customer UPI IDs |

> Sandbox and Production are completely isolated environments. Credentials, plan IDs, and webhook secrets from one do not work in the other.

---

## Part 7 — Post-Setup Verification (Dashboard)

Once your server is running with the `.env` values in place, confirm everything is connected by doing the following checks on the dashboard:

1. **API Key check:** Make a test API call (e.g., fetch a plan). If you get a `401 Unauthorized` response, the `CASHFREE_APP_ID` or `CASHFREE_SECRET_KEY` is wrong.
2. **Webhook test:** In **Developers → Webhooks**, click **Test** on your registered endpoint. If it fails, your server's webhook route is not reachable or is returning a non-200 status.
3. **Webhook logs:** After a test subscription is created and authorized, go to **Developers → Webhooks → Logs** and confirm events are appearing. If they show as **Failed**, your server is receiving them but returning an error — check your signature verification logic.
4. **Plan visibility:** Go to **Payment Gateway → Subscriptions → Plans** and confirm your plan appears with status `ACTIVE`.
