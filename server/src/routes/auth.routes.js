import { Router } from 'express';
import authenticate from '../middleware/authenticate.middleware.js';
import { otpRateLimiter } from '../middleware/otp-rate-limiter.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as authController from '../controllers/auth.controller.js';
import config from '../config/index.js';
import {
    refreshTokenSchema,
    resendOtpSchema,
    sendOtpSchema,
    verifyOtpSchema,
} from '../validators/auth.validator.js';

const router = Router();

// ============================================================================
// Public Routes (no authentication required)
// ============================================================================

// OTP endpoints
router.post(
    '/otp/send',
    otpRateLimiter({
        windowMs: config.security.otpRateLimit.windowMs,
        max: config.security.otpRateLimit.maxSendPerIp,
        keyPrefix: 'otp-send-ip',
        keySource: 'ip',
    }),
    otpRateLimiter({
        windowMs: config.security.otpRateLimit.windowMs,
        max: config.security.otpRateLimit.maxSendPerPhone,
        keyPrefix: 'otp-send-phone',
        keySource: 'body.mobile',
    }),
    validate(sendOtpSchema, 'body'),
    authController.sendOtp,
);

router.post(
    '/otp/verify',
    otpRateLimiter({
        windowMs: config.security.otpRateLimit.windowMs,
        max: config.security.otpRateLimit.maxVerifyPerPhone,
        keyPrefix: 'otp-verify',
        keySource: 'body.mobile',
    }),
    validate(verifyOtpSchema, 'body'),
    authController.verifyOtp,
);

router.post(
    '/otp/resend',
    otpRateLimiter({
        windowMs: config.security.otpRateLimit.windowMs,
        max: config.security.otpRateLimit.maxSendPerPhone,
        keyPrefix: 'otp-resend',
        keySource: 'body.mobile',
    }),
    validate(resendOtpSchema, 'body'),
    authController.resendOtp,
);

// Token refresh endpoint (public - uses refresh token)
router.post('/token/refresh', validate(refreshTokenSchema, 'body'), authController.refreshToken);

// ============================================================================
// Protected Routes (authentication required)
// ============================================================================

// Logout endpoint
router.post('/logout', authenticate, authController.logout);

export default router;
