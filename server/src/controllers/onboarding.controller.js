import * as onboardingService from '../services/onboarding.service.js';
import { ApiResponse } from '../utils/api-response.js';

/**
 * Onboarding controller - handles first-time profile creation for both roles.
 */
export const createCustomerOnboarding = async (req, res) => {
    const { phoneNumber } = req.onboardingContext;
    const result = await onboardingService.createCustomerOnboarding(phoneNumber, req.body, req.file);
    const { user, profile, tokens } = result;

    return res.status(201).json(
        ApiResponse.success(
            {
                user,
                profile,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
            'Customer profile created',
        ),
    );
};

export const createBarberOnboarding = async (req, res) => {
    const { phoneNumber } = req.onboardingContext;
    const result = await onboardingService.createBarberOnboarding(phoneNumber, req.body, req.files);
    const { user, shop, photos, tokens } = result;

    return res.status(201).json(
        ApiResponse.success(
            {
                user,
                shop,
                photos,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
            'Barber profile created',
        ),
    );
};
