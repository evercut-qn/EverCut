import assert from 'node:assert/strict';
import test from 'node:test';
import createApp from '../../app.js';
import connectDB, { disconnectDB } from '../../config/database.config.js';
import User from '../../models/user.model.js';
import Barber from '../../models/barber.model.js';
import Customer from '../../models/customer.model.js';
import Shop from '../../models/shop.model.js';
import Media from '../../models/media.model.js';
import Service from '../../models/service.model.js';
import Employee from '../../models/employee.model.js';
import Booking from '../../models/booking.model.js';
import PaymentTransaction from '../../models/payment-transaction.model.js';
import Rating from '../../models/rating.model.js';
import storageProvider from '../../services/media/storage-provider.service.js';
import { generateAccessToken } from '../../services/auth.service.js';
import { MEDIA_STATUS, MEDIA_TYPE, BOOKING_STATUS, PAYMENT_TRANSACTION_STATUS, PAYMENT_STATUS } from '../../utils/constants.js';
import { trustQueryOperators } from '../../utils/mongoose-query.utils.js';

test('Project-Wide Photo and Cover URL Integration Tests', async (t) => {
    // Mock storageProvider methods so we don't hit external cloud storage
    t.mock.method(storageProvider, 'generateUploadUrl', async () => 'https://r2.example/upload-url');
    t.mock.method(storageProvider, 'headObject', async () => ({
        ContentType: 'image/jpeg',
        ContentLength: 1024,
    }));
    t.mock.method(storageProvider, 'deleteObject', async () => ({}));
    t.mock.method(storageProvider, 'getObjectRange', async () => {
        return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    });

    console.log('Connecting to database...');
    await connectDB();

    const app = createApp();
    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/v1`;

    const testPrefix = `test_photos_${Date.now()}`;
    const adminPhone = `+919999900900`;
    const customerPhone = `+919999900901`;
    const barberPhone = `+919999900902`;

    let adminUser, customerUser, barberUser;
    let customerProfile, barberProfile, shop, employee, service, mediaCust, mediaBarb, mediaShop, mediaServ, mediaEmp;
    let booking, payment, rating;
    let adminToken, customerToken, barberToken;

    const cleanupDb = async () => {
        const phones = [adminPhone, customerPhone, barberPhone];
        for (const phone of phones) {
            const user = await User.findOne({ phoneNumber: phone });
            if (user) {
                await Customer.deleteMany({ userId: user._id });
                await Barber.deleteMany({ userId: user._id });
                const bProfile = await Barber.findOne({ userId: user._id });
                if (bProfile) {
                    await Shop.deleteMany({ barberId: bProfile._id });
                    await Employee.deleteMany(trustQueryOperators({ shopId: { $in: [bProfile._id] } }));
                }
                await Media.deleteMany({ userId: user._id });
                await User.deleteOne({ _id: user._id });
            }
        }
        if (customerProfile) {
            await Booking.deleteMany({ customerId: customerProfile._id });
            await PaymentTransaction.deleteMany({ customerId: customerProfile._id });
            await Rating.deleteMany({ customerId: customerProfile._id });
        }
        if (shop) {
            await Booking.deleteMany({ shopId: shop._id });
            await PaymentTransaction.deleteMany({ shopId: shop._id });
            await Rating.deleteMany({ shopId: shop._id });
            await Service.deleteMany({ shopId: shop._id });
            await Employee.deleteMany({ shopId: shop._id });
        }
        // Cleanup all media created by these tests
        await Media.deleteMany(trustQueryOperators({ r2Key: { $regex: testPrefix } }));
    };

    try {
        await cleanupDb();

        // 1. Create Users
        adminUser = await User.create({
            phoneNumber: adminPhone,
            email: `${testPrefix}_admin@example.com`,
            roleType: 'ADMIN',
        });
        adminToken = generateAccessToken(adminUser._id, 'ADMIN');

        customerUser = await User.create({
            phoneNumber: customerPhone,
            email: `${testPrefix}_cust@example.com`,
            roleType: 'CUSTOMER',
        });
        customerToken = generateAccessToken(customerUser._id, 'CUSTOMER');

        barberUser = await User.create({
            phoneNumber: barberPhone,
            email: `${testPrefix}_barb@example.com`,
            roleType: 'BARBER',
        });
        barberToken = generateAccessToken(barberUser._id, 'BARBER');

        // 2. Create Media documents
        mediaCust = await Media.create({
            _id: `cust-pic-${testPrefix}`,
            userId: customerUser._id.toString(),
            r2Key: `images/profiles/customer/${testPrefix}_cust.jpg`,
            r2Bucket: 'evercut-media',
            contentType: 'image/jpeg',
            declaredSize: 1024,
            type: MEDIA_TYPE.IMAGE,
            status: MEDIA_STATUS.READY,
            purpose: 'profile',
            uploadExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        mediaBarb = await Media.create({
            _id: `barb-pic-${testPrefix}`,
            userId: barberUser._id.toString(),
            r2Key: `images/profiles/barber/${testPrefix}_barb.jpg`,
            r2Bucket: 'evercut-media',
            contentType: 'image/jpeg',
            declaredSize: 1024,
            type: MEDIA_TYPE.IMAGE,
            status: MEDIA_STATUS.READY,
            purpose: 'profile',
            uploadExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        mediaShop = await Media.create({
            _id: `shop-cover-${testPrefix}`,
            userId: barberUser._id.toString(),
            r2Key: `images/shops/cover/${testPrefix}_shop.jpg`,
            r2Bucket: 'evercut-media',
            contentType: 'image/jpeg',
            declaredSize: 2048,
            type: MEDIA_TYPE.IMAGE,
            status: MEDIA_STATUS.READY,
            purpose: 'cover',
            uploadExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        mediaServ = await Media.create({
            _id: `serv-img-${testPrefix}`,
            userId: barberUser._id.toString(),
            r2Key: `images/shops/services/${testPrefix}_serv.jpg`,
            r2Bucket: 'evercut-media',
            contentType: 'image/jpeg',
            declaredSize: 1024,
            type: MEDIA_TYPE.IMAGE,
            status: MEDIA_STATUS.READY,
            purpose: 'service',
            uploadExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        mediaEmp = await Media.create({
            _id: `emp-pic-${testPrefix}`,
            userId: barberUser._id.toString(),
            r2Key: `images/shops/employees/${testPrefix}_emp.jpg`,
            r2Bucket: 'evercut-media',
            contentType: 'image/jpeg',
            declaredSize: 1024,
            type: MEDIA_TYPE.IMAGE,
            status: MEDIA_STATUS.READY,
            purpose: 'profile',
            uploadExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        // 3. Create Entity Profiles
        customerProfile = await Customer.create({
            userId: customerUser._id,
            firstName: 'Cust',
            lastName: 'Test',
            gender: 'female',
            dateOfBirth: new Date('2000-01-01'),
            address: 'Customer Address',
            photoMediaId: mediaCust._id,
            location: { type: 'Point', coordinates: [73.8567, 18.5204] }, // Pune coordinates
        });

        barberProfile = await Barber.create({
            userId: barberUser._id,
            firstName: 'Barb',
            lastName: 'Test',
            gender: 'male',
            dateOfBirth: new Date('1990-01-01'),
            upiId: 'barb@upi',
            pinHash: 'somepinhash',
            yearsOfExperience: 5,
            photoMediaId: mediaBarb._id,
        });

        shop = await Shop.create({
            barberId: barberProfile._id,
            shopName: 'Elite Barb Shop',
            category: 'Barber Shop',
            targetCustomers: 'men',
            address: '123 Pune Road',
            coverMediaId: mediaShop._id,
            location: { type: 'Point', coordinates: [73.8567, 18.5204] },
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            openTime: '09:00',
            closeTime: '21:00',
            galleryMediaIds: [],
        });

        // Associate customer with favorite shop
        await Customer.findByIdAndUpdate(customerProfile._id, { $addToSet: { favoriteShops: shop._id } });

        service = await Service.create({
            shopId: shop._id,
            serviceName: 'Premium Haircut',
            serviceType: 'single',
            serviceFor: 'men',
            imageMediaId: mediaServ._id,
            duration: 30,
            actualPrice: 300,
            offerPrice: 50,
            finalPrice: 250,
            isActive: true,
        });

        employee = await Employee.create({
            shopId: shop._id,
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '+919999988888',
            gender: 'male',
            dateOfBirth: new Date('1995-01-01'),
            photoMediaId: mediaEmp._id,
            workingHours: { start: '09:00', end: '18:00' },
            isActive: true,
        });

        booking = await Booking.create({
            customerId: customerProfile._id,
            shopId: shop._id,
            employeeId: employee._id,
            serviceIds: [service._id],
            date: new Date(),
            time: '10:00',
            endTime: '10:30',
            startMinute: 600,
            endMinute: 630,
            totalAmount: 250,
            durationMinutes: 30,
            status: BOOKING_STATUS.CONFIRMED,
            paymentStatus: PAYMENT_STATUS.SUCCESS,
        });

        payment = await PaymentTransaction.create({
            bookingId: booking._id,
            customerId: customerProfile._id,
            shopId: shop._id,
            amount: 25000, // in Paisa
            amountInRupees: 250,
            currency: 'INR',
            status: PAYMENT_TRANSACTION_STATUS.COMPLETED,
            gateway: 'razorpay',
            gatewayPaymentId: 'pay_12345',
            merchantOrderId: 'order_12345',
            paymentMode: 'UPI',
        });

        // Update booking's payment transaction reference
        await Booking.findByIdAndUpdate(booking._id, { paymentTransactionId: payment._id });

        rating = await Rating.create({
            customerId: customerProfile._id,
            shopId: shop._id,
            rating: 5,
            review: 'Excellent haircut!',
        });

        // Test Endpoint Requests
        const headers = (token) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        });

        // 1. GET /customers/me
        console.log('Testing GET /customers/me...');
        const resMe = await fetch(`${baseUrl}/customers/me`, { headers: headers(customerToken) });
        assert.equal(resMe.status, 200);
        const jsonMe = await resMe.json();
        assert.equal(jsonMe.success, true);
        assert.ok(jsonMe.data.photoUrl);
        assert.ok(jsonMe.data.photoUrl.includes(mediaCust.r2Key));

        // 2. PATCH /customers/me
        console.log('Testing PATCH /customers/me...');
        const resPatchMe = await fetch(`${baseUrl}/customers/me`, {
            method: 'PATCH',
            headers: headers(customerToken),
            body: JSON.stringify({ firstName: 'CustEdited' }),
        });
        assert.equal(resPatchMe.status, 200);
        const jsonPatchMe = await resPatchMe.json();
        assert.equal(jsonPatchMe.success, true);
        assert.ok(jsonPatchMe.data.photoUrl);
        assert.ok(jsonPatchMe.data.photoUrl.includes(mediaCust.r2Key));
        assert.equal(jsonPatchMe.data.firstName, 'CustEdited');

        // 3. GET /customers/:id
        console.log('Testing GET /customers/:id...');
        const resCustById = await fetch(`${baseUrl}/customers/${customerProfile._id}`, { headers: headers(adminToken) });
        assert.equal(resCustById.status, 200);
        const jsonCustById = await resCustById.json();
        assert.equal(jsonCustById.success, true);
        assert.ok(jsonCustById.data.photoUrl);
        assert.ok(jsonCustById.data.photoUrl.includes(mediaCust.r2Key));

        // 4. GET /customers
        console.log('Testing GET /customers...');
        const resCustList = await fetch(`${baseUrl}/customers`, { headers: headers(adminToken) });
        assert.equal(resCustList.status, 200);
        const jsonCustList = await resCustList.json();
        assert.equal(jsonCustList.success, true);
        const customerListItem = jsonCustList.data.find(c => c.id === customerProfile._id.toString());
        assert.ok(customerListItem);
        assert.ok(customerListItem.photoUrl);
        assert.ok(customerListItem.photoUrl.includes(mediaCust.r2Key));

        // 5. GET /barbers
        console.log('Testing GET /barbers...');
        const resBarbList = await fetch(`${baseUrl}/barbers`, { headers: headers(adminToken) });
        assert.equal(resBarbList.status, 200);
        const jsonBarbList = await resBarbList.json();
        assert.equal(jsonBarbList.success, true);
        const barberListItem = jsonBarbList.data.find(b => b.id === barberProfile._id.toString());
        assert.ok(barberListItem);
        assert.ok(barberListItem.photoUrl);
        assert.ok(barberListItem.photoUrl.includes(mediaBarb.r2Key));

        // 6. GET /barbers/:id
        console.log('Testing GET /barbers/:id...');
        const resBarbById = await fetch(`${baseUrl}/barbers/${barberProfile._id}`, { headers: headers(adminToken) });
        assert.equal(resBarbById.status, 200);
        const jsonBarbById = await resBarbById.json();
        assert.equal(jsonBarbById.success, true);
        assert.ok(jsonBarbById.data.photoUrl);
        assert.ok(jsonBarbById.data.photoUrl.includes(mediaBarb.r2Key));
        assert.ok(jsonBarbById.data.shop.coverUrl);
        assert.ok(jsonBarbById.data.shop.coverUrl.includes(mediaShop.r2Key));

        // 7. GET /shops
        console.log('Testing GET /shops...');
        const resShops = await fetch(`${baseUrl}/shops?latitude=18.5204&longitude=73.8567`, { headers: headers(customerToken) });
        assert.equal(resShops.status, 200);
        const jsonShops = await resShops.json();
        assert.equal(jsonShops.success, true);
        const shopListItem = jsonShops.data.find(s => s.id === shop._id.toString());
        assert.ok(shopListItem);
        assert.ok(shopListItem.coverUrl);
        assert.ok(shopListItem.coverUrl.includes(mediaShop.r2Key));

        // 8. GET /shops/services
        console.log('Testing GET /shops/services...');
        const resShopServices = await fetch(`${baseUrl}/shops/services?latitude=18.5204&longitude=73.8567`, { headers: headers(customerToken) });
        assert.equal(resShopServices.status, 200);
        const jsonShopServices = await resShopServices.json();
        assert.equal(jsonShopServices.success, true);
        const shopServiceItem = jsonShopServices.data.shops.find(s => s.id === shop._id.toString());
        assert.ok(shopServiceItem);
        assert.ok(shopServiceItem.coverUrl);
        assert.ok(shopServiceItem.coverUrl.includes(mediaShop.r2Key));

        // 9. GET /shops/favorites
        console.log('Testing GET /shops/favorites...');
        const resFavShops = await fetch(`${baseUrl}/shops/favorites`, { headers: headers(customerToken) });
        assert.equal(resFavShops.status, 200);
        const jsonFavShops = await resFavShops.json();
        assert.equal(jsonFavShops.success, true);
        const favShopItem = jsonFavShops.data.find(s => s.id === shop._id.toString());
        assert.ok(favShopItem);
        assert.ok(favShopItem.coverUrl);
        assert.ok(favShopItem.coverUrl.includes(mediaShop.r2Key));

        // 10. GET /shops/me
        console.log('Testing GET /shops/me...');
        const resShopMe = await fetch(`${baseUrl}/shops/me`, { headers: headers(barberToken) });
        assert.equal(resShopMe.status, 200);
        const jsonShopMe = await resShopMe.json();
        assert.equal(jsonShopMe.success, true);
        assert.ok(jsonShopMe.data.coverUrl);
        assert.ok(jsonShopMe.data.coverUrl.includes(mediaShop.r2Key));
        assert.ok(jsonShopMe.data.owner.photoUrl);
        assert.ok(jsonShopMe.data.owner.photoUrl.includes(mediaBarb.r2Key));

        // 11. GET /shops/:id
        console.log('Testing GET /shops/:id...');
        const resShopById = await fetch(`${baseUrl}/shops/${shop._id}`, { headers: headers(customerToken) });
        assert.equal(resShopById.status, 200);
        const jsonShopById = await resShopById.json();
        assert.equal(jsonShopById.success, true);
        assert.ok(jsonShopById.data.shop.coverUrl);
        assert.ok(jsonShopById.data.shop.coverUrl.includes(mediaShop.r2Key));
        // Verify service image
        const singleService = jsonShopById.data.services.single[0];
        assert.ok(singleService);
        assert.ok(singleService.imageUrl);
        assert.ok(singleService.imageUrl.includes(mediaServ.r2Key));

        // 12. GET /services/search
        console.log('Testing GET /services/search...');
        const resSearchServ = await fetch(`${baseUrl}/services/search?query=Premium`, { headers: headers(customerToken) });
        assert.equal(resSearchServ.status, 200);
        const jsonSearchServ = await resSearchServ.json();
        assert.equal(jsonSearchServ.success, true);
        const searchedService = jsonSearchServ.data[0];
        assert.ok(searchedService);
        assert.ok(searchedService.imageUrl);
        assert.ok(searchedService.imageUrl.includes(mediaServ.r2Key));

        // 13. GET /bookings
        console.log('Testing GET /bookings...');
        const resBookings = await fetch(`${baseUrl}/bookings`, { headers: headers(barberToken) });
        assert.equal(resBookings.status, 200);
        const jsonBookings = await resBookings.json();
        assert.equal(jsonBookings.success, true);
        const bookingListItem = jsonBookings.data.find(b => b.id === booking._id.toString());
        assert.ok(bookingListItem);
        assert.ok(bookingListItem.customer.photoUrl);
        assert.ok(bookingListItem.customer.photoUrl.includes(mediaCust.r2Key));

        // 14. GET /bookings/:id
        console.log('Testing GET /bookings/:id...');
        const resBookingById = await fetch(`${baseUrl}/bookings/${booking._id}`, { headers: headers(customerToken) });
        assert.equal(resBookingById.status, 200);
        const jsonBookingById = await resBookingById.json();
        assert.equal(jsonBookingById.success, true);
        assert.ok(jsonBookingById.data.customer.photoUrl);
        assert.ok(jsonBookingById.data.customer.photoUrl.includes(mediaCust.r2Key));
        assert.ok(jsonBookingById.data.employee.photoUrl);
        assert.ok(jsonBookingById.data.employee.photoUrl.includes(mediaEmp.r2Key));
        assert.ok(jsonBookingById.data.shop.coverUrl);
        assert.ok(jsonBookingById.data.shop.coverUrl.includes(mediaShop.r2Key));
        assert.ok(jsonBookingById.data.services[0].imageUrl);
        assert.ok(jsonBookingById.data.services[0].imageUrl.includes(mediaServ.r2Key));

        // 15. GET /earnings/transactions
        console.log('Testing GET /earnings/transactions...');
        const resTransactions = await fetch(`${baseUrl}/earnings/transactions`, { headers: headers(barberToken) });
        assert.equal(resTransactions.status, 200);
        const jsonTransactions = await resTransactions.json();
        assert.equal(jsonTransactions.success, true);
        const transactionItem = jsonTransactions.data[0];
        assert.ok(transactionItem);
        assert.ok(transactionItem.customer.photoUrl);
        assert.ok(transactionItem.customer.photoUrl.includes(mediaCust.r2Key));

        // 16. GET /earnings/transactions/:id
        console.log('Testing GET /earnings/transactions/:id...');
        const resTxnDetail = await fetch(`${baseUrl}/earnings/transactions/${payment._id}`, { headers: headers(barberToken) });
        assert.equal(resTxnDetail.status, 200);
        const jsonTxnDetail = await resTxnDetail.json();
        assert.equal(jsonTxnDetail.success, true);
        assert.ok(jsonTxnDetail.data.customer.photoUrl);
        assert.ok(jsonTxnDetail.data.customer.photoUrl.includes(mediaCust.r2Key));
        assert.ok(jsonTxnDetail.data.barber.photoUrl);
        assert.ok(jsonTxnDetail.data.barber.photoUrl.includes(mediaEmp.r2Key));

        // 17. GET /payments
        console.log('Testing GET /payments...');
        const resPayments = await fetch(`${baseUrl}/payments`, { headers: headers(adminToken) });
        assert.equal(resPayments.status, 200);
        const jsonPayments = await resPayments.json();
        assert.equal(jsonPayments.success, true);
        const paymentItem = jsonPayments.data[0];
        assert.ok(paymentItem);
        assert.ok(paymentItem.customer.photoUrl);
        assert.ok(paymentItem.customer.photoUrl.includes(mediaCust.r2Key));

        // 18. GET /payments/refunds
        console.log('Testing GET /payments/refunds...');
        // Let's make payment a refund payment to show up in refunds list
        await PaymentTransaction.findByIdAndUpdate(payment._id, { refund: { amount: 25000, status: 'processed', initiatedAt: new Date() } });
        const resRefunds = await fetch(`${baseUrl}/payments/refunds`, { headers: headers(adminToken) });
        assert.equal(resRefunds.status, 200);
        const jsonRefunds = await resRefunds.json();
        assert.equal(jsonRefunds.success, true);
        const refundItem = jsonRefunds.data[0];
        assert.ok(refundItem);
        assert.ok(refundItem.customer.photoUrl);
        assert.ok(refundItem.customer.photoUrl.includes(mediaCust.r2Key));

        // 19. PATCH /customers/me/media/picture
        console.log('Testing PATCH /customers/me/media/picture...');
        const mediaCustNew = await Media.create({
            _id: `cust-pic-new-${testPrefix}`,
            userId: customerUser._id.toString(),
            r2Key: `images/profiles/customer/${testPrefix}_cust_new.jpg`,
            r2Bucket: 'evercut-media',
            contentType: 'image/jpeg',
            declaredSize: 1024,
            type: MEDIA_TYPE.IMAGE,
            status: MEDIA_STATUS.READY,
            purpose: 'profile',
            uploadExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        const resCustPic = await fetch(`${baseUrl}/customers/me/media/picture`, {
            method: 'PATCH',
            headers: headers(customerToken),
            body: JSON.stringify({ mediaId: mediaCustNew._id }),
        });
        assert.equal(resCustPic.status, 200);
        const jsonCustPic = await resCustPic.json();
        assert.equal(jsonCustPic.success, true);
        assert.ok(jsonCustPic.data.photoUrl);
        assert.ok(jsonCustPic.data.photoUrl.includes(mediaCustNew.r2Key));

        // 20. DELETE /customers/me/media/picture
        console.log('Testing DELETE /customers/me/media/picture...');
        const resCustDeletePic = await fetch(`${baseUrl}/customers/me/media/picture`, {
            method: 'DELETE',
            headers: headers(customerToken),
        });
        assert.equal(resCustDeletePic.status, 200);
        const jsonCustDeletePic = await resCustDeletePic.json();
        assert.equal(jsonCustDeletePic.success, true);

        // 21. PATCH /shops/me/media/picture
        console.log('Testing PATCH /shops/me/media/picture...');
        const mediaBarbNew = await Media.create({
            _id: `barb-pic-new-${testPrefix}`,
            userId: barberUser._id.toString(),
            r2Key: `images/profiles/barber/${testPrefix}_barb_new.jpg`,
            r2Bucket: 'evercut-media',
            contentType: 'image/jpeg',
            declaredSize: 1024,
            type: MEDIA_TYPE.IMAGE,
            status: MEDIA_STATUS.READY,
            purpose: 'profile',
            uploadExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        const resBarbPic = await fetch(`${baseUrl}/shops/me/media/picture`, {
            method: 'PATCH',
            headers: headers(barberToken),
            body: JSON.stringify({ mediaId: mediaBarbNew._id }),
        });
        assert.equal(resBarbPic.status, 200);
        const jsonBarbPic = await resBarbPic.json();
        assert.equal(jsonBarbPic.success, true);
        assert.ok(jsonBarbPic.data.photoUrl);
        assert.ok(jsonBarbPic.data.photoUrl.includes(mediaBarbNew.r2Key));

        // 22. DELETE /shops/me/media/picture
        console.log('Testing DELETE /shops/me/media/picture...');
        const resBarbDeletePic = await fetch(`${baseUrl}/shops/me/media/picture`, {
            method: 'DELETE',
            headers: headers(barberToken),
        });
        assert.equal(resBarbDeletePic.status, 200);
        const jsonBarbDeletePic = await resBarbDeletePic.json();
        assert.equal(jsonBarbDeletePic.success, true);

        // 23. PATCH /shops/me/media/cover
        console.log('Testing PATCH /shops/me/media/cover...');
        const mediaShopNew = await Media.create({
            _id: `shop-cover-new-${testPrefix}`,
            userId: barberUser._id.toString(),
            r2Key: `images/shops/cover/${testPrefix}_shop_new.jpg`,
            r2Bucket: 'evercut-media',
            contentType: 'image/jpeg',
            declaredSize: 2048,
            type: MEDIA_TYPE.IMAGE,
            status: MEDIA_STATUS.READY,
            purpose: 'cover',
            uploadExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        const resShopCover = await fetch(`${baseUrl}/shops/me/media/cover`, {
            method: 'PATCH',
            headers: headers(barberToken),
            body: JSON.stringify({ mediaId: mediaShopNew._id }),
        });
        assert.equal(resShopCover.status, 200);
        const jsonShopCover = await resShopCover.json();
        assert.equal(jsonShopCover.success, true);
        assert.ok(jsonShopCover.data.coverUrl);
        assert.ok(jsonShopCover.data.coverUrl.includes(mediaShopNew.r2Key));

        // 24. DELETE /shops/me/media/cover
        console.log('Testing DELETE /shops/me/media/cover...');
        const resShopDeleteCover = await fetch(`${baseUrl}/shops/me/media/cover`, {
            method: 'DELETE',
            headers: headers(barberToken),
        });
        assert.equal(resShopDeleteCover.status, 200);
        const jsonShopDeleteCover = await resShopDeleteCover.json();
        assert.equal(jsonShopDeleteCover.success, true);

    } finally {
        await cleanupDb();
        server.close();
        await disconnectDB();
    }
});
