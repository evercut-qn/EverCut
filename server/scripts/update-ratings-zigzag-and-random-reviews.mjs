/**
 * update-ratings-zigzag-and-random-reviews.mjs
 *
 * Updates ArtWood Salon ratings to:
 * 1. Randomize ratings of the 25 written reviews across 1-5 stars with matching review text and replies.
 * 2. Randomize dates of the 25 written reviews across the past 25 days with random times of day.
 * 3. Restructure the 12,371 ratings distribution into an explicit ZIGZAG pattern:
 *      ★ 1 Star : 2,400 (High)
 *      ★ 2 Stars: 1,250 (Low)
 *      ★ 3 Stars: 3,600 (Peak)
 *      ★ 4 Stars: 1,600 (Low)
 *      ★ 5 Stars: 3,521 (Peak)
 *    Total: 12,371 ratings
 * 4. Keep all 12,346 star-only ratings dated strictly older (30 to 365 days ago) so
 *    the 25 written reviews always stay on top when sorted by createdAt desc.
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

// 25 diverse reviews across 1 to 5 stars
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

// Target ZIGZAG distribution totals (total: 12,371)
// 1★: 2,400 (High)
// 2★: 1,250 (Low)
// 3★: 3,600 (High)
// 4★: 1,600 (Low)
// 5★: 3,521 (High)
const ZIGZAG_TOTALS = {
    1: 2400,
    2: 1250,
    3: 3600,
    4: 1600,
    5: 3521,
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

    const customers = await db.collection('customers').find({}).toArray();
    console.log(`Found ${customers.length} customer profiles.`);

    // 1. Fetch the 25 written reviews
    const existingReviews = await db.collection('ratings').find({
        shopId: shopObjectId,
        review: { $exists: true, $ne: '' }
    }).toArray();

    console.log(`Found ${existingReviews.length} existing written reviews in DB.`);

    // Calculate dates for 25 reviews spread randomly over the past 25 days
    const now = Date.now();
    const reviewDates = [];
    for (let i = 0; i < 25; i++) {
        // Between (i * 0.9) and ((i + 1) * 0.95) days ago, plus random hour/minute
        const daysAgo = 0.5 + i * 0.95 + Math.random() * 0.4;
        const randomHour = 9 + Math.floor(Math.random() * 11); // 9 AM to 8 PM
        const randomMinute = Math.floor(Math.random() * 60);
        const randomSecond = Math.floor(Math.random() * 60);

        const d = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        d.setHours(randomHour, randomMinute, randomSecond, 0);
        reviewDates.push(d);
    }
    // Sort dates descending so review #0 is newest
    reviewDates.sort((a, b) => b - a);

    // Count ratings among the 25 reviews
    const reviewRatingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    RANDOMIZED_REVIEWS.forEach((r) => { reviewRatingCounts[r.rating]++; });
    console.log('25 Reviews Rating Counts:', reviewRatingCounts);

    // Update each of the 25 reviews
    for (let i = 0; i < existingReviews.length; i++) {
        const revDoc = existingReviews[i];
        const newSpec = RANDOMIZED_REVIEWS[i];
        const cust = customers[i % customers.length];
        const createdAt = reviewDates[i];

        const updateData = {
            rating: newSpec.rating,
            review: newSpec.review,
            customerId: cust._id,
            createdAt,
            updatedAt: createdAt,
        };

        const updateDoc = {};
        if (newSpec.reply) {
            // Replied 1 to 4 hours later
            const repliedAt = new Date(createdAt.getTime() + (1 + Math.random() * 3) * 3600000);
            updateData.reply = {
                text: newSpec.reply,
                repliedAt,
                repliedBy: barberUserId,
            };
            updateDoc.$set = updateData;
        } else {
            delete updateData.reply;
            updateDoc.$set = updateData;
            updateDoc.$unset = { reply: '' };
        }

        await db.collection('ratings').updateOne(
            { _id: revDoc._id },
            updateDoc
        );
    }
    console.log('✅ Updated all 25 written reviews with random ratings, text, and dates.');

    // 2. Compute remaining counts for star-only ratings to form the exact ZIGZAG
    const remainingStarCounts = {};
    for (let star = 1; star <= 5; star++) {
        remainingStarCounts[star] = ZIGZAG_TOTALS[star] - reviewRatingCounts[star];
    }
    console.log('Remaining star-only ratings to distribute:', remainingStarCounts);

    // Build star pool
    const starPool = [];
    for (const [starStr, count] of Object.entries(remainingStarCounts)) {
        const star = Number(starStr);
        for (let i = 0; i < count; i++) {
            starPool.push(star);
        }
    }

    // Shuffle pool
    for (let i = starPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [starPool[i], starPool[j]] = [starPool[j], starPool[i]];
    }

    // 3. Update all star-only ratings in batches
    console.log(`Updating ${starPool.length} star-only ratings to match zigzag distribution...`);
    const starCursor = db.collection('ratings').find({
        shopId: shopObjectId,
        $or: [{ review: { $exists: false } }, { review: '' }, { review: null }]
    });

    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const BATCH_SIZE = 2500;
    let bulkOps = [];
    let updatedCount = 0;
    let poolIndex = 0;

    while (await starCursor.hasNext()) {
        const doc = await starCursor.next();
        const ratingVal = starPool[poolIndex % starPool.length];
        poolIndex++;

        // Random date between 1 year ago and 30 days ago (strictly older than reviews)
        const randomTime = oneYearAgo + Math.random() * (thirtyDaysAgo - oneYearAgo);
        const createdAt = new Date(randomTime);

        bulkOps.push({
            updateOne: {
                filter: { _id: doc._id },
                update: {
                    $set: {
                        rating: ratingVal,
                        createdAt,
                        updatedAt: createdAt
                    }
                }
            }
        });

        if (bulkOps.length >= BATCH_SIZE) {
            await db.collection('ratings').bulkWrite(bulkOps);
            updatedCount += bulkOps.length;
            process.stdout.write(`  Updated ${updatedCount} / ${starPool.length} ratings...\r`);
            bulkOps = [];
        }
    }

    if (bulkOps.length > 0) {
        await db.collection('ratings').bulkWrite(bulkOps);
        updatedCount += bulkOps.length;
    }
    console.log(`\n✅ Finished updating ${updatedCount} star-only ratings.`);

    // 4. Verify Final Summary in MongoDB
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

    console.log('\n📊 Final ZIGZAG Summary in MongoDB:');
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
    console.error('❌ Error executing update script:', err);
    process.exit(1);
});
