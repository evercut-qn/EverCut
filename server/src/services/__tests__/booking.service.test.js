import assert from 'node:assert/strict';
import test from 'node:test';

import bookingRepository from '../../repositories/booking.repository.js';
import employeeRepository from '../../repositories/employee.repository.js';
import shopRepository from '../../repositories/shop.repository.js';
import * as bookingService from '../booking.service.js';

test('getBookingsByShop loads bookings by shopId so deleted employees do not disappear from history', async (t) => {
    t.mock.method(shopRepository, 'findByOwnerId', async () => ({ _id: 'shop-1' }));

    let countFilter = null;
    t.mock.method(bookingRepository, 'countAll', async (filter) => {
        countFilter = filter;
        return 1;
    });

    let listArgs = null;
    t.mock.method(bookingRepository, 'findByShopId', async (shopId, filters, options) => {
        listArgs = { shopId, filters, options };
        return [{ _id: 'booking-1' }];
    });

    t.mock.method(bookingRepository, 'getUniqueCustomerCountForShop', async () => 2);
    t.mock.method(employeeRepository, 'countByShopId', async () => 3);

    const result = await bookingService.getBookingsByShop('owner-1', { page: 2, limit: 5 });

    assert.deepEqual(countFilter, { shopId: 'shop-1' });
    assert.deepEqual(listArgs, {
        shopId: 'shop-1',
        filters: {},
        options: { skip: 5, limit: 5 },
    });
    assert.deepEqual(result, {
        items: [{ _id: 'booking-1' }],
        pagination: {
            currentPage: 2,
            totalPages: 1,
            totalDocuments: 1,
            hasNextPage: false,
            hasPrevPage: true,
        },
        numberOfEmployees: 3,
        numberOfCustomers: 2,
    });
});

test('getBookingMilestoneProgress returns the monthly completed-booking target state for the requested period', async (t) => {
    t.mock.method(shopRepository, 'findByOwnerId', async () => ({ _id: 'shop-1' }));

    let capturedArgs = null;
    t.mock.method(bookingRepository, 'countCompletedForShopInDateRange', async (shopId, startDate, endDate) => {
        capturedArgs = { shopId, startDate, endDate };
        return 500;
    });

    const result = await bookingService.getBookingMilestoneProgress('owner-1', { month: 3, year: 2026 });

    assert.deepEqual(capturedArgs, {
        shopId: 'shop-1',
        startDate: new Date('2026-03-01T00:00:00.000Z'),
        endDate: new Date('2026-04-01T00:00:00.000Z'),
    });
    assert.deepEqual(result, {
        period: {
            month: 3,
            year: 2026,
            label: 'March 2026',
        },
        status: 'active',
        completedBookings: 500,
        progress: {
            min: 0,
            max: 1000,
            value: 500,
            percentage: 50,
        },
        milestones: [
            {
                targetBookings: 500,
                label: '1st target',
                isCompleted: true,
                remainingBookings: 0,
            },
            {
                targetBookings: 750,
                label: '2nd target',
                isCompleted: false,
                remainingBookings: 250,
            },
            {
                targetBookings: 1000,
                label: '3rd target',
                isCompleted: false,
                remainingBookings: 500,
            },
        ],
        currentMilestone: {
            targetBookings: 500,
            label: '1st target',
            statusText: '1st target completed',
        },
        nextMilestone: {
            targetBookings: 750,
            label: '2nd target',
            remainingBookings: 250,
            rewardMessage: 'Just 250 more bookings to reach your next reward!',
        },
    });
});

test('getBookingMilestoneProgress returns no next milestone once all visible targets are completed', async (t) => {
    t.mock.method(shopRepository, 'findByOwnerId', async () => ({ _id: 'shop-1' }));
    t.mock.method(bookingRepository, 'countCompletedForShopInDateRange', async () => 1200);

    const result = await bookingService.getBookingMilestoneProgress('owner-1', { month: 3, year: 2026 });

    assert.equal(result.progress.value, 1000);
    assert.equal(result.progress.percentage, 100);
    assert.deepEqual(result.currentMilestone, {
        targetBookings: 1000,
        label: '3rd target',
        statusText: '3rd target completed',
    });
    assert.equal(result.nextMilestone, null);
});
