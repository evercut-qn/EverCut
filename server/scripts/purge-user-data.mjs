#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EverCut — Database User & Profiles Purging Script
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Permanently deletes all data associated with a specific user phone number from
 * all database collections. This is a destructive cascade purge.
 *
 * ── Architecture ────────────────────────────────────────────────────────────
 * This script identifies all linked records for a user across all models:
 *   1. User (matching the input phone number)
 *   2. Profiles (Customer, Barber) linked to the user
 *   3. Shop(s) linked to the Barber
 *   4. Employee(s) linked to the Shop(s) or the phone number
 *   5. Services, Bookings, Ratings, Subscriptions, Payments, Payouts, Notifications,
 *      FcmTokens, and Media assets linked to any of the above.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 * # Dry run (default) — lists all matching records without deleting them
 * node scripts/purge-user-data.mjs --phone=9876543212
 *
 * # Execute — permanently deletes all matching records from the database
 * node scripts/purge-user-data.mjs --phone=9876543212 --execute
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

import User from '../src/models/user.model.js';
import Customer from '../src/models/customer.model.js';
import Barber from '../src/models/barber.model.js';
import Shop from '../src/models/shop.model.js';
import Employee from '../src/models/employee.model.js';
import Booking from '../src/models/booking.model.js';
import Rating from '../src/models/rating.model.js';
import Service from '../src/models/service.model.js';
import Subscription from '../src/models/subscription.model.js';
import SubscriptionTransaction from '../src/models/subscription-transaction.model.js';
import PaymentTransaction from '../src/models/payment-transaction.model.js';
import PayoutTransaction from '../src/models/payout-transaction.model.js';
import Notification, { InboxNotification, NotificationRecipient, NotificationAuditLog } from '../src/models/notification.model.js';
import FcmToken from '../src/models/fcm-token.model.js';
import Media from '../src/models/media.model.js';

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

const normalizePhoneNumber = (phoneNumber) => {
  const value = String(phoneNumber || '').trim();
  const digits = value.replace(/\D/g, '');

  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (value.startsWith('+')) return value;
  return value;
};

async function main() {
  const inputPhone = getArgValue('phone') || '9876543212';
  const execute = process.argv.includes('--execute');

  const rawPhone = inputPhone.trim();
  const normalizedPhone = normalizePhoneNumber(rawPhone);

  console.log('');
  console.log('  ╔═══════════════════════════════════════════════════════════╗');
  console.log('  ║  EverCut — Database User Purging Script                   ║');
  console.log('  ╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Target Phone:  ${normalizedPhone}  (raw: ${rawPhone})`);
  console.log(`  Mode:          ${execute ? '🔴 EXECUTE (PERMANENT DELETE)' : '🟢 DRY RUN (SAFE)'}`);
  console.log('');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required in server/.env');
  }

  await mongoose.connect(uri);
  console.log('  Connected to database.');
  console.log('  Scanning all collections...');
  console.log('');

  // 1. Identify User(s)
  const users = await User.find({
    phoneNumber: { $in: [normalizedPhone, rawPhone] }
  }).setOptions({ includeDeleted: true });
  const userIds = users.map(u => u._id);

  // 2. Identify Profiles
  const customers = await Customer.find({
    userId: { $in: userIds }
  });
  const customerIds = customers.map(c => c._id);

  const barbers = await Barber.find({
    userId: { $in: userIds }
  }).setOptions({ includeDeleted: true });
  const barberIds = barbers.map(b => b._id);

  // 3. Identify Shops
  const shops = await Shop.find({
    barberId: { $in: barberIds }
  }).setOptions({ includeDeleted: true });
  const shopIds = shops.map(s => s._id);

  // 4. Identify Employees (either by shopId or direct phone matching)
  const employees = await Employee.find({
    $or: [
      { shopId: { $in: shopIds } },
      { phoneNumber: { $in: [normalizedPhone, rawPhone] } }
    ]
  }).setOptions({ includeDeleted: true });
  const employeeIds = employees.map(e => e._id);

  // 5. Identify Bookings
  const bookings = await Booking.find({
    $or: [
      { customerId: { $in: customerIds } },
      { shopId: { $in: shopIds } },
      { employeeId: { $in: employeeIds } }
    ]
  });
  const bookingIds = bookings.map(b => b._id);

  // 6. Identify Ratings
  const ratings = await Rating.find({
    $or: [
      { customerId: { $in: customerIds } },
      { shopId: { $in: shopIds } }
    ]
  });
  const ratingIds = ratings.map(r => r._id);

  // 7. Identify Services
  const services = await Service.find({
    shopId: { $in: shopIds }
  }).setOptions({ includeDeleted: true });
  const serviceIds = services.map(s => s._id);

  // 8. Identify Subscriptions
  const subscriptions = await Subscription.find({
    barberId: { $in: barberIds }
  });
  const subscriptionIds = subscriptions.map(s => s._id);

  // 9. Identify Subscription Transactions
  const subscriptionTransactions = await SubscriptionTransaction.find({
    $or: [
      { subscriptionId: { $in: subscriptionIds } },
      { barberId: { $in: barberIds } }
    ]
  });
  const subscriptionTransactionIds = subscriptionTransactions.map(st => st._id);

  // 10. Identify Payment Transactions
  const paymentTransactions = await PaymentTransaction.find({
    $or: [
      { bookingId: { $in: bookingIds } },
      { customerId: { $in: customerIds } },
      { shopId: { $in: shopIds } }
    ]
  });
  const paymentTransactionIds = paymentTransactions.map(pt => pt._id);

  // 11. Identify Payout Transactions
  const payoutTransactions = await PayoutTransaction.find({
    $or: [
      { bookingIds: { $in: bookingIds } },
      { barberId: { $in: barberIds } },
      { shopId: { $in: shopIds } }
    ]
  });
  const payoutTransactionIds = payoutTransactions.map(po => po._id);

  // 12. Identify Notifications
  const notifications = await Notification.find({
    $or: [
      { recipientUserId: { $in: userIds } },
      { actorUserId: { $in: userIds } }
    ]
  });
  const notificationIds = notifications.map(n => n._id);

  // 13. Identify FCM Tokens
  const fcmTokens = await FcmToken.find({
    userId: { $in: userIds }
  });
  const fcmTokenIds = fcmTokens.map(ft => ft._id);

  // 13b. Identify Inbox Notifications
  const inboxNotifications = await InboxNotification.find({
    $or: [
      { recipientUserId: { $in: userIds } },
      { actorUserId: { $in: userIds } }
    ]
  });
  const inboxNotificationIds = inboxNotifications.map(inb => inb._id);

  // 13c. Identify Notification Recipients
  const notificationRecipients = await NotificationRecipient.find({
    userId: { $in: userIds }
  });
  const notificationRecipientIds = notificationRecipients.map(nr => nr._id);

  // 13d. Identify Notification Audit Logs
  const notificationAuditLogs = await NotificationAuditLog.find({
    actorUserId: { $in: userIds }
  });
  const notificationAuditLogIds = notificationAuditLogs.map(na => na._id);

  // 14. Identify Media files (linked either by userId as string or entityId)
  const userIdsStr = userIds.map(id => String(id));
  const allRelatedEntityIds = [
    ...userIds,
    ...customerIds,
    ...barberIds,
    ...shopIds,
    ...employeeIds,
    ...bookingIds,
    ...serviceIds
  ];
  const media = await Media.find({
    $or: [
      { userId: { $in: userIdsStr } },
      { entityId: { $in: allRelatedEntityIds } }
    ]
  });
  const mediaIds = media.map(m => m._id);

  // Print Summary
  const scanResults = [
    { name: 'Users', count: users.length, ids: userIds },
    { name: 'Customers', count: customers.length, ids: customerIds },
    { name: 'Barbers', count: barbers.length, ids: barberIds },
    { name: 'Shops', count: shops.length, ids: shopIds },
    { name: 'Employees', count: employees.length, ids: employeeIds },
    { name: 'Services', count: services.length, ids: serviceIds },
    { name: 'Bookings', count: bookings.length, ids: bookingIds },
    { name: 'Ratings', count: ratings.length, ids: ratingIds },
    { name: 'Subscriptions', count: subscriptions.length, ids: subscriptionIds },
    { name: 'Subscription Transactions', count: subscriptionTransactions.length, ids: subscriptionTransactionIds },
    { name: 'Payment Transactions', count: paymentTransactions.length, ids: paymentTransactionIds },
    { name: 'Payout Transactions', count: payoutTransactions.length, ids: payoutTransactionIds },
    { name: 'Notifications', count: notifications.length, ids: notificationIds },
    { name: 'Inbox Notifications', count: inboxNotifications.length, ids: inboxNotificationIds },
    { name: 'Notification Recipients', count: notificationRecipients.length, ids: notificationRecipientIds },
    { name: 'Notification Audit Logs', count: notificationAuditLogs.length, ids: notificationAuditLogIds },
    { name: 'FCM Tokens', count: fcmTokens.length, ids: fcmTokenIds },
    { name: 'Media Assets', count: media.length, ids: mediaIds }
  ];

  console.log('  ═══════════════════════════════════════════════════════════');
  console.log('  SCAN RESULTS');
  console.log('  ═══════════════════════════════════════════════════════════');
  console.log('');

  let totalItems = 0;
  for (const item of scanResults) {
    totalItems += item.count;
    const statusIcon = item.count > 0 ? '⚠️' : '✅';
    console.log(`    ${statusIcon}  ${item.name.padEnd(28)}: ${item.count} found`);
    if (item.count > 0) {
      console.log(`        IDs: ${item.ids.join(', ')}`);
    }
  }

  console.log('');
  console.log('  ─────────────────────────────────────────────────────────');
  console.log(`  Total related records found across all tables: ${totalItems}`);
  console.log('  ─────────────────────────────────────────────────────────');
  console.log('');

  if (totalItems === 0) {
    console.log('  ✅ No records found. Nothing to purge.');
    console.log('');
    return;
  }

  if (!execute) {
    console.log('  👉 To execute the deletion of these records, run:');
    console.log(`     node scripts/purge-user-data.mjs --phone=${inputPhone} --execute`);
    console.log('');
    return;
  }

  console.log('  🚨 DELETING RECORDS FROM THE DATABASE...');
  console.log('');

  const deleteOps = [
    { name: 'Users', op: User.deleteMany({ _id: { $in: userIds } }) },
    { name: 'Customers', op: Customer.deleteMany({ _id: { $in: customerIds } }) },
    { name: 'Barbers', op: Barber.deleteMany({ _id: { $in: barberIds } }) },
    { name: 'Shops', op: Shop.deleteMany({ _id: { $in: shopIds } }) },
    { name: 'Employees', op: Employee.deleteMany({ _id: { $in: employeeIds } }) },
    { name: 'Services', op: Service.deleteMany({ _id: { $in: serviceIds } }) },
    { name: 'Bookings', op: Booking.deleteMany({ _id: { $in: bookingIds } }) },
    { name: 'Ratings', op: Rating.deleteMany({ _id: { $in: ratingIds } }) },
    { name: 'Subscriptions', op: Subscription.deleteMany({ _id: { $in: subscriptionIds } }) },
    { name: 'Subscription Transactions', op: SubscriptionTransaction.deleteMany({ _id: { $in: subscriptionTransactionIds } }) },
    { name: 'Payment Transactions', op: PaymentTransaction.deleteMany({ _id: { $in: paymentTransactionIds } }) },
    { name: 'Payout Transactions', op: PayoutTransaction.deleteMany({ _id: { $in: payoutTransactionIds } }) },
    { name: 'Notifications', op: Notification.deleteMany({ _id: { $in: notificationIds } }) },
    { name: 'Inbox Notifications', op: InboxNotification.deleteMany({ _id: { $in: inboxNotificationIds } }) },
    { name: 'Notification Recipients', op: NotificationRecipient.deleteMany({ _id: { $in: notificationRecipientIds } }) },
    { name: 'Notification Audit Logs', op: NotificationAuditLog.deleteMany({ _id: { $in: notificationAuditLogIds } }) },
    { name: 'FCM Tokens', op: FcmToken.deleteMany({ _id: { $in: fcmTokenIds } }) },
    { name: 'Media Assets', op: Media.deleteMany({ _id: { $in: mediaIds } }) }
  ];

  for (const op of deleteOps) {
    const res = await op.op;
    console.log(`    ❌ Deleted ${res.deletedCount} from ${op.name}`);
  }

  console.log('');
  console.log('  🎉 DATABASE PURGE COMPLETED SUCCESSFULLY.');
  console.log('');
}

main()
  .then(() => mongoose.disconnect().catch(() => {}))
  .catch((err) => {
    console.error('');
    console.error(`  ❌ Unexpected error: ${err.message}`);
    console.error('');
    if (err.stack) {
      console.error(err.stack);
    }
    mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
