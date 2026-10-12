import Joi from 'joi';
import { objectId } from './common.validator.js';

export const addRatingSchema = Joi.object({
    bookingId: objectId.required().messages({
        'any.invalid': 'Booking ID must be a valid ID',
        'any.required': 'Booking ID is required',
    }),
    shopId: objectId.optional().messages({
        'any.invalid': 'Shop ID must be a valid ID',
    }),
    rating: Joi.number().integer().min(1).max(5).required().messages({
        'number.base': 'Rating must be a number',
        'number.min': 'Rating must be between 1 and 5',
        'number.max': 'Rating must be between 1 and 5',
        'any.required': 'Rating is required',
    }),
    review: Joi.string().trim().max(500).allow('').optional().messages({
        'string.max': 'Review cannot exceed 500 characters',
    }),
});

export const addReplySchema = Joi.object({
    replyText: Joi.string().trim().min(1).max(500).required().messages({
        'string.empty': 'Reply text is required',
        'string.min': 'Reply text is required',
        'any.required': 'Reply text is required',
        'string.max': 'Reply text cannot exceed 500 characters',
    }),
});
