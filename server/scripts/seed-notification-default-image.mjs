/**
 * Uploads EverCut's default notification image to Cloudflare R2 and records it
 * as system media. Dry-run by default; pass --write to upload.
 *
 * Usage:
 *   node scripts/seed-notification-default-image.mjs
 *   node scripts/seed-notification-default-image.mjs --write
 *   node scripts/seed-notification-default-image.mjs --write --force
 */

import { readFile, stat } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import connectDB, { disconnectDB } from '../src/config/database.config.js';
import config from '../src/config/index.js';
import mediaRepository from '../src/repositories/media.repository.js';
import storageProvider from '../src/services/media/storage-provider.service.js';
import logger from '../src/utils/logger.js';
import { MEDIA_PURPOSE, MEDIA_STATUS, MEDIA_TYPE } from '../src/utils/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = new Set(process.argv.slice(2));
const dryRun = !args.has('--write');
const force = args.has('--force');

const localFilePath = resolve(__dirname, '..', 'assets', 'logo', 'evercut.png');
const r2Key = config.notification.defaultImageR2Key;
const mediaId = 'system-notification-default-image';
const contentType = 'image/png';

try {
    logger.info('Starting default notification image seed', { dryRun, force, r2Key });

    const fileStats = await stat(localFilePath);

    let exists = false;
    if (!force) {
        try {
            await storageProvider.headObject(r2Key);
            exists = true;
            logger.info('Default notification image already exists in R2', { r2Key });
        } catch {
        }
    }

    if (!dryRun) {
        await connectDB();

        if (!exists) {
            const buffer = await readFile(localFilePath);
            await storageProvider.putObject(r2Key, buffer, contentType, {
                seeded: 'notification-default-image',
                purpose: MEDIA_PURPOSE.NOTIFICATION,
            });
            logger.info('Uploaded default notification image to R2', { r2Key });
        }

        const existingMedia = await mediaRepository.findById(mediaId);
        const payload = {
            _id: mediaId,
            userId: 'system',
            type: MEDIA_TYPE.IMAGE,
            status: MEDIA_STATUS.READY,
            purpose: MEDIA_PURPOSE.NOTIFICATION,
            r2Key,
            r2Bucket: config.r2.bucket,
            contentType,
            declaredSize: fileStats.size,
            actualSize: fileStats.size,
            uploadExpiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
            confirmedAt: new Date(),
        };

        if (existingMedia) {
            await mediaRepository.updateById(mediaId, payload);
            logger.info('Updated default notification image media record', { mediaId });
        } else {
            await mediaRepository.create(payload);
            logger.info('Created default notification image media record', { mediaId });
        }
    } else {
        logger.info('DRY RUN planned default notification image seed', {
            file: localFilePath,
            r2Key,
            mediaId,
            sizeBytes: fileStats.size,
        });
    }
} catch (error) {
    logger.error('Default notification image seed failed', { error: error.message, r2Key });
    process.exitCode = 1;
} finally {
    if (!dryRun) {
        await disconnectDB();
    }
}
