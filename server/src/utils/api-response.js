/**
 * Standardized API response helpers.
 *
 * Usage in controllers:
 *   res.status(200).json(ApiResponse.success(data, 'User fetched'));
 *   res.status(400).json(ApiResponse.error('Validation failed', { errors }));
 */

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

const isMessageOnlyPayload = (value) => (
    isPlainObject(value)
    && Object.keys(value).length === 1
    && typeof value.message === 'string'
);

const normalizeData = (value) => (value === null || value === undefined ? {} : value);

export class ApiResponse {
    /**
     * Success envelope.
     * @param {*} data
     * @param {string} message
     */
    static success(data = {}, message = 'Success') {
        const normalizedMessage = isMessageOnlyPayload(data) && message === 'Success'
            ? data.message
            : message;

        return {
            success: true,
            message: normalizedMessage,
            data: isMessageOnlyPayload(data) ? {} : normalizeData(data),
        };
    }

    /**
     * Error envelope.
     * @param {string} message
     * @param {*} data
     */
    static error(message = 'Error', data = {}) {
        return {
            success: false,
            message,
            data: normalizeData(data),
        };
    }

    /**
     * Paginated success envelope.
     * @param {Array} items
     * @param {Object} pagination
     * @param {string} message
     */
    static paginated(items, pagination, message = 'Success') {
        return {
            success: true,
            message,
            data: {
                items,
                pagination,
            },
        };
    }
}
