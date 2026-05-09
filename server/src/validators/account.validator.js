import Joi from 'joi';
import config from '../config/index.js';

export const deleteBarberAccountSchema = Joi.object({
    currentPin: Joi.string().pattern(new RegExp(`^\\d{${config.security.pinLength}}$`)).required(),
});
