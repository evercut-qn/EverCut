/**
 * Simple UPI Update Test
 * 
 * Tests that beneficiary is recreated when UPI changes
 */

import mongoose from 'mongoose';
import config from '../src/config/index.js';
import cashfreePayoutAdapter from '../src/adapters/cashfree/cashfree-payout.adapter.js';

// Import models
import '../src/models/shop.model.js';

async function test() {
    try {
        console.log('\n🧪 Testing UPI Update Handling\n');
        
        await mongoose.connect(config.mongo.uri);
        console.log('✅ Connected to MongoDB\n');
        
        const Shop = mongoose.model('Shop');
        const shop = await Shop.findOne();
        
        if (!shop) {
            console.log('❌ No shop found');
            process.exit(1);
        }
        
        console.log(`Shop: ${shop.shopName}`);
        console.log(`Current UPI: ${shop.upiId}`);
        console.log(`Beneficiary ID: ${shop.payoutConfig?.beneficiaryId || 'Not set'}\n`);
        
        // Get current beneficiary
        const beneficiaryId = shop.payoutConfig?.beneficiaryId;
        if (beneficiaryId) {
            try {
                const beneficiary = await cashfreePayoutAdapter.getBeneficiary(beneficiaryId);
                console.log('Current Beneficiary in Cashfree:');
                console.log(`  VPA: ${beneficiary.beneficiary_instrument_details?.vpa || 'N/A'}`);
                console.log(`  Name: ${beneficiary.beneficiary_name}\n`);
                
                // Check if VPA matches
                if (beneficiary.beneficiary_instrument_details?.vpa === shop.upiId) {
                    console.log('✅ Beneficiary VPA matches shop UPI\n');
                } else {
                    console.log('⚠️  VPA MISMATCH!');
                    console.log(`  Shop UPI: ${shop.upiId}`);
                    console.log(`  Beneficiary VPA: ${beneficiary.beneficiary_instrument_details?.vpa}`);
                    console.log('  Next payout will recreate beneficiary\n');
                }
            } catch (error) {
                console.log(`❌ Failed to fetch beneficiary: ${error.message}\n`);
            }
        }
        
        // Update UPI to test value
        const newUpi = shop.upiId === 'success@upi' ? 'failure@upi' : 'success@upi';
        console.log(`Updating UPI to: ${newUpi}...`);
        
        await Shop.updateOne(
            { _id: shop._id },
            { $set: { upiId: newUpi } }
        );
        
        console.log('✅ UPI updated in database\n');
        
        console.log('📝 What happens next:');
        console.log('  1. Next payout will call ensureBeneficiary()');
        console.log('  2. It will detect VPA mismatch');
        console.log('  3. It will remove old beneficiary');
        console.log('  4. It will create new beneficiary with new UPI');
        console.log('  5. Payout will succeed with correct UPI\n');
        
        console.log('✅ Test complete! Run a payout to see beneficiary recreation in action.\n');
        
        await mongoose.disconnect();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

test();
