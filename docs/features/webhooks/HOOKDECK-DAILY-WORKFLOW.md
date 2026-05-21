# Hookdeck Daily Workflow Guide

## 🚀 Quick Start

**Start everything in one go**:

```bash
# Terminal 1: Server
cd server
npm run dev

# Terminal 2: Payment webhooks (PhonePe)
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook

# Terminal 3: Payout webhooks (Cashfree)
hookdeck listen 5000 cashfree-webhooks --path /api/v1/payouts/webhook

# Terminal 4: Subscription webhooks (Razorpay)
hookdeck listen 5000 razorpay-webhooks --path /api/v1/subscriptions/webhook
```

**That's it!** All webhooks are now forwarded to your local server.

---

## Quick Reference for Daily Development

### First Time Setup (One-Time Only)

#### 1. Install Hookdeck CLI

**Windows (PowerShell)**:
```powershell
npm install -g hookdeck-cli
```

**macOS/Linux**:
```bash
npm install -g hookdeck-cli
# or
brew install hookdeck/hookdeck/hookdeck
```

#### 2. Login to Hookdeck

```bash
hookdeck login
```

This opens your browser for authentication. Login once and you're set.

#### 3. Start First Session

```bash
cd server
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook
```

**Output**:
```
Dashboard
👉 Inspect and replay webhooks: https://dashboard.hookdeck.io/cli/events

phonepe-webhooks Source
🔌 Event URL: https://hkdk.events/src_abc123xyz
```

#### 4. Configure PhonePe (One-Time)

**Important**: Copy the Event URL from the output above.

1. Go to PhonePe Merchant Dashboard
2. Navigate to Webhooks/API Configuration
3. Set webhook URL: `https://hkdk.events/src_abc123xyz` (your actual URL)
4. Configure authentication:
   - Username: (from `.env` → `PHONEPE_WEBHOOK_USERNAME`)
   - Password: (from `.env` → `PHONEPE_WEBHOOK_PASSWORD`)
5. Select events: ORDER_COMPLETED, ORDER_FAILED, REFUND_COMPLETED, REFUND_FAILED
6. Save

**✅ Done! You never need to change this URL again.**

---

## Daily Workflow

### Starting Your Development Session

**Every time you start working**, run these commands:

#### Terminal 1: Start Your Server
```bash
cd server
npm run dev
```

**Output**:
```
Server running on port 5000
MongoDB connected
```

#### Terminal 2: Start Hookdeck Tunnel (PhonePe)
```bash
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook
```

**Output**:
```
phonepe-webhooks Source
🔌 Event URL: https://hkdk.events/src_abc123xyz  ← Same URL as before!
```

**✅ That's it!** You're ready to receive webhooks. See the sections below for Cashfree and Razorpay terminals.

---

## What Happens When You Close Everything?

### Scenario 1: Close Terminal (End of Day)

**What happens**:
- ❌ Hookdeck tunnel disconnects
- ❌ Your local server stops
- ✅ **URL stays the same** (stored in Hookdeck cloud)
- ✅ **Webhooks are queued** (not lost!)

**Next day**:
```bash
# Terminal 1
npm run dev

# Terminal 2
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook
```

**Result**: 
- ✅ Same URL reconnects
- ✅ Queued webhooks are delivered immediately
- ✅ No PhonePe reconfiguration needed

### Scenario 2: Computer Restart

**What happens**:
- Everything stops
- URL remains valid in Hookdeck cloud
- Webhooks queue up

**After restart**:
```bash
# Same commands as always
cd server
npm run dev

# In another terminal
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook
```

**Result**: Same URL, everything works.

### Scenario 3: Webhooks Arrive While Offline

**What happens**:
- PhonePe sends webhook to `https://hkdk.events/src_abc123xyz`
- Hookdeck receives it (always online)
- Hookdeck queues the webhook
- You see it in dashboard: https://dashboard.hookdeck.io

**When you reconnect**:
- Queued webhooks are delivered to your local server
- You can also manually replay them from the dashboard

---

## Useful Commands

### Check Your Hookdeck Sources

```bash
hookdeck source list
```

**Output**:
```
NAME                URL
phonepe-webhooks    https://hkdk.events/src_abc123xyz
```

### View Your Event URL Anytime

```bash
hookdeck source list
```

Or check the dashboard: https://dashboard.hookdeck.io/sources

### Listen with Custom Path

```bash
# If your webhook route changes
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook
```

### Listen on Different Port

```bash
# If you change your server port
hookdeck listen 3000 phonepe-webhooks --path /api/v1/payments/webhook
```

---

## Hookdeck Dashboard Features

### Access Dashboard
https://dashboard.hookdeck.io

### What You Can Do:

#### 1. View All Webhooks
- See every webhook PhonePe sent
- View timestamps, payloads, headers
- Check delivery status

#### 2. Inspect Webhook Details
- Click any webhook to see:
  - Full JSON payload
  - All HTTP headers
  - Response from your server
  - Delivery attempts

#### 3. Replay Webhooks
- Click "Retry" on any webhook
- Test your code without triggering real payments
- Useful for debugging edge cases

#### 4. Filter Events
- Filter by event type (ORDER_COMPLETED, ORDER_FAILED, etc.)
- Search by merchantOrderId
- Filter by date range

#### 5. Test Webhooks Manually
- Click "Send Test Event"
- Customize the payload
- Send to your local server

---

## Troubleshooting

### Problem: "Connection refused" when starting Hookdeck

**Solution**:
```bash
# Make sure your server is running first
cd server
npm run dev

# Then start Hookdeck in another terminal
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook
```

### Problem: Webhooks not arriving locally

**Check**:
1. ✅ Server running? `curl http://localhost:5000/health`
2. ✅ Hookdeck connected? Check terminal output
3. ✅ Correct port? Should match your server port (5000)
4. ✅ Correct path? Should be `/api/v1/payments/webhook`

**View in dashboard**:
- Go to https://dashboard.hookdeck.io
- Check if webhooks are arriving (they should be queued)
- If yes, problem is with local connection
- If no, problem is with PhonePe configuration

### Problem: Forgot my Event URL

**Solution**:
```bash
hookdeck source list
```

Or check: https://dashboard.hookdeck.io/sources

### Problem: Want to change the source name

**Solution**:
```bash
# Create a new source with different name
hookdeck listen 5000 phonepe-webhooks-v2 --path /api/v1/payments/webhook

# Update PhonePe with the new URL
# Delete old source from dashboard if needed
```

---

## Pro Tips

### Tip 1: Keep Dashboard Open
Keep https://dashboard.hookdeck.io open in a browser tab while developing. You'll see webhooks arrive in real-time.

### Tip 2: Use Multiple Terminals
```
Terminal 1: npm run dev                                                          (Server)
Terminal 2: hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook (PhonePe)
Terminal 3: hookdeck listen 5000 cashfree-webhooks --path /api/v1/payouts/webhook (Cashfree)
Terminal 4: hookdeck listen 5000 razorpay-webhooks --path /api/v1/subscriptions/webhook (Razorpay)
Terminal 5: mongosh                                                              (Database queries)
```

### Tip 3: Test Before Real Payments
Use the dashboard to send test webhooks before testing with real PhonePe payments:

1. Go to https://dashboard.hookdeck.io
2. Click "Send Test Event"
3. Use this payload:
```json
{
  "event": "ORDER_COMPLETED",
  "payload": {
    "merchantOrderId": "EC-test-123",
    "orderId": "PO123456789",
    "state": "COMPLETED",
    "amount": 50000,
    "paymentDetails": [{
      "paymentMode": "UPI",
      "transactionId": "TXN123456",
      "amount": 50000,
      "state": "COMPLETED"
    }]
  }
}
```

### Tip 4: Replay Failed Webhooks
If a webhook fails due to a bug in your code:
1. Fix the bug
2. Go to dashboard
3. Find the failed webhook
4. Click "Retry"
5. No need to trigger a new payment!

### Tip 5: Save Your Event URL
Create a file `server/.hookdeck-url` (add to .gitignore):
```
https://hkdk.events/src_abc123xyz
```

This way you always have it handy.

---

## Quick Start Checklist

### First Time Setup
- [ ] Install Hookdeck CLI: `npm install -g hookdeck-cli`
- [ ] Login: `hookdeck login`
- [ ] Start PhonePe tunnel: `hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook`
- [ ] Start Cashfree tunnel: `hookdeck listen 5000 cashfree-webhooks --path /api/v1/payouts/webhook`
- [ ] Start Razorpay tunnel: `hookdeck listen 5000 razorpay-webhooks --path /api/v1/subscriptions/webhook`
- [ ] Copy each Event URL from output
- [ ] Configure PhonePe, Cashfree, and Razorpay dashboards with their respective Event URLs
- [ ] Save all Event URLs somewhere safe

### Daily Workflow
- [ ] Start server: `npm run dev`
- [ ] Start PhonePe Hookdeck: `hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook`
- [ ] Start Cashfree Hookdeck: `hookdeck listen 5000 cashfree-webhooks --path /api/v1/payouts/webhook`
- [ ] Start Razorpay Hookdeck: `hookdeck listen 5000 razorpay-webhooks --path /api/v1/subscriptions/webhook`
- [ ] Verify all connections in terminal output
- [ ] Open dashboard: https://dashboard.hookdeck.io (optional)
- [ ] Start coding!

### End of Day
- [ ] Close terminals (Ctrl+C)
- [ ] That's it! All URLs remain valid

---

## Example Session

```bash
# Morning - Start working
$ cd server
$ npm run dev
Server running on port 5000 ✓

# In another terminal
$ hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook

Dashboard
👉 Inspect and replay webhooks: https://dashboard.hookdeck.io/cli/events

phonepe-webhooks Source
🔌 Event URL: https://hkdk.events/src_abc123xyz

✓ Connection established
⠋ Waiting for webhooks...

# ... work all day ...

# Webhook arrives
⠋ Waiting for webhooks...
[2026-04-23 10:30:45] POST /api/v1/payments/webhook
  Status: 200 OK
  Event: ORDER_COMPLETED
  merchantOrderId: EC-67890

# Evening - End work
$ # Press Ctrl+C in both terminals
^C
Disconnected from Hookdeck

# Next morning - Same commands
$ npm run dev
$ hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook

# Same URL reconnects!
🔌 Event URL: https://hkdk.events/src_abc123xyz  ← Same as yesterday!
✓ Connection established
```

---

## Important Notes

### ✅ URL Stability
- Your Event URL (`https://hkdk.events/src_abc123xyz`) is **permanent**
- It's tied to your Hookdeck account and source name (`phonepe-webhooks`)
- As long as you use the same source name, you get the same URL
- **No need to reconfigure PhonePe** after restarts

### ✅ Webhook Queuing
- Webhooks that arrive while you're offline are **queued**
- They're delivered when you reconnect
- You can view them in the dashboard anytime
- Nothing is lost!

### ✅ Free Tier Limits
- 100,000 requests per month
- Unlimited sources
- Unlimited replays
- 7-day event retention

For typical development, this is more than enough.

### ⚠️ Source Name Matters
If you change the source name, you get a **different URL**:

```bash
# This creates a NEW source with a NEW URL
hookdeck listen 5000 phonepe-webhooks-new --path /api/v1/payments/webhook
```

**Always use the same source name** to keep the same URL.

---

## Summary

**Daily workflow is simple**:

```bash
# Terminal 1: Server
npm run dev

# Terminal 2: Payment webhooks (PhonePe)
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook

# Terminal 3: Payout webhooks (Cashfree)
hookdeck listen 5000 cashfree-webhooks --path /api/v1/payouts/webhook

# Terminal 4: Subscription webhooks (Razorpay)
hookdeck listen 5000 razorpay-webhooks --path /api/v1/subscriptions/webhook
```

**That's it!** Same URLs every time, no reconfiguration needed.

**When you're done**: Just close the terminals. Everything is saved in Hookdeck cloud.

**Next time**: Run the same commands. Your URLs reconnect automatically.

---

## Need Help?

- **Hookdeck Docs**: https://hookdeck.com/docs
- **Dashboard**: https://dashboard.hookdeck.io
- **Support**: support@hookdeck.com
- **Your Event URL**: Run `hookdeck source list`


---

## 🔄 Payout Webhooks (Cashfree)

### Overview

In addition to payment webhooks, EverCut also uses **payout webhooks** from Cashfree to receive real-time updates about barber payouts.

**Payout Webhook Endpoint**: `POST /api/v1/payouts/webhook`

**Events Handled**:
- `TRANSFER_SUCCESS` - Payout completed successfully
- `TRANSFER_FAILED` - Payout failed
- `TRANSFER_REVERSED` - Payout was reversed

---

### Setting Up Payout Webhooks with Hookdeck

#### Option 1: Use Same Hookdeck Session (Recommended)

If you're already running Hookdeck for payment webhooks, you can add payout webhooks to the same session.

**Stop current Hookdeck** (Ctrl+C), then restart with multiple paths:

```bash
# This won't work - Hookdeck CLI doesn't support multiple paths in one command
# We need to use separate sources
```

#### Option 2: Use Separate Hookdeck Sources (Recommended)

Run **two separate Hookdeck sessions** in different terminals:

**Terminal 1: Payment Webhooks**
```bash
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook
```

**Terminal 2: Payout Webhooks**
```bash
hookdeck listen 5000 cashfree-webhooks --path /api/v1/payouts/webhook
```

**Output**:
```
# Terminal 1
phonepe-webhooks Source
🔌 Event URL: https://hkdk.events/src_abc123xyz
Forwarding → http://localhost:5000/api/v1/payments/webhook

# Terminal 2
cashfree-webhooks Source
🔌 Event URL: https://hkdk.events/src_def456uvw
Forwarding → http://localhost:5000/api/v1/payouts/webhook
```

---

### Configure Cashfree Dashboard

#### 1. Login to Cashfree

- **Sandbox Mode**: https://sandbox.cashfree.com
- **Production**: https://merchant.cashfree.com

#### 2. Navigate to Webhooks

1. Go to **Settings** → **Webhooks** → **Payouts**
2. Click **Add Webhook**

#### 3. Configure Webhook

**Webhook URL**: `https://hkdk.events/src_def456uvw` (your Hookdeck URL from Terminal 2)

**Events to Subscribe**:
- ✅ `TRANSFER_SUCCESS`
- ✅ `TRANSFER_FAILED`
- ✅ `TRANSFER_REVERSED`

**Webhook Secret** (optional): Leave blank for testing, or set a secret and update your code

#### 4. Save Configuration

Click **Save** - Cashfree will now send payout webhooks to your Hookdeck URL.

---

### Daily Workflow with Both Webhooks

**Every time you start working**, run these commands:

#### Terminal 1: Start Your Server
```bash
cd server
npm run dev
```

#### Terminal 2: Payment Webhooks (PhonePe)
```bash
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook
```

#### Terminal 3: Payout Webhooks (Cashfree)
```bash
hookdeck listen 5000 cashfree-webhooks --path /api/v1/payouts/webhook
```

**✅ That's it!** You're now ready to receive both payment and payout webhooks.

---

### Testing Payout Webhooks

#### Method 1: Trigger Real Payout

1. Run payout batch via the server API or admin endpoint.

2. Wait for Cashfree to process (1-5 minutes)

3. Webhook will arrive automatically in Terminal 3

4. Check server logs:
```
[PayoutService] Payout webhook received
  event: "TRANSFER_SUCCESS"
  transferId: "PAYOUT_xxx_1777037869167"
  status: "SUCCESS"

[PayoutController] Webhook processed
  event: "TRANSFER_SUCCESS"
  processed: true
```

#### Method 2: Manual Test via Hookdeck Dashboard

1. Go to https://dashboard.hookdeck.io

2. Find your `cashfree-webhooks` source

3. Click **Send Test Event**

4. Use this payload:

```json
{
  "event": "TRANSFER_SUCCESS",
  "data": {
    "transfer": {
      "transferId": "PAYOUT_69e9ec2b71f79d2940d358e7_1777037869167",
      "status": "SUCCESS",
      "utr": "TEST123456789",
      "amount": 450,
      "transferMode": "upi",
      "acknowledged": 1,
      "processedOn": "2026-04-24T14:00:00.000Z"
    }
  }
}
```

5. Click **Send**

6. Check your server logs to see webhook received

#### Method 3: Test via cURL

```bash
curl -X POST http://localhost:5000/api/v1/payouts/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "TRANSFER_SUCCESS",
    "data": {
      "transfer": {
        "transferId": "PAYOUT_69e9ec2b71f79d2940d358e7_1777037869167",
        "status": "SUCCESS",
        "utr": "TEST123456789",
        "amount": 450,
        "transferMode": "upi",
        "acknowledged": 1,
        "processedOn": "2026-04-24T14:00:00.000Z"
      }
    }
  }'
```

---

### Webhook Event Details

#### TRANSFER_SUCCESS

**When**: Payout completed successfully, money transferred to barber

**Payload Example**:
```json
{
  "event": "TRANSFER_SUCCESS",
  "data": {
    "transfer": {
      "transferId": "PAYOUT_xxx_1777037869167",
      "status": "SUCCESS",
      "utr": "TEST123456789",
      "amount": 450,
      "transferMode": "upi",
      "acknowledged": 1,
      "processedOn": "2026-04-24T14:00:00.000Z"
    }
  }
}
```

**What Happens**:
- ✅ Payout transaction status → `SUCCESS`
- ✅ Booking payout status → `COMPLETED`
- ✅ Payment settlement → `settled: true`
- ✅ UTR saved to database

---

#### TRANSFER_FAILED

**When**: Payout failed (invalid UPI, insufficient balance, etc.)

**Payload Example**:
```json
{
  "event": "TRANSFER_FAILED",
  "data": {
    "transfer": {
      "transferId": "PAYOUT_xxx_1777037869167",
      "status": "FAILED",
      "failureReason": "INVALID_VPA",
      "amount": 450,
      "transferMode": "upi",
      "acknowledged": 1
    }
  }
}
```

**What Happens**:
- ❌ Payout transaction status → `FAILED`
- ❌ Booking payout status → `FAILED`
- ❌ Can be retried manually

---

#### TRANSFER_REVERSED

**When**: Payout was reversed by bank (rare)

**Payload Example**:
```json
{
  "event": "TRANSFER_REVERSED",
  "data": {
    "transfer": {
      "transferId": "PAYOUT_xxx_1777037869167",
      "status": "REVERSED",
      "failureReason": "BENEFICIARY_ACCOUNT_CLOSED",
      "amount": 450,
      "transferMode": "upi",
      "acknowledged": 1
    }
  }
}
```

**What Happens**:
- ⚠️ Payout transaction status → `REVERSED`
- ⚠️ Booking payout status → `REVERSED`
- ⚠️ Payment settlement → `settled: false` (unmarked)
- ⚠️ Can be retried with different UPI/bank details

---

### Verifying Webhook Processing

#### Check Server Logs

```bash
# Webhook received
[PayoutService] Payout webhook received
  event: "TRANSFER_SUCCESS"
  transferId: "PAYOUT_xxx_1777037869167"
  status: "SUCCESS"

# Webhook processed
[PayoutController] Webhook processed
  event: "TRANSFER_SUCCESS"
  processed: true
```

#### Check Database

```javascript
// In MongoDB
// Check payout transaction
db.payouttransactions.findOne(
    { transferId: "PAYOUT_xxx_1777037869167" },
    { status: 1, utr: 1, processedAt: 1, webhookProcessed: 1 }
)

// Expected result after SUCCESS webhook
{
    status: "success",
    utr: "TEST123456789",
    processedAt: ISODate("2026-04-24T14:00:00.000Z"),
    webhookProcessed: true
}

// Check booking status
db.bookings.find(
    { payoutTransactionId: ObjectId("payout_id") },
    { payoutStatus: 1, payoutCompletedAt: 1, barberUtr: 1 }
)

// Expected result
{
    payoutStatus: "completed",
    payoutCompletedAt: ISODate("2026-04-24T14:00:00.000Z"),
    barberUtr: "TEST123456789"
}

// Check payment settlement
db.paymenttransactions.find(
    { bookingId: ObjectId("booking_id") },
    { "settlement.settled": 1, "settlement.settledAt": 1 }
)

// Expected result
{
    settlement: {
        settled: true,
        settledAt: ISODate("2026-04-24T14:00:00.000Z")
    }
}
```

#### Check Hookdeck Dashboard

1. Go to https://dashboard.hookdeck.io
2. Click on `cashfree-webhooks` source
3. See all received webhooks with:
   - Timestamp
   - Event type
   - Payload
   - Response from your server
   - Delivery status

---

### Troubleshooting Payout Webhooks

### Troubleshooting Payout Webhooks

#### Problem: "Invalid webhook signature" when testing from Cashfree dashboard

**Logs show**:
```
[CashfreePayoutAdapter] Missing webhook signature headers
[PayoutService] Invalid Cashfree webhook signature
[PayoutController] Webhook processing error, error:"Invalid webhook signature"
```

**Solution**: This is **EXPECTED and NORMAL**!
- Cashfree's "Test Webhook" button doesn't include signature headers
- Your security is working correctly - it's detecting missing signatures
- Real payout webhooks WILL include proper signatures
- If you see `Request completed, status:200` - everything is working!

**To verify with real signature**: Trigger an actual payout via the server API.

---

#### Problem: Webhook not arriving

**Check**:
1. ✅ Hookdeck running? Check Terminal 3
2. ✅ Correct URL in Cashfree dashboard?
3. ✅ Payout actually initiated? Check Cashfree dashboard
4. ✅ Server running? Check Terminal 1

**Solution**:
- Verify Hookdeck URL in Cashfree dashboard
- Check Cashfree dashboard for webhook delivery logs
- Use Hookdeck dashboard to see if webhook arrived there

---

#### Problem: Webhook arrives but not processed

**Check server logs**:
```
[PayoutService] Invalid Cashfree webhook signature
```

**Solution**:
- Webhook signature verification might be failing
- Check if Cashfree webhook secret matches your configuration
- For testing, you can temporarily disable signature verification

---

#### Problem: Payout status not updating

**Check**:
1. Webhook received? Check logs
2. Transfer ID matches? Check database
3. Payout exists? Check `payouttransactions` collection

**Solution**:
```javascript
// Manually check payout
db.payouttransactions.findOne({ transferId: "PAYOUT_xxx_1777037869167" })

// If not found, webhook has wrong transfer ID
// If found but not updated, check server logs for errors
```

---

### Complete Webhook Setup Checklist

#### Payment Webhooks (PhonePe)
- [ ] Hookdeck CLI installed
- [ ] Hookdeck logged in
- [ ] Payment webhook source created (`phonepe-webhooks`)
- [ ] PhonePe dashboard configured with Hookdeck URL
- [ ] Webhook authentication configured
- [ ] Test webhook sent and received

#### Payout Webhooks (Cashfree)
- [ ] Payout webhook source created (`cashfree-webhooks`)
- [ ] Cashfree dashboard configured with Hookdeck URL
- [ ] Events subscribed (SUCCESS, FAILED, REVERSED)
- [ ] Test webhook sent and received
- [ ] Payout status updates verified in database

#### Subscription Webhooks (Razorpay)
- [ ] Subscription webhook source created (`razorpay-webhooks`)
- [ ] Razorpay dashboard configured with Hookdeck URL
- [ ] Webhook secret generated and stored in `.env`
- [ ] Events subscribed (activated, charged, halted, cancelled, paused, resumed, updated, payment.failed)
- [ ] Test webhook sent and received
- [ ] Subscription status updates verified in database

---

## 🔔 Subscription Webhooks (Razorpay)

### Overview

EverCut uses **Razorpay Subscriptions** for barber subscription billing (Basic/Popular/Advanced plans). Razorpay sends webhooks for subscription lifecycle events — activation, renewals, cancellations, payment failures, and mandate changes.

**Subscription Webhook Endpoint**: `POST /api/v1/subscriptions/webhook`

**Events Handled**:
- `subscription.activated` — First payment successful, subscription is now active
- `subscription.charged` — Recurring renewal payment successful
- `subscription.halted` — All payment retries exhausted, subscription halted
- `subscription.cancelled` — Subscription cancelled (by API or mandate revocation)
- `subscription.paused` — UPI mandate paused externally
- `subscription.resumed` — UPI mandate resumed
- `subscription.updated` — Subscription plan changed (upgrade)
- `payment.failed` — A payment attempt failed (Razorpay retries automatically)

---

### Setting Up Subscription Webhooks with Hookdeck

#### Start the Hookdeck Tunnel

Open a dedicated terminal for Razorpay webhooks:

```bash
hookdeck listen 5000 razorpay-webhooks --path /api/v1/subscriptions/webhook
```

**Output**:
```
razorpay-webhooks Source
🔌 Event URL: https://hkdk.events/src_ghi789abc
Forwarding → http://localhost:5000/api/v1/subscriptions/webhook
```

**Copy the Event URL** — you'll need it for the Razorpay dashboard.

---

### Configure Razorpay Dashboard

#### 1. Login to Razorpay

- **Test Mode**: https://dashboard.razorpay.com (toggle to "Test Mode" in top bar)
- **Live Mode**: https://dashboard.razorpay.com (toggle to "Live Mode")

#### 2. Navigate to Webhooks

1. Go to **Account & Settings** → **Webhooks**
2. Click **+ Add New Webhook**

#### 3. Configure Webhook

**Webhook URL**: `https://hkdk.events/src_ghi789abc` (your Hookdeck URL)

**Secret**: Use the webhook secret from your `.env` file (see [Webhook Secret Generation](#webhook-secret-generation) below)

**Active Events** — subscribe to these events:
- ✅ `subscription.activated`
- ✅ `subscription.charged`
- ✅ `subscription.halted`
- ✅ `subscription.cancelled`
- ✅ `subscription.paused`
- ✅ `subscription.resumed`
- ✅ `subscription.updated`
- ✅ `payment.failed`

#### 4. Save Configuration

Click **Create Webhook** — Razorpay will now send subscription webhooks to your Hookdeck URL.

> **Note**: Razorpay allows up to 10 webhook URLs. Each URL can subscribe to different events. For local development, one webhook URL with all events is sufficient.

---

### Webhook Secret Generation

Razorpay uses **HMAC-SHA256** signature verification to authenticate webhooks. You need a strong random secret that is shared between Razorpay's dashboard and your server's `.env` file.

#### Generate a Secure Webhook Secret

**PowerShell** (recommended for Windows):

```powershell
-join ((48..57) + (65..70) + (97..102) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
```

**Example output**:
```text
bE34fdD0BeC2Fc916a85A7eF08cD39b1
```

**bash/macOS/Linux alternative**:

```bash
openssl rand -hex 32
```

**Example output**:
```text
a4f9c1e2d8b37056f1c4a9e2d8b37056f1c4a9e2d8b37056f1c4a9e2d8b37056
```

> **Important**: Both commands generate cryptographically secure random strings. The PowerShell command produces a 32-character hex string; the OpenSSL command produces a 64-character hex string. Either is acceptable — Razorpay supports arbitrary-length secrets.

#### Where to Store the Secret

**1. Local `.env` file** (`server/.env`):

```env
# Razorpay Webhook Secret
# Generated via: -join ((48..57) + (65..70) + (97..102) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
# Must match the secret configured in Razorpay Dashboard → Webhooks
RAZORPAY_WEBHOOK_SECRET=bE34fdD0BeC2Fc916a85A7eF08cD39b1
```

**2. All Razorpay environment variables** (add these to `server/.env`):

```env
# ─── Razorpay Credentials ───────────────────────────────
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=bE34fdD0BeC2Fc916a85A7eF08cD39b1
RAZORPAY_ENV=SANDBOX

# ─── Razorpay Plan IDs ──────────────────────────────────
# Created via Razorpay Dashboard → Subscriptions → Plans
RAZORPAY_PLAN_ID_POPULAR=plan_xxxxxxxxxxxxxxxx
RAZORPAY_PLAN_ID_ADVANCED=plan_xxxxxxxxxxxxxxxx
```

**3. `.env.example`** (commit this to git for other developers):

```env
# Razorpay Subscription Configuration
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_ENV=SANDBOX
RAZORPAY_PLAN_ID_POPULAR=
RAZORPAY_PLAN_ID_ADVANCED=
```

#### Recommended Environment Variable Naming

| Variable | Purpose | Example |
|---|---|---|
| `RAZORPAY_KEY_ID` | API key ID (public, used in checkout) | `rzp_test_abc123` |
| `RAZORPAY_KEY_SECRET` | API key secret (private, for server-side API calls) | `xyz789secret...` |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC signature verification secret | `bE34fdD0BeC2...` |
| `RAZORPAY_ENV` | Environment indicator (`SANDBOX` or `LIVE`) | `SANDBOX` |
| `RAZORPAY_PLAN_ID_POPULAR` | Razorpay plan ID for Popular plan | `plan_Ox8h...` |
| `RAZORPAY_PLAN_ID_ADVANCED` | Razorpay plan ID for Advanced plan | `plan_Py9i...` |

---

### Webhook Signature Validation

The server validates every incoming Razorpay webhook using HMAC-SHA256 signature verification:

```javascript
// How signature verification works (in subscription-webhook.service.js):

import crypto from 'node:crypto';

function verifySignature(headers, rawBody) {
  const signature = headers['x-razorpay-signature'];

  if (!signature) {
    throw new BadRequestError('Missing webhook signature');
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody) // Must be the raw Buffer, not parsed JSON
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  if (!isValid) {
    throw new BadRequestError('Invalid webhook signature');
  }
}
```

**Key points**:
- The `x-razorpay-signature` header contains the HMAC-SHA256 digest
- The HMAC is computed over the **raw request body bytes** (not parsed JSON)
- `crypto.timingSafeEqual()` prevents timing-based side-channel attacks
- The `rawBodyMiddleware` on the webhook route captures the raw bytes before Express parses JSON

---

### Security Recommendations for Webhook Secrets

| Recommendation | Details |
|---|---|
| **Never commit secrets to git** | Add `.env` to `.gitignore`. Use `.env.example` for the template. |
| **Use different secrets per environment** | Generate separate secrets for local, staging, and production. |
| **Minimum 32 characters** | Shorter secrets are easier to brute-force. 32+ hex chars provides 128+ bits of entropy. |
| **Rotate secrets periodically** | Regenerate and update in both Razorpay dashboard and `.env` quarterly. |
| **Don't log secrets** | Ensure `RAZORPAY_WEBHOOK_SECRET` is never printed in logs or error messages. |
| **Use environment variables, not config files** | Never hardcode secrets in source code or JSON config files. |
| **Validate signatures in production** | Never disable signature verification in production, even temporarily. |

#### Local vs Production Secret Handling

| Aspect | Local Development | Production |
|---|---|---|
| **Secret source** | `server/.env` file | Environment variables via hosting platform (e.g., Railway, AWS, Render) |
| **Secret value** | Unique per developer (generate your own) | Shared team secret, managed via secrets manager |
| **Razorpay mode** | Test Mode (`rzp_test_*` keys) | Live Mode (`rzp_live_*` keys) |
| **Webhook URL** | Hookdeck URL (`hkdk.events/...`) | Production server URL (`api.evercut.com/...`) |
| **Signature verification** | Always enabled (ensures code works correctly) | Always enabled (security requirement) |
| **Webhook dashboard** | Razorpay Test Mode → Webhooks | Razorpay Live Mode → Webhooks |

> **Important**: Test Mode and Live Mode in Razorpay are completely separate environments. Webhook secrets, API keys, plan IDs, and subscription data do NOT carry over between modes. You must configure webhooks in both modes independently.

---

### Daily Workflow with All Webhooks

**Every time you start working**, run these commands:

#### Terminal 1: Start Your Server
```bash
cd server
npm run dev
```

#### Terminal 2: Payment Webhooks (PhonePe)
```bash
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook
```

#### Terminal 3: Payout Webhooks (Cashfree)
```bash
hookdeck listen 5000 cashfree-webhooks --path /api/v1/payouts/webhook
```

#### Terminal 4: Subscription Webhooks (Razorpay)
```bash
hookdeck listen 5000 razorpay-webhooks --path /api/v1/subscriptions/webhook
```

**✅ That's it!** You're now ready to receive payment, payout, and subscription webhooks.

---

### Testing Subscription Webhooks

#### Method 1: Trigger Real Subscription Flow

1. Use the barber app or API to initiate a subscription:
   ```bash
   curl -X POST http://localhost:5000/api/v1/subscriptions/subscribe \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <barber_token>" \
     -d '{ "planId": "PLAN_POPULAR" }'
   ```

2. Complete payment via the returned checkout URL

3. Razorpay sends `subscription.activated` webhook → arrives in Terminal 4

4. Check server logs:
   ```
   [SubscriptionWebhook] Webhook received
     eventType: "subscription.activated"
     razorpaySubscriptionId: "sub_test_123"

   [LifecycleOrchestrator] Subscription activated
     barberId: "..."
     planId: "PLAN_POPULAR"
   ```

#### Method 2: Manual Test via Hookdeck Dashboard

1. Go to https://dashboard.hookdeck.io

2. Find your `razorpay-webhooks` source

3. Click **Send Test Event**

4. Use this payload:

```json
{
  "entity": "event",
  "account_id": "acc_test",
  "event": "subscription.activated",
  "contains": ["subscription", "payment"],
  "created_at": 1716278400,
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_test_HookdeckManual",
        "plan_id": "plan_test_popular",
        "customer_id": "cust_test_123",
        "status": "active",
        "current_start": 1716278400,
        "current_end": 1718870400,
        "total_count": 120,
        "paid_count": 1,
        "notes": {
          "barber_id": "683dbb8e4ca1c11ac4eb1234",
          "plan_type": "PLAN_POPULAR"
        }
      }
    },
    "payment": {
      "entity": {
        "id": "pay_test_456",
        "amount": 29900,
        "currency": "INR",
        "status": "captured",
        "method": "upi"
      }
    }
  }
}
```

5. Click **Send**

6. Check your server logs for webhook processing

> **Note**: Manually sent test events will **not** have a valid `x-razorpay-signature` header. The webhook handler will log a signature verification warning but may still return 200 to acknowledge receipt (depends on your error handling). For full end-to-end testing with valid signatures, use Method 1.

#### Method 3: Test via cURL (No Signature)

```bash
curl -X POST http://localhost:5000/api/v1/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "event",
    "event": "subscription.charged",
    "created_at": 1716278400,
    "payload": {
      "subscription": {
        "entity": {
          "id": "sub_test_curl123",
          "plan_id": "plan_test_popular",
          "status": "active",
          "current_start": 1716278400,
          "current_end": 1718870400
        }
      },
      "payment": {
        "entity": {
          "id": "pay_test_789",
          "amount": 29900,
          "currency": "INR",
          "status": "captured"
        }
      }
    }
  }'
```

> **⚠️ Warning**: Direct cURL calls bypass Hookdeck and lack a valid signature. Use this only for quick smoke tests. The webhook handler will reject unsigned requests unless you temporarily disable verification.

---

### Webhook Event Details

#### subscription.activated

**When**: First payment is successful, subscription transitions from `created` to `active`.

**Payload Example**:
```json
{
  "event": "subscription.activated",
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_KjFG8dOWkWsl0L",
        "plan_id": "plan_Ox8hXXTReQMU7S",
        "customer_id": "cust_Kj1234abcd",
        "status": "active",
        "current_start": 1716278400,
        "current_end": 1718870400,
        "total_count": 120,
        "paid_count": 1
      }
    },
    "payment": {
      "entity": {
        "id": "pay_Kj5678efgh",
        "amount": 29900,
        "currency": "INR",
        "status": "captured",
        "method": "upi"
      }
    }
  }
}
```

**What Happens**:
- ✅ Subscription status → `ACTIVE`
- ✅ Billing cycle dates set (`currentPeriodStart`, `currentPeriodEnd`)
- ✅ Transaction record created (type: `ACTIVATION`)
- ✅ Hidden media reactivated up to new plan limits

---

#### subscription.charged

**When**: Recurring monthly renewal payment is successful.

**What Happens**:
- ✅ Billing cycle dates updated to new period
- ✅ `statementsDownloadedThisPeriod` reset to 0
- ✅ Transaction record created (type: `RENEWAL`)
- ✅ Pending plan downgrade applied (if any)

---

#### subscription.halted

**When**: All payment retry attempts exhausted. Subscription can no longer charge the customer.

**What Happens**:
- ❌ Subscription reverted to Basic plan
- ❌ Excess media hidden beyond Basic limits
- ❌ Razorpay references cleared
- ❌ Transaction record created (type: `EXPIRY`)

---

#### subscription.cancelled

**When**: Subscription cancelled by barber (via API) or externally (UPI mandate revoked via banking app).

**What Happens**:
- ⚠️ `cancelAtPeriodEnd` set to `true`
- ⚠️ Barber retains plan access until `currentPeriodEnd`
- ⚠️ After period ends, expiry cron job reverts to Basic

---

#### payment.failed

**When**: A payment attempt failed (insufficient funds, UPI timeout, etc.).

**What Happens**:
- ⚠️ Logged for monitoring — no status change
- ⚠️ Razorpay automatically retries (up to configured retry count)
- ⚠️ If all retries fail → `subscription.halted` event follows

---

### Verifying Webhook Processing

#### Check Server Logs

```bash
# Webhook received and processed
[SubscriptionWebhook] Webhook received
  eventType: "subscription.activated"
  eventId: "subscription.activated_sub_test_123_1716278400"

[SubscriptionWebhook] Processing subscription.activated
  razorpaySubscriptionId: "sub_test_123"

[LifecycleOrchestrator] Subscription activated
  barberId: "683dbb8e4ca1c11ac4eb1234"
  planId: "PLAN_POPULAR"
```

#### Check Database

```javascript
// In MongoDB shell (mongosh)

// Check subscription status
db.subscriptions.findOne(
  { barberId: ObjectId("683dbb8e4ca1c11ac4eb1234") },
  { planId: 1, status: 1, currentPeriodStart: 1, currentPeriodEnd: 1 }
)

// Expected result after activation webhook
{
  planId: "PLAN_POPULAR",
  status: "ACTIVE",
  currentPeriodStart: ISODate("2026-05-21T00:00:00Z"),
  currentPeriodEnd: ISODate("2026-06-20T00:00:00Z")
}

// Check transaction history
db.subscription_transactions.find(
  { barberId: ObjectId("683dbb8e4ca1c11ac4eb1234") },
  { type: 1, fromPlan: 1, toPlan: 1, amount: 1, createdAt: 1 }
).sort({ createdAt: -1 }).limit(5)
```

#### Check Hookdeck Dashboard

1. Go to https://dashboard.hookdeck.io
2. Click on `razorpay-webhooks` source
3. See all received webhooks with:
   - Timestamp
   - Event type (`subscription.activated`, `subscription.charged`, etc.)
   - Full payload
   - Response from your server (should be `200 OK`)
   - Delivery status

---

### Troubleshooting Subscription Webhooks

#### Problem: "Missing webhook signature" in logs

**Logs show**:
```
[SubscriptionWebhook] Webhook signature verification failed
```

**Cause**: The `x-razorpay-signature` header is missing or the secret doesn't match.

**Solution**:
1. Verify `RAZORPAY_WEBHOOK_SECRET` in your `.env` matches the secret in Razorpay Dashboard → Webhooks
2. If testing via Hookdeck "Send Test Event" or cURL, this is **expected** — manual tests don't include valid signatures
3. For real signature validation, trigger an actual subscription flow via the app or API

---

#### Problem: Webhook arrives but subscription not updating

**Check**:
1. ✅ Is the `razorpaySubscriptionId` in the webhook payload matching a record in the `subscriptions` collection?
2. ✅ Is the webhook event type one that your handler processes?
3. ✅ Check server logs for specific error messages

**Solution**:
```javascript
// Check if subscription exists for the Razorpay ID
db.subscriptions.findOne({ razorpaySubscriptionId: "sub_test_123" })

// If not found, the subscription was not created locally before the webhook arrived
// This can happen if the createSubscription API call failed
```

---

#### Problem: Duplicate webhook processing

**Logs show**:
```
[SubscriptionWebhook] Duplicate webhook, skipping
  eventId: "subscription.activated_sub_test_123_1716278400"
```

**This is normal!** Razorpay may retry webhooks. The idempotency check (`webhookEventId` unique index) ensures duplicates are safely skipped.

---

#### Problem: Webhook not arriving at all

**Check**:
1. ✅ Hookdeck running in Terminal 4? Check output
2. ✅ Correct Hookdeck URL in Razorpay Dashboard → Webhooks?
3. ✅ Razorpay in correct mode (Test vs Live)?
4. ✅ Events subscribed in Razorpay Dashboard?
5. ✅ Server running on port 5000?

**Debug steps**:
- Check Hookdeck dashboard: https://dashboard.hookdeck.io — if webhooks appear here but not in your server, the issue is local forwarding
- Check Razorpay Dashboard → Webhooks → click the webhook URL → see delivery attempts and responses

---



### Quick Reference Commands

**Start all webhooks**:
```bash
# Terminal 1: Server
npm run dev

# Terminal 2: Payment webhooks
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook

# Terminal 3: Payout webhooks
hookdeck listen 5000 cashfree-webhooks --path /api/v1/payouts/webhook

# Terminal 4: Subscription webhooks
hookdeck listen 5000 razorpay-webhooks --path /api/v1/subscriptions/webhook
```

**Check webhook URLs**:
```bash
hookdeck source list
```

**View webhook history**:
- Dashboard: https://dashboard.hookdeck.io

**Test payout flow**: Trigger a payout via the server API.

**Test subscription flow**: Initiate a subscription via the barber app or API.

---

### Summary

**Three webhook types**:
1. **Payment Webhooks** (PhonePe) → `/api/v1/payments/webhook`
2. **Payout Webhooks** (Cashfree) → `/api/v1/payouts/webhook`
3. **Subscription Webhooks** (Razorpay) → `/api/v1/subscriptions/webhook`

**Three Hookdeck sources**:
1. `phonepe-webhooks` → Payment events
2. `cashfree-webhooks` → Payout events
3. `razorpay-webhooks` → Subscription events

**Four terminals needed**:
1. Server (`npm run dev`)
2. Payment webhooks (`hookdeck listen ...`)
3. Payout webhooks (`hookdeck listen ...`)
4. Subscription webhooks (`hookdeck listen ...`)

**All URLs are stable** — Configure once in PhonePe, Cashfree, and Razorpay dashboards, use forever! 🎉
