import config from '../../config/index.js';
import { MEDIA_TYPE } from '../../utils/constants.js';

const MAGIC_SIGNATURES = Object.freeze({
    'image/jpeg': [[0xff, 0xd8, 0xff]],
    'image/png': [[0x89, 0x50, 0x4e, 0x47]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]],
    'video/mp4': [[0x66, 0x74, 0x79, 0x70]],
    'video/webm': [[0x1a, 0x45, 0xdf, 0xa3]],
});

export const validateContentType = (contentType, mediaType) => {
    const allowlist = mediaType === MEDIA_TYPE.VIDEO
        ? config.media.allowedVideoMimes
        : config.media.allowedImageMimes;
    return allowlist.includes(contentType);
};

export const validateFileSize = (sizeBytes, mediaType) => {
    const limit = mediaType === MEDIA_TYPE.VIDEO ? config.media.maxVideoSize : config.media.maxImageSize;
    return Number.isInteger(sizeBytes) && sizeBytes > 0 && sizeBytes <= limit;
};

export const validateMagicBytes = (bytes, declaredContentType) => {
    const signatures = MAGIC_SIGNATURES[declaredContentType];
    if (!Buffer.isBuffer(bytes) || !signatures) return false;

    if (declaredContentType === 'video/mp4') {
        const ftypSignature = [0x66, 0x74, 0x79, 0x70];
        return ftypSignature.every((byte, index) => bytes[4 + index] === byte);
    }

    if (declaredContentType === 'image/webp') {
        return bytes.slice(0, 4).toString('ascii') === 'RIFF'
            && bytes.slice(8, 12).toString('ascii') === 'WEBP';
    }

    return signatures.some((signature) => (
        signature.every((byte, index) => bytes[index] === byte)
    ));
};
