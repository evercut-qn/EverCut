# Payout System - Testing Guide

## Overview

This guide shows you how to test the payout system end-to-end, including manual triggers for immediate testing without waiting for the scheduled time (11 PM).

---

## 🎯 Quick Test (Recommended)

### Step 1: Create Manual Trigger Script

Create `server/scripts/trigger-payout-now.js`:

```javascript
import { runPayoutBatchNow } from '../src/jobs/payout-batch.cron.js';
import mongoose from 'mongoose';
import config from '../src/config/index.js';
import logger from '../src/utils/logger.js';

(async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(config.mongo.uri);
        logger.info('Connected to MongoDB');

        // Run payout batch
        console.log('\n🚀 Running payout batch manually...\n');
        const result = await runPayoutBatchNow();
        
        console.log('\n✅ Payout batch complete:');
        console.log(`   Total Bookings: ${result.totalBookings}`);
        console.log(`   Unique Barbers: ${result.uniqueBarbers}`);
        console.log(`   Success: ${result.success}`);
        console.log(`   Failed: ${result.failed}\n`);

        // Disconnect
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Payout batch failed:', error.message);
        console.error(error);
        await mongoose.disconnect();
        process.exit(1);
    }
})();
```

### Step 2: Run the Script

```bash
cd server
node scripts/trigger-payout-now.js
```

**Expected Output**:
```
Connected to MongoDB
🚀 Running payout batch manually...

[PayoutBatchJob] Batch cycle complete
✅ Payout batch complete:
   Total Bookings: 3
   Unique Barbers: 1
   Success: 1
   Failed: 0
```

---

## 📋 Complete End-to-End Test

### Prerequisites

1. ✅ Server running (`npm run dev`)
2. ✅ MongoDB connected
3. ✅ Cashfree credentials configured (TEST mode is fine)
4. ✅ At least one completed booking with successful payment

### Test Flow

```
1. Create Booking
   ↓
2. Complete Payment
   ↓
3. Mark Booking as Completed
   ↓
4. Trigger Payout Manually
   ↓
5. Verify Payout Status
   ↓
6. Check Cashfree Dashboard
```

---

## 🧪 Step-by-Step Testing

### Step 1: Verify Prerequisites

**Check if you have eligible bookings**:

```bash
# Using MongoDB shell or Compass
mongosh

use evercut_dev

# Find eligible bookings
db.bookings.find({
    status: "completed",
    paymentStatus: "success",
    payoutStatus: "not_initiated"
}).pretty()
```

**Expected Result**: Should return at least one booking.

**If no bookings found**, create one:
1. Use Postman to create a booking
2. Initiate payment
3. Complete payment (use PhonePe sandbox)
4. Mark booking as completed (if not auto-completed)

---

### Step 2: Check Barber UPI/Bank Details

**Verify barber has payout details configured**:

```javascript
// In MongoDB
db.shops.findOne(
    { _id: ObjectId("your_shop_id") },
    { upiId: 1, payoutConfig: 1, accountHolderName: 1 }
)
```

**Expected Result**:
```javascript
{
    _id: ObjectId("..."),
    upiId: "barber@paytm",  // Should have UPI ID
    accountHolderName: "John Doe",
    payoutConfig: {
        // Optional: bank details
        bankAccount: "1234567890",
        ifsc: "SBIN0001234"
    }
}
```

**If missing**, update via API or directly in database:
```javascript
db.shops.updateOne(
    { _id: ObjectId("your_shop_id") },
    { 
        $set: { 
            upiId: "test@paytm",
            accountHolderName: "Test Barber"
        } 
    }
)
```

---

### Step 3: Run Manual Payout Trigger

**Option A: Using Script (Recommended)**

```bash
node scripts/trigger-payout-now.js
```

**Option B: Using Node REPL**

```bash
node
```

```javascript
import { runPayoutBatchNow } from './src/jobs/payout-batch.cron.js';
import mongoose from 'mongoose';
import config from './src/config/index.js';

await mongoose.connect(config.mongo.uri);
const result = await runPayoutBatchNow();
console.log(result);
await mongoose.disconnect();
```

**Option C: Temporarily Change Schedule**

Edit `server/src/config/index.js`:
```javascript
payment: Object.freeze({
    // Change to run every minute (TESTING ONLY!)
    payoutBatchCronTime: '* * * * *',  // Every minute
    payoutBatchTimezone: 'Asia/Kolkata',
}),
```

Restart server and wait 1 minute.

**⚠️ Remember to change back after testing!**

---

### Step 4: Check Server Logs

**Watch for these log messages**:

**✅ Success Logs**:
```
[PayoutBatchJob] Batch cycle complete
  totalBookings: 3
  uniqueBarbers: 1
  success: 1
  failed: 0

[PayoutService] Aggregated payout initiated
  payoutId: 69e9f8d19a40bca252b1b9b7
  barberId: 69e9ed5dbfaaa28b45493cbf
  bookingCount: 3
  amountInRupees: 950
  transferId: PAYOUT_69e9ed5dbfaaa28b45493cbf_1776941747852
```

**❌ Error Logs**:
```
[PayoutBatchJob] No pending payouts for this cycle
// Means no eligible bookings found

[PayoutBatchJob] Failed to initiate payout for barber group
  barberId: xxx
  error: "Shop has no payout destination configured"
// Means barber UPI/bank details missing

[PayoutService] Payout webhook received
  event: "TRANSFER_FAILED"
  failureReason: "INVALID_VPA"
// Means UPI ID is invalid
```

---

### Step 5: Verify Database Changes

**Check Payout Transaction Created**:

```javascript
// In MongoDB
db.payouttransactions.find().sort({ createdAt: -1 }).limit(1).pretty()
```

**Expected Result**:
```javascript
{
    _id: ObjectId("..."),
    bookingIds: [ObjectId("..."), ObjectId("...")],
    barberId: ObjectId("..."),
    shopId: ObjectId("..."),
    transferId: "PAYOUT_xxx_1776941747852",
    beneficiaryId: "BARBER_xxx",
    amount: 95000,  // in paisa (₹950)
    amountInRupees: 950,
    transferMode: "upi",
    status: "pending",  // or "initiated"
    createdAt: ISODate("2026-04-24T06:30:00.000Z")
}
```

**Check Booking Payout Status Updated**:

```javascript
db.bookings.find(
    { _id: ObjectId("your_booking_id") },
    { payoutStatus: 1, payoutTransactionId: 1 }
)
```

**Expected Result**:
```javascript
{
    _id: ObjectId("..."),
    payoutStatus: "pending",  // Changed from "not_initiated"
    payoutTransactionId: ObjectId("...")  // Linked to payout transaction
}
```

**Check Payment Settlement Status**:

```javascript
db.paymenttransactions.find(
    { bookingId: ObjectId("your_booking_id") },
    { "settlement.settled": 1, "settlement.settledAt": 1 }
)
```

**Expected Result** (after payout completes):
```javascript
{
    _id: ObjectId("..."),
    settlement: {
        settled: true,  // Will be true after payout success
        settledAt: ISODate("2026-04-24T06:35:00.000Z")
    }
}
```

---

### Step 6: Check Cashfree Dashboard

**Login to Cashfree**:
- **Test Mode**: https://sandbox.cashfree.com/merchant/payouts
- **Production**: https://merchant.cashfree.com/merchant/payouts

**Navigate to**: Payouts → Transfers

**Look for**:
- Transfer ID: `PAYOUT_xxx_1776941747852`
- Beneficiary: `BARBER_xxx`
- Amount: ₹950
- Status: `PENDING` → `SUCCESS`
- UTR: (transaction reference number)

**If in TEST mode**:
- Transfers are simulated
- Status changes automatically after a few minutes
- No real money transferred

---

### Step 7: Simulate Webhook (Optional)

If webhook is not received automatically, you can simulate it:

**Create test webhook script** (`server/scripts/test-payout-webhook.js`):

```javascript
import fetch from 'node-fetch';

const webhookPayload = {
    event: "TRANSFER_SUCCESS",
    transferId: "PAYOUT_xxx_1776941747852",  // Your actual transfer ID
    status: "SUCCESS",
    utr: "TEST123456789",
    amount: 950,
    transferMode: "upi",
    acknowledged: 1,
    processedOn: new Date().toISOString()
};

const response = await fetch('http://localhost:5000/api/v1/payouts/webhook', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': 'test-signature'  // In test mode, signature check might be lenient
    },
    body: JSON.stringify(webhookPayload)
});

console.log('Status:', response.status);
console.log('Response:', await response.json());
```

Run it:
```bash
node scripts/test-payout-webhook.js
```

---

### Step 8: Verify Final State

**Check Payout Transaction Status**:

```javascript
db.payouttransactions.findOne(
    { transferId: "PAYOUT_xxx_1776941747852" },
    { status: 1, utr: 1, processedAt: 1, webhookProcessed: 1 }
)
```

**Expected Result**:
```javascript
{
    status: "success",
    utr: "TEST123456789",
    processedAt: ISODate("2026-04-24T06:35:00.000Z"),
    webhookProcessed: true
}
```

**Check Booking Payout Status**:

```javascript
db.bookings.find(
    { payoutTransactionId: ObjectId("your_payout_id") },
    { payoutStatus: 1, payoutCompletedAt: 1, barberUtr: 1 }
)
```

**Expected Result**:
```javascript
{
    payoutStatus: "completed",
    payoutCompletedAt: ISODate("2026-04-24T06:35:00.000Z"),
    barberUtr: "TEST123456789"
}
```

**Check Payment Settlement**:

```javascript
db.paymenttransactions.find(
    { bookingId: ObjectId("your_booking_id") },
    { "settlement.settled": 1, "settlement.settledAt": 1 }
)
```

**Expected Result**:
```javascript
{
    settlement: {
        settled: true,
        settledAt: ISODate("2026-04-24T06:35:00.000Z")
    }
}
```

---

## 🧪 Test Scenarios

### Scenario 1: Single Booking Payout

**Setup**:
- 1 completed booking
- 1 barber
- Payment successful

**Expected**:
- 1 payout transaction created
- Amount = service amount (e.g., ₹400)
- Booking payout status: `not_initiated` → `pending` → `completed`

---

### Scenario 2: Multiple Bookings, Same Barber

**Setup**:
- 3 completed bookings
- Same barber (same shop)
- All payments successful

**Expected**:
- 1 payout transaction created (grouped)
- Amount = sum of all service amounts (e.g., ₹400 + ₹300 + ₹250 = ₹950)
- All 3 bookings linked to same payout transaction
- All bookings payout status updated together

---

### Scenario 3: Multiple Bookings, Different Barbers

**Setup**:
- 5 completed bookings
- 2 different barbers (2 different shops)
- All payments successful

**Expected**:
- 2 payout transactions created (one per barber)
- Barber 1: ₹700 (3 bookings)
- Barber 2: ₹500 (2 bookings)
- Each barber's bookings grouped separately

---

### Scenario 4: Payout Failure

**Setup**:
- 1 completed booking
- Barber has invalid UPI ID

**Expected**:
- Payout transaction created with status `initiated`
- Cashfree returns error: `INVALID_VPA`
- Payout status: `initiated` → `failed`
- Booking payout status: `initiated` → `failed`
- Error logged in database

**Test**:
```javascript
// Set invalid UPI ID
db.shops.updateOne(
    { _id: ObjectId("shop_id") },
    { $set: { upiId: "invalid@upi" } }
)

// Run payout
node scripts/trigger-payout-now.js

// Check result
db.payouttransactions.findOne(
    { status: "failed" },
    { failureReason: 1, errorCode: 1 }
)
```

---

### Scenario 5: Payout Retry

**Setup**:
- Previous payout failed
- Fix the issue (e.g., correct UPI ID)
- Retry payout

**Test**:
```javascript
// Fix UPI ID
db.shops.updateOne(
    { _id: ObjectId("shop_id") },
    { $set: { upiId: "correct@paytm" } }
)

// Reset booking payout status
db.bookings.updateMany(
    { payoutStatus: "failed" },
    { $set: { payoutStatus: "not_initiated" } }
)

// Run payout again
node scripts/trigger-payout-now.js
```

---

## 🔍 Troubleshooting Tests

### Problem: "No pending payouts for this cycle"

**Check**:
```javascript
// Are there eligible bookings?
db.bookings.find({
    status: "completed",
    paymentStatus: "success",
    payoutStatus: "not_initiated"
}).count()
```

**If 0**: Create a test booking or reset existing booking:
```javascript
db.bookings.updateOne(
    { _id: ObjectId("booking_id") },
    { 
        $set: { 
            status: "completed",
            paymentStatus: "success",
            payoutStatus: "not_initiated"
        } 
    }
)
```

---

### Problem: "Shop has no payout destination configured"

**Check**:
```javascript
db.shops.findOne(
    { _id: ObjectId("shop_id") },
    { upiId: 1, payoutConfig: 1 }
)
```

**Fix**:
```javascript
db.shops.updateOne(
    { _id: ObjectId("shop_id") },
    { 
        $set: { 
            upiId: "test@paytm",
            accountHolderName: "Test Barber"
        } 
    }
)
```

---

### Problem: Payout stuck in "pending"

**Check Cashfree Dashboard**:
- Login to Cashfree
- Check transfer status
- Look for error messages

**Check Payout Poller**:
```
[PayoutService] Polling stuck payouts, count:1
```

**Wait 10 minutes** - poller will check status automatically.

**Or manually check**:
```javascript
// In MongoDB, get transfer ID
const payout = db.payouttransactions.findOne({ status: "pending" })
console.log(payout.transferId)

// Check Cashfree API manually (or use dashboard)
```

---

### Problem: Webhook not received

**Check**:
1. Is webhook URL configured in Cashfree dashboard?
2. Is server publicly accessible (use ngrok/Hookdeck for local testing)?
3. Is webhook signature verification passing?

**Solution**:
- Use Payout Poller (runs every 10 minutes automatically)
- Or manually trigger webhook (see Step 7 above)

---

## 📊 Test Checklist

### Before Testing
- [ ] Server running
- [ ] MongoDB connected
- [ ] Cashfree credentials configured
- [ ] At least one completed booking with successful payment
- [ ] Barber has UPI ID or bank details configured

### During Testing
- [ ] Run manual payout trigger script
- [ ] Check server logs for success/error messages
- [ ] Verify payout transaction created in database
- [ ] Verify booking payout status updated
- [ ] Check Cashfree dashboard for transfer

### After Testing
- [ ] Payout transaction status is `success`
- [ ] Booking payout status is `completed`
- [ ] Payment settlement marked as `settled`
- [ ] UTR saved in database
- [ ] Barber can see payout in their account (if production)

---

## 🎯 Quick Verification Commands

**Check eligible bookings**:
```javascript
db.bookings.find({
    status: "completed",
    paymentStatus: "success",
    payoutStatus: "not_initiated"
}).count()
```

**Check recent payouts**:
```javascript
db.payouttransactions.find().sort({ createdAt: -1 }).limit(5)
```

**Check payout status distribution**:
```javascript
db.bookings.aggregate([
    { $group: { _id: "$payoutStatus", count: { $sum: 1 } } }
])
```

**Check failed payouts**:
```javascript
db.payouttransactions.find(
    { status: "failed" },
    { transferId: 1, failureReason: 1, errorCode: 1 }
)
```

---

## 🚀 Automated Test Script

Create `server/scripts/test-payout-flow.js`:

```javascript
import { runPayoutBatchNow } from '../src/jobs/payout-batch.cron.js';
import mongoose from 'mongoose';
import config from '../src/config/index.js';
import bookingRepository from '../src/repositories/booking.repository.js';
import payoutRepository from '../src/repositories/payout.repository.js';

(async () => {
    try {
        await mongoose.connect(config.mongo.uri);
        console.log('✅ Connected to MongoDB\n');

        // Step 1: Check eligible bookings
        console.log('📋 Step 1: Checking eligible bookings...');
        const eligibleBookings = await bookingRepository.findCompletedWithPendingPayout();
        console.log(`   Found ${eligibleBookings.length} eligible bookings\n`);

        if (eligibleBookings.length === 0) {
            console.log('❌ No eligible bookings found. Create a completed booking first.\n');
            await mongoose.disconnect();
            process.exit(1);
        }

        // Step 2: Run payout batch
        console.log('🚀 Step 2: Running payout batch...');
        const result = await runPayoutBatchNow();
        console.log(`   Total Bookings: ${result.totalBookings}`);
        console.log(`   Unique Barbers: ${result.uniqueBarbers}`);
        console.log(`   Success: ${result.success}`);
        console.log(`   Failed: ${result.failed}\n`);

        if (result.success === 0) {
            console.log('❌ No payouts succeeded. Check logs for errors.\n');
            await mongoose.disconnect();
            process.exit(1);
        }

        // Step 3: Verify payout transactions
        console.log('🔍 Step 3: Verifying payout transactions...');
        const recentPayouts = await payoutRepository.findRecent(5);
        console.log(`   Found ${recentPayouts.length} recent payouts`);
        
        for (const payout of recentPayouts) {
            console.log(`   - ${payout.transferId}: ${payout.status} (₹${payout.amountInRupees})`);
        }
        console.log();

        // Step 4: Summary
        console.log('✅ Payout test complete!\n');
        console.log('Next steps:');
        console.log('1. Check Cashfree dashboard for transfer status');
        console.log('2. Wait for webhook or payout poller to update status');
        console.log('3. Verify booking payout status changes to "completed"\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
        await mongoose.disconnect();
        process.exit(1);
    }
})();
```

Run it:
```bash
node scripts/test-payout-flow.js
```

---

## 📝 Summary

### To Test Payouts Immediately:

1. **Create manual trigger script** (see Step 1)
2. **Run the script**: `node scripts/trigger-payout-now.js`
3. **Check logs** for success/error messages
4. **Verify database** - payout transaction created, booking status updated
5. **Check Cashfree dashboard** - transfer initiated
6. **Wait for completion** - webhook or poller updates status

### Key Points:

- ✅ Manual trigger bypasses scheduled time
- ✅ Works with TEST mode Cashfree (no real money)
- ✅ Can test multiple times by resetting booking payout status
- ✅ Payout poller checks status every 10 minutes automatically
- ✅ Full end-to-end test takes 5-10 minutes

### Common Issues:

- No eligible bookings → Create completed booking with successful payment
- Missing UPI/bank details → Update shop with barber payout details
- Payout stuck in pending → Wait for poller or check Cashfree dashboard
- Webhook not received → Poller will update status automatically

---

## 📚 Related Documentation

- **Payout System Explanation**: `PAYOUT-SYSTEM-EXPLANATION.md`
- **Payment Gateway Guide**: `PAYMENT-GATEWAY-IMPLEMENTATION-GUIDE.md`
- **Webhook Testing**: `WEBHOOK-LOCAL-TESTING-GUIDE.md`
