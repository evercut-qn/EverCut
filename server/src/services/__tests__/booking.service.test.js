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
