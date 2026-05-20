import Barber from '../models/barber.model.js';

class BarberRepository {
    async create(data) {
        return Barber.create(data);
    }

    async findById(id) {
        return Barber.findById(id);
    }

    async findByUserId(userId) {
        return Barber.findOne({ userId });
    }

    async findByUserIdWithDeleted(userId) {
        return Barber.findOne({ userId }).setOptions({ includeDeleted: true });
    }

    async updateById(id, data) {
        return Barber.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true });
    }

    async updateByUserId(userId, data) {
        return Barber.findOneAndUpdate(
            { userId },
            { $set: data },
            { returnDocument: 'after', runValidators: true },
        );
    }

    async softDelete(id) {
        return Barber.findByIdAndUpdate(id, { deletedAt: new Date() });
    }
}

export default new BarberRepository();
