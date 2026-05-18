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

const buildR2Key = (serviceType, categoryId, serviceFor, contentType) => {
    const ext = EXTENSION_MAP[contentType] || 'jpg';
    return `images/services/${serviceType}/${categoryId}/${serviceFor}.${ext}`;
};

const loadManifest = async () => {
    const manifestPath = resolve(__dirname, 'service-images-manifest.json');
    const raw = await readFile(manifestPath, 'utf-8');
    return JSON.parse(raw);
};

const uploadOne = async (entry) => {
    const filePath = resolve(__dirname, '..', entry.file);
    const r2Key = buildR2Key(entry.serviceType, entry.categoryId, entry.serviceFor, entry.contentType);

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
                categoryId: entry.categoryId,
                serviceType: entry.serviceType,
                serviceFor: entry.serviceFor,
                isGlobalDefault: entry.isGlobalDefault ? 'true' : 'false',
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
        categoryId: entry.categoryId,
        serviceType: entry.serviceType,
        serviceFor: entry.serviceFor,
        r2Key,
        keywords: entry.keywords,
        isGlobalDefault: !!entry.isGlobalDefault,
        isFallback: !!entry.isGlobalDefault, // Maintain compatibility for now
    };

    if (!dryRun) {
        await serviceDefaultImageRepository.upsert(dbRecord);
        counters.upserted += 1;
        logger.info('Upserted image record to DB', { name: entry.name, categoryId: entry.categoryId });
    } else {
        logger.info('DRY RUN planned DB upsert', { name: entry.name });
    }

    return { r2Key, ...entry };
};

try {
    logger.info('Starting production-grade service image seeding', { dryRun, force });

    if (!dryRun) {
        await connectDB();
    }

    const manifest = await loadManifest();

    // 1. Process all images in the manifest
    for (const entry of manifest.images) {
        await uploadOne(entry);
    }

    // 2. Validation: Ensure all 6 global defaults exist in DB
    if (!dryRun) {
        const types = ['single', 'bundled'];
        const genders = ['male', 'female', 'unisex'];
        let missingCount = 0;

        for (const type of types) {
            for (const gender of genders) {
                const found = await serviceDefaultImageRepository.findGlobalDefault(type, gender);
                if (!found) {
                    logger.error('CRITICAL: Missing global default after seeding', { type, gender });
                    missingCount += 1;
                }
            }
        }

        if (missingCount > 0) {
            throw new Error(`Seeding failed: ${missingCount} global defaults are missing.`);
        }
    }

    logger.info('Service image seeding complete', counters);
} catch (err) {
    logger.error('Service image seeding failed', { error: err.message, counters });
    process.exitCode = 1;
} finally {
    if (!dryRun) {
        await disconnectDB();
    }
}