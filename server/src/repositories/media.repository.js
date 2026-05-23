import Media from '../models/media.model.js';
import { MEDIA_STATUS } from '../utils/constants.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';

class MediaRepository {
    async create(data) {
        return Media.create(data);
    }

    async findById(id) {
        return Media.findById(id).lean();
    }

    async findByIdAndUser(id, userId, extraFilter = {}) {
        return Media.findOne(trustQueryOperators({ _id: id, userId, ...extraFilter }));
    }

    async findReadyByIdAndUser(id, userId) {
        return Media.findOne({ _id: id, userId, status: MEDIA_STATUS.READY });
    }

    async findByEntity(entityId, entityType, extraFilter = {}, options = {}) {
        const filter = trustQueryOperators({
            entityId,
            entityType,
            status: MEDIA_STATUS.READY,
            ...extraFilter,
        });
        const query = Media.find(filter).sort({ createdAt: -1 });

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async countByEntity(entityId, entityType, extraFilter = {}) {
        return Media.countDocuments(trustQueryOperators({
            entityId,
            entityType,
            status: MEDIA_STATUS.READY,
            ...extraFilter,
        }));
    }

    async countActiveGalleryMedia(shopId, mediaType) {
        return Media.countDocuments({
            entityId: shopId,
            entityType: 'Shop',
            purpose: 'gallery',
            type: mediaType,
            status: MEDIA_STATUS.READY,
        });
    }

    async countHiddenGalleryMedia(shopId, mediaType) {
        return Media.countDocuments({
            entityId: shopId,
            entityType: 'Shop',
            purpose: 'gallery',
            type: mediaType,
            status: MEDIA_STATUS.HIDDEN,
        });
    }

    async findActiveGalleryMedia(shopId, mediaType, { sort, limit } = {}) {
        let query = Media.find({
            entityId: shopId,
            entityType: 'Shop',
            purpose: 'gallery',
            type: mediaType,
            status: MEDIA_STATUS.READY,
        });
        if (sort) query = query.sort(sort);
        if (limit !== undefined) query = query.limit(limit);
        return query.lean();
    }

    async findHiddenGalleryMedia(shopId, mediaType, { sort, limit } = {}) {
        let query = Media.find({
            entityId: shopId,
            entityType: 'Shop',
            purpose: 'gallery',
            type: mediaType,
            status: MEDIA_STATUS.HIDDEN,
        });
        if (sort) query = query.sort(sort);
        if (limit !== undefined) query = query.limit(limit);
        return query.lean();
    }

    async bulkUpdateStatus(mediaIds, newStatus) {
        if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
            return { matchedCount: 0, modifiedCount: 0 };
        }

        return Media.updateMany(
            { _id: { $in: mediaIds } },
            { $set: { status: newStatus } },
        );
    }

    async updateById(id, update, options = {}) {
        return Media.findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after', runValidators: true, ...options });
    }

    async attachReadyMedia(id, userId, update) {
        return Media.findOneAndUpdate(
            { _id: id, userId, status: MEDIA_STATUS.READY },
            { $set: update },
            { returnDocument: 'after', runValidators: true },
        );
    }

    async softDeleteByIdAndUser(id, userId) {
        return Media.findOneAndUpdate(
            trustQueryOperators({ _id: id, userId, status: { $ne: MEDIA_STATUS.DELETED } }),
            { $set: { status: MEDIA_STATUS.DELETED } },
            { returnDocument: 'after' },
        );
    }

    async softDeleteByIdAndEntity(id, entityId) {
        return Media.findOneAndUpdate(
            { _id: id, entityId, status: MEDIA_STATUS.READY },
            { $set: { status: MEDIA_STATUS.DELETED } },
            { returnDocument: 'after' },
        );
    }

    async getStatsByEntity(entityId, entityType) {
        const sizeResult = await Media.aggregate([
            { $match: { entityId, entityType, status: MEDIA_STATUS.READY, purpose: 'gallery' } },
            { $group: { _id: null, totalSize: { $sum: '$actualSize' } } },
        ]);

        const totalItems = await this.countByEntity(entityId, entityType, { purpose: 'gallery' });
        return {
            totalItems,
            totalPhotos: totalItems,
            totalSize: sizeResult[0]?.totalSize || 0,
        };
    }

    async findExpiredPending(cutoffDate, limit = 100) {
        return Media.find(trustQueryOperators({
            status: MEDIA_STATUS.PENDING,
            createdAt: { $lt: cutoffDate },
        })).limit(limit);
    }

    async findDeletedMedia(cutoffDate, limit = 100) {
        return Media.find({
            status: MEDIA_STATUS.DELETED,
            updatedAt: { $lt: cutoffDate },
        }).limit(limit);
    }

    async findByR2Key(r2Key) {
        return Media.findOne({ r2Key }).lean();
    }

    async softDeleteById(id) {
        return Media.findByIdAndUpdate(
            id,
            { $set: { status: MEDIA_STATUS.DELETED } },
            { returnDocument: 'after' }
        );
    }

    async deleteById(id) {
        return Media.findByIdAndDelete(id);
    }
}

export default new MediaRepository();
