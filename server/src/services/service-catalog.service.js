import serviceRepository from '../repositories/service.repository.js';
import shopRepository from '../repositories/shop.repository.js';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/api-error.js';
import { escapeRegex } from '../utils/regex.utils.js';
import { buildPagination } from '../utils/pagination.utils.js';
import { calculateDiscountedPrice, normalizeServicePricing } from '../utils/service-pricing.utils.js';
import { serializeService, serializeServices } from '../serializers/service.serializer.js';
import { serializeShopSummary } from '../serializers/shop.serializer.js';
import { MEDIA_ENTITY_TYPE, MEDIA_PURPOSE } from '../utils/constants.js';
import * as mediaService from './media/media.service.js';
import storageProvider from './media/storage-provider.service.js';
import serviceDefaultImageRepository from '../repositories/service-default-image.repository.js';

const SERVICE_CARD_FIELDS = [
    'serviceName',
    'serviceFor',
    'serviceType',
    'imageR2Key',
    'duration',
    'actualPrice',
    'offerPrice',
    'finalPrice',
    'totalDuration',
    'totalPrice',
    'bundledServices',
    'shopId',
].join(' ');

const normalizeBundledServices = (bundledServices = []) => (
    [...new Set(
        bundledServices
            .map((serviceName) => serviceName.trim())
            .filter(Boolean),
    )]
);

const assertValidDiscount = (actualPrice, offerPrice) => {
    const discountedPrice = calculateDiscountedPrice(actualPrice, offerPrice);
    if (discountedPrice < 0) {
        throw new BadRequestError('offerPrice cannot exceed actualPrice');
    }

    return discountedPrice;
};

const buildServiceFilters = (queryFilters = {}) => {
    const filters = {};

    if (queryFilters.serviceType) filters.serviceType = queryFilters.serviceType;
    if (queryFilters.serviceFor) filters.serviceFor = queryFilters.serviceFor;

    return filters;
};

const resolveDefaultServiceImageR2Key = async (serviceName, serviceType, serviceFor, bundledServices = []) => {
    // 1. Try to find a specific match in the database (Exact -> Fuzzy -> Global Gender -> Global Unisex)
    const match = await serviceDefaultImageRepository.findBestMatch(serviceName, serviceType, serviceFor);
    if (match) return match.r2Key;

    // 2. Specialized logic for bundled services if no direct match found
    if (serviceType === 'bundled' && bundledServices.length > 0) {
        const concatenated = bundledServices
            .map((s) => s.toLowerCase().replace(/\s+/g, ''))
            .sort()
            .join('');
        const bundleMatch = await serviceDefaultImageRepository.findByName(concatenated);
        if (bundleMatch) return bundleMatch.r2Key;
    }

    // 3. Absolute system fallback (should ideally be handled by step 1's Global Unisex fallback)
    return 'images/services/single/default/unisex.jpg';
};

const buildServicePayload = (data, existingService = null) => {
    const existing = existingService ? normalizeServicePricing(existingService) : {};
    const serviceType = existing.serviceType || data.serviceType;
    const actualPrice = data.actualPrice ?? existing.actualPrice;
    const offerPrice = data.offerPrice ?? existing.offerPrice ?? 0;
    const finalPrice = assertValidDiscount(actualPrice, offerPrice);

    const serviceData = {
        serviceName: data.serviceName ?? existing.serviceName,
        serviceType,
        serviceFor: data.serviceFor ?? existing.serviceFor ?? 'unisex',
        actualPrice,
        offerPrice,
        finalPrice,
    };

    if (serviceType === 'single') {
        if (data.duration !== undefined || existing.duration !== undefined) {
            serviceData.duration = data.duration ?? existing.duration;
        }
        return serviceData;
    }

    const bundledServices = data.bundledServices !== undefined
        ? normalizeBundledServices(data.bundledServices)
        : normalizeBundledServices(existing.bundledServices || []);

    if (!bundledServices.length) {
        throw new BadRequestError('bundledServices must contain at least one service');
    }

    serviceData.bundledServices = bundledServices;
    serviceData.totalPrice = finalPrice;

    if (data.totalDuration !== undefined || existing.totalDuration !== undefined) {
        serviceData.totalDuration = data.totalDuration ?? existing.totalDuration;
    }

    return serviceData;
};

const ensureUniqueActiveService = async (shopId, serviceData, currentServiceId = null) => {
    const duplicateService = await serviceRepository.findByShopIdAndName(shopId, serviceData.serviceName, {
        serviceType: serviceData.serviceType,
        serviceFor: serviceData.serviceFor,
    });

    if (
        duplicateService
        && duplicateService._id.toString() !== currentServiceId?.toString()
    ) {
        throw new ConflictError('Service already exists for this service type and gender');
    }
};

const rethrowDuplicateServiceWrite = (error) => {
    if (error?.code === 11000) {
        throw new ConflictError('Service already exists for this service type and gender');
    }

    throw error;
};

export const addService = async (ownerId, data) => {
    const shop = await shopRepository.findByBarberUserId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const serviceData = buildServicePayload(data);
    await ensureUniqueActiveService(shop._id, serviceData);

    let imageR2Key;
    let imageMediaId = null;

    if (data.imageMediaId) {
        const media = await mediaService.resolveReadyMediaById(data.imageMediaId);
        imageR2Key = media.r2Key;
        imageMediaId = data.imageMediaId;
    } else {
        imageR2Key = await resolveDefaultServiceImageR2Key(
            serviceData.serviceName,
            serviceData.serviceType,
            serviceData.serviceFor,
            serviceData.bundledServices,
        );
    }

    let createdService;
    try {
        createdService = await serviceRepository.create({
            shopId: shop._id,
            imageR2Key,
            ...serviceData,
        });
    } catch (error) {
        rethrowDuplicateServiceWrite(error);
    }

    if (imageMediaId) {
        await mediaService.linkMediaToEntity(
            imageMediaId,
            createdService._id,
            MEDIA_ENTITY_TYPE.SERVICE,
            MEDIA_PURPOSE.SERVICE,
        );
    }

    return serializeService(createdService);
};

export const getServices = async (ownerId, queryFilters = {}) => {
    const shop = await shopRepository.findByBarberUserId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const filters = buildServiceFilters(queryFilters);
    const total = await serviceRepository.countByShopId(shop._id, filters);
    const { skip, limit, pagination } = buildPagination(queryFilters, total);

    const items = serializeServices(await serviceRepository.findByShopId(shop._id, filters, { skip, limit }));
    return { items, pagination };
};

export const updateService = async (ownerId, serviceId, data) => {
    const shop = await shopRepository.findByBarberUserId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const existingService = await serviceRepository.findById(serviceId);
    if (!existingService || existingService.shopId.toString() !== shop._id.toString()) {
        throw new NotFoundError('Service');
    }

    const updateData = buildServicePayload(data, existingService);
    await ensureUniqueActiveService(shop._id, updateData, existingService._id);

    let imageMediaId = data.imageMediaId;
    let oldR2KeyToDelete = null;

    if (imageMediaId) {
        const media = await mediaService.resolveReadyMediaById(imageMediaId);
        oldR2KeyToDelete = existingService.imageR2Key;
        updateData.imageR2Key = media.r2Key;
    } else if (
        updateData.serviceName !== existingService.serviceName
        || updateData.serviceFor !== existingService.serviceFor
    ) {
        // Only resolve new default if name or gender changed and no manual image provided
        updateData.imageR2Key = await resolveDefaultServiceImageR2Key(
            updateData.serviceName,
            updateData.serviceType,
            updateData.serviceFor,
            updateData.bundledServices,
        );
    }

    let updated;
    try {
        updated = await serviceRepository.updateById(serviceId, shop._id, updateData);
    } catch (error) {
        rethrowDuplicateServiceWrite(error);
    }
    if (!updated) throw new NotFoundError('Service');

    if (imageMediaId) {
        await mediaService.linkMediaToEntity(
            imageMediaId,
            updated._id,
            MEDIA_ENTITY_TYPE.SERVICE,
            MEDIA_PURPOSE.SERVICE,
        );

        if (oldR2KeyToDelete && oldR2KeyToDelete !== updated.imageR2Key) {
            storageProvider.deleteObject(oldR2KeyToDelete).catch(() => {});
        }
    }

    return serializeService(updated);
};

export const deleteService = async (ownerId, serviceId) => {
    const shop = await shopRepository.findByBarberUserId(ownerId);
    if (!shop) throw new NotFoundError('Shop profile');

    const deleted = await serviceRepository.softDelete(serviceId, shop._id);
    if (!deleted) throw new NotFoundError('Service');
    return { message: 'Service deleted successfully' };
};

export const searchServices = async (query, gender) => {
    const filters = {};
    if (gender) filters.serviceFor = { $regex: new RegExp(`^${escapeRegex(gender)}$`, 'i') };
    return serializeServices(
        await serviceRepository.searchByName(query, filters, SERVICE_CARD_FIELDS),
        { includeShop: true },
    );
};

export const searchShops = async (query) => {
    return (await shopRepository.searchByName(query, 'shopName address location category coverR2Key'))
        .map(serializeShopSummary)
        .filter(Boolean);
};

export const getServicesByGender = async (gender) => {
    return serializeServices(
        await serviceRepository.findByGender(gender, SERVICE_CARD_FIELDS),
        { includeShop: true },
    );
};
