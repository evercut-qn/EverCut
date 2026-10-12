import crypto from 'node:crypto';
import config from '../config/index.js';
import startmessaging from '../config/startmessaging.config.js';
import msg91 from '../config/msg91.config.js';
import logger, { maskPhoneNumber } from '../utils/logger.js';
import { AppError } from '../utils/api-error.js';

/**
 * SMS Provider Service - abstracts SMS/OTP providers (StartMessaging & MSG91).
 */

/**
 * Generate a cryptographically random numeric OTP
 */
const generateNumericOtp = (length = 6) => {
    const min = 10 ** (length - 1);
    const max = 10 ** length;
    return crypto.randomInt(min, max).toString();
};

// In-memory store for tracking StartMessaging request IDs by normalized phone number
const pendingOtpRequests = new Map();

/**
 * Clean up expired OTP tracking entries
 */
const cleanupExpiredRequests = () => {
    const now = Date.now();
    for (const [phone, record] of pendingOtpRequests.entries()) {
        if (record.expiresAt && record.expiresAt < now) {
            pendingOtpRequests.delete(phone);
        }
    }
};

/**
 * Normalize mobile number to 10 digits
 */
const to10Digits = (mobile) => {
    const digits = String(mobile ?? '').replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
};

/**
 * Normalize mobile number to E.164 (+91XXXXXXXXXX)
 */
const toE164 = (mobile) => {
    const digits = to10Digits(mobile);
    return `+91${digits}`;
};

/**
 * Determine active SMS provider
 */
const isStartMessagingActive = () => {
    if (config.smsProvider === 'msg91') return false;
    return Boolean(config.smsProvider === 'startmessaging' || startmessaging.apiKey);
};

const isTestMode = () => {
    if (process.env.STARTMESSAGING_TEST_MODE === 'false') return false;
    if (process.env.STARTMESSAGING_TEST_MODE === 'true') return true;
    return startmessaging.testMode;
};

/**
 * Send OTP via StartMessaging
 */
const sendViaStartMessaging = async (mobile) => {
    if (isTestMode()) {
        if (process.env.NODE_ENV === 'production' && !startmessaging.apiKey) {
            logger.error('CRITICAL: StartMessaging test mode is enabled in production without API key!');
            throw new AppError('Configuration error', 500);
        }

        logger.info('StartMessaging test mode - OTP send bypassed', {
            mobile: maskPhoneNumber(mobile),
            testOtp: startmessaging.testOtp,
            appName: startmessaging.appName,
            expiry: startmessaging.otpExpiry,
        });
        return { success: true, requestId: 'test-mode' };
    }

    const generatedOtp = generateNumericOtp(startmessaging.otpLength || 6);
    const e164Mobile = toE164(mobile);
    const payload = {
        phoneNumber: e164Mobile,
        templateId: startmessaging.templateId,
        variables: {
            otp: generatedOtp,
            OTP: generatedOtp,
            appName: startmessaging.appName,
            expiry: String(startmessaging.otpExpiry),
        },
    };

    const response = await fetch(startmessaging.endpoints.sendOtp, {
        method: 'POST',
        headers: startmessaging.headers,
        body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && (data.success || data.statusCode === 201 || data.requestId)) {
        const requestId = data.data?.otpRequestId || data.requestId || data.data?.messageId;
        cleanupExpiredRequests();
        pendingOtpRequests.set(to10Digits(mobile), {
            otp: generatedOtp,
            requestId,
            attempts: 0,
            expiresAt: Date.now() + (startmessaging.otpExpiry * 60 * 1000),
        });

        logger.info('StartMessaging OTP sent successfully', {
            mobile: maskPhoneNumber(mobile),
            requestId,
            appName: startmessaging.appName,
            expiry: startmessaging.otpExpiry,
        });
        return { success: true, requestId };
    }

    logger.warn('StartMessaging OTP send failed', {
        mobile: maskPhoneNumber(mobile),
        response: data,
    });
    return { success: false, requestId: null };
};

/**
 * Send OTP via MSG91
 */
const sendViaMsg91 = async (mobile) => {
    if (msg91.testMode) {
        if (process.env.NODE_ENV === 'production') {
            logger.error('CRITICAL: MSG91 test mode is enabled in production!');
            throw new AppError('Configuration error', 500);
        }

        logger.info('MSG91 test mode - OTP send bypassed', {
            mobile: maskPhoneNumber(mobile),
            testOtp: msg91.testOtp,
        });
        return { success: true, requestId: 'test-mode' };
    }

    const response = await fetch(msg91.endpoints.sendOtp, {
        method: 'POST',
        headers: msg91.headers,
        body: JSON.stringify({
            template_id: msg91.otpTemplateId,
            mobile: `91${to10Digits(mobile)}`,
            otp_length: msg91.otpLength,
            otp_expiry: msg91.otpExpiry,
            appName: config.appName,
            expiry: msg91.otpExpiry,
        }),
    });

    const data = await response.json();

    if (data.type === 'success') {
        logger.info('MSG91 OTP sent successfully', {
            mobile: maskPhoneNumber(mobile),
            requestId: data.request_id,
        });
        return { success: true, requestId: data.request_id };
    }

    logger.warn('MSG91 OTP send failed', {
        mobile: maskPhoneNumber(mobile),
        response: data,
    });
    return { success: false, requestId: null };
};

/**
 * Send OTP to a mobile number
 * @param {string} mobile - 10-digit Indian mobile number
 * @returns {Promise<{ success: boolean, requestId: string|null }>}
 */
export const sendOtp = async (mobile) => {
    try {
        if (isStartMessagingActive()) {
            return await sendViaStartMessaging(mobile);
        }
        return await sendViaMsg91(mobile);
    } catch (err) {
        if (err instanceof AppError) throw err;
        logger.error('SMS API error (sendOtp)', { error: err.message });
        throw new AppError('SMS service unavailable. Please try again later.', 503);
    }
};

/**
 * Verify OTP via StartMessaging
 */
const verifyViaStartMessaging = async (mobile, otp) => {
    if (isTestMode()) {
        const isValid = otp === startmessaging.testOtp;
        logger.info('StartMessaging test mode - OTP verify bypassed', {
            mobile: maskPhoneNumber(mobile),
            valid: isValid,
        });
        return {
            success: isValid,
            message: isValid ? 'OTP verified (test mode)' : 'Invalid OTP (test mode)',
        };
    }

    const phoneKey = to10Digits(mobile);
    const pending = pendingOtpRequests.get(phoneKey);

    if (!pending) {
        logger.warn('No pending OTP request found for verification', {
            mobile: maskPhoneNumber(mobile),
        });
        return {
            success: false,
            message: 'Invalid or expired OTP. Please request a new code.',
        };
    }

    if (pending.expiresAt && Date.now() > pending.expiresAt) {
        pendingOtpRequests.delete(phoneKey);
        return {
            success: false,
            message: 'OTP has expired. Please request a new code.',
        };
    }

    const enteredOtp = String(otp ?? '').trim();
    const isDirectMatch = pending.otp && pending.otp === enteredOtp;

    if (isDirectMatch) {
        pendingOtpRequests.delete(phoneKey);
        logger.info('OTP verified successfully', {
            mobile: maskPhoneNumber(mobile),
        });
        return {
            success: true,
            message: 'OTP verified successfully',
        };
    }

    const requestId = pending.requestId;
    if (requestId && requestId !== 'test-mode') {
        try {
            const response = await fetch(startmessaging.endpoints.verifyOtp, {
                method: 'POST',
                headers: startmessaging.headers,
                body: JSON.stringify({
                    requestId,
                    otpRequestId: requestId,
                    code: enteredOtp,
                    otpCode: enteredOtp,
                }),
            });

            const data = await response.json();
            const isSuccess = response.ok && (data.success === true || data.statusCode === 200 || data.type === 'success');

            if (isSuccess) {
                pendingOtpRequests.delete(phoneKey);
                return {
                    success: true,
                    message: data.message || 'OTP verified',
                };
            }
        } catch (err) {
            logger.warn('StartMessaging remote verify API call error', { error: err.message });
        }
    }

    pending.attempts = (pending.attempts || 0) + 1;
    if (pending.attempts >= 5) {
        pendingOtpRequests.delete(phoneKey);
        return {
            success: false,
            message: 'Too many invalid attempts. Please request a new OTP.',
        };
    }

    return {
        success: false,
        message: 'Invalid OTP',
    };
};

/**
 * Verify OTP via MSG91
 */
const verifyViaMsg91 = async (mobile, otp) => {
    if (msg91.testMode) {
        const isValid = otp === msg91.testOtp;
        logger.info('MSG91 test mode - OTP verify bypassed', {
            mobile: maskPhoneNumber(mobile),
            valid: isValid,
        });
        return {
            success: isValid,
            message: isValid ? 'OTP verified (test mode)' : 'Invalid OTP (test mode)',
        };
    }

    const url = `${msg91.endpoints.verifyOtp}?mobile=91${to10Digits(mobile)}&otp=${otp}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: { authkey: msg91.authKey },
    });

    const data = await response.json();
    return {
        success: data.type === 'success',
        message: data.message || (data.type === 'success' ? 'OTP verified' : 'Invalid or expired OTP'),
    };
};

/**
 * Verify OTP for a mobile number
 * @param {string} mobile - 10-digit Indian mobile number
 * @param {string} otp    - user-entered OTP
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const verifyOtp = async (mobile, otp) => {
    try {
        if (isStartMessagingActive()) {
            return await verifyViaStartMessaging(mobile, otp);
        }
        return await verifyViaMsg91(mobile, otp);
    } catch (err) {
        if (err instanceof AppError) throw err;
        logger.error('SMS API error (verifyOtp)', { error: err.message });
        throw new AppError('SMS service unavailable. Please try again later.', 503);
    }
};

/**
 * Resend OTP via alternative channel
 * @param {string} mobile - 10-digit Indian mobile number
 * @param {'text'|'voice'} retryType - channel to retry on
 * @returns {Promise<{ success: boolean }>}
 */
export const resendOtp = async (mobile, retryType = 'text') => {
    if (isStartMessagingActive()) {
        const sendResult = await sendOtp(mobile);
        return { success: sendResult.success };
    }

    if (msg91.testMode) {
        logger.info('MSG91 test mode - OTP resend bypassed', {
            mobile: maskPhoneNumber(mobile),
        });
        return { success: true };
    }

    try {
        const response = await fetch(msg91.endpoints.resendOtp, {
            method: 'POST',
            headers: msg91.headers,
            body: JSON.stringify({
                mobile: `91${to10Digits(mobile)}`,
                retrytype: retryType,
            }),
        });

        const data = await response.json();
        return { success: data.type === 'success' };
    } catch (err) {
        logger.error('MSG91 API error (resendOtp)', { error: err.message });
        throw new AppError('SMS service unavailable. Please try again later.', 503);
    }
};

// Export internal helper for testing
export const _testing = {
    pendingOtpRequests,
    to10Digits,
    toE164,
};
