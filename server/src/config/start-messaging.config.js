import config from './index.js';

/**
 * StartMessaging is a plain transactional-SMS sender — it has no OTP
 * generation/verification API of its own. Only a "send message" endpoint is
 * needed here; OTP generation, storage, and verification live in
 * `services/sms/otp-store.service.js`.
 *
 * NOTE: confirm the exact send-SMS endpoint path and request/response payload
 * shape against StartMessaging's official API docs before going live — the
 * migration guide only specifies the auth header (`X-API-Key`) and the
 * required request fields (`phoneNumber`, `variables.otp`, optional
 * `templateId`), not the literal endpoint path used below.
 */
const startMessaging = Object.freeze({
    ...config.startMessaging,
    endpoints: Object.freeze({
        sendSms: `${config.startMessaging.baseUrl}/otp/send`,
    }),
    headers: Object.freeze({
        'X-API-Key': config.startMessaging.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    }),
});

export default startMessaging;
