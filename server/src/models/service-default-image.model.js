import mongoose from 'mongoose';
import { ALL_SERVICE_FOR } from '../utils/constants.js';

const serviceDefaultImageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        categoryId: {
            type: String,
            required: true,
            index: true,
        },
        serviceType: {
            type: String,
            enum: ['single', 'bundled'],
            required: true,
            index: true,
        },
        serviceFor: {
            type: String,
            enum: ALL_SERVICE_FOR,
            required: true,
            index: true,
        },
        r2Key: {
            type: String,
            required: true,
        },
        keywords: {
            type: [String],
            default: [],
        },
        isFallback: {
            type: Boolean,
            default: false,
            index: true,
        },
        isGlobalDefault: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: 'service_default_images',
    },
);

// Text index for keyword-based search optimization
serviceDefaultImageSchema.index({ keywords: 'text' });

const ServiceDefaultImage = mongoose.model('ServiceDefaultImage', serviceDefaultImageSchema);

export default ServiceDefaultImage;
