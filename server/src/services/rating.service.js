import bookingRepository from '../repositories/booking.repository.js';
import ratingRepository from '../repositories/rating.repository.js';
import customerRepository from '../repositories/customer.repository.js';
import shopRepository from '../repositories/shop.repository.js';
import {
    NotFoundError,
    BadRequestError,
    ConflictError,
    ForbiddenError,
} from '../utils/api-error.js';
import { buildPagination } from '../utils/pagination.utils.js';

/**
 * Rating service.
 */

const formatReviewer = (customer) => ({
    firstName: customer?.firstName || 'Unknown',
    lastName: customer?.lastName || '',
    photoUrl: customer?.photoUrl || null,
});

const formatReply = (reply) => (
    reply?.text
        ? {
            text: reply.text,
            repliedAt: reply.repliedAt,
        }
        : null
);

const formatRating = (rating) => ({
    ratingId: rating._id,
    rating: rating.rating,
    review: rating.review,
    user: formatReviewer(rating.customerId),
    reply: formatReply(rating.reply),
    createdAt: rating.createdAt,
});

const normalizeReplyText = (replyText) => {
    const normalizedReplyText = String(replyText ?? '').trim();

    if (!normalizedReplyText) {
        throw new BadRequestError('Reply text is required');
    }

    if (normalizedReplyText.length > 500) {
        throw new BadRequestError('Reply text cannot exceed 500 characters');
    }

    return normalizedReplyText;
};

const assertShopExists = async (shopId) => {
    const shop = await shopRepository.findById(shopId);
    if (!shop) throw new NotFoundError('Shop');

    return shop;
};

const getOwnedShop = async (ownerId) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    return shop;
};

const assertRatingBelongsToOwnedShop = (rating, shop, action) => {
    if (rating.shopId.toString() !== shop._id.toString()) {
        throw new ForbiddenError(`You can only ${action} on your own shop`);
    }
};

const rethrowDuplicateRatingWrite = (error) => {
    if (error?.code === 11000) {
        throw new ConflictError('You have already rated this shop');
    }

    throw error;
};

export const addRating = async (userId, shopId, rating, review) => {
    if (!shopId || !rating) throw new BadRequestError('shopId and rating are required');

    const customer = await customerRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError('Customer profile');
    const customerId = customer._id;

    await assertShopExists(shopId);

    const existing = await ratingRepository.findByCustomerAndShop(customerId, shopId);
    if (existing) throw new ConflictError('You have already rated this shop');

    const hasCompletedBooking = await bookingRepository.hasCompletedBooking(customerId, shopId);
    if (!hasCompletedBooking) {
        throw new BadRequestError('You can only rate a shop after completing a booking there');
    }

    try {
        return await ratingRepository.create({ customerId, shopId, rating, review });
    } catch (error) {
        rethrowDuplicateRatingWrite(error);
    }
};

export const getRatingsByShop = async (shopId, query = {}) => {
    await assertShopExists(shopId);

    const total = await ratingRepository.countByShop(shopId);
    const { skip, limit, pagination } = buildPagination(query, total);

    const ratings = await ratingRepository.findByShop(shopId, { skip, limit });

    return { items: ratings.map(formatRating), pagination };
};

export const getRatingSummary = async (shopId) => {
    await assertShopExists(shopId);
    return ratingRepository.getShopSummary(shopId);
};

export const removeRating = async (ratingId, ownerId) => {
    const rating = await ratingRepository.findById(ratingId);
    if (!rating) throw new NotFoundError('Rating');

    const shop = await getOwnedShop(ownerId);
    assertRatingBelongsToOwnedShop(rating, shop, 'remove ratings');

    await ratingRepository.deleteById(ratingId);
    return { message: 'Rating deleted successfully' };
};

export const addReplyToRating = async (ratingId, replyText, ownerId) => {
    const normalizedReplyText = normalizeReplyText(replyText);

    const rating = await ratingRepository.findById(ratingId);
    if (!rating) throw new NotFoundError('Rating');

    const shop = await getOwnedShop(ownerId);
    assertRatingBelongsToOwnedShop(rating, shop, 'reply to ratings');

    if (rating.reply?.text) {
        throw new ConflictError('Reply already exists for this rating');
    }

    const updatedRating = await ratingRepository.addReply(ratingId, normalizedReplyText, ownerId);
    if (!updatedRating) {
        throw new ConflictError('Reply already exists for this rating');
    }

    return formatRating(updatedRating);
};

export const updateReplyToRating = async (ratingId, replyText, ownerId) => {
    const normalizedReplyText = normalizeReplyText(replyText);

    const rating = await ratingRepository.findById(ratingId);
    if (!rating) throw new NotFoundError('Rating');

    const shop = await getOwnedShop(ownerId);
    assertRatingBelongsToOwnedShop(rating, shop, 'update replies');

    if (!rating.reply || !rating.reply.text) {
        throw new BadRequestError('No reply exists for this rating');
    }

    const updatedRating = await ratingRepository.updateReply(ratingId, normalizedReplyText);
    if (!updatedRating) {
        throw new BadRequestError('No reply exists for this rating');
    }

    return formatRating(updatedRating);
};

export const deleteReplyFromRating = async (ratingId, ownerId) => {
    const rating = await ratingRepository.findById(ratingId);
    if (!rating) throw new NotFoundError('Rating');

    const shop = await getOwnedShop(ownerId);
    assertRatingBelongsToOwnedShop(rating, shop, 'delete replies');

    if (!rating.reply || !rating.reply.text) {
        throw new BadRequestError('No reply exists for this rating');
    }

    const updatedRating = await ratingRepository.deleteReply(ratingId);
    if (!updatedRating) {
        throw new BadRequestError('No reply exists for this rating');
    }

    return { message: 'Reply deleted successfully' };
};

export const getRatingsByShopForBarber = async (ownerId, query = {}) => {
    const shop = await getOwnedShop(ownerId);

    const total = await ratingRepository.countByShop(shop._id);
    const { skip, limit, pagination } = buildPagination(query, total);

    const ratings = await ratingRepository.findByShop(shop._id, { skip, limit });

    return { items: ratings.map(formatRating), pagination };
};
