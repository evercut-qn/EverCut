import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureRequiredEnv } from '../../__tests__/helpers/env.js';

ensureRequiredEnv();

const bookingRepository = (await import('../../repositories/booking.repository.js')).default;
const paymentRepository = (await import('../../repositories/payment.repository.js')).default;
const shopRepository = (await import('../../repositories/shop.repository.js')).default;
const earningsService = await import('../earnings.service.js');

test.beforeEach(() => {
    paymentRepository.aggregateIncomeByMonth ??= async () => [];
});

test('getEarnings returns six-month income analytics while preserving existing earnings fields', async (t) => {
    t.mock.timers.enable({
        apis: ['Date'],
        now: new Date('2026-05-30T12:00:00.000Z'),
    });

    t.mock.method(shopRepository, 'findByBarberUserId', async () => ({ _id: 'shop-1' }));
    t.mock.method(bookingRepository, 'getEarningsAggregationForShop', async () => ([
        { totalEarning: 100000, lastMonthEarning: 17000, todayEarning: 500 },
    ]));
    t.mock.method(paymentRepository, 'findAll', async () => []);

    let capturedRange = null;
    t.mock.method(paymentRepository, 'aggregateIncomeByMonth', async (shopId, startDate, endDate) => {
        capturedRange = { shopId, startDate, endDate };
        return [
            { year: 2025, month: 11, amount: 10500 },
            { year: 2025, month: 12, amount: 11800 },
            { year: 2026, month: 1, amount: 12400 },
            { year: 2026, month: 2, amount: 12100 },
            { year: 2026, month: 3, amount: 14500 },
            { year: 2026, month: 4, amount: 17200 },
        ];
    });

    const result = await earningsService.getEarnings('owner-1');

    assert.equal(result.totalEarning, 100000);
    assert.equal(result.lastMonthEarning, 17000);
    assert.equal(result.todayEarning, 500);
    assert.equal(result.monthlyRevenue !== undefined, true);
    assert.deepEqual(capturedRange, {
        shopId: 'shop-1',
        startDate: new Date('2025-11-01T00:00:00.000Z'),
        endDate: new Date('2026-05-01T00:00:00.000Z'),
    });
    assert.deepEqual(result.income, {
        total: 78500,
        growth: 18.6,
        statistics: [
            { month: 'November', amount: 10500 },
            { month: 'December', amount: 11800 },
            { month: 'January', amount: 12400 },
            { month: 'February', amount: 12100 },
            { month: 'March', amount: 14500 },
            { month: 'April', amount: 17200 },
        ],
    });
});

test('getEarnings returns zero-filled income analytics when no monthly income exists', async (t) => {
    t.mock.timers.enable({
        apis: ['Date'],
        now: new Date('2026-01-10T12:00:00.000Z'),
    });

    t.mock.method(shopRepository, 'findByBarberUserId', async () => ({ _id: 'shop-1' }));
    t.mock.method(bookingRepository, 'getEarningsAggregationForShop', async () => []);
    t.mock.method(paymentRepository, 'findAll', async () => []);
    t.mock.method(paymentRepository, 'aggregateIncomeByMonth', async () => []);

    const result = await earningsService.getEarnings('owner-1');

    assert.deepEqual(result.income, {
        total: 0,
        growth: 0,
        statistics: [
            { month: 'July', amount: 0 },
            { month: 'August', amount: 0 },
            { month: 'September', amount: 0 },
            { month: 'October', amount: 0 },
            { month: 'November', amount: 0 },
            { month: 'December', amount: 0 },
        ],
    });
});

test('getTransactionDetail returns an appointment-style payload with transaction metadata', async (t) => {
    t.mock.method(shopRepository, 'findByBarberUserId', async () => ({ _id: 'shop-1' }));
    t.mock.method(paymentRepository, 'findByIdForEarnings', async () => ({
        _id: 'payment-1',
        shopId: 'shop-1',
        status: 'completed',
        amount: 5500,
        currency: 'INR',
        paymentMode: 'UPI',
        gatewayTransactionId: 'txn-123',
        createdAt: new Date('2026-05-10T12:00:00.000Z'),
        settlement: { serviceAmount: 5500, barberPayout: 5000 },
        bookingId: {
            _id: 'booking-1',
            customerId: { _id: 'customer-1', firstName: 'Jane', lastName: 'Doe' },
            employeeId: { _id: 'employee-1', firstName: 'Alex', lastName: 'Smith' },
            shopId: { _id: 'shop-1', shopName: 'EverCut' },
            date: new Date('2026-05-10T00:00:00.000Z'),
            time: '10:30 AM',
            endTime: '11:00 AM',
            serviceIds: [{ _id: 'service-1', serviceName: 'Haircut', actualPrice: 2500, offerPrice: 0 }],
            totalAmount: 5500,
            durationMinutes: 30,
            startMinute: 630,
            endMinute: 660,
            slotLockTimes: [],
            paymentTransactionId: 'payment-1',
            merchantOrderId: 'order-123',
            status: 'completed',
            paymentStatus: 'paid',
            payoutStatus: 'not_initiated',
        },
    }));

    const result = await earningsService.getTransactionDetail('owner-1', 'payment-1');

    assert.equal(result.id, 'booking-1');
    assert.equal(result.customer?.firstName, 'Jane');
    assert.equal(result.customer?.lastName, 'Doe');
    assert.equal(result.employee?.firstName, 'Alex');
    assert.equal(result.employee?.lastName, 'Smith');
    assert.equal(result.shop?.shopName, 'EverCut');
    assert.equal(result.services?.[0]?.name, 'Haircut');
    assert.equal(result.serviceAmount, 25);
    assert.equal(result.totalAmount, 50);
    assert.equal(result.transactionId, 'txn-123');
    assert.equal(result.paymentMode, 'UPI');
    assert.equal(result.paymentStatus, 'Successfully Paid');
});
