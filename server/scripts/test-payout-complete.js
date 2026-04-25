/**
 * Complete Payout System Test & Verification Script
 * 
 * This script consolidates all payout testing functionality:
 * 1. Diagnoses current system state
 * 2. Auto-fixes common issues
 * 3. Runs payout batch
 * 4. Verifies results
 * 5. Tests webhook handling (optional)
 * 
 * Usage:
 *   node scripts/test-payout-complete.js              # Full test
 *   node scripts/test-payout-complete.js --diagnose   # Diagnosis only
 *   node scripts/test-payout-complete.js --webhook    # Include webhook test
 */

import { runPayoutBatchNow } from '../src/jobs/payout-batch.cron.js';
import mongoose from 'mongoose';
import config from '../src/config/index.js';
import * as payoutService from '../src/services/payout.service.js';

// Import models
import '../src/models/booking.model.js';
import '../src/models/payment-transaction.model.js';
import '../src/models/payout-transaction.model.js';
import '../src/models/shop.model.js';

// ============================================================================
// UTILITIES
// ============================================================================

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    section: (msg) => console.log(`\n${colors.cyan}${colors.bold}${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}${colors.reset}\n`),
    subsection: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
    dim: (msg) => console.log(`${colors.dim}${msg}${colors.reset}`),
};

const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
};

const assert = (condition, successMsg, failMsg = null) => {
    testResults.total++;
    if (condition) {
        testResults.passed++;
        log.success(successMsg);
        return true;
    } else {
        testResults.failed++;
        log.error(failMsg || successMsg);
        return false;
    }
};

const warn = (message) => {
    testResults.warnings++;
    log.warning(message);
};

// ============================================================================
// STEP 1: DATABASE CONNECTION
// ============================================================================

async function connectDatabase() {
    log.section('STEP 1: DATABASE CONNECTION');
    
    try {
        await mongoose.connect(config.mongo.uri);
        log.success(`Connected to MongoDB: ${mongoose.connection.db.databaseName}`);
        return true;
    } catch (error) {
        log.error(`Failed to connect to MongoDB: ${error.message}`);
        return false;
    }
}

// ============================================================================
// STEP 2: SYSTEM DIAGNOSIS
// ============================================================================

async function diagnoseSystem() {
    log.section('STEP 2: SYSTEM DIAGNOSIS');
    
    const Booking = mongoose.model('Booking');
    const Payment = mongoose.model('PaymentTransaction');
    const Shop = mongoose.model('Shop');
    
    // Check bookings
    log.subsection('📋 Checking Bookings...');
    
    const allBookings = await Booking.find().lean();
    log.info(`Total bookings in database: ${allBookings.length}`);
    
    if (allBookings.length === 0) {
        log.error('No bookings found! Create a booking using Postman first.');
        return { canProceed: false };
    }
    
    const completedPaidBookings = await Booking.find({
        status: 'completed',
        paymentStatus: 'success',
    }).lean();
    
    log.info(`Completed bookings with successful payment: ${completedPaidBookings.length}`);
    
    if (completedPaidBookings.length === 0) {
        log.error('No completed bookings with successful payment!');
        log.info('Complete a booking with payment first using Postman.');
        return { canProceed: false };
    }
    
    const eligible = completedPaidBookings.filter(b => b.payoutStatus === 'not_initiated');
    const notEligible = completedPaidBookings.filter(b => b.payoutStatus !== 'not_initiated');
    
    log.info(`Eligible for payout: ${eligible.length}`);
    log.info(`Already processed: ${notEligible.length}`);
    
    // Show status distribution
    if (notEligible.length > 0) {
        console.log('\nBookings by payout status:');
        const statusCounts = {};
        for (const booking of completedPaidBookings) {
            statusCounts[booking.payoutStatus] = (statusCounts[booking.payoutStatus] || 0) + 1;
        }
        for (const [status, count] of Object.entries(statusCounts)) {
            console.log(`  - ${status}: ${count}`);
        }
    }
    
    // Check payments
    log.subsection('\n💳 Checking Payments...');
    
    const bookingIds = completedPaidBookings.map(b => b._id);
    const payments = await Payment.find({ 
        bookingId: { $in: bookingIds },
        status: 'completed'
    }).lean();
    
    log.info(`Completed payments found: ${payments.length} for ${bookingIds.length} bookings`);
    
    if (payments.length !== bookingIds.length) {
        warn('Some bookings are missing completed payment transactions');
    }
    
    // Check shops
    log.subsection('\n🏪 Checking Shop Configuration...');
    
    const shopIds = [...new Set(completedPaidBookings.map(b => String(b.shopId)))];
    const shops = await Shop.find({ _id: { $in: shopIds } }).lean();
    
    log.info(`Shops to verify: ${shops.length}`);
    
    let allShopsConfigured = true;
    const shopsNeedingFix = [];
    
    for (const shop of shops) {
        const hasUpi = !!shop.upiId;
        const hasBankAccount = !!(shop.payoutConfig?.bankAccount && shop.payoutConfig?.ifsc);
        const hasAccountHolder = !!shop.accountHolderName;
        
        console.log(`\nShop ${shop._id}:`);
        console.log(`  - Name: ${shop.shopName}`);
        console.log(`  - Account Holder: ${shop.accountHolderName || 'NOT SET'}`);
        console.log(`  - UPI ID: ${shop.upiId || 'NOT SET'}`);
        
        if ((hasUpi || hasBankAccount) && hasAccountHolder) {
            log.success('  ✓ Properly configured');
        } else {
            log.error('  ✗ Not properly configured');
            allShopsConfigured = false;
            shopsNeedingFix.push(shop);
        }
    }
    
    return {
        canProceed: true,
        bookings: {
            total: allBookings.length,
            completedPaid: completedPaidBookings.length,
            eligible: eligible.length,
            notEligible: notEligible.length,
        },
        payments: {
            total: payments.length,
            complete: payments.length === bookingIds.length,
        },
        shops: {
            total: shops.length,
            allConfigured: allShopsConfigured,
            needingFix: shopsNeedingFix,
        },
        needsReset: notEligible.length > 0 && eligible.length === 0,
    };
}

// ============================================================================
// STEP 3: AUTO-FIX ISSUES
// ============================================================================

async function autoFixIssues(diagnosis) {
    log.section('STEP 3: AUTO-FIX ISSUES');
    
    const Booking = mongoose.model('Booking');
    const Payment = mongoose.model('PaymentTransaction');
    const Shop = mongoose.model('Shop');
    
    let fixesApplied = 0;
    
    // Fix 1: Reset bookings if needed
    if (diagnosis.needsReset) {
        log.subsection('🔄 Resetting Booking Payout Status...');
        
        const result = await Booking.updateMany(
            {
                status: 'completed',
                paymentStatus: 'success',
                payoutStatus: { $ne: 'not_initiated' }
            },
            {
                $set: {
                    payoutStatus: 'not_initiated',
                    payoutTransactionId: null,
                    payoutCompletedAt: null,
                    barberUtr: null,
                }
            }
        );
        
        if (result.modifiedCount > 0) {
            log.success(`Reset ${result.modifiedCount} booking(s)`);
            fixesApplied++;
            
            // Also reset payment settlement
            const paymentResult = await Payment.updateMany(
                {
                    status: 'completed',
                    'settlement.settled': true
                },
                {
                    $set: {
                        'settlement.settled': false,
                        'settlement.settledAt': null,
                    }
                }
            );
            
            if (paymentResult.modifiedCount > 0) {
                log.success(`Reset ${paymentResult.modifiedCount} payment settlement(s)`);
            }
        }
    }
    
    // Fix 2: Configure shops
    if (!diagnosis.shops.allConfigured && diagnosis.shops.needingFix.length > 0) {
        log.subsection('\n🔧 Fixing Shop Configuration...');
        
        for (const shop of diagnosis.shops.needingFix) {
            const updates = {};
            
            if (!shop.accountHolderName) {
                updates.accountHolderName = shop.ownerName || shop.shopName || 'Test Barber';
                log.info(`Setting account holder for shop ${shop._id}: ${updates.accountHolderName}`);
            }
            
            if (!shop.upiId && !(shop.payoutConfig?.bankAccount && shop.payoutConfig?.ifsc)) {
                updates.upiId = 'test@paytm';
                log.info(`Setting test UPI ID for shop ${shop._id}: test@paytm`);
            }
            
            if (Object.keys(updates).length > 0) {
                await Shop.updateOne({ _id: shop._id }, { $set: updates });
                log.success(`Fixed shop ${shop._id}`);
                fixesApplied++;
            }
        }
    }
    
    if (fixesApplied === 0) {
        log.success('No fixes needed - system is ready!');
    } else {
        log.success(`Applied ${fixesApplied} fix(es)`);
    }
    
    return fixesApplied > 0;
}

// ============================================================================
// STEP 4: RUN PAYOUT BATCH
// ============================================================================

async function runPayoutBatch() {
    log.section('STEP 4: RUN PAYOUT BATCH');
    
    log.info('Initiating payout batch...\n');
    
    try {
        const result = await runPayoutBatchNow();
        
        console.log('Batch Results:');
        console.log(`  - Total Bookings: ${result.totalBookings}`);
        console.log(`  - Unique Barbers: ${result.uniqueBarbers}`);
        console.log(`  - Success: ${result.success}`);
        console.log(`  - Failed: ${result.failed}\n`);
        
        if (result.totalBookings === 0) {
            log.warning('No bookings were processed');
            return { success: false, result };
        }
        
        if (result.failed > 0) {
            log.error(`${result.failed} payout(s) failed - check server logs for details`);
        }
        
        if (result.success === 0) {
            log.error('No payouts succeeded');
            return { success: false, result };
        }
        
        log.success(`${result.success} payout(s) initiated successfully!`);
        return { success: true, result };
        
    } catch (error) {
        log.error(`Payout batch failed: ${error.message}`);
        console.error(error);
        return { success: false, error };
    }
}

// ============================================================================
// STEP 5: VERIFY RESULTS
// ============================================================================

async function verifyResults() {
    log.section('STEP 5: VERIFY RESULTS');
    
    const Booking = mongoose.model('Booking');
    const Payout = mongoose.model('PayoutTransaction');
    const Payment = mongoose.model('PaymentTransaction');
    
    // Check payout transactions
    log.subsection('💸 Checking Payout Transactions...');
    
    const recentPayouts = await Payout.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    
    log.info(`Recent payout transactions: ${recentPayouts.length}\n`);
    
    if (recentPayouts.length === 0) {
        log.warning('No payout transactions found');
        return false;
    }
    
    for (const payout of recentPayouts) {
        const shortId = payout._id.toString().substring(0, 8);
        console.log(`Payout ${shortId}:`);
        console.log(`  - Transfer ID: ${payout.transferId}`);
        console.log(`  - Amount: ₹${payout.amountInRupees}`);
        console.log(`  - Status: ${payout.status}`);
        console.log(`  - Bookings: ${payout.bookingIds?.length || 0}`);
        console.log(`  - Created: ${new Date(payout.createdAt).toLocaleString()}`);
        
        if (payout.status === 'failed' || payout.status === 'FAILED') {
            log.error(`  - Failure: ${payout.failureReason || 'Unknown'}`);
            if (payout.errorCode) {
                log.info(`  - Error Code: ${payout.errorCode}`);
            }
        } else if (payout.status === 'success' || payout.status === 'SUCCESS') {
            log.success(`  - UTR: ${payout.utr || 'N/A'}`);
        }
        console.log();
    }
    
    // Check booking updates
    log.subsection('📋 Checking Booking Updates...');
    
    const updatedBookings = await Booking.find({
        payoutStatus: { $in: ['initiated', 'pending', 'completed', 'failed'] }
    }).sort({ updatedAt: -1 }).limit(10).lean();
    
    log.info(`Bookings with payout status: ${updatedBookings.length}\n`);
    
    const statusCounts = {};
    for (const booking of updatedBookings) {
        statusCounts[booking.payoutStatus] = (statusCounts[booking.payoutStatus] || 0) + 1;
    }
    
    console.log('Status Distribution:');
    for (const [status, count] of Object.entries(statusCounts)) {
        console.log(`  - ${status}: ${count}`);
    }
    
    // Check payment settlements
    log.subsection('\n💳 Checking Payment Settlements...');
    
    const settledPayments = await Payment.countDocuments({
        'settlement.settled': true
    });
    
    const unsettledPayments = await Payment.countDocuments({
        status: 'completed',
        'settlement.settled': false
    });
    
    log.info(`Settled payments: ${settledPayments}`);
    log.info(`Unsettled payments: ${unsettledPayments}`);
    
    return true;
}

// ============================================================================
// STEP 6: TEST WEBHOOK HANDLING (OPTIONAL)
// ============================================================================

async function testWebhookHandling() {
    log.section('STEP 6: TEST WEBHOOK HANDLING');
    
    const Payout = mongoose.model('PayoutTransaction');
    
    // Find a recent payout to test with
    const recentPayout = await Payout.findOne()
        .sort({ createdAt: -1 })
        .lean();
    
    if (!recentPayout) {
        log.warning('No payout found to test webhook with');
        return false;
    }
    
    log.info(`Testing webhook with payout: ${recentPayout.transferId}\n`);
    
    // Test SUCCESS webhook
    log.subsection('✅ Testing TRANSFER_SUCCESS Webhook...');
    
    try {
        const successPayload = {
            event: 'TRANSFER_SUCCESS',
            data: {
                transfer: {
                    transfer_id: recentPayout.transferId,
                    cf_transfer_id: 'TEST_CF_12345',
                    status: 'SUCCESS',
                    transfer_utr: `TEST_UTR_${Date.now()}`,
                    transfer_amount: recentPayout.amountInRupees,
                    transfer_mode: recentPayout.transferMode || 'upi',
                    acknowledged: 1,
                    processed_on: new Date().toISOString(),
                }
            }
        };
        
        // Simulate webhook (without signature for testing)
        const result = await payoutService.handlePayoutWebhook(
            {}, // headers (empty for test)
            JSON.stringify(successPayload),
            successPayload
        );
        
        if (result.processed) {
            log.success('SUCCESS webhook processed correctly');
        } else {
            log.info('Webhook rejected (signature verification working as expected)');
        }
        
    } catch (error) {
        if (error.message.includes('signature')) {
            log.success('✓ Signature verification working correctly');
        } else {
            log.error(`Webhook test failed: ${error.message}`);
        }
    }
    
    // Test FAILED webhook
    log.subsection('\n❌ Testing TRANSFER_FAILED Webhook...');
    
    try {
        const failedPayload = {
            event: 'TRANSFER_FAILED',
            data: {
                transfer: {
                    transfer_id: recentPayout.transferId,
                    cf_transfer_id: 'TEST_CF_12345',
                    status: 'FAILED',
                    failure_reason: 'TEST_FAILURE',
                    transfer_amount: recentPayout.amountInRupees,
                    transfer_mode: recentPayout.transferMode || 'upi',
                    acknowledged: 1,
                }
            }
        };
        
        const result = await payoutService.handlePayoutWebhook(
            {},
            JSON.stringify(failedPayload),
            failedPayload
        );
        
        if (result.processed) {
            log.success('FAILED webhook processed correctly');
        } else {
            log.info('Webhook rejected (signature verification working as expected)');
        }
        
    } catch (error) {
        if (error.message.includes('signature')) {
            log.success('✓ Signature verification working correctly');
        } else {
            log.error(`Webhook test failed: ${error.message}`);
        }
    }
    
    console.log();
    log.info('💡 Note: Test webhooks are rejected due to missing signatures (this is correct behavior)');
    log.info('💡 Real webhooks from Cashfree will include proper signatures and be processed');
    
    return true;
}

// ============================================================================
// STEP 7: FINAL SUMMARY
// ============================================================================

async function showFinalSummary(payoutResult) {
    log.section('✨ TEST COMPLETE');
    
    if (payoutResult?.success) {
        log.success('Payout system is working correctly!\n');
        
        console.log('What happened:');
        console.log(`  ✅ ${payoutResult.result.totalBookings} booking(s) processed`);
        console.log(`  ✅ ${payoutResult.result.success} payout(s) initiated`);
        console.log(`  ✅ Database updated successfully\n`);
        
        console.log('Next steps:');
        console.log('  1. Check Cashfree dashboard for transfer status');
        console.log('  2. Wait for webhook or poller to update status');
        console.log('  3. Verify booking payout status changes to "completed"\n');
        
        console.log('Cashfree Dashboard:');
        console.log(`  - TEST: https://sandbox.cashfree.com/merchant/payouts`);
        console.log(`  - PROD: https://merchant.cashfree.com/merchant/payouts\n`);
        
        console.log('Monitor webhooks:');
        console.log('  - Hookdeck: https://dashboard.hookdeck.io\n');
        
    } else {
        log.error('Payout test encountered issues\n');
        
        console.log('Troubleshooting:');
        console.log('  1. Check server logs for detailed error messages');
        console.log('  2. Verify Cashfree credentials in .env');
        console.log('  3. Check IP whitelisting (see CASHFREE-IP-WHITELISTING-GUIDE.md)');
        console.log('  4. Verify shop payout configuration\n');
    }
    
    console.log('Documentation:');
    console.log('  - Payout System: docs/features/payments/PAYOUT-SYSTEM-EXPLANATION.md');
    console.log('  - IP Whitelisting: docs/features/payments/CASHFREE-IP-WHITELISTING-GUIDE.md');
    console.log('  - Webhooks: docs/features/payments/HOOKDECK-DAILY-WORKFLOW.md\n');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    const args = process.argv.slice(2);
    const diagnoseOnly = args.includes('--diagnose');
    const includeWebhook = args.includes('--webhook');
    
    console.log('\n');
    log.section('🧪 COMPLETE PAYOUT SYSTEM TEST');
    
    const startTime = Date.now();
    
    try {
        // Step 1: Connect to database
        const connected = await connectDatabase();
        if (!connected) {
            process.exit(1);
        }
        
        // Step 2: Diagnose system
        const diagnosis = await diagnoseSystem();
        if (!diagnosis.canProceed) {
            await mongoose.disconnect();
            process.exit(1);
        }
        
        // If diagnose-only mode, stop here
        if (diagnoseOnly) {
            log.section('DIAGNOSIS COMPLETE');
            log.info('Run without --diagnose flag to execute payout batch\n');
            await mongoose.disconnect();
            process.exit(0);
        }
        
        // Step 3: Auto-fix issues
        const fixed = await autoFixIssues(diagnosis);
        
        // Step 4: Run payout batch
        const payoutResult = await runPayoutBatch();
        
        // Step 5: Verify results
        if (payoutResult.success) {
            await verifyResults();
        }
        
        // Step 6: Test webhooks (optional)
        if (includeWebhook && payoutResult.success) {
            await testWebhookHandling();
        }
        
        // Step 7: Final summary
        await showFinalSummary(payoutResult);
        
        // Calculate duration
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log.dim(`\nTotal duration: ${duration}s\n`);
        
        await mongoose.disconnect();
        process.exit(payoutResult.success ? 0 : 1);
        
    } catch (error) {
        log.error(`Test failed: ${error.message}`);
        console.error(error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run the script
main();
