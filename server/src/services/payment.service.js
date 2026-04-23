import crypto from 'crypto';

import config from '../config/index.js';
import customerRepository from '../repositories/customer.repository.js';
import bookingRepository from '../repositories/booking.repository.js';
import paymentRepository from '../repositories/payment.repository.js';
import serviceRepository from '../repositories/service.repository.js';
import shopRepository from '../repositories/shop.repository.js';
import phonePeAdapter from '../adapters/phonepe/phonepe.adapter.js';
import logger from '../utils/logger.js';
import {
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    PaymentError,
} from '../utils/api-error.js';
import {
    BOOKING_STATUS,
    BUNDLE_RULES,
    PAYMENT_GATEWAYS,
    PAYMENT_STATUS,
    PAYMENT_TRANSACTION_STATUS,
    PHONEPE_WEBHOOK_EVENTS,
    REFUND_FEES,
    ROLES,
    SERVICE_TYPE,
} from '../utils/constants.js';
import {
    getEffectiveServicePrice,
    normalizeServicePricing,
} from '../utils/service-pricing.utils.js';

const toObjectIdString = (value) => String(value?._id || value || '');

const generateMerchantOrderId = (bookingId) => {
    const random = crypto.randomBytes(4).toString('hex');
    return `EC-${bookingId}-${Date.now()}-${random}`;
};

const REFUND_TYPE = Object.freeze({
    CANCELLATION: 'cancellation',
    MANUAL: 'manual',
});

const REFUND_MANUAL_MESSAGE = 'Refund could not be initiated. Please request a manual refund.';

const getRefundSeed = (...values) => {
    for (const value of values) {
        const match = String(value || '').match(/[a-f0-9]{24}/i);
        if (match) return match[0].toLowerCase();
    }

    return crypto
        .createHash('sha256')
        .update(values.map((value) => String(value || '')).join(':'))
        .digest('hex')
        .slice(0, 24);
};

const generateMerchantRefundId = ({ merchantOrderId, bookingId }) => {
    const seed = getRefundSeed(bookingId, merchantOrderId);
    const random = crypto.randomBytes(6).toString('hex');
    return `RF-${seed}-${random}`;
};

const getRefundFeeInPaisa = (payment) => (
    payment.settlement?.isBundle ? REFUND_FEES.BUNDLE : REFUND_FEES.SINGLE_SERVICE
) * 100;

const toPositivePaisa = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0
        ? Math.round(numericValue)
        : 0;
};

const getRefundGrossAmountInPaisa = (payment, booking, platformFeeInPaisa) => {
    if (payment.settlement?.serviceAmount !== undefined && payment.settlement.serviceAmount !== null) {
        return toPositivePaisa(payment.settlement.serviceAmount);
    }

    const bookingTotalInPaisa = Number.isFinite(Number(booking.totalAmount))
        ? Math.round(Number(booking.totalAmount) * 100)
        : 0;

    if (bookingTotalInPaisa > 0) {
        return bookingTotalInPaisa;
    }

    return Math.max(0, toPositivePaisa(payment.amount) - platformFeeInPaisa);
};

const createRefundRecord = ({
    merchantRefundId,
    refundResponse = null,
    amount,
    refundFee,
    platformFee,
    status,
    type,
    reason,
    failureReason = null,
    manualResolutionRequired,
}) => {
    const record = {
        merchantRefundId,
        gatewayRefundId: refundResponse?.refundId || null,
        amount,
        refundFee,
        platformFee,
        status,
        type,
        reason,
        initiatedAt: new Date(),
        completedAt: null,
        failureReason,
    };

    if (manualResolutionRequired !== undefined) {
        record.manualResolutionRequired = manualResolutionRequired;
    }

    return record;
};

const sumServiceAmounts = (services = []) => services.reduce(
    (sum, service) => sum + (getEffectiveServicePrice(service) ?? 0),
    0,
);

const MUTABLE_PAYMENT_STATUSES = new Set([
    PAYMENT_TRANSACTION_STATUS.INITIATED,
    PAYMENT_TRANSACTION_STATUS.PENDING,
]);

const SUCCESSFUL_PAYMENT_LIFECYCLE_STATUSES = new Set([
    PAYMENT_TRANSACTION_STATUS.COMPLETED,
    PAYMENT_TRANSACTION_STATUS.REFUND_PENDING,
    PAYMENT_TRANSACTION_STATUS.REFUNDED,
    PAYMENT_TRANSACTION_STATUS.REFUND_FAILED,
]);

const loadBookingWithCustomerAccess = async (userId, bookingId) => {
    const [customer, booking] = await Promise.all([
        customerRepository.findByUserId(userId),
        bookingRepository.findById(bookingId),
    ]);

    if (!customer) {
        throw new NotFoundError('Customer profile');
    }

    if (!booking) {
        throw new NotFoundError('Booking');
    }

    if (toObjectIdString(booking.customerId) !== toObjectIdString(customer._id)) {
        throw new ForbiddenError('You can only access payments for your own bookings');
    }

    return { booking, customer };
};

const loadBookedServices = async (booking) => {
    if (!Array.isArray(booking.serviceIds) || booking.serviceIds.length === 0) {
        return [];
    }

    const services = await serviceRepository.findByIds(
        booking.serviceIds,
        'serviceType finalPrice totalPrice actualPrice offerPrice',
    );

    return services.map(normalizeServicePricing);
};

const calculateSettlement = async (booking) => {
    const services = await loadBookedServices(booking);
    const isBundle = booking.serviceIds.length > 1
        || services.some((service) => service.serviceType === SERVICE_TYPE.BUNDLED);
    const serviceAmountInRupees = Number(booking.totalAmount || sumServiceAmounts(services) || 0);

    if (isBundle && serviceAmountInRupees < BUNDLE_RULES.MIN_SERVICE_AMOUNT) {
        throw new BadRequestError(`Bundle service amount must be at least ₹${BUNDLE_RULES.MIN_SERVICE_AMOUNT}`);
    }

    const platformFeeInRupees = isBundle
        ? config.payment.platformFeeBundle
        : config.payment.platformFeeSingle;

    const serviceAmount = Math.round(serviceAmountInRupees * 100);
    const platformFee = Math.round(platformFeeInRupees * 100);

    return {
        serviceAmount,
        platformFee,
        barberPayout: serviceAmount,
        isBundle,
        totalAmountInPaisa: serviceAmount + platformFee,
        totalAmountInRupees: (serviceAmount + platformFee) / 100,
    };
};

const verifyOrderFromGateway = async (webhookData) => {
    if (!webhookData?.merchantOrderId) {
        return webhookData;
    }

    try {
        const status = await phonePeAdapter.getOrderStatus(webhookData.merchantOrderId);
        return {
            ...webhookData,
            state: status.state || webhookData.state,
            amount: status.amount || webhookData.amount,
            paymentDetails: status.paymentDetails || webhookData.paymentDetails || [],
            errorCode: status.errorCode || webhookData.errorCode || null,
            detailedErrorCode: status.detailedErrorCode || webhookData.detailedErrorCode || null,
            errorContext: status.errorContext || webhookData.errorContext || null,
        };
    } catch (error) {
        logger.warn('[PaymentService] Order verification failed, using webhook payload', {
            merchantOrderId: webhookData.merchantOrderId,
            error: error.message,
        });
        return webhookData;
    }
};

const logIgnoredPaymentTransition = (message, payment, nextState) => {
    logger.warn(message, {
        paymentId: payment._id,
        bookingId: payment.bookingId,
        merchantOrderId: payment.merchantOrderId,
        currentStatus: payment.status,
        nextState,
    });
};

const assertRefundPermission = async (actor, booking) => {
    if (!actor?.role) {
        return;
    }

    if (actor.role === ROLES.ADMIN) {
        return;
    }

    if (actor.role !== ROLES.BARBER) {
        throw new ForbiddenError('You are not allowed to initiate refunds');
    }

    const actorShop = await shopRepository.findByOwnerId(actor.userId || actor._id);
    if (!actorShop || toObjectIdString(actorShop._id) !== toObjectIdString(booking.shopId)) {
        throw new ForbiddenError('Barbers can only refund bookings for their own shop');
    }
};

export const initiatePayment = async (userId, bookingId) => {
    const { booking, customer } = await loadBookingWithCustomerAccess(userId, bookingId);

    if (booking.status === BOOKING_STATUS.CANCELLED) {
        throw new BadRequestError('Cannot pay for a cancelled booking');
    }

    if (booking.status === BOOKING_STATUS.COMPLETED) {
        throw new BadRequestError('Cannot pay for a completed booking');
    }

    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
        throw new ConflictError('Booking is already paid');
    }

    const existingPending = await paymentRepository.findPendingByBookingId(bookingId);
    if (existingPending?.expiresAt && new Date(existingPending.expiresAt) > new Date()) {
        return {
            redirectUrl: existingPending.redirectUrl,
            paymentId: existingPending._id,
            merchantOrderId: existingPending.merchantOrderId,
        };
    }

    if (existingPending) {
        await paymentRepository.updateById(existingPending._id, {
            status: PAYMENT_TRANSACTION_STATUS.EXPIRED,
        });
    }

    const settlement = await calculateSettlement(booking);
    if (settlement.totalAmountInPaisa <= 0) {
        throw new BadRequestError('Booking amount must be greater than zero');
    }

    const merchantOrderId = generateMerchantOrderId(bookingId);
    const paymentTransaction = await paymentRepository.create({
        bookingId,
        customerId: customer._id,
        shopId: booking.shopId,
        merchantOrderId,
        amount: settlement.totalAmountInPaisa,
        amountInRupees: settlement.totalAmountInRupees,
        status: PAYMENT_TRANSACTION_STATUS.INITIATED,
        settlement: {
            serviceAmount: settlement.serviceAmount,
            platformFee: settlement.platformFee,
            barberPayout: settlement.barberPayout,
            isBundle: settlement.isBundle,
            settled: false,
            settledAt: null,
        },
    });

    const redirectUrl = `${config.payment.redirectBaseUrl}?bookingId=${bookingId}`;

    try {
        const gatewayResponse = await phonePeAdapter.createOrder({
            merchantOrderId,
            amount: settlement.totalAmountInPaisa,
            redirectUrl,
            message: `EverCut Salon Booking #${bookingId}`,
            metadata: {
                bookingId: toObjectIdString(bookingId),
                customerId: toObjectIdString(customer._id),
                shopId: toObjectIdString(booking.shopId),
            },
        });

        await paymentRepository.updateById(paymentTransaction._id, {
            gatewayOrderId: gatewayResponse.orderId,
            redirectUrl: gatewayResponse.redirectUrl,
            status: PAYMENT_TRANSACTION_STATUS.PENDING,
            gatewayState: gatewayResponse.state,
            expiresAt: gatewayResponse.expiresAt
                ? new Date(gatewayResponse.expiresAt)
                : new Date(Date.now() + config.payment.sessionExpirySeconds * 1000),
        });

        await bookingRepository.updateById(bookingId, {
            paymentTransactionId: paymentTransaction._id,
            merchantOrderId,
            paymentStatus: PAYMENT_STATUS.INITIATED,
            paymentGateway: PAYMENT_GATEWAYS.PHONEPE,
        });

        logger.info('[PaymentService] Payment initiated', {
            bookingId,
            merchantOrderId,
            amountInRupees: settlement.totalAmountInRupees,
            gateway: PAYMENT_GATEWAYS.PHONEPE,
        });

        return {
            redirectUrl: gatewayResponse.redirectUrl,
            paymentId: paymentTransaction._id,
            merchantOrderId,
        };
    } catch (error) {
        await paymentRepository.updateById(paymentTransaction._id, {
            status: PAYMENT_TRANSACTION_STATUS.FAILED,
            errorDescription: error.message,
        });
        await bookingRepository.updateById(bookingId, {
            paymentStatus: PAYMENT_STATUS.FAILED,
        });

        throw error instanceof PaymentError
            ? error
            : new PaymentError(error.message || 'Failed to initiate payment');
    }
};

export const handleWebhook = async (headers, body) => {
    if (!phonePeAdapter.verifyWebhook(headers, body)) {
        logger.warn('[PaymentService] Invalid webhook authentication');
        throw new BadRequestError('Invalid webhook authentication');
    }

    let webhookData = phonePeAdapter.parseWebhookPayload(body);

    logger.info('[PaymentService] Webhook received', {
        event: webhookData.event,
        merchantOrderId: webhookData.merchantOrderId,
        state: webhookData.state,
    });

    if (
        webhookData.event === PHONEPE_WEBHOOK_EVENTS.ORDER_COMPLETED
        || webhookData.event === PHONEPE_WEBHOOK_EVENTS.ORDER_FAILED
    ) {
        webhookData = await verifyOrderFromGateway(webhookData);
    }

    switch (webhookData.event) {
        case PHONEPE_WEBHOOK_EVENTS.ORDER_COMPLETED:
            return handlePaymentSuccess(webhookData);
        case PHONEPE_WEBHOOK_EVENTS.ORDER_FAILED:
            return handlePaymentFailure(webhookData);
        case PHONEPE_WEBHOOK_EVENTS.REFUND_COMPLETED:
            return handleRefundSuccess(webhookData);
        case PHONEPE_WEBHOOK_EVENTS.REFUND_FAILED:
            return handleRefundFailure(webhookData);
        default:
            logger.warn('[PaymentService] Unknown PhonePe webhook event', { event: webhookData.event });
            return { processed: false, event: webhookData.event };
    }
};

export const getPaymentStatus = async (userId, paymentId) => {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
        throw new NotFoundError('Payment');
    }

    const customer = await customerRepository.findByUserId(userId);
    if (!customer || toObjectIdString(payment.customerId) !== toObjectIdString(customer._id)) {
        throw new ForbiddenError('You can only access your own payments');
    }

    if (payment.status === PAYMENT_TRANSACTION_STATUS.PENDING) {
        try {
            const latestStatus = await phonePeAdapter.getOrderStatus(payment.merchantOrderId);
            if (latestStatus.state === 'COMPLETED') {
                await handlePaymentSuccess({
                    merchantOrderId: payment.merchantOrderId,
                    state: latestStatus.state,
                    amount: latestStatus.amount,
                    paymentDetails: latestStatus.paymentDetails,
                    errorCode: latestStatus.errorCode,
                    detailedErrorCode: latestStatus.detailedErrorCode,
                    errorContext: latestStatus.errorContext,
                });
            } else if (latestStatus.state === 'FAILED') {
                await handlePaymentFailure({
                    merchantOrderId: payment.merchantOrderId,
                    state: latestStatus.state,
                    amount: latestStatus.amount,
                    paymentDetails: latestStatus.paymentDetails,
                    errorCode: latestStatus.errorCode,
                    detailedErrorCode: latestStatus.detailedErrorCode,
                    errorContext: latestStatus.errorContext,
                });
            }
        } catch (error) {
            logger.warn('[PaymentService] Payment status poll failed', {
                paymentId,
                merchantOrderId: payment.merchantOrderId,
                error: error.message,
            });
        }
    }

    const latestPayment = await paymentRepository.findById(paymentId);
    return {
        _id: latestPayment._id,
        bookingId: latestPayment.bookingId,
        merchantOrderId: latestPayment.merchantOrderId,
        status: latestPayment.status,
        amountInRupees: latestPayment.amountInRupees,
        paymentMode: latestPayment.paymentMode,
        createdAt: latestPayment.createdAt,
    };
};

export const getPaymentByBooking = async (userId, bookingId) => {
    const { customer } = await loadBookingWithCustomerAccess(userId, bookingId);
    const payment = await paymentRepository.findLatestByBookingId(bookingId);

    if (!payment) {
        throw new NotFoundError('Payment for this booking');
    }

    if (toObjectIdString(payment.customerId) !== toObjectIdString(customer._id)) {
        throw new ForbiddenError('You can only access your own payments');
    }

    return {
        _id: payment._id,
        bookingId: payment.bookingId,
        merchantOrderId: payment.merchantOrderId,
        status: payment.status,
        amountInRupees: payment.amountInRupees,
        paymentMode: payment.paymentMode,
        createdAt: payment.createdAt,
    };
};

async function handlePaymentSuccess(webhookData) {
    const payment = await paymentRepository.findByMerchantOrderId(webhookData.merchantOrderId);
    if (!payment) {
        logger.warn('[PaymentService] Payment not found for success webhook', {
            merchantOrderId: webhookData.merchantOrderId,
        });
        return { processed: false, event: PHONEPE_WEBHOOK_EVENTS.ORDER_COMPLETED };
    }

    if (payment.status === PAYMENT_TRANSACTION_STATUS.COMPLETED) {
        return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.ORDER_COMPLETED };
    }

    if (!MUTABLE_PAYMENT_STATUSES.has(payment.status)) {
        logIgnoredPaymentTransition(
            '[PaymentService] Ignoring payment success for terminal state',
            payment,
            PAYMENT_TRANSACTION_STATUS.COMPLETED,
        );
        return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.ORDER_COMPLETED };
    }

    const firstPayment = webhookData.paymentDetails?.[0] || null;

    await paymentRepository.updateById(payment._id, {
        status: PAYMENT_TRANSACTION_STATUS.COMPLETED,
        gatewayState: webhookData.state,
        paymentMode: firstPayment?.paymentMode || webhookData.paymentMode || null,
        gatewayTransactionId: firstPayment?.transactionId || webhookData.transactionId || null,
        paymentInstrument: firstPayment?.instrument || null,
        rail: firstPayment?.rail || null,
        errorCode: null,
        detailedErrorCode: null,
        errorSource: null,
        errorStage: null,
        errorDescription: null,
        webhookReceivedAt: new Date(),
        webhookProcessed: true,
    });

    await bookingRepository.updateById(payment.bookingId, {
        paymentStatus: PAYMENT_STATUS.SUCCESS,
        status: BOOKING_STATUS.CONFIRMED,
        paidAt: new Date(),
        paymentMode: firstPayment?.paymentMode || webhookData.paymentMode || null,
    });

    logger.info('[PaymentService] Payment completed', {
        bookingId: payment.bookingId,
        merchantOrderId: payment.merchantOrderId,
        paymentMode: firstPayment?.paymentMode || webhookData.paymentMode || null,
    });

    return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.ORDER_COMPLETED };
}

async function handlePaymentFailure(webhookData) {
    const payment = await paymentRepository.findByMerchantOrderId(webhookData.merchantOrderId);
    if (!payment) {
        return { processed: false, event: PHONEPE_WEBHOOK_EVENTS.ORDER_FAILED };
    }

    if (payment.status === PAYMENT_TRANSACTION_STATUS.FAILED) {
        return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.ORDER_FAILED };
    }

    if (
        payment.status === PAYMENT_TRANSACTION_STATUS.EXPIRED
        || SUCCESSFUL_PAYMENT_LIFECYCLE_STATUSES.has(payment.status)
    ) {
        logIgnoredPaymentTransition(
            '[PaymentService] Ignoring payment failure for terminal state',
            payment,
            PAYMENT_TRANSACTION_STATUS.FAILED,
        );
        return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.ORDER_FAILED };
    }

    if (!MUTABLE_PAYMENT_STATUSES.has(payment.status)) {
        logIgnoredPaymentTransition(
            '[PaymentService] Ignoring unexpected payment failure transition',
            payment,
            PAYMENT_TRANSACTION_STATUS.FAILED,
        );
        return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.ORDER_FAILED };
    }

    await paymentRepository.updateById(payment._id, {
        status: PAYMENT_TRANSACTION_STATUS.FAILED,
        gatewayState: webhookData.state,
        errorCode: webhookData.errorCode || webhookData.errorContext?.errorCode || null,
        detailedErrorCode: webhookData.detailedErrorCode || webhookData.errorContext?.detailedErrorCode || null,
        errorSource: webhookData.errorContext?.source || null,
        errorStage: webhookData.errorContext?.stage || null,
        errorDescription: webhookData.errorContext?.description || null,
        webhookReceivedAt: new Date(),
        webhookProcessed: true,
    });

    await bookingRepository.updateById(payment.bookingId, {
        paymentStatus: PAYMENT_STATUS.FAILED,
    });

    logger.warn('[PaymentService] Payment failed', {
        bookingId: payment.bookingId,
        merchantOrderId: payment.merchantOrderId,
        errorCode: webhookData.errorCode || webhookData.errorContext?.errorCode || null,
    });

    return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.ORDER_FAILED };
}

async function handleRefundSuccess(webhookData) {
    const payment = await paymentRepository.findByMerchantOrderId(webhookData.originalMerchantOrderId);
    if (!payment) {
        return { processed: false, event: PHONEPE_WEBHOOK_EVENTS.REFUND_COMPLETED };
    }

    if (payment.status === PAYMENT_TRANSACTION_STATUS.REFUNDED) {
        return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.REFUND_COMPLETED };
    }

    if (
        ![
            PAYMENT_TRANSACTION_STATUS.COMPLETED,
            PAYMENT_TRANSACTION_STATUS.REFUND_PENDING,
            PAYMENT_TRANSACTION_STATUS.REFUND_FAILED,
        ].includes(payment.status)
    ) {
        logIgnoredPaymentTransition(
            '[PaymentService] Ignoring refund success for incompatible payment state',
            payment,
            PAYMENT_TRANSACTION_STATUS.REFUNDED,
        );
        return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.REFUND_COMPLETED };
    }

    await paymentRepository.updateById(payment._id, {
        status: PAYMENT_TRANSACTION_STATUS.REFUNDED,
        refund: {
            ...(payment.refund || {}),
            merchantRefundId: webhookData.merchantRefundId || payment.refund?.merchantRefundId || null,
            gatewayRefundId: webhookData.refundId || payment.refund?.gatewayRefundId || null,
            status: 'completed',
            completedAt: new Date(),
            failureReason: null,
            manualResolutionRequired: false,
        },
        webhookReceivedAt: new Date(),
        webhookProcessed: true,
    });

    await bookingRepository.updateById(payment.bookingId, {
        paymentStatus: PAYMENT_STATUS.REFUNDED,
    });

    return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.REFUND_COMPLETED };
}

async function handleRefundFailure(webhookData) {
    const payment = await paymentRepository.findByMerchantOrderId(webhookData.originalMerchantOrderId);
    if (!payment) {
        return { processed: false, event: PHONEPE_WEBHOOK_EVENTS.REFUND_FAILED };
    }

    if (payment.status === PAYMENT_TRANSACTION_STATUS.REFUND_FAILED) {
        return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.REFUND_FAILED };
    }

    if (payment.status === PAYMENT_TRANSACTION_STATUS.REFUNDED) {
        logIgnoredPaymentTransition(
            '[PaymentService] Ignoring refund failure after refund completion',
            payment,
            PAYMENT_TRANSACTION_STATUS.REFUND_FAILED,
        );
        return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.REFUND_FAILED };
    }

    if (
        ![
            PAYMENT_TRANSACTION_STATUS.COMPLETED,
            PAYMENT_TRANSACTION_STATUS.REFUND_PENDING,
        ].includes(payment.status)
    ) {
        logIgnoredPaymentTransition(
            '[PaymentService] Ignoring refund failure for incompatible payment state',
            payment,
            PAYMENT_TRANSACTION_STATUS.REFUND_FAILED,
        );
        return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.REFUND_FAILED };
    }

    await paymentRepository.updateById(payment._id, {
        status: PAYMENT_TRANSACTION_STATUS.REFUND_FAILED,
        refund: {
            ...(payment.refund || {}),
            merchantRefundId: webhookData.merchantRefundId || payment.refund?.merchantRefundId || null,
            gatewayRefundId: webhookData.refundId || payment.refund?.gatewayRefundId || null,
            status: 'failed',
            failureReason: webhookData.detailedErrorCode || webhookData.errorCode || 'Refund failed at payment gateway',
            manualResolutionRequired: true,
        },
        errorCode: webhookData.errorCode || null,
        detailedErrorCode: webhookData.detailedErrorCode || null,
        webhookReceivedAt: new Date(),
        webhookProcessed: true,
    });

    await bookingRepository.updateById(payment.bookingId, {
        paymentStatus: PAYMENT_STATUS.REFUND_FAILED,
    });

    return { processed: true, event: PHONEPE_WEBHOOK_EVENTS.REFUND_FAILED };
}

export const initiateRefund = async (bookingId, reason, actor = null) => {
    const payment = await paymentRepository.findCompletedByBookingId(bookingId);
    if (!payment) {
        throw new NotFoundError('Completed payment for this booking');
    }

    if (![PAYMENT_TRANSACTION_STATUS.COMPLETED, PAYMENT_TRANSACTION_STATUS.REFUND_FAILED].includes(payment.status)) {
        throw new BadRequestError('Can only refund completed payments');
    }

    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
        throw new NotFoundError('Booking');
    }

    await assertRefundPermission(actor, booking);

    if (
        booking.payoutStatus
        && !['not_initiated', 'failed', 'reversed'].includes(booking.payoutStatus)
    ) {
        throw new BadRequestError('Refund window has closed. Please request a manual refund.');
    }

    const refundType = REFUND_TYPE.CANCELLATION;
    const refundFeeInPaisa = getRefundFeeInPaisa(payment);
    const platformFeeInPaisa = toPositivePaisa(payment.settlement?.platformFee || 0);
    const grossAmountInPaisa = getRefundGrossAmountInPaisa(payment, booking, platformFeeInPaisa);
    const refundAmountInPaisa = grossAmountInPaisa - refundFeeInPaisa;

    if (refundAmountInPaisa <= 0) {
        throw new BadRequestError('Refund amount after fee deduction is zero or negative');
    }

    const merchantRefundId = generateMerchantRefundId({
        merchantOrderId: payment.merchantOrderId,
        bookingId,
    });
    let refundResponse;

    try {
        refundResponse = await phonePeAdapter.initiateRefund({
            merchantRefundId,
            originalMerchantOrderId: payment.merchantOrderId,
            amount: refundAmountInPaisa,
        });
    } catch (error) {
        const failedRefund = createRefundRecord({
            merchantRefundId,
            amount: refundAmountInPaisa,
            refundFee: refundFeeInPaisa,
            platformFee: platformFeeInPaisa,
            status: 'failed',
            type: refundType,
            reason,
            failureReason: error.message,
            manualResolutionRequired: true,
        });

        await paymentRepository.updateById(payment._id, {
            status: PAYMENT_TRANSACTION_STATUS.REFUND_FAILED,
            refundFee: refundFeeInPaisa,
            refund: failedRefund,
            errorDescription: error.message,
        });

        await bookingRepository.updateById(bookingId, {
            paymentStatus: PAYMENT_STATUS.REFUND_FAILED,
        });

        logger.error('[PaymentService] Refund initiation failed', {
            bookingId,
            merchantRefundId,
            refundType,
            error: error.message,
        });

        throw new PaymentError(REFUND_MANUAL_MESSAGE, error.code || null, error.message);
    }

    const refundRecord = createRefundRecord({
        merchantRefundId,
        refundResponse,
        amount: refundAmountInPaisa,
        refundFee: refundFeeInPaisa,
        platformFee: platformFeeInPaisa,
        status: 'pending',
        type: refundType,
        reason,
    });

    await paymentRepository.updateById(payment._id, {
        status: PAYMENT_TRANSACTION_STATUS.REFUND_PENDING,
        refundFee: refundFeeInPaisa,
        refund: refundRecord,
    });

    await bookingRepository.updateById(bookingId, {
        paymentStatus: PAYMENT_STATUS.REFUND_PENDING,
    });

    logger.info('[PaymentService] Refund initiated', {
        bookingId,
        merchantRefundId,
        refundType,
        refundAmount: refundAmountInPaisa / 100,
        deductions: {
            refundFee: refundFeeInPaisa / 100,
            platformFee: platformFeeInPaisa / 100,
        },
    });

    return {
        merchantRefundId,
        refundId: refundResponse.refundId,
        state: refundResponse.state,
        refundAmount: refundAmountInPaisa / 100,
        refundType,
        deductions: {
            refundFee: refundFeeInPaisa / 100,
            platformFee: platformFeeInPaisa / 100,
        },
    };
};

export const pollPendingPayments = async () => {
    const now = Date.now();
    const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const expiresBefore = new Date(now);
    const fallbackCreatedBefore = new Date(now - config.payment.sessionExpirySeconds * 1000);

    const pendingPayments = await paymentRepository.findStalePayments(
        thirtyMinutesAgo,
        twentyFourHoursAgo,
        config.payment.maxPollAttempts,
    );

    logger.info('[PaymentService] Polling pending payments', {
        count: pendingPayments.length,
    });

    for (const payment of pendingPayments) {
        try {
            const status = await phonePeAdapter.getOrderStatus(payment.merchantOrderId);

            await paymentRepository.updateById(payment._id, {
                pollAttempts: (payment.pollAttempts || 0) + 1,
                lastPollAt: new Date(),
                statusPolledAt: new Date(),
            });

            if (status.state === 'COMPLETED') {
                await handlePaymentSuccess({
                    merchantOrderId: payment.merchantOrderId,
                    state: status.state,
                    amount: status.amount,
                    paymentDetails: status.paymentDetails,
                    errorCode: status.errorCode,
                    detailedErrorCode: status.detailedErrorCode,
                    errorContext: status.errorContext,
                });
            } else if (status.state === 'FAILED') {
                await handlePaymentFailure({
                    merchantOrderId: payment.merchantOrderId,
                    state: status.state,
                    amount: status.amount,
                    paymentDetails: status.paymentDetails,
                    errorCode: status.errorCode,
                    detailedErrorCode: status.detailedErrorCode,
                    errorContext: status.errorContext,
                });
            }
        } catch (error) {
            logger.error('[PaymentService] Pending payment poll failed', {
                paymentId: payment._id,
                merchantOrderId: payment.merchantOrderId,
                error: error.message,
            });
        }
    }

    const expirablePayments = await paymentRepository.findExpirablePendingPayments(
        expiresBefore,
        fallbackCreatedBefore,
    );
    for (const payment of expirablePayments) {
        await paymentRepository.updateById(payment._id, {
            status: PAYMENT_TRANSACTION_STATUS.EXPIRED,
        });
        await bookingRepository.updateById(payment.bookingId, {
            paymentStatus: PAYMENT_STATUS.FAILED,
        });
    }

    if (expirablePayments.length > 0) {
        logger.info('[PaymentService] Expired stale payments', {
            count: expirablePayments.length,
        });
    }
};
