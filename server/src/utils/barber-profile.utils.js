const toPlainObject = (value) => {
    if (!value) return null;
    return typeof value.toObject === 'function' ? value.toObject() : { ...value };
};

const LEGACY_SHOP_CONTACT_FIELDS = [
    ['email', 'Id'].join(''),
    ['phone', 'Number'].join(''),
];

const toBreakTimings = (breakTimes = []) => {
    if (!Array.isArray(breakTimes)) return [];

    return breakTimes.map((entry) => {
        const start = entry?.start ?? entry?.startsAt ?? null;
        const end = entry?.end ?? entry?.endsAt ?? null;

        return {
            start,
            end,
            startsAt: start,
            endsAt: end,
        };
    });
};

const toShopImages = (photos = []) => {
    if (!Array.isArray(photos)) return [];

    return [...photos]
        .sort((a, b) => {
            const left = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
            const right = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
            return left - right;
        })
        .map((photo) => photo?.photoUrl || photo?.path || photo?.url || null)
        .filter(Boolean);
};

const maskBankAccount = (bankAccount) => {
    if (!bankAccount) return null;
    const digits = String(bankAccount).replace(/\D/g, '');
    if (digits.length <= 4) return digits || null;
    return `******${digits.slice(-4)}`;
};

const serializePayoutConfig = (payoutConfig = {}) => ({
    bankAccountLast4: maskBankAccount(payoutConfig.bankAccount),
    ifsc: payoutConfig.ifsc || null,
    beneficiaryId: payoutConfig.beneficiaryId || null,
    beneficiaryCreatedAt: payoutConfig.beneficiaryCreatedAt || null,
    verifiedAt: payoutConfig.verifiedAt || null,
    verificationStatus: payoutConfig.verificationStatus || 'unverified',
});

export const serializeUpiDetails = (shop) => {
    const plainShop = toPlainObject(shop);
    if (!plainShop) return null;

    const upiAddress = plainShop.upiId || null;
    const payoutConfig = plainShop.payoutConfig || {};
    const verificationStatus = payoutConfig.verificationStatus
        || (upiAddress && plainShop.accountHolderName ? 'verified' : 'unverified');
    const isVerified = verificationStatus === 'verified';

    return {
        accountHolderName: plainShop.accountHolderName || null,
        bankName: plainShop.bankName || null,
        upiId: upiAddress,
        upiAddress,
        bankAccountLast4: maskBankAccount(payoutConfig.bankAccount),
        ifsc: payoutConfig.ifsc || null,
        isVerified,
        verificationStatus,
        beneficiaryCreatedAt: payoutConfig.beneficiaryCreatedAt || null,
        verifiedAt: payoutConfig.verifiedAt || null,
    };
};

/**
 * Returns the canonical shop document plus the onboarding-friendly aliases
 * used by the updated barber onboarding/profile flow.
 */
export const serializeBarberProfile = (shop, userContext = {}, { photos } = {}) => {
    const plainShop = toPlainObject(shop);
    if (!plainShop) return null;

    const safeShop = { ...plainShop };
    delete safeShop.pinHash;
    delete safeShop.coverCloudinaryId;
    delete safeShop.ownerPhotoCloudinaryId;
    for (const field of LEGACY_SHOP_CONTACT_FIELDS) {
        delete safeShop[field];
    }
    safeShop.payoutConfig = serializePayoutConfig(safeShop.payoutConfig);

    return {
        ...safeShop,
        firstName: safeShop.ownerFirstName,
        lastName: safeShop.ownerLastName,
        gender: safeShop.ownerGender,
        dateOfBirth: safeShop.ownerDateOfBirth,
        email: userContext?.email || null,
        phoneNumber: userContext?.phoneNumber || null,
        shopOwner: safeShop.ownerName,
        shopCategory: safeShop.category,
        businessCategory: safeShop.category,
        shopLocation: safeShop.address,
        amenities: safeShop.facilities || [],
        workingDays: safeShop.availableDays || [],
        workingHours: {
            openTime: safeShop.openTime,
            closeTime: safeShop.closeTime,
            opensAt: safeShop.openTime,
            closesAt: safeShop.closeTime,
        },
        breakTimings: toBreakTimings(safeShop.breakTimes),
        upiAddress: safeShop.upiId,
        upiDetails: serializeUpiDetails(safeShop),
        coverImage: safeShop.coverUrl,
        photoUrl: safeShop.ownerPhotoUrl || null,
        profilePhotoUrl: safeShop.ownerPhotoUrl || null,
        ownerPhotoUrl: safeShop.ownerPhotoUrl || null,
        shopImages: toShopImages(photos),
    };
};
