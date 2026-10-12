import ratingRepository from '../repositories/rating.repository.js';
import bookingRepository from '../repositories/booking.repository.js';
import customerRepository from '../repositories/customer.repository.js';
import shopRepository from '../repositories/shop.repository.js';
import {
    NotFoundError,
    BadRequestError,
    ConflictError,
    ForbiddenError,
} from '../utils/api-error.js';
import { buildPagination } from '../utils/pagination.utils.js';
import { serializeRating } from '../utils/rating-response.utils.js';
import notificationEvents from './notifications/notification-events.service.js';
import { sanitizeForResponse } from '../serializers/core.serializer.js';
import { BOOKING_STATUS } from '../utils/constants.js';

/**
 * Rating service.
 */

const normalizeOptionalReview = (review) => {
    if (review === undefined || review === null) return undefined;

    const normalized = String(review).trim();
    return normalized || undefined;
};

const normalizeReplyText = (replyText) => {
    const normalized = String(replyText ?? '').trim();

    if (!normalized) {
        throw new BadRequestError('Reply text is required');
    }

    if (normalized.length > 500) {
        throw new BadRequestError('Reply text cannot exceed 500 characters');
    }

    return normalized;
};

const getOwnedShop = async (ownerId) => {
    const shop = await shopRepository.findByBarberUserId(ownerId);
    if (!shop) throw new NotFoundError('Shop');
    return sanitizeForResponse(shop);
};

const assertShopExists = async (shopId) => {
    const shop = await shopRepository.findById(shopId);
    if (!shop) throw new NotFoundError('Shop');
    return sanitizeForResponse(shop);
};

const assertRatingBelongsToShop = (rating, shop, message) => {
    if (String(rating.shopId) !== String(shop.id)) {
        throw new ForbiddenError(message);
    }
};

export const addRating = async (userId, payloadOrBookingId, ratingVal, reviewVal) => {
    let bookingId;
    let shopId;
    let rating;
    let review;

    if (payloadOrBookingId && typeof payloadOrBookingId === 'object') {
        ({ bookingId, shopId, rating, review } = payloadOrBookingId);
    } else {
        bookingId = payloadOrBookingId;
        rating = ratingVal;
        review = reviewVal;
    }

    if (!bookingId || !rating) {
        throw new BadRequestError('bookingId and rating are required');
    }

    const normalizedReview = normalizeOptionalReview(review);

    const [customer, booking] = await Promise.all([
        customerRepository.findByUserId(userId),
        bookingRepository.findById(bookingId),
    ]);

    if (!customer) throw new NotFoundError('Customer profile');
    if (!booking) throw new NotFoundError('Booking');

    const customerId = customer._id;
    const bookingCustomerId = booking.customerId?._id || booking.customerId;
    if (String(bookingCustomerId) !== String(customerId)) {
        throw new ForbiddenError('You can only rate your own bookings');
    }

    if (booking.status !== BOOKING_STATUS.COMPLETED) {
        throw new BadRequestError('You can only rate completed appointments');
    }

    const targetShopId = booking.shopId?._id || booking.shopId;
    const shop = await shopRepository.findById(targetShopId);
    if (!shop) throw new NotFoundError('Shop');

    const now = new Date();
    const expiry = booking.reviewExpiresAt
        ? new Date(booking.reviewExpiresAt)
        : new Date(new Date(booking.completedAt || booking.updatedAt || now).getTime() + 24 * 60 * 60 * 1000);

    if (now > expiry) {
        throw new BadRequestError('Review window has expired (reviews must be submitted within 24 hours of service completion)');
    }

    if (booking.hasReviewed) {
        throw new ConflictError('You have already submitted a review for this booking');
    }

    const existingForBooking = await ratingRepository.findByBookingId(booking._id);
    if (existingForBooking) {
        throw new ConflictError('You have already submitted a review for this booking');
    }

    try {
        const createdRating = await ratingRepository.create({
            bookingId: booking._id,
            customerId,
            shopId: targetShopId,
            rating,
            review: normalizedReview,
        });

        if (bookingRepository.markAsReviewed) {
            await bookingRepository.markAsReviewed(booking._id, createdRating._id);
        } else if (bookingRepository.updateById) {
            await bookingRepository.updateById(booking._id, { hasReviewed: true, ratingId: createdRating._id });
        }

        await notificationEvents.notifyRatingReceived({ ratingId: createdRating._id });

        return serializeRating(createdRating);
    } catch (error) {
        if (error?.code === 11000) {
            throw new ConflictError('You have already submitted a review for this booking');
        }

        throw error;
    }
};

export const getRatingsByShop = async (shopId, query = {}) => {
    await assertShopExists(shopId);

    const total = await ratingRepository.countByShop(shopId);
    const { skip, limit, pagination } = buildPagination(query, total);

    const ratings = await ratingRepository.findByShop(shopId, { skip, limit });
    const items = ratings.map(serializeRating);

    return { items, pagination };
};

export const getRatingSummary = async (shopId) => {
    await assertShopExists(shopId);
    return ratingRepository.getShopSummary(shopId);
};

export const getBarberRatingSummary = async (ownerId) => {
    const shop = await getOwnedShop(ownerId);
    return getRatingSummary(shop.id);
};

export const removeRating = async (ratingId, ownerId) => {
    const rating = await ratingRepository.findById(ratingId);
    if (!rating) throw new NotFoundError('Rating');

    const shop = await getOwnedShop(ownerId);
    assertRatingBelongsToShop(rating, shop, 'You can only remove ratings on your own shop');

    await ratingRepository.deleteById(ratingId);
    return { message: 'Rating deleted successfully' };
};

export const upsertReplyToRating = async (ratingId, replyText, ownerId) => {
    const normalizedReplyText = normalizeReplyText(replyText);

    const rating = await ratingRepository.findById(ratingId);
    if (!rating) throw new NotFoundError('Rating');

    const shop = await getOwnedShop(ownerId);
    assertRatingBelongsToShop(rating, shop, 'You can only reply to ratings on your own shop');

    const hasReply = Boolean(rating.reply?.text);
    const updatedRating = hasReply
        ? await ratingRepository.updateReply(ratingId, normalizedReplyText, ownerId)
        : await ratingRepository.addReply(ratingId, normalizedReplyText, ownerId);

    if (!hasReply) {
        await notificationEvents.notifyRatingReply({ ratingId, actorUserId: ownerId });
    }

    return serializeRating(updatedRating);
};

export const deleteReplyFromRating = async (ratingId, ownerId) => {
    const rating = await ratingRepository.findById(ratingId);
    if (!rating) throw new NotFoundError('Rating');

    const shop = await getOwnedShop(ownerId);
    assertRatingBelongsToShop(rating, shop, 'You can only delete replies on your own shop');

    if (!rating.reply || !rating.reply.text) {
        throw new BadRequestError('No reply exists for this rating');
    }

    await ratingRepository.deleteReply(ratingId);
    return { message: 'Reply deleted successfully' };
};

export const getRatingsByShopForBarber = async (ownerId, query = {}) => {
    const shop = await getOwnedShop(ownerId);
    return getRatingsByShop(shop.id, query);
};
