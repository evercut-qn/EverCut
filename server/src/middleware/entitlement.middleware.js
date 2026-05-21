import barberRepository from '../repositories/barber.repository.js';
import entitlementService from '../services/subscription/entitlement.service.js';
import { ForbiddenError, NotFoundError } from '../utils/api-error.js';
import { MEDIA_PURPOSE, MEDIA_TYPE, ROLES } from '../utils/constants.js';

const resolveBarberId = async (userId) => {
    const barber = await barberRepository.findByUserId(userId);
    if (!barber) throw new NotFoundError('Barber profile');
    return barber._id;
};

export function checkUploadQuota(mediaTypeOrResolver = null) {
    return async (req, _res, next) => {
        try {
            if (!req.user || req.user.roleType !== ROLES.BARBER) return next();

            const body = req.validated?.body || req.body || {};
            if (body.purpose && body.purpose !== MEDIA_PURPOSE.GALLERY) return next();

            const mediaType = typeof mediaTypeOrResolver === 'function'
                ? mediaTypeOrResolver(req)
                : mediaTypeOrResolver || (
                    String(body.contentType || '').startsWith('video/')
                        ? MEDIA_TYPE.VIDEO
                        : MEDIA_TYPE.IMAGE
                );

            const barberId = await resolveBarberId(req.user._id);
            const quotaCheck = mediaType === MEDIA_TYPE.VIDEO
                ? await entitlementService.canUploadVideo(barberId)
                : await entitlementService.canUploadPhoto(barberId);

            if (!quotaCheck.allowed) {
                throw new ForbiddenError(
                    `You have reached your ${mediaType} upload limit (${quotaCheck.limit}). Upgrade your plan to upload more.`,
                );
            }

            req.uploadQuota = quotaCheck;
            req.barberId = barberId;
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

export function checkStatementQuota() {
    return async (req, _res, next) => {
        try {
            const barberId = await resolveBarberId(req.user._id);
            const quotaCheck = await entitlementService.canDownloadStatement(barberId);
            if (!quotaCheck.allowed) {
                throw new ForbiddenError(
                    `You have reached your statement download limit (${quotaCheck.limit} per billing cycle). Upgrade your plan for more downloads.`,
                );
            }
            req.statementQuota = quotaCheck;
            req.barberId = barberId;
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

export function requirePlan(...allowedPlanIds) {
    return async (req, _res, next) => {
        try {
            const barberId = await resolveBarberId(req.user._id);
            const entitlements = await entitlementService.resolveEntitlements(barberId);
            if (!allowedPlanIds.includes(entitlements.planId)) {
                throw new ForbiddenError('This feature requires a higher plan. Upgrade to access it.');
            }
            req.entitlements = entitlements;
            req.barberId = barberId;
            return next();
        } catch (error) {
            return next(error);
        }
    };
}
