import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root (one level above src/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read an env var and throw immediately if it is required and missing.
 */
const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

/**
 * Read an optional env var with a default.
 */
const optionalEnv = (key, fallback) => process.env[key] || fallback;
const providerEnv = (key, fallback) => {
  const value = process.env[key];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || fallback;
};

const requireEnumEnv = (key, allowedValues) => {
  const value = requireEnv(key);
  if (!allowedValues.includes(value)) {
    throw new Error(`${key} must be ${allowedValues.join(' or ')}`);
  }
  return value;
};

const assertRazorpayKeyMatchesEnvironment = (keyId, env) => {
  if (keyId.startsWith('rzp_test_') && env === 'PRODUCTION') {
    throw new Error('RAZORPAY_KEY_ID is a test key but RAZORPAY_ENV is PRODUCTION');
  }

  if (keyId.startsWith('rzp_live_') && env === 'SANDBOX') {
    throw new Error('RAZORPAY_KEY_ID is a live key but RAZORPAY_ENV is SANDBOX');
  }
};

const PROVIDER_ENVIRONMENTS = Object.freeze(['SANDBOX', 'PRODUCTION']);
const razorpayEnv = requireEnumEnv('RAZORPAY_ENV', PROVIDER_ENVIRONMENTS);
const razorpayKeyId = providerEnv('RAZORPAY_KEY_ID', 'rzp_test_key');
assertRazorpayKeyMatchesEnvironment(razorpayKeyId, razorpayEnv);

// ---------------------------------------------------------------------------
// Config Object
// ---------------------------------------------------------------------------

const config = Object.freeze({
  /** Application */
  env: optionalEnv('NODE_ENV', 'development'),
  port: parseInt(optionalEnv('PORT', '5000'), 10),
  apiPrefix: '/api/v1',

  /** MongoDB */
  mongo: Object.freeze({
    uri: requireEnv('MONGODB_URI'),
  }),

  /** Firebase */
  firebase: Object.freeze({
    projectId: requireEnv('FIREBASE_PROJECT_ID'),
    clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
    privateKey: requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  }),

  /** Cloudflare R2 */
  r2: Object.freeze({
    accountId: requireEnv('CF_ACCOUNT_ID'),
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    bucket: requireEnv('R2_BUCKET'),
    cdnBaseUrl: requireEnv('CDN_BASE_URL'),
    mediaTokenSecret: requireEnv('MEDIA_TOKEN_SECRET'),
  }),

  /** Media business rules */
  media: Object.freeze({
    maxImageSize: 10 * 1024 * 1024,
    maxVideoSize: 500 * 1024 * 1024,
    maxGalleryPerShop: 10,
    maxFiles: 10,
    presignedUrlTtl: 15 * 60,
    signedUrlTtl: 60 * 60,
    multipartPartSize: 50 * 1024 * 1024,
    maxMultipartParts: 100,
    pendingUploadTtlHours: 24,
    allowedImageMimes: [
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
    allowedVideoMimes: [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
    ],
  }),

  /** Security / Rate Limiting */
  security: Object.freeze({
    bcryptSaltRounds: 10,
    pinLength: 4,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // requests per window
    otpRateLimit: Object.freeze({
      windowMs: 15 * 60 * 1000,   // 15 minutes
      maxSendPerPhone: 5,
      maxSendPerIp: 10,
      maxVerifyPerPhone: 10,
      cleanupIntervalMs: 10 * 60 * 1000, // 10 minutes
    }),
  }),

  /** MSG91 OTP */
  msg91: Object.freeze({
    authKey: requireEnv('MSG91_AUTH_KEY'),
    otpTemplateId: requireEnv('MSG91_OTP_TEMPLATE_ID'),
    otpLength: 6,
    otpExpiry: 10,                                              // minutes
    testMode: process.env.NODE_ENV !== 'production' && true,   // flip to true in dev to skip real SMS
    testOtp: '123456',
    baseUrl: 'https://control.msg91.com/api/v5',
  }),

  /** JWT */
  jwt: Object.freeze({
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    onboardingSecret: requireEnv('JWT_ONBOARDING_SECRET'),
    accessExpiry: '15m',
    refreshExpiry: '180d',
    onboardingExpiry: '24h',
  }),

  /** Pagination defaults */
  pagination: Object.freeze({
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  }),

  /** PhonePe Payment Gateway */
  phonepe: Object.freeze({
    clientId: providerEnv('PHONEPE_CLIENT_ID', 'test-phonepe-client-id'),
    clientSecret: providerEnv('PHONEPE_CLIENT_SECRET', 'test-phonepe-client-secret'),
    clientVersion: parseInt(optionalEnv('PHONEPE_CLIENT_VERSION', '1'), 10),
    merchantId: providerEnv('PHONEPE_MERCHANT_ID', 'test-phonepe-merchant-id'),
    env: optionalEnv('PHONEPE_ENV', 'SANDBOX'),
    webhookUsername: providerEnv('PHONEPE_WEBHOOK_USERNAME', 'test-phonepe-webhook-user'),
    webhookPassword: providerEnv('PHONEPE_WEBHOOK_PASSWORD', 'test-phonepe-webhook-password'),
    authUrl: optionalEnv('PHONEPE_ENV', 'SANDBOX') === 'PRODUCTION'
      ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
    baseUrl: optionalEnv('PHONEPE_ENV', 'SANDBOX') === 'PRODUCTION'
      ? 'https://api.phonepe.com/apis/pg'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox',
    tokenRefreshBufferMs: 5 * 60 * 1000,  // 5 minutes before expiry
  }),

  /** Cashfree Payouts */
  cashfree: Object.freeze({
    payoutClientId: providerEnv('CASHFREE_PAYOUT_CLIENT_ID', 'test-cashfree-client-id'),
    payoutClientSecret: providerEnv('CASHFREE_PAYOUT_CLIENT_SECRET', 'test-cashfree-client-secret'),
    payoutEnv: optionalEnv('CASHFREE_PAYOUT_ENV', 'SANDBOX'),
    payoutBaseUrl: optionalEnv('CASHFREE_PAYOUT_ENV', 'SANDBOX') === 'PRODUCTION'
      ? 'https://api.cashfree.com/payout'
      : 'https://sandbox.cashfree.com/payout',
    payoutApiVersion: '2024-01-01',
  }),

  /** Razorpay subscription billing */
  razorpay: Object.freeze({
    keyId: razorpayKeyId,
    keySecret: providerEnv('RAZORPAY_KEY_SECRET', 'test-razorpay-secret'),
    webhookSecret: providerEnv('RAZORPAY_WEBHOOK_SECRET', 'test-razorpay-webhook-secret'),
    planIdPopular: providerEnv('RAZORPAY_PLAN_ID_POPULAR', 'plan_test_popular'),
    planIdAdvanced: providerEnv('RAZORPAY_PLAN_ID_ADVANCED', 'plan_test_advanced'),
    env: razorpayEnv,
  }),

  /** Subscription business rules */
  subscription: Object.freeze({
    expiryCheckIntervalMs: 5 * 60 * 1000,
    reconciliationCronSchedule: '0 2 * * *',
    mediaReconciliationCronSchedule: '0 3 * * *',
    cronTimezone: 'Asia/Kolkata',
    webhookTimestampToleranceSec: 300,
  }),

  /** Booking business rules */
  booking: Object.freeze({
    maxServicesPerBooking: 10,
    maxDurationMinutes: 480,       // 8 hours
    maxAdvanceDays: 7,
    maxRescheduleCount: 1,
    cancellationWindowHours: 2,
    activeThresholdMinutes: 30,
    confirmationTimeoutHours: 24,
    milestoneTargets: [500, 750, 1000],
    autoCancelPollIntervalMs: 15 * 60 * 1000,  // 15 minutes
  }),

  /** Shop business rules */
  shop: Object.freeze({
    nearbyDistanceMeters: 2000,
  }),

  /** Payment business rules */
  payment: Object.freeze({
    platformFeeSingle: 4,
    platformFeeBundle: 10,
    refundFeeSingle: 7,
    refundFeeBundle: 15,
    feeWaiverQuota: 2,
    minBundleServiceAmount: 299,
    minSingleServiceAmount: 69,
    sessionExpirySeconds: 1200,
    maxPollAttempts: 10,
    pollIntervalBaseMs: 3000,
    stalePaymentThresholdMs: 30 * 60 * 1000,     // 30 minutes
    maxPaymentAgeMs: 24 * 60 * 60 * 1000,        // 24 hours
    pollIntervalMs: 5 * 60 * 1000,               // 5 minutes
    payoutBatchCronTime: '0 23 * * *',
    payoutBatchTimezone: 'Asia/Kolkata',
    // Payment modes configuration (PhonePe V2 Schema)
    // Configure which payment methods to enable
    // Empty array = all payment modes enabled
    // Examples: [{ type: 'UPI' }], [{ type: 'UPI' }, { type: 'CARD' }]
    paymentModes: [{ type: 'UPI' }],
  }),

  /** Payout business rules */
  payout: Object.freeze({
    mode: 'manual',
    maxRetries: 3,
    pollIntervalMs: 10 * 60 * 1000,              // 10 minutes
    stuckThresholdMs: 10 * 60 * 1000,             // 10 minutes
  }),

  /** Slot cleanup job */
  slotCleanup: Object.freeze({
    intervalMs: 6 * 60 * 60 * 1000,              // 6 hours
  }),
});

export default config;
