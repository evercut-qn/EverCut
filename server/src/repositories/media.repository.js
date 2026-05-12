import Media from '../models/media.model.js';
import { MEDIA_STATUS } from '../utils/constants.js';

class MediaRepository {
    async create(data) {
        return Media.create(data);
    }

    async findById(id) {
        return Media.findById(id).lean();
    }

    async findByIdAndUser(id, userId, extraFilter = {}) {
        return Media.findOne({ _id: id, userId, ...extraFilter });
    }

    async findReadyByIdAndUser(id, userId) {
        return Media.findOne({ _id: id, userId, status: MEDIA_STATUS.READY });
    }

    async findByEntity(entityId, entityType, extraFilter = {}, options = {}) {
        const filter = {
            entityId,
            entityType,
            status: MEDIA_STATUS.READY,
            ...extraFilter,
        };
        const query = Media.find(filter).sort({ createdAt: -1 });

        if (options.skip !== undefined) query.skip(options.skip);
        if (options.limit !== undefined) query.limit(options.limit);
        return query.lean();
    }

    async countByEntity(entityId, entityType, extraFilter = {}) {
        return Media.countDocuments({
            entityId,
            entityType,
            status: MEDIA_STATUS.READY,
            ...extraFilter,
        });
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
            { _id: id, userId, status: { $ne: MEDIA_STATUS.DELETED } },
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
        const [byCategory, totalSize] = await Promise.all([
            Media.aggregate([
                { $match: { entityId, entityType, status: MEDIA_STATUS.READY, purpose: 'gallery' } },
                { $group: { _id: '$metadata.category', count: { $sum: 1 }, totalSize: { $sum: '$actualSize' } } },
            ]),
            Media.aggregate([
                { $match: { entityId, entityType, status: MEDIA_STATUS.READY, purpose: 'gallery' } },
                { $group: { _id: null, totalSize: { $sum: '$actualSize' } } },
            ]),
        ]);

        const totalItems = await this.countByEntity(entityId, entityType, { purpose: 'gallery' });
        return {
            totalItems,
            totalPhotos: totalItems,
            totalSize: totalSize[0]?.totalSize || 0,
            byCategory,
            byType: byCategory,
        };
    }

    async findExpiredPending(cutoffDate, limit = 100) {
        return Media.find({
            status: MEDIA_STATUS.PENDING,
            createdAt: { $lt: cutoffDate },
        }).limit(limit);
    }

    async deleteById(id) {
        return Media.findByIdAndDelete(id);
    }
}

export default new MediaRepository();
