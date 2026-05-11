import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import customerRepository from '../repositories/customer.repository.js';
import photoRepository from '../repositories/photo.repository.js';
import shopRepository from '../repositories/shop.repository.js';
import userRepository from '../repositories/user.repository.js';
import { UnauthorizedError } from '../utils/api-error.js';
import { serializeBarberProfile } from '../utils/barber-profile.utils.js';
import { ROLES, TOKEN_TYPE } from '../utils/constants.js';
import logger, { maskPhoneNumber } from '../utils/logger.js';
import { serializeCustomerProfile } from '../serializers/customer.serializer.js';
import { serializeUser } from '../serializers/user.serializer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a jwt expiry string like "15m", "180d", "3600s" into seconds.
 * Falls back to 900 (15 min) if the format is unrecognised.
 */
const parseExpiryToSeconds = (expiry) => {
    if (typeof expiry === 'number') return expiry;
    const match = String(expiry).match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * multipliers[match[2]];
};

const JWT_ISS = 'evercut-api';
const JWT_AUD = 'evercut-mobile';

const normalizePhoneNumber = (phoneNumber) => {
    const value = String(phoneNumber ?? '').trim();
    if (!value) return value;

    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length === 10) return `+91${digitsOnly}`;
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) return `+${digitsOnly}`;
    if (value.startsWith('+')) return value;

    return value;
};

const assertAccountIsActive = (user) => {
    if (!user || user.isActive === false || user.deletedAt) {
        throw new UnauthorizedError('Account is inactive or deleted');
    }
};

const loadUserProfile = async (user) => {
    if (!user) return null;

    if (user.roleType === ROLES.CUSTOMER) {
        const customer = await customerRepository.findByUserId(user._id);
        return serializeCustomerProfile(customer);
    }

    if (user.roleType === ROLES.BARBER) {
        const shop = await shopRepository.findByOwnerId(user._id);
        if (!shop) return null;

        const photos = await photoRepository.findByShopId(shop._id, {});
        return serializeBarberProfile(shop, user, { photos });
    }

    return null;
};

/** Generate a short-lived onboarding token (signed with dedicated onboarding secret). */
export const generateOnboardingToken = (phoneNumber) => jwt.sign(
    {
        sub: phoneNumber,
        type: TOKEN_TYPE.ONBOARDING,
        iss: JWT_ISS,
        aud: JWT_AUD,
    },
    config.jwt.onboardingSecret,
    { expiresIn: config.jwt.onboardingExpiry },
);

/** Verify an onboarding token and return decoded payload. */
export const verifyOnboardingToken = (token) => {
    try {
        const decoded = jwt.verify(token, config.jwt.onboardingSecret, {
            issuer: JWT_ISS,
            audience: JWT_AUD,
        });
        if (decoded.type !== TOKEN_TYPE.ONBOARDING) {
            throw new UnauthorizedError('Onboarding token required');
        }
        return decoded;
    } catch (err) {
        if (err instanceof UnauthorizedError) throw err;
        if (err instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Onboarding token has expired. Please verify your OTP again.');
        }
        if (err instanceof jwt.JsonWebTokenError) {
            logger.warn('Tampered onboarding token detected', { message: err.message });
            throw new UnauthorizedError('Invalid onboarding token.');
        }
        throw err;
    }
};

/** Generate a pair of access + refresh tokens with full metadata. */
export const generateTokenPair = (userId, roleType) => {
    const expiresIn = parseExpiryToSeconds(config.jwt.accessExpiry);
    const refreshExpiresIn = parseExpiryToSeconds(config.jwt.refreshExpiry);

    const accessToken = jwt.sign(
        {
            sub: userId.toString(),
            role: roleType,
            type: TOKEN_TYPE.ACCESS,
            jti: crypto.randomUUID(),
            iss: JWT_ISS,
            aud: JWT_AUD,
        },
        config.jwt.accessSecret,
        { expiresIn: config.jwt.accessExpiry },
    );

    const refreshToken = jwt.sign(
        {
            sub: userId.toString(),
            type: TOKEN_TYPE.REFRESH,
            jti: crypto.randomUUID(),
            iss: JWT_ISS,
            aud: JWT_AUD,
        },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiry },
    );

    return {
        tokenType: 'Bearer',
        accessToken,
        expiresIn,
        refreshToken,
        refreshExpiresIn,
    };
};

/** Verify a bearer token signed with the access secret. */
export const verifyBearerToken = (token) => {
    try {
        return jwt.verify(token, config.jwt.accessSecret, {
            issuer: JWT_ISS,
            audience: JWT_AUD,
        });
    } catch (err) {
        if (err instanceof UnauthorizedError) throw err;
        if (err instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Access token has expired. Please refresh your session.');
        }
        if (err instanceof jwt.JsonWebTokenError) {
            logger.warn('Tampered access token detected', { message: err.message });
            throw new UnauthorizedError('Invalid access token.');
        }
        throw err;
    }
};

/** Verify a refresh token and return decoded payload. */
export const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, config.jwt.refreshSecret, {
            issuer: JWT_ISS,
            audience: JWT_AUD,
        });
        if (decoded.type !== TOKEN_TYPE.REFRESH) {
            throw new UnauthorizedError('Invalid token type');
        }
        return decoded;
    } catch (err) {
        if (err instanceof UnauthorizedError) throw err;
        if (err instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Refresh token has expired. Please sign in again.');
        }
        if (err instanceof jwt.JsonWebTokenError) {
            logger.warn('Tampered refresh token detected', { message: err.message });
            throw new UnauthorizedError('Invalid refresh token.');
        }
        throw err;
    }
};

/** Hash a refresh token for secure storage. */
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Resolve user session after OTP verification.
 *
 * Returning users receive access/refresh tokens.
 * New users receive a short-lived onboarding token carrying only the verified phone number.
 */
export const resolveOtpSession = async (phoneNumber) => {
    const formattedPhoneNumber = normalizePhoneNumber(phoneNumber);
    const existingUser = await userRepository.findByPhone(formattedPhoneNumber);

    if (existingUser) {
        assertAccountIsActive(existingUser);

        const tokens = generateTokenPair(existingUser._id, existingUser.roleType);
        const refreshHash = hashToken(tokens.refreshToken);

        // Atomic single write: update lastLoginAt and refreshTokenHash together
        const authenticatedUser = await userRepository.updateById(existingUser._id, {
            lastLoginAt: new Date(),
            refreshTokenHash: refreshHash,
        });

        const user = authenticatedUser || existingUser;
        const profile = await loadUserProfile(user);

        return {
            isNewUser: false,
            user: serializeUser(user),
            profile,
            tokens,
        };
    }

    const onboardingToken = generateOnboardingToken(formattedPhoneNumber);

    logger.info('OTP verified for new user - issued onboarding token', {
        phone: maskPhoneNumber(formattedPhoneNumber),
    });

    return {
        isNewUser: true,
        onboardingToken,
        onboardingExpiresIn: parseExpiryToSeconds(config.jwt.onboardingExpiry),
    };
};

/** Refresh an access token using a valid refresh token. */
export const refreshAccessToken = async (refreshToken) => {
    const decoded = verifyRefreshToken(refreshToken);
    const userId = decoded.sub;
    const user = await userRepository.findByIdWithRefreshHash(userId);

    assertAccountIsActive(user);

    const incomingHash = hashToken(refreshToken);
    if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
        logger.warn('Refresh token mismatch - possible token theft', { userId });
        await userRepository.updateById(userId, { refreshTokenHash: null });
        throw new UnauthorizedError('Session invalidated. Please sign in again.');
    }

    const tokens = generateTokenPair(user._id, user.roleType);
    const newRefreshHash = hashToken(tokens.refreshToken);
    await userRepository.updateById(userId, { refreshTokenHash: newRefreshHash });

    // tokens already includes tokenType, expiresIn, refreshExpiresIn from generateTokenPair
    return tokens;
};

/** Invalidate refresh token (logout). */
export const revokeRefreshToken = async (userId) => {
    await userRepository.updateById(userId, { refreshTokenHash: null });
};
