import * as phoneUpdateService from '../services/phone-update.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { getValidatedRequestData } from '../utils/request-validation.utils.js';

/**
 * POST /account/phone/send-otp
 * Send OTP to new phone number for verification
 */
export const sendPhoneUpdateOtp = async (req, res) => {
    const { newMobile } = getValidatedRequestData(req, 'body');
    const result = await phoneUpdateService.sendPhoneUpdateOtp(req.user._id, newMobile);

    return res.status(200).json(
        ApiResponse.success(result, result.message),
    );
};

/**
 * POST /account/phone/verify-otp
 * Verify OTP and update phone number
 */
export const verifyPhoneUpdateOtp = async (req, res) => {
    const { newMobile, otp } = getValidatedRequestData(req, 'body');
    const result = await phoneUpdateService.verifyAndUpdatePhone(req.user._id, newMobile, otp);

    return res.status(200).json(
        ApiResponse.success(
            { phoneNumber: result.phoneNumber },
            result.message,
        ),
    );
};
