/**
 * Application-wide constants and enum-like values.
 * Import from here instead of scattering magic strings.
 */

// ---------------------------------------------------------------------------
// User Roles
// ---------------------------------------------------------------------------

export const ROLES = Object.freeze({
    CUSTOMER: 'CUSTOMER',
    BARBER: 'BARBER',
    ADMIN: 'ADMIN',
});

export const ALL_ROLES = Object.values(ROLES);

// ---------------------------------------------------------------------------
// Booking Statuses
// ---------------------------------------------------------------------------

export const BOOKING_STATUS = Object.freeze({
    PENDING: 'pending',
    AWAITING_CONFIRMATION: 'awaiting_confirmation',
    CONFIRMED: 'confirmed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    NO_SHOW: 'no-show',
});

export const ALL_BOOKING_STATUSES = Object.values(BOOKING_STATUS);

// ---------------------------------------------------------------------------
// Payment Statuses
// ---------------------------------------------------------------------------

export const PAYMENT_STATUS = Object.freeze({
    PENDING: 'pending',
    INITIATED: 'initiated',
    SUCCESS: 'success',
    FAILED: 'failed',
    REFUND_PENDING: 'refund_pending',
    REFUNDED: 'refunded',
    REFUND_FAILED: 'refund_failed',
});

export const ALL_PAYMENT_STATUSES = Object.values(PAYMENT_STATUS);

export const PAYMENT_TRANSACTION_STATUS = Object.freeze({
    INITIATED: 'initiated',
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    EXPIRED: 'expired',
    REFUND_PENDING: 'refund_pending',
    REFUNDED: 'refunded',
    REFUND_FAILED: 'refund_failed',
});

export const ALL_PAYMENT_TRANSACTION_STATUSES = Object.values(PAYMENT_TRANSACTION_STATUS);

export const PAYOUT_STATUS = Object.freeze({
    NOT_INITIATED: 'not_initiated',
    INITIATED: 'initiated',
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REVERSED: 'reversed',
});

export const ALL_PAYOUT_STATUSES = Object.values(PAYOUT_STATUS);

export const PAYOUT_TRANSACTION_STATUS = Object.freeze({
    INITIATED: 'INITIATED',
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    REVERSED: 'REVERSED',
});

export const ALL_PAYOUT_TRANSACTION_STATUSES = Object.values(PAYOUT_TRANSACTION_STATUS);

export const PHONEPE_WEBHOOK_EVENTS = Object.freeze({
    ORDER_COMPLETED: 'checkout.order.completed',
    ORDER_FAILED: 'checkout.order.failed',
    REFUND_COMPLETED: 'pg.refund.completed',
    REFUND_FAILED: 'pg.refund.failed',
});

export const CASHFREE_WEBHOOK_EVENTS = Object.freeze({
    TRANSFER_SUCCESS: 'TRANSFER_SUCCESS',
    TRANSFER_FAILED: 'TRANSFER_FAILED',
    TRANSFER_REVERSED: 'TRANSFER_REVERSED',
});

export const PAYMENT_GATEWAYS = Object.freeze({
    PHONEPE: 'phonepe',
    RAZORPAY: 'razorpay',
    CASHFREE: 'cashfree',
    MANUAL: 'manual',
});

export const REFUND_TYPE = Object.freeze({
    CANCELLATION: 'cancellation',
    MANUAL: 'manual',
});

export const PAYOUT_MODES = Object.freeze({
    UPI: 'upi',
    IMPS: 'imps',
    NEFT: 'neft',
    RTGS: 'rtgs',
    BANK: 'banktransfer',
});


// ---------------------------------------------------------------------------
// Shop Categories
// ---------------------------------------------------------------------------

export const SHOP_CATEGORY = Object.freeze({
    SALON: 'Hair Salon',
    BEAUTY_PARLOUR: 'Beauty Salon',
    BARBER: 'Barber Shop',
    DOOR_STEP: 'Doorstep Service',
});

export const ALL_SHOP_CATEGORIES = Object.values(SHOP_CATEGORY);

// ---------------------------------------------------------------------------
// Shop Amenities
// ---------------------------------------------------------------------------

export const SHOP_AMENITY = Object.freeze({
    AIR_CONDITIONING: 'Air Conditioning',
    WAITING_AREA: 'Waiting Area',
    DRINKING_WATER: 'Drinking Water',
    WASHROOMS: 'Washrooms',
    PARKING_AREA: 'Parking Area',
    WIFI: 'Wi-Fi',
    CHARGING_POINTS: 'Charging Points',
});

export const ALL_SHOP_AMENITIES = Object.values(SHOP_AMENITY);

// ---------------------------------------------------------------------------
// Days of Week
// ---------------------------------------------------------------------------

export const DAYS_OF_WEEK = Object.freeze([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
]);

// ---------------------------------------------------------------------------
// Service Types
// ---------------------------------------------------------------------------

export const SERVICE_TYPE = Object.freeze({
    SINGLE: 'single',
    BUNDLED: 'bundled',
});

export const ALL_SERVICE_TYPES = Object.values(SERVICE_TYPE);

// ---------------------------------------------------------------------------
// Service Gender
// ---------------------------------------------------------------------------

export const SERVICE_FOR = Object.freeze({
    MEN: 'men',
    WOMEN: 'women',
    UNISEX: 'unisex',
});

export const ALL_SERVICE_FOR = Object.values(SERVICE_FOR);

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export const MEDIA_TYPE = Object.freeze({
    IMAGE: 'image',
    VIDEO: 'video',
});

export const ALL_MEDIA_TYPES = Object.values(MEDIA_TYPE);

export const MEDIA_STATUS = Object.freeze({
    PENDING: 'pending',
    READY: 'ready',
    PROCESSING: 'processing',
    FAILED: 'failed',
    DELETED: 'deleted',
});

export const ALL_MEDIA_STATUSES = Object.values(MEDIA_STATUS);

export const MEDIA_PURPOSE = Object.freeze({
    AVATAR: 'avatar',
    PROFILE: 'profile',
    COVER: 'cover',
    GALLERY: 'gallery',
    EMPLOYEE: 'employee',
    ONBOARDING: 'onboarding',
    SERVICE: 'service',
    VIDEO_RAW: 'video_raw',
    VIDEO_THUMBNAIL: 'video_thumbnail',
});

export const ALL_MEDIA_PURPOSES = Object.values(MEDIA_PURPOSE);

export const MEDIA_ENTITY_TYPE = Object.freeze({
    SHOP: 'Shop',
    EMPLOYEE: 'Employee',
    CUSTOMER: 'Customer',
    SERVICE: 'Service',
});

export const ALL_MEDIA_ENTITY_TYPES = [...Object.values(MEDIA_ENTITY_TYPE), null];

export const MIME_TO_EXTENSION = Object.freeze({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/webm': 'webm',
});

// ---------------------------------------------------------------------------
// Gender
// ---------------------------------------------------------------------------

export const GENDER = Object.freeze({
    MALE: 'male',
    FEMALE: 'female',
    TRANSGENDER: 'transgender',
});

export const ALL_GENDERS = Object.values(GENDER);

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPE = Object.freeze({
    PUSH: 'push',
    SILENT: 'silent',
    HYBRID: 'hybrid',
});

export const ALL_NOTIFICATION_TYPES = Object.values(NOTIFICATION_TYPE);

export const NOTIFICATION_STATUS = Object.freeze({
    QUEUED: 'queued',
    SENT: 'sent',
    PARTIAL: 'partial',
    FAILED: 'failed',
    SKIPPED: 'skipped',
});

export const ALL_NOTIFICATION_STATUSES = Object.values(NOTIFICATION_STATUS);

export const FCM_PLATFORM = Object.freeze({
    ANDROID: 'android',
    IOS: 'ios',
    WEB: 'web',
    UNKNOWN: 'unknown',
});

export const ALL_FCM_PLATFORMS = Object.values(FCM_PLATFORM);

export const NOTIFICATION_EVENT = Object.freeze({
    BOOKING_AWAITING_CONFIRMATION: 'booking.awaiting_confirmation',
    BOOKING_CONFIRMED: 'booking.confirmed',
    BOOKING_CANCELLED: 'booking.cancelled',
    BOOKING_COMPLETED: 'booking.completed',
    BOOKING_NO_SHOW: 'booking.no_show',
    BOOKING_AUTO_CANCELLED: 'booking.auto_cancelled',
    BOOKING_EMPLOYEE_UNAVAILABLE: 'booking.employee_unavailable',
    PAYMENT_FAILED: 'payment.failed',
    PAYMENT_REFUND_PENDING: 'payment.refund_pending',
    PAYMENT_REFUNDED: 'payment.refunded',
    PAYMENT_REFUND_FAILED: 'payment.refund_failed',
    RATING_RECEIVED: 'rating.received',
    RATING_REPLY: 'rating.reply',
    ACCOUNT_UPDATED: 'account.updated',
    SHOP_STATUS_UPDATED: 'shop.status_updated',
    PAYOUT_COMPLETED: 'payout.completed',
    PAYOUT_FAILED: 'payout.failed',
    SYSTEM_ALERT: 'system.alert',
    CHAT_MESSAGE: 'chat.message',
});

export const ALL_NOTIFICATION_EVENTS = Object.values(NOTIFICATION_EVENT);

// ---------------------------------------------------------------------------
// Token Types
// ---------------------------------------------------------------------------

export const TOKEN_TYPE = Object.freeze({
    ONBOARDING: 'onboarding',
    ACCESS: 'access',
    REFRESH: 'refresh',
});
