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

**Every time you start working**, run these two commands:

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

#### Terminal 2: Start Hookdeck Tunnel
```bash
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook
```

**Output**:
```
phonepe-webhooks Source
🔌 Event URL: https://hkdk.events/src_abc123xyz  ← Same URL as before!
```

**✅ That's it!** You're ready to receive webhooks.

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
Terminal 1: npm run dev          (Server)
Terminal 2: hookdeck listen ...  (Tunnel)
Terminal 3: mongosh              (Database queries)
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
- [ ] Start tunnel: `hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook`
- [ ] Copy Event URL from output
- [ ] Configure PhonePe dashboard with Event URL
- [ ] Save Event URL somewhere safe

### Daily Workflow
- [ ] Start server: `npm run dev`
- [ ] Start Hookdeck: `hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook`
- [ ] Verify connection in terminal output
- [ ] Open dashboard: https://dashboard.hookdeck.io (optional)
- [ ] Start coding!

### End of Day
- [ ] Close terminals (Ctrl+C)
- [ ] That's it! URL remains valid

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
# Terminal 1
npm run dev

# Terminal 2
hookdeck listen 5000 phonepe-webhooks --path /api/v1/payments/webhook
```

**That's it!** Same URL every time, no reconfiguration needed.

**When you're done**: Just close the terminals. Everything is saved in Hookdeck cloud.

**Next time**: Run the same two commands. Your URL reconnects automatically.

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

1. Run payout batch:
```bash
node scripts/test-payout-complete.js
```

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

**To verify with real signature**: Trigger an actual payout using `node scripts/test-payout-complete.js`

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
```

**Check webhook URLs**:
```bash
hookdeck source list
```

**View webhook history**:
- Dashboard: https://dashboard.hookdeck.io

**Test payout flow**:
```bash
node scripts/test-payout-complete.js
```

---

### Summary

**Two webhook types**:
1. **Payment Webhooks** (PhonePe) → `/api/v1/payments/webhook`
2. **Payout Webhooks** (Cashfree) → `/api/v1/payouts/webhook`

**Two Hookdeck sources**:
1. `phonepe-webhooks` → Payment events
2. `cashfree-webhooks` → Payout events

**Three terminals needed**:
1. Server (`npm run dev`)
2. Payment webhooks (`hookdeck listen ...`)
3. Payout webhooks (`hookdeck listen ...`)

**Both URLs are stable** - Configure once in PhonePe and Cashfree dashboards, use forever! 🎉
