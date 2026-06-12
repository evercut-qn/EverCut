#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EverCut — Test Payout Data Seeder Script
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Seeds completed bookings and matching completed, unsettled payment transactions
 * to easily test manual or automatic payout endpoints multiple times.
 *
 * ── Architecture ────────────────────────────────────────────────────────────
 * This script connects to the MongoDB database, looks up standard test records
 * (Barber, Shop, Customer, Employee), and inserts sets of completed bookings
 * and associated payment transactions. Each set contains two bookings.
 *
 * ── Usage ────────────────────────────────════════════════════════════════════
 * # Create 1 set of test data (default, generates 2 bookings/payments)
 * node scripts/create-test-payout-data.mjs
 *
 * # Create multiple sets of test data (e.g., 5 sets)
 * node scripts/create-test-payout-data.mjs --count=5
 *
 * ── Prerequisites ───────────────────────────────────────────────────────────
 * 1. .env must contain: MONGODB_URI
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import Barber from '../src/models/barber.model.js';
import Customer from '../src/models/customer.model.js';
import Shop from '../src/models/shop.model.js';
import Employee from '../src/models/employee.model.js';
import Booking from '../src/models/booking.model.js';
import PaymentTransaction from '../src/models/payment-transaction.model.js';
import Service from '../src/models/service.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const getArgValue = (name) => {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  return null;
};

async function main() {
  const countStr = getArgValue('count') || '1';
  const setsCount = Math.max(1, parseInt(countStr, 10) || 1);

  console.log('');
  console.log('  ╔═══════════════════════════════════════════════════════════╗');
  console.log('  ║  EverCut — Test Payout Data Seeder                        ║');
  console.log('  ╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Seeding: ${setsCount} set(s) of test data (${setsCount * 2} bookings/payments)`);
  console.log('');

  try {
    const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required in server/.env');
  }

  await mongoose.connect(uri);
  console.log('  Connected to database.');

  // Target IDs (try finding these first)
  const targetBarberId = '6a0d95cdfc8c83dc26a39a18';
  const targetShopId = '69e9ec2b71f79d2940d358e9';
  const targetCustomerId = '69e9ec5071f79d2940d358f9';
  const targetEmployeeId = '69e9ecfb71f79d2940d35901';

  // Find Barber
  let barber = await Barber.findById(targetBarberId).setOptions({ includeDeleted: true });
  if (!barber) {
    barber = await Barber.findOne().setOptions({ includeDeleted: true });
  }
  if (!barber) {
    throw new Error('No Barber record found in the database. Please seed basic data first.');
  }

  // Find Shop
  let shop = await Shop.findById(targetShopId).setOptions({ includeDeleted: true });
  if (!shop || String(shop.barberId) !== String(barber._id)) {
    shop = await Shop.findOne({ barberId: barber._id }).setOptions({ includeDeleted: true });
  }
  if (!shop) {
    throw new Error(`No Shop found for Barber ${barber._id}`);
  }

  // Find Customer
  let customer = await Customer.findById(targetCustomerId);
  if (!customer) {
    customer = await Customer.findOne();
  }
  if (!customer) {
    throw new Error('No Customer record found in the database. Please seed basic data first.');
  }

  // Find Employee
  let employee = await Employee.findById(targetEmployeeId).setOptions({ includeDeleted: true });
  if (!employee || String(employee.shopId) !== String(shop._id)) {
    employee = await Employee.findOne({ shopId: shop._id }).setOptions({ includeDeleted: true });
  }
  if (!employee) {
    throw new Error(`No Employee found for Shop ${shop._id}`);
  }

  // Find or Create Service
  let service = await Service.findOne({ shopId: shop._id, finalPrice: 450 }).setOptions({ includeDeleted: true });
  if (!service) {
    service = await Service.findOne({ shopId: shop._id }).setOptions({ includeDeleted: true });
  }
  if (!service) {
    service = await Service.create({
      shopId: shop._id,
      serviceName: 'Haircut',
      serviceType: 'single',
      serviceFor: 'men',
      duration: 30,
      actualPrice: 450,
      finalPrice: 450,
      isActive: true,
    });
    console.log(`  Created new Service: ${service._id}`);
  }

  const servicePrice = service.finalPrice || 450;
  const platformFee = 3; // Rs 3 standard platform fee
  const totalAmountCharged = servicePrice + platformFee;

  console.log(`  Using Barber:   ${barber.firstName} ${barber.lastName} (${barber._id})`);
  console.log(`  Using Shop:     ${shop.shopName} (${shop._id})`);
  console.log(`  Using Customer: ${customer.firstName} ${customer.lastName} (${customer._id})`);
  console.log(`  Using Employee: ${employee.firstName} ${employee.lastName || ''} (${employee._id})`);
  console.log(`  Using Service:  ${service.serviceName} (Rs ${servicePrice}) (${service._id})`);
  console.log('');

  const seededSets = [];

  for (let i = 0; i < setsCount; i++) {
    const setNum = i + 1;
    const baseHour = 10 + (i % 8); // spreads times starting from 10:00 AM

    const bookingsData = [
      {
        customerId: customer._id,
        shopId: shop._id,
        employeeId: employee._id,
        serviceIds: [service._id],
        date: new Date(),
        time: `${baseHour}:00 AM`,
        endTime: `${baseHour}:30 AM`,
        startMinute: baseHour * 60,
        endMinute: baseHour * 60 + 30,
        totalAmount: servicePrice,
        durationMinutes: 30,
        status: 'completed',
        paymentStatus: 'success',
        payoutStatus: 'not_initiated',
      },
      {
        customerId: customer._id,
        shopId: shop._id,
        employeeId: employee._id,
        serviceIds: [service._id],
        date: new Date(),
        time: `${baseHour}:30 AM`,
        endTime: `${baseHour + 1}:00 AM`,
        startMinute: baseHour * 60 + 30,
        endMinute: (baseHour + 1) * 60,
        totalAmount: servicePrice,
        durationMinutes: 30,
        status: 'completed',
        paymentStatus: 'success',
        payoutStatus: 'not_initiated',
      }
    ];

    const createdBookings = await Booking.create(bookingsData);
    const bookingIds = createdBookings.map(b => b._id);

    for (const booking of createdBookings) {
      const payment = await PaymentTransaction.create({
        bookingId: booking._id,
        customerId: customer._id,
        shopId: shop._id,
        merchantOrderId: `EC-${booking._id}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
        amount: totalAmountCharged * 100,
        amountInRupees: totalAmountCharged,
        currency: 'INR',
        status: 'completed',
        settlement: {
          serviceAmount: servicePrice * 100,
          platformFee: platformFee * 100,
          barberPayout: servicePrice * 100,
          isBundle: false,
          settled: false,
          settledAt: null,
        },
      });

      // Update booking to reference the payment transaction
      await Booking.findByIdAndUpdate(booking._id, { paymentTransactionId: payment._id });
    }

    seededSets.push({
      setNum,
      bookingIds: bookingIds.map(id => String(id)),
      utr: `MTEST${Date.now().toString().slice(-6)}${setNum}`
    });
  }

  console.log('  ═══════════════════════════════════════════════════════════');
  console.log('  SEEDED DATA DETAILS');
  console.log('  ═══════════════════════════════════════════════════════════');
  console.log('');
  
  for (const set of seededSets) {
    console.log(`  Set #${set.setNum}:`);
    console.log(`    Booking IDs:  ${JSON.stringify(set.bookingIds)}`);
    console.log(`    Suggested UTR: ${set.utr}`);
    console.log('');
  }

  console.log('  👉 Use any of the sets above to create a manual payout.');
  console.log('');

} catch (error) {
  console.error('  ❌ Seeding failed:', error.message);
} finally {
  await mongoose.disconnect().catch(() => {});
}
}

main();
