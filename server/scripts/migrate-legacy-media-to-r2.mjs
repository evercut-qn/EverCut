/**
 * Copies URL-backed media records into Cloudflare R2 and writes R2 keys.
 *
 * Default mode is dry-run. Use --write after reviewing the planned changes.
 *
 * Examples:
 *   node scripts/migrate-legacy-media-to-r2.mjs
 *   node scripts/migrate-legacy-media-to-r2.mjs --write --limit=100
 */

import mongoose from 'mongoose';
import config from '../src/config/index.js';
import connectDB, { disconnectDB } from '../src/config/database.config.js';
import Customer from '../src/models/customer.model.js';
import Employee from '../src/models/employee.model.js';
import Media from '../src/models/media.model.js';
import Shop from '../src/models/shop.model.js';
import storageProvider from '../src/services/media/storage-provider.service.js';
import {
    GALLERY_CATEGORY,
    MEDIA_ENTITY_TYPE,
    MEDIA_PURPOSE,
    MEDIA_STATUS,
    MEDIA_TYPE,
    MIME_TO_EXTENSION,
} from '../src/utils/constants.js';
import logger from '../src/utils/logger.js';

const args = new Set(process.argv.slice(2));
const dryRun = !args.has('--write');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : Number.POSITIVE_INFINITY;
const now = new Date();

const counters = {
    planned: 0,
    copied: 0,
    skipped: 0,
    failed: 0,
};

const contentTypeAliases = new Map([
    ['image/jpg', 'image/jpeg'],
]);

const normalizeContentType = (contentType) => {
    const normalized = String(contentType || '').split(';')[0].trim().toLowerCase();
    return contentTypeAliases.get(normalized) || normalized || 'application/octet-stream';
};

const extensionFrom = (contentType, url) => {
    const mapped = MIME_TO_EXTENSION[normalizeContentType(contentType)];
    if (mapped) return mapped;

    try {
        const pathname = new URL(url).pathname;
        const extension = pathname.split('.').pop()?.toLowerCase();
        if (extension && /^[a-z0-9]{2,5}$/.test(extension)) return extension;
    } catch {
        // Ignore malformed historical URLs; the caller will surface fetch failures.
    }

    return 'bin';
};

const sanitizePart = (value, fallback) => {
    const sanitized = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return sanitized || fallback;
};

const isProbablyUrl = (value) => /^https?:\/\//i.test(String(value || ''));

const fetchWithRetry = async (url, attempts = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const contentType = normalizeContentType(response.headers.get('content-type'));
            const body = Buffer.from(await response.arrayBuffer());

            return { body, contentType };
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                await new Promise((resolve) => setTimeout(resolve, attempt * 500));
            }
        }
    }

    throw lastError;
};

const writeMediaRecord = async ({
    id,
    ownerId,
    entityId,
    entityType,
    purpose,
    r2Key,
    contentType,
    size,
    metadata = {},
}) => {
    const mediaData = {
        _id: id,
        userId: String(ownerId),
        type: contentType.startsWith('video/') ? MEDIA_TYPE.VIDEO : MEDIA_TYPE.IMAGE,
        status: MEDIA_STATUS.READY,
        purpose,
        r2Key,
        r2Bucket: config.r2.bucket,
        contentType,
        declaredSize: size,
        actualSize: size,
        entityId,
        entityType,
        metadata,
        uploadExpiresAt: now,
        confirmedAt: now,
    };

    await Media.findByIdAndUpdate(id, { $set: mediaData }, { upsert: true, runValidators: true });
};

const migrateOne = async ({
    sourceId,
    url,
    ownerId,
    entityId,
    entityType,
    purpose,
    targetModel,
    targetId,
    targetField,
    label,
    metadata,
}) => {
    if (!isProbablyUrl(url)) {
        counters.skipped += 1;
        return;
    }

    counters.planned += 1;
    if (counters.planned > limit) return;

    const mediaId = `legacy-${sanitizePart(label, 'media')}-${sourceId}`;
    const existing = await Media.findById(mediaId).lean();

    if (existing) {
        if (!dryRun) {
            if (targetField) {
                await targetModel.findByIdAndUpdate(targetId, { $set: { [targetField]: existing.r2Key } });
            }
        }
        counters.skipped += 1;
        return;
    }

    if (dryRun) {
        logger.info('DRY RUN media migration planned', { label, sourceId, targetField });
        return;
    }

    const downloaded = await fetchWithRetry(url);
    const extension = extensionFrom(downloaded.contentType, url);
    const r2Key = [
        downloaded.contentType.startsWith('video/') ? 'videos' : 'images',
        sanitizePart(purpose, 'media'),
        sanitizePart(ownerId, 'unknown-owner'),
        `${sanitizePart(sourceId, 'legacy')}.${extension}`,
    ].join('/');

    await storageProvider.putObject(r2Key, downloaded.body, downloaded.contentType, {
        migratedFrom: 'legacy-url',
        sourceId: String(sourceId),
    });

    await writeMediaRecord({
        id: mediaId,
        ownerId,
        entityId,
        entityType,
        purpose,
        r2Key,
        contentType: downloaded.contentType,
        size: downloaded.body.length,
        metadata,
    });

    if (targetField) {
        await targetModel.findByIdAndUpdate(targetId, { $set: { [targetField]: r2Key } });
    }

    counters.copied += 1;
    logger.info('Migrated legacy media to R2', { label, sourceId, r2Key });
};

const runForProfiles = async () => {
    const shops = await mongoose.connection.db.collection('shops').find({
        $or: [
            { coverUrl: { $type: 'string' }, coverR2Key: { $in: [null, ''] } },
            { ownerPhotoUrl: { $type: 'string' }, ownerPhotoR2Key: { $in: [null, ''] } },
        ],
    }).toArray();

    for (const shop of shops) {
        await migrateOne({
            sourceId: `${shop._id}-cover`,
            url: shop.coverUrl,
            ownerId: shop.ownerId,
            entityId: shop._id,
            entityType: MEDIA_ENTITY_TYPE.SHOP,
            purpose: MEDIA_PURPOSE.COVER,
            targetModel: Shop,
            targetId: shop._id,
            targetField: 'coverR2Key',
            label: 'shop-cover',
            metadata: { originalName: 'shop-cover' },
        });

        await migrateOne({
            sourceId: `${shop._id}-owner`,
            url: shop.ownerPhotoUrl,
            ownerId: shop.ownerId,
            entityId: shop._id,
            entityType: MEDIA_ENTITY_TYPE.SHOP,
            purpose: MEDIA_PURPOSE.PROFILE,
            targetModel: Shop,
            targetId: shop._id,
            targetField: 'ownerPhotoR2Key',
            label: 'shop-owner',
            metadata: { originalName: 'shop-owner' },
        });
    }

    const employees = await mongoose.connection.db.collection('employees').find({
        photoUrl: { $type: 'string' },
        photoR2Key: { $in: [null, ''] },
    }).toArray();

    for (const employee of employees) {
        const shop = await Shop.findById(employee.shopId).select('ownerId').lean();
        if (!shop) {
            counters.skipped += 1;
            continue;
        }

        await migrateOne({
            sourceId: employee._id,
            url: employee.photoUrl,
            ownerId: shop.ownerId,
            entityId: employee._id,
            entityType: MEDIA_ENTITY_TYPE.EMPLOYEE,
            purpose: MEDIA_PURPOSE.EMPLOYEE,
            targetModel: Employee,
            targetId: employee._id,
            targetField: 'photoR2Key',
            label: 'employee-photo',
            metadata: { originalName: `${employee.firstName || 'employee'}-photo` },
        });
    }

    const customers = await mongoose.connection.db.collection('customers').find({
        photoUrl: { $type: 'string' },
        photoR2Key: { $in: [null, ''] },
    }).toArray();

    for (const customer of customers) {
        await migrateOne({
            sourceId: customer._id,
            url: customer.photoUrl,
            ownerId: customer.userId,
            entityId: customer._id,
            entityType: MEDIA_ENTITY_TYPE.CUSTOMER,
            purpose: MEDIA_PURPOSE.AVATAR,
            targetModel: Customer,
            targetId: customer._id,
            targetField: 'photoR2Key',
            label: 'customer-photo',
            metadata: { originalName: `${customer.firstName || 'customer'}-photo` },
        });
    }
};

const runForLegacyGallery = async () => {
    const collectionNames = new Set((await mongoose.connection.db.listCollections().toArray()).map((item) => item.name));
    if (!collectionNames.has('photos')) return;

    const cursor = mongoose.connection.db.collection('photos').find({
        isActive: { $ne: false },
        photoUrl: { $type: 'string' },
    });

    for await (const photo of cursor) {
        const shop = await Shop.findById(photo.shopId).select('ownerId').lean();
        if (!shop) {
            counters.skipped += 1;
            continue;
        }

        const category = Object.values(GALLERY_CATEGORY).includes(photo.photoType)
            ? photo.photoType
            : GALLERY_CATEGORY.OTHER;

        await migrateOne({
            sourceId: photo._id,
            url: photo.photoUrl,
            ownerId: shop.ownerId,
            entityId: photo.shopId,
            entityType: MEDIA_ENTITY_TYPE.SHOP,
            purpose: MEDIA_PURPOSE.GALLERY,
            targetModel: null,
            targetId: null,
            targetField: null,
            label: 'gallery-photo',
            metadata: {
                category,
                description: photo.description || null,
                originalName: photo.photoName || 'gallery-photo',
            },
        });
    }
};

try {
    logger.info('Starting legacy media migration', { dryRun, limit });
    await connectDB();
    await runForProfiles();
    await runForLegacyGallery();
    logger.info('Legacy media migration complete', counters);
} catch (err) {
    counters.failed += 1;
    logger.error('Legacy media migration failed', { error: err.message, counters });
    process.exitCode = 1;
} finally {
    await disconnectDB();
}
