import crypto from 'crypto';

import config from '../config/index.js';
import customerRepository from '../repositories/customer.repository.js';
import bookingRepository from '../repositories/booking.repository.js';
import paymentRepository from '../repositories/payment.repository.js';
import serviceRepository from '../repositories/service.repository.js';
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

const generateMerchantRefundId = (merchantOrderId) => `RF-${merchantOrderId}-${Date.now()}`;

const sumServiceAmounts = (services = []) => services.reduce(
    (sum, service) => sum + (getEffectiveServicePrice(service) ?? 0),
    0,
);

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

    await paymentRepository.updateById(payment._id, {
        status: PAYMENT_TRANSACTION_STATUS.REFUNDED,
        refund: {
            ...(payment.refund || {}),
            status: 'completed',
            completedAt: new Date(),
            gatewayRefundId: webhookData.refundId || payment.refund?.gatewayRefundId || null,
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

    await paymentRepository.updateById(payment._id, {
        status: PAYMENT_TRANSACTION_STATUS.REFUND_FAILED,
        refund: {
            ...(payment.refund || {}),
            status: 'failed',
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

export const initiateRefund = async (bookingId, reason) => {
    const payment = await paymentRepository.findCompletedByBookingId(bookingId);
    if (!payment) {
        throw new NotFoundError('Completed payment for this booking');
    }

    if (payment.status !== PAYMENT_TRANSACTION_STATUS.COMPLETED) {
        throw new BadRequestError('Can only refund completed payments');
    }

    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
        throw new NotFoundError('Booking');
    }

    if (
        booking.payoutStatus
        && !['not_initiated', 'failed', 'reversed'].includes(booking.payoutStatus)
    ) {
        throw new BadRequestError(
            'Refund not allowed — payout has already been initiated. Contact admin for manual resolution.',
        );
    }

    const refundFeeInPaisa = (
        payment.settlement?.isBundle ? REFUND_FEES.BUNDLE : REFUND_FEES.SINGLE_SERVICE
    ) * 100;
    const platformFeeInPaisa = payment.settlement?.platformFee || 0;
    const refundAmountInPaisa = payment.amount - refundFeeInPaisa - platformFeeInPaisa;

    if (refundAmountInPaisa <= 0) {
        throw new BadRequestError('Refund amount after fee deduction is zero or negative');
    }

    const merchantRefundId = generateMerchantRefundId(payment.merchantOrderId);
    const refundResponse = await phonePeAdapter.initiateRefund({
        merchantRefundId,
        originalMerchantOrderId: payment.merchantOrderId,
        amount: refundAmountInPaisa,
    });

    await paymentRepository.updateById(payment._id, {
        status: PAYMENT_TRANSACTION_STATUS.REFUND_PENDING,
        refundFee: refundFeeInPaisa,
        refund: {
            merchantRefundId,
            gatewayRefundId: refundResponse.refundId,
            amount: refundAmountInPaisa,
            status: 'pending',
            initiatedAt: new Date(),
            completedAt: null,
            reason,
        },
    });

    await bookingRepository.updateById(bookingId, {
        paymentStatus: PAYMENT_STATUS.REFUND_PENDING,
    });

    logger.info('[PaymentService] Refund initiated', {
        bookingId,
        merchantRefundId,
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

    const expirablePayments = await paymentRepository.findExpirablePendingPayments(twentyFourHoursAgo);
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
