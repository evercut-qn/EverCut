import assert from 'node:assert/strict';
import test from 'node:test';
import createApp from '../../app.js';
import connectDB, { disconnectDB } from '../../config/database.config.js';
import User from '../../models/user.model.js';
import Barber from '../../models/barber.model.js';
import Customer from '../../models/customer.model.js';
import Shop from '../../models/shop.model.js';
import Media from '../../models/media.model.js';
import storageProvider from '../../services/media/storage-provider.service.js';
import { generateAccessToken, generateOnboardingToken } from '../../services/auth.service.js';

test('Media Controller End-to-End Integration Tests', async (t) => {
    // Mock storageProvider methods
    t.mock.method(storageProvider, 'generateUploadUrl', async () => 'https://r2.example/upload-url');
    t.mock.method(storageProvider, 'headObject', async (key) => {
        let ContentType = 'image/jpeg';
        if (key.includes('.mp4') || key.includes('video')) {
            ContentType = 'video/mp4';
        }
        return {
            ContentType,
            ContentLength: 1024,
        };
    });
    t.mock.method(storageProvider, 'deleteObject', async () => ({}));
    t.mock.method(storageProvider, 'getObjectRange', async () => {
        // Return valid magic bytes for image/jpeg: [0xff, 0xd8, 0xff, 0xe0]
        return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    });

    console.log('Connecting to database...');
    await connectDB();

    const app = createApp();
    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/v1`;

    // Generate unique ids and credentials
    const testPrefix = `test_media_${Date.now()}`;
    const customerPhone = `+919999911111`;
    const barberPhone = `+919999922222`;
    const onboardingPhone = `+919999933333`;
    const otherBarberPhone = `+919999944444`;

    let customerUser, barberUser, otherBarberUser;
    let customerProfile, barberProfile, otherBarberProfile;
    let shop, otherShop;
    let customerToken, barberToken, onboardingToken, otherBarberToken;

    const deleteUserData = async (phones) => {
        for (const phone of phones) {
            const user = await User.findOne({ phoneNumber: phone });
            if (user) {
                await Customer.deleteMany({ userId: user._id });
                await Barber.deleteMany({ userId: user._id });
                await Shop.deleteMany({ barberId: user._id });
                await Media.deleteMany({ userId: user._id });
                await User.deleteOne({ _id: user._id });
            }
            await Media.deleteMany({ userId: phone });
        }
    };

    try {
        await deleteUserData([customerPhone, barberPhone, onboardingPhone, otherBarberPhone]);

        // 1. Customer User & Profile
        customerUser = await User.create({
            phoneNumber: customerPhone,
            email: `${testPrefix}_cust@example.com`,
            roleType: 'CUSTOMER',
        });
        customerProfile = await Customer.create({
            userId: customerUser._id,
            firstName: 'Cust',
            lastName: 'Test',
            gender: 'female',
            dateOfBirth: new Date('2000-01-01'),
            address: 'Customer Address',
            location: {
                type: 'Point',
                coordinates: [0, 0]
            }
        });
        customerToken = generateAccessToken(customerUser._id, 'CUSTOMER');

        // 2. Barber User & Profile & Shop
        barberUser = await User.create({
            phoneNumber: barberPhone,
            email: `${testPrefix}_barb@example.com`,
            roleType: 'BARBER',
        });
        barberProfile = await Barber.create({
            userId: barberUser._id,
            firstName: 'Barb',
            lastName: 'Test',
            gender: 'male',
            dateOfBirth: new Date('1990-01-01'),
            upiId: 'barb@upi',
            pinHash: 'somepinhash',
            yearsOfExperience: 3,
        });
        shop = await Shop.create({
            barberId: barberProfile._id,
            shopName: 'Barb Shop',
            category: 'Barber Shop',
            targetCustomers: 'men',
            address: '123 Street',
            location: { type: 'Point', coordinates: [0, 0] },
            availableDays: ['Monday'],
            openTime: '09:00',
            closeTime: '18:00',
        });
        barberToken = generateAccessToken(barberUser._id, 'BARBER');

        // 3. Other Barber User & Profile & Shop (for cross-user testing)
        otherBarberUser = await User.create({
            phoneNumber: otherBarberPhone,
            email: `${testPrefix}_other_barb@example.com`,
            roleType: 'BARBER',
        });
        otherBarberProfile = await Barber.create({
            userId: otherBarberUser._id,
            firstName: 'Other',
            lastName: 'Barb',
            gender: 'male',
            dateOfBirth: new Date('1992-01-01'),
            upiId: 'other@upi',
            pinHash: 'otherpinhash',
            yearsOfExperience: 5,
        });
        otherShop = await Shop.create({
            barberId: otherBarberProfile._id,
            shopName: 'Other Shop',
            category: 'Barber Shop',
            targetCustomers: 'men',
            address: '456 Street',
            location: { type: 'Point', coordinates: [0, 0] },
            availableDays: ['Monday'],
            openTime: '09:00',
            closeTime: '18:00',
        });
        otherBarberToken = generateAccessToken(otherBarberUser._id, 'BARBER');

        // 4. Onboarding Token for new phone number
        onboardingToken = generateOnboardingToken(onboardingPhone);

        // =====================================================================
        // Test 1: Onboarding Media Flow
        // =====================================================================
        console.log('Running Test 1: Onboarding Media Flow...');
        
        // A. Request onboarding upload URL (Success)
        let res = await fetch(`${baseUrl}/media/onboarding/upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${onboardingToken}`,
            },
            body: JSON.stringify({
                contentType: 'image/jpeg',
                sizeBytes: 1024,
                purpose: 'onboarding',
            }),
        });
        assert.equal(res.status, 201);
        let data = await res.json();
        assert.equal(data.success, true);
        const onboardingImageMediaId = data.data.mediaId;
        assert.ok(onboardingImageMediaId);

        // B. Video upload during onboarding -> Should fail with 403
        res = await fetch(`${baseUrl}/media/onboarding/upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${onboardingToken}`,
            },
            body: JSON.stringify({
                contentType: 'video/mp4',
                sizeBytes: 1024,
                purpose: 'onboarding',
            }),
        });
        assert.equal(res.status, 403);

        // C. Confirm onboarding upload
        res = await fetch(`${baseUrl}/media/onboarding/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${onboardingToken}`,
            },
            body: JSON.stringify({
                mediaId: onboardingImageMediaId,
            }),
        });
        assert.equal(res.status, 200);
        data = await res.json();
        assert.equal(data.success, true);

        // D. Confirm with ownership mismatch (using other onboarding token)
        const anotherOnboardingToken = generateOnboardingToken('+919999900000');
        res = await fetch(`${baseUrl}/media/onboarding/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anotherOnboardingToken}`,
            },
            body: JSON.stringify({
                mediaId: onboardingImageMediaId,
            }),
        });
        assert.equal(res.status, 404);

        // =====================================================================
        // Test 2: Standard Media Upload & Validation Flow
        // =====================================================================
        console.log('Running Test 2: Standard Media Upload & Validation Flow...');

        // A. Request Upload URL
        // A.1. Customer image -> Success
        res = await fetch(`${baseUrl}/media/upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`,
            },
            body: JSON.stringify({
                contentType: 'image/jpeg',
                sizeBytes: 1024,
                purpose: 'avatar',
            }),
        });
        assert.equal(res.status, 201);
        data = await res.json();
        const customerImageMediaId = data.data.mediaId;

        // A.2. Customer video -> Fail with 403
        res = await fetch(`${baseUrl}/media/upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`,
            },
            body: JSON.stringify({
                contentType: 'video/mp4',
                sizeBytes: 1024,
                purpose: 'gallery',
            }),
        });
        assert.equal(res.status, 403);

        // A.3. Barber video for non-gallery -> Fail with 400
        res = await fetch(`${baseUrl}/media/upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({
                contentType: 'video/mp4',
                sizeBytes: 1024,
                purpose: 'avatar',
            }),
        });
        assert.equal(res.status, 400);

        // A.4. Barber video for gallery -> Success
        res = await fetch(`${baseUrl}/media/upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({
                contentType: 'video/mp4',
                sizeBytes: 1024,
                purpose: 'gallery',
            }),
        });
        assert.equal(res.status, 201);
        data = await res.json();
        const barberVideoMediaId = data.data.mediaId;

        // A.5. Barber image -> Success
        res = await fetch(`${baseUrl}/media/upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({
                contentType: 'image/jpeg',
                sizeBytes: 1024,
                purpose: 'gallery',
            }),
        });
        assert.equal(res.status, 201);
        data = await res.json();
        const barberImageMediaId = data.data.mediaId;

        // A.6. Barber cover -> Success
        res = await fetch(`${baseUrl}/media/upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({
                contentType: 'image/jpeg',
                sizeBytes: 1024,
                purpose: 'cover',
            }),
        });
        assert.equal(res.status, 201);
        data = await res.json();
        const barberCoverMediaId = data.data.mediaId;

        // A.7. Barber profile image -> Success
        res = await fetch(`${baseUrl}/media/upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({
                contentType: 'image/jpeg',
                sizeBytes: 1024,
                purpose: 'avatar',
            }),
        });
        assert.equal(res.status, 201);
        data = await res.json();
        const barberProfileImageMediaId = data.data.mediaId;

        // B. Confirm uploads
        // B.1. Confirm customer image -> Success
        res = await fetch(`${baseUrl}/media/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`,
            },
            body: JSON.stringify({ mediaId: customerImageMediaId }),
        });
        assert.equal(res.status, 200);

        // B.2. Confirm barber video -> Success
        res = await fetch(`${baseUrl}/media/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({ mediaId: barberVideoMediaId }),
        });
        assert.equal(res.status, 200);

        // B.3. Confirm barber image -> Success
        res = await fetch(`${baseUrl}/media/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({ mediaId: barberImageMediaId }),
        });
        assert.equal(res.status, 200);

        // B.4. Confirm barber cover -> Success
        res = await fetch(`${baseUrl}/media/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({ mediaId: barberCoverMediaId }),
        });
        assert.equal(res.status, 200);

        // B.5. Confirm barber profile image -> Success
        res = await fetch(`${baseUrl}/media/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({ mediaId: barberProfileImageMediaId }),
        });
        assert.equal(res.status, 200);

        // =====================================================================
        // Test 3: Customer Profile Picture Endpoints
        // =====================================================================
        console.log('Running Test 3: Customer Profile Picture Endpoints...');

        // A. Update picture with image -> Success
        res = await fetch(`${baseUrl}/customers/me/media/picture`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`,
            },
            body: JSON.stringify({ mediaId: customerImageMediaId }),
        });
        assert.equal(res.status, 200);
        data = await res.json();
        assert.equal(data.success, true);
        assert.ok(data.data.photoUrl);

        // B. Update picture with video ID -> Fail with 400
        res = await fetch(`${baseUrl}/customers/me/media/picture`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`,
            },
            body: JSON.stringify({ mediaId: barberVideoMediaId }),
        });
        assert.equal(res.status, 400);

        // C. Update picture with other user's mediaId -> Fail with 400
        res = await fetch(`${baseUrl}/customers/me/media/picture`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`,
            },
            body: JSON.stringify({ mediaId: barberImageMediaId }),
        });
        assert.equal(res.status, 400);

        // D. Remove picture -> Success
        res = await fetch(`${baseUrl}/customers/me/media/picture`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${customerToken}`,
            },
        });
        assert.equal(res.status, 200);

        // =====================================================================
        // Test 4: Barber Profile / Shop Cover Picture Endpoints
        // =====================================================================
        console.log('Running Test 4: Barber Profile / Shop Cover Picture Endpoints...');

        // A. Update barber profile picture -> Success
        res = await fetch(`${baseUrl}/shops/me/media/picture`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({ mediaId: barberProfileImageMediaId }),
        });
        assert.equal(res.status, 200);

        // B. Update barber profile picture with video -> Fail 400
        res = await fetch(`${baseUrl}/shops/me/media/picture`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({ mediaId: barberVideoMediaId }),
        });
        assert.equal(res.status, 400);

        // C. Update barber profile picture with customer's image -> Fail 400
        res = await fetch(`${baseUrl}/shops/me/media/picture`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({ mediaId: customerImageMediaId }),
        });
        assert.equal(res.status, 400);

        // D. Update shop cover -> Success
        res = await fetch(`${baseUrl}/shops/me/media/cover`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({ mediaId: barberCoverMediaId }),
        });
        assert.equal(res.status, 200);

        // E. Update shop cover with video -> Fail 400
        res = await fetch(`${baseUrl}/shops/me/media/cover`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({ mediaId: barberVideoMediaId }),
        });
        assert.equal(res.status, 400);

        // F. Remove cover and picture
        res = await fetch(`${baseUrl}/shops/me/media/picture`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${barberToken}`,
            },
        });
        assert.equal(res.status, 200);

        res = await fetch(`${baseUrl}/shops/me/media/cover`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${barberToken}`,
            },
        });
        assert.equal(res.status, 200);

        // =====================================================================
        // Test 5: Gallery Media Attachment
        // =====================================================================
        console.log('Running Test 5: Gallery Media Attachment...');

        // A. Attach gallery media -> Success (201)
        res = await fetch(`${baseUrl}/media/gallery`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({ mediaIds: [barberImageMediaId, barberVideoMediaId] }),
        });
        assert.equal(res.status, 201);

        // B. Attach other user's media -> Fail 400
        res = await fetch(`${baseUrl}/media/gallery`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${barberToken}`,
            },
            body: JSON.stringify({ mediaIds: [customerImageMediaId] }),
        });
        assert.equal(res.status, 400);

        // C. Fetch Gallery -> Success (200)
        res = await fetch(`${baseUrl}/media/gallery`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${barberToken}`,
            },
        });
        assert.equal(res.status, 200);
        data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.data.length, 2);

        // D. Fetch Gallery Usage -> Success (200)
        res = await fetch(`${baseUrl}/media/gallery/usage`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${barberToken}`,
            },
        });
        assert.equal(res.status, 200);
        data = await res.json();
        assert.equal(data.success, true);
        assert.ok(data.data.totalPhotos !== undefined);
        assert.ok(data.data.totalVideos !== undefined);
        assert.ok(data.data.totalSize !== undefined);

        // =====================================================================
        // Test 6: Get & Delete Media
        // =====================================================================
        console.log('Running Test 6: Get & Delete Media...');

        // A. Get media details -> Success
        res = await fetch(`${baseUrl}/media/${barberImageMediaId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${barberToken}`,
            },
        });
        assert.equal(res.status, 200);

        // B. Get media details of other user's media -> Fail 404
        res = await fetch(`${baseUrl}/media/${customerImageMediaId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${barberToken}`,
            },
        });
        assert.equal(res.status, 404);

        // C. Delete other user's media -> Fail 404
        res = await fetch(`${baseUrl}/media/${customerImageMediaId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${barberToken}`,
            },
        });
        assert.equal(res.status, 404);

        // D. Delete own media -> Success
        res = await fetch(`${baseUrl}/media/${barberImageMediaId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${barberToken}`,
            },
        });
        assert.equal(res.status, 200);

    } catch (err) {
        console.error('TEST RUN FAILURE DETECTED:');
        console.error(err);
        process.exit(1);
    } finally {
        console.log('Cleaning up database and closing server...');
        await deleteUserData([customerPhone, barberPhone, onboardingPhone, otherBarberPhone]);
        server.close();
        server.unref();
        await disconnectDB();
    }
});
