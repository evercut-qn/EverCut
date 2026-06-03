import Joi from 'joi';

import {
    ALL_PAYOUT_GATEWAYS,
    ALL_PAYOUT_TRANSACTION_STATUSES,
    PAYOUT_MODES,
} from '../utils/constants.js';
import { objectId, paginationSchema } from './common.validator.js';

export const payoutIdParamSchema = Joi.object({
    payoutId: objectId.required().messages({
        'any.required': 'Payout ID is required',
    }),
});

export const pendingPayoutsQuerySchema = paginationSchema.keys({
    search: Joi.string().trim().max(100).allow('').optional(),
});

export const createManualPayoutSchema = Joi.object({
    barberId: objectId.required().messages({
        'any.required': 'Barber ID is required',
    }),
    bookingIds: Joi.array()
        .items(objectId.required())
        .min(1)
        .max(100)
        .unique()
        .required()
        .messages({
            'array.min': 'At least one booking ID is required',
            'array.max': 'Maximum 100 bookings per payout',
            'array.unique': 'Booking IDs must not contain duplicates',
            'any.required': 'Booking IDs are required',
        }),
    utr: Joi.string()
        .trim()
        .uppercase()
        .min(3)
        .max(50)
        .pattern(/^[A-Z0-9]+$/)
        .required()
        .messages({
            'any.required': 'UTR/transaction reference is required',
            'string.pattern.base': 'UTR must contain only alphanumeric characters',
        }),
    transferMode: Joi.string()
        .valid(...Object.values(PAYOUT_MODES))
        .default(PAYOUT_MODES.UPI)
        .optional(),
    notes: Joi.string().trim().max(500).allow('').optional(),
});

export const listPayoutsQuerySchema = paginationSchema.keys({
    status: Joi.string().valid(...ALL_PAYOUT_TRANSACTION_STATUSES).optional(),
    gateway: Joi.string().valid(...ALL_PAYOUT_GATEWAYS).optional(),
    barberId: objectId.optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    sort: Joi.string()
        .pattern(/^[a-zA-Z]+:(asc|desc)$/)
        .default('createdAt:desc')
        .optional()
        .messages({
            'string.pattern.base': 'Sort must be in format field:direction (e.g., createdAt:desc)',
        }),
});
