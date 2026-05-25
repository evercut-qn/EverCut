import Shop from '../models/shop.model.js';
import Barber from '../models/barber.model.js';
import config from '../config/index.js';
import { trustQueryOperators } from '../utils/mongoose-query.utils.js';
import { escapeRegex } from '../utils/regex.utils.js';

class ShopRepository {
    async create(data) {
        return Shop.create(data);
    }

    async findById(id) {
        return Shop.findById(id);
    }

    async findByBarberId(barberId) {
        return Shop.findOne({ barberId });
    }

    async findByBarberUserId(userId) {
        const barber = await Barber.findOne({ userId });
        if (!barber) return null;
        return Shop.findOne({ barberId: barber._id });
    }

    async updateByBarberId(barberId, data) {
        return Shop.findOneAndUpdate(
            { barberId },
            { $set: data },
            { returnDocument: 'after', runValidators: true },
        );
    }

    async updateByBarberUserId(userId, data) {
        const barber = await Barber.findOne({ userId });
        if (!barber) return null;
        return this.updateByBarberId(barber._id, data);
    }

    async updateById(id, data) {
        return Shop.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true });
    }

    async findNearby(coordinates, maxDistance = config.shop.nearbyDistanceMeters, selectFields) {
        const query = Shop.find(trustQueryOperators({
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates },
                    $maxDistance: maxDistance,
                },
            },
        }));
        if (selectFields) query.select(selectFields);
        return query.lean();
    }

    async findByCategory(category, selectFields) {
        const query = Shop.find({ category });
        if (selectFields) query.select(selectFields);
        return query.lean();
    }

    async searchByName(nameQuery, selectFields) {
        const query = Shop.find(
            trustQueryOperators({ shopName: { $regex: new RegExp(escapeRegex(nameQuery), 'i') } }),
        );
        if (selectFields) query.select(selectFields);
        return query.lean();
    }

    async findByIdWithFields(id, fields) {
        return Shop.findById(id).select(fields).lean();
    }

    async softDelete(id) {
        return Shop.findByIdAndUpdate(id, { deletedAt: new Date() });
    }
}

export default new ShopRepository();
