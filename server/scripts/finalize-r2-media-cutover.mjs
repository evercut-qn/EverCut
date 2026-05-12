/**
 * Finalizes the R2 media cutover after migrate-legacy-media-to-r2.mjs succeeds.
 *
 * Default mode is dry-run. Use --write to unset retired URL fields and drop the
 * legacy photos collection after the script verifies every old reference has an
 * R2-backed replacement.
 *
 * Examples:
 *   node scripts/finalize-r2-media-cutover.mjs
 *   node scripts/finalize-r2-media-cutover.mjs --write
 */

import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../src/config/database.config.js';
import logger from '../src/utils/logger.js';

const args = new Set(process.argv.slice(2));
const dryRun = !args.has('--write');

const hasUrlWithoutKey = (urlField, keyField) => ({
    [urlField]: { $type: 'string', $ne: '' },
    $or: [
        { [keyField]: { $exists: false } },
        { [keyField]: null },
        { [keyField]: '' },
    ],
});

const getLegacyGalleryGapCount = async (db) => {
    const collections = new Set((await db.listCollections().toArray()).map((item) => item.name));
    if (!collections.has('photos')) return 0;

    const activePhotos = await db.collection('photos').find({ isActive: { $ne: false } }).toArray();
    if (activePhotos.length === 0) return 0;

    const expectedIds = activePhotos.map((photo) => `legacy-gallery-photo-${photo._id}`);
    const migratedCount = await db.collection('media').countDocuments({ _id: { $in: expectedIds } });
    return expectedIds.length - migratedCount;
};

const collectGaps = async (db) => {
    const [shopCoverMissing, shopOwnerMissing, employeeMissing, customerMissing, galleryMissing] = await Promise.all([
        db.collection('shops').countDocuments(hasUrlWithoutKey('coverUrl', 'coverR2Key')),
        db.collection('shops').countDocuments(hasUrlWithoutKey('ownerPhotoUrl', 'ownerPhotoR2Key')),
        db.collection('employees').countDocuments(hasUrlWithoutKey('photoUrl', 'photoR2Key')),
        db.collection('customers').countDocuments(hasUrlWithoutKey('photoUrl', 'photoR2Key')),
        getLegacyGalleryGapCount(db),
    ]);

    return {
        shopCoverMissing,
        shopOwnerMissing,
        employeeMissing,
        customerMissing,
        galleryMissing,
    };
};

const hasAnyGap = (gaps) => Object.values(gaps).some((count) => count > 0);

const unsetRetiredFields = async (db) => {
    const collections = new Set((await db.listCollections().toArray()).map((item) => item.name));

    await Promise.all([
        db.collection('shops').updateMany({}, { $unset: { coverUrl: '', ownerPhotoUrl: '' } }),
        db.collection('employees').updateMany({}, { $unset: { photoUrl: '' } }),
        db.collection('customers').updateMany({}, { $unset: { photoUrl: '' } }),
    ]);

    if (collections.has('photos')) {
        await db.collection('photos').drop();
    }
};

try {
    logger.info('Starting R2 media cutover finalization', { dryRun });
    await connectDB();

    const db = mongoose.connection.db;
    const gaps = await collectGaps(db);

    if (hasAnyGap(gaps)) {
        logger.error('R2 media cutover cannot be finalized; unmigrated media references remain', gaps);
        process.exitCode = 1;
    } else if (dryRun) {
        logger.info('DRY RUN R2 media cutover finalization passed; rerun with --write to remove retired fields', gaps);
    } else {
        await unsetRetiredFields(db);
        logger.info('R2 media cutover finalized; retired URL fields removed and legacy gallery collection dropped', gaps);
    }
} catch (err) {
    logger.error('R2 media cutover finalization failed', { error: err.message });
    process.exitCode = 1;
} finally {
    await disconnectDB();
}
