import { runPayoutBatchNow } from '../src/jobs/payout-batch.cron.js';
import mongoose from 'mongoose';
import config from '../src/config/index.js';
import logger from '../src/utils/logger.js';

(async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(config.mongo.uri);
        logger.info('Connected to MongoDB for manual payout trigger');

        // Run payout batch
        console.log('\n🚀 Running payout batch manually...\n');
        const result = await runPayoutBatchNow();
        
        console.log('\n✅ Payout batch complete:');
        console.log(`   Total Bookings: ${result.totalBookings}`);
        console.log(`   Unique Barbers: ${result.uniqueBarbers}`);
        console.log(`   Success: ${result.success}`);
        console.log(`   Failed: ${result.failed}\n`);

        if (result.totalBookings === 0) {
            console.log('ℹ️  No eligible bookings found.');
            console.log('   Make sure you have bookings with:');
            console.log('   - status: completed');
            console.log('   - paymentStatus: success');
            console.log('   - payoutStatus: not_initiated\n');
        }

        if (result.failed > 0) {
            console.log('⚠️  Some payouts failed. Check server logs for details.\n');
        }

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
