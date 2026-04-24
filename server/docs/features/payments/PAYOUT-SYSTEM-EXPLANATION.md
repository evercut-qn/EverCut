# Payout System - How It Works

## Overview

The EverCut payout system automatically transfers money to barbers for completed bookings. It uses **Cashfree Payouts** to send money via UPI or bank transfer.

---

## 🔄 How Payouts Work

### Three Components

1. **Payout Batch Job** - Runs once daily at scheduled time
2. **Payout Poller** - Checks status of pending payouts every 10 minutes
3. **Payout Webhooks** - Receives real-time updates from Cashfree

---

## 📅 Payout Batch Job (Daily Scheduled)

### When Does It Run?

**Schedule**: Every day at **11:00 PM IST** (23:00 Asia/Kolkata timezone)

**Configuration** (from `server/src/config/index.js`):
```javascript
payoutBatchCronTime: '0 23 * * *',  // Cron format: minute hour * * *
payoutBatchTimezone: 'Asia/Kolkata',
```

### How It Works

```
Server Starts
    ↓
[PayoutBatchJob] Scheduling end-of-day batch payout (hour:23, minute:0)
    ↓
Checks every 1 minute if current time = 23:00 IST
    ↓
When time matches → Runs payout batch
    ↓
Finds all eligible bookings
    ↓
Groups by barber (shop owner)
    ↓
Creates one payout per barber
    ↓
Sends money via Cashfree
```

### Eligibility Criteria

A booking is eligible for payout when **ALL** of these are true:

```javascript
status: COMPLETED              // Booking is completed
paymentStatus: SUCCESS         // Customer paid successfully
payoutStatus: NOT_INITIATED    // Payout not yet started
```

**From code** (`booking.repository.js`):
```javascript
async findCompletedWithPendingPayout() {
    return Booking.find({
        status: BOOKING_STATUS.COMPLETED,
        payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
        paymentStatus: PAYMENT_STATUS.SUCCESS,
    });
}
```

### Why Your Payout Didn't Run

**Your log shows**:
```
{"level":"info","timestamp":"2026-04-24T06:18:27.482Z","message":"[PayoutBatchJob] Scheduling end-of-day batch payout","hour":23,"minute":0,"timeZone":"Asia/Kolkata"}
```

**This means**:
- ✅ Payout job is scheduled correctly
- ✅ It will run at **11:00 PM IST** (23:00)
- ❌ You started server at **6:18 AM IST** (06:18)
- ❌ Next run is at **11:00 PM tonight**

**The payout batch job does NOT run immediately on server start** - it only runs at the scheduled time (11 PM).

---

## 🔍 Payout Poller (Background Check)

### When Does It Run?

**Schedule**: Every **10 minutes** after server starts

**First run**: 30 seconds after server start  
**Subsequent runs**: Every 10 minutes

**From code** (`payout-poller.cron.js`):
```javascript
const POLL_INTERVAL_MS = 10 * 60 * 1000;  // 10 minutes

// First poll after 30 seconds
setTimeout(() => {
    pollPendingPayouts();
}, 30_000);

// Then every 10 minutes
setInterval(() => {
    pollPendingPayouts();
}, POLL_INTERVAL_MS);
```

### What It Does

Checks for "stuck" payouts that are:
- Status: `INITIATED` or `PENDING`
- Created more than 10 minutes ago
- Queries Cashfree API for current status
- Updates database with latest status

**Your log shows**:
```
{"level":"info","timestamp":"2026-04-24T06:18:57.541Z","message":"[PayoutService] Polling stuck payouts","count":0}
```

**This means**: No stuck payouts found (which is expected if no payouts were initiated yet).

---

## 📊 Payout Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ CUSTOMER COMPLETES BOOKING                                  │
│ - Booking status: COMPLETED                                 │
│ - Payment status: SUCCESS                                   │
│ - Payout status: NOT_INITIATED                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ WAIT FOR SCHEDULED TIME (11:00 PM IST)                      │
│ - Payout Batch Job checks time every minute                 │
│ - When time = 23:00 → Triggers batch                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ BATCH JOB RUNS                                              │
│ 1. Find all eligible bookings                               │
│ 2. Group by barber (shop owner)                             │
│ 3. Calculate total payout per barber                        │
│ 4. Create payout transaction                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ CASHFREE PAYOUT INITIATED                                   │
│ - Payout status: INITIATED → PENDING                        │
│ - Booking payout status: INITIATED → PENDING                │
│ - Money sent via UPI or Bank Transfer                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ CASHFREE PROCESSES TRANSFER                                 │
│ - Usually takes 1-5 minutes                                 │
│ - Sends webhook when complete                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ WEBHOOK RECEIVED (or Poller detects)                        │
│ - Payout status: SUCCESS                                    │
│ - Booking payout status: COMPLETED                          │
│ - Payment marked as settled                                 │
│ - UTR (transaction reference) saved                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🕐 Timeline Example

Let's say you tested payments **yesterday at 3:00 PM**:

| Time | Event | Payout Status |
|------|-------|---------------|
| **Yesterday 3:00 PM** | Customer completes booking & pays | `NOT_INITIATED` |
| **Yesterday 3:01 PM** | You turn off server | `NOT_INITIATED` |
| **Yesterday 11:00 PM** | ❌ Server is OFF - batch job doesn't run | `NOT_INITIATED` |
| **Today 6:18 AM** | You start server | `NOT_INITIATED` |
| **Today 6:18 AM** | Batch job schedules for 11:00 PM | `NOT_INITIATED` |
| **Today 11:00 PM** | ✅ Batch job runs - payout initiated | `PENDING` |
| **Today 11:05 PM** | Cashfree completes transfer | `COMPLETED` |

**Key Point**: The payout will happen **tonight at 11:00 PM**, not when you start the server.

---

## 🎯 Payout Statuses

### Booking Payout Status
- `NOT_INITIATED` - Eligible for payout, waiting for batch job
- `INITIATED` - Payout transaction created, sending to Cashfree
- `PENDING` - Sent to Cashfree, waiting for completion
- `COMPLETED` - Money transferred successfully
- `FAILED` - Transfer failed (can be retried)
- `REVERSED` - Transfer was reversed by bank

### Payout Transaction Status
- `INITIATED` - Created in database, about to send to Cashfree
- `PENDING` - Sent to Cashfree, waiting for processing
- `SUCCESS` - Transfer completed successfully
- `FAILED` - Transfer failed
- `REVERSED` - Transfer reversed

---

## 💰 Payout Amount Calculation

### What Barber Receives

```javascript
// From payment settlement
barberPayout = serviceAmount  // Full service amount
// Platform fee is NOT deducted from barber payout
```

**Example**:
```
Service Amount: ₹400
Platform Fee: ₹10 (paid by customer)
Total Customer Pays: ₹410

Barber Receives: ₹400 (full service amount)
Platform Keeps: ₹10
```

### Grouping by Barber

If a barber has multiple completed bookings, they are **grouped together** into one payout:

**Example**:
```
Booking 1: ₹400
Booking 2: ₹300
Booking 3: ₹250

Total Payout: ₹950 (sent as one transfer)
```

---

## 🔧 Manual Payout Trigger

### Option 1: Wait for Scheduled Time
Just wait until **11:00 PM IST** - the batch job will run automatically.

### Option 2: Trigger Manually (For Testing)

You can manually trigger a payout batch by calling the function directly:

**Create a test script** (`server/scripts/trigger-payout-now.js`):
```javascript
import { runPayoutBatchNow } from '../src/jobs/payout-batch.cron.js';
import '../src/config/database.config.js';

(async () => {
    try {
        console.log('Running payout batch manually...');
        const result = await runPayoutBatchNow();
        console.log('Payout batch complete:', result);
        process.exit(0);
    } catch (error) {
        console.error('Payout batch failed:', error);
        process.exit(1);
    }
})();
```

**Run it**:
```bash
node server/scripts/trigger-payout-now.js
```

### Option 3: Change Schedule (For Testing)

**Temporarily change the schedule** to run every minute:

**Edit `server/src/config/index.js`**:
```javascript
payment: Object.freeze({
    // Change from '0 23 * * *' to '* * * * *' (every minute)
    payoutBatchCronTime: '* * * * *',  // TESTING ONLY!
    payoutBatchTimezone: 'Asia/Kolkata',
}),
```

**⚠️ Remember to change it back after testing!**

---

## 🐛 Troubleshooting

### Problem: "No pending payouts for this cycle"

**Log**:
```
[PayoutBatchJob] No pending payouts for this cycle
```

**Possible Causes**:
1. ❌ No bookings with status `COMPLETED`
2. ❌ Bookings don't have `paymentStatus: SUCCESS`
3. ❌ Bookings already have `payoutStatus` other than `NOT_INITIATED`
4. ❌ Bookings were cancelled or refunded

**Check Database**:
```javascript
// In MongoDB shell or Compass
db.bookings.find({
    status: "completed",
    paymentStatus: "success",
    payoutStatus: "not_initiated"
})
```

### Problem: Payout initiated but stuck in PENDING

**Log**:
```
[PayoutService] Polling stuck payouts, count:1
```

**What Happens**:
- Payout Poller checks status every 10 minutes
- Queries Cashfree API for current status
- Updates database automatically

**If stuck for >30 minutes**:
- Check Cashfree dashboard
- Check if beneficiary (barber) UPI/bank details are correct
- Check Cashfree account balance

### Problem: Payout failed

**Log**:
```
[PayoutService] Payout webhook received, event:"TRANSFER_FAILED"
```

**Common Reasons**:
- Invalid UPI ID
- Invalid bank account details
- Insufficient balance in Cashfree account
- Beneficiary account blocked

**Solution**:
- Fix barber's UPI/bank details
- Use retry API to retry the payout

---

## 📝 Key Configuration

### From `server/src/config/index.js`

```javascript
payment: Object.freeze({
    // Payout schedule
    payoutBatchCronTime: '0 23 * * *',      // 11:00 PM daily
    payoutBatchTimezone: 'Asia/Kolkata',    // IST timezone
    
    // Fees
    platformFeeSingle: 3,                    // ₹3 for single service
    platformFeeBundle: 10,                   // ₹10 for bundle
    refundFeeSingle: 7,                      // ₹7 refund fee
    refundFeeBundle: 15,                     // ₹15 refund fee
    
    // Other
    minBundleServiceAmount: 300,             // Min ₹300 for bundle
}),
```

---

## 🔐 Cashfree Configuration

### Environment Variables

```env
# Cashfree Payouts
CASHFREE_PAYOUT_ENV=TEST                    # or PRODUCTION
CASHFREE_PAYOUT_CLIENT_ID=your_client_id
CASHFREE_PAYOUT_CLIENT_SECRET=your_secret
```

### Test Mode vs Production

**TEST Mode**:
- Uses sandbox API: `https://sandbox.cashfree.com/payout`
- No real money transferred
- Can test full flow

**PRODUCTION Mode**:
- Uses live API: `https://api.cashfree.com/payout`
- Real money transferred
- Requires KYC and account balance

---

## 📊 Monitoring Payouts

### Check Logs

**Batch job scheduled**:
```
[PayoutBatchJob] Scheduling end-of-day batch payout, hour:23, minute:0
```

**Batch job running**:
```
[PayoutBatchJob] Batch cycle complete, totalBookings:5, uniqueBarbers:2, success:2, failed:0
```

**Payout initiated**:
```
[PayoutService] Aggregated payout initiated, payoutId:xxx, barberId:yyy, bookingCount:3, amountInRupees:950
```

**Payout completed**:
```
[PayoutService] Payout webhook received, event:"TRANSFER_SUCCESS", transferId:xxx, status:"SUCCESS"
```

### Check Database

**Payout Transactions**:
```javascript
db.payouttransactions.find().sort({ createdAt: -1 }).limit(10)
```

**Bookings with Payout Status**:
```javascript
db.bookings.find({ payoutStatus: { $ne: "not_initiated" } })
```

---

## 🎓 Summary

### Why Your Payout Didn't Run

1. **Payout batch job only runs at scheduled time** (11:00 PM IST)
2. **It does NOT run on server start**
3. **You started server at 6:18 AM** - next run is at 11:00 PM tonight
4. **Your bookings are eligible** - they will be processed tonight

### What Happens Next

**Tonight at 11:00 PM IST**:
1. ✅ Batch job will run automatically
2. ✅ Find all completed bookings with successful payments
3. ✅ Group by barber
4. ✅ Create payout transactions
5. ✅ Send money via Cashfree
6. ✅ Update booking payout status to COMPLETED

### To Test Immediately

**Option 1**: Create manual trigger script (see above)  
**Option 2**: Change schedule to run every minute (for testing only)  
**Option 3**: Wait until 11:00 PM tonight

---

## 📚 Related Files

- **Batch Job**: `server/src/jobs/payout-batch.cron.js`
- **Poller**: `server/src/jobs/payout-poller.cron.js`
- **Service**: `server/src/services/payout.service.js`
- **Repository**: `server/src/repositories/payout.repository.js`
- **Adapter**: `server/src/adapters/cashfree/cashfree-payout.adapter.js`
- **Config**: `server/src/config/index.js`

---

## ❓ FAQ

**Q: Can I change the payout schedule?**  
A: Yes, edit `payoutBatchCronTime` in `config/index.js`. Use cron format: `minute hour * * *`

**Q: Can I trigger payouts manually?**  
A: Yes, create a script that calls `runPayoutBatchNow()` function.

**Q: What if Cashfree is in test mode?**  
A: Payouts will be simulated - no real money transferred. Check Cashfree dashboard for test transactions.

**Q: How long does a payout take?**  
A: Usually 1-5 minutes after initiation. UPI is faster than bank transfer.

**Q: What if a payout fails?**  
A: It can be retried using the retry API. Check logs for failure reason.

**Q: Can I group multiple days of bookings?**  
A: Yes, the batch job groups ALL eligible bookings (any date) by barber.

**Q: What if server is down at 11 PM?**  
A: Payouts won't run. They will run the next day at 11 PM (includes previous day's bookings).

**Q: Can I run payouts multiple times per day?**  
A: Yes, change the cron schedule. Example: `0 11,23 * * *` runs at 11 AM and 11 PM.
