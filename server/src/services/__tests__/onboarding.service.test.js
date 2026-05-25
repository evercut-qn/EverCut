import assert from 'node:assert/strict';
import test from 'node:test';

const ensureRequiredEnv = () => {
    const defaults = {
        MONGODB_URI: 'mongodb://localhost:27017/evercut-test',
        FIREBASE_PROJECT_ID: 'evercut-test',
        FIREBASE_CLIENT_EMAIL: 'firebase@example.com',
        FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
        CF_ACCOUNT_ID: 'test-account',
        R2_ACCESS_KEY_ID: 'test-access-key',
        R2_SECRET_ACCESS_KEY: 'test-secret-key',
        R2_BUCKET: 'evercut-media-test',
        CDN_BASE_URL: 'https://media.evercut.test',
        MEDIA_TOKEN_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        MSG91_AUTH_KEY: 'msg91-auth',
        MSG91_OTP_TEMPLATE_ID: 'msg91-template',
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ONBOARDING_SECRET: 'onboarding-secret',
        PHONEPE_CLIENT_ID: 'phonepe-client',
        PHONEPE_CLIENT_SECRET: 'phonepe-secret',
        PHONEPE_CLIENT_VERSION: '1',
        PHONEPE_MERCHANT_ID: 'merchant-id',
        PHONEPE_WEBHOOK_USERNAME: 'webhook-user',
        PHONEPE_WEBHOOK_PASSWORD: 'webhook-pass',
        CASHFREE_PAYOUT_CLIENT_ID: 'cashfree-client',
        CASHFREE_PAYOUT_CLIENT_SECRET: 'cashfree-secret',
    };

    for (const [key, value] of Object.entries(defaults)) {
        process.env[key] ??= value;
    }
};

ensureRequiredEnv();

const shopRepository = (await import('../../repositories/shop.repository.js')).default;
const barberRepository = (await import('../../repositories/barber.repository.js')).default;
const userRepository = (await import('../../repositories/user.repository.js')).default;
const mediaRepository = (await import('../../repositories/media.repository.js')).default;
const subscriptionRepository = (await import('../../repositories/subscription.repository.js')).default;
const onboardingService = await import('../onboarding.service.js');

test('createBarberOnboarding links media as COVER and does NOT return photos array', async (t) => {
    const mockUser = { _id: 'user-1', phoneNumber: '+919876543210', roleType: 'BARBER' };
    const mockShop = { 
        _id: 'shop-1', 
        barberId: 'barber-1', 
        shopName: 'Test Shop',
        category: 'Barber Shop',
        targetCustomers: 'men',
        address: 'Test Address',
        location: { type: 'Point', coordinates: [0, 0] },
        availableDays: ['Monday'],
        openTime: '09:00',
        closeTime: '18:00',
        coverR2Key: 'key/1.jpg'
    };
    const mockBarber = {
        _id: 'barber-1',
        userId: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        accountHolderName: 'John Doe',
        bankName: 'Test Bank',
        bankAccount: '12345678901234',
        ifsc: 'HDFC0001234',
        payoutConfig: { verificationStatus: 'pending' },
    };
    const mockMedia = { _id: 'media-1', r2Key: 'key/1.jpg', status: 'ready' };

    t.mock.method(userRepository, 'findByPhone', async () => null);
    t.mock.method(userRepository, 'findByEmail', async () => null);
    t.mock.method(userRepository, 'create', async () => mockUser);
    t.mock.method(barberRepository, 'create', async () => mockBarber);
    t.mock.method(shopRepository, 'create', async () => mockShop);
    t.mock.method(mediaRepository, 'findById', async () => mockMedia);
    
    let linkedPurpose = null;
    t.mock.method(mediaRepository, 'updateById', async (mediaId, data) => {
        if (data.purpose) linkedPurpose = data.purpose;
        return { _id: mediaId };
    });
    
    t.mock.method(mediaRepository, 'findByEntity', async () => [mockMedia]);
    t.mock.method(userRepository, 'updateById', async () => ({}));

    let defaultSubscriptionBarberId = null;
    t.mock.method(subscriptionRepository, 'upsertDefaultForBarber', async (barberId) => {
        defaultSubscriptionBarberId = barberId;
        return { _id: 'subscription-1', barberId };
    });

    const shopData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        shopName: 'Test Shop',
        category: 'Barber Shop',
        targetCustomers: 'men',
        accountHolderName: 'John Doe',
        bankName: 'Test Bank',
        bankAccount: '12345678901234',
        ifsc: 'HDFC0001234',
        address: 'Test Address',
        location: { type: 'Point', coordinates: [0, 0] },
        workingDays: ['Monday'],
        openTime: '09:00',
        closeTime: '18:00',
        photoMediaId: 'media-1',
        pin: '1234',
        confirmPin: '1234'
    };

    const result = await onboardingService.createBarberOnboarding('+919876543210', shopData);

    assert.strictEqual(linkedPurpose, 'cover'); // Verified fix
    assert.strictEqual(defaultSubscriptionBarberId, 'barber-1');
    assert.strictEqual(result.shop.photos, undefined); // Verified sanitization
});
