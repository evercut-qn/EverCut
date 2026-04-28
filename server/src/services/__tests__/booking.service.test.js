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

const bookingRepository = (await import('../../repositories/booking.repository.js')).default;
const employeeRepository = (await import('../../repositories/employee.repository.js')).default;
const shopRepository = (await import('../../repositories/shop.repository.js')).default;
const customerRepository = (await import('../../repositories/customer.repository.js')).default;
const serviceRepository = (await import('../../repositories/service.repository.js')).default;
const bookingService = await import('../booking.service.js');

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

test('bookSalon creates a pending booking that requires payment before confirmation', async (t) => {
    t.mock.method(customerRepository, 'findByUserId', async () => ({ _id: 'customer-1' }));

    t.mock.method(shopRepository, 'findByIdWithFields', async () => ({
        _id: 'shop-1',
        isOpen: true,
        openTime: '09:00',
        closeTime: '21:00',
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    }));

    t.mock.method(serviceRepository, 'findByIds', async () => ([
        {
            _id: 'service-1',
            shopId: 'shop-1',
            finalPrice: 120,
            serviceType: 'single',
            duration: 30,
        },
    ]));

    const originalClaimSlots = employeeRepository.claimSlots;
    if (!employeeRepository.claimSlots) employeeRepository.claimSlots = async () => null;
    t.after(() => {
        if (originalClaimSlots) employeeRepository.claimSlots = originalClaimSlots;
        else delete employeeRepository.claimSlots;
    });

    let capturedClaim = null;
    t.mock.method(employeeRepository, 'claimSlots', async (employeeId, date, times, options) => {
        capturedClaim = { employeeId, date, times, options };
        return {
            _id: employeeId,
        };
    });
    t.mock.method(employeeRepository, 'claimSlot', async () => {
        throw new Error('bookSalon should claim normalized slot markers with claimSlots');
    });

    const originalReleaseSlots = employeeRepository.releaseSlots;
    if (!employeeRepository.releaseSlots) employeeRepository.releaseSlots = async () => null;
    t.after(() => {
        if (originalReleaseSlots) employeeRepository.releaseSlots = originalReleaseSlots;
        else delete employeeRepository.releaseSlots;
    });

    let capturedRelease = null;
    t.mock.method(employeeRepository, 'releaseSlots', async (employeeId, date, times) => {
        capturedRelease = { employeeId, date, times };
        return { acknowledged: true };
    });

    t.mock.method(employeeRepository, 'releaseSlot', async () => {
        throw new Error('bookSalon should release normalized slot markers with releaseSlots');
    });

    let createdBookingPayload = null;
    t.mock.method(bookingRepository, 'create', async (payload) => {
        createdBookingPayload = payload;
        return {
            _id: 'booking-1',
            ...payload,
            status: payload.status,
            paymentStatus: payload.paymentStatus,
            payoutStatus: payload.payoutStatus,
        };
    });

    const result = await bookingService.bookSalon('user-1', {
        shopId: 'shop-1',
        employeeId: 'employee-1',
        serviceId: 'service-1',
        date: '2099-01-01',
        time: '10:00 AM',
    });

    assert.deepEqual(capturedClaim, {
        employeeId: 'employee-1',
        date: '2099-01-01',
        times: ['10:00'],
        options: { shopId: 'shop-1' },
    });
    assert.equal(capturedRelease, null);
    assert.deepEqual(createdBookingPayload, {
        customerId: 'customer-1',
        serviceIds: ['service-1'],
        employeeId: 'employee-1',
        shopId: 'shop-1',
        date: '2099-01-01',
        time: '10:00',
        totalAmount: 120,
        durationMinutes: 30,
        slotLockTimes: ['10:00'],
        status: 'pending',
        paymentStatus: 'pending',
        payoutStatus: 'not_initiated',
    });
    assert.equal(result.status, 'pending');
    assert.equal(result.paymentRequired, true);
    assert.equal(result.paymentStatus, 'pending');
    assert.equal(result.payoutStatus, 'not_initiated');
});

test('bookSalon claims every slot marker covered by the selected service duration', async (t) => {
    t.mock.method(customerRepository, 'findByUserId', async () => ({ _id: 'customer-1' }));

    t.mock.method(shopRepository, 'findByIdWithFields', async () => ({
        _id: 'shop-1',
        isOpen: true,
        openTime: '09:00',
        closeTime: '21:00',
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    }));

    t.mock.method(serviceRepository, 'findByIds', async () => ([
        {
            _id: 'service-1',
            shopId: 'shop-1',
            finalPrice: 120,
            serviceType: 'single',
            duration: 60,
        },
    ]));

    const originalClaimSlots = employeeRepository.claimSlots;
    if (!employeeRepository.claimSlots) employeeRepository.claimSlots = async () => null;
    t.after(() => {
        if (originalClaimSlots) employeeRepository.claimSlots = originalClaimSlots;
        else delete employeeRepository.claimSlots;
    });

    let claimedTimes = null;
    t.mock.method(employeeRepository, 'claimSlots', async (_employeeId, _date, times) => {
        claimedTimes = times;
        return {
            _id: 'employee-1',
        };
    });
    t.mock.method(employeeRepository, 'claimSlot', async () => {
        throw new Error('bookSalon should not use start-only claimSlot for duration-based bookings');
    });

    t.mock.method(bookingRepository, 'create', async (payload) => ({
        _id: 'employee-1',
        ...payload,
    }));

    await bookingService.bookSalon('user-1', {
        shopId: 'shop-1',
        employeeId: 'employee-1',
        serviceId: 'service-1',
        date: '2099-01-01',
        time: '10:00',
    });

    assert.deepEqual(claimedTimes, ['10:00', '10:30']);
});

test('updateBooking rejects paid bookings before releasing the existing slot', async (t) => {
    t.mock.method(bookingRepository, 'findById', async () => ({
        _id: 'booking-1',
        customerId: 'customer-1',
        employeeId: 'employee-1',
        shopId: 'shop-1',
        date: new Date('2099-01-01T00:00:00.000Z'),
        time: '10:00',
        status: 'awaiting_confirmation',
        paymentStatus: 'success',
        slotLockTimes: ['10:00'],
        durationMinutes: 30,
    }));
    t.mock.method(customerRepository, 'findByUserId', async () => ({ _id: 'customer-1' }));

    const releaseMock = t.mock.method(employeeRepository, 'releaseSlot', async () => {
        throw new Error('paid bookings should be rejected before releasing slots');
    });

    await assert.rejects(
        bookingService.updateBooking('booking-1', 'user-1', {
            employeeId: 'employee-1',
            date: '2099-01-02',
            time: '11:00',
        }),
        /cannot be changed after payment has started/i,
    );
    assert.equal(releaseMock.mock.calls.length, 0);
});

test('bookSalon rejects bundle bookings below the documented minimum service amount', async (t) => {
    t.mock.method(customerRepository, 'findByUserId', async () => ({ _id: 'customer-1' }));

    t.mock.method(shopRepository, 'findByIdWithFields', async () => ({
        _id: 'shop-1',
        isOpen: true,
        openTime: '09:00',
        closeTime: '21:00',
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    }));

    t.mock.method(serviceRepository, 'findByIds', async () => ([
        {
            _id: 'bundle-1',
            shopId: 'shop-1',
            finalPrice: 250,
            totalPrice: 250,
            serviceType: 'bundled',
            totalDuration: 90,
        },
    ]));

    t.mock.method(employeeRepository, 'claimSlot', async () => ({
        _id: 'employee-1',
    }));

    t.mock.method(bookingRepository, 'create', async (payload) => ({
        _id: 'booking-2',
        ...payload,
    }));

    await assert.rejects(
        bookingService.bookSalon('user-1', {
            shopId: 'shop-1',
            employeeId: 'employee-1',
            serviceId: 'bundle-1',
            date: '2099-01-02',
            time: '10:00 AM',
        }),
        /at least ₹300/,
    );
});

test('cancelBooking returns a customer-friendly manual-refund message when payout has started', async (t) => {
    t.mock.method(bookingRepository, 'findById', async () => ({
        _id: 'booking-1',
        customerId: 'customer-1',
        employeeId: 'employee-1',
        date: new Date('2099-01-01T00:00:00.000Z'),
        time: '10:00 AM',
        paymentStatus: 'success',
        payoutStatus: 'pending',
        status: 'confirmed',
    }));
    t.mock.method(customerRepository, 'findByUserId', async () => ({ _id: 'customer-1' }));

    t.mock.method(employeeRepository, 'releaseSlots', async () => ({ acknowledged: true }));

    let bookingUpdate = null;
    t.mock.method(bookingRepository, 'updateById', async (id, updates) => {
        bookingUpdate = updates;
        return { _id: id, ...updates };
    });

    const result = await bookingService.cancelBooking('booking-1', 'user-1');

    assert.equal(
        bookingUpdate.cancellationNote,
        'Refund window has closed. Please request a manual refund.',
    );
    assert.equal(
        result.cancellationNote,
        'Refund window has closed. Please request a manual refund.',
    );
});
