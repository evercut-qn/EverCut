import mongoose from 'mongoose';
import {
    ALL_SUBSCRIPTION_PLANS,
    ALL_SUBSCRIPTION_STATUSES,
    SUBSCRIPTION_PLANS,
    SUBSCRIPTION_STATUSES,
} from '../utils/constants.js';

const { Schema, model, SchemaTypes } = mongoose;

const subscriptionSchema = new Schema(
    {
        barberId: {
            type: SchemaTypes.ObjectId,
            ref: 'Barber',
            required: true,
            unique: true,
            index: true,
        },
        planId: {
            type: String,
            enum: ALL_SUBSCRIPTION_PLANS,
            required: true,
            default: SUBSCRIPTION_PLANS.BASIC,
        },
        status: {
            type: String,
            enum: ALL_SUBSCRIPTION_STATUSES,
            required: true,
            default: SUBSCRIPTION_STATUSES.ACTIVE,
            index: true,
        },
        razorpaySubscriptionId: {
            type: String,
            default: null,
        },
        razorpayCustomerId: {
            type: String,
            default: null,
        },
        currentPeriodStart: {
            type: Date,
            default: null,
        },
        currentPeriodEnd: {
            type: Date,
            default: null,
            index: true,
        },
        lastRenewalAt: {
            type: Date,
            default: null,
        },
        cancelAtPeriodEnd: {
            type: Boolean,
            default: false,
        },
        cancelledAt: {
            type: Date,
            default: null,
        },
        pendingPlanId: {
            type: String,
            enum: [...ALL_SUBSCRIPTION_PLANS, null],
            default: null,
        },
        totalPhotosUploaded: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalVideosUploaded: {
            type: Number,
            default: 0,
            min: 0,
        },
        statementsDownloadedThisPeriod: {
            type: Number,
            default: 0,
            min: 0,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
        collection: 'subscriptions',
        optimisticConcurrency: true,
    },
);

subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 }, { name: 'idx_subscription_status_period_end' });
subscriptionSchema.index(
    { razorpaySubscriptionId: 1 },
    {
        unique: true,
        name: 'idx_subscription_razorpay_id',
        partialFilterExpression: { razorpaySubscriptionId: { $type: 'string' } },
    },
);

subscriptionSchema.methods.isEntitled = function isEntitled() {
    const activeStatuses = [
        SUBSCRIPTION_STATUSES.ACTIVE,
        SUBSCRIPTION_STATUSES.CANCELLED,
        SUBSCRIPTION_STATUSES.PAST_DUE,
        SUBSCRIPTION_STATUSES.PAUSED,
    ];

    if (!activeStatuses.includes(this.status)) return false;
    if (this.status === SUBSCRIPTION_STATUSES.CANCELLED && this.currentPeriodEnd) {
        return Date.now() < new Date(this.currentPeriodEnd).getTime();
    }
    return true;
};

subscriptionSchema.methods.isPaid = function isPaid() {
    return this.planId !== SUBSCRIPTION_PLANS.BASIC;
};

subscriptionSchema.statics.findByBarberId = function findByBarberId(barberId) {
    return this.findOne({ barberId });
};

const Subscription = model('Subscription', subscriptionSchema);

export default Subscription;
