import Joi from 'joi';
import { ALL_SUBSCRIPTION_PLANS } from '../utils/constants.js';
import { paginationSchema } from './common.validator.js';

const planIdSchema = Joi.string()
    .valid(...ALL_SUBSCRIPTION_PLANS)
    .required()
    .messages({
        'any.only': 'Invalid plan ID',
        'any.required': 'Plan ID is required',
    });

export const subscriptionPlanBodySchema = Joi.object({
    planId: planIdSchema,
});

export const subscriptionTransactionQuerySchema = paginationSchema.keys({
    limit: Joi.number().integer().min(1).max(100).default(20),
});
