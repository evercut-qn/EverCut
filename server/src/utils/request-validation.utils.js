const VALIDATED_REQUEST_ALIASES = Object.freeze({
    body: 'validatedBody',
    params: 'validatedParams',
    query: 'validatedQuery',
});

const hasOwn = (value, key) => (
    Boolean(value) && Object.prototype.hasOwnProperty.call(value, key)
);

export const storeValidatedRequestData = (req, source, value) => {
    if (!req.validated || typeof req.validated !== 'object') {
        req.validated = Object.create(null);
    }

    req.validated[source] = value;

    const alias = VALIDATED_REQUEST_ALIASES[source];
    if (alias) {
        req[alias] = value;
    }
};

export const getValidatedRequestData = (req, source) => {
    if (hasOwn(req.validated, source)) {
        return req.validated[source];
    }

    const alias = VALIDATED_REQUEST_ALIASES[source];
    if (alias && hasOwn(req, alias)) {
        return req[alias];
    }

    return req[source];
};
