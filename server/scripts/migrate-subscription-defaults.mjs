#!/usr/bin/env node

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const execute = process.argv.includes('--execute');

const requiredEnv = [
    'MONGODB_URI',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'MSG91_AUTH_KEY',
    'MSG91_OTP_TEMPLATE_ID',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_ONBOARDING_SECRET',
    'CF_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
    'CDN_BASE_URL',
    'MEDIA_TOKEN_SECRET',
];

for (const key of requiredEnv) {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

const [{ default: Barber }, { default: subscriptionRepository }, { default: transactionRepository }] = await Promise.all([
    import('../src/models/barber.model.js'),
    import('../src/repositories/subscription.repository.js'),
    import('../src/repositories/subscription-transaction.repository.js'),
]);

const { SUBSCRIPTION_PLANS, SUBSCRIPTION_TRANSACTION_TYPES } = await import('../src/utils/constants.js');

await mongoose.connect(process.env.MONGODB_URI);

async function ensureSubscriptionIndexes() {
    const dropIndexIfPresent = async (collection, indexes, indexName) => {
        if (!indexes.some((index) => index.name === indexName)) return;

        await collection.dropIndex(indexName).catch((error) => {
            if (error.codeName === 'IndexNotFound') return;
            throw error;
        });
    };

    const repairStringUniqueIndex = async (collectionName, indexName, fieldName, legacyIndexNames = []) => {
        const collection = mongoose.connection.db.collection(collectionName);
        const indexes = await collection.indexes().catch((error) => {
            if (error.codeName === 'NamespaceNotFound') return [];
            throw error;
        });

        const existingIndex = indexes.find((index) => index.name === indexName);
        const expectedPartial = { [fieldName]: { $type: 'string' } };

        if (existingIndex && JSON.stringify(existingIndex.partialFilterExpression) !== JSON.stringify(expectedPartial)) {
            await collection.dropIndex(indexName);
        }

        for (const legacyIndexName of legacyIndexNames) {
            await dropIndexIfPresent(collection, indexes, legacyIndexName);
        }

        await collection.createIndex(
            { [fieldName]: 1 },
            {
                unique: true,
                name: indexName,
                partialFilterExpression: expectedPartial,
            },
        );
    };

    await repairStringUniqueIndex(
        'subscriptions',
        'idx_subscription_razorpay_id',
        'razorpaySubscriptionId',
        ['razorpaySubscriptionId_1'],
    );
    await repairStringUniqueIndex(
        'subscription_transactions',
        'idx_subscription_webhook_event_id',
        'webhookEventId',
        ['webhookEventId_1'],
    );
}

async function ensureMigrationTransaction(subscription, barberId) {
    const existingTransaction = await mongoose.connection.db.collection('subscription_transactions').findOne({
        subscriptionId: subscription._id,
        barberId,
        type: SUBSCRIPTION_TRANSACTION_TYPES.CREATION,
        source: 'MIGRATION',
    });

    if (existingTransaction) return false;

    await transactionRepository.create({
        subscriptionId: subscription._id,
        barberId,
        type: SUBSCRIPTION_TRANSACTION_TYPES.CREATION,
        source: 'MIGRATION',
        fromPlan: null,
        toPlan: SUBSCRIPTION_PLANS.BASIC,
        amount: 0,
        currency: 'INR',
        metadata: {
            reason: 'Backfilled default Basic subscription for existing barber',
        },
    });

    return true;
}

try {
    if (execute) {
        await ensureSubscriptionIndexes();
    }

    const barbers = await Barber.find({ deletedAt: null }).select('_id').lean();
    let existing = 0;
    let created = 0;
    let transactionsCreated = 0;

    for (const barber of barbers) {
        const subscription = await subscriptionRepository.findByBarberId(barber._id);
        if (subscription) {
            existing += 1;
            if (execute && subscription.metadata?.source === 'MIGRATION') {
                const transactionCreated = await ensureMigrationTransaction(subscription, barber._id);
                if (transactionCreated) transactionsCreated += 1;
            }
            continue;
        }

        if (!execute) {
            created += 1;
            continue;
        }

        const inserted = await subscriptionRepository.upsertDefaultForBarber(barber._id, 'MIGRATION');
        const transactionCreated = await ensureMigrationTransaction(inserted, barber._id);
        if (transactionCreated) transactionsCreated += 1;
        created += 1;
    }

    console.log(JSON.stringify({
        mode: execute ? 'execute' : 'dry-run',
        totalBarbers: barbers.length,
        existingSubscriptions: existing,
        subscriptionsToCreate: execute ? undefined : created,
        subscriptionsCreated: execute ? created : undefined,
        migrationTransactionsCreated: execute ? transactionsCreated : undefined,
    }, null, 2));
} finally {
    await mongoose.disconnect();
}
