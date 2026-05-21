import subscriptionRepository from '../../repositories/subscription.repository.js';
import mediaRepository from '../../repositories/media.repository.js';
import shopRepository from '../../repositories/shop.repository.js';
import { getPlanCapabilities, PLAN_IDS } from '../../config/subscription.config.js';
import { MEDIA_STATUS, SUBSCRIPTION_STATUSES } from '../../utils/constants.js';
import logger from '../../utils/logger.js';

const LOG = '[LifecycleOrchestrator]';

class SubscriptionLifecycleOrchestrator {
    async onSubscriptionActivated(barberId, planId) {
        logger.info(`${LOG} Subscription activated`, { barberId, planId });
        await this.reactivateHiddenMedia(barberId, planId);
    }

    async onSubscriptionRenewed(barberId, subscription) {
        logger.info(`${LOG} Subscription renewed`, {
            barberId,
            planId: subscription.planId,
            pendingPlanId: subscription.pendingPlanId,
        });

        await subscriptionRepository.updateByBarberId(barberId, {
            statementsDownloadedThisPeriod: 0,
        });

        if (subscription.pendingPlanId) {
            const oldPlanId = subscription.planId;
            const newPlanId = subscription.pendingPlanId;
            await subscriptionRepository.updateByBarberId(barberId, {
                planId: newPlanId,
                pendingPlanId: null,
            });
            await this.onPlanDowngraded(barberId, oldPlanId, newPlanId);
        }
    }

    async onSubscriptionExpired(barberId) {
        logger.info(`${LOG} Subscription expired`, { barberId });

        await subscriptionRepository.updateByBarberId(barberId, {
            planId: PLAN_IDS.BASIC,
            status: SUBSCRIPTION_STATUSES.EXPIRED,
            razorpaySubscriptionId: null,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            cancelledAt: null,
            pendingPlanId: null,
            statementsDownloadedThisPeriod: 0,
        });

        await this.applyHiddenMediaPolicy(barberId, PLAN_IDS.BASIC);
    }

    async onPlanUpgraded(barberId, oldPlanId, newPlanId) {
        logger.info(`${LOG} Plan upgraded`, { barberId, oldPlanId, newPlanId });
        await this.reactivateHiddenMedia(barberId, newPlanId);
    }

    async onPlanDowngraded(barberId, oldPlanId, newPlanId) {
        logger.info(`${LOG} Plan downgraded`, { barberId, oldPlanId, newPlanId });
        await this.applyHiddenMediaPolicy(barberId, newPlanId);
    }

    async reconcileMediaForSubscription(subscription) {
        const planId = subscription.status === SUBSCRIPTION_STATUSES.EXPIRED
            ? PLAN_IDS.BASIC
            : subscription.planId;
        await this.applyHiddenMediaPolicy(subscription.barberId, planId);
        await this.reactivateHiddenMedia(subscription.barberId, planId);
    }

    async applyHiddenMediaPolicy(barberId, planId) {
        const capabilities = getPlanCapabilities(planId);
        const shop = await this.#getShopForBarber(barberId);
        if (!shop) {
            logger.warn(`${LOG} Missing shop while applying media policy`, { barberId, planId });
            return;
        }

        await this.#hideExcessMedia(shop._id, 'image', capabilities.maxPhotos);
        await this.#hideExcessMedia(shop._id, 'video', capabilities.maxVideos);
    }

    async reactivateHiddenMedia(barberId, planId) {
        const capabilities = getPlanCapabilities(planId);
        const shop = await this.#getShopForBarber(barberId);
        if (!shop) return;

        await this.#reactivateMediaType(shop._id, 'image', capabilities.maxPhotos);
        await this.#reactivateMediaType(shop._id, 'video', capabilities.maxVideos);
    }

    async maybeReactivateOneAfterDelete(barberId, shopId, mediaType, planId) {
        const capabilities = getPlanCapabilities(planId);
        const limit = mediaType === 'video' ? capabilities.maxVideos : capabilities.maxPhotos;
        await this.#reactivateMediaType(shopId, mediaType, limit);
    }

    async #hideExcessMedia(shopId, mediaType, limit) {
        const activeCount = await mediaRepository.countActiveGalleryMedia(shopId, mediaType);
        if (activeCount <= limit) return;

        const excess = activeCount - limit;
        const mediaToHide = await mediaRepository.findActiveGalleryMedia(
            shopId,
            mediaType,
            { sort: { createdAt: -1 }, limit: excess },
        );
        const mediaIds = mediaToHide.map((media) => media._id);
        await mediaRepository.bulkUpdateStatus(mediaIds, MEDIA_STATUS.HIDDEN);

        logger.info(`${LOG} Hidden excess gallery media`, {
            shopId,
            mediaType,
            limit,
            activeCount,
            hiddenCount: mediaIds.length,
        });
    }

    async #reactivateMediaType(shopId, mediaType, limit) {
        const activeCount = await mediaRepository.countActiveGalleryMedia(shopId, mediaType);
        const hiddenCount = await mediaRepository.countHiddenGalleryMedia(shopId, mediaType);
        if (hiddenCount === 0 || activeCount >= limit) return;

        const reactivateCount = Math.min(hiddenCount, limit - activeCount);
        const mediaToReactivate = await mediaRepository.findHiddenGalleryMedia(
            shopId,
            mediaType,
            { sort: { createdAt: 1 }, limit: reactivateCount },
        );
        const mediaIds = mediaToReactivate.map((media) => media._id);
        await mediaRepository.bulkUpdateStatus(mediaIds, MEDIA_STATUS.READY);

        logger.info(`${LOG} Reactivated hidden gallery media`, {
            shopId,
            mediaType,
            activeCount,
            hiddenCount,
            reactivatedCount: mediaIds.length,
        });
    }

    async #getShopForBarber(barberId) {
        return shopRepository.findByBarberId(barberId);
    }
}

export default new SubscriptionLifecycleOrchestrator();
