import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureRequiredEnv } from '../../__tests__/helpers/env.js';

ensureRequiredEnv();

const userService = await import('../user.service.js');
const bookingService = await import('../booking.service.js');
const paymentService = await import('../payment.service.js');
const payoutService = await import('../payout.service.js');
const userRepository = (await import('../../repositories/user.repository.js')).default;
const bookingRepository = (await import('../../repositories/booking.repository.js')).default;
const paymentRepository = (await import('../../repositories/payment.repository.js')).default;
const payoutRepository = (await import('../../repositories/payout.repository.js')).default;

test('getUserSummary exposes customer-specific totals for admin overview', async (t) => {
    t.mock.method(userRepository, 'aggregateSummary', async () => ({
        roleRows: [
            { _id: 'CUSTOMER', count: 8 },
            { _id: 'BARBER', count: 2 },
            { _id: 'ADMIN', count: 1 },
        ],
        customerActiveRows: [
            { _id: true, count: 7 },
            { _id: false, count: 1 },
        ],
        registrationRows: [{ date: '2026-06-01', count: 3 }],
    }));
    t.mock.method(userRepository, 'countAll', async (filter) => {
        assert.equal(filter.roleType, 'CUSTOMER');
        return filter.createdAt ? 3 : 0;
    });

    const summary = await userService.getUserSummary();

    assert.equal(summary.totalCustomers, 8);
    assert.equal(summary.activeCustomers, 7);
    assert.equal(summary.inactiveCustomers, 1);
    assert.equal(summary.byRole.CUSTOMER, 8);
    assert.equal(summary.newCustomerRegistrations.thisWeek, 3);
    assert.deepEqual(summary.newCustomerRegistrations.trend, [{ date: '2026-06-01', count: 3 }]);
    assert.equal('totalUsers' in summary, false);
    assert.equal('activeUsers' in summary, false);
});

test('payment summary names completed customer payments separately from platform fees', async (t) => {
    t.mock.method(paymentRepository, 'aggregateAdminSummary', async () => ({
        statusRows: [
            { status: 'completed', count: 8 },
            { status: 'failed', count: 2 },
        ],
        totals: {
            totalPayments: 12,
            successCount: 8,
            failedCount: 2,
            customerPaymentsCollectedInPaisa: 120000,
            platformFeesCollectedInPaisa: 12000,
        },
        monthlyTrend: [{ year: 2026, month: 6, customerPaymentsCollectedInRupees: 1200, platformFeeInRupees: 120 }],
    }));

    const paymentSummary = await paymentService.getPaymentSummary();

    assert.equal(paymentSummary.paymentSuccessRate, 80);
    assert.equal(paymentSummary.customerPaymentsCollectedInRupees, 1200);
    assert.equal(paymentSummary.platformFeesCollectedInRupees, 120);
    assert.equal('totalRevenueInRupees' in paymentSummary, false);
});

test('getBookingSummary returns booking totals, trends, and top shops', async (t) => {
    t.mock.method(bookingRepository, 'aggregateAdminSummary', async () => ({
        totals: { allTime: 20, thisWeek: 4, thisMonth: 9 },
        statusRows: [{ status: 'completed', count: 7 }],
        dailyTrend: [{ date: '2026-06-01', count: 2 }],
        monthlyTrend: [{ year: 2026, month: 6, count: 9 }],
        topShops: [{ shopId: '507f1f77bcf86cd799439011', shopName: 'Trim Studio', bookingCount: 5, paidServiceValueInRupees: 4000 }],
    }));

    const summary = await bookingService.getBookingSummary();

    assert.deepEqual(summary.totalBookings, { allTime: 20, thisMonth: 9, thisWeek: 4 });
    assert.equal(summary.statusDistribution[0].status, 'completed');
    assert.equal(summary.trends.monthly[0].count, 9);
    assert.equal(summary.topShops[0].shopName, 'Trim Studio');
    assert.equal(summary.topShops[0].paidServiceValueInRupees, 4000);
    assert.equal('revenueInRupees' in summary.topShops[0], false);
});

test('payout summary computes financial health metrics', async (t) => {
    t.mock.method(payoutRepository, 'aggregateAdminSummary', async () => ([
        { status: 'SUCCESS', count: 3, totalAmountInRupees: 900 },
        { status: 'FAILED', count: 1, totalAmountInRupees: 300 },
    ]));

    const payoutSummary = await payoutService.getPayoutSummary();

    assert.equal(payoutSummary.byStatus.SUCCESS, 3);
    assert.equal(payoutSummary.totalAmountInRupees, 1200);
});
