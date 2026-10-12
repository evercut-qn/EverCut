import mongoose from 'mongoose';

/**
 * Rating model.
 *
 * Changes from old schema:
 *   - `userId` → `customerId`
 *   - `advice` → `review` (clearer naming)
 *   - Unique compound index enforced (was commented out in old code)
 */
const ratingSchema = new mongoose.Schema(
    {
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            required: true,
            index: true,
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
        },
        shopId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shop',
            required: true,
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },
        review: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        reply: {
            text: {
                type: String,
                trim: true,
                maxlength: 500,
            },
            repliedAt: {
                type: Date,
            },
            repliedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        },
    },
    { timestamps: true },
);

// One rating per service booking/appointment
ratingSchema.index({ bookingId: 1 }, { unique: true });
ratingSchema.index({ shopId: 1, createdAt: -1 });
ratingSchema.index({ customerId: 1 });

const Rating = mongoose.model('Rating', ratingSchema);
export default Rating;
