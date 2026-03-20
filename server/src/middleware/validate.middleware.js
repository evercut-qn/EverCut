import { BadRequestError } from '../utils/api-error.js';
import { storeValidatedRequestData } from '../utils/request-validation.utils.js';

/**
 * Generic validation middleware factory.
 *
 * Pass a Joi schema (or any object with a `.validate()` method) and the
 * source to validate ('body', 'query', or 'params').
 *
 * Usage:
 *   router.post('/booking', validate(bookingSchema, 'body'), controller);
 *   router.get('/services', validate(serviceListQuerySchema, 'query'), controller);
 *
 * Sanitized values are always stored under `req.validated[source]`.
 * Query values are also exposed as `req.validatedQuery` because `req.query`
 * is getter-only in Express 5 and must not be reassigned.
 */
export const validate = (schema, source = 'body') => {
    return (req, _res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,
            allowUnknown: false,
            stripUnknown: true,
        });

        if (error) {
            const errors = error.details.map((d) => d.message);
            return next(new BadRequestError('Validation failed', errors));
        }

        storeValidatedRequestData(req, source, value);

        if (source !== 'query') {
            // Preserve the existing controller contract for mutable request sources.
            req[source] = value;
        }

        next();
    };
};
