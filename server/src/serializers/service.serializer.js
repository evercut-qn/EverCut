import {
    getEffectiveServicePrice,
    normalizeServicePricing,
} from '../utils/service-pricing.utils.js';
import { sanitizeForResponse, toIdString, toPlainObject } from './core.serializer.js';

const compact = (value) => Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
);

export const serializeService = (service, options = {}) => {
    if (!service || typeof service !== 'object') return null;

    const normalized = normalizeServicePricing(toPlainObject(service));
    const plain = sanitizeForResponse(normalized);
    if (!plain) return null;

    const effectivePrice = getEffectiveServicePrice(plain);
    const shop = plain.shopId && typeof plain.shopId === 'object'
        ? {
            id: plain.shopId.id,
            shopId: plain.shopId.id,
            shopName: plain.shopId.shopName ?? null,
            address: plain.shopId.address ?? null,
            location: plain.shopId.location ?? null,
            category: plain.shopId.category ?? null,
            coverUrl: plain.shopId.coverUrl ?? null,
        }
        : undefined;

    return compact({
        id: plain.id,
        serviceId: plain.id,
        shopId: plain.shopId?.id || toIdString(plain.shopId),
        shop: options.includeShop && shop ? shop : undefined,
        serviceName: plain.serviceName ?? null,
        serviceType: plain.serviceType ?? null,
        serviceFor: plain.serviceFor ?? null,
        imageUrl: plain.imageUrl ?? null,
        duration: plain.duration,
        actualPrice: plain.actualPrice,
        offerPrice: plain.offerPrice ?? 0,
        finalPrice: effectivePrice ?? plain.finalPrice,
        bundledServices: plain.bundledServices ?? undefined,
        totalDuration: plain.totalDuration,
        totalPrice: plain.totalPrice,
        isActive: plain.isActive,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    });
};

export const serializeServices = (services = [], options = {}) => (
    Array.isArray(services) ? services.map((service) => serializeService(service, options)).filter(Boolean) : []
);
