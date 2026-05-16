/**
 * Uploads default service images to Cloudflare R2 and generates the runtime
 * catalog JSON consumed by service-catalog.service.js.
 *
 * Default mode is dry-run. Use --write to actually upload.
 * Use --force to re-upload objects that already exist in R2.
 *
 * Examples:
 *   node scripts/seed-service-images.mjs                  (dry-run)
 *   node scripts/seed-service-images.mjs --write          (upload)
 *   node scripts/seed-service-images.mjs --write --force  (re-upload)
 */

import { readFile } from 'fs/promises';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import connectDB, { disconnectDB } from '../src/config/database.config.js';
import storageProvider from '../src/services/media/storage-provider.service.js';
import serviceDefaultImageRepository from '../src/repositories/service-default-image.repository.js';
import logger from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = new Set(process.argv.slice(2));
const dryRun = !args.has('--write');
const force = args.has('--force');

const EXTENSION_MAP = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

const counters = {
    planned: 0,
    uploaded: 0,
    skipped: 0,
    failed: 0,
    upserted: 0,
};

const buildR2Key = (serviceType, serviceFor, name, contentType) => {
    const ext = EXTENSION_MAP[contentType] || extname(name).slice(1) || 'jpg';
    return `images/services/${serviceType}/${serviceFor}/${name}.${ext}`;
};

const loadManifest = async () => {
    const manifestPath = resolve(__dirname, 'service-images-manifest.json');
    const raw = await readFile(manifestPath, 'utf-8');
    return JSON.parse(raw);
};

const uploadOne = async (entry) => {
    const filePath = resolve(__dirname, '..', entry.file);
    const r2Key = buildR2Key(entry.serviceType, entry.serviceFor, entry.name, entry.contentType);

    counters.planned += 1;

    let exists = false;
    if (!force) {
        try {
            await storageProvider.headObject(r2Key);
            logger.info('Object already exists in R2, skipping upload', { r2Key });
            counters.skipped += 1;
            exists = true;
        } catch {
        }
    }

    if (!exists && !dryRun) {
        try {
            const buffer = await readFile(filePath);
            await storageProvider.putObject(r2Key, buffer, entry.contentType, {
                seeded: 'service-image',
                name: entry.name,
                serviceType: entry.serviceType,
                serviceFor: entry.serviceFor,
            });
            counters.uploaded += 1;
            logger.info('Uploaded service image to R2', { r2Key, file: entry.file });
        } catch (err) {
            counters.failed += 1;
            logger.error('Failed to upload service image', { r2Key, file: entry.file, error: err.message });
            throw err;
        }
    } else if (!exists && dryRun) {
        logger.info('DRY RUN planned upload', { r2Key, file: entry.file });
    }

    // Prepare DB record
    const dbRecord = {
        name: entry.name,
        serviceType: entry.serviceType,
        serviceFor: entry.serviceFor,
        r2Key,
        keywords: entry.keywords,
        isFallback: false,
    };

    if (!dryRun) {
        await serviceDefaultImageRepository.upsert(dbRecord);
        counters.upserted += 1;
        logger.info('Upserted image record to DB', { name: entry.name });
    } else {
        logger.info('DRY RUN planned DB upsert', { name: entry.name });
    }

    return { r2Key, ...entry };
};

const uploadDefault = async (serviceType, serviceFor, filePath, contentType) => {
    const r2Key = `images/services/default/${serviceType}/${serviceFor}.${EXTENSION_MAP[contentType] || 'jpg'}`;
    const resolvedPath = resolve(__dirname, '..', filePath);

    counters.planned += 1;

    let exists = false;
    if (!force) {
        try {
            await storageProvider.headObject(r2Key);
            logger.info('Default object already exists in R2, skipping upload', { r2Key });
            counters.skipped += 1;
            exists = true;
        } catch {
        }
    }

    if (!exists && !dryRun) {
        try {
            const buffer = await readFile(resolvedPath);
            await storageProvider.putObject(r2Key, buffer, contentType, {
                seeded: 'service-default-image',
                serviceType,
                serviceFor,
            });
            counters.uploaded += 1;
            logger.info('Uploaded default service image to R2', { r2Key, file: filePath });
        } catch (err) {
            counters.failed += 1;
            logger.error('Failed to upload default service image', { r2Key, file: filePath, error: err.message });
            throw err;
        }
    } else if (!exists && dryRun) {
        logger.info('DRY RUN planned default upload', { r2Key, file: filePath });
    }

    // Prepare DB record for fallback
    const dbRecord = {
        name: `default-${serviceType}-${serviceFor}`,
        serviceType,
        serviceFor,
        r2Key,
        keywords: ['default', 'fallback', serviceType, serviceFor],
        isFallback: true,
    };

    if (!dryRun) {
        await serviceDefaultImageRepository.upsert(dbRecord);
        counters.upserted += 1;
        logger.info('Upserted fallback image record to DB', { serviceType, serviceFor });
    } else {
        logger.info('DRY RUN planned DB fallback upsert', { serviceType, serviceFor });
    }

    return r2Key;
};

try {
    logger.info('Starting service image seeding (Database-Driven)', { dryRun, force });

    if (!dryRun) {
        await connectDB();
    }

    const manifest = await loadManifest();

    for (const entry of manifest.images) {
        await uploadOne(entry);
    }

    await uploadDefault('single', 'male', manifest.defaults.single, 'image/jpeg');
    await uploadDefault('bundled', 'male', manifest.defaults.bundled, 'image/jpeg');

    logger.info('Service image seeding complete', counters);
} catch (err) {
    logger.error('Service image seeding failed', { error: err.message, counters });
    process.exitCode = 1;
} finally {
    if (!dryRun) {
        await disconnectDB();
    }
}