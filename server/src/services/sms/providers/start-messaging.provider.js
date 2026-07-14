import config from '../../../config/index.js';
import startMessaging from '../../../config/start-messaging.config.js';
import { issueOtp, reissueOtp } from '../otp-store.service.js';
import logger, { maskPhoneNumber } from '../../../utils/logger.js';
import { AppError } from '../../../utils/api-error.js';

/**
 * StartMessaging Provider.
 *
 * StartMessaging is a plain transactional-SMS sender — it has no concept of
 * "verify this OTP." Per the migration guide: OTP generation/verification
 * stays in our backend, StartMessaging only delivers the text message.
 *
 * OTP generation + storage: `services/sms/otp-store.service.js`
 * OTP verification:         `services/sms/sms.service.js` (routes to `verifyStoredOtp`)
 */

const buildRequestBody = (mobile, otp) => ({
    phoneNumber: `+91${mobile}`, // E.164, per the migration guide
    templateId: startMessaging.templateId,
    variables: { otp, appName: 'EverCut' },
});

const sendSms = async (mobile, otp) => {
    const response = await fetch(startMessaging.endpoints.sendSms, {
        method: 'POST',
        headers: startMessaging.headers,
        body: JSON.stringify(buildRequestBody(mobile, otp)),
    });

    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
};

/**
 * Generate + store a local OTP, then send it via StartMessaging SMS.
 * @param {string} mobile - 10-digit Indian mobile number (without country code)
 * @returns {Promise<{ success: boolean, requestId: string|null }>}
 */
export const sendOtp = async (mobile) => {
    const otp = issueOtp(mobile);

    if (config.otp.testMode) {
        logger.info('StartMessaging test mode - OTP send bypassed', {
            mobile: maskPhoneNumber(mobile),
            testOtp: config.otp.testOtp,
        });
        return { success: true, requestId: 'test-mode' };
    }

    try {
        const { ok, data } = await sendSms(mobile, otp);

        if (!ok) {
            logger.warn('StartMessaging OTP send failed', {
                mobile: maskPhoneNumber(mobile),
                status: data?.status ?? null,
            });
            return { success: false, requestId: null };
        }

        logger.info('OTP sent successfully', {
            provider: 'startmessaging',
            mobile: maskPhoneNumber(mobile),
            requestId: data?.requestId ?? null,
            messageId: data?.messageId ?? null,
        });

        return { success: true, requestId: data?.requestId ?? data?.messageId ?? null };
    } catch (err) {
        logger.error('StartMessaging API error (sendOtp)', { error: err.message });
        throw new AppError('SMS service unavailable. Please try again later.', 503);
    }
};

/**
 * Re-issue and resend the OTP. StartMessaging is SMS-only — a `voice` retry
 * is rejected rather than silently falling back, so callers get an explicit
 * error instead of a confusing "success" for a channel that was never used.
 * @param {string} mobile
 * @param {'text'|'voice'} retryType
 * @returns {Promise<{ success: boolean }>}
 */
export const resendOtp = async (mobile, retryType = 'text') => {
    if (retryType === 'voice') {
        throw new AppError('Voice OTP is not supported for this provider.', 400);
    }

    const otp = reissueOtp(mobile);

    if (config.otp.testMode) {
        logger.info('StartMessaging test mode - OTP resend bypassed', {
            mobile: maskPhoneNumber(mobile),
        });
        return { success: true };
    }

    try {
        const { ok, data } = await sendSms(mobile, otp);

        if (!ok) {
            logger.warn('StartMessaging OTP resend failed', {
                mobile: maskPhoneNumber(mobile),
                status: data?.status ?? null,
            });
        }

        return { success: ok };
    } catch (err) {
        logger.error('StartMessaging API error (resendOtp)', { error: err.message });
        throw new AppError('SMS service unavailable. Please try again later.', 503);
    }
};