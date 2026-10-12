import customerRepository from '../repositories/customer.repository.js';
import userRepository from '../repositories/user.repository.js';
import bookingRepository from '../repositories/booking.repository.js';
import paymentRepository from '../repositories/payment.repository.js';
import mediaRepository from '../repositories/media.repository.js';
import { NotFoundError, BadRequestError } from '../utils/api-error.js';
import { revokeRefreshToken } from './auth.service.js';
import notificationEvents from './notifications/notification-events.service.js';
import { serializeCustomerDirectoryItem, serializeCustomerProfile } from '../serializers/customer.serializer.js';
import { serializeBooking } from '../serializers/booking.serializer.js';
import { serializePayment } from '../serializers/payment.serializer.js';
import * as mediaService from './media/media.service.js';
import { MEDIA_PURPOSE, PAYMENT_TRANSACTION_STATUS } from '../utils/constants.js';
import { buildPagination } from '../utils/pagination.utils.js';

/**
 * Customer-facing profile service.
 */

export const getProfile = async (userId) => {
    const profile = await customerRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Customer');
    return serializeCustomerProfile(profile);
};

export const updateProfile = async (userId, data) => {
    const profile = await customerRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Customer');

    if (data.location && typeof data.location === 'string') {
        try {
            data.location = JSON.parse(data.location);
        } catch {
            throw new BadRequestError('Invalid location format');
        }
    }

    // Remove email from update data - email updates must go through /account/email
    if (data.email !== undefined) {
        delete data.email;
    }

    const photoMediaId = data.photoMediaId;
    delete data.photoMediaId;

    const oldMediaId = profile.photoMediaId;
    const oldMediaIdStr = oldMediaId ? (oldMediaId._id ? oldMediaId._id.toString() : oldMediaId.toString()) : null;

    if (photoMediaId) {
        const media = await mediaService.resolveMediaForEntity(userId, photoMediaId);
        data.photoMediaId = media._id;
    }

    const updated = await customerRepository.updateByUserId(userId, data);

    if (photoMediaId) {
        await mediaRepository.updateById(photoMediaId, {
            purpose: MEDIA_PURPOSE.PROFILE,
        });
        if (oldMediaIdStr && oldMediaIdStr !== photoMediaId.toString()) {
            await mediaService.cleanupMediaById(oldMediaIdStr);
        }
    }

    await notificationEvents.notifyAccountUpdated({
        userId,
        updateType: 'customer_profile',
    });

    const populatedCustomer = await updated.populate({ path: 'photoMediaId', select: 'r2Key' });
    return serializeCustomerProfile(populatedCustomer);
};

/**
 * Soft-deletes a Customer's account. Mirrors the Barber account-deletion
 * pattern in account.service.js#deleteBarberAccount, minus the shop
 * cascade (Customer has no shop-equivalent) and the PIN check (Customers
 * don't use the PIN system — that's Barber-only). Booking/payment history
 * is left untouched for admin/audit purposes, same as it is for barbers;
 * the Customer document itself isn't flagged, since authenticate.middleware
 * only checks User.deletedAt/isActive, and the admin directory pipeline
 * already excludes customers by that same flag (see
 * CustomerRepository#buildAdminDirectoryPipeline).
 */
export const deleteCustomerAccount = async (userId) => {
    const profile = await customerRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Customer');

    // Revoke refresh access before the soft delete, matching the barber
    // flow's ordering — the refresh-token hash lives on the User document,
    // so this still has a document to update either way, but keeping the
    // same order avoids a state where a not-yet-revoked refresh token
    // outlives a user already marked deleted.
    await revokeRefreshToken(userId);
    await userRepository.softDelete(userId);

    return {
        deleted: true,
        authCleanup: 'revoked',
    };
};



export const listCustomersForAdmin = async (query = {}) => {
    const total = await customerRepository.countAdminDirectory(query);
    const { skip, limit, pagination } = buildPagination(query, total);
    const customers = await customerRepository.findAdminDirectory(query, { skip, limit });

    return {
        items: customers.map(serializeCustomerDirectoryItem).filter(Boolean),
        pagination,
    };
};

export const getCustomerProfileForAdmin = async (customerId) => {
    const customer = await customerRepository.findById(customerId);
    if (!customer) throw new NotFoundError('Customer');

    const user = await userRepository.findById(customer.userId);
    if (!user) throw new NotFoundError('User');

    // Fetch all bookings for metrics and ledger
    const bookings = await bookingRepository.findByCustomer(customer._id);
    const totalBookingsCount = bookings.length;
    const completedBookingsCount = bookings.filter((b) => b.status === 'completed').length;
    const cancelledBookingsCount = bookings.filter((b) => b.status === 'cancelled').length;
    const noShowsCount = bookings.filter((b) => b.noShowAt !== null).length;
    const refundedBookingsCount = bookings.filter((b) => b.paymentStatus === 'refunded').length;

    // Average completed booking value (base service price)
    const completedBookings = bookings.filter((b) => b.status === 'completed');
    const averageBookingValue = completedBookings.length > 0
        ? completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) / completedBookings.length
        : 0;

    // Fetch payments to calculate spend (completed status)
    const payments = await paymentRepository.findAll({ customerId: customer._id });
    const completedPayments = payments.filter((p) => p.status === PAYMENT_TRANSACTION_STATUS.COMPLETED);
    const lifetimeSpend = completedPayments.reduce((sum, p) => sum + (p.amountInRupees || 0), 0);

    // Success rate = completed bookings / total bookings
    const bookingSuccessRate = totalBookingsCount > 0
        ? (completedBookingsCount / totalBookingsCount) * 100
        : 0;

    // Get recent bookings (limit to 10)
    const sortedBookings = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentBookings = sortedBookings.slice(0, 10);

    // Get recent payments (limit to 10)
    const sortedPayments = [...payments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentPayments = sortedPayments.slice(0, 10);

    // Serialize profile
    const profile = serializeCustomerProfile({
        ...customer.toObject(),
        userId: user.toObject(),
    });

    return {
        ...profile,
        metrics: {
            lifetimeBookings: totalBookingsCount,
            completedBookings: completedBookingsCount,
            cancelledBookings: cancelledBookingsCount,
            noShows: noShowsCount,
            refundedBookings: refundedBookingsCount,
            averageBookingValue: parseFloat(averageBookingValue.toFixed(2)),
            lifetimeSpend: parseFloat(lifetimeSpend.toFixed(2)),
            bookingSuccessRate: parseFloat(bookingSuccessRate.toFixed(2)),
        },
        recentBookings: recentBookings.map((b) => serializeBooking(b)).filter(Boolean),
        recentPayments: recentPayments.map((p) => serializePayment(p)).filter(Boolean),
    };
};
