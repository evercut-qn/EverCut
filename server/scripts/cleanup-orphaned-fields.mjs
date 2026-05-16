/**
 * Removes non-schema orphaned fields from all collections and fixes
 * inconsistent entityId/entityType pairs in the media collection.
 *
 * This script compares each collection's documents against the corresponding
 * Mongoose schema and $unset any fields that are not defined in the schema.
 *
 * Common orphaned fields include transient input parameters like `imageMediaId`,
 * `photoMediaId`, `coverMediaId`, `profileMediaId` that leak through raw
 * MongoDB driver operations (which bypass Mongoose's strict: true validation).
 *
 * It also fixes media documents where entityId is set but entityType is null.
 * These two fields should always be set together or both be null — an entityId
 * without an entityType is meaningless because the entity's type is unknown.
 *
 * Default mode is dry-run. Use --write to actually remove orphaned fields.
 *
 * Examples:
 *   node scripts/cleanup-orphaned-fields.mjs            (dry-run)
 *   node scripts/cleanup-orphaned-fields.mjs --write    (remove fields)
 */

import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../src/config/database.config.js';
import logger from '../src/utils/logger.js';

import Service from '../src/models/service.model.js';
import Customer from '../src/models/customer.model.js';
import Shop from '../src/models/shop.model.js';
import Employee from '../src/models/employee.model.js';
import User from '../src/models/user.model.js';
import Booking from '../src/models/booking.model.js';
import Media from '../src/models/media.model.js';
import Rating from '../src/models/rating.model.js';
import Notification from '../src/models/notification.model.js';
import PaymentTransaction from '../src/models/payment-transaction.model.js';
import PayoutTransaction from '../src/models/payout-transaction.model.js';
import FcmToken from '../src/models/fcm-token.model.js';
import ServiceDefaultImage from '../src/models/service-default-image.model.js';

const args = new Set(process.argv.slice(2));
const dryRun = !args.has('--write');

const alwaysAllowed = new Set(['_id', '__v']);

const getSchemaKeys = (model) => {
    const paths = Object.keys(model.schema.paths);
    const virtuals = Object.keys(model.schema.virtuals);
    const allKeys = new Set([...paths, ...virtuals, ...alwaysAllowed]);
    for (const path of paths) {
        const parts = path.split('.');
        for (let i = 1; i < parts.length; i++) {
            allKeys.add(parts.slice(0, i).join('.'));
        }
    }
    return allKeys;
};

const models = [
    ['services', Service],
    ['customers', Customer],
    ['shops', Shop],
    ['employees', Employee],
    ['users', User],
    ['bookings', Booking],
    ['media', Media],
    ['ratings', Rating],
    ['notifications', Notification],
    ['payment_transactions', PaymentTransaction],
    ['payout_transactions', PayoutTransaction],
    ['fcm_tokens', FcmToken],
    ['service_default_images', ServiceDefaultImage],
];

const counters = {
    collectionsChecked: 0,
    totalOrphanedFields: 0,
    documentsAffected: 0,
    inconsistentEntityPairs: 0,
    inconsistentEntityPairsFixed: 0,
};

try {
    logger.info('Starting orphaned field cleanup', { dryRun });
    await connectDB();
    const db = mongoose.connection.db;

    for (const [collectionName, model] of models) {
        const allowed = getSchemaKeys(model);
        const collections = new Set((await db.listCollections().toArray()).map((c) => c.name));
        if (!collections.has(collectionName)) {
            logger.info('Collection not found, skipping', { collectionName });
            continue;
        }

        counters.collectionsChecked += 1;
        const docs = await db.collection(collectionName).find({}).toArray();

        const orphanedFields = new Set();
        for (const doc of docs) {
            for (const key of Object.keys(doc)) {
                if (!allowed.has(key)) orphanedFields.add(key);
            }
        }

        if (orphanedFields.size === 0) {
            logger.info('No orphaned fields found', { collectionName });
            continue;
        }

        const fieldList = [...orphanedFields];
        counters.totalOrphanedFields += fieldList.length;

        const unsetObj = {};
        for (const field of fieldList) {
            unsetObj[field] = '';
        }

        if (dryRun) {
            logger.info('DRY RUN would remove orphaned fields', {
                collectionName,
                fields: fieldList,
                affectedDocuments: docs.length,
            });
            counters.documentsAffected += docs.length;
            continue;
        }

        const result = await db.collection(collectionName).updateMany(
            {},
            { $unset: unsetObj },
        );

        counters.documentsAffected += result.modifiedCount;
        logger.info('Removed orphaned fields', {
            collectionName,
            fields: fieldList,
            modifiedCount: result.modifiedCount,
        });
    }

    // Fix inconsistent entityId/entityType pairs in the media collection
    // entityId and entityType should always be set together or both be null.
    // An entityId without entityType is meaningless (which entity does it reference?).
    const mediaCollections = new Set((await db.listCollections().toArray()).map((c) => c.name));
    if (mediaCollections.has('media')) {
        const inconsistentCount = await db.collection('media').countDocuments({
            entityId: { $ne: null },
            entityType: null,
        });

        counters.inconsistentEntityPairs = inconsistentCount;

        if (inconsistentCount === 0) {
            logger.info('No inconsistent entityId/entityType pairs found in media collection');
        } else if (dryRun) {
            logger.info('DRY RUN would clear entityId on media docs with null entityType', {
                affectedDocuments: inconsistentCount,
            });
        } else {
            const result = await db.collection('media').updateMany(
                { entityId: { $ne: null }, entityType: null },
                { $set: { entityId: null } },
            );
            counters.inconsistentEntityPairsFixed = result.modifiedCount;
            logger.info('Fixed inconsistent entityId/entityType pairs in media', {
                modifiedCount: result.modifiedCount,
            });
        }
    }

    logger.info('Orphaned field cleanup complete', counters);
} catch (err) {
    logger.error('Orphaned field cleanup failed', { error: err.message });
    process.exitCode = 1;
} finally {
    await disconnectDB();
}