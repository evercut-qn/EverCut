import express from 'express';

import config from '../config/index.js';
import { RAW_JSON_WEBHOOK_ROUTES } from '../config/webhook.config.js';

const parseRawJsonBody = (rawBodyFormat) => (req, _res, next) => {
    try {
        const bodyBuffer = Buffer.isBuffer(req.body)
            ? req.body
            : Buffer.from(req.body || '');
        req.rawBody = rawBodyFormat === 'string'
            ? bodyBuffer.toString('utf8')
            : bodyBuffer;
        req.body = JSON.parse(bodyBuffer.toString('utf8'));
        next();
    } catch (error) {
        next(error);
    }
};

export const configureWebhookRawBodyParsers = (app) => {
    for (const route of RAW_JSON_WEBHOOK_ROUTES) {
        app.use(
            `${config.apiPrefix}${route.suffix}`,
            express.raw({ type: 'application/json' }),
            parseRawJsonBody(route.rawBodyFormat),
        );
    }
};
