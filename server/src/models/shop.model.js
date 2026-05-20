import mongoose from 'mongoose';
import {
    ALL_SERVICE_FOR,
    ALL_SHOP_AMENITIES,
    ALL_SHOP_CATEGORIES,
    DAYS_OF_WEEK,
} from '../utils/constants.js';

/**
 * Shop / Salon venue data.
 * Barber/person, security, and payout data live in the Barber profile.
 */
const shopSchema = new mongoose.Schema(
    {
        barberId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Barber',
            required: true,
            unique: true,
            index: true,
        },
        shopName: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            enum: ALL_SHOP_CATEGORIES,
            required: true,
        },
        targetCustomers: {
            type: String,
            enum: ALL_SERVICE_FOR,
            required: true,
        },
        bio: {
            type: String,
            default: '',
            maxlength: 500,
        },
        address: {
            type: String,
            required: true,
            trim: true,
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                required: true,
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
            },
        },
        numberOfEmployees: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
        facilities: [
            {
                type: String,
                enum: ALL_SHOP_AMENITIES,
                trim: true,
            },
        ],
        availableDays: [
            {
                type: String,
                enum: DAYS_OF_WEEK,
            },
        ],
        openTime: {
            type: String,
            required: true,
        },
        closeTime: {
            type: String,
            required: true,
        },
        breakTimes: [
            {
                start: { type: String, required: true },
                end: { type: String, required: true },
                _id: false,
            },
        ],
        coverR2Key: {
            type: String,
            default: null,
        },
        isOpen: {
            type: Boolean,
            default: true,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        missedConfirmationCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastMissedConfirmationAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------
shopSchema.index({ location: '2dsphere' });
shopSchema.index({ category: 1, targetCustomers: 1, isOpen: 1 });

// ---------------------------------------------------------------------------
// Soft-delete query middleware
// ---------------------------------------------------------------------------
shopSchema.pre(/^find/, function () {
    if (!this.getOptions()?.includeDeleted) {
        this.where({ deletedAt: null });
    }
});

const Shop = mongoose.model('Shop', shopSchema);
export default Shop;
