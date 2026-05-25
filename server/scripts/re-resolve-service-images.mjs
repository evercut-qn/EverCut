/**
 * Iterates through all active services and re-calculates their default imageR2Key
 * using the new deterministic gender-aware logic.
 *
 * Mode is dry-run by default. Use --write to apply changes.
 */

import connectDB, { disconnectDB } from '../src/config/database.config.js';
import Service from '../src/models/service.model.js';
import serviceDefaultImageRepository from '../src/repositories/service-default-image.repository.js';
import logger from '../src/utils/logger.js';

const args = new Set(process.argv.slice(2));
const dryRun = !args.has('--write');

const resolveDefaultServiceImageR2Key = async (serviceName, serviceType, serviceFor, bundledServices = []) => {
    const match = await serviceDefaultImageRepository.findBestMatch(serviceName, serviceType, serviceFor);
    if (match) return match.r2Key;

    if (serviceType === 'bundled' && bundledServices.length > 0) {
        const concatenated = bundledServices
            .map((s) => s.toLowerCase().replace(/\s+/g, ''))
            .sort()
            .join('');
        const bundleMatch = await serviceDefaultImageRepository.findByName(concatenated);
        if (bundleMatch) return bundleMatch.r2Key;
    }

    return 'images/services/single/default/unisex.jpg';
};

try {
    logger.info('Starting service image re-resolution', { dryRun });

    await connectDB();

    const services = await Service.find({ isActive: true, deletedAt: null });
    logger.info(`Found ${services.length} active services to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const service of services) {
        const newR2Key = await resolveDefaultServiceImageR2Key(
            service.serviceName,
            service.serviceType,
            service.serviceFor,
            service.bundledServices
        );

        if (service.imageR2Key !== newR2Key) {
            if (!dryRun) {
                await Service.updateOne({ _id: service._id }, { $set: { imageR2Key: newR2Key } });
                logger.info(`Updated service: ${service.serviceName} (${service.serviceFor}) -> ${newR2Key}`);
            } else {
                logger.info(`[DRY RUN] Would update: ${service.serviceName} (${service.serviceFor}) -> ${newR2Key}`);
            }
            updatedCount++;
        } else {
            skippedCount++;
        }
    }

    logger.info('Re-resolution complete', { updatedCount, skippedCount });
} catch (err) {
    logger.error('Re-resolution failed', { error: err.message });
    process.exitCode = 1;
} finally {
    await disconnectDB();
}
