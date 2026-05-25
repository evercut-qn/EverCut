import config from '../config/index.js';
import { BadRequestError } from './api-error.js';
import { SERVICE_TYPE } from './constants.js';

export const BOOKING_FEE_TYPE = Object.freeze({
    SINGLE: 'SINGLE',
    BUNDLE: 'BUNDLE',
    COMBINED: 'COMBINED',
});

const toNonNegativeInteger = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : fallback;
};

export const classifyBookingFeeType = (services = []) => {
    const hasBundle = services.some((service) => service?.serviceType === SERVICE_TYPE.BUNDLED);

    if (hasBundle && services.length > 1) return BOOKING_FEE_TYPE.COMBINED;
    if (hasBundle) return BOOKING_FEE_TYPE.BUNDLE;
    if (services.length <= 1) return BOOKING_FEE_TYPE.SINGLE;

    return BOOKING_FEE_TYPE.BUNDLE;
};

export const calculatePlatformFee = (bookingFeeType) => {
    if (bookingFeeType === BOOKING_FEE_TYPE.SINGLE) {
        return config.payment.platformFeeSingle;
    }

    if (
        bookingFeeType === BOOKING_FEE_TYPE.BUNDLE
        || bookingFeeType === BOOKING_FEE_TYPE.COMBINED
    ) {
        return config.payment.platformFeeBundle;
    }

    throw new Error(`Unsupported booking fee type: ${bookingFeeType}`);
};

export const getRefundFee = (bookingFeeType) => {
    if (bookingFeeType === BOOKING_FEE_TYPE.SINGLE) {
        return config.payment.refundFeeSingle;
    }

    if (
        bookingFeeType === BOOKING_FEE_TYPE.BUNDLE
        || bookingFeeType === BOOKING_FEE_TYPE.COMBINED
    ) {
        return config.payment.refundFeeBundle;
    }

    throw new Error(`Unsupported booking fee type: ${bookingFeeType}`);
};

export const getMinimumServiceAmount = (bookingFeeType) => {
    if (bookingFeeType === BOOKING_FEE_TYPE.SINGLE) {
        return config.payment.minSingleServiceAmount;
    }

    if (
        bookingFeeType === BOOKING_FEE_TYPE.BUNDLE
        || bookingFeeType === BOOKING_FEE_TYPE.COMBINED
    ) {
        return config.payment.minBundleServiceAmount;
    }

    throw new Error(`Unsupported booking fee type: ${bookingFeeType}`);
};

const getMinimumServiceAmountLabel = (bookingFeeType) => (
    bookingFeeType === BOOKING_FEE_TYPE.SINGLE ? 'single service' : 'bundle'
);

export const assertMinimumServiceAmount = (serviceAmount, bookingFeeType) => {
    const amount = Number(serviceAmount);
    const minimumServiceAmount = getMinimumServiceAmount(bookingFeeType);
    if (Number.isFinite(amount) && amount >= minimumServiceAmount) return;

    throw new BadRequestError(
        `Minimum ${getMinimumServiceAmountLabel(bookingFeeType)} booking amount is ₹${minimumServiceAmount}`,
    );
};

export const resolveCustomerPlatformFee = ({
    customer,
    bookingFeeType,
    activeWaiverReservations = 0,
}) => {
    const feeWaiverQuota = toNonNegativeInteger(config.payment.feeWaiverQuota, 0);
    const feeWaiverBookingsUsed = Math.min(
        toNonNegativeInteger(customer?.feeWaiverBookingsUsed, 0),
        feeWaiverQuota,
    );
    const reserved = Math.min(toNonNegativeInteger(activeWaiverReservations, 0), feeWaiverQuota);
    const feeWaiverRemaining = Math.max(feeWaiverQuota - feeWaiverBookingsUsed - reserved, 0);
    const platformFee = calculatePlatformFee(bookingFeeType);
    const waiverApplied = feeWaiverRemaining > 0;

    return {
        bookingFeeType,
        platformFee: waiverApplied ? 0 : platformFee,
        waiverApplied,
        feeWaiverBookingsUsed,
        feeWaiverQuota,
        feeWaiverRemaining,
    };
};
