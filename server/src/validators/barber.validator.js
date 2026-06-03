import Joi from 'joi';

import { paginationSchema } from './common.validator.js';

export const barberDirectoryQuerySchema = paginationSchema.keys({
    search: Joi.string().trim().max(100).allow('').optional(),
    isOpen: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
});
