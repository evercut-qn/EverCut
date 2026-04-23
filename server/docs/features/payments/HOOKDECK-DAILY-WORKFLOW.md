# Hookdeck Daily Workflow Guide

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
