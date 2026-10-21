/**
 * seed-artwood-17329-ratings.mjs
 *
 * 1. Removes all profile pictures from all customers (sets photoMediaId: null).
 * 2. Drops the obsolete shopId_1_customerId_1 unique index if present.
 * 3. Removes previous dummy ratings for ArtWood Salon.
 * 4. Seeds exactly 17,329 ratings:
 *    - 25 written reviews across 1-5 stars with authentic comments and barber replies.
 *    - All 25 reviews mapped to the 25 proper customer profiles (Rajat Singh, Aarav Sharma, etc.).
 *    - All remaining 17,304 ratings also mapped to the 25 proper customers so ZERO "Unknown" ever appears!
 *    - Natural randomized star distribution (NOT zigzag):
 *        ★ 5 Stars: ~9,842 (56.8%)
 *        ★ 4 Stars: ~4,215 (24.3%)
 *        ★ 3 Stars: ~1,854 (10.7%)
 *        ★ 2 Stars: ~872  (5.0%)
 *        ★ 1 Star : ~546  (3.2%)
 *        Total: 17,329 ratings (Avg: ~4.27 ★)
 *    - 25 written reviews dated within the last 25 days.
 *    - Remaining ratings dated between 30 and 365 days ago.
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
    console.error('❌ MONGODB_URI missing in server/.env');
    process.exit(1);
}

const TARGET_SHOP_ID = '6acdbb5ff3d2ed8b0f15122f'; // ArtWood Salon
const TOTAL_RATINGS = 17329;

const RANDOMIZED_REVIEWS = [
    {
        rating: 5,
        review: 'Outstanding haircut and beard styling! Barber took his time with the fade and gave great styling tips. Very clean salon.',
        reply: 'Thank you so much! Really glad you loved the fade. See you next time!',
    },
    {
        rating: 3,
        review: 'Haircut was decent and well blended, but had to wait about 10 minutes even with an appointment slot.',
        reply: 'Sincere apologies for the slight delay! We are optimizing appointment buffers to prevent wait times.',
    },
    {
        rating: 1,
        review: 'Rushed the haircut and cut the sides way shorter than I requested. Disappointed with the service today.',
        reply: 'We are truly sorry to hear this. Please reach out to us directly so we can make this right on your next visit.',
    },
    {
        rating: 4,
        review: 'Really good experience. The hot towel finish was relaxing and the staff was courteous. Just slightly busy in the evening.',
        reply: 'Thanks for visiting! Evenings do get lively; slot bookings help ensure seamless service.',
    },
    {
        rating: 2,
        review: 'The fade was a bit uneven near the neckline. Expected better precision for the price, though the ambiance is nice.',
        reply: 'We appreciate the honest feedback and will ensure closer attention to precision detailing next time.',
    },
    {
        rating: 5,
        review: 'Super clean shop with great AC. The head massage after hair spa was incredible. Left feeling totally refreshed.',
        reply: 'Delighted to hear you enjoyed the massage! Looking forward to your next visit.',
    },
    {
        rating: 3,
        review: 'Average haircut. Not bad, but nothing extraordinary. Clean tools and polite barber though.',
        reply: null,
    },
    {
        rating: 4,
        review: 'Very good scissor work and neat line-up. Affordable pricing for the premium feel of the salon.',
        reply: 'Thank you! We strive to deliver premium grooming at fair rates.',
    },
    {
        rating: 2,
        review: 'Trimmer was pinching and haircut took much longer than the 30-minute booking window.',
        reply: 'Apologies for the discomfort. We have serviced all clipper blades to guarantee smooth cuts.',
    },
    {
        rating: 5,
        review: 'Hands down the best grooming parlor in the area. Great vibe, premium tools, and skilled barber.',
        reply: 'Honored by your kind words! Thank you for choosing ArtWood Salon.',
    },
    {
        rating: 1,
        review: 'Waited 20 minutes past my slot time and the haircut was not what I showed in the reference photo.',
        reply: 'We deeply regret this experience and are retraining our stylists on visual consultations. Please give us another chance.',
    },
    {
        rating: 4,
        review: 'Sharp lines and clean neck shave without razor bumps. Good recommendations for styling wax.',
        reply: null,
    },
    {
        rating: 5,
        review: 'Meticulous attention to detail! He listened carefully to what haircut style I wanted and nailed it.',
        reply: 'Thank you! Listening to our clients is always step one.',
    },
    {
        rating: 3,
        review: 'Decent salon, friendly staff, but the air conditioning was not cooling properly during the afternoon heat.',
        reply: 'Thank you for the note—the AC unit has just been fully serviced and recharged!',
    },
    {
        rating: 2,
        review: 'Beard was cut slightly asymmetrical. Had to touch it up myself at home.',
        reply: 'So sorry about the uneven trim. We would be happy to shape it up complimentary whenever you are near.',
    },
    {
        rating: 4,
        review: 'Great service. Professional stylists who know modern hair trends. Smooth booking on EverCut.',
        reply: 'Appreciate your feedback! Glad the app booking made it effortless.',
    },
    {
        rating: 5,
        review: 'Top notch service! Brought my brother here and he loved the haircut. Sanitized tools for every customer.',
        reply: 'It was a pleasure having you both! Thank you for trusting us.',
    },
    {
        rating: 1,
        review: 'Not satisfied with the trimming. The stylist seemed distracted and hurried through the cut.',
        reply: 'We take this feedback seriously and will address stylist focus immediately. Sincere apologies.',
    },
    {
        rating: 3,
        review: 'Standard trim, clean premises. Wash basin area could be a bit cleaner.',
        reply: null,
    },
    {
        rating: 4,
        review: 'Neat haircut, polite staff, reasonable pricing. Will be returning next month.',
        reply: 'Thank you! We look forward to seeing you again.',
    },
    {
        rating: 5,
        review: 'Crisp beard alignment and hot towel finish was amazing. True craftsman with shears.',
        reply: 'Thank you for the high praise! Looking forward to your next appointment.',
    },
    {
        rating: 2,
        review: 'Stylist kept pushing expensive hair treatment packages during the cut which got a bit annoying.',
        reply: 'We apologize if the recommendations felt pushy; our focus is always on your comfort.',
    },
    {
        rating: 4,
        review: 'Loved the consultation before the cut. Good understanding of wavy hair textures.',
        reply: null,
    },
    {
        rating: 1,
        review: 'Uneven sideburns and rough hair washing. Expected better based on the reviews.',
        reply: 'We sincerely apologize for the poor experience. We want to make it up to you on your next visit.',
    },
    {
        rating: 5,
        review: 'Been coming here for months now, always consistent quality, clean chairs, and warm hospitality.',
        reply: 'Thank you for being a loyal customer! Always a pleasure having you.',
    },
];

// Natural (non-zigzag) distribution for 17,329 total:
// 5★: 9,842 (56.8%)
// 4★: 4,215 (24.3%)
// 3★: 1,854 (10.7%)
// 2★: 872  (5.0%)
// 1★: 546  (3.2%)
// Sum = 17,329
const TARGET_TOTALS = {
    5: 9842,
    4: 4215,
    3: 1854,
    2: 872,
    1: 546,
};

async function main() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const shopObjectId = new mongoose.Types.ObjectId(TARGET_SHOP_ID);
    const shop = await db.collection('shops').findOne({ _id: shopObjectId });
    if (!shop) {
        console.error('❌ Shop not found:', TARGET_SHOP_ID);
        await mongoose.disconnect();
        process.exit(1);
    }

    const barber = await db.collection('barbers').findOne({ _id: shop.barberId });
    const barberUserId = barber?.userId || shop.barberId;

    // 1. Remove profile pictures from ALL customers (photoMediaId: null)
    const photoResult = await db.collection('customers').updateMany(
        { photoMediaId: { $ne: null } },
        { $set: { photoMediaId: null } }
    );
    console.log(`✅ Removed profile pictures from ${photoResult.modifiedCount} customers.`);

    // 2. Drop the obsolete unique compound index if it exists
    const indexes = await db.collection('ratings').indexes();
    const hasShopCustomerUnique = indexes.some((i) => i.name === 'shopId_1_customerId_1');
    if (hasShopCustomerUnique) {
        await db.collection('ratings').dropIndex('shopId_1_customerId_1');
        console.log('✅ Dropped obsolete unique index: shopId_1_customerId_1');
    }

    // 3. Clear existing ratings for this shop to re-seed cleanly
    const deleteResult = await db.collection('ratings').deleteMany({ shopId: shopObjectId });
    console.log(`🧹 Cleared ${deleteResult.deletedCount} existing ratings for ArtWood Salon.`);

    // Fetch all 25 customers
    const customers = await db.collection('customers').find({}).toArray();
    console.log(`Found ${customers.length} customer profiles for mapping.`);

    // 4. Generate the 25 written reviews
    const now = Date.now();
    const reviewDates = [];
    for (let i = 0; i < RANDOMIZED_REVIEWS.length; i++) {
        const daysAgo = 0.5 + i * 0.95 + Math.random() * 0.4;
        const randomHour = 9 + Math.floor(Math.random() * 11);
        const randomMinute = Math.floor(Math.random() * 60);
        const randomSecond = Math.floor(Math.random() * 60);

        const d = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        d.setHours(randomHour, randomMinute, randomSecond, 0);
        reviewDates.push(d);
    }
    reviewDates.sort((a, b) => b - a);

    const reviewRatingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    RANDOMIZED_REVIEWS.forEach((r) => { reviewRatingCounts[r.rating]++; });

    const allDocuments = [];

    for (let i = 0; i < RANDOMIZED_REVIEWS.length; i++) {
        const rev = RANDOMIZED_REVIEWS[i];
        const cust = customers[i % customers.length];
        const createdAt = reviewDates[i];

        const doc = {
            _id: new mongoose.Types.ObjectId(),
            bookingId: new mongoose.Types.ObjectId(),
            customerId: cust._id,
            shopId: shopObjectId,
            rating: rev.rating,
            review: rev.review,
            createdAt,
            updatedAt: createdAt,
            __v: 0,
        };

        if (rev.reply) {
            const repliedAt = new Date(createdAt.getTime() + (1 + Math.random() * 3) * 3600000);
            doc.reply = {
                text: rev.reply,
                repliedAt,
                repliedBy: barberUserId,
            };
        }

        allDocuments.push(doc);
    }

    // 5. Generate remaining star-only ratings
    const remainingTotals = {};
    for (let star = 1; star <= 5; star++) {
        remainingTotals[star] = TARGET_TOTALS[star] - reviewRatingCounts[star];
    }
    console.log('Star-only counts to generate:', remainingTotals);

    const starPool = [];
    for (const [starStr, count] of Object.entries(remainingTotals)) {
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

    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < starPool.length; i++) {
        const ratingVal = starPool[i];
        // Assign to one of the 25 real customers (cycling) so NO "Unknown" ever appears!
        const cust = customers[i % customers.length];
        const randomTime = oneYearAgo + Math.random() * (thirtyDaysAgo - oneYearAgo);
        const createdAt = new Date(randomTime);

        allDocuments.push({
            _id: new mongoose.Types.ObjectId(),
            bookingId: new mongoose.Types.ObjectId(),
            customerId: cust._id,
            shopId: shopObjectId,
            rating: ratingVal,
            createdAt,
            updatedAt: createdAt,
            __v: 0,
        });
    }

    console.log(`Generated ${allDocuments.length} total rating documents. Inserting into MongoDB...`);

    const BATCH_SIZE = 5000;
    let insertedTotal = 0;
    for (let i = 0; i < allDocuments.length; i += BATCH_SIZE) {
        const batch = allDocuments.slice(i, i + BATCH_SIZE);
        await db.collection('ratings').insertMany(batch, { ordered: false });
        insertedTotal += batch.length;
        process.stdout.write(`  Inserted ${insertedTotal} / ${allDocuments.length} ratings...\r`);
    }

    console.log(`\n✅ Successfully inserted ${insertedTotal} ratings into MongoDB!`);

    // 6. Verify Summary
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

    console.log('\n📊 Updated Natural Rating Summary in MongoDB:');
    console.log(JSON.stringify(
        {
            averageRating: Number(summary.averageRating.toFixed(2)),
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

main().catch((err) => {
    console.error('❌ Error executing script:', err);
    process.exit(1);
});
