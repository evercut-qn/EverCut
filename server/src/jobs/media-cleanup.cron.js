import mediaRepository from '../repositories/media.repository.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import storageProvider from '../services/media/storage-provider.service.js';

let intervalId = null;

export const cleanupOrphanedUploads = async () => {
    const cutoff = new Date(Date.now() - config.media.pendingUploadTtlHours * 3600_000);
    const orphans = await mediaRepository.findExpiredPending(cutoff, 100);
    if (!orphans.length) return { cleaned: 0 };

    let cleaned = 0;
    for (const media of orphans) {
        try {
            await storageProvider.deleteObject(media.r2Key);
            await mediaRepository.deleteById(media._id);
            cleaned += 1;
        } catch (err) {
            logger.warn('Orphan media cleanup failed', {
                mediaId: media._id?.toString(),
                r2Key: media.r2Key,
                error: err.message,
            });
        }
    }

    const deletedCutoff = new Date(Date.now() - 3600_000); // 1 hour ago
    const deletedMedia = await mediaRepository.findDeletedMedia(deletedCutoff, 100);
    
    for (const media of deletedMedia) {
        try {
            await storageProvider.deleteObject(media.r2Key);
            await mediaRepository.deleteById(media._id);
            cleaned += 1;
        } catch (err) {
            logger.warn('Deleted media cleanup failed', {
                mediaId: media._id?.toString(),
                r2Key: media.r2Key,
                error: err.message,
            });
        }
    }

    logger.info('Orphan media cleanup complete', { cleaned });
    return { cleaned };
};

export const startMediaCleanupJob = () => {
    if (intervalId) return;
    intervalId = setInterval(() => {
        cleanupOrphanedUploads().catch((err) => {
            logger.error('Media cleanup job failed', { error: err.message });
        });
    }, 60 * 60 * 1000);
    logger.info('Media cleanup job started');
};

export const stopMediaCleanupJob = () => {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Media cleanup job stopped');
};
