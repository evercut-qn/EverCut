import Customer from '../models/customer.model.js';

class CustomerRepository {
    async create(data) {
        return Customer.create(data);
    }

    async findByUserId(userId) {
        return Customer.findOne({ userId });
    }

    async findById(id) {
        return Customer.findById(id);
    }

    async updateByUserId(userId, data) {
        return Customer.findOneAndUpdate(
            { userId },
            { $set: data },
            { new: true, runValidators: true },
        );
    }

    async addFavoriteBooking(userId, bookingId) {
        return Customer.findOneAndUpdate(
            { userId },
            { $addToSet: { favoriteBookings: bookingId } },
            { new: true },
        );
    }

    async removeFavoriteBooking(userId, bookingId) {
        return Customer.findOneAndUpdate(
            { userId },
            { $pull: { favoriteBookings: bookingId } },
            { new: true },
        );
    }

    async findByUserIdPopulated(userId) {
        return Customer.findOne({ userId }).populate({
            path: 'favoriteBookings',
            populate: [
                { path: 'serviceIds' },
                { path: 'employeeId', select: 'firstName lastName photoUrl' },
                { path: 'shopId', select: 'shopName address coverUrl' },
            ],
        });
    }
}

export default new CustomerRepository();
