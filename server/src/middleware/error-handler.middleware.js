import { AppError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Global Express error-handling middleware.
 *
 * Must be the LAST app.use() call so it catches everything.
 * Handles operational errors (expected) differently from programmer bugs.
 */

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
    // -----------------------------------------------------------------------
    // 1. Mongoose ValidationError
    // -----------------------------------------------------------------------
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((e) => e.message);
        return res
            .status(400)
            .json(ApiResponse.error('Validation failed', { errors }));
    }

    // -----------------------------------------------------------------------
    // 2. Mongoose duplicate-key error (code 11000)
    // -----------------------------------------------------------------------
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {}).join(', ');
        return res
            .status(409)
            .json(ApiResponse.error(`Duplicate value for: ${field}`));
    }

    // -----------------------------------------------------------------------
    // 3. Mongoose CastError (e.g. invalid ObjectId)
    // -----------------------------------------------------------------------
    if (err.name === 'CastError') {
        return res
            .status(400)
            .json(ApiResponse.error(`Invalid ${err.path}: ${err.value}`));
    }

    // -----------------------------------------------------------------------
    // 4. Our custom AppError hierarchy (operational errors)
    // -----------------------------------------------------------------------
    if (err instanceof AppError) {
        const data = Array.isArray(err.errors) && err.errors.length > 0
            ? { errors: err.errors }
            : {};

        return res
            .status(err.statusCode)
            .json(ApiResponse.error(err.message, data));
    }

    // -----------------------------------------------------------------------
    // 5. Unexpected / programmer errors
    // -----------------------------------------------------------------------
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
    });

    const message =
        config.env === 'production'
            ? 'Internal server error'
            : err.message || 'Internal server error';

    return res.status(500).json(ApiResponse.error(message));
};

export default errorHandler;
