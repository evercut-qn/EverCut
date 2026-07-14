import crypto from 'crypto';
import config from '../../config/index.js';

/**
 * Local OTP Store — provider-agnostic OTP generation, hashing, TTL, and
 * verification.
 *
 * Used only by providers that don't verify OTPs remotely themselves (e.g.
 * StartMessaging, which is a plain SMS sender). MSG91 continues to generate
 * and verify OTPs on its own servers and never touches this file.
 *
 * Dev-friendly in-memory store. Replace with Redis-backed storage before
 * running multiple backend instances behind a load balancer — same
 * single-instance caveat already documented in `otp-rate-limiter.middleware.js`.
 */
const store = new Map();

/** Hash an OTP before storing it — the plaintext OTP never touches disk/memory at rest. */
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

/** Cryptographically-secure random numeric OTP of the configured length. */
const generateOtp = (length) => {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    return String(crypto.randomInt(min, max + 1));
};

/**
 * Generate a fresh OTP for a mobile number, hash it, and store it with a TTL.
 * Returns the plaintext OTP so the caller can send it via SMS — this is the
 * only place the plaintext value ever exists outside of the SMS provider's
 * own request body.
 *
 * @param {string} mobile - 10-digit mobile number (used as the store key)
 * @returns {string} plaintext OTP to send via SMS
 */
export const issueOtp = (mobile) => {
    const otp = config.otp.testMode ? config.otp.testOtp : generateOtp(config.otp.length);

    store.set(mobile, {
        otpHash: hashOtp(otp),
        expiresAt: Date.now() + config.otp.expiryMinutes * 60 * 1000,
        attempts: 0,
    });

    return otp;
};

/**
 * Re-issue (overwrite) the OTP for a mobile number — used by resend flows.
 * Invalidates any previously issued OTP for that mobile.
 */
export const reissueOtp = (mobile) => issueOtp(mobile);

/**
 * Verify a user-entered OTP against the stored hash for a mobile number.
 * One-time use: a successful verification immediately deletes the entry.
 * Locks out further attempts once `config.otp.maxVerifyAttempts` is reached,
 * as defense-in-depth alongside the route-level rate limiter.
 *
 * @param {string} mobile
 * @param {string} otp - user-entered OTP
 * @returns {{ success: boolean, message: string }}
 */
export const verifyStoredOtp = (mobile, otp) => {
    const entry = store.get(mobile);

    if (!entry) {
        return { success: false, message: 'OTP expired or not requested' };
    }

    if (Date.now() > entry.expiresAt) {
        store.delete(mobile);
        return { success: false, message: 'OTP has expired' };
    }

    if (entry.attempts >= config.otp.maxVerifyAttempts) {
        store.delete(mobile);
        return { success: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
    }

    entry.attempts += 1;

    const providedHash = Buffer.from(hashOtp(otp));
    const storedHash = Buffer.from(entry.otpHash);

    // Buffers must be equal length for timingSafeEqual — both are fixed-length
    // sha256 hex digests here, but guard defensively anyway.
    const isMatch = providedHash.length === storedHash.length
        && crypto.timingSafeEqual(providedHash, storedHash);

    if (!isMatch) {
        return { success: false, message: 'Invalid OTP' };
    }

    store.delete(mobile); // one-time use
    return { success: true, message: 'OTP verified' };
};

/** Test/debug helper — clears the entire in-memory store. Not used in production code paths. */
export const _clearStoreForTests = () => store.clear();
