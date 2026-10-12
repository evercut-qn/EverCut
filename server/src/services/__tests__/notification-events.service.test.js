import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureRequiredEnv } from '../../__tests__/helpers/env.js';

ensureRequiredEnv();

const notificationEvents = (await import('../notifications/notification-events.service.js')).default;
const notificationService = (await import('../notifications/notification.service.js')).default;
const bookingRepository = (await import('../../repositories/booking.repository.js')).default;
const barberRepository = (await import('../../repositories/barber.repository.js')).default;
const customerRepository = (await import('../../repositories/customer.repository.js')).default;
const shopRepository = (await import('../../repositories/shop.repository.js')).default;
const ratingRepository = (await import('../../repositories/rating.repository.js')).default;

// Test IDs
const bookingId = '507f1f77bcf86cd799439011';
const shopId = '507f1f77bcf86cd799439012';
const customerId = '507f1f77bcf86cd799439013';
const customerUserId = '507f1f77bcf86cd799439014';
const barberUserId = '507f1f77bcf86cd799439015';
const paymentId = '507f1f77bcf86cd799439016';
const barberId = '507f1f77bcf86cd799439017';
const ratingId = '507f1f77bcf86cd799439018';
const payoutId = '507f1f77bcf86cd799439019';

// Setup common mocks
const setupCommonMocks = (t) => {
    t.mock.method(bookingRepository, 'findById', async () => ({
        _id: bookingId,
        customerId,
        shopId,
        date: new Date('2026-05-08T00:00:00.000Z'),
        time: '10:30',
        status: 'awaiting_confirmation',
        totalAmount: 450,
    }));
    t.mock.method(shopRepository, 'findById', async () => ({
        _id: shopId,
        barberId,
        shopName: 'EverCut Studio',
    }));
    t.mock.method(barberRepository, 'findById', async () => ({
        _id: barberId,
        userId: barberUserId,
    }));
    t.mock.method(customerRepository, 'findById', async () => ({
        _id: customerId,
        userId: customerUserId,
        firstName: 'Asha',
        lastName: 'Rao',
    }));
};

test('notifyBookingAwaitingConfirmation sends a deduped hybrid event to the shop owner', async (t) => {
    setupCommonMocks(t);

    let notificationPayload = null;
    t.mock.method(notificationService, 'notifyUser', async (payload) => {
        notificationPayload = payload;
        return { notification: { _id: 'notification-1' }, delivery: { successCount: 1 } };
    });

    const result = await notificationEvents.notifyBookingAwaitingConfirmation({
        bookingId,
        paymentId,
    });

    assert.equal(result.skipped, false);
    assert.equal(notificationPayload.recipientUserId, barberUserId);
    assert.equal(notificationPayload.actorUserId, customerUserId);
    assert.equal(notificationPayload.type, 'hybrid');
    assert.equal(notificationPayload.eventType, 'booking.awaiting_confirmation');
    assert.equal(notificationPayload.entityType, 'booking');
    assert.equal(notificationPayload.entityId, bookingId);
    assert.equal(notificationPayload.dedupeKey, `booking.awaiting_confirmation:${bookingId}:${paymentId}`);
    assert.deepEqual(notificationPayload.data, {
        bookingId,
        shopId,
        customerId,
        customerUserId,
        paymentId,
        status: 'awaiting_confirmation',
        date: '2026-05-08',
        time: '10:30',
        requiresFetch: true,
    });
});

test('notifyBookingConfirmed sends a confirmed event to the customer', async (t) => {
    setupCommonMocks(t);

    let notificationPayload = null;
    t.mock.method(notificationService, 'notifyUser', async (payload) => {
        notificationPayload = payload;
        return { notification: { _id: 'notification-2' }, delivery: { successCount: 1 } };
    });

    const result = await notificationEvents.notifyBookingConfirmed({
        bookingId,
        actorUserId: barberUserId,
    });

    assert.equal(result.skipped, false);
    assert.equal(notificationPayload.recipientUserId, customerUserId);
    assert.equal(notificationPayload.actorUserId, barberUserId);
    assert.equal(notificationPayload.eventType, 'booking.confirmed');
    assert.equal(notificationPayload.entityType, 'booking');
    assert.equal(notificationPayload.dedupeKey, `booking.confirmed:${bookingId}`);
});

test('notifyBookingCancelled sends a cancelled event to the shop owner if cancelled by customer', async (t) => {
    setupCommonMocks(t);

    let notificationPayload = null;
    t.mock.method(notificationService, 'notifyUser', async (payload) => {
        notificationPayload = payload;
        return { notification: { _id: 'notification-3' }, delivery: { successCount: 1 } };
    });

    const result = await notificationEvents.notifyBookingCancelled({
        bookingId,
        actorUserId: customerUserId,
        cancelledBy: 'customer',
        reason: 'Change of plans',
    });

    assert.equal(result.skipped, false);
    assert.equal(notificationPayload.recipientUserId, barberUserId);
    assert.equal(notificationPayload.actorUserId, customerUserId);
    assert.equal(notificationPayload.eventType, 'booking.cancelled');
    assert.equal(notificationPayload.data.cancelledBy, 'customer');
    assert.equal(notificationPayload.data.reason, 'Change of plans');
});

test('notifyBookingAutoCancelled sends an auto-cancelled event to the customer', async (t) => {
    setupCommonMocks(t);

    let notificationPayload = null;
    t.mock.method(notificationService, 'notifyUser', async (payload) => {
        notificationPayload = payload;
        return { notification: { _id: 'notification-4' }, delivery: { successCount: 1 } };
    });

    const result = await notificationEvents.notifyBookingAutoCancelled({
        bookingId,
    });

    assert.equal(result.skipped, false);
    assert.equal(notificationPayload.recipientUserId, customerUserId);
    assert.equal(notificationPayload.actorUserId, barberUserId);
    assert.equal(notificationPayload.eventType, 'booking.auto_cancelled');
});

test('notifyBookingEmployeeUnavailable sends an employee unavailable event to the customer', async (t) => {
    setupCommonMocks(t);

    let notificationPayload = null;
    t.mock.method(notificationService, 'notifyUser', async (payload) => {
        notificationPayload = payload;
        return { notification: { _id: 'notification-5' }, delivery: { successCount: 1 } };
    });

    const result = await notificationEvents.notifyBookingEmployeeUnavailable({
        bookingId,
        employeeId: '507f1f77bcf86cd799439020',
        employeeName: 'John Doe',
        date: '2026-05-08',
    });

    assert.equal(result.skipped, false);
    assert.equal(notificationPayload.recipientUserId, customerUserId);
    assert.equal(notificationPayload.eventType, 'booking.employee_unavailable');
    assert.equal(notificationPayload.data.employeeName, 'John Doe');
});

test('notifyBookingStatusChanged routes to status-specific methods', async (t) => {
    setupCommonMocks(t);

    let notificationPayload = null;
    t.mock.method(notificationService, 'notifyUser', async (payload) => {
        notificationPayload = payload;
        return { notification: { _id: 'notification-6' }, delivery: { successCount: 1 } };
    });

    // Case 1: Completed
    let result = await notificationEvents.notifyBookingStatusChanged({
        bookingId,
        status: 'completed',
        actorUserId: barberUserId,
    });
    assert.equal(result.skipped, false);
    assert.equal(notificationPayload.recipientUserId, customerUserId);
    assert.equal(notificationPayload.eventType, 'booking.completed');
    assert.equal(notificationPayload.title, 'Rate your visit');
    assert.equal(notificationPayload.data.reviewUrl, `https://evercut.in/ratings/new?bookingId=${bookingId}`);
    assert.equal(typeof notificationPayload.data.reviewExpiresAt, 'string');

    // Case 2: No-show (constants.js specifies 'no-show')
    result = await notificationEvents.notifyBookingStatusChanged({
        bookingId,
        status: 'no-show',
        actorUserId: barberUserId,
    });
    assert.equal(result.skipped, false);
    assert.equal(notificationPayload.recipientUserId, customerUserId);
    assert.equal(notificationPayload.eventType, 'booking.no_show');
});

test('notifyPaymentFailed sends a payment failed event to the customer', async (t) => {
    setupCommonMocks(t);

    let notificationPayload = null;
    t.mock.method(notificationService, 'notifyUser', async (payload) => {
        notificationPayload = payload;
        return { notification: { _id: 'notification-7' }, delivery: { successCount: 1 } };
    });

    const result = await notificationEvents.notifyPaymentFailed({
        bookingId,
        paymentId,
        reason: 'Insufficient funds',
    });

    assert.equal(result.skipped, false);
    assert.equal(notificationPayload.recipientUserId, customerUserId);
    assert.equal(notificationPayload.eventType, 'payment.failed');
    assert.equal(notificationPayload.data.paymentStatus, 'failed');
    assert.equal(notificationPayload.data.reason, 'Insufficient funds');
});

test('notifyRefundStatus sends refund status event to the customer', async (t) => {
    setupCommonMocks(t);

    let notificationPayload = null;
    t.mock.method(notificationService, 'notifyUser', async (payload) => {
        notificationPayload = payload;
        return { notification: { _id: 'notification-8' }, delivery: { successCount: 1 } };
    });

    const result = await notificationEvents.notifyRefundStatus({
        bookingId,
        paymentId,
        status: 'refunded',
        amountInRupees: 450,
    });

    assert.equal(result.skipped, false);
    assert.equal(notificationPayload.recipientUserId, customerUserId);
    assert.equal(notificationPayload.eventType, 'payment.refunded');
    assert.equal(notificationPayload.data.paymentStatus, 'refunded');
    assert.equal(notificationPayload.data.amountInRupees, 450);
});

test('notifyRatingReceived sends rating received event to shop owner', async (t) => {
    setupCommonMocks(t);

    t.mock.method(ratingRepository, 'findById', async () => ({
        _id: ratingId,
        customerId,
        shopId,
        rating: 5,
        createdAt: new Date(),
    }));

    let notificationPayload = null;
    t.mock.method(notificationService, 'notifyUser', async (payload) => {
        notificationPayload = payload;
        return { notification: { _id: 'notification-9' }, delivery: { successCount: 1 } };
    });

    const result = await notificationEvents.notifyRatingReceived({
        ratingId,
    });

    assert.equal(result.skipped, false);
    assert.equal(notificationPayload.recipientUserId, barberUserId);
    assert.equal(notificationPayload.eventType, 'rating.received');
    assert.equal(notificationPayload.data.rating, 5);
});

test('notifyRatingReply sends rating reply event to customer', async (t) => {
    setupCommonMocks(t);

    t.mock.method(ratingRepository, 'findById', async () => ({
        _id: ratingId,
        customerId,
        shopId,
        rating: 5,
        createdAt: new Date(),
    }));

    let notificationPayload = null;
    t.mock.method(notificationService, 'notifyUser', async (payload) => {
        notificationPayload = payload;
        return { notification: { _id: 'notification-10' }, delivery: { successCount: 1 } };
    });

    const result = await notificationEvents.notifyRatingReply({
        ratingId,
        actorUserId: barberUserId,
    });

    assert.equal(result.skipped, false);
    assert.equal(notificationPayload.recipientUserId, customerUserId);
    assert.equal(notificationPayload.eventType, 'rating.reply');
});

test('notifyAccountUpdated sends silent notification to user', async (t) => {
    let notificationPayload = null;
    t.mock.method(notificationService, 'notifyUser', async (payload) => {
        notificationPayload = payload;
        return { notification: { _id: 'notification-11' }, delivery: { successCount: 1 } };
    });

    const result = await notificationEvents.notifyAccountUpdated({
        userId: customerUserId,
        updateType: 'profile',
    });

    assert.notEqual(result.skipped, true);
    assert.equal(notificationPayload.recipientUserId, customerUserId);
    assert.equal(notificationPayload.type, 'silent');
    assert.equal(notificationPayload.eventType, 'account.updated');
});

test('notifyShopStatusUpdated sends silent notification to owner', async (t) => {
    let notificationPayload = null;
    t.mock.method(notificationService, 'notifyUser', async (payload) => {
        notificationPayload = payload;
        return { notification: { _id: 'notification-12' }, delivery: { successCount: 1 } };
    });

    const result = await notificationEvents.notifyShopStatusUpdated({
        ownerId: barberUserId,
        shopId,
        isOpen: true,
    });

    assert.notEqual(result.skipped, true);
    assert.equal(notificationPayload.recipientUserId, barberUserId);
    assert.equal(notificationPayload.type, 'silent');
    assert.equal(notificationPayload.eventType, 'shop.status_updated');
});

test('notifyPayoutStatus sends payout completed/failed event to barber', async (t) => {
    let notificationPayload = null;
    t.mock.method(notificationService, 'notifyUser', async (payload) => {
        notificationPayload = payload;
        return { notification: { _id: 'notification-13' }, delivery: { successCount: 1 } };
    });

    const result = await notificationEvents.notifyPayoutStatus({
        payoutId,
        barberId: barberUserId,
        status: 'SUCCESS', // constants.js PAYOUT_TRANSACTION_STATUS.SUCCESS is 'SUCCESS'
        amountInRupees: 1200,
    });

    assert.notEqual(result.skipped, true);
    assert.equal(notificationPayload.recipientUserId, barberUserId);
    assert.equal(notificationPayload.eventType, 'payout.completed');
    assert.equal(notificationPayload.data.amountInRupees, 1200);
});
