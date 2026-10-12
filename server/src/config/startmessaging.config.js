import config from './index.js';

const startmessaging = Object.freeze({
    ...config.startmessaging,
    endpoints: Object.freeze({
        sendOtp: `${config.startmessaging.baseUrl}/otp/send`,
        verifyOtp: `${config.startmessaging.baseUrl}/v1/otp/verify`,
    }),
    headers: Object.freeze({
        'X-API-Key': config.startmessaging.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    }),
});

export default startmessaging;
