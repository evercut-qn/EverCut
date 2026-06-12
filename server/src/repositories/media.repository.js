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

    async countActiveGalleryMedia(galleryMediaIds, mediaType) {
        return Media.countDocuments({
            _id: { $in: galleryMediaIds || [] },
            purpose: 'gallery',
            type: mediaType,
            status: MEDIA_STATUS.READY,
        });
    }

    async countHiddenGalleryMedia(galleryMediaIds, mediaType) {
        return Media.countDocuments({
            _id: { $in: galleryMediaIds || [] },
            purpose: 'gallery',
            type: mediaType,
            status: MEDIA_STATUS.HIDDEN,
        });
    }

    async findActiveGalleryMedia(galleryMediaIds, mediaType, { sort, limit } = {}) {
        let query = Media.find({
            _id: { $in: galleryMediaIds || [] },
            purpose: 'gallery',
            type: mediaType,
            status: MEDIA_STATUS.READY,
        });
        if (sort) query = query.sort(sort);
        if (limit !== undefined) query = query.limit(limit);
        return query.lean();
    }

    async findHiddenGalleryMedia(galleryMediaIds, mediaType, { sort, limit } = {}) {
        let query = Media.find({
            _id: { $in: galleryMediaIds || [] },
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

    async getStatsForGallery(galleryMediaIds) {
        const sizeResult = await Media.aggregate([
            { $match: { _id: { $in: galleryMediaIds || [] }, status: MEDIA_STATUS.READY, purpose: 'gallery' } },
            { $group: { _id: null, totalSize: { $sum: '$actualSize' } } },
        ]);

        const totalPhotos = await Media.countDocuments({
            _id: { $in: galleryMediaIds || [] },
            purpose: 'gallery',
            type: 'image',
            status: MEDIA_STATUS.READY,
        });

        const totalVideos = await Media.countDocuments({
            _id: { $in: galleryMediaIds || [] },
            purpose: 'gallery',
            type: 'video',
            status: MEDIA_STATUS.READY,
        });

        return {
            totalItems: totalPhotos + totalVideos,
            totalPhotos,
            totalVideos,
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
