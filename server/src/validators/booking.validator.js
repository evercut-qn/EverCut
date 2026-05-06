import Joi from 'joi';
import { objectId, dateString, timeString, paginationSchema } from './common.validator.js';

const createDirectBookingSchema = Joi.object({
    shopId: objectId.required(),
    employeeId: objectId.required(),
    serviceIds: Joi.array().items(objectId).min(1).required(),
    date: dateString.required(),
    time: timeString.required(),
    idempotencyKey: Joi.string().trim().max(128),
});

const createFromSourceBookingSchema = Joi.object({
    sourceBookingId: objectId.required(),
    date: dateString.required(),
    time: timeString.required(),
    idempotencyKey: Joi.string().trim().max(128),
});

export const createBookingSchema = Joi.alternatives()
    .try(createDirectBookingSchema, createFromSourceBookingSchema)
    .match('one');

const bookingSchedulePatchSchema = Joi.object({
    employeeId: objectId.required(),
    date: dateString.required(),
    time: timeString.required(),
});

const bookingStatusPatchSchema = Joi.object({
    status: Joi.string().valid('confirmed', 'completed', 'cancelled', 'no-show').required(),
});

export const bookingPatchSchema = Joi.alternatives()
    .try(bookingSchedulePatchSchema, bookingStatusPatchSchema)
    .match('one');

export const bookingListQuerySchema = paginationSchema.keys({
    // Customer-only filters
    timeframe: Joi.string().valid('past', 'upcoming'),
    favorite: Joi.boolean(),
    
    // Shared filters (both customer and barber)
    status: Joi.string().valid('pending', 'awaiting_confirmation', 'confirmed', 'completed', 'cancelled', 'no-show'),
    paymentStatus: Joi.string().valid('pending', 'initiated', 'success', 'failed', 'refund_pending', 'refunded', 'refund_failed'),
    
    // Barber-only filters
    employeeId: objectId,
    dateFrom: dateString,
    dateTo: dateString,
});

export const bookingIdParamSchema = Joi.object({
    id: objectId.required(),
});

export const bookingMilestoneProgressQuerySchema = Joi.object({
    month: Joi.number().integer().min(1).max(12),
    year: Joi.number().integer().min(2000).max(9999),
}).and('month', 'year');

export const queueFilterQuerySchema = Joi.object({
    timeframe: Joi.string().valid('active', 'upcoming').default('active'),
});
