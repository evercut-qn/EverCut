import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { serializeBooking } from '../booking.serializer.js';
import { serializeCustomerProfile, serializeCustomerSummary } from '../customer.serializer.js';
import { serializeEmployee } from '../employee.serializer.js';
import { serializeNotification, serializeFcmTokenRegistration } from '../notification.serializer.js';
import { serializePayment, serializePaymentInitiation, serializePaymentStatus } from '../payment.serializer.js';
import { serializePayout } from '../payout.serializer.js';
import { serializeMedia } from '../media.serializer.js';
import { serializeRating } from '../rating.serializer.js';
import { serializeService } from '../service.serializer.js';
import { serializeBarberProfile, serializeShopProfile, serializeShopSummary } from '../shop.serializer.js';

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
        shopName: 'EverCut Studio',
        ownerName: 'Asha Rao',
        ownerFirstName: 'Asha',
        ownerLastName: 'Rao',
        ownerGender: 'Female',
        ownerDateOfBirth: '1990-01-01',
        facilities: ['Wi-Fi'],
        availableDays: ['Monday'],
        openTime: '09:00',
        closeTime: '18:00',
        upiId: 'asha@upi',
        accountHolderName: 'Asha Rao',
        bankName: 'Ever Bank',
        coverR2Key: 'images/covers/shop-1/cover.jpg',
        ownerPhotoR2Key: 'images/profiles/shop-1/owner.jpg',
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
        shopProfile: serializeShopProfile(shop, { privateView: true }),
        shopSummary: serializeShopSummary(shop),
        barberProfile: serializeBarberProfile(shop, { email: 'owner@example.com', phoneNumber: '+919999999999' }),
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
                serviceFor: 'male',
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
