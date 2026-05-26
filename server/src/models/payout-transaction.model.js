import mongoose from 'mongoose';

import config from '../config/index.js';
import {
    ALL_PAYOUT_GATEWAYS,
    ALL_PAYOUT_TRANSACTION_STATUSES,
    PAYOUT_GATEWAY,
    PAYOUT_MODES,
} from '../utils/constants.js';

const payoutTransactionSchema = new mongoose.Schema(
    {
        bookingIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Booking',
                required: true,
                index: true,
            },
        ],
        barberId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Barber',
            required: true,
            index: true,
        },
        shopId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shop',
            required: true,
        },
        paymentTransactionIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'PaymentTransaction',
                required: true,
            },
        ],
        transferId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        gatewayTransferId: {
            type: String,
            default: null,
            index: true,
        },
        beneficiaryId: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        amountInRupees: {
            type: Number,
            required: true,
        },
        transferMode: {
            type: String,
            enum: Object.values(PAYOUT_MODES),
            default: PAYOUT_MODES.UPI,
        },
        status: {
            type: String,
            enum: ALL_PAYOUT_TRANSACTION_STATUSES,
            default: 'INITIATED',
            index: true,
        },
        utr: {
            type: String,
            default: null,
        },
        processedAt: {
            type: Date,
            default: null,
        },
        failureReason: {
            type: String,
            default: null,
        },
        errorCode: {
            type: String,
            default: null,
        },
        retryCount: {
            type: Number,
            default: 0,
        },
        maxRetries: {
            type: Number,
            default: config.payout.maxRetries,
        },
        lastRetryAt: {
            type: Date,
            default: null,
        },
        webhookReceivedAt: {
            type: Date,
            default: null,
        },
        webhookProcessed: {
            type: Boolean,
            default: false,
        },
        remarks: {
            type: String,
            default: null,
        },
        gateway: {
            type: String,
            enum: ALL_PAYOUT_GATEWAYS,
            default: PAYOUT_GATEWAY.CASHFREE,
            index: true,
        },
        completedByAdminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        lastStatusUpdatedByAdminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        adminNotes: {
            type: String,
            default: null,
            maxlength: 500,
        },
    },
    {
        timestamps: true,
        collection: 'payout_transactions',
    },
);

payoutTransactionSchema.index({ status: 1, createdAt: 1 });
payoutTransactionSchema.index({ barberId: 1, status: 1 });
payoutTransactionSchema.index({ gateway: 1, status: 1, createdAt: -1 });
payoutTransactionSchema.index(
    { utr: 1 },
    {
        unique: true,
        partialFilterExpression: {
            utr: { $type: 'string' },
        },
    },
);

const PayoutTransaction = mongoose.model('PayoutTransaction', payoutTransactionSchema);
export default PayoutTransaction;
