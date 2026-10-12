// import shopRepository from '../repositories/shop.repository.js';
// import barberRepository from '../repositories/barber.repository.js';
// import customerRepository from '../repositories/customer.repository.js';
// import serviceRepository from '../repositories/service.repository.js';
// import ratingRepository from '../repositories/rating.repository.js';
// import userRepository from '../repositories/user.repository.js';
// import bookingRepository from '../repositories/booking.repository.js';
// import payoutRepository from '../repositories/payout.repository.js';
// import paymentRepository from '../repositories/payment.repository.js';
// import { serializeBooking } from '../serializers/booking.serializer.js';
// import { serializePayout } from '../serializers/payout.serializer.js';
// import { serializePayment } from '../serializers/payment.serializer.js';
// import config from '../config/index.js';
// import { BadRequestError, NotFoundError } from '../utils/api-error.js';
// import { serializeBarberProfile, serializeBankDetails } from '../utils/barber-profile.utils.js';
// import { escapeRegex } from '../utils/regex.utils.js';
// import { serializeRating } from '../utils/rating-response.utils.js';
// import { buildPagination } from '../utils/pagination.utils.js';
// import { normalizeServicePricing } from '../utils/service-pricing.utils.js';
// import { normalizeShopSchedule } from '../utils/shop-schedule.utils.js';
// import { isValidUpiId, normalizePayoutString } from '../utils/payout-details.utils.js';
// import notificationEvents from './notifications/notification-events.service.js';
// import entitlementService from './subscription/entitlement.service.js';
// import * as mediaService from './media/media.service.js';
// import { buildMediaUrl } from './media/media-url.service.js';
// import * as serviceCatalogService from './service-catalog.service.js';
// import { serializeEmployee } from '../serializers/employee.serializer.js';
// import { serializeServices } from '../serializers/service.serializer.js';
// import { serializeBarberDirectoryItem, serializeShopProfile, serializeShopSummary } from '../serializers/shop.serializer.js';
// import {
//     ALL_SERVICE_FOR,
//     ALL_GENDERS,
//     ALL_SHOP_AMENITIES,
//     ALL_SHOP_CATEGORIES,
//     DAYS_OF_WEEK,
// } from '../utils/constants.js';

// /**
//  * Shop service business logic for barber profile management and customer discovery.
//  */

// const paginateArray = (items, query = {}) => {
//     const { skip, limit, pagination } = buildPagination(query, items.length);
//     return {
//         items: items.slice(skip, skip + limit),
//         pagination,
//     };
// };

// export const getShopByOwner = async (ownerId, userContext) => {
//     const [barber, shop] = await loadBarberShop(ownerId);

//     const [photos, entitlements] = await Promise.all([
//         mediaService.getGalleryByShopId(shop._id),
//         entitlementService.resolveEntitlements(barber._id),
//     ]);
//     return serializeBarberProfile({ barber, shop, user: userContext, photos, entitlements });
// };

// const SHOP_UPDATE_FIELDS = [
//     'shopName',
//     'numberOfEmployees',
//     'location',
//     'bio',
//     'address',
//     'category',
//     'targetCustomers',
//     'facilities',
//     'availableDays',
//     'openTime',
//     'closeTime',
//     'breakTimes',
//     'isOpen',
// ];

// const BARBER_UPDATE_FIELDS = [
//     'firstName',
//     'lastName',
//     'gender',
//     'dateOfBirth',
//     'yearsOfExperience',
// ];

// const parseJsonIfString = (value) => {
//     if (typeof value !== 'string') return value;
//     return JSON.parse(value);
// };

// const parseArrayField = (value, fieldName) => {
//     if (Array.isArray(value)) return value;

//     if (typeof value === 'string') {
//         const trimmed = value.trim();
//         if (!trimmed) return [];

//         try {
//             const parsed = JSON.parse(trimmed);
//             return Array.isArray(parsed) ? parsed : [parsed];
//         } catch {
//             return [trimmed];
//         }
//     }

//     if (typeof value === 'object' && value !== null) return [value];

//     throw new Error(`${fieldName} must be an array`);
// };

// const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

// const parseBreakTimes = (value) => {
//     const rawBreakTimes = parseArrayField(value, 'breakTimes');

//     return rawBreakTimes.map((entry, index) => {
//         const parsed = parseJsonIfString(entry);
//         if (!parsed || typeof parsed !== 'object') {
//             throw new Error(`breakTimes[${index}] must be an object`);
//         }

//         const start = parsed.start;
//         const end = parsed.end;
//         if (!start || !end) {
//             throw new Error(`breakTimes[${index}] must include start and end`);
//         }

//         return { start, end };
//     });
// };

// const normalizeUpdateBody = (body = {}) => {
//     const normalized = { ...body };

//     normalized.facilities = normalized.amenities;
//     normalized.availableDays = normalized.workingDays;

//     if (normalized.workingHours) {
//         let parsedHours = normalized.workingHours;
//         if (typeof normalized.workingHours === 'string') {
//             try {
//                 parsedHours = JSON.parse(normalized.workingHours);
//             } catch {
//                 parsedHours = {};
//             }
//         }
//         normalized.openTime = normalized.openTime
//             || parsedHours?.openTime;
//         normalized.closeTime = normalized.closeTime
//             || parsedHours?.closeTime;
//     }

//     return normalized;
// };

// const validateAndAssign = (key, value, updateData, errors) => {
//     switch (key) {
//         case 'category': {
//             if (!ALL_SHOP_CATEGORIES.includes(value)) {
//                 errors.push(`Invalid category. Must be one of: ${ALL_SHOP_CATEGORIES.join(', ')}`);
//                 return;
//             }
//             updateData[key] = value;
//             return;
//         }

//         case 'gender': {
//             if (!ALL_GENDERS.includes(value)) {
//                 errors.push(`Invalid gender. Must be one of: ${ALL_GENDERS.join(', ')}`);
//                 return;
//             }
//             updateData[key] = value;
//             return;
//         }

//         case 'targetCustomers': {
//             if (!ALL_SERVICE_FOR.includes(value)) {
//                 errors.push(`Invalid targetCustomers. Must be one of: ${ALL_SERVICE_FOR.join(', ')}`);
//                 return;
//             }
//             updateData[key] = value;
//             return;
//         }

//         case 'numberOfEmployees': {
//             const n = Number.parseInt(value, 10);
//             if (Number.isNaN(n) || n < 1) {
//                 errors.push('numberOfEmployees must be >= 1');
//                 return;
//             }
//             updateData[key] = n;
//             return;
//         }

//         case 'yearsOfExperience': {
//             const n = Number.parseInt(value, 10);
//             if (Number.isNaN(n) || n < 0) {
//                 errors.push('yearsOfExperience must be >= 0');
//                 return;
//             }
//             updateData[key] = n;
//             return;
//         }

//         case 'availableDays': {
//             try {
//                 const days = parseArrayField(value, 'availableDays');
//                 const invalid = days.filter((day) => !DAYS_OF_WEEK.includes(day));
//                 if (invalid.length) {
//                     errors.push(`Invalid days: ${invalid.join(', ')}`);
//                     return;
//                 }
//                 updateData[key] = days;
//             } catch (err) {
//                 errors.push(err.message);
//             }
//             return;
//         }

//         case 'facilities': {
//             try {
//                 const amenities = parseArrayField(value, 'facilities');
//                 const invalid = amenities.filter((item) => !ALL_SHOP_AMENITIES.includes(item));
//                 if (invalid.length) {
//                     errors.push(`Invalid amenities: ${invalid.join(', ')}`);
//                     return;
//                 }
//                 updateData[key] = amenities;
//             } catch (err) {
//                 errors.push(err.message);
//             }
//             return;
//         }

//         case 'breakTimes': {
//             try {
//                 updateData[key] = parseBreakTimes(value);
//             } catch (err) {
//                 errors.push(err.message);
//             }
//             return;
//         }

//         case 'location': {
//             try {
//                 const location = parseJsonIfString(value);
//                 if (
//                     location?.type !== 'Point'
//                     || !Array.isArray(location.coordinates)
//                     || location.coordinates.length !== 2
//                 ) {
//                     errors.push('Invalid location format');
//                     return;
//                 }
//                 updateData[key] = location;
//             } catch {
//                 errors.push('Invalid location format');
//             }
//             return;
//         }

//         case 'dateOfBirth': {
//             const dt = new Date(value);
//             if (Number.isNaN(dt.getTime())) {
//                 errors.push('dateOfBirth must be a valid date');
//                 return;
//             }
//             updateData[key] = dt;
//             return;
//         }

//         default:
//             updateData[key] = value;
//     }
// };

// async function loadBarberShop(userId) {
//     const barber = await barberRepository.findByUserId(userId);
//     if (!barber) throw new NotFoundError('Barber profile');
//     const shop = await shopRepository.findByBarberId(barber._id);
//     if (!shop) throw new NotFoundError('Shop profile');
//     return [barber, shop];
// }

// export const updateBusinessInfo = async (ownerId, body, userContext) => {
//     const [barber, shop] = await loadBarberShop(ownerId);

//     const normalizedBody = normalizeUpdateBody(body);
//     const shopUpdateData = {};
//     const barberUpdateData = {};
//     const errors = [];

//     for (const [key, value] of Object.entries(normalizedBody)) {
//         const isShopField = SHOP_UPDATE_FIELDS.includes(key);
//         const isBarberField = BARBER_UPDATE_FIELDS.includes(key);
//         if (!isShopField && !isBarberField) continue;
//         if (value === undefined || value === null) continue;
//         if (typeof value === 'string' && value === '' && key !== 'bio') continue;

//         if (key === 'email') {
//             continue;
//         }

//         validateAndAssign(key, value, isBarberField ? barberUpdateData : shopUpdateData, errors);
//     }

//     const scheduleFieldsTouched = ['openTime', 'closeTime', 'breakTimes']
//         .some((field) => hasOwn(shopUpdateData, field));
//     if (scheduleFieldsTouched) {
//         const scheduleResult = normalizeShopSchedule({
//             openTime: shopUpdateData.openTime ?? shop.openTime,
//             closeTime: shopUpdateData.closeTime ?? shop.closeTime,
//             breakTimes: shopUpdateData.breakTimes ?? shop.breakTimes ?? [],
//         });

//         if (scheduleResult.error) {
//             errors.push(scheduleResult.error);
//         } else {
//             shopUpdateData.openTime = scheduleResult.value.openTime;
//             shopUpdateData.closeTime = scheduleResult.value.closeTime;
//             shopUpdateData.breakTimes = scheduleResult.value.breakTimes;
//         }
//     }

//     if (errors.length) throw new BadRequestError('Validation failed', errors);
//     if (Object.keys(shopUpdateData).length === 0 && Object.keys(barberUpdateData).length === 0) {
//         throw new BadRequestError('No valid fields provided for update');
//     }

//     let updated = shop;
//     let updatedBarber = barber;
//     if (Object.keys(shopUpdateData).length > 0) {
//         updated = await shopRepository.updateByBarberId(barber._id, shopUpdateData);
//     }
//     if (Object.keys(barberUpdateData).length > 0) {
//         updatedBarber = await barberRepository.updateById(barber._id, barberUpdateData);
//     }
//     const photos = await mediaService.getGalleryByShopId(updated._id);
//     await notificationEvents.notifyAccountUpdated({
//         userId: ownerId,
//         updateType: 'shop_profile',
//     });
//     if (hasOwn(shopUpdateData, 'isOpen') && Boolean(shop.isOpen) !== Boolean(updated.isOpen)) {
//         await notificationEvents.notifyShopStatusUpdated({
//             ownerId,
//             shopId: updated._id,
//             isOpen: updated.isOpen,
//         });
//     }

//     return {
//         shop: serializeBarberProfile({ barber: updatedBarber, shop: updated, user: userContext, photos }),
//         updatedFields: [...Object.keys(shopUpdateData), ...Object.keys(barberUpdateData)],
//     };
// };

// export const getPayoutDetails = async (ownerId) => {
//     const barber = await barberRepository.findByUserId(ownerId);
//     if (!barber) throw new NotFoundError('Barber profile');

//     return serializeBankDetails(barber);
// };

// export const updatePayoutDetails = async (ownerId, body) => {
//     const barber = await barberRepository.findByUserId(ownerId);
//     if (!barber) throw new NotFoundError('Barber profile');

//     const upiId = normalizePayoutString(body.upiId);
//     if (!upiId) {
//         throw new BadRequestError('upiId is required');
//     }
//     if (!isValidUpiId(upiId)) {
//         throw new BadRequestError('upiId must be a valid UPI ID');
//     }

//     const updateData = {
//         upiId,
//         payoutConfig: {
//             ...(barber.payoutConfig || {}),
//         },
//     };

//     if (hasOwn(body, 'accountHolderName')) {
//         updateData.accountHolderName = normalizePayoutString(body.accountHolderName);
//     }
//     if (hasOwn(body, 'bankName')) {
//         updateData.bankName = normalizePayoutString(body.bankName);
//     }
//     if (hasOwn(body, 'bankAccount')) {
//         updateData.bankAccount = normalizePayoutString(body.bankAccount);
//     }
//     if (hasOwn(body, 'ifsc')) {
//         updateData.ifsc = normalizePayoutString(body.ifsc, { uppercase: true });
//     }

//     const existingBankAccount = barber.bankAccount || null;
//     const existingIfsc = barber.ifsc || null;
//     const isBankAccountChanging = hasOwn(updateData, 'bankAccount')
//         && existingBankAccount !== updateData.bankAccount;
//     const isIfscChanging = hasOwn(updateData, 'ifsc')
//         && existingIfsc !== updateData.ifsc;
//     const isBankDetailsChanging = isBankAccountChanging || isIfscChanging;

//     if (isBankDetailsChanging) {
//         updateData.payoutConfig.verificationStatus = 'pending';
//         updateData.payoutConfig.verifiedAt = null;
//     }

//     const updated = await barberRepository.updateByUserId(ownerId, updateData);
//     await notificationEvents.notifyAccountUpdated({
//         userId: ownerId,
//         updateType: 'payout_details',
//     });

//     return serializeBankDetails(updated);
// };

// export const getShopInfoForCustomer = async (shopId) => {
//     const shop = await shopRepository.findById(shopId);
//     if (!shop) throw new NotFoundError('Shop');

//     const [singleServices, bundledServices, photos, ratingSummary] = await Promise.all([
//         serviceRepository.findByShopIdAndType(
//             shopId,
//             'single',
//             'serviceName duration finalPrice actualPrice offerPrice imageMediaId serviceFor serviceType',
//         ),
//         serviceRepository.findByShopIdAndType(
//             shopId,
//             'bundled',
//             'serviceName bundledServices totalDuration totalPrice finalPrice actualPrice offerPrice imageMediaId serviceFor serviceType',
//         ),
//         mediaService.getGalleryByShopId(shopId),
//         ratingRepository.getShopSummary(shopId),
//     ]);

//     const ratings = await ratingRepository.findByShop(shopId);
//     const formattedRatings = ratings.map(serializeRating);

//     const entitlements = await entitlementService.resolveEntitlements(shop.barberId);

//     return {
//         shop: serializeShopProfile(shop, { privateView: false, photos, entitlements }),
//         services: {
//             single: serializeServices(singleServices.map(normalizeServicePricing)),
//             bundled: serializeServices(bundledServices.map(normalizeServicePricing)),
//         },
//         ratings: { ...ratingSummary, details: formattedRatings },
//     };
// };

// export const getEmployeesByShopId = async (shopId) => {
//     const shop = await shopRepository.findById(shopId);
//     if (!shop) throw new NotFoundError('Shop');

//     const employeeRepository = (await import('../repositories/employee.repository.js')).default;
//     const employees = await employeeRepository.findByShopId(shopId, {});

//     // Return only public employee information
//     return employees
//         .filter((emp) => emp.isActive && !emp.deletedAt)
//         .map((emp) => serializeEmployee(emp, { publicView: true }))
//         .filter(Boolean);
// };

// const loadCustomer = async (userId) => {
//     const customer = await customerRepository.findByUserId(userId);
//     if (!customer) throw new NotFoundError('Customer profile');
//     return customer;
// };

// const assertShopExists = async (shopId) => {
//     const shop = await shopRepository.findById(shopId);
//     if (!shop) throw new NotFoundError('Shop');
//     return undefined;
// };

// export const getFavoriteShops = async (userId, query = {}) => {
//     const customer = await customerRepository.findFavoriteShopsByUserId(userId);
//     if (!customer) throw new NotFoundError('Customer profile');
//     return paginateArray((customer.favoriteShops || []).map(serializeShopSummary).filter(Boolean), query);
// };

// export const addFavoriteShop = async (userId, shopId) => {
//     await loadCustomer(userId);
//     await assertShopExists(shopId);
//     await customerRepository.addFavoriteShop(userId, shopId);

//     return {
//         favorite: true,
//         shopId,
//     };
// };

// export const removeFavoriteShop = async (userId, shopId) => {
//     await loadCustomer(userId);
//     await customerRepository.removeFavoriteShop(userId, shopId);

//     return {
//         favorite: false,
//         shopId,
//     };
// };

// export const searchShops = async (searchTerm) => {
//     return serviceCatalogService.searchShops(searchTerm);
// };

// export const getShopServices = async (shopId, queryFilters = {}) => {
//     await assertShopExists(shopId);

//     const filters = {};
//     if (queryFilters.serviceType) filters.serviceType = queryFilters.serviceType;
//     if (queryFilters.serviceFor) filters.serviceFor = queryFilters.serviceFor;
//     if (queryFilters.query) {
//         filters.serviceName = { $regex: new RegExp(escapeRegex(queryFilters.query), 'i') };
//     }

//     const total = await serviceRepository.countByShopId(shopId, filters);
//     const { skip, limit, pagination } = buildPagination(queryFilters, total);

//     const items = serializeServices(await serviceRepository.findByShopId(shopId, filters, { skip, limit }));
//     return { items, pagination };
// };

// export const getShops = async (query = {}) => {
//     if (query.query) {
//         return searchShops(query.query);
//     }

//     if (query.category) {
//         return enrichAndSortShopSummaries(await shopRepository.findByCategory(
//             query.category,
//             'shopName address location category targetCustomers coverMediaId facilities barberId openTime closeTime availableDays isOpen',
//         ));
//     }

//     if (query.longitude !== undefined && query.latitude !== undefined) {
//         return getNearbyShops([Number(query.longitude), Number(query.latitude)]);
//     }

//     return [];
// };

// export const getShopSummary = async () => {
//     const [summary = {}] = await shopRepository.aggregateSummary();
//     return {
//         totalShops: summary.totalShops || 0,
//         activeShops: summary.activeShops || 0,
//         inactiveShops: summary.inactiveShops || 0,
//         openShops: summary.openShops || 0,
//         closedShops: summary.closedShops || 0,
//     };
// };

// export const listBarbersForAdmin = async (query = {}) => {
//     const total = await barberRepository.countAdminDirectory(query);
//     const { skip, limit, pagination } = buildPagination(query, total);
//     const barbers = await barberRepository.findAdminDirectory(query, { skip, limit });

//     return {
//         items: barbers.map(serializeBarberDirectoryItem).filter(Boolean),
//         pagination,
//     };
// };

// export const getNearbyShops = async (coordinates) => {
//     return enrichAndSortShopSummaries(await shopRepository.findNearby(
//         coordinates,
//         config.shop.nearbyDistanceMeters,
//         'shopName address location category targetCustomers coverMediaId facilities barberId openTime closeTime availableDays isOpen',
//     ));
// };

// export const getNearbyServicesByGender = async (coordinates, gender, searchTerm) => {
//     const nearbyShops = await shopRepository.findNearby(
//         coordinates,
//         config.shop.nearbyDistanceMeters,
//         'shopName address location category targetCustomers coverMediaId facilities barberId openTime closeTime availableDays isOpen',
//     );

//     if (!nearbyShops.length) return { shops: [], services: [] };

//     const shopIds = nearbyShops.map((shop) => shop._id);
//     const serviceFilter = { serviceFor: { $regex: new RegExp(`^${escapeRegex(gender)}$`, 'i') } };
//     if (searchTerm) serviceFilter.serviceName = { $regex: new RegExp(escapeRegex(searchTerm), 'i') };

//     const services = await serviceRepository.findByShopIds(
//         shopIds,
//         serviceFilter,
//         'serviceName shopId serviceFor imageMediaId serviceType',
//     );

//     return {
//         shops: await enrichAndSortShopSummaries(nearbyShops),
//         services: serializeServices(services, { includeShop: true }),
//     };
// };

// async function enrichAndSortShopSummaries(shops = []) {
//     const enriched = await Promise.all(shops.map(async (shop) => {
//         const entitlements = await entitlementService.resolveEntitlements(shop.barberId);
//         const plainShop = {
//             ...shop,
//             badge: entitlements.badge,
//             visibilityTier: entitlements.visibilityTier,
//             priorityListingBoost: entitlements.priorityListingBoost,
//         };
//         return serializeShopSummary(plainShop);
//     }));

//     return enriched
//         .filter(Boolean)
//         .sort((a, b) => (b.priorityListingBoost || 0) - (a.priorityListingBoost || 0));
// }

// export const getBarberProfileForAdmin = async (barberId) => {
//     const barber = await barberRepository.findById(barberId);
//     if (!barber) throw new NotFoundError('Barber profile');

//     const user = await userRepository.findById(barber.userId);
//     if (!user) throw new NotFoundError('User');

//     const shop = await shopRepository.findByBarberId(barber._id);

//     // Fetch bookings to calculate metrics
//     let bookings = [];
//     if (shop) {
//         bookings = await bookingRepository.findByShopId(shop._id);
//     }
//     const totalBookingsCount = bookings.length;

//     // Paid Service Value = sum of totalAmount for paid/completed bookings
//     const paidBookings = bookings.filter(
//         (b) => b.paymentStatus === 'success' || b.paymentStatus === 'refunded' || b.status === 'completed',
//     );
//     const paidServiceValue = paidBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

//     // Fetch payouts to calculate total payouts (status is SUCCESS)
//     const payouts = await payoutRepository.findAllFiltered({ barberId: barber._id });
//     const successPayouts = payouts.filter((p) => p.status === 'SUCCESS');
//     const totalPayouts = successPayouts.reduce((sum, p) => sum + (p.amountInRupees || 0), 0);

//     // Fetch rating average
//     let averageRating = 0;
//     if (shop) {
//         const ratingSummary = await ratingRepository.getShopSummary(shop._id);
//         averageRating = ratingSummary.averageRating || 0;
//     }

//     // Recent bookings (limit to 10)
//     const sortedBookings = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//     const recentBookings = sortedBookings.slice(0, 10);

//     // Recent payouts (limit to 10)
//     const sortedPayouts = [...payouts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//     const recentPayouts = sortedPayouts.slice(0, 10);

//     // Fetch subscription details if shop exists
//     let serializedSub = null;
//     if (shop) {
//         const subscriptionService = (await import('./subscription/subscription.service.js')).default;
//         const subscription = await subscriptionService.ensureDefaultSubscription(barber._id);
//         const { serializeAdminSubscription } = await import('../serializers/subscription.serializer.js');
//         serializedSub = subscription ? serializeAdminSubscription({ subscription, shop }) : null;
//     }

//     // Fetch recent payments if shop exists
//     let recentPayments = [];
//     if (shop) {
//         const payments = await paymentRepository.findAll({ shopId: shop._id });
//         const sortedPayments = [...payments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//         recentPayments = sortedPayments.slice(0, 10);
//     }

//     // Calculate shop metrics if shop exists
//     let shopMetrics = null;
//     if (shop) {
//         const completedBookingsCount = bookings.filter((b) => b.status === 'completed').length;
//         const cancelledBookingsCount = bookings.filter((b) => b.status === 'cancelled').length;
//         const successRate = totalBookingsCount > 0 ? (completedBookingsCount / totalBookingsCount) * 100 : 0;
//         const averageRevenue = completedBookingsCount > 0 ? paidServiceValue / completedBookingsCount : 0;

//         shopMetrics = {
//             totalBookings: totalBookingsCount,
//             completedBookings: completedBookingsCount,
//             cancelledBookings: cancelledBookingsCount,
//             bookingSuccessRate: parseFloat(successRate.toFixed(2)),
//             totalRevenue: parseFloat(paidServiceValue.toFixed(2)),
//             averageRevenuePerBooking: parseFloat(averageRevenue.toFixed(2)),
//         };
//     }

//     const bankDetails = serializeBankDetails(barber);
//     const serializedShop = shop ? {
//         ...serializeShopProfile(shop, { privateView: false }),
//         subscription: serializedSub,
//         metrics: shopMetrics,
//         recentPayments: recentPayments.map((p) => serializePayment(p)).filter(Boolean),
//     } : null;

//     return {
//         id: barber._id.toString(),
//         barberName: `${barber.firstName || ''} ${barber.lastName || ''}`.trim(),
//         photoUrl: buildMediaUrl(barber.photoMediaId?.r2Key),
//         yearsOfExperience: barber.yearsOfExperience,
//         gender: barber.gender,
//         dateOfBirth: barber.dateOfBirth,
//         payout: bankDetails,
//         shop: serializedShop,
//         isActive: user.isActive,
//         createdAt: user.createdAt,
//         user: {
//             email: user.email,
//             phoneNumber: user.phoneNumber,
//             isActive: user.isActive,
//             lastLoginAt: user.lastLoginAt,
//         },
//         metrics: {
//             totalBookings: totalBookingsCount,
//             paidServiceValue: parseFloat(paidServiceValue.toFixed(2)),
//             totalPayouts: parseFloat(totalPayouts.toFixed(2)),
//             averageRating: parseFloat(averageRating.toFixed(1)),
//         },
//         recentBookings: recentBookings.map((b) => serializeBooking(b)).filter(Boolean),
//         recentPayouts: recentPayouts.map((p) => serializePayout(p)).filter(Boolean),
//     };
// };


import shopRepository from '../repositories/shop.repository.js';
import barberRepository from '../repositories/barber.repository.js';
import customerRepository from '../repositories/customer.repository.js';
import serviceRepository from '../repositories/service.repository.js';
import ratingRepository from '../repositories/rating.repository.js';
import userRepository from '../repositories/user.repository.js';
import bookingRepository from '../repositories/booking.repository.js';
import payoutRepository from '../repositories/payout.repository.js';
import paymentRepository from '../repositories/payment.repository.js';
import { serializeBooking } from '../serializers/booking.serializer.js';
import { serializePayout } from '../serializers/payout.serializer.js';
import { serializePayment } from '../serializers/payment.serializer.js';
import config from '../config/index.js';
import { BadRequestError, NotFoundError } from '../utils/api-error.js';
import { serializeBarberProfile, serializeBankDetails } from '../utils/barber-profile.utils.js';
import { escapeRegex } from '../utils/regex.utils.js';
import { serializeRating } from '../utils/rating-response.utils.js';
import { buildPagination } from '../utils/pagination.utils.js';
import { normalizeServicePricing } from '../utils/service-pricing.utils.js';
import { normalizeShopSchedule } from '../utils/shop-schedule.utils.js';
import { isValidUpiId, normalizePayoutString } from '../utils/payout-details.utils.js';
import notificationEvents from './notifications/notification-events.service.js';
import entitlementService from './subscription/entitlement.service.js';
import * as mediaService from './media/media.service.js';
import { buildMediaUrl } from './media/media-url.service.js';
import * as serviceCatalogService from './service-catalog.service.js';
import { serializeEmployee } from '../serializers/employee.serializer.js';
import { serializeServices } from '../serializers/service.serializer.js';
import { serializeBarberDirectoryItem, serializeShopProfile, serializeShopSummary } from '../serializers/shop.serializer.js';
import {
    ALL_SERVICE_FOR,
    ALL_GENDERS,
    ALL_SHOP_AMENITIES,
    ALL_SHOP_CATEGORIES,
    DAYS_OF_WEEK,
} from '../utils/constants.js';

/**
 * Shop service business logic for barber profile management and customer discovery.
 */

const paginateArray = (items, query = {}) => {
    const { skip, limit, pagination } = buildPagination(query, items.length);
    return {
        items: items.slice(skip, skip + limit),
        pagination,
    };
};

export const getShopByOwner = async (ownerId, userContext) => {
    const [barber, shop] = await loadBarberShop(ownerId);

    const [photos, entitlements] = await Promise.all([
        mediaService.getGalleryByShopId(shop._id),
        entitlementService.resolveEntitlements(barber._id),
    ]);
    return serializeBarberProfile({ barber, shop, user: userContext, photos, entitlements });
};

const SHOP_UPDATE_FIELDS = [
    'shopName',
    'numberOfEmployees',
    'location',
    'bio',
    'address',
    'category',
    'targetCustomers',
    'facilities',
    'availableDays',
    'openTime',
    'closeTime',
    'breakTimes',
    'isOpen',
];

const BARBER_UPDATE_FIELDS = [
    'firstName',
    'lastName',
    'gender',
    'dateOfBirth',
    'yearsOfExperience',
];

const parseJsonIfString = (value) => {
    if (typeof value !== 'string') return value;
    return JSON.parse(value);
};

const parseArrayField = (value, fieldName) => {
    if (Array.isArray(value)) return value;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];

        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            return [trimmed];
        }
    }

    if (typeof value === 'object' && value !== null) return [value];

    throw new Error(`${fieldName} must be an array`);
};

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const parseBreakTimes = (value) => {
    const rawBreakTimes = parseArrayField(value, 'breakTimes');

    return rawBreakTimes.map((entry, index) => {
        const parsed = parseJsonIfString(entry);
        if (!parsed || typeof parsed !== 'object') {
            throw new Error(`breakTimes[${index}] must be an object`);
        }

        const start = parsed.start;
        const end = parsed.end;
        if (!start || !end) {
            throw new Error(`breakTimes[${index}] must include start and end`);
        }

        return { start, end };
    });
};

const normalizeUpdateBody = (body = {}) => {
    const normalized = { ...body };

    normalized.facilities = normalized.amenities;
    normalized.availableDays = normalized.workingDays;

    if (normalized.workingHours) {
        let parsedHours = normalized.workingHours;
        if (typeof normalized.workingHours === 'string') {
            try {
                parsedHours = JSON.parse(normalized.workingHours);
            } catch {
                parsedHours = {};
            }
        }
        normalized.openTime = normalized.openTime
            || parsedHours?.openTime;
        normalized.closeTime = normalized.closeTime
            || parsedHours?.closeTime;
    }

    return normalized;
};

const validateAndAssign = (key, value, updateData, errors) => {
    switch (key) {
        case 'category': {
            if (!ALL_SHOP_CATEGORIES.includes(value)) {
                errors.push(`Invalid category. Must be one of: ${ALL_SHOP_CATEGORIES.join(', ')}`);
                return;
            }
            updateData[key] = value;
            return;
        }

        case 'gender': {
            if (!ALL_GENDERS.includes(value)) {
                errors.push(`Invalid gender. Must be one of: ${ALL_GENDERS.join(', ')}`);
                return;
            }
            updateData[key] = value;
            return;
        }

        case 'targetCustomers': {
            if (!ALL_SERVICE_FOR.includes(value)) {
                errors.push(`Invalid targetCustomers. Must be one of: ${ALL_SERVICE_FOR.join(', ')}`);
                return;
            }
            updateData[key] = value;
            return;
        }

        case 'numberOfEmployees': {
            const n = Number.parseInt(value, 10);
            if (Number.isNaN(n) || n < 1) {
                errors.push('numberOfEmployees must be >= 1');
                return;
            }
            updateData[key] = n;
            return;
        }

        case 'yearsOfExperience': {
            const n = Number.parseInt(value, 10);
            if (Number.isNaN(n) || n < 0) {
                errors.push('yearsOfExperience must be >= 0');
                return;
            }
            updateData[key] = n;
            return;
        }

        case 'availableDays': {
            try {
                const days = parseArrayField(value, 'availableDays');
                const invalid = days.filter((day) => !DAYS_OF_WEEK.includes(day));
                if (invalid.length) {
                    errors.push(`Invalid days: ${invalid.join(', ')}`);
                    return;
                }
                updateData[key] = days;
            } catch (err) {
                errors.push(err.message);
            }
            return;
        }

        case 'facilities': {
            try {
                const amenities = parseArrayField(value, 'facilities');
                const invalid = amenities.filter((item) => !ALL_SHOP_AMENITIES.includes(item));
                if (invalid.length) {
                    errors.push(`Invalid amenities: ${invalid.join(', ')}`);
                    return;
                }
                updateData[key] = amenities;
            } catch (err) {
                errors.push(err.message);
            }
            return;
        }

        case 'breakTimes': {
            try {
                updateData[key] = parseBreakTimes(value);
            } catch (err) {
                errors.push(err.message);
            }
            return;
        }

        case 'location': {
            try {
                const location = parseJsonIfString(value);
                if (
                    location?.type !== 'Point'
                    || !Array.isArray(location.coordinates)
                    || location.coordinates.length !== 2
                ) {
                    errors.push('Invalid location format');
                    return;
                }
                updateData[key] = location;
            } catch {
                errors.push('Invalid location format');
            }
            return;
        }

        case 'dateOfBirth': {
            const dt = new Date(value);
            if (Number.isNaN(dt.getTime())) {
                errors.push('dateOfBirth must be a valid date');
                return;
            }
            updateData[key] = dt;
            return;
        }

        default:
            updateData[key] = value;
    }
};

async function loadBarberShop(userId) {
    const barber = await barberRepository.findByUserId(userId);
    if (!barber) throw new NotFoundError('Barber profile');
    const shop = await shopRepository.findByBarberId(barber._id);
    if (!shop) throw new NotFoundError('Shop profile');
    return [barber, shop];
}

export const updateBusinessInfo = async (ownerId, body, userContext) => {
    const [barber, shop] = await loadBarberShop(ownerId);

    const normalizedBody = normalizeUpdateBody(body);
    const shopUpdateData = {};
    const barberUpdateData = {};
    const errors = [];

    for (const [key, value] of Object.entries(normalizedBody)) {
        const isShopField = SHOP_UPDATE_FIELDS.includes(key);
        const isBarberField = BARBER_UPDATE_FIELDS.includes(key);
        if (!isShopField && !isBarberField) continue;
        if (value === undefined || value === null) continue;
        if (typeof value === 'string' && value === '' && key !== 'bio') continue;

        if (key === 'email') {
            continue;
        }

        validateAndAssign(key, value, isBarberField ? barberUpdateData : shopUpdateData, errors);
    }

    const scheduleFieldsTouched = ['openTime', 'closeTime', 'breakTimes']
        .some((field) => hasOwn(shopUpdateData, field));
    if (scheduleFieldsTouched) {
        const scheduleResult = normalizeShopSchedule({
            openTime: shopUpdateData.openTime ?? shop.openTime,
            closeTime: shopUpdateData.closeTime ?? shop.closeTime,
            breakTimes: shopUpdateData.breakTimes ?? shop.breakTimes ?? [],
        });

        if (scheduleResult.error) {
            errors.push(scheduleResult.error);
        } else {
            shopUpdateData.openTime = scheduleResult.value.openTime;
            shopUpdateData.closeTime = scheduleResult.value.closeTime;
            shopUpdateData.breakTimes = scheduleResult.value.breakTimes;
        }
    }

    if (errors.length) throw new BadRequestError('Validation failed', errors);
    if (Object.keys(shopUpdateData).length === 0 && Object.keys(barberUpdateData).length === 0) {
        throw new BadRequestError('No valid fields provided for update');
    }

    let updated = shop;
    let updatedBarber = barber;
    if (Object.keys(shopUpdateData).length > 0) {
        updated = await shopRepository.updateByBarberId(barber._id, shopUpdateData);
    }
    if (Object.keys(barberUpdateData).length > 0) {
        updatedBarber = await barberRepository.updateById(barber._id, barberUpdateData);
    }
    const photos = await mediaService.getGalleryByShopId(updated._id);
    await notificationEvents.notifyAccountUpdated({
        userId: ownerId,
        updateType: 'shop_profile',
    });
    if (hasOwn(shopUpdateData, 'isOpen') && Boolean(shop.isOpen) !== Boolean(updated.isOpen)) {
        await notificationEvents.notifyShopStatusUpdated({
            ownerId,
            shopId: updated._id,
            isOpen: updated.isOpen,
        });
    }

    return {
        shop: serializeBarberProfile({ barber: updatedBarber, shop: updated, user: userContext, photos }),
        updatedFields: [...Object.keys(shopUpdateData), ...Object.keys(barberUpdateData)],
    };
};

export const getPayoutDetails = async (ownerId) => {
    const barber = await barberRepository.findByUserId(ownerId);
    if (!barber) throw new NotFoundError('Barber profile');

    return serializeBankDetails(barber);
};

export const updatePayoutDetails = async (ownerId, body) => {
    const barber = await barberRepository.findByUserId(ownerId);
    if (!barber) throw new NotFoundError('Barber profile');

    const upiId = normalizePayoutString(body.upiId);
    if (!upiId) {
        throw new BadRequestError('upiId is required');
    }
    if (!isValidUpiId(upiId)) {
        throw new BadRequestError('upiId must be a valid UPI ID');
    }

    const updateData = {
        upiId,
        payoutConfig: {
            ...(barber.payoutConfig || {}),
        },
    };

    if (hasOwn(body, 'accountHolderName')) {
        updateData.accountHolderName = normalizePayoutString(body.accountHolderName);
    }
    if (hasOwn(body, 'bankName')) {
        updateData.bankName = normalizePayoutString(body.bankName);
    }
    if (hasOwn(body, 'bankAccount')) {
        updateData.bankAccount = normalizePayoutString(body.bankAccount);
    }
    if (hasOwn(body, 'ifsc')) {
        updateData.ifsc = normalizePayoutString(body.ifsc, { uppercase: true });
    }

    const existingBankAccount = barber.bankAccount || null;
    const existingIfsc = barber.ifsc || null;
    const isBankAccountChanging = hasOwn(updateData, 'bankAccount')
        && existingBankAccount !== updateData.bankAccount;
    const isIfscChanging = hasOwn(updateData, 'ifsc')
        && existingIfsc !== updateData.ifsc;
    const isBankDetailsChanging = isBankAccountChanging || isIfscChanging;

    if (isBankDetailsChanging) {
        updateData.payoutConfig.verificationStatus = 'pending';
        updateData.payoutConfig.verifiedAt = null;
    }

    const updated = await barberRepository.updateByUserId(ownerId, updateData);
    await notificationEvents.notifyAccountUpdated({
        userId: ownerId,
        updateType: 'payout_details',
    });

    return serializeBankDetails(updated);
};

export const getShopInfoForCustomer = async (shopId) => {
    const shop = await shopRepository.findById(shopId);
    if (!shop) throw new NotFoundError('Shop');

    const [singleServices, bundledServices, photos, ratingSummary] = await Promise.all([
        serviceRepository.findByShopIdAndType(
            shopId,
            'single',
            'serviceName duration finalPrice actualPrice offerPrice imageMediaId serviceFor serviceType',
        ),
        serviceRepository.findByShopIdAndType(
            shopId,
            'bundled',
            'serviceName bundledServices totalDuration totalPrice finalPrice actualPrice offerPrice imageMediaId serviceFor serviceType',
        ),
        mediaService.getGalleryByShopId(shopId),
        ratingRepository.getShopSummary(shopId),
    ]);

    const ratings = await ratingRepository.findByShop(shopId);
    const formattedRatings = ratings.map(serializeRating);

    const entitlements = await entitlementService.resolveEntitlements(shop.barberId);

    return {
        shop: serializeShopProfile(shop, { privateView: false, photos, entitlements }),
        services: {
            single: serializeServices(singleServices.map(normalizeServicePricing)),
            bundled: serializeServices(bundledServices.map(normalizeServicePricing)),
        },
        ratings: { ...ratingSummary, details: formattedRatings },
    };
};

export const getEmployeesByShopId = async (shopId) => {
    const shop = await shopRepository.findById(shopId);
    if (!shop) throw new NotFoundError('Shop');

    const employeeRepository = (await import('../repositories/employee.repository.js')).default;
    const employees = await employeeRepository.findByShopId(shopId, {});

    // Return only public employee information
    return employees
        .filter((emp) => emp.isActive && !emp.deletedAt)
        .map((emp) => serializeEmployee(emp, { publicView: true }))
        .filter(Boolean);
};

const loadCustomer = async (userId) => {
    const customer = await customerRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError('Customer profile');
    return customer;
};

const assertShopExists = async (shopId) => {
    const shop = await shopRepository.findById(shopId);
    if (!shop) throw new NotFoundError('Shop');
    return undefined;
};

export const getFavoriteShops = async (userId, query = {}) => {
    const customer = await customerRepository.findFavoriteShopsByUserId(userId);
    if (!customer) throw new NotFoundError('Customer profile');
    return paginateArray((customer.favoriteShops || []).map(serializeShopSummary).filter(Boolean), query);
};

export const addFavoriteShop = async (userId, shopId) => {
    await loadCustomer(userId);
    await assertShopExists(shopId);
    await customerRepository.addFavoriteShop(userId, shopId);

    return {
        favorite: true,
        shopId,
    };
};

export const removeFavoriteShop = async (userId, shopId) => {
    await loadCustomer(userId);
    await customerRepository.removeFavoriteShop(userId, shopId);

    return {
        favorite: false,
        shopId,
    };
};

export const searchShops = async (searchTerm) => {
    return serviceCatalogService.searchShops(searchTerm);
};

export const getShopServices = async (shopId, queryFilters = {}) => {
    await assertShopExists(shopId);

    const filters = {};
    if (queryFilters.serviceType) filters.serviceType = queryFilters.serviceType;
    if (queryFilters.serviceFor) filters.serviceFor = queryFilters.serviceFor;
    if (queryFilters.query) {
        filters.serviceName = { $regex: new RegExp(escapeRegex(queryFilters.query), 'i') };
    }

    const total = await serviceRepository.countByShopId(shopId, filters);
    const { skip, limit, pagination } = buildPagination(queryFilters, total);

    const items = serializeServices(await serviceRepository.findByShopId(shopId, filters, { skip, limit }));
    return { items, pagination };
};

export const getShops = async (query = {}) => {
    if (query.query) {
        return searchShops(query.query);
    }

    if (query.category) {
        return enrichAndSortShopSummaries(await shopRepository.findByCategory(
            query.category,
            'shopName address location category targetCustomers coverMediaId facilities barberId openTime closeTime availableDays isOpen',
        ));
    }

    if (query.longitude !== undefined && query.latitude !== undefined) {
        return getNearbyShops([Number(query.longitude), Number(query.latitude)]);
    }

    return [];
};

export const getShopSummary = async () => {
    const [summary = {}] = await shopRepository.aggregateSummary();
    return {
        totalShops: summary.totalShops || 0,
        activeShops: summary.activeShops || 0,
        inactiveShops: summary.inactiveShops || 0,
        openShops: summary.openShops || 0,
        closedShops: summary.closedShops || 0,
    };
};

export const listBarbersForAdmin = async (query = {}) => {
    const total = await barberRepository.countAdminDirectory(query);
    const { skip, limit, pagination } = buildPagination(query, total);
    const barbers = await barberRepository.findAdminDirectory(query, { skip, limit });

    return {
        items: barbers.map(serializeBarberDirectoryItem).filter(Boolean),
        pagination,
    };
};

export const getNearbyShops = async (coordinates) => {
    return enrichAndSortShopSummaries(await shopRepository.findNearby(
        coordinates,
        config.shop.nearbyDistanceMeters,
        'shopName address location category targetCustomers coverMediaId facilities barberId openTime closeTime availableDays isOpen',
    ));
};

export const getNearbyServicesByGender = async (coordinates, gender, searchTerm) => {
    const nearbyShops = await shopRepository.findNearby(
        coordinates,
        config.shop.nearbyDistanceMeters,
        'shopName address location category targetCustomers coverMediaId facilities barberId openTime closeTime availableDays isOpen',
    );

    if (!nearbyShops.length) return { shops: [], services: [] };

    const shopIds = nearbyShops.map((shop) => shop._id);
    const serviceFilter = { serviceFor: { $regex: new RegExp(`^${escapeRegex(gender)}$`, 'i') } };
    if (searchTerm) serviceFilter.serviceName = { $regex: new RegExp(escapeRegex(searchTerm), 'i') };

    const services = await serviceRepository.findByShopIds(
        shopIds,
        serviceFilter,
        'serviceName shopId serviceFor imageMediaId serviceType',
    );

    // BUGFIX: findByShopIds only populates `imageMediaId` — `shopId` comes
    // back as a bare (unpopulated) ObjectId. serializeService's
    // `includeShop: true` branch requires shopId to already be a full shop
    // object (it checks `typeof shopId === 'object'`, which a raw ObjectId
    // technically satisfies too, so this failed silently rather than
    // throwing — every embedded `service.shop` came back as an object with
    // no `id` and every other field null).
    //
    // Rather than a second DB round-trip (`.populate('shopId')`), reuse the
    // shop docs already fetched above — same data, one query total, and
    // guarantees the embedded shop matches exactly what's in the `shops`
    // array of this same response.
    const shopsById = new Map(nearbyShops.map((shop) => [String(shop._id), shop]));
    const servicesWithShop = services.map((service) => ({
        ...service,
        shopId: shopsById.get(String(service.shopId)) || service.shopId,
    }));

    return {
        shops: await enrichAndSortShopSummaries(nearbyShops),
        services: serializeServices(servicesWithShop, { includeShop: true }),
    };
};

async function enrichAndSortShopSummaries(shops = []) {
    const enriched = await Promise.all(shops.map(async (shop) => {
        const entitlements = await entitlementService.resolveEntitlements(shop.barberId);
        const plainShop = {
            ...shop,
            badge: entitlements.badge,
            visibilityTier: entitlements.visibilityTier,
            priorityListingBoost: entitlements.priorityListingBoost,
        };
        return serializeShopSummary(plainShop);
    }));

    return enriched
        .filter(Boolean)
        .sort((a, b) => (b.priorityListingBoost || 0) - (a.priorityListingBoost || 0));
}

export const getBarberProfileForAdmin = async (barberId) => {
    const barber = await barberRepository.findById(barberId);
    if (!barber) throw new NotFoundError('Barber profile');

    const user = await userRepository.findById(barber.userId);
    if (!user) throw new NotFoundError('User');

    const shop = await shopRepository.findByBarberId(barber._id);

    // Fetch bookings to calculate metrics
    let bookings = [];
    if (shop) {
        bookings = await bookingRepository.findByShopId(shop._id);
    }
    const totalBookingsCount = bookings.length;

    // Paid Service Value = sum of totalAmount for paid/completed bookings
    const paidBookings = bookings.filter(
        (b) => b.paymentStatus === 'success' || b.paymentStatus === 'refunded' || b.status === 'completed',
    );
    const paidServiceValue = paidBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    // Fetch payouts to calculate total payouts (status is SUCCESS)
    const payouts = await payoutRepository.findAllFiltered({ barberId: barber._id });
    const successPayouts = payouts.filter((p) => p.status === 'SUCCESS');
    const totalPayouts = successPayouts.reduce((sum, p) => sum + (p.amountInRupees || 0), 0);

    // Fetch rating average
    let averageRating = 0;
    if (shop) {
        const ratingSummary = await ratingRepository.getShopSummary(shop._id);
        averageRating = ratingSummary.averageRating || 0;
    }

    // Recent bookings (limit to 10)
    const sortedBookings = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentBookings = sortedBookings.slice(0, 10);

    // Recent payouts (limit to 10)
    const sortedPayouts = [...payouts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentPayouts = sortedPayouts.slice(0, 10);

    // Fetch subscription details if shop exists
    let serializedSub = null;
    if (shop) {
        const subscriptionService = (await import('./subscription/subscription.service.js')).default;
        const subscription = await subscriptionService.ensureDefaultSubscription(barber._id);
        const { serializeAdminSubscription } = await import('../serializers/subscription.serializer.js');
        serializedSub = subscription ? serializeAdminSubscription({ subscription, shop }) : null;
    }

    // Fetch recent payments if shop exists
    let recentPayments = [];
    if (shop) {
        const payments = await paymentRepository.findAll({ shopId: shop._id });
        const sortedPayments = [...payments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        recentPayments = sortedPayments.slice(0, 10);
    }

    // Calculate shop metrics if shop exists
    let shopMetrics = null;
    if (shop) {
        const completedBookingsCount = bookings.filter((b) => b.status === 'completed').length;
        const cancelledBookingsCount = bookings.filter((b) => b.status === 'cancelled').length;
        const successRate = totalBookingsCount > 0 ? (completedBookingsCount / totalBookingsCount) * 100 : 0;
        const averageRevenue = completedBookingsCount > 0 ? paidServiceValue / completedBookingsCount : 0;

        shopMetrics = {
            totalBookings: totalBookingsCount,
            completedBookings: completedBookingsCount,
            cancelledBookings: cancelledBookingsCount,
            bookingSuccessRate: parseFloat(successRate.toFixed(2)),
            totalRevenue: parseFloat(paidServiceValue.toFixed(2)),
            averageRevenuePerBooking: parseFloat(averageRevenue.toFixed(2)),
        };
    }

    const bankDetails = serializeBankDetails(barber);
    const serializedShop = shop ? {
        ...serializeShopProfile(shop, { privateView: false }),
        subscription: serializedSub,
        metrics: shopMetrics,
        recentPayments: recentPayments.map((p) => serializePayment(p)).filter(Boolean),
    } : null;

    return {
        id: barber._id.toString(),
        barberName: `${barber.firstName || ''} ${barber.lastName || ''}`.trim(),
        photoUrl: buildMediaUrl(barber.photoMediaId?.r2Key),
        yearsOfExperience: barber.yearsOfExperience,
        gender: barber.gender,
        dateOfBirth: barber.dateOfBirth,
        payout: bankDetails,
        shop: serializedShop,
        isActive: user.isActive,
        createdAt: user.createdAt,
        user: {
            email: user.email,
            phoneNumber: user.phoneNumber,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
        },
        metrics: {
            totalBookings: totalBookingsCount,
            paidServiceValue: parseFloat(paidServiceValue.toFixed(2)),
            totalPayouts: parseFloat(totalPayouts.toFixed(2)),
            averageRating: parseFloat(averageRating.toFixed(1)),
        },
        recentBookings: recentBookings.map((b) => serializeBooking(b)).filter(Boolean),
        recentPayouts: recentPayouts.map((p) => serializePayout(p)).filter(Boolean),
    };
};