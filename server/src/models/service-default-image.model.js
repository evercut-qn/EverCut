import mongoose from 'mongoose';

const serviceDefaultImageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        serviceType: {
            type: String,
            enum: ['single', 'bundled'],
            required: true,
            index: true,
        },
        serviceFor: {
            type: String,
            enum: ['male', 'female', 'unisex'],
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
