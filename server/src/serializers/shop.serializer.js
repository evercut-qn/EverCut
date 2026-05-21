import { sanitizeForResponse, toPlainObject } from './core.serializer.js';
import { serializeMediaList } from './media.serializer.js';
import { serializeUser } from './user.serializer.js';
import { buildMediaUrl } from '../services/media/media-url.service.js';

const compact = (value) => Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
);

const maskBankAccount = (bankAccount) => {
    if (!bankAccount) return null;
    const digits = String(bankAccount).replace(/\D/g, '');
    if (digits.length <= 4) return digits || null;
    return `******${digits.slice(-4)}`;
};

const toBreakTimes = (breakTimes = []) => (
    Array.isArray(breakTimes)
        ? breakTimes.map((entry) => {
            const start = entry?.start ?? entry?.startsAt ?? null;
            const end = entry?.end ?? entry?.endsAt ?? null;
            return { start, end };
        })
        : []
);

const toWorkingHours = (plain = {}) => ({
    openTime: plain.openTime ?? null,
    closeTime: plain.closeTime ?? null,
});

const serializeOwner = (barber = {}, userContext = null, privateView = false) => {
    const rawBarber = toPlainObject(barber) || {};
    const plain = sanitizeForResponse(rawBarber) || {};
    const user = userContext ? serializeUser(userContext) : {};
    if (!Object.keys(plain).length && !Object.keys(user).length) return {};

    return compact({
        id: user?.id,
        firstName: plain.firstName ?? null,
        lastName: plain.lastName ?? null,
        gender: plain.gender ?? null,
        dateOfBirth: privateView ? (plain.dateOfBirth ?? null) : undefined,
        email: privateView ? (user?.email ?? null) : undefined,
        phoneNumber: privateView ? (user?.phoneNumber ?? null) : undefined,
        photoUrl: buildMediaUrl(rawBarber.photoR2Key),
    });
};

export const serializeBankDetails = (barber) => {
    const raw = toPlainObject(barber);
    const plain = sanitizeForResponse(raw);
    if (!plain) return null;

    const verificationStatus = plain.payoutConfig?.verificationStatus || 'pending';
    const isVerified = verificationStatus === 'verified';

    return {
        accountHolderName: plain.accountHolderName || null,
        bankName: plain.bankName || null,
        upiId: plain.upiId || null,
        bankAccountLast4: maskBankAccount(raw?.bankAccount),
        ifsc: plain.ifsc || null,
        verificationStatus,
        isVerified,
        verifiedAt: plain.payoutConfig?.verifiedAt || null,
        beneficiaryId: plain.payoutConfig?.beneficiaryId || null,
        beneficiaryCreatedAt: plain.payoutConfig?.beneficiaryCreatedAt || null,
        canReceivePayouts: isVerified,
    };
};

export const serializeShopSummary = (shop) => {
    const raw = toPlainObject(shop);
    const plain = sanitizeForResponse(raw);
    if (!plain) return null;

    return compact({
        id: plain.id,
        shopName: plain.shopName ?? null,
        address: plain.address ?? null,
        location: plain.location ?? null,
        category: plain.category ?? null,
        targetCustomers: plain.targetCustomers ?? null,
        coverUrl: buildMediaUrl(raw.coverR2Key),
        amenities: plain.facilities ?? [],
        isOpen: plain.isOpen,
        workingDays: plain.availableDays,
        workingHours: toWorkingHours(plain),
        badge: plain.badge,
        visibilityTier: plain.visibilityTier,
        priorityListingBoost: plain.priorityListingBoost,
    });
};

export const serializeShopProfile = (shop, options = {}) => {
    const raw = toPlainObject(shop);
    const plain = sanitizeForResponse(raw);
    if (!plain) return null;

    const owner = serializeOwner(options.barber, options.userContext, options.privateView);

    return compact({
        id: plain.id,
        owner: Object.keys(owner).length > 0 ? owner : undefined,
        shopName: plain.shopName ?? null,
        category: plain.category ?? null,
        targetCustomers: plain.targetCustomers ?? null,
        payout: options.privateView ? serializeBankDetails(options.barber) : undefined,
        bio: plain.bio ?? '',
        address: plain.address ?? null,
        location: plain.location ?? null,
        numberOfEmployees: plain.numberOfEmployees ?? null,
        yearsOfExperience: options.privateView ? (sanitizeForResponse(toPlainObject(options.barber))?.yearsOfExperience ?? null) : undefined,
        amenities: plain.facilities ?? [],
        workingDays: plain.availableDays ?? [],
        workingHours: toWorkingHours(plain),
        breakTimes: toBreakTimes(plain.breakTimes),
        coverUrl: buildMediaUrl(raw.coverR2Key),
        isOpen: plain.isOpen ?? true,
        missedConfirmations: {
            count: plain.missedConfirmationCount || 0,
            lastMissedAt: plain.lastMissedConfirmationAt || null,
        },
        badge: options.entitlements?.badge ?? plain.badge,
        visibilityTier: options.entitlements?.visibilityTier ?? plain.visibilityTier,
        supportTier: options.entitlements?.supportTier ?? plain.supportTier,
        priorityListingBoost: options.entitlements?.priorityListingBoost ?? plain.priorityListingBoost,
        photos: options.photos ? serializeMediaList(options.photos) : undefined,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    });
};

export const serializeBarberProfile = ({ barber, shop, user, photos, entitlements } = {}) => {
    const profile = serializeShopProfile(shop, {
        barber,
        userContext: user,
        photos,
        entitlements,
        privateView: true,
    });
    if (!profile) return null;

    return profile;
};
