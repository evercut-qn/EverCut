export const UPI_ID_PATTERN = /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{1,63}$/;

export const normalizePayoutString = (value, { uppercase = false } = {}) => {
    if (value === undefined || value === null) return null;

    const trimmed = String(value).trim();
    if (!trimmed) return null;

    return uppercase ? trimmed.toUpperCase() : trimmed;
};

export const isValidUpiId = (value) => {
    const normalized = normalizePayoutString(value);
    return Boolean(normalized && UPI_ID_PATTERN.test(normalized));
};
