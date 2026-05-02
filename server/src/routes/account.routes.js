import { Router } from 'express';
import authenticate from '../middleware/authenticate.middleware.js';
import { otpRateLimiter } from '../middleware/otp-rate-limiter.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import * as accountController from '../controllers/account.controller.js';
import { OTP_RATE_LIMIT } from '../utils/constants.js';
import {
    sendPhoneOtpSchema,
    verifyPhoneOtpSchema,
} from '../validators/phone.validator.js';

const router = Router();

// All account routes require authentication
router.use(authenticate);

// Phone number update endpoints with OTP verification
router.post(
    '/phone/send-otp',
    otpRateLimiter({
        windowMs: OTP_RATE_LIMIT.windowMs,
        max: OTP_RATE_LIMIT.maxSendPerPhone,
        keyPrefix: 'phone-update-send',
        keySource: 'body.newMobile',
    }),
    validate(sendPhoneOtpSchema, 'body'),
    accountController.sendPhoneUpdateOtp,
);

router.post(
    '/phone/verify-otp',
    otpRateLimiter({
        windowMs: OTP_RATE_LIMIT.windowMs,
        max: OTP_RATE_LIMIT.maxVerifyPerPhone,
        keyPrefix: 'phone-update-verify',
        keySource: 'body.newMobile',
    }),
    validate(verifyPhoneOtpSchema, 'body'),
    accountController.verifyPhoneUpdateOtp,
);

export default router;
