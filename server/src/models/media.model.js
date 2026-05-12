import mongoose from 'mongoose';
import {
    ALL_GALLERY_CATEGORIES,
    ALL_MEDIA_ENTITY_TYPES,
    ALL_MEDIA_PURPOSES,
    ALL_MEDIA_STATUSES,
    ALL_MEDIA_TYPES,
    MEDIA_STATUS,
} from '../utils/constants.js';

const mediaSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ALL_MEDIA_TYPES,
            required: true,
        },
        status: {
            type: String,
            enum: ALL_MEDIA_STATUSES,
            default: MEDIA_STATUS.PENDING,
            required: true,
        },
        purpose: {
            type: String,
            enum: ALL_MEDIA_PURPOSES,
            required: true,
        },
        r2Key: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        r2Bucket: {
            type: String,
            required: true,
        },
        contentType: {
            type: String,
            required: true,
        },
        declaredSize: {
            type: Number,
            required: true,
            min: 1,
        },
        actualSize: {
            type: Number,
            default: null,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
        },
        entityType: {
            type: String,
            enum: ALL_MEDIA_ENTITY_TYPES,
            default: null,
        },
        metadata: {
            category: {
                type: String,
                enum: [...ALL_GALLERY_CATEGORIES, null],
                default: null,
            },
            description: {
                type: String,
                maxlength: 500,
                default: null,
            },
            originalName: {
                type: String,
                default: null,
            },
            _id: false,
        },
        durationSeconds: { type: Number, default: null },
        multipartUploadId: { type: String, default: null },
        hlsR2Prefix: { type: String, default: null },
        thumbnailR2Key: { type: String, default: null },
        uploadExpiresAt: {
            type: Date,
            required: true,
        },
        confirmedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

mediaSchema.index({ entityId: 1, entityType: 1, status: 1 });
mediaSchema.index({ userId: 1, status: 1 });
mediaSchema.index({ status: 1, createdAt: 1 });
mediaSchema.index(
    { uploadExpiresAt: 1 },
    {
        expireAfterSeconds: 0,
        partialFilterExpression: { status: MEDIA_STATUS.PENDING },
    },
);

mediaSchema.statics.countByEntity = function (entityId, entityType, extraFilter = {}) {
    return this.countDocuments({
        entityId,
        entityType,
        status: MEDIA_STATUS.READY,
        ...extraFilter,
    });
};

const Media = mongoose.model('Media', mediaSchema);
export default Media;
