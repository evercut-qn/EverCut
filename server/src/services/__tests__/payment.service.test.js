import assert from 'node:assert/strict';
import test from 'node:test';

const ensureRequiredEnv = () => {
    const defaults = {
        MONGODB_URI: 'mongodb://localhost:27017/evercut-test',
        FIREBASE_PROJECT_ID: 'evercut-test',
        FIREBASE_CLIENT_EMAIL: 'firebase@example.com',
        FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
        CLOUDINARY_CLOUD_NAME: 'evercut',
        CLOUDINARY_API_KEY: 'cloudinary-key',
        CLOUDINARY_API_SECRET: 'cloudinary-secret',
        MSG91_AUTH_KEY: 'msg91-auth',
        MSG91_OTP_TEMPLATE_ID: 'msg91-template',
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        PHONEPE_CLIENT_ID: 'phonepe-client',
        PHONEPE_CLIENT_SECRET: 'phonepe-secret',
        PHONEPE_CLIENT_VERSION: '1',
        PHONEPE_MERCHANT_ID: 'merchant-id',
        PHONEPE_WEBHOOK_USERNAME: 'webhook-user',
        PHONEPE_WEBHOOK_PASSWORD: 'webhook-pass',
        CASHFREE_PAYOUT_CLIENT_ID: 'cashfree-client',
        CASHFREE_PAYOUT_CLIENT_SECRET: 'cashfree-secret',
    };

    for (const [key, value] of Object.entries(defaults)) {
        process.env[key] ??= value;
    }
};

ensureRequiredEnv();

const paymentService = await import('../payment.service.js');
const paymentRepository = (await import('../../repositories/payment.repository.js')).default;
const bookingRepository = (await import('../../repositories/booking.repository.js')).default;
const phonePeAdapter = (await import('../../adapters/phonepe/phonepe.adapter.js')).default;

test('initiateRefund deducts the refund fee and non-refundable platform fee before calling PhonePe', async (t) => {
    t.mock.method(paymentRepository, 'findCompletedByBookingId', async () => ({
        _id: 'payment-1',
        bookingId: 'booking-1',
        merchantOrderId: 'EC-booking-1',
        amount: 31900,
        amountInRupees: 319,
        status: 'completed',
        settlement: {
            isBundle: true,
            platformFee: 1000,
        },
    }));

    t.mock.method(bookingRepository, 'findById', async () => ({
        _id: 'booking-1',
        payoutStatus: 'not_initiated',
    }));

    let phonePeRefundArgs = null;
    t.mock.method(phonePeAdapter, 'initiateRefund', async (args) => {
        phonePeRefundArgs = args;
        return {
            refundId: 'refund-1',
            state: 'PENDING',
        };
    });

    const paymentUpdates = [];
    t.mock.method(paymentRepository, 'updateById', async (id, updates) => {
        paymentUpdates.push({ id, updates });
        return { _id: id, ...updates };
    });

    const bookingUpdates = [];
    t.mock.method(bookingRepository, 'updateById', async (id, updates) => {
        bookingUpdates.push({ id, updates });
        return { _id: id, ...updates };
    });

    const result = await paymentService.initiateRefund('booking-1', 'Customer cancelled before service');

    assert.deepEqual(phonePeRefundArgs, {
        merchantRefundId: phonePeRefundArgs.merchantRefundId,
        originalMerchantOrderId: 'EC-booking-1',
        amount: 29400,
    });
    assert.match(phonePeRefundArgs.merchantRefundId, /^RF-EC-booking-1-/);
    assert.equal(paymentUpdates[0].updates.refundFee, 1500);
    assert.equal(paymentUpdates[0].updates.refund.amount, 29400);
    assert.deepEqual(bookingUpdates[0], {
        id: 'booking-1',
        updates: {
            paymentStatus: 'refund_pending',
        },
    });
    assert.deepEqual(result, {
        merchantRefundId: phonePeRefundArgs.merchantRefundId,
        refundId: 'refund-1',
        state: 'PENDING',
        refundAmount: 294,
        deductions: {
            refundFee: 15,
            platformFee: 10,
        },
    });
});

test('initiateRefund blocks automatic refunds once payout has already started', async (t) => {
    t.mock.method(paymentRepository, 'findCompletedByBookingId', async () => ({
        _id: 'payment-1',
        bookingId: 'booking-1',
        merchantOrderId: 'EC-booking-1',
        amount: 10200,
        status: 'completed',
        settlement: {
            isBundle: false,
            platformFee: 300,
        },
    }));

    t.mock.method(bookingRepository, 'findById', async () => ({
        _id: 'booking-1',
        payoutStatus: 'pending',
    }));

    const gatewayMock = t.mock.method(phonePeAdapter, 'initiateRefund', async () => {
        throw new Error('should not call gateway when payout already started');
    });

    await assert.rejects(
        paymentService.initiateRefund('booking-1', 'Customer requested cancellation'),
        /Refund not allowed/,
    );

    assert.equal(gatewayMock.mock.calls.length, 0);
});
