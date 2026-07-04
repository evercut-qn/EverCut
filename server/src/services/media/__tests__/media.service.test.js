import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

const ensureRequiredEnv = () => {
    const defaults = {
        MONGODB_URI: 'mongodb://localhost:27017/evercut-test',
        FIREBASE_PROJECT_ID: 'evercut-test',
        FIREBASE_CLIENT_EMAIL: 'firebase@example.com',
        FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
        MSG91_AUTH_KEY: 'msg91-auth',
        MSG91_OTP_TEMPLATE_ID: 'msg91-template',
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ONBOARDING_SECRET: 'onboarding-secret',
        CF_ACCOUNT_ID: 'test-account',
        R2_ACCESS_KEY_ID: 'test-access-key',
        R2_SECRET_ACCESS_KEY: 'test-secret-key',
        R2_BUCKET: 'evercut-media-test',
        CDN_BASE_URL: 'https://media.evercut.test',
        MEDIA_TOKEN_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    };

    for (const [key, value] of Object.entries(defaults)) {
        process.env[key] ??= value;
    }
};

ensureRequiredEnv();

const mediaRepository = (await import('../../../repositories/media.repository.js')).default;
const userRepository = (await import('../../../repositories/user.repository.js')).default;
const storageProvider = (await import('../storage-provider.service.js')).default;
const mediaService = await import('../media.service.js');
const { MEDIA_PURPOSE } = await import('../../../utils/constants.js');

test('requestUploadUrl creates pending media and returns a presigned R2 PUT URL', async (t) => {
    let createdPayload = null;
    t.mock.method(mediaRepository, 'create', async (payload) => {
        createdPayload = payload;
        return { ...payload };
    });

    let signedRequest = null;
    t.mock.method(storageProvider, 'generateUploadUrl', async ({ key, contentType }) => {
        signedRequest = { key, contentType };
        return 'https://r2.example/upload';
    });

    const result = await mediaService.requestUploadUrl('user-1', {
        contentType: 'image/jpeg',
        sizeBytes: 2048,
        purpose: 'gallery',
    });

    assert.equal(result.uploadUrl, 'https://r2.example/upload');
    assert.equal(result.mediaId, createdPayload._id);
    assert.equal(createdPayload.status, 'pending');
    assert.equal(createdPayload.purpose, 'gallery');
    assert.equal(createdPayload.r2Bucket, 'evercut-media-test');
    assert.match(createdPayload.r2Key, /^images\/gallery\/user-1\/[0-9a-f-]+\.jpg$/);
    assert.deepEqual(signedRequest, {
        key: createdPayload.r2Key,
        contentType: 'image/jpeg',
    });
});

test('requestUploadUrl supports notification images with dedicated R2 keys', async (t) => {
    let createdPayload = null;
    t.mock.method(mediaRepository, 'create', async (payload) => {
        createdPayload = payload;
        return { ...payload };
    });

    t.mock.method(storageProvider, 'generateUploadUrl', async () => 'https://r2.example/upload');

    const result = await mediaService.requestUploadUrl('admin-1', {
        contentType: 'image/png',
        sizeBytes: 2048,
        purpose: MEDIA_PURPOSE.NOTIFICATION,
    }, { roleType: 'ADMIN' });

    assert.equal(result.uploadUrl, 'https://r2.example/upload');
    assert.equal(createdPayload.purpose, 'notification');
    assert.match(createdPayload.r2Key, /^images\/notifications\/admin-1\/[0-9a-f-]+\.png$/);
});

test('requestUploadUrl rejects notification images from non-admin users', async (t) => {
    t.mock.method(userRepository, 'findById', async () => ({ roleType: 'CUSTOMER' }));
    const createMock = t.mock.method(mediaRepository, 'create', async () => {
        throw new Error('create should not be called for unauthorized media');
    });
    const uploadMock = t.mock.method(storageProvider, 'generateUploadUrl', async () => {
        throw new Error('upload URL should not be created for unauthorized media');
    });

    await assert.rejects(
        () => mediaService.requestUploadUrl('customer-1', {
            contentType: 'image/png',
            sizeBytes: 2048,
            purpose: MEDIA_PURPOSE.NOTIFICATION,
        }, { roleType: 'CUSTOMER' }),
        {
            name: 'ForbiddenError',
            message: 'Only administrators may upload notification images',
        },
    );

    assert.equal(createMock.mock.calls.length, 0);
    assert.equal(uploadMock.mock.calls.length, 0);
});

test('requestUploadUrl rejects unsupported MIME types before creating media', async (t) => {
    const createMock = t.mock.method(mediaRepository, 'create', async () => {
        throw new Error('create should not be called for invalid media');
    });

    await assert.rejects(
        () => mediaService.requestUploadUrl('user-1', {
            contentType: 'application/pdf',
            sizeBytes: 2048,
            purpose: 'gallery',
        }),
        {
            name: 'BadRequestError',
            message: 'Unsupported media content type',
        },
    );

    assert.equal(createMock.mock.calls.length, 0);
});

test('requestUploadUrl allows video upload for BARBER with gallery purpose and generates correct videos/gallery key', async (t) => {
    let createdPayload = null;
    t.mock.method(mediaRepository, 'create', async (payload) => {
        createdPayload = payload;
        return { ...payload };
    });

    t.mock.method(storageProvider, 'generateUploadUrl', async () => 'https://r2.example/upload');
    
    t.mock.method(userRepository, 'findById', async (id) => {
        if (id.toString() === '507f1f77bcf86cd799439011') {
            return { _id: '507f1f77bcf86cd799439011', roleType: 'BARBER' };
        }
        return null;
    });

    const result = await mediaService.requestUploadUrl('507f1f77bcf86cd799439011', {
        contentType: 'video/mp4',
        sizeBytes: 10 * 1024 * 1024,
        purpose: 'gallery',
    });

    assert.equal(result.uploadUrl, 'https://r2.example/upload');
    assert.equal(createdPayload.status, 'pending');
    assert.equal(createdPayload.type, 'video');
    assert.match(createdPayload.r2Key, /^videos\/gallery\/507f1f77bcf86cd799439011\/[0-9a-f-]+\.mp4$/);
});

test('requestUploadUrl rejects video upload for non-BARBER users', async (t) => {
    t.mock.method(userRepository, 'findById', async (id) => {
        if (id.toString() === '507f1f77bcf86cd799439012') {
            return { _id: '507f1f77bcf86cd799439012', roleType: 'CUSTOMER' };
        }
        return null;
    });

    await assert.rejects(
        () => mediaService.requestUploadUrl('507f1f77bcf86cd799439012', {
            contentType: 'video/mp4',
            sizeBytes: 10 * 1024 * 1024,
            purpose: 'gallery',
        }),
        {
            name: 'ForbiddenError',
            message: 'Only barbers may upload videos',
        },
    );
});

test('requestUploadUrl rejects video upload for non-gallery purposes', async (t) => {
    t.mock.method(userRepository, 'findById', async (id) => {
        if (id.toString() === '507f1f77bcf86cd799439011') {
            return { _id: '507f1f77bcf86cd799439011', roleType: 'BARBER' };
        }
        return null;
    });

    await assert.rejects(
        () => mediaService.requestUploadUrl('507f1f77bcf86cd799439011', {
            contentType: 'video/mp4',
            sizeBytes: 10 * 1024 * 1024,
            purpose: 'avatar',
        }),
        {
            name: 'BadRequestError',
            message: 'Video uploads are only allowed for gallery purpose',
        },
    );
});

test('confirmUpload returns a stable Cloudflare URL for notification images', async (t) => {
    const media = {
        _id: 'media-1',
        userId: 'admin-1',
        type: 'image',
        status: 'pending',
        purpose: MEDIA_PURPOSE.NOTIFICATION,
        r2Key: 'images/notifications/admin-1/promo.png',
        contentType: 'image/png',
        declaredSize: 2048,
    };

    t.mock.method(mediaRepository, 'findByIdAndUser', async () => media);
    t.mock.method(storageProvider, 'headObject', async () => ({
        ContentType: 'image/png',
        ContentLength: 2048,
    }));
    t.mock.method(storageProvider, 'getObjectRange', async () => Buffer.from([
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52,
    ]));
    t.mock.method(mediaRepository, 'updateById', async (id, update) => ({
        ...media,
        _id: id,
        ...update,
    }));

    const result = await mediaService.confirmUpload('admin-1', 'media-1');

    assert.equal(result.cdnUrl, 'https://media.evercut.test/images/notifications/admin-1/promo.png');
    assert.equal(result.cdnUrl.includes('exp='), false);
    assert.equal(result.cdnUrl.includes('token='), false);
});

test('cleanupCustomMedia deletes from storage and soft-deletes DB media if found by key', async (t) => {
    let deletedId = null;
    let deletedStorageKey = null;

    t.mock.method(mediaRepository, 'findByR2Key', async (key) => {
        if (key === 'some-key') return { _id: 'media-1', r2Key: 'some-key' };
        return null;
    });
    t.mock.method(mediaRepository, 'softDeleteById', async (id) => {
        deletedId = id;
        return { _id: id, status: 'deleted' };
    });
    t.mock.method(storageProvider, 'deleteObject', async (key) => {
        deletedStorageKey = key;
        return {};
    });

    await mediaService.cleanupCustomMedia('some-key');
    assert.equal(deletedId, 'media-1');
    assert.equal(deletedStorageKey, 'some-key');

    deletedId = null;
    deletedStorageKey = null;
    await mediaService.cleanupCustomMedia('unknown-key');
    assert.equal(deletedId, null);
    assert.equal(deletedStorageKey, null);
});
