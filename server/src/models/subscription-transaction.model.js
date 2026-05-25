import mongoose from 'mongoose';
import {
    ALL_SUBSCRIPTION_PLANS,
    ALL_SUBSCRIPTION_TRANSACTION_STATUSES,
    ALL_SUBSCRIPTION_TRANSACTION_TYPES,
    SUBSCRIPTION_TRANSACTION_STATUSES,
} from '../utils/constants.js';

const { Schema, model, SchemaTypes } = mongoose;

const subscriptionTransactionSchema = new Schema(
    {
        subscriptionId: {
            type: SchemaTypes.ObjectId,
            ref: 'Subscription',
            required: true,
            index: true,
        },
        barberId: {
            type: SchemaTypes.ObjectId,
            ref: 'Barber',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ALL_SUBSCRIPTION_TRANSACTION_TYPES,
            required: true,
        },
        source: {
            type: String,
            enum: ['WEBHOOK', 'API', 'CRON', 'RECONCILIATION', 'MIGRATION'],
            required: true,
            default: 'WEBHOOK',
        },
        fromPlan: {
            type: String,
            enum: [...ALL_SUBSCRIPTION_PLANS, null],
            default: null,
        },
        toPlan: {
            type: String,
            enum: ALL_SUBSCRIPTION_PLANS,
            required: true,
        },
        amount: {
            type: Number,
            default: 0,
            min: 0,
        },
        currency: {
            type: String,
            default: 'INR',
        },
        razorpayPaymentId: {
            type: String,
            default: null,
        },
        razorpayInvoiceId: {
            type: String,
            default: null,
        },
        webhookEventId: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ALL_SUBSCRIPTION_TRANSACTION_STATUSES,
            required: true,
            default: SUBSCRIPTION_TRANSACTION_STATUSES.COMPLETED,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
        collection: 'subscription_transactions',
    },
);

subscriptionTransactionSchema.index(
    { webhookEventId: 1 },
    {
        unique: true,
        name: 'idx_subscription_webhook_event_id',
        partialFilterExpression: { webhookEventId: { $type: 'string' } },
    },
);
subscriptionTransactionSchema.index(
    { subscriptionId: 1, type: 1, createdAt: -1 },
    { name: 'idx_subscription_transaction_type_created' },
);
subscriptionTransactionSchema.index(
    { barberId: 1, createdAt: -1 },
    { name: 'idx_subscription_transaction_barber_created' },
);

const SubscriptionTransaction = model('SubscriptionTransaction', subscriptionTransactionSchema);

export default SubscriptionTransaction;
