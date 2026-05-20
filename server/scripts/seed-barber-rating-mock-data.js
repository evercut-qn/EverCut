/**
 * seed-barber-rating-mock-data.js
 *
 * Seeds realistic mock data for barber rating route testing.
 *
 * What this script does:
 *   1. Creates or updates the mock barber user in MongoDB
 *   2. Creates or updates the barber shop owned by that user
 *   3. Creates mock customers
 *   4. Resets the mock shop's employees, services, bookings, and ratings
 *   5. Creates one employee, one service, three completed bookings, and three ratings
 *   6. Prints a summary of the seeded IDs to the console
 *
 * Usage:
 *   node scripts/seed-barber-rating-mock-data.js
 *
 * Output:
 *   Console output with the generated shop, booking, and rating IDs
 */

import connectDB, { disconnectDB } from '../src/config/database.config.js';
import User from '../src/models/user.model.js';
import Barber from '../src/models/barber.model.js';
import Shop from '../src/models/shop.model.js';
import Customer from '../src/models/customer.model.js';
import Employee from '../src/models/employee.model.js';
import Service from '../src/models/service.model.js';
import Booking from '../src/models/booking.model.js';
import Rating from '../src/models/rating.model.js';
import { hashPin } from '../src/services/pin.service.js';
import { BOOKING_STATUS, PAYMENT_STATUS, ROLES } from '../src/utils/constants.js';
import { buildSlotLockTimes } from '../src/utils/slot-lock.utils.js';
import { buildTimeRange } from '../src/utils/time.utils.js';

const BARBER_FIXTURE = {
    phoneNumber: '+919876543211',
    email: 'test.barber@example.com',
    roleType: ROLES.BARBER,
};

const CUSTOMER_FIXTURES = [
    {
        key: 'addReply',
        phoneNumber: '+919876551001',
        email: 'mock.rating.customer.001@example.com',
        profile: {
            firstName: 'Ava',
            lastName: 'Replyless',
            gender: 'female',
            dateOfBirth: new Date('1996-04-12'),
            address: '101 Rating Fixture Street',
            location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        },
        booking: {
            date: new Date('2026-03-02T00:00:00.000Z'),
            time: '10:00 AM',
            totalAmount: 350,
        },
        rating: {
            rating: 5,
            review: '[ADD_REPLY_TARGET] Customer praised the haircut and left no reply target yet.',
        },
    },
    {
        key: 'updateReply',
        phoneNumber: '+919876551002',
        email: 'mock.rating.customer.002@example.com',
        profile: {
            firstName: 'Ben',
            lastName: 'Updated',
            gender: 'male',
            dateOfBirth: new Date('1994-06-21'),
            address: '102 Rating Fixture Street',
            location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        },
        booking: {
            date: new Date('2026-03-03T00:00:00.000Z'),
            time: '11:30 AM',
            totalAmount: 350,
        },
        rating: {
            rating: 4,
            review: '[UPDATE_REPLY_TARGET] Customer liked the service and already has a seeded barber reply.',
            replyText: 'Thanks for visiting. This seeded reply is here for update and delete tests.',
        },
    },
    {
        key: 'removeRating',
        phoneNumber: '+919876551003',
        email: 'mock.rating.customer.003@example.com',
        profile: {
            firstName: 'Cara',
            lastName: 'Delete',
            gender: 'female',
            dateOfBirth: new Date('1991-11-05'),
            address: '103 Rating Fixture Street',
            location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        },
        booking: {
            date: new Date('2026-03-04T00:00:00.000Z'),
            time: '01:00 PM',
            totalAmount: 350,
        },
        rating: {
            rating: 2,
            review: '[REMOVE_RATING_TARGET] Customer reported a poor experience for delete-route testing.',
        },
    },
];

const EMPLOYEE_FIXTURE = {
    firstName: 'Marco',
    lastName: 'Fixture',
    phoneNumber: '+15550999001',
    gender: 'male',
    dateOfBirth: new Date('1992-09-09'),
    photoR2Key: 'images/employees/mock-shop/mock-employee-photo.jpg',
    workingHours: {
        start: '09:00',
        end: '20:00',
    },
};

const SERVICE_FIXTURE = {
    serviceName: 'Mock Signature Haircut',
    serviceType: 'single',
    serviceFor: 'men',
    imageR2Key: 'images/services/default/service.jpg',
    duration: 45,
    actualPrice: 400,
    offerPrice: 50,
    finalPrice: 350,
};

const withDeleted = (query) => query.setOptions({ includeDeleted: true });

const upsertUser = async ({ phoneNumber, email, roleType }) => {
    let user = await withDeleted(User.findOne({ phoneNumber }));

    if (!user) {
        user = await User.create({ phoneNumber, email, roleType });
        return user;
    }

    user.phoneNumber = phoneNumber;
    user.email = email;
    user.roleType = roleType;
    user.isActive = true;
    user.deletedAt = null;
    await user.save();
    return user;
};

const upsertCustomer = async (userId, profileFixture) => {
    let customer = await Customer.findOne({ userId });

    if (!customer) {
        customer = await Customer.create({ userId, ...profileFixture });
        return customer;
    }

    Object.assign(customer, profileFixture);
    await customer.save();
    return customer;
};

const upsertBarber = async (userId) => {
    const pinHash = await hashPin('1234');
    let barber = await withDeleted(Barber.findOne({ userId }));

    const barberPayload = {
        userId,
        firstName: 'Test',
        lastName: 'Barber',
        gender: 'male',
        dateOfBirth: new Date('1990-01-15'),
        yearsOfExperience: 8,
        upiId: 'evercut.mock@upi',
        accountHolderName: 'Test Barber Owner',
        bankName: 'Mock Bank',
        bankAccount: '12345678901234',
        ifsc: 'HDFC0001234',
        payoutConfig: { verificationStatus: 'pending' },
        pinHash,
        deletedAt: null,
    };

    if (!barber) {
        barber = await Barber.create(barberPayload);
        return barber;
    }

    Object.assign(barber, barberPayload);
    await barber.save();
    return barber;
};

const upsertShop = async (barberId) => {
    let shop = await withDeleted(Shop.findOne({ barberId }));

    const shopPayload = {
        barberId,
        shopName: 'EverCut Barber Rating Mock Shop',
        category: 'Barber Shop',
        targetCustomers: 'men',
        bio: 'Seeded barber shop used for barber rating route testing.',
        address: '500 Mock Data Avenue',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        numberOfEmployees: 1,
        facilities: ['Air Conditioning', 'Waiting Area'],
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        openTime: '09:00',
        closeTime: '20:00',
        breakTimes: [{ start: '13:00', end: '14:00' }],
        coverR2Key: 'images/covers/mock-shop/mock-shop-cover.jpg',
        isOpen: true,
        deletedAt: null,
    };

    if (!shop) {
        shop = await Shop.create(shopPayload);
        return shop;
    }

    Object.assign(shop, shopPayload);
    await shop.save();
    return shop;
};

const resetShopFixtures = async (shopId) => {
    await Promise.all([
        Rating.deleteMany({ shopId }),
        Booking.deleteMany({ shopId }),
        Employee.deleteMany({ shopId }),
        Service.deleteMany({ shopId }),
    ]);
};

const createEmployee = async (shopId, bookedSlots) => {
    return Employee.create({
        shopId,
        ...EMPLOYEE_FIXTURE,
        bookedSlots,
        blockedDates: [],
        isActive: true,
        deletedAt: null,
    });
};

const createService = async (shopId) => {
    return Service.create({
        shopId,
        ...SERVICE_FIXTURE,
        isActive: true,
        deletedAt: null,
    });
};

const createBookingsAndRatings = async (shop, barberUser, employee, service, customers) => {
    const fixtures = {};

    for (const customer of customers) {
        const durationMinutes = Number(service.duration) || 30;
        const timeRange = buildTimeRange(customer.fixture.booking.time, durationMinutes);
        const booking = await Booking.create({
            customerId: customer.profile._id,
            shopId: shop._id,
            employeeId: employee._id,
            serviceIds: [service._id],
            date: customer.fixture.booking.date,
            time: timeRange.startTime,
            endTime: timeRange.endTime,
            startMinute: timeRange.startMinute,
            endMinute: timeRange.endMinute,
            totalAmount: customer.fixture.booking.totalAmount,
            durationMinutes,
            slotLockTimes: buildSlotLockTimes(timeRange.startTime, durationMinutes),
            status: BOOKING_STATUS.COMPLETED,
            paymentStatus: PAYMENT_STATUS.SUCCESS,
        });

        const ratingPayload = {
            customerId: customer.profile._id,
            shopId: shop._id,
            rating: customer.fixture.rating.rating,
            review: customer.fixture.rating.review,
        };

        if (customer.fixture.rating.replyText) {
            ratingPayload.reply = {
                text: customer.fixture.rating.replyText,
                repliedAt: new Date('2026-03-05T10:00:00.000Z'),
                repliedBy: barberUser._id,
            };
        }

        const rating = await Rating.create(ratingPayload);

        fixtures[customer.fixture.key] = {
            customer: customer.user,
            profile: customer.profile,
            booking,
            rating,
        };
    }

    return fixtures;
};

const main = async () => {
    await connectDB();

    try {
        const barberUser = await upsertUser(BARBER_FIXTURE);
        const barber = await upsertBarber(barberUser._id);
        const shop = await upsertShop(barber._id);

        const customers = [];
        for (const fixture of CUSTOMER_FIXTURES) {
            const user = await upsertUser({
                phoneNumber: fixture.phoneNumber,
                email: fixture.email,
                roleType: ROLES.CUSTOMER,
            });
            const profile = await upsertCustomer(user._id, fixture.profile);
            customers.push({ fixture, user, profile });
        }

        await resetShopFixtures(shop._id);

        const bookedSlots = customers.map(({ fixture }) => ({
            date: fixture.booking.date.toISOString().slice(0, 10),
            time: fixture.booking.time,
        }));

        const employee = await createEmployee(shop._id, bookedSlots);
        const service = await createService(shop._id);
        const fixtureRecords = await createBookingsAndRatings(shop, barberUser, employee, service, customers);

        const summary = {
            generatedAt: new Date().toISOString(),
            note: 'Use this data only against a dev or test database. Running the seed again resets the mock bookings and ratings for the seeded barber shop.',
            auth: {
                email: BARBER_FIXTURE.email,
                phoneNumber: BARBER_FIXTURE.phoneNumber,
                otpLoginMobile: '9876543211',
                instructions: 'Use the OTP authentication flow for mobile 9876543211 in test mode, or run the authentication Postman collection, to obtain the barber access token for these seeded ratings.',
            },
            shop: {
                userId: barberUser._id.toString(),
                barberId: barber._id.toString(),
                shopId: shop._id.toString(),
                shopName: shop.shopName,
            },
            employee: {
                employeeId: employee._id.toString(),
                name: `${employee.firstName} ${employee.lastName}`,
            },
            service: {
                serviceId: service._id.toString(),
                serviceName: service.serviceName,
                finalPrice: service.finalPrice,
            },
            customers: customers.map(({ fixture, user, profile }) => ({
                key: fixture.key,
                userId: user._id.toString(),
                customerId: profile._id.toString(),
                email: user.email,
                phoneNumber: user.phoneNumber,
                name: `${profile.firstName} ${profile.lastName}`,
            })),
            bookings: Object.fromEntries(
                Object.entries(fixtureRecords).map(([key, value]) => [key, {
                    bookingId: value.booking._id.toString(),
                    customerEmail: value.customer.email,
                    date: value.booking.date.toISOString().slice(0, 10),
                    time: value.booking.time,
                    status: value.booking.status,
                    paymentStatus: value.booking.paymentStatus,
                    totalAmount: value.booking.totalAmount,
                }]),
            ),
            ratings: {
                addReply: {
                    ratingId: fixtureRecords.addReply.rating._id.toString(),
                    customerEmail: fixtureRecords.addReply.customer.email,
                    review: fixtureRecords.addReply.rating.review,
                    hasReply: false,
                },
                updateReply: {
                    ratingId: fixtureRecords.updateReply.rating._id.toString(),
                    customerEmail: fixtureRecords.updateReply.customer.email,
                    review: fixtureRecords.updateReply.rating.review,
                    hasReply: true,
                    replyText: fixtureRecords.updateReply.rating.reply.text,
                },
                removeRating: {
                    ratingId: fixtureRecords.removeRating.rating._id.toString(),
                    customerEmail: fixtureRecords.removeRating.customer.email,
                    review: fixtureRecords.removeRating.rating.review,
                    hasReply: false,
                },
            },
        };

        console.log(JSON.stringify(summary, null, 2));
        console.log('\nMock data seeded successfully.');
    } finally {
        await disconnectDB();
    }
};

main().catch(async (error) => {
    console.error(error);
    await disconnectDB();
    process.exit(1);
});
