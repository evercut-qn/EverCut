import { sanitizeForResponse, toIdString, toPlainObject } from './core.serializer.js';
import { serializePhotos } from './photo.serializer.js';
import { serializeUser } from './user.serializer.js';

const compact = (value) => Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
);

const maskBankAccount = (bankAccount) => {
    if (!bankAccount) return null;
    const digits = String(bankAccount).replace(/\D/g, '');
    if (digits.length <= 4) return digits || null;
    return `******${digits.slice(-4)}`;
};

const toBreakTimings = (breakTimes = []) => (
    Array.isArray(breakTimes)
        ? breakTimes.map((entry) => {
            const start = entry?.start ?? entry?.startsAt ?? null;
            const end = entry?.end ?? entry?.endsAt ?? null;
            return { start, end, startsAt: start, endsAt: end };
        })
        : []
);

const toShopImages = (photos = []) => (
    serializePhotos(photos)
        .sort((a, b) => {
            const left = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
            const right = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
            return left - right;
        })
        .map((photo) => photo.photoUrl)
        .filter(Boolean)
);

export const serializePayoutConfig = (payoutConfig = {}) => {
    const plain = sanitizeForResponse(payoutConfig || {});
    return {
        bankAccountLast4: maskBankAccount(payoutConfig?.bankAccount || plain?.bankAccountLast4),
        ifsc: plain?.ifsc || null,
        beneficiaryId: plain?.beneficiaryId || null,
        beneficiaryCreatedAt: plain?.beneficiaryCreatedAt || null,
        verifiedAt: plain?.verifiedAt || null,
        verificationStatus: plain?.verificationStatus || 'unverified',
    };
};

export const serializeUpiDetails = (shop) => {
    const plain = sanitizeForResponse(toPlainObject(shop));
    if (!plain) return null;

    const payoutConfig = toPlainObject(shop)?.payoutConfig || {};
    const verificationStatus = plain.payoutConfig?.verificationStatus
        || (plain.upiId && plain.accountHolderName ? 'verified' : 'unverified');
    const isVerified = verificationStatus === 'verified';

    return {
        accountHolderName: plain.accountHolderName || null,
        bankName: plain.bankName || null,
        upiId: plain.upiId || null,
        upiAddress: plain.upiId || null,
        bankAccountLast4: maskBankAccount(payoutConfig.bankAccount),
        ifsc: plain.payoutConfig?.ifsc || null,
        isVerified,
        verificationStatus,
        beneficiaryCreatedAt: plain.payoutConfig?.beneficiaryCreatedAt || null,
        verifiedAt: plain.payoutConfig?.verifiedAt || null,
    };
};

export const serializeBankDetails = (shop) => {
    const raw = toPlainObject(shop);
    const plain = sanitizeForResponse(raw);
    if (!plain) return null;

    const verificationStatus = plain.payoutConfig?.verificationStatus || 'pending';
    const isVerified = verificationStatus === 'verified';

    return {
        accountHolderName: plain.accountHolderName || null,
        bankName: plain.bankName || null,
        bankAccountLast4: maskBankAccount(raw?.payoutConfig?.bankAccount),
        ifsc: plain.payoutConfig?.ifsc || null,
        upiId: plain.upiId || null,
        verificationStatus,
        isVerified,
        verifiedAt: plain.payoutConfig?.verifiedAt || null,
        beneficiaryId: plain.payoutConfig?.beneficiaryId || null,
        beneficiaryCreatedAt: plain.payoutConfig?.beneficiaryCreatedAt || null,
        canReceivePayouts: isVerified,
    };
};

export const serializeShopSummary = (shop) => {
    const plain = sanitizeForResponse(toPlainObject(shop));
    if (!plain) return null;

    return compact({
        id: plain.id,
        shopId: plain.id,
        shopName: plain.shopName ?? null,
        address: plain.address ?? null,
        location: plain.location ?? null,
        category: plain.category ?? null,
        targetCustomers: plain.targetCustomers ?? null,
        coverUrl: plain.coverUrl ?? null,
        facilities: plain.facilities ?? [],
        isOpen: plain.isOpen,
        openTime: plain.openTime,
        closeTime: plain.closeTime,
        availableDays: plain.availableDays,
    });
};

export const serializeShopProfile = (shop, options = {}) => {
    const plain = sanitizeForResponse(toPlainObject(shop));
    if (!plain) return null;

    const owner = options.userContext
        ? serializeUser(options.userContext)
        : undefined;

    return compact({
        id: plain.id,
        shopId: plain.id,
        ownerId: plain.ownerId?.id || toIdString(plain.ownerId),
        owner,
        shopName: plain.shopName ?? null,
        ownerName: plain.ownerName ?? null,
        ownerFirstName: plain.ownerFirstName ?? null,
        ownerLastName: plain.ownerLastName ?? null,
        ownerGender: plain.ownerGender ?? null,
        ownerDateOfBirth: plain.ownerDateOfBirth ?? null,
        category: plain.category ?? null,
        targetCustomers: plain.targetCustomers ?? null,
        accountHolderName: options.privateView ? (plain.accountHolderName ?? null) : undefined,
        bankName: options.privateView ? (plain.bankName ?? null) : undefined,
        upiId: options.privateView ? (plain.upiId ?? null) : undefined,
        payoutConfig: options.privateView ? serializePayoutConfig(toPlainObject(shop)?.payoutConfig || {}) : undefined,
        bio: plain.bio ?? '',
        address: plain.address ?? null,
        location: plain.location ?? null,
        numberOfEmployees: plain.numberOfEmployees ?? null,
        yearsOfExperience: plain.yearsOfExperience ?? null,
        facilities: plain.facilities ?? [],
        availableDays: plain.availableDays ?? [],
        openTime: plain.openTime ?? null,
        closeTime: plain.closeTime ?? null,
        breakTimes: plain.breakTimes ?? [],
        coverUrl: plain.coverUrl ?? null,
        ownerPhotoUrl: plain.ownerPhotoUrl ?? null,
        isOpen: plain.isOpen ?? true,
        missedConfirmations: {
            count: plain.missedConfirmationCount || 0,
            lastMissedAt: plain.lastMissedConfirmationAt || null,
        },
        photos: options.photos ? serializePhotos(options.photos) : undefined,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
    });
};

export const serializeBarberProfile = (shop, userContext = {}, { photos } = {}) => {
    const profile = serializeShopProfile(shop, {
        userContext,
        photos,
        privateView: true,
    });
    if (!profile) return null;

    return {
        ...profile,
        firstName: profile.ownerFirstName,
        lastName: profile.ownerLastName,
        gender: profile.ownerGender,
        dateOfBirth: profile.ownerDateOfBirth,
        email: userContext?.email || null,
        phoneNumber: userContext?.phoneNumber || null,
        shopOwner: profile.ownerName,
        shopCategory: profile.category,
        businessCategory: profile.category,
        shopLocation: profile.address,
        amenities: profile.facilities || [],
        workingDays: profile.availableDays || [],
        workingHours: {
            openTime: profile.openTime,
            closeTime: profile.closeTime,
            opensAt: profile.openTime,
            closesAt: profile.closeTime,
        },
        breakTimings: toBreakTimings(profile.breakTimes),
        upiAddress: profile.upiId,
        upiDetails: serializeUpiDetails(shop),
        coverImage: profile.coverUrl,
        photoUrl: profile.ownerPhotoUrl || null,
        profilePhotoUrl: profile.ownerPhotoUrl || null,
        ownerPhotoUrl: profile.ownerPhotoUrl || null,
        shopImages: toShopImages(photos),
    };
};
