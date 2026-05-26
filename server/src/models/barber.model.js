import mongoose from 'mongoose';
import { ALL_GENDERS } from '../utils/constants.js';
import { UPI_ID_PATTERN } from '../utils/payout-details.utils.js';

const payoutConfigSchema = new mongoose.Schema(
    {
        beneficiaryId: {
            type: String,
            default: null,
            index: true,
        },
        beneficiaryCreatedAt: {
            type: Date,
            default: null,
        },
        verifiedAt: {
            type: Date,
            default: null,
        },
        verificationStatus: {
            type: String,
            enum: ['pending', 'verified', 'failed'],
            default: 'pending',
        },
    },
    { _id: false },
);

const barberSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true,
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        gender: {
            type: String,
            enum: ALL_GENDERS,
            required: true,
        },
        dateOfBirth: {
            type: Date,
            required: true,
        },
        yearsOfExperience: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        photoR2Key: {
            type: String,
            default: null,
        },
        upiId: {
            type: String,
            required: true,
            trim: true,
            match: [UPI_ID_PATTERN, 'upiId must be a valid UPI ID'],
        },
        accountHolderName: {
            type: String,
            default: null,
            trim: true,
        },
        bankName: {
            type: String,
            default: null,
            trim: true,
        },
        bankAccount: {
            type: String,
            default: null,
            trim: true,
        },
        ifsc: {
            type: String,
            default: null,
            uppercase: true,
            trim: true,
        },
        payoutConfig: {
            type: payoutConfigSchema,
            default: () => ({}),
        },
        pinHash: {
            type: String,
            required: true,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

barberSchema.pre(/^find/, function () {
    if (!this.getOptions()?.includeDeleted) {
        this.where({ deletedAt: null });
    }
});

const Barber = mongoose.model('Barber', barberSchema);
export default Barber;
