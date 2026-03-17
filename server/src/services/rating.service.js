import ratingRepository from '../repositories/rating.repository.js';
import shopRepository from '../repositories/shop.repository.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/api-error.js';
import { buildPagination } from '../utils/pagination.utils.js';

/**
 * Rating service.
 */

export const addRating = async (userId, shopId, rating, review) => {
    if (!shopId || !rating) throw new BadRequestError('shopId and rating are required');

    const customer = await customerRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError('Customer profile');
    const customerId = customer._id;

    const shop = await shopRepository.findById(shopId);
    if (!shop) throw new NotFoundError('Shop');

    const existing = await ratingRepository.findByCustomerAndShop(customerId, shopId);
    if (existing) throw new ConflictError('You have already rated this shop');

    return ratingRepository.create({ customerId, shopId, rating, review });
};

export const getRatingsByShop = async (shopId, query = {}) => {
    const total = await ratingRepository.countByShop(shopId);
    const { skip, limit, pagination } = buildPagination(query, total);
    
    const ratings = await ratingRepository.findByShop(shopId, { skip, limit });
    const items = ratings.map((r) => ({
        ratingId: r._id,
        rating: r.rating,
        review: r.review,
        user: {
            firstName: r.customerId?.firstName || 'Unknown',
            lastName: r.customerId?.lastName || '',
            email: r.customerId?.userId?.email || null,
        },
        reply: r.reply ? {
            text: r.reply.text,
            repliedAt: r.reply.repliedAt,
        } : null,
        createdAt: r.createdAt,
    }));
    
    return { items, pagination };
};

export const getRatingSummary = async (shopId) => {
    return ratingRepository.getShopSummary(shopId);
};

export const removeRating = async (ratingId, ownerId) => {
    const rating = await ratingRepository.findById(ratingId);
    if (!rating) throw new NotFoundError('Rating');

    // Verify the barber owns the shop this rating belongs to
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop || rating.shopId.toString() !== shop._id.toString()) {
        throw new BadRequestError('You can only remove ratings on your own shop');
    }

    await ratingRepository.deleteById(ratingId);
    return { message: 'Rating deleted successfully' };
};

export const addReplyToRating = async (ratingId, replyText, ownerId) => {
    if (!replyText || replyText.trim().length === 0) {
        throw new BadRequestError('Reply text is required');
    }

    if (replyText.length > 500) {
        throw new BadRequestError('Reply text cannot exceed 500 characters');
    }

    const rating = await ratingRepository.findById(ratingId);
    if (!rating) throw new NotFoundError('Rating');

    // Verify the barber owns the shop this rating belongs to
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop || rating.shopId.toString() !== shop._id.toString()) {
        throw new BadRequestError('You can only reply to ratings on your own shop');
    }

    const updatedRating = await ratingRepository.addReply(ratingId, replyText, ownerId);
    
    return {
        ratingId: updatedRating._id,
        rating: updatedRating.rating,
        review: updatedRating.review,
        user: {
            firstName: updatedRating.customerId?.firstName || 'Unknown',
            lastName: updatedRating.customerId?.lastName || '',
            email: updatedRating.customerId?.userId?.email || null,
        },
        reply: {
            text: updatedRating.reply.text,
            repliedAt: updatedRating.reply.repliedAt,
        },
        createdAt: updatedRating.createdAt,
    };
};

export const updateReplyToRating = async (ratingId, replyText, ownerId) => {
    if (!replyText || replyText.trim().length === 0) {
        throw new BadRequestError('Reply text is required');
    }

    if (replyText.length > 500) {
        throw new BadRequestError('Reply text cannot exceed 500 characters');
    }

    const rating = await ratingRepository.findById(ratingId);
    if (!rating) throw new NotFoundError('Rating');

    // Verify the barber owns the shop this rating belongs to
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop || rating.shopId.toString() !== shop._id.toString()) {
        throw new BadRequestError('You can only update replies on your own shop');
    }

    if (!rating.reply || !rating.reply.text) {
        throw new BadRequestError('No reply exists for this rating');
    }

    const updatedRating = await ratingRepository.updateReply(ratingId, replyText);
    
    return {
        ratingId: updatedRating._id,
        rating: updatedRating.rating,
        review: updatedRating.review,
        user: {
            firstName: updatedRating.customerId?.firstName || 'Unknown',
            lastName: updatedRating.customerId?.lastName || '',
            email: updatedRating.customerId?.userId?.email || null,
        },
        reply: {
            text: updatedRating.reply.text,
            repliedAt: updatedRating.reply.repliedAt,
        },
        createdAt: updatedRating.createdAt,
    };
};

export const deleteReplyFromRating = async (ratingId, ownerId) => {
    const rating = await ratingRepository.findById(ratingId);
    if (!rating) throw new NotFoundError('Rating');

    // Verify the barber owns the shop this rating belongs to
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop || rating.shopId.toString() !== shop._id.toString()) {
        throw new BadRequestError('You can only delete replies on your own shop');
    }

    if (!rating.reply || !rating.reply.text) {
        throw new BadRequestError('No reply exists for this rating');
    }

    await ratingRepository.deleteReply(ratingId);
    return { message: 'Reply deleted successfully' };
};

export const getRatingsByShopForBarber = async (ownerId, query = {}) => {
    const shop = await shopRepository.findByOwnerId(ownerId);
    if (!shop) throw new NotFoundError('Shop');

    const total = await ratingRepository.countByShop(shop._id);
    const { skip, limit, pagination } = buildPagination(query, total);

    const ratings = await ratingRepository.findByShop(shop._id, { skip, limit });
    const items = ratings.map((r) => ({
        ratingId: r._id,
        rating: r.rating,
        review: r.review,
        user: {
            firstName: r.customerId?.firstName || 'Unknown',
            lastName: r.customerId?.lastName || '',
            email: r.customerId?.userId?.email || null,
        },
        reply: r.reply ? {
            text: r.reply.text,
            repliedAt: r.reply.repliedAt,
        } : null,
        createdAt: r.createdAt,
    }));
    
    return { items, pagination };
};
