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

const payoutService = await import('../payout.service.js');
const bookingRepository = (await import('../../repositories/booking.repository.js')).default;
const paymentRepository = (await import('../../repositories/payment.repository.js')).default;
const payoutRepository = (await import('../../repositories/payout.repository.js')).default;
const shopRepository = (await import('../../repositories/shop.repository.js')).default;
const userRepository = (await import('../../repositories/user.repository.js')).default;
const cashfreePayoutAdapter = (await import('../../adapters/cashfree/cashfree-payout.adapter.js')).default;

test('triggerBarberPayout stores generic beneficiary and gateway transfer identifiers', async (t) => {
    t.mock.method(bookingRepository, 'findByIds', async () => ([
        {
            _id: 'booking-1',
            shopId: 'shop-1',
            status: 'completed',
            paymentStatus: 'success',
            payoutStatus: 'not_initiated',
        },
    ]));

    const shop = {
        _id: 'shop-1',
        ownerId: 'barber-1',
        shopName: 'Trim Studio',
        ownerName: 'Barber One',
        accountHolderName: 'Barber One',
        upiId: 'barber@upi',
        payoutConfig: {},
    };

    t.mock.method(shopRepository, 'findById', async () => shop);
    t.mock.method(userRepository, 'findById', async () => ({
        _id: 'barber-1',
        phoneNumber: '9999999999',
        email: 'barber@example.com',
    }));

    t.mock.method(paymentRepository, 'findCompletedByBookingIds', async () => ([
        {
            _id: 'payment-1',
            bookingId: 'booking-1',
            settlement: {
                barberPayout: 9900,
            },
        },
    ]));

    t.mock.method(cashfreePayoutAdapter, 'getBeneficiary', async () => null);
    t.mock.method(cashfreePayoutAdapter, 'createBeneficiary', async () => ({
        beneficiaryId: 'BARBER_barber-1',
        created: true,
    }));

    let shopUpdate = null;
    t.mock.method(shopRepository, 'updateById', async (id, updates) => {
        shopUpdate = { id, updates };
        return { ...shop, ...updates };
    });

    let createdPayout = null;
    t.mock.method(payoutRepository, 'create', async (data) => {
        createdPayout = { _id: 'payout-1', ...data };
        return createdPayout;
    });

    const payoutUpdates = [];
    t.mock.method(payoutRepository, 'updateById', async (id, updates) => {
        payoutUpdates.push({ id, updates });
        return { ...createdPayout, ...updates };
    });

    t.mock.method(bookingRepository, 'updateManyByIds', async () => ({ acknowledged: true }));
    t.mock.method(cashfreePayoutAdapter, 'initiateTransfer', async ({ transferId }) => ({
        transferId,
        gatewayTransferId: 'provider-transfer-1',
        status: 'PENDING',
    }));

    const result = await payoutService.triggerBarberPayout('barber-1', ['booking-1']);

    assert.equal(shopUpdate?.updates?.payoutConfig?.beneficiaryId, 'BARBER_barber-1');
    assert.equal(
        Object.hasOwn(shopUpdate?.updates?.payoutConfig || {}, 'cashfreeBeneficiaryId'),
        false,
    );
    assert.equal(
        payoutUpdates.some(({ updates }) => updates.gatewayTransferId === 'provider-transfer-1'),
        true,
    );
    assert.equal(
        payoutUpdates.some(({ updates }) => Object.hasOwn(updates, 'cfTransferId')),
        false,
    );
    assert.equal(result.gatewayTransferId, 'provider-transfer-1');
});
