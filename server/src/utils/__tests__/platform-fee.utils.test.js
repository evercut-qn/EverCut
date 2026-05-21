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

const config = (await import('../../config/index.js')).default;
const {
    BOOKING_FEE_TYPE,
    assertMinimumServiceAmount,
    calculatePlatformFee,
    classifyBookingFeeType,
    getMinimumServiceAmount,
    resolveCustomerPlatformFee,
} = await import('../platform-fee.utils.js');

test('classifyBookingFeeType treats any bundle selection as a bundle-capped booking', () => {
    assert.equal(classifyBookingFeeType([
        { serviceType: 'single' },
    ]), BOOKING_FEE_TYPE.SINGLE);

    assert.equal(classifyBookingFeeType([
        { serviceType: 'bundled' },
    ]), BOOKING_FEE_TYPE.BUNDLE);

    assert.equal(classifyBookingFeeType([
        { serviceType: 'single' },
        { serviceType: 'bundled' },
    ]), BOOKING_FEE_TYPE.COMBINED);
});

test('calculatePlatformFee derives active fees from centralized platform-fee config', () => {
    assert.equal(calculatePlatformFee(BOOKING_FEE_TYPE.SINGLE), config.payment.platformFeeSingle);
    assert.equal(calculatePlatformFee(BOOKING_FEE_TYPE.BUNDLE), config.payment.platformFeeBundle);
    assert.equal(calculatePlatformFee(BOOKING_FEE_TYPE.COMBINED), config.payment.platformFeeBundle);
});

test('getMinimumServiceAmount derives thresholds from centralized platform-fee config', () => {
    assert.equal(getMinimumServiceAmount(BOOKING_FEE_TYPE.SINGLE), config.payment.minSingleServiceAmount);
    assert.equal(getMinimumServiceAmount(BOOKING_FEE_TYPE.BUNDLE), config.payment.minBundleServiceAmount);
    assert.equal(getMinimumServiceAmount(BOOKING_FEE_TYPE.COMBINED), config.payment.minBundleServiceAmount);
});

test('assertMinimumServiceAmount validates against the booking fee type threshold', () => {
    const singleMinimum = config.payment.minSingleServiceAmount;
    const bundleMinimum = config.payment.minBundleServiceAmount;

    assert.doesNotThrow(() => assertMinimumServiceAmount(singleMinimum, BOOKING_FEE_TYPE.SINGLE));
    assert.throws(
        () => assertMinimumServiceAmount(singleMinimum - 1, BOOKING_FEE_TYPE.SINGLE),
        new RegExp(`Minimum single service booking amount is .${singleMinimum}`),
    );

    assert.doesNotThrow(() => assertMinimumServiceAmount(bundleMinimum, BOOKING_FEE_TYPE.BUNDLE));
    assert.throws(
        () => assertMinimumServiceAmount(bundleMinimum - 1, BOOKING_FEE_TYPE.BUNDLE),
        new RegExp(`Minimum bundle booking amount is .${bundleMinimum}`),
    );

    assert.doesNotThrow(() => assertMinimumServiceAmount(bundleMinimum, BOOKING_FEE_TYPE.COMBINED));
    assert.throws(
        () => assertMinimumServiceAmount(bundleMinimum - 1, BOOKING_FEE_TYPE.COMBINED),
        new RegExp(`Minimum bundle booking amount is .${bundleMinimum}`),
    );
});

test('resolveCustomerPlatformFee waives only available introductory platform fees', () => {
    assert.deepEqual(
        resolveCustomerPlatformFee({
            customer: { feeWaiverBookingsUsed: 0 },
            bookingFeeType: BOOKING_FEE_TYPE.SINGLE,
            activeWaiverReservations: 0,
        }),
        {
            bookingFeeType: BOOKING_FEE_TYPE.SINGLE,
            platformFee: 0,
            waiverApplied: true,
            feeWaiverBookingsUsed: 0,
            feeWaiverQuota: config.payment.feeWaiverQuota,
            feeWaiverRemaining: config.payment.feeWaiverQuota,
        },
    );

    assert.deepEqual(
        resolveCustomerPlatformFee({
            customer: {
                feeWaiverBookingsUsed: config.payment.feeWaiverQuota - 1,
            },
            bookingFeeType: BOOKING_FEE_TYPE.COMBINED,
            activeWaiverReservations: 1,
        }),
        {
            bookingFeeType: BOOKING_FEE_TYPE.COMBINED,
            platformFee: config.payment.platformFeeBundle,
            waiverApplied: false,
            feeWaiverBookingsUsed: config.payment.feeWaiverQuota - 1,
            feeWaiverQuota: config.payment.feeWaiverQuota,
            feeWaiverRemaining: 0,
        },
    );
});
