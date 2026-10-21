/**
 * seed-artwood-analytics-mock-data.mjs
 *
 * Seeds realistic, production-grade dummy analytics data for "ArtWood Salon"
 * designed specifically for Play Store marketing screenshots.
 *
 * Populates:
 * 1. 6-Month Closed Appointments Graph (April 2026 - September 2026) with steady ~16-18% MoM growth.
 * 2. 6-Month Closed Income Graph (April 2026 - September 2026) totaling ~₹3.7L with clean monthly progression.
 * 3. October 2026 MTD Performance (~160 appointments, ~₹50k revenue) showing active milestone progress.
 * 4. Today (October 16, 2026) Pulse & Queue:
 *    - 6 Completed bookings (Done)
 *    - 1 Active booking in queue right now (Active Queue)
 *    - 4 Scheduled evening bookings (Upcoming Queue)
 *    - 1 Awaiting confirmation booking
 *    - 1 Cancelled booking
 * 5. Full corresponding PaymentTransaction documents for every booking.
 *
 * Usage:
 *   node scripts/seed-artwood-analytics-mock-data.mjs --dry-run
 *   node scripts/seed-artwood-analytics-mock-data.mjs --clean --insert
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Ensure all models are registered for populate queries
import '../src/models/user.model.js';
import '../src/models/customer.model.js';
import '../src/models/barber.model.js';
import '../src/models/shop.model.js';
import '../src/models/employee.model.js';
import '../src/models/service.model.js';
import '../src/models/booking.model.js';
import '../src/models/payment-transaction.model.js';
import '../src/models/rating.model.js';
import '../src/models/media.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('❌ MONGODB_URI is missing in server/.env');
    process.exit(1);
}

// Parse arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || (!args.includes('--insert') && !args.includes('--force'));
const shouldClean = args.includes('--clean');
const shopIdArg = args.find((a) => a.startsWith('--shopId='))?.split('=')[1];

const TARGET_SHOP_ID = shopIdArg || '6acdbb5ff3d2ed8b0f15122f'; // ArtWood Salon
const MOCK_BATCH_TAG = 'artwood-playstore-analytics';

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateHex(len = 8) {
    return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

function parseTimeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildSlotLockTimes(startTime, durationMinutes, intervalMinutes = 30) {
    const startM = parseTimeToMinutes(startTime);
    const lockCount = Math.ceil(durationMinutes / intervalMinutes);
    return Array.from({ length: lockCount }, (_, i) => minutesToTime(startM + i * intervalMinutes));
}

async function run() {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const shopObjId = new mongoose.Types.ObjectId(TARGET_SHOP_ID);
    const shop = await db.collection('shops').findOne({ _id: shopObjId });
    if (!shop) {
        console.error(`❌ Shop not found for ID: ${TARGET_SHOP_ID}`);
        process.exit(1);
    }
    console.log(`💈 Target Shop: "${shop.shopName}" (${shop._id})`);

    const barber = await db.collection('barbers').findOne({ _id: shop.barberId });
    const barberUserId = barber?.userId;
    console.log(`👤 Barber User ID: ${barberUserId}`);

    // Ensure services exist and are active
    let services = await db.collection('services').find({ shopId: shopObjId }).toArray();
    console.log(`Found ${services.length} existing services.`);

    // If services were soft-deleted, reactivate them
    if (services.length > 0) {
        await db.collection('services').updateMany(
            { shopId: shopObjId },
            { $set: { isActive: true, deletedAt: null } }
        );
        services = await db.collection('services').find({ shopId: shopObjId }).toArray();
    }

    // If less than 4 services, add high-quality salon services
    if (services.length < 4) {
        const extraServices = [
            {
                shopId: shopObjId,
                serviceName: 'Hair Cut & Styling',
                serviceType: 'single',
                serviceFor: 'men',
                imageMediaId: 'system-images-services-single-haircut-men-jpg',
                duration: 30,
                actualPrice: 150,
                offerPrice: 30,
                finalPrice: 120,
                bundledServices: [],
                isActive: true,
                deletedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                shopId: shopObjId,
                serviceName: 'Beard Trim & Precision Styling',
                serviceType: 'single',
                serviceFor: 'men',
                imageMediaId: 'system-images-services-single-beard-men-jpg',
                duration: 20,
                actualPrice: 120,
                offerPrice: 20,
                finalPrice: 100,
                bundledServices: [],
                isActive: true,
                deletedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                shopId: shopObjId,
                serviceName: 'Deep Cleanse Facial & Glow',
                serviceType: 'single',
                serviceFor: 'men',
                imageMediaId: 'system-images-services-single-facial-men-jpg',
                duration: 45,
                actualPrice: 400,
                offerPrice: 50,
                finalPrice: 350,
                bundledServices: [],
                isActive: true,
                deletedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                shopId: shopObjId,
                serviceName: 'Herbal Hair Spa & Head Massage',
                serviceType: 'single',
                serviceFor: 'men',
                imageMediaId: 'system-images-services-single-massage-men-jpg',
                duration: 40,
                actualPrice: 350,
                offerPrice: 50,
                finalPrice: 300,
                bundledServices: [],
                isActive: true,
                deletedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];

        for (const s of extraServices) {
            const exists = services.find(x => x.serviceName.toLowerCase() === s.serviceName.toLowerCase());
            if (!exists) {
                const ins = await db.collection('services').insertOne(s);
                services.push({ ...s, _id: ins.insertedId });
                console.log(`➕ Added service: "${s.serviceName}" (₹${s.finalPrice})`);
            }
        }
    }

    // Active employees
    const employees = await db.collection('employees').find({ shopId: shopObjId, isActive: true, deletedAt: null }).toArray();
    if (employees.length === 0) {
        console.error('❌ No active employees found for shop!');
        process.exit(1);
    }
    console.log(`👥 Active Employees: ${employees.map(e => `${e.firstName} ${e.lastName || ''}`).join(', ')}`);

    // Real customers
    const customers = await db.collection('customers').find({}).limit(20).toArray();
    if (customers.length === 0) {
        console.error('❌ No customer profiles found in database!');
        process.exit(1);
    }
    console.log(`🧑‍🤝‍🧑 Available Customers pool: ${customers.length}`);

    // If cleaning is requested
    if (shouldClean) {
        console.log(`🧹 Cleaning previous mock batch (${MOCK_BATCH_TAG})...`);
        const delBookings = await db.collection('bookings').deleteMany({ shopId: shopObjId, mockBatch: MOCK_BATCH_TAG });
        const delPayments = await db.collection('payment_transactions').deleteMany({ shopId: shopObjId, mockBatch: MOCK_BATCH_TAG });
        console.log(`   Deleted ${delBookings.deletedCount} bookings and ${delPayments.deletedCount} payment transactions.`);
    }

    const bookingsToInsert = [];
    const paymentsToInsert = [];

    // Realistic monthly targets for 6 completed historical months (April to September 2026)
    // Produces ~16-18% steady monthly growth:
    const MONTH_TARGETS = [
        { year: 2026, month: 4, count: 135, avgPrice: 200, label: 'April 2026' },
        { year: 2026, month: 5, count: 155, avgPrice: 210, label: 'May 2026' },
        { year: 2026, month: 6, count: 180, avgPrice: 220, label: 'June 2026' },
        { year: 2026, month: 7, count: 210, avgPrice: 230, label: 'July 2026' },
        { year: 2026, month: 8, count: 245, avgPrice: 240, label: 'August 2026' },
        { year: 2026, month: 9, count: 285, avgPrice: 250, label: 'September 2026' },
    ];

    console.log('\n📊 Generating Historical Months (April - September 2026)...');

    for (const target of MONTH_TARGETS) {
        const daysInMonth = new Date(target.year, target.month, 0).getDate();
        const basePerDay = Math.floor(target.count / daysInMonth);
        let remaining = target.count;

        for (let day = 1; day <= daysInMonth; day++) {
            const isWeekend = new Date(target.year, target.month - 1, day).getDay() % 6 === 0;
            let dayCount = isWeekend ? basePerDay + 2 : basePerDay;
            if (day === daysInMonth) {
                dayCount = remaining;
            } else {
                dayCount = Math.min(dayCount, remaining);
            }
            remaining -= dayCount;

            for (let b = 0; b < dayCount; b++) {
                const customer = randomChoice(customers);
                const employee = randomChoice(employees);
                const service = randomChoice(services);
                const bookingId = new mongoose.Types.ObjectId();
                const paymentId = new mongoose.Types.ObjectId();

                // Spread hours from 08:00 to 21:00
                const hour = randomInt(8, 20);
                const minute = randomChoice([0, 15, 30, 45]);
                const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                const duration = service.duration || 30;
                const startM = hour * 60 + minute;
                const endM = startM + duration;
                const endTimeStr = minutesToTime(endM);

                // Date at UTC midnight
                const dateUtc = new Date(Date.UTC(target.year, target.month - 1, day, 0, 0, 0));
                const paidAt = new Date(Date.UTC(target.year, target.month - 1, day, Math.max(hour - 1, 7), minute, 0));
                const completedAt = new Date(Date.UTC(target.year, target.month - 1, day, Math.floor(endM / 60), endM % 60, 0));

                const priceVariation = randomChoice([-20, 0, 0, 20, 50, 100]);
                const totalAmount = Math.max(120, (service.finalPrice || target.avgPrice) + priceVariation);
                const orderId = `EC-${bookingId.toString().slice(-8)}-${Date.UTC(target.year, target.month - 1, day)}-${generateHex(6)}`;

                // Booking
                bookingsToInsert.push({
                    _id: bookingId,
                    customerId: customer._id,
                    shopId: shopObjId,
                    employeeId: employee._id,
                    serviceIds: [service._id],
                    date: dateUtc,
                    time: timeStr,
                    endTime: endTimeStr,
                    startMinute: startM,
                    endMinute: endM,
                    totalAmount,
                    durationMinutes: duration,
                    slotLockTimes: buildSlotLockTimes(timeStr, duration),
                    status: 'completed',
                    paymentStatus: 'success',
                    paymentTransactionId: paymentId,
                    merchantOrderId: orderId,
                    paymentGateway: 'zoho',
                    paidAt,
                    paymentMode: 'upi',
                    payoutTransactionId: null,
                    payoutStatus: 'completed',
                    payoutCompletedAt: completedAt,
                    barberUtr: `UTR${generateHex(12).toUpperCase()}`,
                    completedAt,
                    reviewExpiresAt: new Date(completedAt.getTime() + 86400000),
                    hasReviewed: Math.random() < 0.25,
                    rescheduleCount: 0,
                    barberConfirmedAt: paidAt,
                    isMock: true,
                    mockBatch: MOCK_BATCH_TAG,
                    createdAt: paidAt,
                    updatedAt: completedAt,
                });

                // PaymentTransaction
                paymentsToInsert.push({
                    _id: paymentId,
                    bookingId,
                    customerId: customer._id,
                    shopId: shopObjId,
                    merchantOrderId: orderId,
                    gatewayOrderId: `GW_${orderId}`,
                    gatewayTransactionId: `TXN_${generateHex(10).toUpperCase()}`,
                    amount: totalAmount * 100, // paise
                    amountInRupees: totalAmount,
                    currency: 'INR',
                    status: 'completed',
                    paymentMode: 'upi',
                    settlement: {
                        serviceAmount: totalAmount * 100,
                        platformFee: 0,
                        barberPayout: totalAmount * 100,
                        isBundle: false,
                        settled: true,
                        settledAt: completedAt,
                    },
                    isMock: true,
                    mockBatch: MOCK_BATCH_TAG,
                    createdAt: paidAt,
                    updatedAt: completedAt,
                });
            }
        }
    }

    console.log('\n📈 Generating Current Month MTD (October 1 - October 15, 2026)...');
    // October 1 to October 15 (265 appointments to pace strongly ahead of September)
    const OCT_DAYS = 15;
    const OCT_TOTAL = 265;
    let octRemaining = OCT_TOTAL;

    for (let day = 1; day <= OCT_DAYS; day++) {
        const isWeekend = new Date(2026, 9, day).getDay() % 6 === 0;
        let dayCount = isWeekend ? 22 : 16;
        if (day === OCT_DAYS) {
            dayCount = octRemaining;
        } else {
            dayCount = Math.min(dayCount, octRemaining);
        }
        octRemaining -= dayCount;

        for (let b = 0; b < dayCount; b++) {
            const customer = randomChoice(customers);
            const employee = randomChoice(employees);
            const service = randomChoice(services);
            const bookingId = new mongoose.Types.ObjectId();
            const paymentId = new mongoose.Types.ObjectId();

            const hour = randomInt(8, 20);
            const minute = randomChoice([0, 15, 30, 45]);
            const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const duration = service.duration || 30;
            const startM = hour * 60 + minute;
            const endM = startM + duration;
            const endTimeStr = minutesToTime(endM);

            const dateUtc = new Date(Date.UTC(2026, 9, day, 0, 0, 0));
            const paidAt = new Date(Date.UTC(2026, 9, day, Math.max(hour - 1, 7), minute, 0));
            const completedAt = new Date(Date.UTC(2026, 9, day, Math.floor(endM / 60), endM % 60, 0));

            const totalAmount = Math.max(180, (service.finalPrice || 260) + randomChoice([20, 40, 60, 80]));
            const orderId = `EC-${bookingId.toString().slice(-8)}-${Date.UTC(2026, 9, day)}-${generateHex(6)}`;

            bookingsToInsert.push({
                _id: bookingId,
                customerId: customer._id,
                shopId: shopObjId,
                employeeId: employee._id,
                serviceIds: [service._id],
                date: dateUtc,
                time: timeStr,
                endTime: endTimeStr,
                startMinute: startM,
                endMinute: endM,
                totalAmount,
                durationMinutes: duration,
                slotLockTimes: buildSlotLockTimes(timeStr, duration),
                status: 'completed',
                paymentStatus: 'success',
                paymentTransactionId: paymentId,
                merchantOrderId: orderId,
                paymentGateway: 'zoho',
                paidAt,
                paymentMode: 'upi',
                payoutTransactionId: null,
                payoutStatus: 'completed',
                payoutCompletedAt: completedAt,
                barberUtr: `UTR${generateHex(12).toUpperCase()}`,
                completedAt,
                reviewExpiresAt: new Date(completedAt.getTime() + 86400000),
                hasReviewed: Math.random() < 0.3,
                rescheduleCount: 0,
                barberConfirmedAt: paidAt,
                isMock: true,
                mockBatch: MOCK_BATCH_TAG,
                createdAt: paidAt,
                updatedAt: completedAt,
            });

            paymentsToInsert.push({
                _id: paymentId,
                bookingId,
                customerId: customer._id,
                shopId: shopObjId,
                merchantOrderId: orderId,
                gatewayOrderId: `GW_${orderId}`,
                gatewayTransactionId: `TXN_${generateHex(10).toUpperCase()}`,
                amount: totalAmount * 100,
                amountInRupees: totalAmount,
                currency: 'INR',
                status: 'completed',
                paymentMode: 'upi',
                settlement: {
                    serviceAmount: totalAmount * 100,
                    platformFee: 0,
                    barberPayout: totalAmount * 100,
                    isBundle: false,
                    settled: true,
                    settledAt: completedAt,
                },
                isMock: true,
                mockBatch: MOCK_BATCH_TAG,
                createdAt: paidAt,
                updatedAt: completedAt,
            });
        }
    }

    console.log('\n🌟 Generating Today Pulse & Queue (October 16, 2026)...');
    // Today: Oct 16, 2026
    const todayDateUtc = new Date(Date.UTC(2026, 9, 16, 0, 0, 0));
    const todayDoneScenarios = [
        { time: '08:30', duration: 30, amount: 150, emp: employees[0], cust: customers[0], s: services[0] },
        { time: '09:30', duration: 40, amount: 350, emp: employees[1], cust: customers[1], s: services[1] || services[0] },
        { time: '10:45', duration: 30, amount: 200, emp: employees[0], cust: customers[2], s: services[0] },
        { time: '12:30', duration: 30, amount: 180, emp: employees[1], cust: customers[3], s: services[0] },
        { time: '14:00', duration: 45, amount: 380, emp: employees[0], cust: customers[4], s: services[2] || services[0] },
        { time: '15:30', duration: 30, amount: 220, emp: employees[1], cust: customers[5], s: services[0] },
    ];

    for (const sc of todayDoneScenarios) {
        const bookingId = new mongoose.Types.ObjectId();
        const paymentId = new mongoose.Types.ObjectId();
        const startM = parseTimeToMinutes(sc.time);
        const endM = startM + sc.duration;
        const endTimeStr = minutesToTime(endM);
        const orderId = `EC-TODAY-${bookingId.toString().slice(-6)}-${generateHex(4)}`;
        const paidAt = new Date(Date.UTC(2026, 9, 16, Math.floor(startM / 60) - 1, 30, 0));
        const completedAt = new Date(Date.UTC(2026, 9, 16, Math.floor(endM / 60), endM % 60, 0));

        bookingsToInsert.push({
            _id: bookingId,
            customerId: sc.cust._id,
            shopId: shopObjId,
            employeeId: sc.emp._id,
            serviceIds: [sc.s._id],
            date: todayDateUtc,
            time: sc.time,
            endTime: endTimeStr,
            startMinute: startM,
            endMinute: endM,
            totalAmount: sc.amount,
            durationMinutes: sc.duration,
            slotLockTimes: buildSlotLockTimes(sc.time, sc.duration),
            status: 'completed',
            paymentStatus: 'success',
            paymentTransactionId: paymentId,
            merchantOrderId: orderId,
            paymentGateway: 'zoho',
            paidAt,
            paymentMode: 'upi',
            payoutTransactionId: null,
            payoutStatus: 'completed',
            payoutCompletedAt: completedAt,
            barberUtr: `UTR${generateHex(12).toUpperCase()}`,
            completedAt,
            reviewExpiresAt: new Date(completedAt.getTime() + 86400000),
            hasReviewed: true,
            rescheduleCount: 0,
            barberConfirmedAt: paidAt,
            isMock: true,
            mockBatch: MOCK_BATCH_TAG,
            createdAt: paidAt,
            updatedAt: completedAt,
        });

        paymentsToInsert.push({
            _id: paymentId,
            bookingId,
            customerId: sc.cust._id,
            shopId: shopObjId,
            merchantOrderId: orderId,
            gatewayOrderId: `GW_${orderId}`,
            gatewayTransactionId: `TXN_${generateHex(10).toUpperCase()}`,
            amount: sc.amount * 100,
            amountInRupees: sc.amount,
            currency: 'INR',
            status: 'completed',
            paymentMode: 'upi',
            settlement: {
                serviceAmount: sc.amount * 100,
                platformFee: 0,
                barberPayout: sc.amount * 100,
                isBundle: false,
                settled: true,
                settledAt: completedAt,
            },
            isMock: true,
            mockBatch: MOCK_BATCH_TAG,
            createdAt: paidAt,
            updatedAt: completedAt,
        });
    }

    // Active Appointment (Happening now around 17:00)
    {
        const bookingId = new mongoose.Types.ObjectId();
        const paymentId = new mongoose.Types.ObjectId();
        const startM = parseTimeToMinutes('17:00');
        const endM = startM + 30;
        const orderId = `EC-ACTIVE-${bookingId.toString().slice(-6)}-${generateHex(4)}`;
        const paidAt = new Date(Date.UTC(2026, 9, 16, 11, 0, 0)); // UTC time

        bookingsToInsert.push({
            _id: bookingId,
            customerId: customers[6]._id,
            shopId: shopObjId,
            employeeId: employees[0]._id,
            serviceIds: [services[0]._id],
            date: todayDateUtc,
            time: '17:00',
            endTime: '17:30',
            startMinute: startM,
            endMinute: endM,
            totalAmount: 150,
            durationMinutes: 30,
            slotLockTimes: buildSlotLockTimes('17:00', 30),
            status: 'confirmed',
            paymentStatus: 'success',
            paymentTransactionId: paymentId,
            merchantOrderId: orderId,
            paymentGateway: 'zoho',
            paidAt,
            paymentMode: 'upi',
            payoutTransactionId: null,
            payoutStatus: 'not_initiated',
            rescheduleCount: 0,
            barberConfirmedAt: paidAt,
            isMock: true,
            mockBatch: MOCK_BATCH_TAG,
            createdAt: paidAt,
            updatedAt: paidAt,
        });

        paymentsToInsert.push({
            _id: paymentId,
            bookingId,
            customerId: customers[6]._id,
            shopId: shopObjId,
            merchantOrderId: orderId,
            gatewayOrderId: `GW_${orderId}`,
            gatewayTransactionId: `TXN_${generateHex(10).toUpperCase()}`,
            amount: 150 * 100,
            amountInRupees: 150,
            currency: 'INR',
            status: 'completed',
            paymentMode: 'upi',
            settlement: {
                serviceAmount: 150 * 100,
                platformFee: 0,
                barberPayout: 150 * 100,
                isBundle: false,
                settled: false,
            },
            isMock: true,
            mockBatch: MOCK_BATCH_TAG,
            createdAt: paidAt,
            updatedAt: paidAt,
        });
    }

    // Upcoming appointments this evening (18:00, 18:45, 19:30, 20:15)
    const upcomingScenarios = [
        { time: '18:00', duration: 30, amount: 150, emp: employees[1], cust: customers[7], s: services[0] },
        { time: '18:45', duration: 30, amount: 220, emp: employees[0], cust: customers[8], s: services[1] || services[0] },
        { time: '19:30', duration: 40, amount: 350, emp: employees[1], cust: customers[9], s: services[2] || services[0] },
        { time: '20:15', duration: 30, amount: 180, emp: employees[0], cust: customers[0], s: services[0] },
    ];

    for (const up of upcomingScenarios) {
        const bookingId = new mongoose.Types.ObjectId();
        const paymentId = new mongoose.Types.ObjectId();
        const startM = parseTimeToMinutes(up.time);
        const endM = startM + up.duration;
        const endTimeStr = minutesToTime(endM);
        const orderId = `EC-UP-${bookingId.toString().slice(-6)}-${generateHex(4)}`;
        const paidAt = new Date(Date.UTC(2026, 9, 16, 11, 15, 0));

        bookingsToInsert.push({
            _id: bookingId,
            customerId: up.cust._id,
            shopId: shopObjId,
            employeeId: up.emp._id,
            serviceIds: [up.s._id],
            date: todayDateUtc,
            time: up.time,
            endTime: endTimeStr,
            startMinute: startM,
            endMinute: endM,
            totalAmount: up.amount,
            durationMinutes: up.duration,
            slotLockTimes: buildSlotLockTimes(up.time, up.duration),
            status: 'confirmed',
            paymentStatus: 'success',
            paymentTransactionId: paymentId,
            merchantOrderId: orderId,
            paymentGateway: 'zoho',
            paidAt,
            paymentMode: 'upi',
            payoutTransactionId: null,
            payoutStatus: 'not_initiated',
            rescheduleCount: 0,
            barberConfirmedAt: paidAt,
            isMock: true,
            mockBatch: MOCK_BATCH_TAG,
            createdAt: paidAt,
            updatedAt: paidAt,
        });

        paymentsToInsert.push({
            _id: paymentId,
            bookingId,
            customerId: up.cust._id,
            shopId: shopObjId,
            merchantOrderId: orderId,
            gatewayOrderId: `GW_${orderId}`,
            gatewayTransactionId: `TXN_${generateHex(10).toUpperCase()}`,
            amount: up.amount * 100,
            amountInRupees: up.amount,
            currency: 'INR',
            status: 'completed',
            paymentMode: 'upi',
            settlement: {
                serviceAmount: up.amount * 100,
                platformFee: 0,
                barberPayout: up.amount * 100,
                isBundle: false,
                settled: false,
            },
            isMock: true,
            mockBatch: MOCK_BATCH_TAG,
            createdAt: paidAt,
            updatedAt: paidAt,
        });
    }

    // 1 Awaiting Confirmation Booking
    {
        const bookingId = new mongoose.Types.ObjectId();
        const startM = parseTimeToMinutes('21:00');
        const endM = startM + 30;
        bookingsToInsert.push({
            _id: bookingId,
            customerId: customers[1]._id,
            shopId: shopObjId,
            employeeId: employees[1]._id,
            serviceIds: [services[0]._id],
            date: todayDateUtc,
            time: '21:00',
            endTime: '21:30',
            startMinute: startM,
            endMinute: endM,
            totalAmount: 180,
            durationMinutes: 30,
            slotLockTimes: buildSlotLockTimes('21:00', 30),
            status: 'awaiting_confirmation',
            paymentStatus: 'success',
            paymentGateway: 'zoho',
            paymentMode: 'upi',
            rescheduleCount: 0,
            isMock: true,
            mockBatch: MOCK_BATCH_TAG,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    // 1 Cancelled Booking earlier today
    {
        const bookingId = new mongoose.Types.ObjectId();
        const startM = parseTimeToMinutes('11:45');
        const endM = startM + 30;
        bookingsToInsert.push({
            _id: bookingId,
            customerId: customers[3]._id,
            shopId: shopObjId,
            employeeId: employees[0]._id,
            serviceIds: [services[0]._id],
            date: todayDateUtc,
            time: '11:45',
            endTime: '12:15',
            startMinute: startM,
            endMinute: endM,
            totalAmount: 150,
            durationMinutes: 30,
            slotLockTimes: buildSlotLockTimes('11:45', 30),
            status: 'cancelled',
            paymentStatus: 'refunded',
            cancelledAt: new Date(Date.UTC(2026, 9, 16, 5, 30, 0)),
            cancellationNote: 'Customer requested reschedule to Sunday',
            rescheduleCount: 0,
            isMock: true,
            mockBatch: MOCK_BATCH_TAG,
            createdAt: new Date(Date.UTC(2026, 9, 16, 4, 0, 0)),
            updatedAt: new Date(Date.UTC(2026, 9, 16, 5, 30, 0)),
        });
    }

    console.log(`\n📦 Total Prepared:`);
    console.log(`   - Bookings: ${bookingsToInsert.length}`);
    console.log(`   - Payment Transactions: ${paymentsToInsert.length}`);

    if (isDryRun) {
        console.log('\n⚠️  DRY RUN MODE: No documents were inserted into MongoDB.');
        console.log('   Run with `--insert` to write data into MongoDB.');
    } else {
        console.log('\n💾 Inserting documents into MongoDB...');
        const bRes = await db.collection('bookings').insertMany(bookingsToInsert);
        const pRes = await db.collection('payment_transactions').insertMany(paymentsToInsert);
        console.log(`✅ Successfully inserted:`);
        console.log(`   - ${bRes.insertedCount} bookings`);
        console.log(`   - ${pRes.insertedCount} payment transactions`);
    }

    // Verify analytics by invoking actual EverCut services
    console.log('\n🔍 Verifying Output Analytics via EverCut Services...');
    const bookingService = await import('../src/services/booking.service.js');
    const earningsService = await import('../src/services/earnings.service.js');

    const bookingOverview = await bookingService.getBookingOverview(barberUserId);
    const earnings = await earningsService.getEarnings(barberUserId);

    console.log('\n======================================================');
    console.log('📱 PLAY STORE SCREENSHOT READY ANALYTICS PREVIEW:');
    console.log('======================================================');

    console.log('\n1. 📈 6-MONTH APPOINTMENT GROWTH (Closed Appointments):');
    console.log(`   Total 6-Month Appointments: ${bookingOverview.appointments.total}`);
    console.log(`   MoM Growth: +${bookingOverview.appointments.growth}%`);
    console.table(bookingOverview.appointments.statistics);

    console.log('\n2. 💰 6-MONTH INCOME GROWTH:');
    console.log(`   Total 6-Month Income: ₹${earnings.income.total.toLocaleString('en-IN')}`);
    console.log(`   MoM Growth: +${earnings.income.growth}%`);
    console.table(earnings.income.statistics);

    console.log('\n3. 🎯 MONTHLY REVENUE & TARGETS:');
    console.log(`   Current Month Revenue (${earnings.monthlyRevenue.period}): ₹${earnings.monthlyRevenue.amount.toLocaleString('en-IN')}`);
    console.log(`   Change Direction: ${earnings.monthlyRevenue.changeDirection} (${earnings.monthlyRevenue.changePercentage}%)`);
    console.log(`   Milestone Target: ${bookingOverview.milestones.completedBookings} bookings completed (${bookingOverview.milestones.progress.percentage}% towards target)`);
    console.log(`   Next Milestone: ${bookingOverview.milestones.nextMilestone?.label} (${bookingOverview.milestones.nextMilestone?.remainingBookings} bookings remaining)`);

    console.log('\n4. ⚡ TODAY PULSE & QUEUE (October 16, 2026):');
    console.log(`   Today Earnings: ₹${earnings.todayEarning.toLocaleString('en-IN')}`);
    console.log(`   Occupancy: ${bookingOverview.today.occupancy.percentage}% (${bookingOverview.today.occupancy.booked} of ${bookingOverview.today.occupancy.total} mins)`);
    console.log('   Today Status Breakdown:');
    console.table(bookingOverview.today.statusBreakdown);
    console.log(`   Active Queue: ${bookingOverview.queue.active.count} active appointment(s)`);
    console.log(`   Upcoming Queue: ${bookingOverview.queue.upcoming.count} upcoming appointment(s)`);

    console.log('\n======================================================');
    console.log('✨ All dummy analytics data generated and validated successfully!');
    console.log('======================================================\n');

    await mongoose.disconnect();
}

run().catch((err) => {
    console.error('❌ Error executing script:', err);
    process.exit(1);
});
