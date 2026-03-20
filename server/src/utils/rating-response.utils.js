export const serializeRating = (rating) => ({
    ratingId: rating._id,
    rating: rating.rating,
    review: rating.review || '',
    user: {
        firstName: rating.customerId?.firstName || 'Unknown',
        lastName: rating.customerId?.lastName || '',
        photoUrl: rating.customerId?.photoUrl || null,
    },
    reply: rating.reply?.text
        ? {
            text: rating.reply.text,
            repliedAt: rating.reply.repliedAt,
        }
        : null,
    createdAt: rating.createdAt,
    updatedAt: rating.updatedAt,
});
