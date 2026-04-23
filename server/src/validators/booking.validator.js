import Joi from 'joi';
import { objectId, dateString, timeString, paginationSchema } from './common.validator.js';

export const bookSalonSchema = Joi.object({
    shopId: objectId.required(),
    employeeId: objectId.required(),
    serviceId: Joi.alternatives().try(
        objectId,
        Joi.array().items(objectId).min(1),
    ).required(),
    date: dateString.required(),
    time: timeString.required(),
});

export const rescheduleSchema = Joi.object({
    newDate: dateString.required(),
    newTime: timeString.required(),
});

export const reorderSchema = Joi.object({
    date: dateString.required(),
    time: timeString.required(),
});

export const updateBookingSchema = Joi.object({
    employeeId: objectId.required(),
    date: dateString.required(),
    time: timeString.required(),
});

export const bookingStatusSchema = Joi.object({
    status: Joi.string().valid('confirmed', 'completed', 'cancelled').required(),
});

export const customerBookingsQuerySchema = paginationSchema.keys({
    type: Joi.string().valid('past', 'upcoming', 'favorites').required(),
});

export const bookingIdParamSchema = Joi.object({
    id: objectId.required(),
});

export const employeeCalendarQuerySchema = Joi.object({
    date: dateString.required(),
});

export const bookingsByStatusQuerySchema = paginationSchema.keys({
    status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled').required(),
});

export const bookingMilestoneProgressQuerySchema = Joi.object({
    month: Joi.number().integer().min(1).max(12),
    year: Joi.number().integer().min(2000).max(9999),
}).and('month', 'year');
