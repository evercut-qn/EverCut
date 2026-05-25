import assert from 'node:assert/strict';
import test from 'node:test';

const ensureRequiredEnv = () => {
    const defaults = {
        MONGODB_URI: 'mongodb://localhost:27017/evercut-test',
        FIREBASE_PROJECT_ID: 'evercut-test',
        FIREBASE_CLIENT_EMAIL: 'firebase@example.com',
        FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
        CF_ACCOUNT_ID: 'test-account',
        R2_ACCESS_KEY_ID: 'test-access-key',
        R2_SECRET_ACCESS_KEY: 'test-secret-key',
        R2_BUCKET: 'evercut-media-test',
        CDN_BASE_URL: 'https://media.evercut.test',
        MEDIA_TOKEN_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        MSG91_AUTH_KEY: 'msg91-auth',
        MSG91_OTP_TEMPLATE_ID: 'msg91-template',
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ONBOARDING_SECRET: 'onboarding-secret',
    };

    for (const [key, value] of Object.entries(defaults)) {
        process.env[key] ??= value;
    }
};

ensureRequiredEnv();

const config = (await import('../index.js')).default;
const Booking = (await import('../../models/booking.model.js')).default;
const Customer = (await import('../../models/customer.model.js')).default;
const PaymentTransaction = (await import('../../models/payment-transaction.model.js')).default;
const { serializeCustomerProfile } = await import('../../serializers/customer.serializer.js');

test('customer waiver schema persists only the waiver usage counter', () => {
    const usedPath = Customer.schema.path('feeWaiverBookingsUsed');

    assert.ok(usedPath);
    assert.equal(usedPath.options.max, undefined);
    assert.equal(Customer.schema.path('feeWaiverQuota'), undefined);
    assert.equal(Customer.schema.path('feeWaiverExhausted'), undefined);
});

test('customer serializer derives non-persisted waiver status from existing payment config', () => {
    const serialized = serializeCustomerProfile({
        id: 'customer-1',
        userId: 'user-1',
        feeWaiverBookingsUsed: config.payment.feeWaiverQuota,
    });

    assert.equal(serialized.feeWaiverBookingsUsed, config.payment.feeWaiverQuota);
    assert.equal(serialized.feeWaiverQuota, config.payment.feeWaiverQuota);
    assert.equal(serialized.feeWaiverExhausted, true);
});

test('booking schema does not persist platform-fee snapshots', () => {
    for (const field of [
        'bookingAmount',
        'bookingFeeType',
        'platformFee',
        'standardPlatformFee',
        'totalCharged',
        'waiverApplied',
        'cancellationType',
        'refundFee',
        'refundAmount',
    ]) {
        assert.equal(Booking.schema.path(field), undefined);
    }
});

test('payment transaction schema persists waiver flag without extra fee metadata snapshots', () => {
    assert.ok(PaymentTransaction.schema.path('waiverApplied'));
    assert.equal(PaymentTransaction.schema.path('settlement.standardPlatformFee'), undefined);
    assert.equal(PaymentTransaction.schema.path('settlement.bookingFeeType'), undefined);
    assert.equal(PaymentTransaction.schema.path('settlement.waiverApplied'), undefined);
});
