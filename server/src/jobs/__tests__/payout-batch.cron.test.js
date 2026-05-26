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

const bookingRepository = (await import('../../repositories/booking.repository.js')).default;
const paymentRepository = (await import('../../repositories/payment.repository.js')).default;
const payoutBatchJob = await import('../payout-batch.cron.js');

test('runPayoutBatchNow groups completed bookings by barber and creates one payout per barber', async (t) => {
    t.mock.method(bookingRepository, 'findCompletedWithPendingPayout', async () => ([
        { _id: 'booking-1', shopId: { _id: 'shop-1', barberId: 'barber-1' } },
        { _id: 'booking-2', shopId: { _id: 'shop-1', barberId: 'barber-1' } },
        { _id: 'booking-3', shopId: { _id: 'shop-2', barberId: 'barber-2' } },
    ]));

    t.mock.method(paymentRepository, 'findCompletedByBookingIds', async () => ([
        { bookingId: 'booking-1', settlement: { serviceAmount: 9900 } },
        { bookingId: 'booking-2', settlement: { serviceAmount: 15000 } },
        { bookingId: 'booking-3', settlement: { serviceAmount: 42500 } },
    ]));

    const triggerCalls = [];
    const triggerBarberPayout = async (barberId, bookingIds, totalPayoutInPaisa) => {
        triggerCalls.push({ barberId, bookingIds, totalPayoutInPaisa });
        return { barberId, bookingIds, totalPayoutInPaisa };
    };

    const result = await payoutBatchJob.runPayoutBatchNow({ triggerBarberPayout, payoutMode: 'auto' });

    assert.deepEqual(triggerCalls, [
        {
            barberId: 'barber-1',
            bookingIds: ['booking-1', 'booking-2'],
            totalPayoutInPaisa: 24900,
        },
        {
            barberId: 'barber-2',
            bookingIds: ['booking-3'],
            totalPayoutInPaisa: 42500,
        },
    ]);
    assert.deepEqual(result, {
        totalBookings: 3,
        uniqueBarbers: 2,
        success: 2,
        failed: 0,
    });
});

test('runPayoutBatchNow prefers barberPayout when settlement values diverge from serviceAmount', async (t) => {
    t.mock.method(bookingRepository, 'findCompletedWithPendingPayout', async () => ([
        { _id: 'booking-1', shopId: { _id: 'shop-1', barberId: 'barber-1' } },
    ]));

    t.mock.method(paymentRepository, 'findCompletedByBookingIds', async () => ([
        {
            bookingId: 'booking-1',
            settlement: {
                serviceAmount: 12000,
                barberPayout: 9900,
            },
        },
    ]));

    const triggerCalls = [];
    const triggerBarberPayout = async (barberId, bookingIds, totalPayoutInPaisa) => {
        triggerCalls.push({ barberId, bookingIds, totalPayoutInPaisa });
        return { barberId, bookingIds, totalPayoutInPaisa };
    };

    await payoutBatchJob.runPayoutBatchNow({ triggerBarberPayout, payoutMode: 'auto' });

    assert.deepEqual(triggerCalls, [
        {
            barberId: 'barber-1',
            bookingIds: ['booking-1'],
            totalPayoutInPaisa: 9900,
        },
    ]);
});

test('runPayoutBatchNow skips automatic payout work in manual mode', async (t) => {
    const findMock = t.mock.method(bookingRepository, 'findCompletedWithPendingPayout', async () => {
        throw new Error('booking lookup should not run in manual mode');
    });

    const result = await payoutBatchJob.runPayoutBatchNow({
        triggerBarberPayout: async () => {
            throw new Error('trigger should not run in manual mode');
        },
        payoutMode: 'manual',
    });

    assert.deepEqual(result, {
        totalBookings: 0,
        uniqueBarbers: 0,
        success: 0,
        failed: 0,
        skipped: true,
    });
    assert.equal(findMock.mock.calls.length, 0);
});
