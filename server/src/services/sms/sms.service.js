import config from '../../config/index.js';
import * as msg91Provider from './providers/msg91.provider.js';
import * as startMessagingProvider from './providers/start-messaging.provider.js';
import { verifyStoredOtp } from './otp-store.service.js';

/**
 * SMS Service — provider factory / orchestrator.
 *
 * This is the only file that knows both SMS providers exist. It exposes the
 * exact same `sendOtp` / `verifyOtp` / `resendOtp` signatures the old
 * `sms-provider.service.js` did, so nothing downstream (`otp.service.js`,
 * `phone-update.service.js`) needs to know which provider is active.
 *
 * - MSG91: generates + verifies OTPs remotely (unchanged, "keep MSG91 intact").
 * - StartMessaging: only sends SMS — OTP generation/verification is handled
 *   locally via `otp-store.service.js`.
 *
 * Switch providers via the `SMS_PROVIDER` env var. No code change required
 * to roll back — see `config/index.js` (`smsProvider`).
 */

const provider = config.smsProvider; // 'msg91' | 'startmessaging'

/**
 * Send an OTP to a mobile number using the currently configured provider.
 * @param {string} mobile
 * @returns {Promise<{ success: boolean, requestId: string|null }>}
 */
export const sendOtp = async (mobile) => {
    if (provider === 'startmessaging') {
        return startMessagingProvider.sendOtp(mobile);
    }
    return msg91Provider.sendOtp(mobile);
};

/**
 * Verify an OTP for a mobile number using the currently configured provider.
 * MSG91 verifies remotely; StartMessaging verifies against the local OTP store.
 * @param {string} mobile
 * @param {string} otp
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const verifyOtp = async (mobile, otp) => {
    if (provider === 'startmessaging') {
        return verifyStoredOtp(mobile, otp);
    }
    return msg91Provider.verifyOtp(mobile, otp);
};

/**
 * Resend an OTP via the currently configured provider.
 * @param {string} mobile
 * @param {'text'|'voice'} retryType
 * @returns {Promise<{ success: boolean }>}
 */
export const resendOtp = async (mobile, retryType) => {
    if (provider === 'startmessaging') {
        return startMessagingProvider.resendOtp(mobile, retryType);
    }
    return msg91Provider.resendOtp(mobile, retryType);
};
