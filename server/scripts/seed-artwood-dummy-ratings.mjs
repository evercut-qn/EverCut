/**
 * seed-artwood-dummy-ratings.mjs
 *
 * Seeds 32,561 dummy ratings for ArtWood Salon with realistic 1-5 star distribution
 * and 25 full written customer reviews (some with barber replies).
 *
 * Usage:
 *   node scripts/seed-artwood-dummy-ratings.mjs --dry-run
 *   node scripts/seed-artwood-dummy-ratings.mjs --insert
 *   node scripts/seed-artwood-dummy-ratings.mjs --shopId=6acdbb5ff3d2ed8b0f15122f --insert
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('❌ MONGODB_URI is missing in server/.env');
    process.exit(1);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || (!args.includes('--insert') && !args.includes('--force'));
const shopIdArg = args.find((a) => a.startsWith('--shopId='))?.split('=')[1];

// Default to "ArtWood Salon" (_id: 6acdbb5ff3d2ed8b0f15122f)
const TARGET_SHOP_ID = shopIdArg || '6acdbb5ff3d2ed8b0f15122f';
const TOTAL_RATINGS_TARGET = 12371;

// 25 realistic review texts and rating values
const REVIEWS_DATA = [
    {
        rating: 5,
        review: 'Best haircut experience in town! The barber was extremely meticulous with the fade and gave great styling tips.',
        reply: 'Thank you so much! Really glad you loved the fade. See you next time!',
    },
    {
        rating: 5,
        review: 'Super clean shop, great air conditioning, and top-tier hospitality. Will definitely be a regular here.',
        reply: 'Appreciate the kind words! Keeping the salon fresh and comfortable is our top priority.',
    },
    {
        rating: 5,
        review: 'Extremely polite staff. No waiting time when booking through the app. Got exactly the beard trim I asked for.',
        reply: 'Awesome! Punctual slot bookings make all the difference. Thanks for booking with EverCut!',
    },
    {
        rating: 5,
        review: 'Skill level is 10/10. He listened carefully to what haircut style I wanted and nailed it.',
        reply: null,
    },
    {
        rating: 4,
        review: 'Great ambiance and good service. Haircut turned out very sharp. Slightly busy during evening hours.',
        reply: 'Thanks for the review! Evenings can get a bit lively; booking slots in advance helps skip any wait.',
    },
    {
        rating: 5,
        review: 'Best hair spa and head massage in the area. Left the salon feeling totally relaxed.',
        reply: 'Delighted to hear you enjoyed the massage! Looking forward to your next visit.',
    },
    {
        rating: 5,
        review: 'Hands down the most professional salon around. High quality scissors, clean towels, and premium products.',
        reply: null,
    },
    {
        rating: 4,
        review: 'Very good styling and clean premises. Affordable pricing for the premium quality offered.',
        reply: 'Thank you! We strive to deliver premium grooming at fair rates.',
    },
    {
        rating: 5,
        review: 'Took my son here for a back-to-school haircut. The barber was patient, kind, and did a phenomenal job.',
        reply: 'It was a pleasure having your son over! Thank you for trusting ArtWood Salon.',
    },
    {
        rating: 5,
        review: 'Perfect skin fade! Sharp lines and clean neck shave without any razor bumps.',
        reply: null,
    },
    {
        rating: 4,
        review: 'Solid haircut and beard shape-up. Took a little longer than expected but the attention to detail was worth it.',
        reply: 'Thanks! We never rush precision work—glad you appreciated the details!',
    },
    {
        rating: 5,
        review: 'Friendly atmosphere, great background music, and genuine professionals.',
        reply: null,
    },
    {
        rating: 3,
        review: 'Decent haircut, though the stylist was a bit quiet. Clean place overall.',
        reply: 'Thank you for your feedback! We will make sure to keep you engaged and comfortable next time.',
    },
    {
        rating: 5,
        review: 'Excellent facial and grooming package. My face feels refreshed and clean.',
        reply: 'Glad you loved the treatment! Come back anytime.',
    },
    {
        rating: 5,
        review: 'Consistent every single time. Been here 4 times now and every haircut is on point.',
        reply: null,
    },
    {
        rating: 4,
        review: 'Loved the consultation before the cut. Good understanding of wavy hair textures.',
        reply: 'Hair texture consultation is key! Thank you for highlighting that.',
    },
    {
        rating: 5,
        review: '100% recommended. Sanitized tools and fresh aprons for each customer.',
        reply: null,
    },
    {
        rating: 5,
        review: 'Quick, efficient, and precise haircut. Slot lock via EverCut worked seamlessly.',
        reply: 'Appreciate your feedback! Glad EverCut booking made it smooth for you.',
    },
    {
        rating: 4,
        review: 'Really nice interior and lighting. Barber gave good recommendations for hair wax.',
        reply: null,
    },
    {
        rating: 5,
        review: 'One of the finest barbers around Chandrapur/Neri. True craftsman.',
        reply: 'Honored by your compliments! Thank you for supporting our shop.',
    },
    {
        rating: 3,
        review: 'The haircut was good, but had to wait 5 mins past appointment time due to previous client delay.',
        reply: 'Sincere apologies for the short delay! We are tightening buffer times between appointments.',
    },
    {
        rating: 5,
        review: 'Crisp beard alignment and hot towel finish was amazing.',
        reply: null,
    },
    {
        rating: 5,
        review: 'Top tier service. Modern vibe with classic barber skills.',
        reply: 'Thank you! That balance is exactly what we aim for.',
    },
    {
        rating: 4,
        review: 'Neat haircut, polite staff, reasonable pricing. Will be returning next month.',
        reply: null,
    },
    {
        rating: 5,
        review: 'Worth every rupee. Outstanding customer service from start to finish.',
        reply: 'Thank you for your support! We look forward to seeing you again.',
    },
];

// Names for mock customers to populate reviews nicely
const MOCK_CUSTOMER_NAMES = [
    { firstName: 'Aarav', lastName: 'Sharma' },
    { firstName: 'Vikram', lastName: 'Patel' },
    { firstName: 'Rohan', lastName: 'Verma' },
    { firstName: 'Sameer', lastName: 'Kulkarni' },
    { firstName: 'Aditya', lastName: 'Joshi' },
    { firstName: 'Pranav', lastName: 'Deshmukh' },
    { firstName: 'Karan', lastName: 'Malhotra' },
    { firstName: 'Nikhil', lastName: 'Pawar' },
    { firstName: 'Siddharth', lastName: 'Nair' },
    { firstName: 'Gaurav', lastName: 'Mehta' },
    { firstName: 'Harsh', lastName: 'Choudhary' },
    { firstName: 'Yash', lastName: 'Shinde' },
    { firstName: 'Tanmay', lastName: 'Bhat' },
    { firstName: 'Varun', lastName: 'Kapoor' },
    { firstName: 'Dev', lastName: 'Bansal' },
    { firstName: 'Akash', lastName: 'Tiwari' },
    { firstName: 'Sanket', lastName: 'Mane' },
    { firstName: 'Omkar', lastName: 'Patil' },
    { firstName: 'Abhishek', lastName: 'Gupta' },
    { firstName: 'Mohit', lastName: 'Rao' },
    { firstName: 'Vivek', lastName: 'Saxena' },
    { firstName: 'Kunal', lastName: 'Chopra' },
    { firstName: 'Anand', lastName: 'Iyer' },
    { firstName: 'Deepak', lastName: 'Mishra' },
    { firstName: 'Rahul', lastName: 'Kumar' },
];

async function run() {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const shopObjectId = new mongoose.Types.ObjectId(TARGET_SHOP_ID);
    const shop = await db.collection('shops').findOne({ _id: shopObjectId });
    if (!shop) {
        console.error(`❌ Shop not found for ID: ${TARGET_SHOP_ID}`);
        await mongoose.disconnect();
        process.exit(1);
    }

    console.log(`\nFound Shop: "${shop.shopName}" (${shop._id})`);
    console.log(`Address: ${shop.address}`);
    console.log(`Barber ID: ${shop.barberId}`);

    // Lookup Barber and Barber User ID
    const barber = await db.collection('barbers').findOne({ _id: shop.barberId });
    const barberUserId = barber?.userId || shop.barberId;
    console.log(`Barber User ID for replies: ${barberUserId}`);

    const existingRatingsCount = await db.collection('ratings').countDocuments({ shopId: shopObjectId });
    console.log(`Existing ratings count for this shop: ${existingRatingsCount}`);

    // Fetch existing customers
    const existingCustomers = await db.collection('customers').find({}, { limit: 25 }).toArray();
    console.log(`Existing customers available in DB: ${existingCustomers.length}`);

    // Ensure we have 25 customer IDs for our 25 reviews so they serialize with realistic names
    const customerIdsForReviews = [];
    for (let i = 0; i < 25; i++) {
        if (i < existingCustomers.length) {
            customerIdsForReviews.push(existingCustomers[i]._id);
        } else {
            const mockName = MOCK_CUSTOMER_NAMES[i] || { firstName: `Customer${i + 1}`, lastName: 'User' };
            const newCustomerId = new mongoose.Types.ObjectId();
            const newUserId = new mongoose.Types.ObjectId();
            if (!isDryRun) {
                await db.collection('users').insertOne({
                    _id: newUserId,
                    phoneNumber: '+9199' + String(10000000 + i).padStart(8, '0'),
                    email: `${mockName.firstName.toLowerCase()}.${mockName.lastName.toLowerCase()}@example.com`,
                    emailVerified: true,
                    roleType: 'CUSTOMER',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    __v: 0,
                });
                await db.collection('customers').insertOne({
                    _id: newCustomerId,
                    userId: newUserId,
                    firstName: mockName.firstName,
                    lastName: mockName.lastName,
                    gender: 'male',
                    dateOfBirth: new Date('1998-05-15'),
                    address: 'Neri, Chandrapur',
                    photoMediaId: null,
                    location: { type: 'Point', coordinates: [79.4466, 20.4677] },
                    favoriteBookings: [],
                    favoriteShops: [shopObjectId],
                    feeWaiverBookingsUsed: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    __v: 0,
                });
            }
            customerIdsForReviews.push(newCustomerId);
        }
    }

    // Realistic rating counts for remaining (12,371 - 25 = 12,346)
    // Target distribution:
    // 5-star: ~71.9% (8,900 total)
    // 4-star: ~21.0% (2,600 total)
    // 3-star: ~5.0%  (620 total)
    // 2-star: ~1.3%  (160 total)
    // 1-star: ~0.7%  (91 total)
    // Reviews portion (25 total): 5-star: 18, 4-star: 5, 3-star: 2
    const remainingCount = TOTAL_RATINGS_TARGET - REVIEWS_DATA.length; // 12,346

    const distribution = {
        5: 8882,
        4: 2595,
        3: 618,
        2: 160,
        1: 91,
    };
    const distSum = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (distSum !== remainingCount) {
        distribution[5] += remainingCount - distSum;
    }

    console.log(`\nRating Distribution Plan:`);
    console.log(`- Total Ratings: ${TOTAL_RATINGS_TARGET}`);
    console.log(`  • Written Reviews: ${REVIEWS_DATA.length} (with ${REVIEWS_DATA.filter((r) => r.reply).length} barber replies)`);
    console.log(`  • Star-only Ratings: ${remainingCount}`);
    console.log(`- Breakdown:`);
    const total5 = distribution[5] + REVIEWS_DATA.filter((r) => r.rating === 5).length;
    const total4 = distribution[4] + REVIEWS_DATA.filter((r) => r.rating === 4).length;
    const total3 = distribution[3] + REVIEWS_DATA.filter((r) => r.rating === 3).length;
    const total2 = distribution[2] + REVIEWS_DATA.filter((r) => r.rating === 2).length;
    const total1 = distribution[1] + REVIEWS_DATA.filter((r) => r.rating === 1).length;
    const expectedAvg = (total5 * 5 + total4 * 4 + total3 * 3 + total2 * 2 + total1 * 1) / TOTAL_RATINGS_TARGET;

    console.log(`  ★ 5 Stars: ${total5.toLocaleString()} (${((total5 / TOTAL_RATINGS_TARGET) * 100).toFixed(1)}%)`);
    console.log(`  ★ 4 Stars: ${total4.toLocaleString()} (${((total4 / TOTAL_RATINGS_TARGET) * 100).toFixed(1)}%)`);
    console.log(`  ★ 3 Stars: ${total3.toLocaleString()} (${((total3 / TOTAL_RATINGS_TARGET) * 100).toFixed(1)}%)`);
    console.log(`  ★ 2 Stars: ${total2.toLocaleString()} (${((total2 / TOTAL_RATINGS_TARGET) * 100).toFixed(1)}%)`);
    console.log(`  ★ 1 Star : ${total1.toLocaleString()} (${((total1 / TOTAL_RATINGS_TARGET) * 100).toFixed(1)}%)`);
    console.log(`- Projected Average Rating: ${expectedAvg.toFixed(2)} ★`);

    if (isDryRun) {
        console.log(`\n⚠️  DRY RUN MODE: No documents were inserted into MongoDB.`);
        console.log(`To perform the actual insertion, run:`);
        console.log(`  node scripts/seed-artwood-dummy-ratings.mjs --insert\n`);
        await mongoose.disconnect();
        return;
    }

    console.log(`\nPreparing ${TOTAL_RATINGS_TARGET} documents for insertion...`);

    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
    const documents = [];

    // 1. Add the 25 reviews first with the NEWEST timestamps (within the last few hours)
    for (let i = 0; i < REVIEWS_DATA.length; i++) {
        const item = REVIEWS_DATA[i];
        const createdAt = new Date(now - i * 15 * 60 * 1000); // 15 mins apart, starting from right now
        const ratingDoc = {
            _id: new mongoose.Types.ObjectId(),
            bookingId: new mongoose.Types.ObjectId(),
            customerId: customerIdsForReviews[i],
            shopId: shopObjectId,
            rating: item.rating,
            review: item.review,
            createdAt,
            updatedAt: createdAt,
            __v: 0,
        };

        if (item.reply) {
            const repliedAt = new Date(createdAt.getTime() + 5 * 60 * 1000);
            ratingDoc.reply = {
                text: item.reply,
                repliedAt,
                repliedBy: barberUserId,
            };
        }

        documents.push(ratingDoc);
    }

    // 2. Add the remaining star-only ratings with timestamps strictly in the past (before reviews)
    const starPool = [];
    for (const [starStr, count] of Object.entries(distribution)) {
        const star = Number(starStr);
        for (let i = 0; i < count; i++) {
            starPool.push(star);
        }
    }

    // Shuffle stars
    for (let i = starPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [starPool[i], starPool[j]] = [starPool[j], starPool[i]];
    }

    const pastCutoff = now - 2 * 24 * 60 * 60 * 1000; // 2 days ago
    for (let i = 0; i < starPool.length; i++) {
        const ratingVal = starPool[i];
        const randomTime = oneYearAgo + Math.random() * (pastCutoff - oneYearAgo);
        const createdAt = new Date(randomTime);

        documents.push({
            _id: new mongoose.Types.ObjectId(),
            bookingId: new mongoose.Types.ObjectId(),
            customerId: new mongoose.Types.ObjectId(), // unique to comply with shopId_1_customerId_1 index
            shopId: shopObjectId,
            rating: ratingVal,
            createdAt,
            updatedAt: createdAt,
            __v: 0,
        });
    }

    console.log(`Generated ${documents.length} rating documents. Inserting into MongoDB in batches...`);

    const BATCH_SIZE = 5000;
    let insertedTotal = 0;

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE);
        await db.collection('ratings').insertMany(batch, { ordered: false });
        insertedTotal += batch.length;
        process.stdout.write(`  Inserted ${insertedTotal} / ${documents.length} ratings...\r`);
    }

    console.log(`\n✅ Successfully inserted ${insertedTotal} ratings into MongoDB!`);

    // Run aggregate query to verify summary
    const [summary] = await db.collection('ratings').aggregate([
        { $match: { shopId: shopObjectId } },
        {
            $group: {
                _id: '$shopId',
                totalReviews: { $sum: 1 },
                averageRating: { $avg: '$rating' },
                oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
                twoStars: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                threeStars: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                fourStars: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                fiveStars: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            },
        },
    ]).toArray();

    console.log('\n📊 Updated Shop Rating Summary in DB:');
    console.log(JSON.stringify(
        {
            averageRating: Number(summary.averageRating.toFixed(1)),
            totalReviews: summary.totalReviews,
            stars: {
                1: summary.oneStar,
                2: summary.twoStars,
                3: summary.threeStars,
                4: summary.fourStars,
                5: summary.fiveStars,
            },
        },
        null,
        2
    ));

    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
}

run().catch((err) => {
    console.error('❌ Error executing script:', err);
    process.exit(1);
});
