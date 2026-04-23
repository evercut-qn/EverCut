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
const shopRepository = (await import('../../repositories/shop.repository.js')).default;
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
    assert.ok(phonePeRefundArgs.merchantRefundId.length <= 63);
    assert.match(phonePeRefundArgs.merchantRefundId, /^RF-[a-f0-9]{24}-[a-f0-9]{12}$/);
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
        refundType: 'cancellation',
        deductions: {
            refundFee: 15,
            platformFee: 10,
        },
    });
});

test('initiateRefund generates PhonePe-safe merchant refund ids under 63 characters', async (t) => {
    const longMerchantOrderId = 'EC-69e9f8d19a40bca252b1b9b7-1776941837220-95fa2463';

    t.mock.method(paymentRepository, 'findCompletedByBookingId', async () => ({
        _id: 'payment-1',
        bookingId: '69e9f8d19a40bca252b1b9b7',
        merchantOrderId: longMerchantOrderId,
        amount: 10200,
        status: 'completed',
        settlement: {
            serviceAmount: 9900,
            platformFee: 300,
            isBundle: false,
        },
    }));

    t.mock.method(bookingRepository, 'findById', async () => ({
        _id: '69e9f8d19a40bca252b1b9b7',
        totalAmount: 99,
        payoutStatus: 'not_initiated',
    }));

    let merchantRefundId = null;
    t.mock.method(phonePeAdapter, 'initiateRefund', async (args) => {
        merchantRefundId = args.merchantRefundId;
        return {
            refundId: 'refund-1',
            state: 'PENDING',
        };
    });

    t.mock.method(paymentRepository, 'updateById', async (id, updates) => ({ _id: id, ...updates }));
    t.mock.method(bookingRepository, 'updateById', async (id, updates) => ({ _id: id, ...updates }));

    await paymentService.initiateRefund('69e9f8d19a40bca252b1b9b7', 'Customer cancelled before service');

    assert.ok(merchantRefundId.length <= 63);
    assert.match(merchantRefundId, /^RF-[a-f0-9]{24}-[a-f0-9]{12}$/);
});

test('initiateRefund records provider refund initiation failures for manual follow-up', async (t) => {
    t.mock.method(paymentRepository, 'findCompletedByBookingId', async () => ({
        _id: 'payment-1',
        bookingId: 'booking-1',
        merchantOrderId: 'EC-booking-1',
        amount: 10200,
        status: 'completed',
        settlement: {
            serviceAmount: 9900,
            platformFee: 300,
            isBundle: false,
        },
    }));

    t.mock.method(bookingRepository, 'findById', async () => ({
        _id: 'booking-1',
        totalAmount: 99,
        payoutStatus: 'not_initiated',
    }));

    t.mock.method(phonePeAdapter, 'initiateRefund', async () => {
        throw new Error('PhonePe refund sandbox failure');
    });

    let paymentUpdate = null;
    t.mock.method(paymentRepository, 'updateById', async (id, updates) => {
        paymentUpdate = updates;
        return { _id: id, ...updates };
    });
    t.mock.method(bookingRepository, 'updateById', async (id, updates) => ({ _id: id, ...updates }));

    await assert.rejects(
        paymentService.initiateRefund('booking-1', 'Customer cancelled before service'),
        /Refund could not be initiated/,
    );

    assert.equal(paymentUpdate.status, 'refund_failed');
    assert.equal(paymentUpdate.refund.status, 'failed');
    assert.equal(paymentUpdate.refund.manualResolutionRequired, true);
    assert.match(paymentUpdate.refund.failureReason, /PhonePe refund sandbox failure/);
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
        /Refund window has closed/,
    );

    assert.equal(gatewayMock.mock.calls.length, 0);
});

test('initiateRefund rejects barbers who do not own the booking shop', async (t) => {
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
        shopId: 'shop-1',
        payoutStatus: 'not_initiated',
    }));

    t.mock.method(shopRepository, 'findByOwnerId', async () => ({
        _id: 'shop-2',
    }));

    const gatewayMock = t.mock.method(phonePeAdapter, 'initiateRefund', async () => {
        throw new Error('should not call gateway for another barber');
    });

    await assert.rejects(
        paymentService.initiateRefund(
            'booking-1',
            'Customer cancelled before service',
            { role: 'BARBER', userId: 'barber-2' },
        ),
        /own shop/,
    );

    assert.equal(gatewayMock.mock.calls.length, 0);
});

test('handleWebhook ignores late payment failure events after a payment is already completed', async (t) => {
    t.mock.method(phonePeAdapter, 'verifyWebhook', () => true);
    t.mock.method(phonePeAdapter, 'parseWebhookPayload', () => ({
        event: 'checkout.order.failed',
        merchantOrderId: 'EC-booking-1',
        state: 'FAILED',
        paymentDetails: [],
        errorContext: {
            errorCode: 'PAYMENT_DECLINED',
        },
    }));
    t.mock.method(phonePeAdapter, 'getOrderStatus', async () => ({
        state: 'FAILED',
        paymentDetails: [],
        errorCode: 'PAYMENT_DECLINED',
        errorContext: {
            errorCode: 'PAYMENT_DECLINED',
        },
    }));

    t.mock.method(paymentRepository, 'findByMerchantOrderId', async () => ({
        _id: 'payment-1',
        bookingId: 'booking-1',
        merchantOrderId: 'EC-booking-1',
        status: 'completed',
    }));

    const paymentUpdateMock = t.mock.method(paymentRepository, 'updateById', async () => {
        throw new Error('completed payments should not be downgraded');
    });
    const bookingUpdateMock = t.mock.method(bookingRepository, 'updateById', async () => {
        throw new Error('completed bookings should not be downgraded');
    });

    const result = await paymentService.handleWebhook(
        { authorization: 'valid-webhook-auth' },
        {},
    );

    assert.deepEqual(result, {
        processed: true,
        event: 'checkout.order.failed',
    });
    assert.equal(paymentUpdateMock.mock.calls.length, 0);
    assert.equal(bookingUpdateMock.mock.calls.length, 0);
});

test('handleWebhook completes a cancellation refund and marks the booking refunded', async (t) => {
    t.mock.method(phonePeAdapter, 'verifyWebhook', () => true);
    t.mock.method(phonePeAdapter, 'parseWebhookPayload', () => ({
        event: 'pg.refund.completed',
        originalMerchantOrderId: 'EC-booking-1',
        merchantRefundId: 'RF-cancel-1',
        refundId: 'refund-cancel-1',
        state: 'COMPLETED',
    }));

    t.mock.method(paymentRepository, 'findByMerchantOrderId', async () => ({
        _id: 'payment-1',
        bookingId: 'booking-1',
        merchantOrderId: 'EC-booking-1',
        status: 'refund_pending',
        refund: {
            merchantRefundId: 'RF-cancel-1',
            gatewayRefundId: 'refund-cancel-1',
            amount: 39400,
            status: 'pending',
            type: 'cancellation',
        },
    }));

    let paymentUpdate = null;
    let bookingUpdate = null;
    t.mock.method(paymentRepository, 'updateById', async (id, updates) => {
        paymentUpdate = updates;
        return { _id: id, ...updates };
    });
    t.mock.method(bookingRepository, 'updateById', async (id, updates) => {
        bookingUpdate = updates;
        return { _id: id, ...updates };
    });

    const result = await paymentService.handleWebhook({ authorization: 'valid-webhook-auth' }, {});

    assert.deepEqual(result, {
        processed: true,
        event: 'pg.refund.completed',
    });
    assert.equal(paymentUpdate.status, 'refunded');
    assert.equal(paymentUpdate.refund.status, 'completed');
    assert.deepEqual(bookingUpdate, {
        paymentStatus: 'refunded',
    });
});

test('pollPendingPayments expires checkout sessions based on current time, not 24-hour-old records only', async (t) => {
    t.mock.method(paymentRepository, 'findStalePayments', async () => []);

    let capturedExpiryCutoff = null;
    t.mock.method(paymentRepository, 'findExpirablePendingPayments', async (expiresBefore) => {
        capturedExpiryCutoff = expiresBefore;
        return [];
    });

    await paymentService.pollPendingPayments();

    assert.ok(capturedExpiryCutoff instanceof Date);
    assert.ok(
        Date.now() - capturedExpiryCutoff.getTime() < 60_000,
        'expected pollPendingPayments() to use the current time as the expiry cutoff',
    );
});
