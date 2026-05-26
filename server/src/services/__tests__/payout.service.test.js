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

const payoutService = await import('../payout.service.js');
const notificationEvents = (await import('../notification-events.service.js')).default;
const bookingRepository = (await import('../../repositories/booking.repository.js')).default;
const paymentRepository = (await import('../../repositories/payment.repository.js')).default;
const payoutRepository = (await import('../../repositories/payout.repository.js')).default;
const barberRepository = (await import('../../repositories/barber.repository.js')).default;
const shopRepository = (await import('../../repositories/shop.repository.js')).default;
const userRepository = (await import('../../repositories/user.repository.js')).default;
const cashfreePayoutAdapter = (await import('../../adapters/cashfree/cashfree-payout.adapter.js')).default;

test('createManualPayout claims bookings, records a manual success, settles payments, and notifies the barber', async (t) => {
    const bookingIds = ['booking-1', 'booking-2'];
    const payments = [
        { _id: 'payment-1', bookingId: 'booking-1', settlement: { barberPayout: 9900, settled: false } },
        { _id: 'payment-2', bookingId: 'booking-2', settlement: { serviceAmount: 5100, settled: false } },
    ];

    t.mock.method(payoutRepository, 'findByUtr', async (utr) => {
        assert.equal(utr, 'MANUAL123');
        return null;
    });
    t.mock.method(bookingRepository, 'findByIds', async () => ([
        {
            _id: 'booking-1',
            shopId: { _id: 'shop-1', barberId: 'barber-1', shopName: 'Trim Studio' },
            status: 'completed',
            paymentStatus: 'success',
            payoutStatus: 'not_initiated',
        },
        {
            _id: 'booking-2',
            shopId: { _id: 'shop-1', barberId: 'barber-1', shopName: 'Trim Studio' },
            status: 'no-show',
            paymentStatus: 'success',
            payoutStatus: 'failed',
        },
    ]));
    t.mock.method(barberRepository, 'findById', async () => ({
        _id: 'barber-1',
        userId: 'user-1',
        firstName: 'Asha',
        lastName: 'Rao',
        accountHolderName: 'Asha Rao',
        upiId: 'asha@upi',
    }));
    t.mock.method(paymentRepository, 'findCompletedByBookingIds', async () => payments);

    let claimCall = null;
    t.mock.method(bookingRepository, 'claimManualPayoutBookings', async (args) => {
        claimCall = args;
        return { matchedCount: 2, modifiedCount: 2 };
    });

    let createdPayout = null;
    t.mock.method(payoutRepository, 'create', async (data) => {
        createdPayout = { ...data };
        return createdPayout;
    });

    let completeCall = null;
    t.mock.method(bookingRepository, 'completeManualPayoutBookings', async (...args) => {
        completeCall = args;
        return { matchedCount: 2, modifiedCount: 2 };
    });

    let settledCall = null;
    t.mock.method(paymentRepository, 'markSettledByIds', async (...args) => {
        settledCall = args;
        return { acknowledged: true, modifiedCount: 2 };
    });

    let notificationPayload = null;
    t.mock.method(notificationEvents, 'notifyPayoutStatus', async (payload) => {
        notificationPayload = payload;
        return { notification: null };
    });

    const result = await payoutService.createManualPayout({
        barberId: 'barber-1',
        bookingIds,
        utr: ' manual123 ',
        transferMode: 'upi',
        notes: ' Paid from bank portal ',
    }, 'admin-1');

    assert.deepEqual(claimCall.bookingIds, bookingIds);
    assert.equal(String(claimCall.payoutId), String(createdPayout._id));
    assert.equal(createdPayout.gateway, 'manual');
    assert.equal(createdPayout.status, 'SUCCESS');
    assert.equal(createdPayout.utr, 'MANUAL123');
    assert.equal(createdPayout.amount, 15000);
    assert.equal(createdPayout.amountInRupees, 150);
    assert.equal(createdPayout.completedByAdminId, 'admin-1');
    assert.equal(createdPayout.adminNotes, 'Paid from bank portal');
    assert.deepEqual(completeCall[0], bookingIds);
    assert.equal(String(completeCall[1]), String(createdPayout._id));
    assert.equal(completeCall[2].utr, 'MANUAL123');
    assert.deepEqual(settledCall[0], ['payment-1', 'payment-2']);
    assert.equal(notificationPayload.barberId, 'user-1');
    assert.equal(notificationPayload.status, 'SUCCESS');
    assert.equal(result.gateway, 'manual');
    assert.equal(result.utr, 'MANUAL123');
});

test('createManualPayout rejects stale booking claims before creating a payout record', async (t) => {
    t.mock.method(payoutRepository, 'findByUtr', async () => null);
    t.mock.method(bookingRepository, 'findByIds', async () => ([
        {
            _id: 'booking-1',
            shopId: { _id: 'shop-1', barberId: 'barber-1', shopName: 'Trim Studio' },
            status: 'completed',
            paymentStatus: 'success',
            payoutStatus: 'not_initiated',
        },
        {
            _id: 'booking-2',
            shopId: { _id: 'shop-1', barberId: 'barber-1', shopName: 'Trim Studio' },
            status: 'completed',
            paymentStatus: 'success',
            payoutStatus: 'not_initiated',
        },
    ]));
    t.mock.method(barberRepository, 'findById', async () => ({
        _id: 'barber-1',
        userId: 'user-1',
        firstName: 'Asha',
        lastName: 'Rao',
        upiId: 'asha@upi',
    }));
    t.mock.method(paymentRepository, 'findCompletedByBookingIds', async () => ([
        { _id: 'payment-1', bookingId: 'booking-1', settlement: { barberPayout: 9900 } },
        { _id: 'payment-2', bookingId: 'booking-2', settlement: { barberPayout: 5100 } },
    ]));
    t.mock.method(bookingRepository, 'claimManualPayoutBookings', async () => ({
        matchedCount: 1,
        modifiedCount: 1,
    }));
    const createMock = t.mock.method(payoutRepository, 'create', async () => {
        throw new Error('create should not run');
    });
    t.mock.method(bookingRepository, 'releaseManualPayoutClaim', async () => ({ acknowledged: true }));

    await assert.rejects(
        payoutService.createManualPayout({
            barberId: 'barber-1',
            bookingIds: ['booking-1', 'booking-2'],
            utr: 'UTR123',
        }, 'admin-1'),
        /already being processed|already has an active payout|modified by another admin/i,
    );

    assert.equal(createMock.mock.calls.length, 0);
});

test('updatePayoutStatus marks a manual payout failed and reopens its bookings for payout retry', async (t) => {
    const payout = {
        _id: 'payout-1',
        gateway: 'manual',
        status: 'SUCCESS',
        bookingIds: ['booking-1'],
        paymentTransactionIds: ['payment-1'],
        completedByAdminId: 'admin-original',
        utr: 'UTR123',
    };

    t.mock.method(payoutRepository, 'findById', async () => payout);

    let atomicCall = null;
    t.mock.method(payoutRepository, 'atomicStatusUpdate', async (...args) => {
        atomicCall = args;
        return {
            ...payout,
            status: 'FAILED',
            failureReason: 'UPI transfer rejected',
            adminNotes: 'Retry after UPI confirmation',
            lastStatusUpdatedByAdminId: 'admin-2',
        };
    });

    let bookingFailureCall = null;
    t.mock.method(bookingRepository, 'markPayoutBookingsFailed', async (...args) => {
        bookingFailureCall = args;
        return { matchedCount: 1, modifiedCount: 1 };
    });

    let unsettledIds = null;
    t.mock.method(paymentRepository, 'markUnsettledByIds', async (ids) => {
        unsettledIds = ids;
        return { acknowledged: true, modifiedCount: 1 };
    });

    const result = await payoutService.updatePayoutStatus('payout-1', {
        status: 'FAILED',
        reason: 'UPI transfer rejected',
        notes: 'Retry after UPI confirmation',
    }, 'admin-2');

    assert.equal(atomicCall[0], 'payout-1');
    assert.equal(atomicCall[1], 'SUCCESS');
    assert.equal(atomicCall[2].failureReason, 'UPI transfer rejected');
    assert.equal(atomicCall[2].lastStatusUpdatedByAdminId, 'admin-2');
    assert.deepEqual(bookingFailureCall, [
        ['booking-1'],
        'payout-1',
    ]);
    assert.deepEqual(unsettledIds, ['payment-1']);
    assert.equal(result.status, 'FAILED');
    assert.equal(result.completedByAdminId, 'admin-original');
    assert.equal(result.lastStatusUpdatedByAdminId, 'admin-2');
});

test('updatePayoutStatus rejects Cashfree payouts so manual correction cannot corrupt automatic payouts', async (t) => {
    t.mock.method(payoutRepository, 'findById', async () => ({
        _id: 'payout-1',
        gateway: 'cashfree',
        status: 'SUCCESS',
        bookingIds: ['booking-1'],
        paymentTransactionIds: ['payment-1'],
    }));
    const atomicMock = t.mock.method(payoutRepository, 'atomicStatusUpdate', async () => {
        throw new Error('atomic update should not run');
    });

    await assert.rejects(
        payoutService.updatePayoutStatus('payout-1', {
            status: 'FAILED',
            reason: 'Manual correction',
        }, 'admin-1'),
        /manual payouts/i,
    );

    assert.equal(atomicMock.mock.calls.length, 0);
});

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
        barberId: 'barber-1',
        shopName: 'Trim Studio',
    };
    const barber = {
        _id: 'barber-1',
        userId: 'user-1',
        firstName: 'Barber',
        lastName: 'One',
        accountHolderName: 'Barber One',
        upiId: 'barber@upi',
        payoutConfig: {},
    };

    let shopUpdate = null;
    t.mock.method(shopRepository, 'findById', async () => shop);
    t.mock.method(barberRepository, 'findById', async () => barber);
    t.mock.method(barberRepository, 'updateById', async (id, updates) => {
        shopUpdate = { id, updates };
        return { ...barber, ...updates };
    });
    t.mock.method(userRepository, 'findById', async () => ({
        _id: 'user-1',
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

test('triggerBarberPayout rejects caller-supplied payout totals that do not match settled payment amounts', async (t) => {
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
        barberId: 'barber-1',
        shopName: 'Trim Studio',
    };
    const barber = {
        _id: 'barber-1',
        userId: 'user-1',
        firstName: 'Barber',
        lastName: 'One',
        accountHolderName: 'Barber One',
        upiId: 'barber@upi',
        payoutConfig: {
            beneficiaryId: 'BARBER_barber-1',
        },
    };

    t.mock.method(shopRepository, 'findById', async () => shop);
    t.mock.method(barberRepository, 'findById', async () => barber);
    t.mock.method(userRepository, 'findById', async () => ({
        _id: 'user-1',
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

    t.mock.method(cashfreePayoutAdapter, 'getBeneficiary', async () => ({
        beneficiary_id: 'BARBER_barber-1',
    }));
    t.mock.method(payoutRepository, 'create', async () => ({
        _id: 'payout-1',
    }));
    t.mock.method(bookingRepository, 'updateManyByIds', async () => ({ acknowledged: true }));
    const transferMock = t.mock.method(cashfreePayoutAdapter, 'initiateTransfer', async () => ({
        gatewayTransferId: 'provider-transfer-1',
        transferId: 'PAYOUT_barber-1_1',
        status: 'PENDING',
    }));

    await assert.rejects(
        payoutService.triggerBarberPayout('barber-1', ['booking-1'], 5000),
        /does not match/i,
    );

    assert.equal(transferMock.mock.calls.length, 0);
});

test('triggerBarberPayout accepts no-show bookings from the automatic batch lifecycle', async (t) => {
    t.mock.method(bookingRepository, 'findByIds', async () => ([
        {
            _id: 'booking-1',
            shopId: 'shop-1',
            status: 'no-show',
            paymentStatus: 'success',
            payoutStatus: 'not_initiated',
        },
    ]));

    const shop = {
        _id: 'shop-1',
        barberId: 'barber-1',
        shopName: 'Trim Studio',
    };
    const barber = {
        _id: 'barber-1',
        userId: 'user-1',
        firstName: 'Barber',
        lastName: 'One',
        accountHolderName: 'Barber One',
        upiId: 'barber@upi',
        payoutConfig: {
            beneficiaryId: 'BARBER_barber-1',
        },
    };

    t.mock.method(shopRepository, 'findById', async () => shop);
    t.mock.method(barberRepository, 'findById', async () => barber);
    t.mock.method(userRepository, 'findById', async () => ({
        _id: 'user-1',
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
    t.mock.method(cashfreePayoutAdapter, 'getBeneficiary', async () => ({
        beneficiary_id: 'BARBER_barber-1',
    }));
    t.mock.method(payoutRepository, 'create', async (data) => ({
        _id: 'payout-1',
        ...data,
    }));
    t.mock.method(payoutRepository, 'updateById', async (id, updates) => ({
        _id: id,
        gatewayTransferId: 'provider-transfer-1',
        ...updates,
    }));
    t.mock.method(bookingRepository, 'updateManyByIds', async () => ({ acknowledged: true }));
    t.mock.method(cashfreePayoutAdapter, 'initiateTransfer', async () => ({
        gatewayTransferId: 'provider-transfer-1',
        status: 'PENDING',
    }));

    const result = await payoutService.triggerBarberPayout('barber-1', ['booking-1']);

    assert.equal(result.gatewayTransferId, 'provider-transfer-1');
});

test('triggerBarberPayout rejects bank-only payout destinations without UPI', async (t) => {
    t.mock.method(bookingRepository, 'findByIds', async () => ([
        {
            _id: 'booking-1',
            shopId: 'shop-1',
            status: 'completed',
            paymentStatus: 'success',
            payoutStatus: 'not_initiated',
        },
    ]));

    t.mock.method(shopRepository, 'findById', async () => ({
        _id: 'shop-1',
        barberId: 'barber-1',
        shopName: 'Trim Studio',
    }));
    t.mock.method(barberRepository, 'findById', async () => ({
        _id: 'barber-1',
        userId: 'user-1',
        firstName: 'Barber',
        lastName: 'One',
        accountHolderName: 'Barber One',
        upiId: null,
        bankAccount: '12345678901234',
        ifsc: 'HDFC0001234',
        payoutConfig: {},
    }));
    t.mock.method(userRepository, 'findById', async () => ({
        _id: 'user-1',
        phoneNumber: '9999999999',
        email: 'barber@example.com',
    }));

    const beneficiaryMock = t.mock.method(cashfreePayoutAdapter, 'createBeneficiary', async () => ({
        beneficiaryId: 'BARBER_barber-1',
        created: true,
    }));

    await assert.rejects(
        payoutService.triggerBarberPayout('barber-1', ['booking-1']),
        /upi payout destination/i,
    );

    assert.equal(beneficiaryMock.mock.calls.length, 0);
});

test('handlePayoutWebhook processes reversals even after a prior payout success', async (t) => {
    t.mock.method(cashfreePayoutAdapter, 'verifyWebhook', () => true);
    t.mock.method(cashfreePayoutAdapter, 'parseWebhookPayload', () => ({
        event: 'TRANSFER_REVERSED',
        transferId: 'PAYOUT_barber-1_1',
        updatedAt: '2026-04-23T10:30:00.000Z',
        failureReason: 'BENEFICIARY_BANK_REVERSAL',
    }));

    const payout = {
        _id: 'payout-1',
        transferId: 'PAYOUT_barber-1_1',
        status: 'SUCCESS',
        webhookProcessed: true,
        bookingIds: ['booking-1'],
        paymentTransactionIds: ['payment-1'],
        barberId: 'barber-1',
    };

    t.mock.method(payoutRepository, 'findByTransferId', async () => payout);
    t.mock.method(barberRepository, 'findById', async () => ({
        _id: 'barber-1',
        userId: '507f1f77bcf86cd799439015',
    }));
    t.mock.method(notificationEvents, 'notifyPayoutStatus', async () => ({ notification: null }));

    const payoutUpdates = [];
    t.mock.method(payoutRepository, 'updateById', async (id, updates) => {
        payoutUpdates.push({ id, updates });
        return { _id: id, ...updates };
    });

    const bookingUpdates = [];
    t.mock.method(bookingRepository, 'updateManyByIds', async (ids, updates) => {
        bookingUpdates.push({ ids, updates });
        return { acknowledged: true };
    });

    paymentRepository.markUnsettledByIds ??= async () => ({ acknowledged: true });
    const unsettledCalls = [];
    t.mock.method(paymentRepository, 'markUnsettledByIds', async (ids) => {
        unsettledCalls.push(ids);
        return { acknowledged: true };
    });

    const result = await payoutService.handlePayoutWebhook(
        { 'x-webhook-signature': 'valid', 'x-webhook-timestamp': '1713850000' },
        '{"event":"TRANSFER_REVERSED"}',
        {},
    );

    assert.deepEqual(result, {
        processed: true,
        event: 'TRANSFER_REVERSED',
    });
    assert.equal(
        payoutUpdates.some(({ updates }) => updates.status === 'REVERSED'),
        true,
    );
    assert.deepEqual(bookingUpdates[0], {
        ids: ['booking-1'],
        updates: {
            payoutStatus: 'reversed',
            payoutCompletedAt: null,
            barberUtr: null,
        },
    });
    assert.deepEqual(unsettledCalls, [['payment-1']]);
});
