import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import config from '../../config/index.js';
import { serializeBooking, serializeBookingDetails } from '../booking.serializer.js';
import { serializeCustomerDirectoryItem, serializeCustomerProfile, serializeCustomerSummary } from '../customer.serializer.js';
import { serializeEmployee } from '../employee.serializer.js';
import { serializeNotification, serializeFcmTokenRegistration } from '../notification.serializer.js';
import { serializePayment, serializePaymentInitiation, serializePaymentStatus } from '../payment.serializer.js';
import { serializePayout } from '../payout.serializer.js';
import { serializeMedia } from '../media.serializer.js';
import { serializeRating } from '../rating.serializer.js';
import { serializeService } from '../service.serializer.js';
import { serializeBarberDirectoryItem, serializeBarberProfile, serializeShopProfile, serializeShopSummary } from '../shop.serializer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..', '..');

const ownIdAliasByResource = {
    booking: ['bookingId'],
    customerSummary: ['customerId'],
    customerProfile: ['customerId'],
    employee: ['employeeId'],
    notification: ['notificationId'],
    fcmToken: ['tokenId'],
    payment: ['paymentId'],
    paymentInitiation: ['paymentId'],
    paymentStatus: ['paymentId'],
    payout: ['payoutId'],
    media: ['mediaId'],
    rating: ['ratingId'],
    service: ['serviceId'],
    shopProfile: ['shopId'],
    shopSummary: ['shopId'],
    barberProfile: ['shopId'],
};

const assertNoOwnIdAliases = (resourceName, payload) => {
    const aliases = Object.keys(payload).filter((key) => ownIdAliasByResource[resourceName]?.includes(key));
    assert.deepEqual(aliases, [], `${resourceName} exposes own-id aliases: ${aliases.join(', ')}`);
};

test('resource serializers expose only id for each resource own identity', () => {
    const id = '507f1f77bcf86cd799439011';
    const shop = {
        _id: id,
        barberId: '507f1f77bcf86cd799439012',
        shopName: 'EverCut Studio',
        facilities: ['Wi-Fi'],
        availableDays: ['Monday'],
        openTime: '09:00',
        closeTime: '18:00',
        coverR2Key: 'images/covers/shop-1/cover.jpg',
    };
    const barber = {
        _id: '507f1f77bcf86cd799439012',
        firstName: 'Asha',
        lastName: 'Rao',
        gender: 'female',
        dateOfBirth: '1990-01-01',
        upiId: 'asha@upi',
        accountHolderName: 'Asha Rao',
        bankName: 'Ever Bank',
        bankAccount: '12345678901234',
        ifsc: 'HDFC0001234',
        photoR2Key: 'images/profiles/shop-1/owner.jpg',
    };

    const samples = {
        booking: serializeBooking({ _id: id, date: '2026-05-05', time: '10:00' }),
        customerSummary: serializeCustomerSummary({ _id: id, firstName: 'Mina', lastName: 'Shah' }),
        customerProfile: serializeCustomerProfile({ _id: id, firstName: 'Mina', lastName: 'Shah' }),
        employee: serializeEmployee({ _id: id, firstName: 'Dev', lastName: 'Patel' }),
        notification: serializeNotification({ _id: id, type: 'booking', eventType: 'booking.created', title: 'Title', body: 'Body' }),
        fcmToken: serializeFcmTokenRegistration({ _id: id, userId: id, platform: 'android' }),
        payment: serializePayment({ _id: id, status: 'initiated' }),
        paymentInitiation: serializePaymentInitiation({ payment: { _id: id, merchantOrderId: 'EC-1', amount: 100, amountInRupees: 1 }, bookingId: id }),
        paymentStatus: serializePaymentStatus({ payment: { _id: id, bookingId: id, merchantOrderId: 'EC-1', status: 'initiated' } }),
        payout: serializePayout({ _id: id }),
        media: serializeMedia({
            _id: id,
            type: 'image',
            status: 'ready',
            purpose: 'gallery',
            r2Key: 'images/gallery/shop-1/photo.jpg',
            contentType: 'image/jpeg',
            declaredSize: 128,
        }),
        rating: serializeRating({ _id: id, rating: 5 }),
        service: serializeService({ _id: id, serviceName: 'Haircut', serviceType: 'single', duration: 30 }),
        shopProfile: serializeShopProfile(shop, { barber, privateView: true }),
        shopSummary: serializeShopSummary(shop),
        barberProfile: serializeBarberProfile({
            barber,
            shop,
            user: { email: 'owner@example.com', phoneNumber: '+919999999999' },
        }),
    };

    for (const [resourceName, payload] of Object.entries(samples)) {
        assertNoOwnIdAliases(resourceName, payload);
    }

    assert.equal('photoUrl' in samples.media, false);
    assert.match(samples.media.url, /^https:\/\/.+\/images\/gallery\/shop-1\/photo\.jpg\?exp=/);

    // Double serialization check
    const doubleSerialized = serializeMedia(samples.media);
    assert.equal(doubleSerialized.url, samples.media.url, 'Double serialization should not lose the URL');
});

test('serializers do not duplicate populated relation ids beside relation objects', () => {
    const id = '507f1f77bcf86cd799439011';
    const booking = serializeBooking({
        _id: id,
        customerId: { _id: '507f1f77bcf86cd799439012', firstName: 'Mina' },
        shopId: { _id: '507f1f77bcf86cd799439013', shopName: 'EverCut Studio' },
        employeeId: { _id: '507f1f77bcf86cd799439014', firstName: 'Dev' },
        serviceIds: [{ _id: '507f1f77bcf86cd799439015', serviceName: 'Haircut' }],
    });

    assert.ok(booking.customer);
    assert.ok(booking.shop);
    assert.ok(booking.employee);
    assert.ok(booking.services.length > 0);
    assert.equal('customerId' in booking, false);
    assert.equal('shopId' in booking, false);
    assert.equal('employeeId' in booking, false);
    assert.equal('serviceIds' in booking, false);

    const payment = serializePayment({
        _id: id,
        bookingId: { _id: '507f1f77bcf86cd799439016', date: '2026-05-05' },
        customerId: { _id: '507f1f77bcf86cd799439017', firstName: 'Mina' },
        shopId: { _id: '507f1f77bcf86cd799439018', shopName: 'EverCut Studio' },
    });

    assert.ok(payment.booking);
    assert.ok(payment.customer);
    assert.ok(payment.shop);
    assert.equal('bookingId' in payment, false);
    assert.equal('customerId' in payment, false);
    assert.equal('shopId' in payment, false);
});

test('serializers do not fall back to retired legacy media URL fields', () => {
    const id = '507f1f77bcf86cd799439011';

    assert.equal(
        serializeShopSummary({ _id: id, shopName: 'Legacy Shop', coverUrl: 'https://legacy.example/cover.jpg' }).coverUrl,
        null,
    );
    assert.equal(
        serializeShopProfile({
            _id: id,
            shopName: 'Legacy Shop',
            ownerPhotoUrl: 'https://legacy.example/owner.jpg',
            coverUrl: 'https://legacy.example/cover.jpg',
        }, { privateView: true }).coverUrl,
        null,
    );
    assert.equal(
        serializeEmployee({ _id: id, firstName: 'Dev', lastName: 'Patel', photoUrl: 'https://legacy.example/employee.jpg' }).photoUrl,
        null,
    );
    assert.equal(
        serializeCustomerProfile({ _id: id, firstName: 'Mina', lastName: 'Shah', photoUrl: 'https://legacy.example/customer.jpg' }).photoUrl,
        null,
    );
});

test('booking serializer adds employee availability for the booking date without exposing blockedDates', () => {
    const booking = serializeBooking({
        _id: '507f1f77bcf86cd799439011',
        date: '2026-06-15',
        time: '10:00',
        employeeId: {
            _id: '507f1f77bcf86cd799439014',
            firstName: 'Dev',
            lastName: 'Patel',
            blockedDates: [new Date('2026-06-15T00:00:00.000Z')],
        },
    });

    assert.equal(booking.employee.isAvailableOnBookingDate, false);
    assert.equal('blockedDates' in booking.employee, false);
});

test('booking serializer preserves nested media keys long enough to build public URLs', () => {
    const booking = serializeBooking({
        _id: '507f1f77bcf86cd799439011',
        date: '2026-05-30',
        customerId: {
            _id: '507f1f77bcf86cd799439012',
            firstName: 'Mina',
            photoR2Key: 'images/customers/customer-1.png',
        },
        employeeId: {
            _id: '507f1f77bcf86cd799439014',
            firstName: 'Dev',
            lastName: 'Patel',
            photoR2Key: 'images/employees/employee-1.png',
            blockedDates: [],
        },
        shopId: {
            _id: '507f1f77bcf86cd799439013',
            shopName: 'EverCut Studio',
            coverR2Key: 'images/shops/shop-1.png',
        },
        serviceIds: [
            {
                _id: '507f1f77bcf86cd799439015',
                serviceName: 'Haircut',
                serviceType: 'single',
                serviceFor: 'men',
                imageR2Key: 'images/services/haircut.png',
                duration: 30,
                actualPrice: 500,
                offerPrice: 50,
                finalPrice: 450,
            },
        ],
    });

    assert.match(booking.customer.photoUrl, /images\/customers\/customer-1\.png/);
    assert.match(booking.employee.photoUrl, /images\/employees\/employee-1\.png/);
    assert.match(booking.shop.coverUrl, /images\/shops\/shop-1\.png/);
    assert.match(booking.services[0].imageUrl, /images\/services\/haircut\.png/);
    assert.equal('photoR2Key' in booking.employee, false);
    assert.equal('coverR2Key' in booking.shop, false);
    assert.equal('imageR2Key' in booking.services[0], false);
});

test('booking serializer keeps bare ObjectId refs as ids instead of empty relation objects', () => {
    const objectId = {
        _bsontype: 'ObjectId',
        toHexString: () => '507f1f77bcf86cd799439013',
    };

    const booking = serializeBooking({
        _id: '507f1f77bcf86cd799439011',
        customerId: objectId,
        shopId: objectId,
        employeeId: objectId,
    });

    assert.equal(booking.customerId, '507f1f77bcf86cd799439013');
    assert.equal(booking.shopId, '507f1f77bcf86cd799439013');
    assert.equal(booking.employeeId, '507f1f77bcf86cd799439013');
    assert.equal('customer' in booking, false);
    assert.equal('shop' in booking, false);
    assert.equal('employee' in booking, false);
});

test('admin directory and payout serializers expose complete admin-visible contact and payout fields', () => {
    const customer = serializeCustomerDirectoryItem({
        _id: '507f1f77bcf86cd799439011',
        firstName: 'Mina',
        lastName: 'Shah',
        totalBookings: 3,
        user: {
            _id: '507f1f77bcf86cd799439012',
            email: 'mina@example.com',
            phoneNumber: '+919876543210',
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
        },
    });
    const barber = serializeBarberDirectoryItem({
        _id: '507f1f77bcf86cd799439013',
        firstName: 'Asha',
        lastName: 'Rao',
        upiId: 'asha.rao@upi',
        payoutConfig: { beneficiaryId: 'BARBER_123', verificationStatus: 'verified' },
        user: { _id: '507f1f77bcf86cd799439014', isActive: true },
        shop: {
            _id: '507f1f77bcf86cd799439015',
            shopName: 'Trim Studio',
            isOpen: true,
        },
    });
    const payout = serializePayout({
        _id: '507f1f77bcf86cd799439016',
        barberId: {
            _id: '507f1f77bcf86cd799439017',
            firstName: 'Asha',
            upiId: 'asha.rao@upi',
        },
    });

    assert.equal(customer.contact.phoneNumber, '+919876543210');
    assert.equal(customer.contact.email, 'mina@example.com');
    assert.equal(barber.payout.upiId, 'asha.rao@upi');
    assert.equal(payout.barber.upiId, 'asha.rao@upi');
});

test('admin booking serializer prefers business display relations over raw ids', () => {
    const booking = serializeBooking({
        _id: '507f1f77bcf86cd799439011',
        customerId: {
            _bsontype: 'ObjectId',
            toHexString: () => '507f1f77bcf86cd799439012',
        },
        shopId: {
            _bsontype: 'ObjectId',
            toHexString: () => '507f1f77bcf86cd799439013',
        },
        employeeId: {
            _bsontype: 'ObjectId',
            toHexString: () => '507f1f77bcf86cd799439014',
        },
        customer: {
            _id: '507f1f77bcf86cd799439012',
            firstName: 'Mina',
            lastName: 'Shah',
        },
        customerUser: {
            _id: '507f1f77bcf86cd799439020',
            phoneNumber: '+919876543210',
            email: 'mina@example.com',
        },
        shop: {
            _id: '507f1f77bcf86cd799439013',
            shopName: 'EverCut Studio',
        },
        employee: {
            _id: '507f1f77bcf86cd799439014',
            firstName: 'Dev',
            lastName: 'Patel',
        },
        barber: {
            _id: '507f1f77bcf86cd799439015',
            firstName: 'Asha',
            lastName: 'Rao',
        },
        services: [
            {
                _id: '507f1f77bcf86cd799439016',
                serviceName: 'Haircut',
                serviceType: 'single',
                duration: 30,
                finalPrice: 450,
            },
        ],
    }, { includeCustomerContact: true, includeBarber: true });

    assert.equal(booking.customer.firstName, 'Mina');
    assert.equal(booking.customer.contact.phoneNumber, '+919876543210');
    assert.equal(booking.shop.shopName, 'EverCut Studio');
    assert.equal(booking.employee.firstName, 'Dev');
    assert.equal(booking.barber.fullName, 'Asha Rao');
    assert.equal(booking.services[0].serviceName, 'Haircut');
    assert.equal('customerId' in booking, false);
    assert.equal('shopId' in booking, false);
});

test('booking serializer exposes service amount and payable total when payment is populated', () => {
    const serviceAmount = 199;
    const platformFee = config.payment.platformFeeSingle;
    const booking = serializeBooking({
        _id: '507f1f77bcf86cd799439011',
        totalAmount: serviceAmount,
        paymentTransactionId: {
            _id: '507f1f77bcf86cd799439022',
            amount: (serviceAmount + platformFee) * 100,
            amountInRupees: serviceAmount + platformFee,
            settlement: {
                serviceAmount: serviceAmount * 100,
                platformFee: platformFee * 100,
                barberPayout: serviceAmount * 100,
                isBundle: false,
            },
        },
    });

    assert.equal(booking.serviceAmount, serviceAmount);
    assert.equal(booking.platformFee, platformFee);
    assert.equal(booking.totalAmount, serviceAmount + platformFee);
});

test('serializers no longer export deprecated API aliases', async () => {
    const shopSerializer = await readFile(path.join(srcDir, 'serializers', 'shop.serializer.js'), 'utf8');
    const barberProfileUtils = await readFile(path.join(srcDir, 'utils', 'barber-profile.utils.js'), 'utf8');
    const coreSerializer = await readFile(path.join(srcDir, 'serializers', 'core.serializer.js'), 'utf8');

    assert.doesNotMatch(shopSerializer, /serializeUpiDetails/);
    assert.doesNotMatch(shopSerializer, /serializePayoutConfig/);
    assert.doesNotMatch(barberProfileUtils, /serializeUpiDetails/);
    assert.doesNotMatch(barberProfileUtils, /serializePayoutConfig/);
    assert.doesNotMatch(coreSerializer, /serializeList/);
});

test('booking details serializer fallback and nullish logic', () => {
    const bookingId = '507f1f77bcf86cd799439011';
    const paymentTxId = '507f1f77bcf86cd799439022';
    const payoutTxId = '507f1f77bcf86cd799439033';

    // 1. booking value present (preferred root values over transactions)
    const detailsWithRootValues = {
        _id: bookingId,
        merchantOrderId: 'root-merchant-order-id',
        paymentMode: 'root-payment-mode',
        paidAt: '2026-06-01T10:00:00Z',
        barberUtr: 'root-barber-utr',
        payoutCompletedAt: '2026-06-02T10:00:00Z',
        paymentTransactionId: {
            _id: paymentTxId,
            merchantOrderId: 'tx-merchant-order-id',
            paymentMode: 'tx-payment-mode',
            status: 'completed',
            createdAt: '2026-06-01T11:00:00Z',
        },
        payoutTransactionId: {
            _id: payoutTxId,
            utr: 'tx-utr',
            processedAt: '2026-06-02T11:00:00Z',
        },
    };

    const res1 = serializeBookingDetails(detailsWithRootValues);
    assert.equal(res1.merchantOrderId, 'root-merchant-order-id');
    assert.equal(res1.paymentMode, 'root-payment-mode');
    assert.equal(res1.paidAt, '2026-06-01T10:00:00Z');
    assert.equal(res1.barberUtr, 'root-barber-utr');
    assert.equal(res1.payoutCompletedAt, '2026-06-02T10:00:00Z');

    // 2. booking value missing + transaction fallback
    const detailsWithFallback = {
        _id: bookingId,
        paymentTransactionId: {
            _id: paymentTxId,
            merchantOrderId: 'tx-merchant-order-id',
            paymentMode: 'tx-payment-mode',
            status: 'completed',
            createdAt: '2026-06-01T11:00:00Z',
        },
        payoutTransactionId: {
            _id: payoutTxId,
            utr: 'tx-utr',
            processedAt: '2026-06-02T11:00:00Z',
        },
    };

    const res2 = serializeBookingDetails(detailsWithFallback);
    assert.equal(res2.merchantOrderId, 'tx-merchant-order-id');
    assert.equal(res2.paymentMode, 'tx-payment-mode');
    assert.equal(res2.paidAt, '2026-06-01T11:00:00Z');
    assert.equal(res2.barberUtr, 'tx-utr');
    assert.equal(res2.payoutCompletedAt, '2026-06-02T11:00:00Z');

    // 3. payment transaction fallback only for 'completed' or 'refunded'
    const detailsWithPendingPayment = {
        _id: bookingId,
        paymentTransactionId: {
            _id: paymentTxId,
            merchantOrderId: 'tx-merchant-order-id',
            paymentMode: 'tx-payment-mode',
            status: 'pending',
            createdAt: '2026-06-01T11:00:00Z',
        },
    };

    const res3 = serializeBookingDetails(detailsWithPendingPayment);
    assert.equal(res3.merchantOrderId, 'tx-merchant-order-id');
    assert.equal(res3.paymentMode, 'tx-payment-mode');
    assert.equal(res3.paidAt, null, 'paidAt must be null when status is not completed/refunded');

    const detailsWithRefundedPayment = {
        _id: bookingId,
        paymentTransactionId: {
            _id: paymentTxId,
            merchantOrderId: 'tx-merchant-order-id',
            paymentMode: 'tx-payment-mode',
            status: 'refunded',
            createdAt: '2026-06-01T11:00:00Z',
        },
    };
    const res3b = serializeBookingDetails(detailsWithRefundedPayment);
    assert.equal(res3b.paidAt, '2026-06-01T11:00:00Z', 'paidAt must populate for refunded status');

    // 4. missing transaction references (just IDs/strings)
    const detailsWithPlainIds = {
        _id: bookingId,
        paymentTransactionId: paymentTxId,
        payoutTransactionId: payoutTxId,
    };

    const res4 = serializeBookingDetails(detailsWithPlainIds);
    assert.equal(res4.paymentTransactionId, paymentTxId);
    assert.equal(res4.payoutTransactionId, payoutTxId);
    assert.equal(res4.merchantOrderId, null);
    assert.equal(res4.paymentMode, null);
    assert.equal(res4.paidAt, null);
    assert.equal(res4.barberUtr, null);
    assert.equal(res4.payoutCompletedAt, null);

    // 5. null values handled correctly
    const detailsWithNulls = {
        _id: bookingId,
        merchantOrderId: null,
        paymentMode: null,
        paidAt: null,
        barberUtr: null,
        payoutCompletedAt: null,
        paymentTransactionId: null,
        payoutTransactionId: null,
    };

    const res5 = serializeBookingDetails(detailsWithNulls);
    assert.equal(res5.merchantOrderId, null);
    assert.equal(res5.paymentMode, null);
    assert.equal(res5.paidAt, null);
    assert.equal(res5.barberUtr, null);
    assert.equal(res5.payoutCompletedAt, null);
    assert.equal(res5.paymentTransactionId, null);
    assert.equal(res5.payoutTransactionId, null);

    // 6. undefined values handled correctly
    const detailsWithUndefineds = {
        _id: bookingId,
        merchantOrderId: undefined,
        paymentMode: undefined,
        paidAt: undefined,
        barberUtr: undefined,
        payoutCompletedAt: undefined,
        paymentTransactionId: undefined,
        payoutTransactionId: undefined,
    };

    const res6 = serializeBookingDetails(detailsWithUndefineds);
    assert.equal(res6.merchantOrderId, null);
    assert.equal(res6.paymentMode, null);
    assert.equal(res6.paidAt, null);
    assert.equal(res6.barberUtr, null);
    assert.equal(res6.payoutCompletedAt, null);
    assert.equal(res6.paymentTransactionId, null);
    assert.equal(res6.payoutTransactionId, null);
});
