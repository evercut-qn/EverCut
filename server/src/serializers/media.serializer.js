import { sanitizeForResponse, toIdString, toPlainObject } from './core.serializer.js';
import { r2KeyToUrl } from '../services/media/media-url.service.js';

const compact = (value) => Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
);

export const serializeMedia = (media) => {
    const raw = toPlainObject(media);
    const plain = sanitizeForResponse(raw);
    if (!plain) return null;

    const url = r2KeyToUrl(raw.r2Key);
    return compact({
        id: plain.id,
        type: plain.type,
        status: plain.status,
        purpose: plain.purpose,
        url,
        contentType: plain.contentType,
        fileSize: plain.actualSize || plain.declaredSize,
        category: plain.metadata?.category ?? null,
        description: plain.metadata?.description ?? null,
        originalName: plain.metadata?.originalName ?? null,
        entityId: toIdString(plain.entityId),
        entityType: plain.entityType ?? null,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    });
};

export const serializeMediaList = (items = []) => (
    Array.isArray(items) ? items.map(serializeMedia).filter(Boolean) : []
);
