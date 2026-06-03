import Joi from 'joi';

import { paginationSchema } from './common.validator.js';

export const customerDirectoryQuerySchema = paginationSchema.keys({
    search: Joi.string().trim().max(100).allow('').optional(),
    isActive: Joi.boolean().optional(),
});
