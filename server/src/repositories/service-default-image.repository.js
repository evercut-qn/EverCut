import ServiceDefaultImage from '../models/service-default-image.model.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';

class ServiceDefaultImageRepository {
    async upsert(data) {
        return ServiceDefaultImage.findOneAndUpdate(
            { name: data.name.toLowerCase() },
            { $set: data },
            { upsert: true, new: true, runValidators: true },
        );
    }

    async findByName(name) {
        return ServiceDefaultImage.findOne({ name: name.toLowerCase() }).lean();
    }

    async findByServiceType(serviceType) {
        return ServiceDefaultImage.find({ serviceType }).lean();
    }

    async findFallback(serviceType, serviceFor = 'male') {
        return ServiceDefaultImage.findOne({ serviceType, serviceFor, isFallback: true }).lean()
            || ServiceDefaultImage.findOne({ serviceType, isFallback: true }).lean();
    }

    /**
     * Finds the best matching default image for a given service name, type and gender.
     * 1. Attempts exact name match (normalized).
     * 2. Falls back to text search on keywords within the same service type and gender.
     * 3. Falls back to the 'isFallback' image for that service type and gender.
     */
    async findBestMatch(serviceName, serviceType, serviceFor) {
        const normalized = serviceName.toLowerCase().replace(/\s+/g, '');

        // 1. Try exact name match
        const exact = await ServiceDefaultImage.findOne({
            name: normalized,
            serviceType,
            serviceFor,
        }).lean();
        if (exact) return exact;

        // 2. Try text search score on keywords
        const fuzzy = await ServiceDefaultImage.findOne(
            trustQueryOperators({
                serviceType,
                serviceFor,
                $text: { $search: serviceName },
            }),
            { score: { $meta: 'textScore' } },
        )
            .sort({ score: { $meta: 'textScore' } })
            .lean();

        if (fuzzy && fuzzy.score > 0.5) return fuzzy;

        // 3. Fallback to generic default for the type and gender
        return this.findFallback(serviceType, serviceFor);
    }

    async getAll() {
        return ServiceDefaultImage.find({}).sort({ serviceType: 1, name: 1 }).lean();
    }
}

export default new ServiceDefaultImageRepository();
