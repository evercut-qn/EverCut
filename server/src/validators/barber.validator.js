import Joi from 'joi';

import { paginationSchema, objectId } from './common.validator.js';

export const barberDirectoryQuerySchema = paginationSchema.keys({
    search: Joi.string().trim().max(100).allow('').optional(),
    isOpen: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
});

export const barberIdParamSchema = Joi.object({
    id: objectId.required().messages({
        'any.required': 'Barber ID is required',
    }),
});
