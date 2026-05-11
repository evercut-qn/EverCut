import * as onboardingService from '../services/onboarding.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { getValidatedRequestData } from '../utils/request-validation.utils.js';

/**
 * Onboarding controller - handles first-time profile creation for both roles.
 */
export const createCustomerOnboarding = async (req, res) => {
    const { phoneNumber } = req.onboardingContext;
    const body = getValidatedRequestData(req, 'body');
    const result = await onboardingService.createCustomerOnboarding(phoneNumber, body, req.file);
    const { user, profile, tokens } = result;

    return res.status(201).json(
        ApiResponse.success(
            {
                user,
                profile,
                tokenType: tokens.tokenType,
                accessToken: tokens.accessToken,
                expiresIn: tokens.expiresIn,
                refreshToken: tokens.refreshToken,
                refreshExpiresIn: tokens.refreshExpiresIn,
            },
            'Customer created',
        ),
    );
};

export const createBarberOnboarding = async (req, res) => {
    const { phoneNumber } = req.onboardingContext;
    const body = getValidatedRequestData(req, 'body');
    const result = await onboardingService.createBarberOnboarding(phoneNumber, body, req.file);
    const { user, shop, tokens } = result;

    return res.status(201).json(
        ApiResponse.success(
            {
                user,
                shop,
                tokenType: tokens.tokenType,
                accessToken: tokens.accessToken,
                expiresIn: tokens.expiresIn,
                refreshToken: tokens.refreshToken,
                refreshExpiresIn: tokens.refreshExpiresIn,
            },
            'Barber profile created',
        ),
    );
};
