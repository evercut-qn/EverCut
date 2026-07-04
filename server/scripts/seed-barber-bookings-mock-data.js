import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import connectDB, { disconnectDB } from '../src/config/database.config.js';
import User from '../src/models/user.model.js';
import Barber from '../src/models/barber.model.js';
import Shop from '../src/models/shop.model.js';
import Customer from '../src/models/customer.model.js';
import Employee from '../src/models/employee.model.js';
import Service from '../src/models/service.model.js';
import Booking from '../src/models/booking.model.js';
import PaymentTransaction from '../src/models/payment-transaction.model.js';
import PayoutTransaction from '../src/models/payout-transaction.model.js';
import Media from '../src/models/media.model.js';
import { buildSlotLockTimes } from '../src/utils/slot-lock.utils.js';
import { buildTimeRange } from '../src/utils/time.utils.js';
import {
    BOOKING_STATUS,
    PAYMENT_STATUS,
    PAYOUT_STATUS,
    PAYMENT_TRANSACTION_STATUS,
    PAYOUT_TRANSACTION_STATUS,
    PAYOUT_MODES,
    PAYOUT_GATEWAY,
    PAYMENT_GATEWAYS
} from '../src/utils/constants.js';

async function getOrCreateMedia(userId, purpose, r2Key) {
    let media = await Media.findOne({ r2Key });
    if (!media) {
        media = await Media.create({
            _id: uuidv4(),
            userId: String(userId),
            type: 'image',
            status: 'ready',
            purpose,
            r2Key,
            r2Bucket: 'evercut-media-dev',
            contentType: 'image/png',
            declaredSize: 10240,
            uploadExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            confirmedAt: new Date()
        });
        console.log(`Created Media document for ${purpose}: ${r2Key} (${media._id})`);
    }
    return media;
}

async function main() {
    await connectDB();
    try {
        console.log('Seeding mock bookings, payments, and payouts for barber +919876543200 (Jane Doe)...');

        const barberPhone = '+919876543200';
        const barberUser = await User.findOne({ phoneNumber: barberPhone });
        if (!barberUser) {
            throw new Error(`Barber user not found with phone ${barberPhone}`);
        }

        const barber = await Barber.findOne({ userId: barberUser._id });
        if (!barber) {
            throw new Error(`Barber profile not found for user ${barberUser._id}`);
        }

        const shop = await Shop.findOne({ barberId: barber._id });
        if (!shop) {
            throw new Error(`Shop not found for barber ${barber._id}`);
        }

        console.log(`Shop identified: ${shop.shopName} (${shop._id})`);

        // Convert Employee photoR2Key to photoMediaId
        const employees = await Employee.find({ shopId: shop._id });
        if (employees.length === 0) {
            throw new Error(`No employees found for shop ${shop._id}`);
        }

        for (const emp of employees) {
            const rawEmp = emp.toObject();
            if (rawEmp.photoR2Key && !emp.photoMediaId) {
                const media = await getOrCreateMedia(barberUser._id, 'employee', rawEmp.photoR2Key);
                emp.photoMediaId = media._id;
                await emp.save();
                console.log(`Updated employee ${emp.firstName} ${emp.lastName} with photoMediaId ${media._id}`);
            }
        }

        const johnWick = employees.find(e => e.firstName === 'John') || employees[0];
        const shankya = employees.find(e => e.firstName === 'Shankya') || employees[0];

        // Clean/Create Services for Jane's Salon
        await Service.deleteMany({ shopId: shop._id });

        const service1Media = await getOrCreateMedia(barberUser._id, 'service', 'images/services/jane/haircut.png');
        const service1 = await Service.create({
            shopId: shop._id,
            serviceName: 'Standard Women Haircut',
            serviceType: 'single',
            serviceFor: 'women',
            duration: 30,
            actualPrice: 300,
            offerPrice: 50,
            finalPrice: 250,
            imageMediaId: service1Media._id,
            isActive: true
        });

        const service2Media = await getOrCreateMedia(barberUser._id, 'service', 'images/services/jane/spa.png');
        const service2 = await Service.create({
            shopId: shop._id,
            serviceName: 'Hair Spa Deluxe',
            serviceType: 'single',
            serviceFor: 'women',
            duration: 60,
            actualPrice: 800,
            offerPrice: 100,
            finalPrice: 700,
            imageMediaId: service2Media._id,
            isActive: true
        });

        const service3Media = await getOrCreateMedia(barberUser._id, 'service', 'images/services/jane/bridal.png');
        const service3 = await Service.create({
            shopId: shop._id,
            serviceName: 'Bridal Bundled Spa',
            serviceType: 'bundled',
            serviceFor: 'women',
            duration: 120,
            actualPrice: 2000,
            offerPrice: 300,
            finalPrice: 1700,
            imageMediaId: service3Media._id,
            isActive: true
        });

        console.log('Services created and linked to Media documents.');

        // Fetch customers and set up customer photoUrls
        const customers = await Customer.find().limit(5);
        if (customers.length === 0) {
            throw new Error('No customers found in database.');
        }

        for (const customer of customers) {
            if (!customer.photoMediaId) {
                const customerKey = `images/customers/${customer.firstName.toLowerCase()}_avatar.png`;
                const media = await getOrCreateMedia(customer.userId, 'avatar', customerKey);
                customer.photoMediaId = media._id;
                await customer.save();
                console.log(`Updated customer ${customer.firstName} ${customer.lastName} with photoMediaId ${media._id}`);
            }
        }

        // Clean previous bookings, payment transactions, and payout transactions for this shop
        await Booking.deleteMany({ shopId: shop._id });
        await PaymentTransaction.deleteMany({ shopId: shop._id });
        await PayoutTransaction.deleteMany({ shopId: shop._id });
        console.log(`Cleaned up previous bookings, payments, and payouts.`);

        // Setup scenarios array
        const scenarios = [
            {
                id: 1,
                desc: 'Pending booking (Awaiting payment)',
                date: new Date('2026-07-06T00:00:00.000Z'),
                time: '10:00',
                employee: johnWick,
                services: [service1],
                status: BOOKING_STATUS.PENDING,
                paymentStatus: PAYMENT_STATUS.PENDING,
                payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
                rescheduleCount: 0
            },
            {
                id: 2,
                desc: 'Paid, Awaiting Confirmation',
                date: new Date('2026-07-06T00:00:00.000Z'),
                time: '11:30',
                employee: johnWick,
                services: [service1],
                status: BOOKING_STATUS.AWAITING_CONFIRMATION,
                paymentStatus: PAYMENT_STATUS.SUCCESS,
                payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
                rescheduleCount: 0,
                paidAt: new Date('2026-07-05T18:00:00.000Z')
            },
            {
                id: 3,
                desc: 'Confirmed, Awaiting Appointment Time',
                date: new Date('2026-07-07T00:00:00.000Z'),
                time: '09:00',
                employee: shankya,
                services: [service2],
                status: BOOKING_STATUS.CONFIRMED,
                paymentStatus: PAYMENT_STATUS.SUCCESS,
                payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
                rescheduleCount: 0,
                paidAt: new Date('2026-07-06T08:00:00.000Z'),
                barberConfirmedAt: new Date('2026-07-06T08:15:00.000Z')
            },
            {
                id: 4,
                desc: 'Completed (attended), Payout Not Initiated',
                date: new Date('2026-07-01T00:00:00.000Z'),
                time: '10:00',
                employee: johnWick,
                services: [service1],
                status: BOOKING_STATUS.COMPLETED,
                paymentStatus: PAYMENT_STATUS.SUCCESS,
                payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
                rescheduleCount: 0,
                paidAt: new Date('2026-06-30T18:00:00.000Z'),
                barberConfirmedAt: new Date('2026-06-30T18:10:00.000Z'),
                completedAt: new Date('2026-07-01T10:30:00.000Z')
            },
            {
                id: 5,
                desc: 'Completed, Payout Initiated',
                date: new Date('2026-07-01T00:00:00.000Z'),
                time: '11:30',
                employee: johnWick,
                services: [service1],
                status: BOOKING_STATUS.COMPLETED,
                paymentStatus: PAYMENT_STATUS.SUCCESS,
                payoutStatus: PAYOUT_STATUS.INITIATED,
                rescheduleCount: 0,
                paidAt: new Date('2026-06-30T19:00:00.000Z'),
                barberConfirmedAt: new Date('2026-06-30T19:15:00.000Z'),
                completedAt: new Date('2026-07-01T12:00:00.000Z')
            },
            {
                id: 6,
                desc: 'Completed, Payout Pending',
                date: new Date('2026-07-02T00:00:00.000Z'),
                time: '09:00',
                employee: shankya,
                services: [service2],
                status: BOOKING_STATUS.COMPLETED,
                paymentStatus: PAYMENT_STATUS.SUCCESS,
                payoutStatus: PAYOUT_STATUS.PENDING,
                rescheduleCount: 0,
                paidAt: new Date('2026-07-01T08:00:00.000Z'),
                barberConfirmedAt: new Date('2026-07-01T08:20:00.000Z'),
                completedAt: new Date('2026-07-02T10:00:00.000Z')
            },
            {
                id: 7,
                desc: 'Completed, Payout Completed',
                date: new Date('2026-07-02T00:00:00.000Z'),
                time: '10:30',
                employee: johnWick,
                services: [service2],
                status: BOOKING_STATUS.COMPLETED,
                paymentStatus: PAYMENT_STATUS.SUCCESS,
                payoutStatus: PAYOUT_STATUS.COMPLETED,
                rescheduleCount: 0,
                paidAt: new Date('2026-07-01T09:00:00.000Z'),
                barberConfirmedAt: new Date('2026-07-01T09:15:00.000Z'),
                completedAt: new Date('2026-07-02T11:30:00.000Z'),
                payoutCompletedAt: new Date('2026-07-02T23:30:00.000Z'),
                barberUtr: 'UTR123456789007'
            },
            {
                id: 8,
                desc: 'Completed, Payout Failed',
                date: new Date('2026-07-02T00:00:00.000Z'),
                time: '13:00',
                employee: shankya,
                services: [service2],
                status: BOOKING_STATUS.COMPLETED,
                paymentStatus: PAYMENT_STATUS.SUCCESS,
                payoutStatus: PAYOUT_STATUS.FAILED,
                rescheduleCount: 0,
                paidAt: new Date('2026-07-01T12:00:00.000Z'),
                barberConfirmedAt: new Date('2026-07-01T12:10:00.000Z'),
                completedAt: new Date('2026-07-02T14:00:00.000Z')
            },
            {
                id: 9,
                desc: 'Completed, Payout Reversed',
                date: new Date('2026-07-03T00:00:00.000Z'),
                time: '09:00',
                employee: johnWick,
                services: [service2],
                status: BOOKING_STATUS.COMPLETED,
                paymentStatus: PAYMENT_STATUS.SUCCESS,
                payoutStatus: PAYOUT_STATUS.REVERSED,
                rescheduleCount: 0,
                paidAt: new Date('2026-07-02T08:00:00.000Z'),
                barberConfirmedAt: new Date('2026-07-02T08:15:00.000Z'),
                completedAt: new Date('2026-07-03T10:00:00.000Z')
            },
            {
                id: 10,
                desc: 'Customer No Show',
                date: new Date('2026-07-03T00:00:00.000Z'),
                time: '10:30',
                employee: shankya,
                services: [service2],
                status: BOOKING_STATUS.NO_SHOW,
                paymentStatus: PAYMENT_STATUS.SUCCESS,
                payoutStatus: PAYOUT_STATUS.COMPLETED,
                rescheduleCount: 0,
                paidAt: new Date('2026-07-02T09:30:00.000Z'),
                barberConfirmedAt: new Date('2026-07-02T09:40:00.000Z'),
                noShowAt: new Date('2026-07-03T11:00:00.000Z'),
                payoutCompletedAt: new Date('2026-07-03T23:30:00.000Z'),
                barberUtr: 'UTR123456789010'
            },
            {
                id: 11,
                desc: 'Cancelled by Customer (Refund Pending)',
                date: new Date('2026-07-03T00:00:00.000Z'),
                time: '13:00',
                employee: johnWick,
                services: [service2],
                status: BOOKING_STATUS.CANCELLED,
                paymentStatus: PAYMENT_STATUS.REFUND_PENDING,
                payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
                rescheduleCount: 0,
                paidAt: new Date('2026-07-02T12:00:00.000Z'),
                barberConfirmedAt: new Date('2026-07-02T12:15:00.000Z'),
                cancelledAt: new Date('2026-07-02T22:00:00.000Z'),
                cancellationNote: 'Customer decided not to come.'
            },
            {
                id: 12,
                desc: 'Cancelled by Customer (Refunded)',
                date: new Date('2026-07-03T00:00:00.000Z'),
                time: '14:00',
                employee: johnWick,
                services: [service2],
                status: BOOKING_STATUS.CANCELLED,
                paymentStatus: PAYMENT_STATUS.REFUNDED,
                payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
                rescheduleCount: 0,
                paidAt: new Date('2026-07-02T13:00:00.000Z'),
                barberConfirmedAt: new Date('2026-07-02T13:20:00.000Z'),
                cancelledAt: new Date('2026-07-02T23:00:00.000Z'),
                cancellationNote: 'Change of plans.'
            },
            {
                id: 13,
                desc: 'Cancelled by Customer (Refund Failed)',
                date: new Date('2026-07-04T00:00:00.000Z'),
                time: '09:00',
                employee: shankya,
                services: [service2],
                status: BOOKING_STATUS.CANCELLED,
                paymentStatus: PAYMENT_STATUS.REFUND_FAILED,
                payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
                rescheduleCount: 0,
                paidAt: new Date('2026-07-03T08:00:00.000Z'),
                barberConfirmedAt: new Date('2026-07-03T08:15:00.000Z'),
                cancelledAt: new Date('2026-07-03T20:00:00.000Z'),
                cancellationNote: 'Sickness.'
            },
            {
                id: 14,
                desc: 'Cancelled by Barber (Refunded)',
                date: new Date('2026-07-04T00:00:00.000Z'),
                time: '10:00',
                employee: johnWick,
                services: [service2],
                status: BOOKING_STATUS.CANCELLED,
                paymentStatus: PAYMENT_STATUS.REFUNDED,
                payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
                rescheduleCount: 0,
                paidAt: new Date('2026-07-03T09:00:00.000Z'),
                cancelledAt: new Date('2026-07-03T11:00:00.000Z'),
                barberCancelledAt: new Date('2026-07-03T11:00:00.000Z'),
                cancellationNote: 'Barber is unavailable.'
            },
            {
                id: 15,
                desc: 'Auto-Cancelled by System (Refunded)',
                date: new Date('2026-07-04T00:00:00.000Z'),
                time: '11:30',
                employee: shankya,
                services: [service2],
                status: BOOKING_STATUS.CANCELLED,
                paymentStatus: PAYMENT_STATUS.REFUNDED,
                payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
                rescheduleCount: 0,
                paidAt: new Date('2026-07-03T09:00:00.000Z'),
                cancelledAt: new Date('2026-07-04T09:00:00.000Z'),
                autoCancelledAt: new Date('2026-07-04T09:00:00.000Z')
            },
            {
                id: 16,
                desc: 'Pending booking (Failed payment)',
                date: new Date('2026-07-04T00:00:00.000Z'),
                time: '14:00',
                employee: johnWick,
                services: [service2],
                status: BOOKING_STATUS.PENDING,
                paymentStatus: PAYMENT_STATUS.FAILED,
                payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
                rescheduleCount: 0
            },
            {
                id: 17,
                desc: 'Rescheduled booking (Confirmed)',
                date: new Date('2026-07-07T00:00:00.000Z'),
                time: '13:00',
                employee: johnWick,
                services: [service1],
                status: BOOKING_STATUS.CONFIRMED,
                paymentStatus: PAYMENT_STATUS.SUCCESS,
                payoutStatus: PAYOUT_STATUS.NOT_INITIATED,
                rescheduleCount: 1,
                paidAt: new Date('2026-07-05T10:00:00.000Z'),
                barberConfirmedAt: new Date('2026-07-05T10:15:00.000Z')
            },
            {
                id: 18,
                desc: 'Bundled Services Booking (Completed)',
                date: new Date('2026-07-01T00:00:00.000Z'),
                time: '14:00',
                employee: shankya,
                services: [service1, service2, service3],
                status: BOOKING_STATUS.COMPLETED,
                paymentStatus: PAYMENT_STATUS.SUCCESS,
                payoutStatus: PAYOUT_STATUS.COMPLETED,
                rescheduleCount: 0,
                paidAt: new Date('2026-06-30T10:00:00.000Z'),
                barberConfirmedAt: new Date('2026-06-30T10:20:00.000Z'),
                completedAt: new Date('2026-07-01T16:30:00.000Z'),
                payoutCompletedAt: new Date('2026-07-01T23:30:00.000Z'),
                barberUtr: 'UTR123456789018'
            }
        ];

        console.log(`Seeding ${scenarios.length} bookings...`);

        for (let i = 0; i < scenarios.length; i++) {
            const sc = scenarios[i];
            const customer = customers[i % customers.length];

            // Calculate duration and prices
            let durationMinutes = 0;
            let actualPrice = 0;
            let finalPrice = 0;
            
            sc.services.forEach(s => {
                durationMinutes += s.duration || s.totalDuration || 30;
                actualPrice += s.actualPrice || s.totalPrice || 0;
                finalPrice += s.finalPrice || 0;
            });

            // If bundled price is not set, fallback to finalPrice
            const serviceAmount = finalPrice;
            const platformFee = sc.services.length > 1 ? 10 : 4;
            const totalAmount = serviceAmount + platformFee;

            const timeRange = buildTimeRange(sc.time, durationMinutes);
            if (!timeRange) {
                throw new Error(`Failed to build time range for time ${sc.time} and duration ${durationMinutes}`);
            }

            const slotLockTimes = buildSlotLockTimes(timeRange.startTime, durationMinutes);

            const bookingData = {
                customerId: customer._id,
                shopId: shop._id,
                employeeId: sc.employee._id,
                serviceIds: sc.services.map(s => s._id),
                date: sc.date,
                time: timeRange.startTime,
                endTime: timeRange.endTime,
                startMinute: timeRange.startMinute,
                endMinute: timeRange.endMinute,
                totalAmount: totalAmount,
                durationMinutes: durationMinutes,
                slotLockTimes: slotLockTimes,
                status: sc.status,
                paymentStatus: sc.paymentStatus,
                payoutStatus: sc.payoutStatus,
                rescheduleCount: sc.rescheduleCount,
                merchantOrderId: `ORD_${sc.id}_JANE_${Date.now()}`
            };

            if (sc.paidAt) {
                bookingData.paidAt = sc.paidAt;
                bookingData.paymentMode = 'UPI'; // Set paymentMode on the Booking document!
            }
            if (sc.barberConfirmedAt) bookingData.barberConfirmedAt = sc.barberConfirmedAt;
            if (sc.completedAt) bookingData.completedAt = sc.completedAt;
            if (sc.cancelledAt) bookingData.cancelledAt = sc.cancelledAt;
            if (sc.barberCancelledAt) bookingData.barberCancelledAt = sc.barberCancelledAt;
            if (sc.autoCancelledAt) bookingData.autoCancelledAt = sc.autoCancelledAt;
            if (sc.noShowAt) bookingData.noShowAt = sc.noShowAt;
            if (sc.cancellationNote) bookingData.cancellationNote = sc.cancellationNote;
            if (sc.barberUtr) bookingData.barberUtr = sc.barberUtr;
            if (sc.payoutCompletedAt) bookingData.payoutCompletedAt = sc.payoutCompletedAt;

            // Create booking
            const booking = await Booking.create(bookingData);

            // Create Payment Transaction
            let ptStatus = PAYMENT_TRANSACTION_STATUS.INITIATED;
            if (sc.paymentStatus === PAYMENT_STATUS.SUCCESS) ptStatus = PAYMENT_TRANSACTION_STATUS.COMPLETED;
            if (sc.paymentStatus === PAYMENT_STATUS.FAILED) ptStatus = PAYMENT_TRANSACTION_STATUS.FAILED;
            if (sc.paymentStatus === PAYMENT_STATUS.REFUND_PENDING) ptStatus = PAYMENT_TRANSACTION_STATUS.REFUND_PENDING;
            if (sc.paymentStatus === PAYMENT_STATUS.REFUNDED) ptStatus = PAYMENT_TRANSACTION_STATUS.REFUNDED;
            if (sc.paymentStatus === PAYMENT_STATUS.REFUND_FAILED) ptStatus = PAYMENT_TRANSACTION_STATUS.REFUND_FAILED;

            const refundPayload = (sc.paymentStatus === PAYMENT_STATUS.REFUND_PENDING || 
                                   sc.paymentStatus === PAYMENT_STATUS.REFUNDED || 
                                   sc.paymentStatus === PAYMENT_STATUS.REFUND_FAILED) ? {
                merchantRefundId: `REF_${sc.id}_JANE`,
                gatewayRefundId: `GWREF_${sc.id}_JANE`,
                amount: totalAmount * 100, // in paise
                refundFee: 7 * 100,
                platformFee: platformFee * 100,
                status: sc.paymentStatus === PAYMENT_STATUS.REFUNDED ? 'completed' : 
                        sc.paymentStatus === PAYMENT_STATUS.REFUND_FAILED ? 'failed' : 'pending',
                type: 'cancellation',
                initiatedAt: sc.cancelledAt || new Date(),
                completedAt: sc.paymentStatus === PAYMENT_STATUS.REFUNDED ? (sc.cancelledAt || new Date()) : null,
                reason: sc.cancellationNote || 'Seeded cancellation'
            } : null;

            const paymentTransaction = await PaymentTransaction.create({
                bookingId: booking._id,
                customerId: customer._id,
                shopId: shop._id,
                merchantOrderId: bookingData.merchantOrderId,
                gatewayOrderId: `GW_${bookingData.merchantOrderId}`,
                gatewayTransactionId: `TX_${bookingData.merchantOrderId}`,
                amount: totalAmount * 100, // in paise
                amountInRupees: totalAmount,
                currency: 'INR',
                status: ptStatus,
                paymentMode: 'UPI',
                refund: refundPayload,
                settlement: {
                    serviceAmount: serviceAmount,
                    platformFee: platformFee,
                    barberPayout: serviceAmount,
                    isBundle: sc.services.length > 1,
                    settled: sc.payoutStatus === PAYOUT_STATUS.COMPLETED,
                    settledAt: sc.payoutCompletedAt || null
                }
            });

            // Update booking with payment transaction reference
            booking.paymentTransactionId = paymentTransaction._id;
            await booking.save();

            // Create Payout Transaction if payout is initiated/pending/completed/failed/reversed
            if (sc.payoutStatus !== PAYOUT_STATUS.NOT_INITIATED) {
                let potStatus = PAYOUT_TRANSACTION_STATUS.INITIATED;
                if (sc.payoutStatus === PAYOUT_STATUS.PENDING) potStatus = PAYOUT_TRANSACTION_STATUS.PENDING;
                if (sc.payoutStatus === PAYOUT_STATUS.COMPLETED) potStatus = PAYOUT_TRANSACTION_STATUS.SUCCESS;
                if (sc.payoutStatus === PAYOUT_STATUS.FAILED) potStatus = PAYOUT_TRANSACTION_STATUS.FAILED;
                if (sc.payoutStatus === PAYOUT_STATUS.REVERSED) potStatus = PAYOUT_TRANSACTION_STATUS.REVERSED;

                const payoutTransaction = await PayoutTransaction.create({
                    bookingIds: [booking._id],
                    barberId: barber._id,
                    shopId: shop._id,
                    paymentTransactionIds: [paymentTransaction._id],
                    transferId: `XFER_${sc.id}_JANE_${Date.now()}`,
                    gatewayTransferId: `GWXFER_${sc.id}_JANE`,
                    beneficiaryId: `BEN_${barber._id}`,
                    amount: serviceAmount * 100, // in paise
                    amountInRupees: serviceAmount,
                    transferMode: PAYOUT_MODES.UPI,
                    status: potStatus,
                    utr: sc.barberUtr || `UTR_${sc.id}_JANE_${Date.now()}`,
                    processedAt: sc.payoutCompletedAt || (sc.completedAt || new Date()),
                    gateway: PAYOUT_GATEWAY.CASHFREE
                });

                // Update booking with payout transaction reference
                booking.payoutTransactionId = payoutTransaction._id;
                await booking.save();
            }

            console.log(`Seeded Booking #${sc.id}: status=${booking.status}, paymentStatus=${booking.paymentStatus}, payoutStatus=${booking.payoutStatus}`);
        }

        console.log('\nSeeding completed successfully.');

    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await disconnectDB();
    }
}

main();
