// import Joi from 'joi';
// import config from '../config/index.js';

// const OTP_DIGIT_PATTERN = new RegExp(`^\\d{${config.msg91.otpLength}}$`);

// /** Indian mobile number: exactly 10 digits, starting with 6-9. */
// const indianMobile = Joi.string()
//     .trim()
//     .pattern(/^[6-9]\d{9}$/)
//     .required()
//     .messages({
//         'string.empty': 'Mobile number is required',
//         'string.pattern.base': 'Mobile number must be a valid 10-digit Indian number',
//         'any.required': 'Mobile number is required',
//     });

// /** POST /auth/otp/send */
// export const sendOtpSchema = Joi.object({
//     mobile: indianMobile,
// });

// /** POST /auth/otp/verify */
// export const verifyOtpSchema = Joi.object({
//     mobile: indianMobile,
//     otp: Joi.string()
//         .trim()
//         .pattern(OTP_DIGIT_PATTERN)
//         .required()
//         .messages({
//             'string.empty': 'OTP is required',
//             'string.pattern.base': `OTP must be exactly ${config.msg91.otpLength} digits`,
//             'any.required': 'OTP is required',
//         }),
// });

// /** POST /auth/otp/resend */
// export const resendOtpSchema = Joi.object({
//     mobile: indianMobile,
//     retryType: Joi.string()
//         .trim()
//         .valid('text', 'voice')
//         .default('text')
//         .messages({
//             'any.only': 'retryType must be "text" or "voice"',
//         }),
// });

// /** POST /auth/token/refresh */
// export const refreshTokenSchema = Joi.object({
//     refreshToken: Joi.string()
//         .trim()
//         .required()
//         .messages({
//             'string.empty': 'Refresh token is required',
//             'any.required': 'Refresh token is required',
//         }),
// });


import Joi from 'joi';
import config from '../config/index.js';

// Provider-agnostic OTP length — works whether MSG91 (remote-verified) or
// StartMessaging (locally-verified via otp-store.service.js) is active.
const OTP_DIGIT_PATTERN = new RegExp(`^\\d{${config.otp.length}}$`);

/** Indian mobile number: exactly 10 digits, starting with 6-9. */
const indianMobile = Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
        'string.empty': 'Mobile number is required',
        'string.pattern.base': 'Mobile number must be a valid 10-digit Indian number',
        'any.required': 'Mobile number is required',
    });

/** POST /auth/otp/send */
export const sendOtpSchema = Joi.object({
    mobile: indianMobile,
});

/** POST /auth/otp/verify */
export const verifyOtpSchema = Joi.object({
    mobile: indianMobile,
    otp: Joi.string()
        .trim()
        .pattern(OTP_DIGIT_PATTERN)
        .required()
        .messages({
            'string.empty': 'OTP is required',
            'string.pattern.base': `OTP must be exactly ${config.otp.length} digits`,
            'any.required': 'OTP is required',
        }),
});

/** POST /auth/otp/resend */
export const resendOtpSchema = Joi.object({
    mobile: indianMobile,
    retryType: Joi.string()
        .trim()
        .valid('text', 'voice')
        .default('text')
        .messages({
            'any.only': 'retryType must be "text" or "voice"',
        }),
});

/** POST /auth/token/refresh */
export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string()
        .trim()
        .required()
        .messages({
            'string.empty': 'Refresh token is required',
            'any.required': 'Refresh token is required',
        }),
});
