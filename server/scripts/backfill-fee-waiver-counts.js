/**
 * One-time backfill: reconciles Customer.feeWaiverBookingsUsed for customers
 * affected by the earlier webhook crash in consumeFeeWaiverSlot().
 *
 * Before that crash was fixed, a completed payment with waiverApplied=true
 * never actually incremented the customer's counter — so customers who have
 * already completed 2+ bookings may still show feeWaiverBookingsUsed: 0,
 * causing the platform fee to incorrectly show as waived forever.
 *
 * This script counts each customer's COMPLETED payments where a waiver was
 * applied and sets feeWaiverBookingsUsed to that count (capped at quota),
 * so the fee correctly starts applying from booking 3 onward.
 *
 * Usage:
 *   node scripts/backfill-fee-waiver-counts.js            (dry run — logs only)
 *   node scripts/backfill-fee-waiver-counts.js --apply    (writes the fix)
 */
import mongoose from 'mongoose';
import config from '../src/config/index.js';
import PaymentTransaction from '../src/models/payment-transaction.model.js';
import Customer from '../src/models/customer.model.js';
import { PAYMENT_TRANSACTION_STATUS } from '../src/utils/constants.js';

const APPLY = process.argv.includes('--apply');

async function run() {
    await mongoose.connect(config.mongoUri || process.env.MONGO_URI);

    const quota = config.payment.feeWaiverQuota;

    // One completed, waiver-applied payment per customer = one used slot.
    const counts = await PaymentTransaction.aggregate([
        {
            $match: {
                status: PAYMENT_TRANSACTION_STATUS.COMPLETED,
                waiverApplied: true,
            },
        },
        {
            $group: {
                _id: '$customerId',
                actualWaiverBookingsCompleted: { $sum: 1 },
            },
        },
    ]);

    console.log(`Found ${counts.length} customers with at least one waiver-applied completed payment.`);

    let toFix = 0;
    let unchanged = 0;

    for (const row of counts) {
        const customer = await Customer.findById(row._id).select('feeWaiverBookingsUsed');
        if (!customer) continue;

        const correctCount = Math.min(row.actualWaiverBookingsCompleted, quota);
        const currentCount = customer.feeWaiverBookingsUsed || 0;

        if (currentCount >= correctCount) {
            unchanged += 1;
            continue;
        }

        toFix += 1;
        console.log(
            `Customer ${row._id}: feeWaiverBookingsUsed ${currentCount} -> ${correctCount} `
            + `(${row.actualWaiverBookingsCompleted} waiver bookings completed, quota ${quota})`,
        );

        if (APPLY) {
            await Customer.updateOne(
                { _id: row._id },
                { $set: { feeWaiverBookingsUsed: correctCount } },
            );
        }
    }

    console.log(`\n${toFix} customers need fixing, ${unchanged} already correct.`);
    console.log(APPLY ? 'Changes written.' : 'Dry run only — re-run with --apply to write changes.');

    await mongoose.disconnect();
}

run().catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
});
